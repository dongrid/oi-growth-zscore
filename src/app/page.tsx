"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import GrowthChart from "@/components/GrowthChart";
import {
  getLms,
  calcZScore,
  isAgeInRange,
  AGE_MIN,
  AGE_MAX,
  type Sex,
  type OiType,
  type Measure,
} from "@/lib/oiGrowth";
import { OI_TYPE_LABEL } from "@/lib/oiLmsData";

const OI_TYPES: OiType[] = ["I", "IV", "III"];

function zColor(z: number): string {
  const abs = Math.abs(z);
  if (abs <= 1) return "text-emerald-600 dark:text-emerald-400";
  if (abs <= 2) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function zInterpret(z: number): string {
  if (z < -2) return "低値（−2 SD 未満）";
  if (z < -1) return "やや低値（−2〜−1 SD）";
  if (z <= 1) return "正常範囲（±1 SD 以内）";
  if (z <= 2) return "やや高値（+1〜+2 SD）";
  return "高値（+2 SD 超）";
}

const inputCls =
  "w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function parsePositive(s: string): number | null {
  if (s === "") return null;
  const n = parseFloat(s);
  return !isNaN(n) && n > 0 ? n : null;
}

export default function Home() {
  const [oiType, setOiType] = useState<OiType>("I");
  const [sex, setSex] = useState<Sex>("male");
  const [ageMode, setAgeMode] = useState<"simple" | "exact">("simple");
  const [ageYear, setAgeYear] = useState<number>(5);
  const [ageMonth, setAgeMonth] = useState<number>(0);
  const [birthDate, setBirthDate] = useState<string>("");
  const [measureDate, setMeasureDate] = useState<string>(
    () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" })
  );
  const [heightInput, setHeightInput] = useState<string>("");
  const [weightInput, setWeightInput] = useState<string>("");
  const [chartMeasure, setChartMeasure] = useState<Measure>("height");

  const ageDecimal = useMemo((): number | null => {
    if (ageMode === "exact") {
      if (!birthDate) return null;
      const ms = new Date(measureDate).getTime() - new Date(birthDate).getTime();
      const days = ms / (1000 * 60 * 60 * 24);
      return Math.max(0, days / 365.25);
    }
    return ageYear + ageMonth / 12;
  }, [ageMode, ageYear, ageMonth, birthDate, measureDate]);

  const ageOutOfRange = ageDecimal !== null && !isAgeInRange(ageDecimal);

  const results = useMemo(() => {
    const height = parsePositive(heightInput);
    const weight = parsePositive(weightInput);
    const age = ageDecimal ?? 0;
    const canCompute = ageDecimal !== null && !ageOutOfRange;

    const measures: { measure: Measure; val: number | null }[] = [
      { measure: "height", val: height },
      { measure: "weight", val: weight },
    ];

    return measures.map(({ measure, val }) => {
      const lms = getLms(oiType, sex, measure, age);
      const z = val !== null && canCompute ? calcZScore(val, lms) : null;
      return { measure, val, lms, z };
    });
  }, [oiType, sex, ageDecimal, ageOutOfRange, heightInput, weightInput]);

  const chartResult = results.find((r) => r.measure === chartMeasure)!;

  return (
    <AppShell
      title="骨形成不全症 身長体重SDS"
      subtitle="OI type I・III・IV別・性別標準成長曲線（Robinson 2023）"
      maxWidth="6xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Left: inputs */}
        <div className="flex flex-col gap-4">
          {/* OI type */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">OIタイプ</p>
            <div className="flex flex-col gap-2">
              {OI_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setOiType(t)}
                  className={`w-full py-2 rounded-lg text-sm font-medium transition-colors text-left px-3 ${
                    oiType === t
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {OI_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Sex */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">性別</p>
            <div className="flex gap-2">
              {(["male", "female"] as Sex[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSex(s)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sex === s
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {s === "male" ? "男児" : "女児"}
                </button>
              ))}
            </div>
          </div>

          {/* Age + measurements */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">年齢 / 身長・体重</p>

            <div className="flex gap-2 mb-3">
              {(["simple", "exact"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setAgeMode(mode)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    ageMode === mode
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {mode === "simple" ? "年齢で入力" : "生年月日から計算"}
                </button>
              ))}
            </div>

            {ageMode === "simple" ? (
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    <select value={ageYear} onChange={(e) => setAgeYear(Number(e.target.value))} className={inputCls}>
                      {Array.from({ length: 21 }, (_, i) => i).map((y) => (
                        <option key={y} value={y}>{y} 歳</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-0">
                    <select value={ageMonth} onChange={(e) => setAgeMonth(Number(e.target.value))} className={inputCls}>
                      {Array.from({ length: 12 }, (_, i) => i).map((m) => (
                        <option key={m} value={m}>{m} か月</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 text-right">
                  {ageYear} 歳 {ageMonth} か月（{(ageYear + ageMonth / 12).toFixed(2)} 歳）
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div>
                  <label className="text-xs text-slate-400 dark:text-slate-500 mb-1 block">生年月日</label>
                  <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 dark:text-slate-500 mb-1 block">測定日</label>
                  <input type="date" value={measureDate} onChange={(e) => setMeasureDate(e.target.value)} className={inputCls} />
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">(測定日 − 生年月日) ÷ 365.25</p>
              </div>
            )}

            {ageDecimal === null && ageMode === "exact" && (
              <p className="mt-2 text-xs text-amber-500">生年月日を入力してください</p>
            )}
            {ageOutOfRange && (
              <p className="mt-2 text-xs text-red-500 font-medium">
                対象年齢範囲外です（{AGE_MIN}〜{AGE_MAX.toFixed(0)} 歳のみ）
              </p>
            )}
            {ageDecimal !== null && !ageOutOfRange && ageMode === "exact" && (
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 text-right">
                {Math.floor(ageDecimal)} 歳 {Math.floor((ageDecimal - Math.floor(ageDecimal)) * 12)} か月（{ageDecimal.toFixed(2)} 歳）
              </p>
            )}

            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-xs text-slate-400 dark:text-slate-500 mb-1 block">身長 (cm)</label>
                <input
                  type="number"
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                  placeholder="100.0"
                  step={0.1}
                  min={0}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 dark:text-slate-500 mb-1 block">体重 (kg)</label>
                <input
                  type="number"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder="15.0"
                  step={0.1}
                  min={0}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: chart + results */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {chartMeasure === "height" ? "身長" : "体重"}標準曲線 — {OI_TYPE_LABEL[oiType]}
              </p>
              <div className="flex gap-1">
                {(["height", "weight"] as Measure[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setChartMeasure(m)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      chartMeasure === m
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                    }`}
                  >
                    {m === "height" ? "身長" : "体重"}
                  </button>
                ))}
              </div>
            </div>

            {chartResult.z !== null && (
              <div className="mb-3 rounded-xl bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {chartMeasure === "height" ? "身長" : "体重"}SDS（Zスコア）
                  </p>
                  <p className={`text-2xl font-bold tabular-nums ${zColor(chartResult.z)}`}>
                    {chartResult.z >= 0 ? "+" : ""}
                    {chartResult.z.toFixed(2)}
                  </p>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{zInterpret(chartResult.z)}</p>
                </div>
                <div className="text-right text-xs text-slate-400 dark:text-slate-500 font-mono">
                  <p>L = {chartResult.lms.L.toFixed(3)}</p>
                  <p>M = {chartResult.lms.M.toFixed(2)}</p>
                  <p>S = {chartResult.lms.S.toFixed(3)}</p>
                </div>
              </div>
            )}

            <GrowthChart
              oiType={oiType}
              sex={sex}
              measure={chartMeasure}
              ageYears={ageDecimal}
              measuredValue={chartResult.val}
              zScore={chartResult.z}
            />

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                SDS一覧
                <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">（クリックでグラフ切替）</span>
              </p>
              <div className="flex flex-col gap-1">
                {results.map(({ measure, z }) => (
                  <button
                    key={measure}
                    onClick={() => setChartMeasure(measure)}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors text-left ${
                      chartMeasure === measure
                        ? "bg-blue-50 dark:bg-blue-950 border border-blue-400 dark:border-blue-500"
                        : "hover:bg-slate-50 dark:hover:bg-slate-700 border border-transparent"
                    }`}
                  >
                    <span className="text-slate-600 dark:text-slate-300 text-xs">
                      {measure === "height" ? "身長SDS" : "体重SDS"}
                    </span>
                    {z !== null ? (
                      <span className={`font-bold font-mono text-sm ${zColor(z)}`}>
                        {z >= 0 ? "+" : ""}
                        {z.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
