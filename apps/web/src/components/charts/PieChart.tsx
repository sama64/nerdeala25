"use client";

interface PieChartData {
  name: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: PieChartData[];
  title: string;
  size?: number;
}

export function PieChart({ data, title, size = 200 }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  const colors = [
    "#10b981", "#3b82f6", "#f59e0b", "#ef4444", 
    "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"
  ];

  let currentAngle = 0;
  const radius = (size - 20) / 2;
  const center = size / 2;

  const segments = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const color = item.color || colors[index % colors.length];
    
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle += angle;

    // Calculate path for SVG arc
    const startAngleRad = (startAngle - 90) * (Math.PI / 180);
    const endAngleRad = (endAngle - 90) * (Math.PI / 180);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    const x1 = center + radius * Math.cos(startAngleRad);
    const y1 = center + radius * Math.sin(startAngleRad);
    const x2 = center + radius * Math.cos(endAngleRad);
    const y2 = center + radius * Math.sin(endAngleRad);
    
    const pathData = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    return {
      ...item,
      color,
      percentage,
      pathData,
      angle: startAngle + angle / 2 // Middle angle for label positioning
    };
  });

  if (total === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-48 text-neutral-500">
          No hay datos para mostrar
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
      <h3 className="text-lg font-semibold text-neutral-900 mb-4">{title}</h3>
      
      <div className="flex items-center gap-6">
        <div className="relative">
          <svg width={size} height={size} className="transform -rotate-90">
            {segments.map((segment, index) => (
              <path
                key={index}
                d={segment.pathData}
                fill={segment.color}
                stroke="white"
                strokeWidth="2"
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            ))}
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-neutral-900">{total}</div>
              <div className="text-xs text-neutral-500">Total</div>
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="space-y-2">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <div className="text-sm">
                <span className="text-neutral-700">{segment.name}</span>
                <span className="text-neutral-500 ml-2">
                  {segment.value} ({segment.percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
