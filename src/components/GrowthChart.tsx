"use client";

import { useMemo } from "react";
import { getLms, zToValue, AGE_MIN, AGE_MAX } from "@/lib/oiGrowth";
import type { OiType, Sex, Measure } from "@/lib/oiGrowth";

interface Point {
  value: number | null;
  zScore: number | null;
}

interface Props {
  oiType: OiType;
  sex: Sex;
  ageYears: number | null;
  height: Point;
  weight: Point;
}

// 一般的な成長曲線と同じく、身長（左軸）を上側、体重（右軸）を下側に重ねて1枚で描く
const VB = { w: 640, h: 560 };
const PAD = { top: 24, right: 52, bottom: 44, left: 52 };
const plotW = VB.w - PAD.left - PAD.right;
const plotH = VB.h - PAD.top - PAD.bottom;
const plotX0 = PAD.left;
const plotY0 = PAD.top;
const plotX1 = plotX0 + plotW;
const plotY1 = plotY0 + plotH;

const N_POINTS = 240;
const Z_LINES = [2, 1, 0, -1, -2] as const;

// 身長曲線の下端を図の下から35%、体重曲線の上端を下から60%に置く
const HEIGHT_LOW_FRAC = 0.35;
const WEIGHT_HIGH_FRAC = 0.6;

const COLORS: Record<Measure, { line: string; band: string; dot: string }> = {
  height: { line: "#2563eb", band: "rgba(37,99,235,0.08)", dot: "#1d4ed8" },
  weight: { line: "#ea580c", band: "rgba(234,88,12,0.08)", dot: "#c2410c" },
};

const zLabel = (z: number) => (z === 0 ? "Mean" : `${z > 0 ? "+" : "−"}${Math.abs(z)}SD`);

function toPath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

function curvesFor(oiType: OiType, sex: Sex, measure: Measure, ages: number[]) {
  return ages.map((age) => {
    const lms = getLms(oiType, sex, measure, age);
    const byZ = Object.fromEntries(Z_LINES.map((z) => [z, zToValue(z, lms)])) as Record<number, number>;
    return { age, byZ };
  });
}

export default function GrowthChart({ oiType, sex, ageYears, height, weight }: Props) {
  const chart = useMemo(() => {
    const ages = Array.from({ length: N_POINTS + 1 }, (_, i) => AGE_MIN + (i / N_POINTS) * (AGE_MAX - AGE_MIN));
    const hCurves = curvesFor(oiType, sex, "height", ages);
    const wCurves = curvesFor(oiType, sex, "weight", ages);

    // 身長軸（左）
    const hVals = hCurves.flatMap((c) => [c.byZ[-2], c.byZ[2]]);
    if (height.value !== null) hVals.push(height.value);
    const hDataMin = Math.min(...hVals);
    const hTop = Math.ceil((Math.max(...hVals) + 2) / 10) * 10;
    const hBottom = (hDataMin - HEIGHT_LOW_FRAC * hTop) / (1 - HEIGHT_LOW_FRAC);
    const hTickMin = Math.floor(hDataMin / 10) * 10;
    const hTicks: number[] = [];
    for (let v = hTickMin; v <= hTop; v += 10) hTicks.push(v);

    // 体重軸（右）
    const wVals = wCurves.map((c) => c.byZ[2]);
    if (weight.value !== null) wVals.push(weight.value);
    const wDataMax = Math.max(...wVals);
    const wTop = wDataMax / WEIGHT_HIGH_FRAC;
    const wStep = wDataMax > 60 ? 10 : 5;
    const wTicks: number[] = [];
    for (let v = 0; v <= Math.ceil(wDataMax / wStep) * wStep; v += wStep) wTicks.push(v);

    const toX = (age: number) => plotX0 + ((age - AGE_MIN) / (AGE_MAX - AGE_MIN)) * plotW;
    const toYH = (v: number) => plotY1 - ((v - hBottom) / (hTop - hBottom)) * plotH;
    const toYW = (v: number) => plotY1 - (v / wTop) * plotH;

    return { hCurves, wCurves, hTicks, wTicks, toX, toYH, toYW };
  }, [oiType, sex, height.value, weight.value]);

  const { hCurves, wCurves, hTicks, wTicks, toX, toYH, toYW } = chart;
  const xTicks = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

  const inRange = ageYears !== null && ageYears >= AGE_MIN && ageYears <= AGE_MAX;
  const px = inRange ? toX(ageYears as number) : null;

  const gridColor = "rgba(100,116,139,0.2)";
  const axisColor = "#94a3b8";
  const textColor = "#64748b";

  const series = [
    { measure: "height" as const, curves: hCurves, toY: toYH, point: height },
    { measure: "weight" as const, curves: wCurves, toY: toYW, point: weight },
  ];

  return (
    <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="w-full h-auto" aria-label="身長・体重 標準成長曲線">
      {/* grid: 横線は身長10cmごと、縦線は2歳ごと */}
      {hTicks.map((v) => (
        <line key={`hg${v}`} x1={plotX0} y1={toYH(v)} x2={plotX1} y2={toYH(v)} stroke={gridColor} strokeWidth={1} />
      ))}
      {xTicks.map((age) => (
        <line key={`xg${age}`} x1={toX(age)} y1={plotY0} x2={toX(age)} y2={plotY1} stroke={gridColor} strokeWidth={1} />
      ))}

      {series.map(({ measure, curves, toY }) => {
        const c = COLORS[measure];
        const top = curves.map((p) => ({ x: toX(p.age), y: toY(p.byZ[2]) }));
        const bot = curves.map((p) => ({ x: toX(p.age), y: toY(p.byZ[-2]) }));
        const band = `${toPath(top)} ${[...bot].reverse().map((p) => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")} Z`;
        const last = curves[curves.length - 1];
        return (
          <g key={measure}>
            <path d={band} fill={c.band} stroke="none" />
            {Z_LINES.map((z) => (
              <path
                key={z}
                d={toPath(curves.map((p) => ({ x: toX(p.age), y: toY(p.byZ[z]) })))}
                fill="none"
                stroke={c.line}
                strokeWidth={z === 0 ? 2 : 1.2}
                strokeDasharray={Math.abs(z) === 2 ? "5,3" : undefined}
                opacity={z === 0 ? 1 : 0.75}
              />
            ))}
            {Z_LINES.map((z) => (
              <text
                key={`l${z}`}
                x={plotX1 - 3}
                y={toY(last.byZ[z]) - 3}
                textAnchor="end"
                fontSize={9}
                fill={c.line}
                fontWeight={500}
              >
                {zLabel(z)}
              </text>
            ))}
          </g>
        );
      })}

      {/* axes */}
      <line x1={plotX0} y1={plotY0} x2={plotX0} y2={plotY1} stroke={axisColor} strokeWidth={1} />
      <line x1={plotX1} y1={plotY0} x2={plotX1} y2={plotY1} stroke={axisColor} strokeWidth={1} />
      <line x1={plotX0} y1={plotY1} x2={plotX1} y2={plotY1} stroke={axisColor} strokeWidth={1} />

      {xTicks.map((age) => (
        <g key={`xt${age}`}>
          <line x1={toX(age)} y1={plotY1} x2={toX(age)} y2={plotY1 + 4} stroke={axisColor} strokeWidth={1} />
          <text x={toX(age)} y={plotY1 + 16} textAnchor="middle" fontSize={11} fill={textColor}>
            {age}
          </text>
        </g>
      ))}
      <text x={plotX0 + plotW / 2} y={VB.h - 6} textAnchor="middle" fontSize={11} fill={textColor}>
        年齢（歳）
      </text>

      {hTicks.map((v) => (
        <g key={`ht${v}`}>
          <line x1={plotX0 - 4} y1={toYH(v)} x2={plotX0} y2={toYH(v)} stroke={COLORS.height.line} strokeWidth={1} />
          <text x={plotX0 - 7} y={toYH(v) + 4} textAnchor="end" fontSize={10} fill={COLORS.height.line}>
            {v}
          </text>
        </g>
      ))}
      <text x={plotX0 - 7} y={plotY0 - 8} textAnchor="end" fontSize={10} fill={COLORS.height.line} fontWeight={600}>
        身長 cm
      </text>

      {wTicks.map((v) => (
        <g key={`wt${v}`}>
          <line x1={plotX1} y1={toYW(v)} x2={plotX1 + 4} y2={toYW(v)} stroke={COLORS.weight.line} strokeWidth={1} />
          <text x={plotX1 + 7} y={toYW(v) + 4} textAnchor="start" fontSize={10} fill={COLORS.weight.line}>
            {v}
          </text>
        </g>
      ))}
      <text
        x={plotX1 + 7}
        y={toYW(wTicks[wTicks.length - 1]) - 14}
        textAnchor="start"
        fontSize={10}
        fill={COLORS.weight.line}
        fontWeight={600}
      >
        体重 kg
      </text>

      {/* patient points */}
      {px !== null &&
        series.map(({ measure, toY, point }) => {
          if (point.value === null) return null;
          const py = toY(point.value);
          const c = COLORS[measure];
          return (
            <g key={`pt${measure}`}>
              <circle cx={px} cy={py} r={6} fill={c.dot} stroke="white" strokeWidth={2.5} />
              {point.zScore !== null && (
                <text x={px + 10} y={py + 4} fontSize={11} fontWeight={700} fill={c.dot}>
                  {point.zScore >= 0 ? "+" : ""}
                  {point.zScore.toFixed(2)}
                </text>
              )}
            </g>
          );
        })}
    </svg>
  );
}
