"use client";

import React, { useEffect, useRef, useState } from "react";

interface WeightTrendChartProps {
  data: { date: string; weight: number }[]; // 날짜 오름차순, YYYY-MM-DD
}

const CHART_HEIGHT = 56;
const PAD_Y = CHART_HEIGHT * 0.15;
const FALLBACK_WIDTH = 240;

export const WeightTrendChart: React.FC<WeightTrendChartProps> = ({
  data,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(FALLBACK_WIDTH);

  // viewBox 너비를 실제 렌더 픽셀 폭과 맞춰야 함. 폭이 안 맞으면
  // preserveAspectRatio="none"이 가로/세로를 다른 비율로 늘려버려서
  // 원(circle)이 타원처럼 찌그러져 보임
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setChartWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (data.length === 0) {
    return (
      <p className="text-xs text-muted">
        체중을 기록하면 여기에 추이 그래프가 나타납니다.
      </p>
    );
  }

  const last = data[data.length - 1];

  if (data.length === 1) {
    return (
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted">
          며칠 더 기록하면 추이를 볼 수 있어요
        </span>
        <span className="text-sm font-semibold text-foreground">
          {last.weight}kg
        </span>
      </div>
    );
  }

  const weights = data.map((d) => d.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * chartWidth,
    y:
      CHART_HEIGHT -
      PAD_Y -
      ((d.weight - min) / range) * (CHART_HEIGHT - PAD_Y * 2),
    ...d,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${CHART_HEIGHT} L ${points[0].x.toFixed(1)} ${CHART_HEIGHT} Z`;

  const delta = last.weight - data[0].weight;
  const deltaLabel =
    Math.abs(delta) < 0.05
      ? "변화 없음"
      : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}kg`;

  const lastPoint = points[points.length - 1];
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * chartWidth;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-muted">
          체중 추이 · 최근 30일 · {deltaLabel}
        </span>
        <span className="text-sm font-semibold text-foreground">
          {last.weight}kg
        </span>
      </div>
      <svg
        viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        className="w-full h-14 touch-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <path d={areaPath} className="fill-accent/10" />
        <path
          d={linePath}
          className="stroke-accent"
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={4}
          className="fill-accent stroke-surface"
          strokeWidth={2}
        />
        {hovered && (
          <>
            <line
              x1={hovered.x}
              y1={0}
              x2={hovered.x}
              y2={CHART_HEIGHT}
              className="stroke-border"
              strokeWidth={1}
            />
            <circle
              cx={hovered.x}
              cy={hovered.y}
              r={4}
              className="fill-accent stroke-surface"
              strokeWidth={2}
            />
          </>
        )}
      </svg>
      {hovered && (
        <div
          className="absolute -top-1 bg-foreground text-background text-xs px-2 py-1 rounded-md pointer-events-none whitespace-nowrap"
          style={{
            left: `${(hovered.x / chartWidth) * 100}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          {hovered.date.slice(5)} · {hovered.weight}kg
        </div>
      )}
    </div>
  );
};
