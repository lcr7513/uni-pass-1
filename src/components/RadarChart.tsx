import type { CompetencyScores } from '../types/interview';

interface RadarChartProps {
  scores: CompetencyScores;
  benchmark?: CompetencyScores;
}

const AXES: { key: keyof CompetencyScores; label: string }[] = [
  { key: 'majorFit', label: '전공적합성' },
  { key: 'academicDepth', label: '학업탐구력' },
  { key: 'logicalStructure', label: '논리구조화' },
  { key: 'growthPotential', label: '발전가능성' },
  { key: 'communication', label: '소통·태도' },
];

const DEFAULT_BENCHMARK: CompetencyScores = {
  majorFit: 88,
  academicDepth: 87,
  logicalStructure: 89,
  growthPotential: 86,
  communication: 88,
};

export function RadarChart({ scores, benchmark = DEFAULT_BENCHMARK }: RadarChartProps) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 92;
  const levels = [25, 50, 75, 100];

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / AXES.length - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const toPolygon = (dataset: CompetencyScores) =>
    AXES.map((axis, idx) => {
      const p = getPoint(idx, dataset[axis.key]);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(' ');

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-[280px] h-auto"
        role="img"
        aria-label="5대 면접 역량 레이더 차트"
      >
        {levels.map((lvl) => {
          const pts = AXES.map((_, idx) => {
            const p = getPoint(idx, lvl);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          }).join(' ');
          return (
            <polygon
              key={lvl}
              points={pts}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="1"
            />
          );
        })}

        {AXES.map((axis, idx) => {
          const outer = getPoint(idx, 100);
          const labelPos = getPoint(idx, 122);
          return (
            <g key={axis.key}>
              <line
                x1={cx}
                y1={cy}
                x2={outer.x}
                y2={outer.y}
                stroke="#E2E8F0"
                strokeWidth="1"
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-700 text-[11px] font-medium"
              >
                {axis.label}
              </text>
            </g>
          );
        })}

        <polygon
          points={toPolygon(benchmark)}
          fill="rgba(148, 163, 184, 0.14)"
          stroke="#94A3B8"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />

        <polygon
          points={toPolygon(scores)}
          fill="rgba(29, 78, 216, 0.16)"
          stroke="#1D4ED8"
          strokeWidth="2.2"
        />

        {AXES.map((axis, idx) => {
          const p = getPoint(idx, scores[axis.key]);
          return (
            <circle
              key={axis.key}
              cx={p.x}
              cy={p.y}
              r="3.5"
              fill="#1D4ED8"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          );
        })}
      </svg>

      <div className="mt-2 flex items-center gap-5 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-blue-700 inline-block" />
          내 모의면접 역량
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0.5 border-t border-dashed border-slate-400 inline-block" />
          합격권 기준선
        </span>
      </div>

      <div className="mt-4 w-full grid grid-cols-5 gap-2 border-t border-slate-100 pt-3 text-center">
        {AXES.map((axis) => (
          <div key={axis.key}>
            <div className="text-[11px] text-slate-500 truncate">{axis.label}</div>
            <div className="font-mono-tabular text-sm font-semibold text-slate-900 mt-0.5">
              {scores[axis.key]}점
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
