import { formatDuration } from "../api/gym";

export function LineChart({
  points,
  label,
  unit = "",
  name,
  overlay,
}: {
  points: { label: string; value: number }[];
  label: string;
  unit?: string;
  name?: string;
  overlay?: { name: string; unit: string; values: number[] };
}) {
  if (points.length === 0) {
    return <p className="lede">Todavía no hay datos para este gráfico.</p>;
  }

  const width = 320;
  const height = 150;
  const plotTop = 36;
  const plotBottom = 16;
  const plotLeft = 12;
  const plotRight = 12;
  const primary = axisScale(points.map((point) => point.value));
  const overlayValues = overlay?.values.slice(0, points.length) ?? [];
  const secondary = overlay && overlayValues.length === points.length ? axisScale(overlayValues) : null;
  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? width / 2
        : plotLeft + (index / (points.length - 1)) * (width - plotLeft - plotRight);
    return {
      ...point,
      x,
      y: yAt(point.value, primary, plotTop, plotBottom, height),
      overlayValue: secondary ? overlayValues[index] : null,
      overlayY: secondary ? yAt(overlayValues[index], secondary, plotTop, plotBottom, height) : null,
    };
  });
  const path = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const overlayPath = secondary
    ? coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.overlayY}`).join(" ")
    : "";
  const ticks = [primary.yMax, primary.yMin + primary.range / 2, primary.yMin];
  const overlayTicks = secondary ? [secondary.yMax, secondary.yMin + secondary.range / 2, secondary.yMin] : [];
  const valueLabels = pickLabels(coords, 92);
  const dateLabels = pickLabels(coords, 72);
  const summary = coords
    .map((point) => {
      const own = `${point.label}: ${formatChartValue(point.value, unit)}`;
      return point.overlayValue == null || !overlay
        ? own
        : `${own}, ${formatChartValue(point.overlayValue, overlay.unit)}`;
    })
    .join(", ");

  return (
    <div className={secondary ? "chart-plot has-overlay" : "chart-plot"} role="img" aria-label={`${label}. ${summary}`}>
      {secondary && overlay ? (
        <div className="chart-legend">
          <span>
            <i className="chart-swatch" /> {name || unit || "Valor"}
          </span>
          <span>
            <i className="chart-swatch is-overlay" /> {overlay.name}
          </span>
        </div>
      ) : null}
      <div className="chart-scale" aria-hidden="true">
        {ticks.map((tick, index) => (
          <span key={index}>{formatChartValue(tick, unit === "s" || index === 0 ? unit : "")}</span>
        ))}
      </div>
      <div className="chart-canvas">
        <svg className="line-chart" viewBox={`0 0 ${width} ${height}`}>
          {ticks.map((tick, index) => {
            const y = plotTop + (index * (height - plotTop - plotBottom)) / 2;
            return (
              <line
                key={tick}
                x1={plotLeft}
                y1={y}
                x2={width - plotRight}
                y2={y}
                className="chart-grid"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          <path d={path} className="chart-line" vectorEffect="non-scaling-stroke" />
          {secondary ? <path d={overlayPath} className="chart-line is-overlay" vectorEffect="non-scaling-stroke" /> : null}
          {coords.map((point, index) => (
            <circle key={`${point.label}-${index}`} cx={point.x} cy={point.y} r="4" className="chart-dot">
              <title>
                {point.label}: {formatChartValue(point.value, unit)}
                {point.overlayValue != null && overlay ? ` · ${formatChartValue(point.overlayValue, overlay.unit)}` : ""}
              </title>
            </circle>
          ))}
          {secondary
            ? coords.map((point, index) => (
                <circle
                  key={`${point.label}-overlay-${index}`}
                  cx={point.x}
                  cy={point.overlayY ?? 0}
                  r="4"
                  className="chart-dot is-overlay"
                >
                  <title>
                    {point.label}: {formatChartValue(point.overlayValue ?? 0, overlay?.unit ?? "")}
                  </title>
                </circle>
              ))
            : null}
        </svg>
        {coords.map((point, index) =>
          valueLabels.has(index) ? (
            <span
              key={`${point.label}-${index}`}
              className={valueClass(index, coords.length, false)}
              style={{ left: `${(point.x / width) * 100}%`, top: `${(point.y / height) * 100}%` }}
            >
              {formatChartValue(point.value, unit)}
            </span>
          ) : null
        )}
        {secondary
          ? coords.map((point, index) =>
              valueLabels.has(index) ? (
                <span
                  key={`${point.label}-overlay-${index}`}
                  className={valueClass(index, coords.length, true)}
                  style={{ left: `${(point.x / width) * 100}%`, top: `${((point.overlayY ?? 0) / height) * 100}%` }}
                >
                  {formatChartValue(point.overlayValue ?? 0, overlay?.unit ?? "")}
                </span>
              ) : null
            )
          : null}
      </div>
      {secondary && overlay ? (
        <div className="chart-scale is-right" aria-hidden="true">
          {overlayTicks.map((tick, index) => (
            <span key={index}>{formatChartValue(tick, index === 0 ? overlay.unit : "")}</span>
          ))}
        </div>
      ) : null}
      <div className="chart-dates" aria-hidden="true">
        {coords.map((point, index) =>
          dateLabels.has(index) ? (
            <span
              key={`${point.label}-${index}`}
              className={
                coords.length === 1 ? undefined : index === 0 ? "is-start" : index === coords.length - 1 ? "is-end" : undefined
              }
              style={{ left: `${(point.x / width) * 100}%` }}
            >
              {shortDate(point.label)}
            </span>
          ) : null
        )}
      </div>
    </div>
  );
}

function axisScale(values: number[]) {
  const rawMax = Math.max(...values);
  const rawMin = Math.min(...values);
  const span = rawMax - rawMin;
  const headroom = span === 0 ? Math.max(Math.abs(rawMax) * 0.25, 1) : span * 0.35;
  const yMax = rawMax + headroom;
  const yMin = Math.max(0, rawMin - headroom);
  const range = yMax - yMin || 1;
  return { yMax, yMin, range };
}

function yAt(
  value: number,
  scale: { yMin: number; range: number },
  plotTop: number,
  plotBottom: number,
  height: number
) {
  return plotTop + (1 - (value - scale.yMin) / scale.range) * (height - plotTop - plotBottom);
}

function valueClass(index: number, total: number, overlay: boolean) {
  const place = overlay ? "chart-value is-overlay" : "chart-value";
  if (total === 1) {
    return place;
  }
  if (index === 0) {
    return `${place} is-start`;
  }
  if (index === total - 1) {
    return `${place} is-end`;
  }
  return place;
}

function formatChartValue(value: number, unit: string) {
  if (unit === "s") {
    return formatDuration(value);
  }
  const text = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 1,
  }).format(value);
  return unit ? `${text} ${unit}` : text;
}

function shortDate(label: string) {
  return label.replace(/\s+de\s+/gi, " ").replace(/\s+20\d{2}$/, "").trim();
}

function pickLabels(coords: { x: number }[], minGap: number) {
  const chosen: number[] = [];
  coords.forEach((point, index) => {
    const last = chosen[chosen.length - 1];
    const isLast = index === coords.length - 1;
    if (last === undefined || point.x - coords[last].x >= minGap || isLast) {
      if (isLast && last !== undefined && point.x - coords[last].x < minGap && chosen.length > 1) {
        chosen.pop();
      }
      if (chosen[chosen.length - 1] !== index) {
        chosen.push(index);
      }
    }
  });
  return new Set(chosen);
}
