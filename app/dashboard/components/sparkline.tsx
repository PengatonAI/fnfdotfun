"use client";

import { useId } from "react";

interface SparklineProps {
  data?: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function Sparkline({ 
  data, 
  width = 200, 
  height = 50, 
  color = "#A855F7",
  className = ""
}: SparklineProps) {
  // Generate unique ID for gradient to avoid conflicts with multiple sparklines
  const gradientId = useId();
  
  // Generate placeholder data if none provided (for graceful fallback)
  const chartData = data && data.length > 1 ? data : generatePlaceholderData();
  
  const min = Math.min(...chartData);
  const max = Math.max(...chartData);
  const range = max - min || 1;
  
  // Create SVG path with smooth curves (monotone interpolation approximation)
  const points = chartData.map((value, index) => {
    const x = (index / (chartData.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 10) - 5;
    return { x, y };
  });
  
  // Create smooth curve path using quadratic bezier curves
  let pathD = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    pathD += ` Q ${prev.x},${prev.y} ${midX},${(prev.y + curr.y) / 2}`;
  }
  // Finish with the last point
  if (points.length > 1) {
    const last = points[points.length - 1];
    pathD += ` T ${last.x},${last.y}`;
  }
  
  // Fallback to simple line path if smooth doesn't work
  const simplePathD = `M ${points.map(p => `${p.x},${p.y}`).join(" L ")}`;
  
  // Create gradient fill path (area under the line)
  const areaPath = `M 0,${height} L ${points.map(p => `${p.x},${p.y}`).join(" L ")} L ${width},${height} Z`;
  
  return (
    <svg 
      width={width} 
      height={height} 
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#${gradientId})`}
      />
      
      {/* Line - thin and smooth */}
      <path
        d={simplePathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Generate realistic-looking placeholder data for demonstration
function generatePlaceholderData(): number[] {
  const points = 30;
  const data: number[] = [];
  let value = 50;
  
  for (let i = 0; i < points; i++) {
    // Add some random variation with upward trend
    value += (Math.random() - 0.45) * 10;
    value = Math.max(20, Math.min(100, value));
    data.push(value);
  }
  
  return data;
}
