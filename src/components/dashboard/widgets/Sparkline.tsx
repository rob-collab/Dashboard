interface SparklineProps {
  /** Data points (0..1 normalised — 0 = min, 1 = max) */
  values: number[];
  /** Colour for line + gradient fill */
  colour?: string;
  /** 0..1 normalised y position of the appetite threshold line */
  appetiteThreshold?: number;
  width?: number;
  height?: number;
}

export function Sparkline({
  values,
  colour = "#7c3aed",
  appetiteThreshold,
  width = 120,
  height = 22,
}: SparklineProps) {
  if (values.length < 2) return null;

  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: (1 - v) * height,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  const gradId = `spark-grad-${colour.replace("#", "")}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={colour} stopOpacity={0.25} />
          <stop offset="100%" stopColor={colour} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Gradient fill */}
      <path d={areaPath} fill={`url(#${gradId})`} />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={colour}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Appetite threshold */}
      {appetiteThreshold !== undefined && (
        <line
          x1={0}
          y1={(1 - appetiteThreshold) * height}
          x2={width}
          y2={(1 - appetiteThreshold) * height}
          stroke={colour}
          strokeWidth={0.75}
          strokeDasharray="3 2"
          opacity={0.4}
        />
      )}
    </svg>
  );
}
