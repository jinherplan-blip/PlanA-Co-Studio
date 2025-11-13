import React, { useState } from 'react';
import { Proposal, TableData, AITone, LLMProvider, SwotAnalysis } from '../../types';
import Card from '../ui/Card';
import { 
    generateKpiTable, 
    generateBudgetPlan, 
    generateRiskMatrix,
    generatePolicyTable,
    generateTrlTable,
    generateMarketTable,
    generateResourceTable,
    performThematicResearch,
    generateSwotAnalysis,
    generateStakeholderTable,
    generateIpStrategyTable,
    generateEsgMetricsTable,
    generateProjectMilestonesTable
} from '../../services/geminiService';
import { useNotification } from '../../contexts/NotificationProvider';
import Modal from '../ui/Modal';
import RadarChart from '../ui/RadarChart';


interface Stage2Props {
  tableData: TableData;
  setTableData: React.Dispatch<React.SetStateAction<TableData>>;
  proposal: Proposal;
  aiTone: AITone;
  llmProvider: LLMProvider;
  swotAnalysis: SwotAnalysis | null | undefined;
  setSwotAnalysis: (analysis: SwotAnalysis | null) => void;
}

type TableKey = keyof TableData;
type AnalysisKey = TableKey | 'swot';

// Moved icon definitions before their usage to resolve "used before declaration" errors.
const iconClass = "w-6 h-6";
const PolicyIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18" /></svg>);
const TRLIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>);
const MarketIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>);
const ResourceIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>);
const KPIIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>);
const RiskIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>);
const BudgetIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15A2.25 2.25 0 0 0 2.25 6.75v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>);
const SwotIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25v2.25A2.25 2.25 0 0 1 8.25 20.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25v2.25A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>);
const StakeholderIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m-7.5-2.962c.51.056 1.02.086 1.53.086 2.17 0 4.24-.585 6.12-1.58M12 6.03a6.002 6.002 0 0 0-4.148 2.002 6.002 6.002 0 0 0-4.148-2.002Zm0 2.262a6.002 6.002 0 0 1 4.148 2.002 6.002 6.002 0 0 1 4.148-2.002m-9.292 8.41a5.988 5.988 0 0 1-2.874-.478 3 3 0 0 1 4.682-2.72m-3.741.479A9.094 9.094 0 0 1 6 18.72" /></svg>);
const IPIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg>);
const ESGIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.43M12 21a9 9 0 0 1-8.716-6.43M12 21c-.021 0-.042 0-.063 0m.063 0a8.966 8.966 0 0 1-4.21-1.42m4.21 1.42a8.966 8.966 0 0 0 4.21-1.42m-8.42 0a8.966 8.966 0 0 0-4.21-1.42m8.42 0a8.966 8.966 0 0 1 4.21-1.42M3.284 14.57a9.004 9.004 0 0 0-2.023-4.285M3.284 14.57a9 9 0 0 1 8.716-6.43m-8.716 6.43a9 9 0 0 0 8.716 6.43m0-12.86a9 9 0 0 0-8.716 6.43m8.716-6.43c.021 0 .042 0 .063 0m-.063 0a8.966 8.966 0 0 1 4.21 1.42m-4.21-1.42a8.966 8.966 0 0 0-4.21 1.42m8.42 0a8.966 8.966 0 0 0 4.21 1.42m-8.42 0a8.966 8.966 0 0 1-4.21 1.42M20.716 14.57a9.004 9.004 0 0 0 2.023-4.285m-2.023 4.285a9 9 0 0 1-8.716 6.43m8.716-6.43a9 9 0 0 0-8.716-6.43m0 12.86a9 9 0 0 0 8.716-6.43" /></svg>);
const MilestoneIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0h18M15.75 12h.008v.008h-.008V12Zm-3.75 0h.008v.008h-.008V12Zm-3.75 0h.008v.008h-.008V12Z" /></svg>);


const analysisItems: { key: AnalysisKey; name: string; description: string; icon: React.ReactNode; }[] = [
    { key: 'policyCorrespondence', name: '政策對應表', description: '分析計畫與當前政府政策的契合度。', icon: <PolicyIcon /> },
    { key: 'trl', name: '技術成熟度 (TRL)', description: '評估計畫核心技術的成熟階段與發展路徑。', icon: <TRLIcon /> },
    { key: 'marketOpportunity', name: '市場機會表', description: '識別目標市場規模、潛力與主要競爭者。', icon: <MarketIcon /> },
    { key: 'resourceInventory', name: '資源盤點表', description: '盤點執行計畫所需的人力、技術與數據資源。', icon: <ResourceIcon /> },
    { key: 'kpiDraft', name: 'KPI 草案表', description: '草擬可量化的關鍵績效指標以衡量計畫成功。', icon: <KPIIcon /> },
    { key: 'riskMatrix', name: '風險矩陣', description: '識別潛在的技術、市場或法規風險與應對策略。', icon: <RiskIcon /> },
    { key: 'stakeholderAnalysis', name: '利害關係人分析', description: '識別專案的內外部關係人及其期望與影響力。', icon: <StakeholderIcon /> },
    { key: 'ipStrategy', name: '智慧財產權佈局', description: '規劃專案產出的無形資產（如專利、商標）保護策略。', icon: <IPIcon /> },
    { key: 'esgMetrics', name: 'ESG/永續指標', description: '連結專案與環境、社会、治理目標的貢獻。', icon: <ESGIcon /> },
    { key: 'projectMilestones', name: '計畫時程與里程碑', description: '草擬專案執行的主要階段、任務與交付成果。', icon: <MilestoneIcon /> },
    { key: 'budgetPlan', name: '預算規劃表', description: '規劃主要經費項目，如人事、研發與行銷費用。', icon: <BudgetIcon /> },
    { key: 'swot', name: 'SWOT 分析', description: '生成優勢、劣勢、機會與威脅的綜合分析。', icon: <SwotIcon /> },
];

const Stage2Analysis: React.FC<Stage2Props> = ({ tableData, setTableData, proposal, aiTone, llmProvider, swotAnalysis, setSwotAnalysis }) => {
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const { showNotification } = useNotification();
    
    const [showResearchModal, setShowResearchModal] = useState(false);
    const [researchTopic, setResearchTopic] = useState('');
    const [isResearching, setIsResearching] = useState(false);
    const [researchResult, setResearchResult] = useState('');

    const [detailModalContent, setDetailModalContent] = useState<{ key: AnalysisKey, name: string } | null>(null);

    const generationFunctions: Record<AnalysisKey, Function> = {
        policyCorrespondence: generatePolicyTable,
        trl: generateTrlTable,
        marketOpportunity: generateMarketTable,
        resourceInventory: generateResourceTable,
        kpiDraft: generateKpiTable,
        budgetPlan: generateBudgetPlan,
        riskMatrix: generateRiskMatrix,
        stakeholderAnalysis: generateStakeholderTable,
        ipStrategy: generateIpStrategyTable,
        esgMetrics: generateEsgMetricsTable,
        projectMilestones: generateProjectMilestonesTable,
        swot: generateSwotAnalysis,
    };

    const handleAIGenerate = async (key: AnalysisKey) => {
        setLoadingStates(prev => ({ ...prev, [key]: true }));
        try {
            const result = await generationFunctions[key](proposal, aiTone, llmProvider);
            if (result) {
                if (key === 'swot') {
                    setSwotAnalysis(result as SwotAnalysis);
                } else if (result.length > 0) {
                    setTableData(prev => ({ ...prev, [key]: result as Record<string, string>[] }));
                } else {
                    showNotification(`AI 未能成功生成「${analysisItems.find(i => i.key === key)?.name}」`, 'warning');
                    setLoadingStates(prev => ({ ...prev, [key]: false }));
                    return;
                }
                showNotification(`已成功生成「${analysisItems.find(i => i.key === key)?.name}」`, 'success');
            }
        } catch (error: any) {
            console.error(`Error generating ${key}:`, error);
            showNotification(error.message || `生成「${analysisItems.find(i => i.key === key)?.name}」時發生錯誤。`, 'error');
        } finally {
            setLoadingStates(prev => ({ ...prev, [key]: false }));
        }
    };
    
    const handleGenerateAll = async () => {
        showNotification('已啟動全部分析生成作業...', 'info');
        const itemsToGenerate = analysisItems.filter(item => {
            const data = item.key === 'swot' ? swotAnalysis : tableData[item.key as TableKey];
            return !data || (Array.isArray(data) && data.length === 0) || (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0);
        });

        if (itemsToGenerate.length === 0) {
            showNotification('所有分析項目皆已有資料。', 'info');
            return;
        }

        for (const item of itemsToGenerate) {
            await handleAIGenerate(item.key);
        }
    };

    const handleStartResearch = async () => {
        if (!researchTopic.trim()) {
            showNotification('請輸入研究主題。', 'warning');
            return;
        }
        setIsResearching(true);
        setResearchResult('');
        try {
            const result = await performThematicResearch(researchTopic, aiTone, llmProvider);
            setResearchResult(result);
        } catch (error: any) {
            console.error("Error performing thematic research:", error);
            showNotification(error.message || "研究失败，請稍後再試。", 'error');
        } finally {
            setIsResearching(false);
            setShowResearchModal(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
             {researchResult && (
                <Card>
                    <div className="relative">
                        <CloseButton onClick={() => setResearchResult('')} colorClassName="text-[#FF6B6B] hover:text-[#fa5a5a]"/>
                        <h4 className="text-md font-semibold text-[#c53030] mb-2">AI 研究助理報告</h4>
                        <div className="text-sm text-slate-800 whitespace-pre-wrap prose prose-sm max-w-none bg-[#FFF0F0] p-4 rounded-lg" dangerouslySetInnerHTML={{ __html: researchResult.replace(/\n/g, '<br />') }} />
                    </div>
                </Card>
            )}
             <div className="flex flex-wrap justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-800">資料整理與前期分析</h2>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setShowResearchModal(true)}
                        className="flex items-center px-4 py-2 text-sm font-medium text-slate-800 bg-slate-200 border border-transparent rounded-xl shadow-sm hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
                    >
                       <BeakerIcon /> AI 研究助理
                    </button>
                    <button
                        onClick={handleGenerateAll}
                        disabled={Object.values(loadingStates).some(Boolean)}
                        className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-[#FF6B6B] border border-transparent rounded-xl shadow-sm hover:bg-[#fa5a5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B6B] disabled:bg-slate-300 disabled:text-slate-500"
                    >
                        <SparklesIcon />
                        全部生成
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {analysisItems.map(item => {
                    const data = item.key === 'swot' ? swotAnalysis : tableData[item.key as TableKey];
                    const isLoading = loadingStates[item.key];
                    const hasData = item.key === 'swot' 
                        ? !!data && Object.values(data).some(arr => Array.isArray(arr) && arr.length > 0) 
                        : !!data && Array.isArray(data) && data.length > 0;
                    
                    return <AnalysisCard 
                                key={item.key}
                                item={item}
                                isLoading={isLoading}
                                hasData={hasData}
                                onGenerate={() => handleAIGenerate(item.key)}
                                onViewDetails={() => setDetailModalContent({ key: item.key, name: item.name })}
                                dataPreview={data}
                            />
                })}
            </div>
            
            {showResearchModal && (
                <Modal isOpen={showResearchModal} onClose={() => setShowResearchModal(false)} title="AI 研究助理">
                    <p className="text-gray-600 mb-4 text-sm">請輸入您想研究的主題，AI 將為您生成一份包含關鍵數據、市場趨勢與機會的摘要報告。</p>
                    <textarea value={researchTopic} onChange={(e) => setResearchTopic(e.target.value)} rows={3} className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]" placeholder="例如：「分析台灣電動車充電樁市場的 TOP 3 競品與其優劣勢」" />
                    <div className="mt-6 flex justify-end space-x-3">
                        <button onClick={() => setShowResearchModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">取消</button>
                        <button onClick={handleStartResearch} disabled={isResearching} className="px-4 py-2 text-sm font-semibold text-white bg-[#FF6B6B] rounded-xl hover:bg-[#fa5a5a] disabled:bg-[#fab4b4] flex items-center">
                            {isResearching && <Spinner small />}
                            {isResearching ? '研究中...' : '開始研究'}
                        </button>
                    </div>
                </Modal>
            )}

            {detailModalContent && <DetailModal 
                content={detailModalContent}
                proposal={proposal}
                tableData={tableData}
                swotAnalysis={swotAnalysis}
                onClose={() => setDetailModalContent(null)}
                showNotification={showNotification}
            />}
        </div>
    );
};

const AnalysisCard: React.FC<{
    item: { key: AnalysisKey; name: string; description: string; icon: React.ReactNode },
    isLoading: boolean,
    hasData: boolean,
    onGenerate: () => void,
    onViewDetails: () => void,
    dataPreview: Record<string, string>[] | SwotAnalysis | null | undefined
}> = ({ item, isLoading, hasData, onGenerate, onViewDetails, dataPreview }) => {
    return (
        <Card className={`flex flex-col h-full transition-all duration-300 ${hasData ? 'bg-white' : 'bg-slate-50'}`}>
            <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${hasData ? 'bg-[#FFF0F0] text-[#FF6B6B]' : 'bg-slate-200 text-slate-500'}`}>
                    {item.icon}
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">{item.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                </div>
            </div>
            <div className="flex-grow my-4 min-h-[60px]">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full text-sm text-slate-500">
                        <Spinner small /> AI 生成中...
                    </div>
                ) : hasData ? (
                     item.key === 'swot' ? (
                        <div className="flex items-center justify-center h-full text-center">
                            <div>
                                <p className="text-xs text-slate-500">總分</p>
                                <p className="font-bold text-2xl text-slate-800">
                                    {(dataPreview as SwotAnalysis).scores?.total ?? '-'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-md border">
                            <p className="truncate">{(Array.isArray(dataPreview) && dataPreview[0]) ? Object.values(dataPreview[0]).map(String).join(' / ') : '...'}</p>
                        </div>
                    )
                ) : (
                     <div className="flex items-center justify-center h-full text-sm text-slate-400 italic">尚未生成</div>
                )}
            </div>
            <div className="mt-auto flex gap-2">
                <button
                    onClick={onGenerate}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-[#FF6B6B] rounded-lg shadow-sm hover:bg-[#fa5a5a] disabled:bg-slate-300"
                >
                   <SparklesIcon small /> {hasData ? '重新生成' : 'AI 生成'}
                </button>
                 <button
                    onClick={onViewDetails}
                    disabled={!hasData}
                    className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                   查看詳情
                </button>
            </div>
        </Card>
    )
}

const DetailModal: React.FC<{
    content: { key: AnalysisKey, name: string },
    proposal: Proposal,
    tableData: TableData,
    swotAnalysis: SwotAnalysis | null | undefined,
    onClose: () => void,
    showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}> = ({ content, proposal, tableData, swotAnalysis, onClose, showNotification }) => {
    
    const handleExport = (key: TableKey) => {
        const currentTableData = tableData[key];
        const currentTableName = analysisItems.find(t => t.key === key)?.name || key;
        
        if (!currentTableData || currentTableData.length === 0) {
            showNotification("表格中沒有資料可匯出。", "info"); return;
        }

        const headers = Object.keys(currentTableData[0]);
        const csvContent = [ headers.join(','), ...currentTableData.map(row => headers.map(header => `"${(row[header] || '').replace(/"/g, '""')}"`).join(',')) ].join('\n');

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", `${currentTableName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCopyContent = () => {
        let textToCopy = '';

        if (content.key === 'swot') {
            if (swotAnalysis) {
                textToCopy = `# SWOT Analysis for ${proposal.title}\n\n`;
                textToCopy += `## Strengths\n- ${swotAnalysis.strengths.join('\n- ')}\n\n`;
                textToCopy += `## Weaknesses\n- ${swotAnalysis.weaknesses.join('\n- ')}\n\n`;
                textToCopy += `## Opportunities\n- ${swotAnalysis.opportunities.join('\n- ')}\n\n`;
                textToCopy += `## Threats\n- ${swotAnalysis.threats.join('\n- ')}\n\n`;
                
                if (swotAnalysis.scores) {
                    textToCopy += `## Scores\n- Strengths: ${swotAnalysis.scores.strengths}/30\n- Opportunities: ${swotAnalysis.scores.opportunities}/20\n- Weaknesses: ${swotAnalysis.scores.weaknesses}/30\n- Threats: ${swotAnalysis.scores.threats}/20\n- **Total: ${swotAnalysis.scores.total}/100**\n\n`;
                }

                if (swotAnalysis.bestCaseScenario) {
                    textToCopy += `## Best Case Scenario: ${swotAnalysis.bestCaseScenario.title}\n- ${swotAnalysis.bestCaseScenario.points.join('\n- ')}\n\n`;
                }
                if (swotAnalysis.worstCaseScenario) {
                    textToCopy += `## Worst Case Scenario: ${swotAnalysis.worstCaseScenario.title}\n- ${swotAnalysis.worstCaseScenario.points.join('\n- ')}\n\n`;
                }
            }
        } else {
            const currentTableData = tableData[content.key as TableKey];
            if (!currentTableData || currentTableData.length === 0) {
                showNotification("沒有內容可以複製。", 'info');
                return;
            }

            const headers = Object.keys(currentTableData[0]);
            const headerString = headers.join('\t');
            const rowsString = currentTableData
                .map(row => headers.map(header => (row[header] || '').replace(/\n/g, ' ')).join('\t'))
                .join('\n');
            
            textToCopy = `${headerString}\n${rowsString}`;
        }
        
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => showNotification('已成功複製內容！', 'success'))
                .catch(err => {
                    console.error('Copy failed:', err);
                    showNotification('複製失敗。', 'error');
                });
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={content.name}>
            <div className="max-h-[70vh] overflow-y-auto pr-2">
                {content.key === 'swot' ? (
                    swotAnalysis ? <SwotAnalysisReport analysis={swotAnalysis} /> : <p>無 SWOT 資料。</p>
                ) : (
                    <DataTable data={tableData[content.key as TableKey]} />
                )}
            </div>
             <div className="mt-6 flex justify-end gap-3">
                <button
                    onClick={handleCopyContent}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B6B]"
                >
                    <ClipboardIcon /> 複製內容
                </button>
                {content.key !== 'swot' && (
                     <button
                        onClick={() => handleExport(content.key as TableKey)}
                        className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B6B]"
                    >
                        <ArrowDownTrayIcon /> 匯出 CSV
                    </button>
                )}
            </div>
        </Modal>
    )
}

const DataTable: React.FC<{ data: Record<string, string>[] | undefined }> = ({ data }) => {
    if (!data || data.length === 0) {
        return <p className="text-gray-500 italic px-4 py-4">此表格尚無資料。</p>;
    }
    const headers = Object.keys(data[0]);
    return (
        <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                    <tr>{headers.map(h => <th key={h} className="text-left text-sm font-semibold text-gray-600 px-4 py-3 border-b">{h}</th>)}</tr>
                </thead>
                <tbody>
                    {data.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-gray-50 border-t">
                            {headers.map(h => <td key={`${rIdx}-${h}`} className="text-sm text-gray-700 px-4 py-3">{row[h]}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const SwotQuadrant: React.FC<{ title: string; items: string[]; color: 'green' | 'amber' | 'blue' | 'red'; icon: React.ReactNode }> = ({ title, items, color, icon }) => {
    const colors = { green: 'bg-green-50 border-green-200 text-green-800', amber: 'bg-amber-50 border-amber-200 text-amber-800', blue: 'bg-blue-50 border-blue-200 text-blue-800', red: 'bg-red-50 border-red-200 text-red-800' };
    return (
        <div className={`${colors[color]} p-4 rounded-lg border h-full`}>
            <div className="flex items-center mb-2">{icon}<h4 className={`ml-2 font-semibold ${colors[color]}`}>{title}</h4></div>
            <ul className="space-y-1 list-disc list-inside text-sm text-gray-700">{items.map((item, index) => <li key={index}>{item}</li>)}</ul>
        </div>
    );
};

const ScoreDisplay: React.FC<{ scores: SwotAnalysis['scores'] }> = ({ scores }) => {
    if (!scores) return null;
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-baseline">
                <span className="font-medium text-slate-600">優勢得分</span>
                <span className="font-bold text-2xl text-slate-800">{scores.strengths}<span className="text-sm text-slate-500">/30</span></span>
            </div>
             <div className="flex justify-between items-baseline">
                <span className="font-medium text-slate-600">機會得分</span>
                <span className="font-bold text-2xl text-slate-800">{scores.opportunities}<span className="text-sm text-slate-500">/20</span></span>
            </div>
             <div className="flex justify-between items-baseline">
                <span className="font-medium text-slate-600">劣勢扣分</span>
                <span className="font-bold text-2xl text-slate-800">{scores.weaknesses}<span className="text-sm text-slate-500">/30</span></span>
            </div>
             <div className="flex justify-between items-baseline">
                <span className="font-medium text-slate-600">威脅扣分</span>
                <span className="font-bold text-2xl text-slate-800">{scores.threats}<span className="text-sm text-slate-500">/20</span></span>
            </div>
            <div className="border-t pt-4 mt-4 flex justify-between items-baseline">
                <span className="font-bold text-slate-800 text-lg">總分</span>
                <span className="font-extrabold text-3xl text-[#FF6B6B]">{scores.total}<span className="text-lg text-slate-500">/100</span></span>
            </div>
        </div>
    );
}

const ScenarioDisplay: React.FC<{ title: string, points: string[], type: 'best' | 'worst' }> = ({ title, points, type }) => {
    const isBest = type === 'best';
    return (
        <div className={`p-4 rounded-lg border-l-4 ${isBest ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
            <div className="flex items-center gap-2 mb-2">
                {isBest ? <ArrowTrendingUpIcon className="text-green-600" /> : <ArrowTrendingDownIcon className="text-red-600" />}
                <h5 className={`font-bold ${isBest ? 'text-green-800' : 'text-red-800'}`}>{isBest ? "最佳情境" : "最壞情境"}</h5>
            </div>
            <p className="font-semibold text-slate-800 mb-2">{title}</p>
            <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                {points.map((point, i) => <li key={i}>{point}</li>)}
            </ul>
        </div>
    );
};


const SwotAnalysisReport: React.FC<{ analysis: SwotAnalysis }> = ({ analysis }) => {
    const radarCriteria = [
        { id: 'strengthScore', name: '優勢得分' },
        { id: 'weaknessControl', name: '劣勢控制' },
        { id: 'opportunityScore', name: '機會掌握' },
        { id: 'threatDefense', name: '威脅防禦' },
        { id: 'strategyCompleteness', name: '策略完整' },
        { id: 'overallCompetitiveness', name: '整體競爭' },
    ];

    const radarChartData = analysis.radarData ? [{
        title: '分析結果',
        scoresByCriterion: Object.keys(analysis.radarData).reduce((acc, key) => {
            acc[key] = { raw: (analysis.radarData as any)[key] };
            return acc;
        }, {} as Record<string, { raw: number }>)
    }] : [];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SwotQuadrant title="優勢 (Strengths)" items={analysis.strengths} color="green" icon={<CheckCircleIcon />} />
                <SwotQuadrant title="劣勢 (Weaknesses)" items={analysis.weaknesses} color="amber" icon={<ExclamationTriangleIcon />} />
                <SwotQuadrant title="機會 (Opportunities)" items={analysis.opportunities} color="blue" icon={<LightBulbIcon />} />
                <SwotQuadrant title="威脅 (Threats)" items={analysis.threats} color="red" icon={<ShieldExclamationIcon />} />
            </div>

            <Card>
                <h4 className="text-xl font-bold text-slate-800 mb-4 text-center">視覺化分析與評分</h4>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
                    <div className="lg:col-span-3">
                        {analysis.radarData && <RadarChart data={radarChartData} criteria={radarCriteria} />}
                    </div>
                    <div className="lg:col-span-2">
                        <ScoreDisplay scores={analysis.scores} />
                    </div>
                </div>
            </Card>

            <Card>
                <h4 className="text-xl font-bold text-slate-800 mb-4">情境模擬分析</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.bestCaseScenario && <ScenarioDisplay title={analysis.bestCaseScenario.title} points={analysis.bestCaseScenario.points} type="best" />}
                    {analysis.worstCaseScenario && <ScenarioDisplay title={analysis.worstCaseScenario.title} points={analysis.worstCaseScenario.points} type="worst" />}
                </div>
            </Card>
        </div>
    );
};



// UI Components
const CloseButton: React.FC<{onClick: () => void, colorClassName?: string}> = ({ onClick, colorClassName = "text-[#FF6B6B] hover:text-[#fa5a5a]" }) => ( <button onClick={onClick} className={`absolute top-2 right-2 ${colorClassName}`} aria-label="關閉"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button> );
const ArrowDownTrayIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg> );
const ClipboardIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a2.25 2.25 0 0 1-2.25 2.25h-1.5a2.25 2.25 0 0 1-2.25-2.25v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>);
const SparklesIcon: React.FC<{small?: boolean}> = ({small}) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={small ? 'w-4 h-4' : 'w-5 h-5 mr-2'}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg> );
const Spinner: React.FC<{small?: boolean}> = ({small}) => ( <svg className={`animate-spin ${small ? 'h-4 w-4 mr-2' : 'h-5 w-5 -ml-1 mr-2'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> );
const BeakerIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.529 1.43-2.25 2.25 0 0 0-.529 1.43v5.714a2.25 2.25 0 0 0 2.25 2.25h1.5a2.25 2.25 0 0 0 2.25-2.25v-5.714a2.25 2.25 0 0 0-.529-1.43-2.25 2.25 0 0 1-.529-1.43V3.104M15.75 3.104V18" /></svg> );

// Icons for SWOT Card
const CheckCircleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-green-600"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>);
const ExclamationTriangleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-amber-600"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>);
const LightBulbIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-600"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.311a7.5 7.5 0 0 1-7.5 0c.407.567.92.99 1.5.1209m6-1.209c.58.21.993.642 1.5 1.209M18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" /></svg>);
const ShieldExclamationIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-600"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>);
const ArrowTrendingUpIcon: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 18 9-9 4.5 4.5L21.75 6" /></svg>);
const ArrowTrendingDownIcon: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 6 9 9 4.5-4.5L21.75 18" /></svg>);


export default Stage2Analysis;