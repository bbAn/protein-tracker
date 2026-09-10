"use client";

import React, { useState } from "react";

interface WeightTrendChartProps {
  data: { date: string; weight: number }[]; // 날짜 오름차순, YYYY-MM-DD
}

// 전부 0~100 퍼센트 좌표계. SVG는 선/면만 그리고(비균등으로 늘어나도
// 모양이 깨지지 않음), 점 마커는 SVG 밖에서 고정 px 크기의 실제 원형
// div로 그려서 컨테이너 폭과 무관하게 항상 정원을 보장함
const PAD_X_PCT = 4;
const PAD_Y_PCT = 15;

export const WeightTrendChart: React.FC<WeightTrendChartProps> = ({
  data,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

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

  // x, y 모두 컨테이너에 대한 퍼센트(0~100)
  const points = data.map((d, i) => ({
    x: PAD_X_PCT + (i / (data.length - 1)) * (100 - PAD_X_PCT * 2),
    y:
      100 -
      PAD_Y_PCT -
      ((d.weight - min) / range) * (100 - PAD_Y_PCT * 2),
    ...d,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} 100 L ${points[0].x.toFixed(2)} 100 Z`;

  const delta = last.weight - data[0].weight;
  const deltaLabel =
    Math.abs(delta) < 0.05
      ? "변화 없음"
      : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}kg`;

  const lastPoint = points[points.length - 1];
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * 100;
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
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-muted">
          체중 추이 · 최근 30일 · {deltaLabel}
        </span>
        <span className="text-sm font-semibold text-foreground">
          {last.weight}kg
        </span>
      </div>
      <div
        className="relative h-14 touch-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          <path d={areaPath} className="fill-accent/10" />
          <path
            d={linePath}
            className="stroke-accent"
            fill="none"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {hovered && (
            <line
              x1={hovered.x}
              y1={0}
              x2={hovered.x}
              y2={100}
              className="stroke-border"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* 끝점 마커: 고정 px 크기의 실제 원형 div라 절대 타원으로 늘어나지 않음 */}
        <div
          className="absolute w-2 h-2 rounded-full bg-accent ring-2 ring-surface"
          style={{
            left: `${lastPoint.x}%`,
            top: `${lastPoint.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
        {hovered && (
          <>
            <div
              className="absolute w-2 h-2 rounded-full bg-accent ring-2 ring-surface"
              style={{
                left: `${hovered.x}%`,
                top: `${hovered.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
            <div
              className="absolute bg-foreground text-background text-xs px-2 py-1 rounded-md pointer-events-none whitespace-nowrap"
              style={{
                left: `${hovered.x}%`,
                top: 0,
                transform: "translate(-50%, calc(-100% - 6px))",
              }}
            >
              {hovered.date.slice(5)} · {hovered.weight}kg
            </div>
          </>
        )}
      </div>
    </div>
  );
};
