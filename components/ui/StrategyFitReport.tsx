import React, { useRef, useState } from "react";
import { RadarScores, StrategyFitResult } from "../../types";

/**
 * ===================================================
 * StrategyFitReport.tsx — AI 策略定位報告
 * 可列印 / 匯出 PDF 的雙頁分析報告元件
 * ===================================================
 */

export type RankItem = { name: string; score: number };
export type AbilityScore = { key: string; label: string; level: "低" | "中" | "高" };

export interface StrategyFitReportProps {
  proposalTitle: string;
  grantNameTop1: string;
  overallScore: number;
  radar: RadarScores;
  rankList: RankItem[];
  ability12: AbilityScore[];
  summaryIntro?: string;
  summaryNote?: string;
  analysisBullets?: string[];
}

// ========================
// 雷達圖元件 (純 SVG)
// ========================
const PureSvgRadarChart: React.FC<{ scores: RadarScores, size?: number }> = ({ scores, size = 280 }) => {
    const radarData = [
        { key: "policyFit", label: "政策契合" }, { key: "scopeAlignment", label: "範圍對齊" },
        { key: "eligibility", label: "資格符合" }, { key: "techReadiness", label: "技術成熟" },
        { key: "impactKPI", label: "KPI/效益" }, { key: "budgetMatch", label: "預算匹配" },
        { key: "timelineFit", label: "期程對齊" },
    ].map(d => ({ subject: d.label, score: (scores as any)[d.key] ?? 0 }));

    const center = size / 2;
    const radius = center * 0.65;
    const numLevels = 5;
    const angleSlice = (Math.PI * 2) / radarData.length;

    const getPoint = (value: number, angle: number) => {
        const x = center + value * Math.cos(angle - Math.PI / 2);
        const y = center + value * Math.sin(angle - Math.PI / 2);
        return `${x},${y}`;
    };

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Grid */}
            {[...Array(numLevels)].map((_, i) => {
                const levelRadius = radius * ((i + 1) / numLevels);
                const points = radarData.map((_, j) => getPoint(levelRadius, angleSlice * j)).join(' ');
                return <polygon key={`level-${i}`} points={points} fill="none" stroke="#e5e7eb" strokeWidth="1" />;
            })}
            {/* Axes */}
            {radarData.map((_, i) => {
                const [x2, y2] = getPoint(radius, angleSlice * i).split(',').map(parseFloat);
                return <line key={`axis-${i}`} x1={center} y1={center} x2={x2} y2={y2} stroke="#d1d5db" strokeWidth="1" />;
            })}
            {/* Labels */}
            {radarData.map(({ subject }, i) => {
                const labelRadius = radius * 1.2;
                const x = center + labelRadius * Math.cos(angleSlice * i - Math.PI / 2);
                const y = center + labelRadius * Math.sin(angleSlice * i - Math.PI / 2);
                let textAnchor: 'middle' | 'start' | 'end' = 'middle';
                if (x < center * 0.9) textAnchor = "end";
                if (x > center * 1.1) textAnchor = "start";
                return <text key={`label-${i}`} x={x} y={y} textAnchor={textAnchor} dominantBaseline="middle" fontSize="12" fill="#4b5563">{subject}</text>;
            })}
            {/* Data Polygon */}
            <polygon 
                points={radarData.map(({ score }, i) => getPoint((score / 100) * radius, angleSlice * i)).join(' ')}
                fill="#38bdf8"
                fillOpacity="0.4"
                stroke="#0ea5e9"
                strokeWidth="2"
            />
        </svg>
    );
};


function RadarCard({ title, scores }: { title: string; scores: RadarScores }) {
  return (
    <div className="rounded-2xl border p-4 bg-white shadow-sm flex flex-col items-center">
      <div className="text-sm font-semibold mb-2">{title}</div>
      <PureSvgRadarChart scores={scores} />
    </div>
  );
}

// ========================
// 排行榜
// ========================
function RankTable({ list }: { list: RankItem[] }) {
  const sorted = [...list].sort((a, b) => b.score - a.score);
  return (
    <div className="rounded-2xl border p-4 bg-white shadow-sm">
      <div className="text-sm font-semibold mb-3">契合度分數排行榜</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-500">
            <th className="text-left w-10">#</th>
            <th className="text-left">領域</th>
            <th className="text-right">分數</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={r.name} className="border-t">
              <td className="py-2 pr-2">{i + 1}</td>
              <td className="py-2">{r.name}</td>
              <td className="py-2 text-right font-semibold text-emerald-700">{r.score}分</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ========================
// 12 指標表格
// ========================
function AbilityGrid({ items }: { items: AbilityScore[] }) {
  return (
    <div className="rounded-2xl border p-4 bg-white shadow-sm">
      <div className="text-sm font-semibold mb-3">12 領域配適度</div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        {items.map((a) => (
          <div key={a.key} className="border rounded-lg p-2 flex items-center justify-between">
            <span className="text-slate-700">{a.label}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-white ${
                a.level === "高"
                  ? "bg-emerald-600"
                  : a.level === "中"
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
            >
              {a.level}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========================
// 主報告組件
// ========================
export function StrategyFitReport({
  proposalTitle,
  grantNameTop1,
  overallScore,
  radar,
  rankList,
  ability12,
  summaryIntro = "根據上傳之《申請須知》與構想摘要，完成資格 Gate 檢核與七大構面契合度評分。",
  summaryNote = "分數為 0~100，雷達越大表示越契合；若資格 Gate 有不符合，將限制總分上限。",
  analysisBullets = ["聚焦政策關鍵詞與量化 KPI", "預算比例調整至合規", "期程對齊徵案時程"],
}: StrategyFitReportProps) {
  return (
    <div className="w-[794px] mx-auto bg-slate-50 text-slate-800">
      {/* Page 1 */}
      <section className="min-h-[1123px] p-8 flex flex-col gap-6 bg-white">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">構想 × 徵案契合度報告</h1>
            <p className="text-sm text-slate-600 mt-1">計畫構想：{proposalTitle}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">AI Strategy Fit</div>
            <div className="text-3xl font-extrabold text-sky-600">
              {Math.round(overallScore)} <span className="text-xl">分</span>
            </div>
          </div>
        </header>

        <div className="rounded-2xl bg-sky-50 border p-5">
          <p className="text-sm leading-6">{summaryIntro}</p>
          <p className="text-xs text-slate-600 mt-2">{summaryNote}</p>
        </div>

        <div className="grid grid-cols-5 gap-5">
          <div className="col-span-3">
            <RadarCard title="構想 × 徵案 契合度雷達" scores={radar} />
          </div>
          <div className="col-span-2 space-y-4">
            <RankTable list={rankList} />
            <div className="rounded-2xl border p-4 bg-white">
              <div className="text-sm font-semibold mb-2">顧問建議</div>
              <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                {analysisBullets.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Page 2 */}
      <section className="min-h-[1123px] p-8 flex flex-col gap-6 bg-white border-t">
        <header className="flex items-center justify-between">
          <div className="text-sm">
            <div className="text-slate-500">匹配度排名 No.1</div>
            <div className="inline-block mt-1 px-3 py-1 rounded-lg bg-sky-600 text-white font-semibold">
              {grantNameTop1}
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">
            {Math.round(overallScore)} <span className="text-xl ml-1">分</span>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-6">
          <RadarCard title="No.1 深入雷達圖" scores={radar} />
          <AbilityGrid items={ability12} />
        </div>

        <div className="rounded-2xl border p-4 bg-white">
          <div className="text-sm font-semibold mb-2">整體建議摘要</div>
          <p className="text-sm text-slate-700 leading-6">
            建議以「政策主軸關鍵詞 + 可量化 KPI」作為摘要重點。若預算中人事費超過 50%，請重新分配至外包與場域費。
            另在時程設計上，建議增加中期驗收點與第三方查核資料，以提高審查穩定度。
          </p>
        </div>
      </section>
    </div>
  );
}

// ========================
// 型別與映射工具
// ========================
export function mapStrategyFitToReportProps(r: StrategyFitResult): StrategyFitReportProps {
  const level = (v: number) => (v >= 80 ? "高" : v >= 60 ? "中" : "低") as "高" | "中" | "低";
  return {
    proposalTitle: `${r.grantName ?? "補助案"} 契合度分析`,
    grantNameTop1: r.grantName ?? "目標徵案",
    overallScore: r.overallScore,
    radar: r.radar,
    rankList: [
      { name: "行政財務類", score: r.radar.policyFit },
      { name: "技術研發類", score: r.radar.techReadiness },
      { name: "營運成長類", score: r.radar.impactKPI },
      { name: "策略拓新類", score: r.radar.scopeAlignment },
      { name: "時程管理類", score: r.radar.timelineFit },
      { name: "預算效益類", score: r.radar.budgetMatch },
    ],
    ability12: [
      { key: "policy", label: "政策對應力", level: level(r.radar.policyFit) },
      { key: "kpi", label: "KPI 設計力", level: level(r.radar.impactKPI) },
      { key: "exec", label: "執行力", level: level(r.radar.timelineFit) },
      { key: "budget", label: "預算配置力", level: level(r.radar.budgetMatch) },
      { key: "innovation", label: "創新推進力", level: level(r.radar.scopeAlignment) },
      { key: "tech", label: "技術成熟度", level: level(r.radar.techReadiness) },
      { key: "data", label: "資料治理力", level: "中" },
      { key: "partner", label: "協作力", level: "高" },
      { key: "timeline", label: "期程掌控力", level: level(r.radar.timelineFit) },
      { key: "domain", label: "產業洞察力", level: "高" },
      { key: "security", label: "ESG/資安對應", level: "中" },
      { key: "comms", label: "簡報溝通力", level: "高" },
    ],
  };
}

// ========================
// 匯出 PDF 容器
// ========================
export function ExportableStrategyFitReport({ result }: { result: StrategyFitResult }) {
  const props = mapStrategyFitToReportProps(result);
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  const exportPDF = async () => {
    if (!ref.current) return;
    setLoading(true);
    // Dynamically import libraries to avoid loading them unless needed
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const sections = Array.from(ref.current.querySelectorAll("section"));
    for (let i = 0; i < sections.length; i++) {
      const canvas = await html2canvas(sections[i], { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const img = canvas.toDataURL("image/png");
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      if (i > 0) pdf.addPage();
      pdf.addImage(img, "PNG", 0, 0, imgWidth, imgHeight);
    }
    pdf.save("StrategyFitReport.pdf");
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-8 pt-4">
        <h2 className="text-lg font-semibold">構想 × 徵案契合度報告</h2>
        <button
          onClick={exportPDF}
          disabled={loading}
          className="px-4 py-2 bg-sky-600 text-white rounded-xl disabled:opacity-60"
        >
          {loading ? "匯出中…" : "匯出 PDF"}
        </button>
      </div>
      <div ref={ref}>
        <StrategyFitReport {...props} />
      </div>
    </div>
  );
}