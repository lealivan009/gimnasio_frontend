export function LineChart({
  points,
  label,
}: {
  points: { label: string; value: number }[];
  label: string;
}) {
  if (points.length === 0) {
    return <p className="lede">Todavía no hay datos para este gráfico.</p>;
  }

  const width = 640;
  const height = 220;
  const pad = 28;
  const max = Math.max(...points.map((point) => point.value), 1);
  const coords = points.map((point, index) => {
    const x =
      pad + (points.length === 1 ? (width - pad * 2) / 2 : (index / (points.length - 1)) * (width - pad * 2));
    const y = height - pad - (point.value / max) * (height - pad * 2);
    return { ...point, x, y };
  });
  const path = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");

  return (
    <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} className="chart-axis" />
      <path d={path} className="chart-line" />
      {coords.map((point, index) => (
        <g key={`${point.label}-${index}`}>
          <circle cx={point.x} cy={point.y} r="4" className="chart-dot" />
          <title>
            {point.label}: {point.value}
          </title>
        </g>
      ))}
    </svg>
  );
}
