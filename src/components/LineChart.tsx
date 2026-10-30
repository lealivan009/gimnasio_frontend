export function LineChart({
  points,
  label,
  unit = "",
}: {
  points: { label: string; value: number }[];
  label: string;
  unit?: string;
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
  const values = points.map((point) => point.value);
  const rawMax = Math.max(...values);
  const rawMin = Math.min(...values);
  const span = rawMax - rawMin;
  const headroom = span === 0 ? Math.max(Math.abs(rawMax) * 0.25, 1) : span * 0.35;
  const yMax = rawMax + headroom;
  const yMin = Math.max(0, rawMin - headroom);
  const range = yMax - yMin || 1;
  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? width / 2
        : plotLeft + (index / (points.length - 1)) * (width - plotLeft - plotRight);
    const y = plotTop + (1 - (point.value - yMin) / range) * (height - plotTop - plotBottom);
    return { ...point, x, y };
  });
  const path = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const ticks = [yMax, yMin + range / 2, yMin];
  const valueLabels = pickLabels(coords, 92);
  const dateLabels = pickLabels(coords, 72);
  const summary = points.map((point) => `${point.label}: ${formatChartValue(point.value, unit)}`).join(", ");

  return (
    <div className="chart-plot" role="img" aria-label={`${label}. ${summary}`}>
      <div className="chart-scale" aria-hidden="true">
        {ticks.map((tick, index) => (
          <span key={index}>{formatChartValue(tick, index === 0 ? unit : "")}</span>
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
          {coords.map((point, index) => (
            <circle key={`${point.label}-${index}`} cx={point.x} cy={point.y} r="4" className="chart-dot">
              <title>
                {point.label}: {formatChartValue(point.value, unit)}
              </title>
            </circle>
          ))}
        </svg>
        {coords.map((point, index) =>
          valueLabels.has(index) ? (
            <span
              key={`${point.label}-${index}`}
              className={
                coords.length === 1
                  ? "chart-value"
                  : index === 0
                    ? "chart-value is-start"
                    : index === coords.length - 1
                      ? "chart-value is-end"
                      : "chart-value"
              }
              style={{ left: `${(point.x / width) * 100}%`, top: `${(point.y / height) * 100}%` }}
            >
              {formatChartValue(point.value, unit)}
            </span>
          ) : null
        )}
      </div>
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

function formatChartValue(value: number, unit: string) {
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
