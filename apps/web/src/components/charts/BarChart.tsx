"use client";

interface BarChartData {
  name: string;
  value: number;
  percentage?: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  title: string;
  height?: number;
  showPercentage?: boolean;
}

export function BarChart({ data, title, height = 200, showPercentage = false }: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  const colors = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", 
    "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"
  ];

  return (
    <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
      <h3 className="text-lg font-semibold text-neutral-900 mb-4">{title}</h3>
      
      <div className="space-y-3" style={{ height: `${height}px` }}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * (height - 80);
          const color = item.color || colors[index % colors.length];
          
          return (
            <div key={item.name} className="flex items-center gap-3">
              <div className="w-24 text-sm text-neutral-600 text-right">
                {item.name}
              </div>
              
              <div className="flex-1 flex items-center gap-2">
                <div 
                  className="rounded transition-all duration-500 ease-out flex items-center justify-end px-2 text-white text-sm font-medium"
                  style={{ 
                    backgroundColor: color,
                    width: `${Math.max((item.value / maxValue) * 100, 5)}%`,
                    height: '32px',
                    minWidth: item.value > 0 ? '40px' : '0px'
                  }}
                >
                  {item.value > 0 && (
                    <span className="text-white">
                      {item.value}
                    </span>
                  )}
                </div>
                
                <div className="w-16 text-sm text-neutral-500">
                  {showPercentage && item.percentage !== undefined 
                    ? `${item.percentage.toFixed(1)}%`
                    : item.value
                  }
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-4 text-xs text-neutral-500">
        Total: {data.reduce((sum, item) => sum + item.value, 0)} elementos
      </div>
    </div>
  );
}
