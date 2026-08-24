"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl";
}

export default function AppShell({
  title,
  subtitle,
  children,
  maxWidth = "4xl",
}: AppShellProps) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="テーマ切り替え"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <main className={`flex-1 max-w-${maxWidth} mx-auto w-full px-3 sm:px-6 py-6 sm:py-8 overflow-x-hidden`}>
        {children}
      </main>

      <footer className="px-6 py-6 text-center text-xs text-slate-400 dark:text-slate-600 space-y-1.5">
        <p>本ツールは診療支援目的です。最終判断は必ず医師が行ってください。</p>
        <p className="leading-relaxed">
          Reference: Robinson ME, Rauch D, Glorieux FH, Rauch F. Standardized growth charts for
          children with osteogenesis imperfecta.{" "}
          <em>Pediatr Res.</em> 2023;94(3):1075–1082.{" "}
          <a
            href="https://doi.org/10.1038/s41390-023-02550-0"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
          >
            doi:10.1038/s41390-023-02550-0
          </a>
        </p>
        <p>OI type I（軽症型）・III（重症型）・IV（中等症型）別・性別 LMS 法に基づく身長／体重標準値。</p>
        <p>乳児期（3〜36か月）と幼児〜思春期（2〜20歳）で異なる参照テーブルを使用。</p>
      </footer>
    </div>
  );
}
