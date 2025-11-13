import React, { useState, useMemo, useEffect } from 'react';
import { Proposal, ScoringCriterion, AITone, LLMProvider, ComparisonData } from '../../types';
import Card from '../ui/Card';
import { compareProposals } from '../../services/geminiService';
import RadarChart from '../ui/RadarChart';
import { useNotification } from '../../contexts/NotificationProvider';

interface Stage6Props {
  projects: Proposal[];
  scoringCriteria: ScoringCriterion[];
  aiTone: AITone;
  llmProvider: LLMProvider;
  initialSelectedIds?: string[];
  onComparisonLoaded?: () => void;
}

const Stage6Comparison: React.FC<Stage6Props> = ({ projects, scoringCriteria, aiTone, llmProvider, initialSelectedIds, onComparisonLoaded }) => {
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const { showNotification } = useNotification();

  useEffect(() => {
    if (initialSelectedIds && initialSelectedIds.length > 0) {
      setSelectedProjectIds(initialSelectedIds);
      if (onComparisonLoaded) {
        onComparisonLoaded();
      }
    }
  }, [initialSelectedIds, onComparisonLoaded]);

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectIds(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleStartComparison = async () => {
    if (selectedProjectIds.length < 2) {
      showNotification('請至少選擇兩個計畫進行比較。', 'warning');
      return;
    }
    setIsLoading(true);
    setLoadingMessage('正在啟動 AI 審查委員...');
    setComparisonData(null);
    const selectedProjects = projects.filter(p => selectedProjectIds.includes(p.id));
    
    setTimeout(() => setLoadingMessage(`正在評估 ${selectedProjects.length} 個計畫的 ${scoringCriteria.length} 個面向...`), 1000);
    
    try {
      const result = await compareProposals(selectedProjects, scoringCriteria, aiTone, llmProvider);
      setComparisonData(result);
    } catch (error: any) {
      console.error("Error comparing proposals:", error);
      showNotification(error.message || "計畫比較失敗，請稍後再試。", 'error');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };
  
  const rankedProjects = useMemo(() => {
    if (!comparisonData) return [];
    
    return projects
      .filter(p => selectedProjectIds.includes(p.id))
      .map(p => {
          const totalScore = scoringCriteria.reduce((acc, crit) => {
              const score = comparisonData.scores[p.id]?.[crit.id]?.score || 0;
              return acc + score * (crit.weight / 100);
          }, 0);
          return { ...p, totalScore };
      })
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((p, index) => ({...p, rank: index + 1 }));
      
  }, [comparisonData, projects, scoringCriteria, selectedProjectIds]);
  
  const radarChartData = useMemo(() => {
    if (!comparisonData) return [];
    
    return rankedProjects.map(project => ({
      title: project.title,
      scoresByCriterion: scoringCriteria.reduce((acc, criterion) => {
        acc[criterion.id] = { raw: comparisonData.scores[project.id]?.[criterion.id]?.score || 0 };
        return acc;
      }, {} as Record<string, { raw: number }>)
    }));
  }, [comparisonData, rankedProjects, scoringCriteria]);


  return (
    <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Control Panel */}
            <div className="lg:col-span-1">
                <Card>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">比較設定</h3>
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600 font-medium">1. 選擇要比較的計畫</p>
                        {projects.map(project => (
                        <label key={project.id} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition">
                            <input
                            type="checkbox"
                            checked={selectedProjectIds.includes(project.id)}
                            onChange={() => handleSelectProject(project.id)}
                            className="h-5 w-5 text-[#FF6B6B] border-gray-300 rounded focus:ring-[#FF6B6B]"
                            />
                            <span className="ml-3 font-medium text-gray-800 text-sm">{project.title}</span>
                        </label>
                        ))}
                    </div>
                    <p className="text-sm text-gray-600 font-medium mt-6 mb-3">2. 執行 AI 分析</p>
                    <button
                        onClick={handleStartComparison}
                        disabled={isLoading || selectedProjectIds.length < 2}
                        className="w-full bg-[#FF6B6B] text-white font-semibold py-2.5 px-4 rounded-2xl shadow-sm hover:bg-[#fa5a5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B6B] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center justify-center transition"
                        >
                        {isLoading ? (
                            <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {loadingMessage || '分析中...'}
                            </>
                        ) : `建立 ${selectedProjectIds.length} 個計畫的比較矩陣`}
                    </button>
                </Card>
            </div>
            
            {/* Results Panel */}
            <div className="lg:col-span-2">
                <Card>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">AI 比較矩陣與報告</h3>

                    {!comparisonData && !isLoading && (
                        <div className="text-center py-20 border-2 border-dashed rounded-lg">
                            <p className="text-gray-500">請從左側選擇至少兩個計畫，</p>
                            <p className="text-gray-500">然後點擊按鈕以建立比較矩陣。</p>
                        </div>
                    )}
                    {isLoading && (
                        <div className="text-center py-20 border-2 border-dashed rounded-lg">
                            <p className="text-gray-600 font-semibold">{loadingMessage || 'AI 審查委員正在分析計畫...'}</p>
                        </div>
                    )}
                    {comparisonData && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                                <div>
                                    <h4 className="font-semibold text-lg text-gray-800 mb-2">高階主管摘要</h4>
                                    <div className="p-4 bg-red-50 rounded-md text-sm text-gray-800 border border-red-200 prose prose-sm max-w-none">
                                        {comparisonData.summary}
                                    </div>
                                </div>
                                <div className="flex flex-col items-center">
                                    <h4 className="font-semibold text-lg text-gray-800 mb-2">計畫雷達圖</h4>
                                    <RadarChart data={radarChartData} criteria={scoringCriteria} />
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="font-semibold text-lg text-gray-800 mb-3">比較矩陣</h4>
                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="min-w-full bg-white">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/3">計畫名稱</th>
                                                {scoringCriteria.map(c => <th key={c.id} className="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">{c.name} ({c.weight}%)</th>)}
                                                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">加權總分</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rankedProjects.map((p) => (
                                                <tr key={p.id} className="hover:bg-gray-50 border-t">
                                                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                                        <span className={`font-bold mr-2 ${p.rank === 1 ? 'text-[#FF6B6B]' : 'text-gray-400'}`}>#{p.rank}</span>
                                                        {p.title}
                                                    </td>
                                                    {scoringCriteria.map(c => {
                                                        const scoreData = comparisonData.scores[p.id]?.[c.id];
                                                        const weightedScore = (scoreData?.score || 0) * (c.weight / 100);
                                                        return (
                                                            <td key={c.id} className="py-3 px-4 text-center text-sm text-gray-700 relative group">
                                                                <span className="font-semibold">{scoreData?.score ?? 'N/A'}</span>
                                                                <span className="text-gray-500 text-xs ml-1">({weightedScore.toFixed(1)})</span>
                                                                {scoreData?.justification && <div className="absolute z-10 bottom-full mb-2 w-48 left-1/2 -translate-x-1/2 p-2 text-xs text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">{scoreData.justification}</div>}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="py-3 px-4 text-center text-sm font-bold text-[#FF6B6B]">{p.totalScore.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    </div>
  );
};

export default Stage6Comparison;