"use client"

import { cn } from "@/lib/utils"

interface SimpleChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  className?: string;
}

export function SimpleBarChart({ data, className }: SimpleChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className={cn("space-y-2", className)}>
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="w-16 text-xs text-muted-foreground truncate">
            {item.name}
          </div>
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-500", item.color || "bg-primary")}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
            <div className="w-12 text-xs font-medium text-right">
              {item.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface SimpleLineChartProps {
  data: Array<{ name: string; value: number }>;
  className?: string;
}

export function SimpleLineChart({ data, className }: SimpleLineChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;
  
  return (
    <div className={cn("h-24 flex items-end gap-1", className)}>
      {data.map((item, index) => {
        const height = ((item.value - minValue) / range) * 100;
        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex-1 flex items-end">
              <div 
                className="w-full bg-primary rounded-t-sm transition-all duration-500"
                style={{ height: `${Math.max(height, 5)}%` }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              {item.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}