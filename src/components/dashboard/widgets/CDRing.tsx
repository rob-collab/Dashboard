interface CDRingSegment {
  label: string;
  value: number;      // proportional size (e.g. measures.length)
  rag: "GREEN" | "AMBER" | "RED";
}

interface CDRingProps {
  segments: CDRingSegment[];
  size?: number;
}

const ragColour = { GREEN: "#22c55e", AMBER: "#f59e0b", RED: "#ef4444" };
const RAG_DOT: Record<string, string> = { GREEN: "bg-[#22c55e]", AMBER: "bg-[#f59e0b]", RED: "bg-[#ef4444]" };

function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, start: number, end: number): string {
  const s = polarToCart(cx, cy, r, start);
  const e = polarToCart(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

export function CDRing({ segments, size = 80 }: CDRingProps) {
  if (!segments.length) return null;

  const cx = size / 2, cy = size / 2;
  const r = size * 0.38;
  const strokeW = size * 0.16;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  const greenCount = segments.filter((s) => s.rag === "GREEN").length;

  let cursor = 0;
  const arcs = segments.map((seg) => {
    const frac = seg.value / total;
    const startAngle = cursor * 360;
    const endAngle = (cursor + frac) * 360 - 2; // 2° gap
    cursor += frac;
    return { ...seg, startAngle, endAngle };
  });

  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {arcs.map((arc, i) => (
          <path
            key={i}
            d={describeArc(cx, cy, r, arc.startAngle, arc.endAngle)}
            fill="none"
            stroke={ragColour[arc.rag]}
            strokeWidth={strokeW}
            strokeLinecap="butt"
          />
        ))}
        {/* Centre text */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: size * 0.2, fontWeight: 700, fill: "#1A1A2E" }}
        >
          {greenCount}
        </text>
        <text
          x={cx}
          y={cy + size * 0.12}
          textAnchor="middle"
          style={{ fontSize: size * 0.1, fill: "#94a3b8" }}
        >
          /{segments.length} green
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-col gap-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${RAG_DOT[seg.rag]}`} />
            <span style={{ fontSize: 10, color: "#64748b" }} className="truncate max-w-[80px]">{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
