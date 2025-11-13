import React from 'react';

interface RadarChartProps {
  data: {
    title: string;
    scoresByCriterion: Record<string, { raw: number }>;
  }[];
  criteria: { id: string; name: string }[];
  size?: number;
}

const COLORS = ['#FF6B6B', '#0d9488', '#0ea5e9', '#f43f5e', '#64748b']; // Updated first color

const RadarChart: React.FC<RadarChartProps> = ({ data, criteria, size = 350 }) => {
  if (!data || data.length === 0 || !criteria || criteria.length < 3) {
    return (
        <div style={{ width: size, height: size }} className="flex items-center justify-center text-center text-gray-500 text-sm">
            請至少選擇 3 個評分標準以顯示雷達圖。
        </div>
    );
  }

  const center = size / 2;
  const radius = center * 0.75;
  const numLevels = 5;
  const angleSlice = (Math.PI * 2) / criteria.length;

  const getPoint = (value: number, angle: number) => {
    const x = center + value * Math.cos(angle - Math.PI / 2);
    const y = center + value * Math.sin(angle - Math.PI / 2);
    return `${x},${y}`;
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid lines */}
        {[...Array(numLevels)].map((_, i) => {
          const levelRadius = radius * ((i + 1) / numLevels);
          const points = criteria.map((_, j) => getPoint(levelRadius, angleSlice * j)).join(' ');
          return <polygon key={`level-${i}`} points={points} fill="none" stroke="#E5E7EB" strokeWidth="1" />;
        })}

        {/* Axis lines */}
        {criteria.map((_, i) => {
          const point = getPoint(radius, angleSlice * i);
          const [x2, y2] = point.split(',').map(parseFloat);
          return <line key={`axis-${i}`} x1={center} y1={center} x2={x2} y2={y2} stroke="#D1D5DB" strokeWidth="1" />;
        })}

        {/* Axis labels */}
        {criteria.map((criterion, i) => {
          const labelRadius = radius * 1.1;
          const x = center + labelRadius * Math.cos(angleSlice * i - Math.PI / 2);
          const y = center + labelRadius * Math.sin(angleSlice * i - Math.PI / 2);
          
          let textAnchor: 'middle' | 'end' | 'start' = "middle";
          if (x < center * 0.9) textAnchor = "end";
          if (x > center * 1.1) textAnchor = "start";

          return (
            <text
              key={`label-${i}`}
              x={x}
              y={y}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              fontSize="10"
              fontWeight="500"
              fill="#4B5563"
            >
              {criterion.name}
            </text>
          );
        })}

        {/* Data polygons */}
        {data.map((projectData, projectIndex) => {
          const points = criteria
            .map((criterion, i) => {
              const score = projectData.scoresByCriterion[criterion.id]?.raw || 0;
              const value = (score / 100) * radius;
              return getPoint(value, angleSlice * i);
            })
            .join(' ');

          return (
            <polygon
              key={`project-${projectIndex}`}
              points={points}
              fill={COLORS[projectIndex % COLORS.length]}
              fillOpacity="0.25"
              stroke={COLORS[projectIndex % COLORS.length]}
              strokeWidth="2"
            />
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap justify-center mt-4 gap-x-4 gap-y-2">
        {data.map((projectData, index) => (
          <div key={`legend-${index}`} className="flex items-center">
            <div
              className="w-3 h-3 rounded-sm mr-2"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-xs font-medium text-gray-600">{projectData.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RadarChart;