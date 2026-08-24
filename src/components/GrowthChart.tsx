"use client";

import { useMemo } from "react";
import { getLms, zToValue, AGE_MIN, AGE_MAX } from "@/lib/oiGrowth";
import type { OiType, Sex, Measure } from "@/lib/oiGrowth";

interface Props {
  oiType: OiType;
  sex: Sex;
  measure: Measure;
  ageYears: number | null;
  measuredValue: number | null;
  zScore: number | null;
}

const CHART = {
  vb: { w: 640, h: 380 },
  pad: { top: 24, right: 56, bottom: 48, left: 56 },
} as const;

const plotW = CHART.vb.w - CHART.pad.left - CHART.pad.right;
const plotH = CHART.vb.h - CHART.pad.top - CHART.pad.bottom;
const plotX0 = CHART.pad.left;
const plotY0 = CHART.pad.top;
const plotX1 = plotX0 + plotW;
const plotY1 = plotY0 + plotH;

const N_POINTS = 240;

function toPath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

function toBandPath(top: { x: number; y: number }[], bot: { x: number; y: number }[]): string {
  const fwd = toPath(top);
  const rev = [...bot].reverse().map((p) => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  return `${fwd} ${rev} Z`;
}

const unitFor = (measure: Measure) => (measure === "height" ? "cm" : "kg");
const labelFor = (measure: Measure) => (measure === "height" ? "身長" : "体重");

export default function GrowthChart({ oiType, sex, measure, ageYears, measuredValue, zScore }: Props) {
  const { curves, toX, toY, yTicks, xTicks } = useMemo(() => {
    const ages = Array.from({ length: N_POINTS + 1 }, (_, i) => AGE_MIN + (i / N_POINTS) * (AGE_MAX - AGE_MIN));

    const curveData = ages.map((age) => {
      const lms = getLms(oiType, sex, measure, age);
      return {
        age,
        m2: zToValue(-2, lms),
        m1: zToValue(-1, lms),
        mean: zToValue(0, lms),
        p1: zToValue(1, lms),
        p2: zToValue(2, lms),
      };
    });

    const allVals = curveData.flatMap((c) => [c.m2, c.p2]);
    if (measuredValue !== null) allVals.push(measuredValue);

    const rawMin = Math.min(...allVals);
    const rawMax = Math.max(...allVals);
    const pad = (rawMax - rawMin) * 0.08;
    const yMin = Math.max(0, rawMin - pad);
    const yMax = rawMax + pad;

    const toX = (age: number) => plotX0 + ((age - AGE_MIN) / (AGE_MAX - AGE_MIN)) * plotW;
    const toY = (val: number) => plotY1 - ((val - yMin) / (yMax - yMin)) * plotH;

    const yStep = (yMax - yMin) / 5;
    const yTicks = Array.from({ length: 6 }, (_, i) => yMin + yStep * i);
    const xTicks = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

    return { curves: curveData, toX, toY, yTicks, xTicks };
  }, [oiType, sex, measure, measuredValue]);

  const pathFor = (key: "m2" | "m1" | "mean" | "p1" | "p2") =>
    toPath(curves.map((c) => ({ x: toX(c.age), y: toY(c[key]) })));

  const inRange = ageYears !== null && ageYears >= AGE_MIN && ageYears <= AGE_MAX;
  const patientX = inRange ? toX(ageYears as number) : null;
  const patientY = inRange && measuredValue !== null ? toY(measuredValue) : null;

  const gridColor = "rgba(100,116,139,0.2)";
  const axisColor = "#94a3b8";
  const textColor = "#64748b";

  return (
    <svg viewBox={`0 0 ${CHART.vb.w} ${CHART.vb.h}`} className="w-full h-auto" aria-label={`${labelFor(measure)}標準曲線`}>
      {yTicks.map((val, i) => (
        <line key={i} x1={plotX0} y1={toY(val)} x2={plotX1} y2={toY(val)} stroke={gridColor} strokeWidth={1} />
      ))}
      {xTicks.map((age) => (
        <line key={age} x1={toX(age)} y1={plotY0} x2={toX(age)} y2={plotY1} stroke={gridColor} strokeWidth={1} />
      ))}

      {/* ±1 SD — green */}
      <path
        d={toBandPath(
          curves.map((c) => ({ x: toX(c.age), y: toY(c.p1) })),
          curves.map((c) => ({ x: toX(c.age), y: toY(c.m1) }))
        )}
        fill="rgba(34,197,94,0.12)"
        stroke="none"
      />
      {/* ±1-2 SD — amber */}
      <path
        d={toBandPath(
          curves.map((c) => ({ x: toX(c.age), y: toY(c.p2) })),
          curves.map((c) => ({ x: toX(c.age), y: toY(c.p1) }))
        )}
        fill="rgba(245,158,11,0.15)"
        stroke="none"
      />
      <path
        d={toBandPath(
          curves.map((c) => ({ x: toX(c.age), y: toY(c.m1) })),
          curves.map((c) => ({ x: toX(c.age), y: toY(c.m2) }))
        )}
        fill="rgba(245,158,11,0.15)"
        stroke="none"
      />
      {/* beyond ±2 SD — red */}
      <path
        d={toBandPath(
          curves.map((c) => ({ x: toX(c.age), y: plotY0 })),
          curves.map((c) => ({ x: toX(c.age), y: toY(c.p2) }))
        )}
        fill="rgba(239,68,68,0.07)"
        stroke="none"
      />
      <path
        d={toBandPath(
          curves.map((c) => ({ x: toX(c.age), y: toY(c.m2) })),
          curves.map((c) => ({ x: toX(c.age), y: plotY1 }))
        )}
        fill="rgba(239,68,68,0.07)"
        stroke="none"
      />

      <path d={pathFor("m2")} fill="none" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5,3" />
      <path d={pathFor("m1")} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,2" />
      <path d={pathFor("mean")} fill="none" stroke="#22c55e" strokeWidth={2} />
      <path d={pathFor("p1")} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,2" />
      <path d={pathFor("p2")} fill="none" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5,3" />

      {[
        { key: "p2" as const, label: "+2 SD", color: "#ef4444" },
        { key: "p1" as const, label: "+1 SD", color: "#f59e0b" },
        { key: "mean" as const, label: "Mean", color: "#22c55e" },
        { key: "m1" as const, label: "−1 SD", color: "#f59e0b" },
        { key: "m2" as const, label: "−2 SD", color: "#ef4444" },
      ].map(({ key, label, color }) => {
        const last = curves[curves.length - 1];
        const y = toY(last[key]);
        return (
          <text key={key} x={plotX1 + 4} y={y + 4} fontSize={9} fill={color} fontWeight={500}>
            {label}
          </text>
        );
      })}

      {patientX !== null && patientY !== null && (
        <g>
          <circle cx={patientX} cy={patientY} r={7} fill="#3b82f6" stroke="white" strokeWidth={3} />
          {zScore !== null && (
            <text x={patientX} y={patientY - 12} textAnchor="middle" fontSize={11} fontWeight={700} fill="#3b82f6">
              Z={zScore >= 0 ? "+" : ""}
              {zScore.toFixed(2)}
            </text>
          )}
        </g>
      )}

      <line x1={plotX0} y1={plotY0} x2={plotX0} y2={plotY1} stroke={axisColor} strokeWidth={1} />
      <line x1={plotX0} y1={plotY1} x2={plotX1} y2={plotY1} stroke={axisColor} strokeWidth={1} />

      {xTicks.map((age) => (
        <g key={age}>
          <line x1={toX(age)} y1={plotY1} x2={toX(age)} y2={plotY1 + 4} stroke={axisColor} strokeWidth={1} />
          <text x={toX(age)} y={plotY1 + 16} textAnchor="middle" fontSize={11} fill={textColor}>
            {age}
          </text>
        </g>
      ))}
      <text x={plotX0 + plotW / 2} y={CHART.vb.h - 6} textAnchor="middle" fontSize={11} fill={textColor}>
        年齢（歳）
      </text>

      {yTicks.map((val, i) => (
        <g key={i}>
          <line x1={plotX0 - 4} y1={toY(val)} x2={plotX0} y2={toY(val)} stroke={axisColor} strokeWidth={1} />
          <text x={plotX0 - 8} y={toY(val) + 4} textAnchor="end" fontSize={10} fill={textColor}>
            {val.toFixed(measure === "weight" && val < 10 ? 1 : 0)}
          </text>
        </g>
      ))}
      <text x={12} y={plotY0 - 8} fontSize={10} fill={textColor}>
        {labelFor(measure)}（{unitFor(measure)}）
      </text>
    </svg>
  );
}
