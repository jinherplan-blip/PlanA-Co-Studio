import React, { useState, useEffect } from 'react';
import { InspirationReport, AITone, LLMProvider, InspirationInputs, IndustrySuggestion, UploadedFile, GrantAnalysisReport, StrategyFitResult } from '../../types';
import { generateInspirationReport } from '../../services/geminiService';
import Card from '../ui/Card';

interface StageInspirationProps {
  onCreateProjectFromInspiration: (report: InspirationReport, inputs: InspirationInputs) => void;
  aiTone: AITone;
  llmProvider: LLMProvider;
  prefillData: IndustrySuggestion | GrantAnalysisReport | StrategyFitResult | null;
  onPrefillConsumed: () => void;
}

const initialInputs: InspirationInputs = {
    projectName: '', oneLiner: '', problemSource: '', targetIndustries: [], userType: '中小企業',
    painPoints: '', existingResources: '', desiredOutcome: '', coreTech: '', trl: '',
    applicationField: '', mvpIdea: '', marketRegion: '台灣', relatedPolicies: '',
    targetGrant: ''
};

const INDUSTRY_OPTIONS = [
   '製造業', 'AI與數位轉型', '綠能與永續', '智慧農業', 
   '文化與創意產業', '教育與培訓', '醫療與長照', 
   '觀光與地方創生', '社會創新與ESG'
];

const StageInspiration: React.FC<StageInspirationProps> = ({ onCreateProjectFromInspiration, aiTone, llmProvider, prefillData, onPrefillConsumed }) => {
    const [report, setReport] = useState<InspirationReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [inputs, setInputs] = useState<InspirationInputs>(initialInputs);
    const [loadingMessage, setLoadingMessage] = useState('');

    useEffect(() => {
        if (prefillData) {
            if ('industryClassification' in prefillData) { // IndustrySuggestion
                setInputs(prev => ({
                    ...prev,
                    targetIndustries: [prefillData.industryClassification.split(' > ')[0]],
                    relatedPolicies: prefillData.grantThemes.join(', '),
                    targetGrant: prefillData.predictedGrantType,
                }));
            } else if ('overallScore' in prefillData) { // StrategyFitResult
                setInputs(prev => ({
                    ...prev,
                    targetGrant: prefillData.grantName || '',
                    problemSource: `基於對「${prefillData.grantName || '目標補助案'}」的 AI 契合度分析 (總分: ${Math.round(prefillData.overallScore)})。`,
                }));
            } else if ('eligibility' in prefillData) { // GrantAnalysisReport
                setInputs(prev => ({
                    ...prev,
                    relatedPolicies: prefillData.keywords.join(', '),
                    problemSource: `基於對「${prefillData.summary.substring(0, 30)}...」補助案的分析，聚焦於其審查重點：${prefillData.reviewFocus}`,
                }));
            }
            onPrefillConsumed();
        }
    }, [prefillData, onPrefillConsumed]);

    const handleInputChange = (field: keyof InspirationInputs, value: string | string[]) => {
        setInputs(prev => ({ ...prev, [field]: value }));
    };
    
    const handleIndustryToggle = (industry: string) => {
        const currentIndustries = inputs.targetIndustries;
        const newIndustries = currentIndustries.includes(industry)
            ? currentIndustries.filter(i => i !== industry)
            : [...currentIndustries, industry];
        handleInputChange('targetIndustries', newIndustries);
    };

    const handleRunAnalysis = async () => {
        if (!inputs.projectName.trim() || !inputs.painPoints.trim() || inputs.targetIndustries.length === 0) {
          alert('請至少填寫「計畫名稱」、「目標產業/領域」與「主要痛點或挑戰」。');
          return;
        }
        setIsLoading(true);
        setReport(null);

        const messages = ["AI 正在分析業者需求...", "正在掃描外部市場案例...", "正在綜合分析機會點..."];
        let messageIndex = 0;
        setLoadingMessage(messages[messageIndex]);
        const intervalId = setInterval(() => {
            messageIndex = (messageIndex + 1) % messages.length;
            setLoadingMessage(messages[messageIndex]);
        }, 2500);

        try {
          const result = await generateInspirationReport(inputs, [], aiTone, llmProvider);
          if (result) {
            setReport(result);
          } else {
            alert("AI 可行性分析失敗，回傳格式錯誤，請稍後再試。");
          }
        } catch (error) {
          console.error("Error analyzing feasibility:", error);
          alert("AI 可行性分析失敗，請稍後再試。");
        } finally {
          clearInterval(intervalId);
          setIsLoading(false);
          setLoadingMessage('');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <Card>
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold text-gray-800 text-center">AI 靈感與可行性分析</h2>
                    <p className="mt-2 text-center text-gray-600">
                        請填寫您的計畫構想，AI 將結合 Google 外部搜尋，為您分析市場、技術與政策，產出完整的分析報告作為立案基礎。
                    </p>
                    <div className="mt-8 space-y-8">
                        
                        <Fieldset legend="A. 基本資訊">
                            <Input label="計畫名稱" value={inputs.projectName} onChange={e => handleInputChange('projectName', e.target.value)} placeholder="例如：AI 驅動的個人化精準醫療平台" />
                            <Input label="構想一句話說明 (30字內)" value={inputs.oneLiner} onChange={e => handleInputChange('oneLiner', e.target.value)} placeholder="例如：整合多源數據，提供個人化健康風險預測" />
                            <Textarea label="構想緣起或問題來源" value={inputs.problemSource} onChange={e => handleInputChange('problemSource', e.target.value)} placeholder="例如：觀察到現行健檢報告判讀耗時且缺乏後續追蹤" />
                            <div>
                               <label className="block text-sm font-medium text-gray-700 mb-2">目標產業/領域 (可多選)</label>
                               <div className="flex flex-wrap gap-2">
                                   {INDUSTRY_OPTIONS.map(opt => (
                                       <button key={opt} onClick={() => handleIndustryToggle(opt)} className={`px-3 py-1.5 text-sm rounded-full border-2 transition ${inputs.targetIndustries.includes(opt) ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}>
                                           {opt}
                                       </button>
                                   ))}
                               </div>
                            </div>
                        </Fieldset>

                        <Fieldset legend="B. 業者需求與挑戰">
                            <Select label="業者或使用者類型" value={inputs.userType} onChange={e => handleInputChange('userType', e.target.value)} options={['中小企業', '公協會', '新創', '非營利', '政府', '其他']} />
                            <Textarea label="主要痛點或挑戰" value={inputs.painPoints} onChange={e => handleInputChange('painPoints', e.target.value)} placeholder="例如：零售業線上與線下會員數據斷裂，無法精準行銷" />
                            <Input label="已有資源/技術/合作夥伴" value={inputs.existingResources} onChange={e => handleInputChange('existingResources', e.target.value)} placeholder="例如：擁有 10 萬筆匿名化會員數據" />
                            <Input label="想達成的主要改變或成果" value={inputs.desiredOutcome} onChange={e => handleInputChange('desiredOutcome', e.target.value)} placeholder="例如：提升會員回購率 10%" />
                        </Fieldset>
                        
                        <Fieldset legend="C. 技術構想與應用">
                            <Input label="預計採用的核心技術" value={inputs.coreTech} onChange={e => handleInputChange('coreTech', e.target.value)} placeholder="例如：AI、IoT、雲端、材料、系統整合等" />
                            <Input label="技術成熟度 (TRL 1~9，如不確定可留空)" value={inputs.trl} onChange={e => handleInputChange('trl', e.target.value)} placeholder="例如：TRL 4" />
                            <Input label="應用場域/目標市場" value={inputs.applicationField} onChange={e => handleInputChange('applicationField', e.target.value)} placeholder="例如：教學醫院、高階健檢中心" />
                            <Textarea label="最小可行產品 (MVP) 或示範場域構想" value={inputs.mvpIdea} onChange={e => handleInputChange('mvpIdea', e.target.value)} placeholder="例如：先針對單一科別（如放射科）進行導入驗證" />
                        </Fieldset>

                        <Fieldset legend="D. 政策與市場關聯">
                            <Select label="目標市場區域" value={inputs.marketRegion} onChange={e => handleInputChange('marketRegion', e.target.value)} options={['台灣', '東南亞', '國際市場']} />
                            <Input label="關聯政策主軸" value={inputs.relatedPolicies} onChange={e => handleInputChange('relatedPolicies', e.target.value)} placeholder="例如：淨零、AI轉型、智慧製造、文化科技" />
                            <Input label="預計對應的補助案或部會" value={inputs.targetGrant} onChange={e => handleInputChange('targetGrant', e.target.value)} placeholder="例如：經濟部 SBIR、國科會產學合作計畫" />
                        </Fieldset>

                         <button onClick={handleRunAnalysis} disabled={isLoading} className="w-full px-4 py-3 text-base font-medium text-white bg-[#FF6B6B] rounded-lg hover:bg-[#fa5a5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B6B] disabled:bg-slate-300 flex items-center justify-center shadow-lg hover:shadow-xl transition">
                            {isLoading ? <Spinner /> : <SparklesIcon />}
                            {isLoading ? loadingMessage : 'AI 生成完整分析報告'}
                        </button>
                    </div>
                </div>
            </Card>

            {report && (
                <InspirationReportCard 
                    report={report} 
                    onClose={() => setReport(null)}
                    onCreateProject={() => onCreateProjectFromInspiration(report, inputs)}
                />
            )}
        </div>
    );
};

const Fieldset: React.FC<{legend: string, children: React.ReactNode}> = ({ legend, children }) => (
    <fieldset className="border-t border-gray-200 pt-6">
        <legend className="text-lg font-semibold text-gray-800 px-2 -ml-2">{legend}</legend>
        <div className="space-y-4 mt-4">{children}</div>
    </fieldset>
);

const Input: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string}> = ({label, value, onChange, placeholder}) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input type="text" value={value} onChange={onChange} placeholder={placeholder} className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500" />
    </div>
);

const Textarea: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, placeholder?: string, rows?: number}> = ({label, value, onChange, placeholder, rows=2}) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"></textarea>
    </div>
);

const Select: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: string[]}> = ({label, value, onChange, options}) => (
     <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <select value={value} onChange={onChange} className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

const InspirationReportCard: React.FC<{ report: InspirationReport; onClose: () => void; onCreateProject: () => void; }> = ({ report, onClose, onCreateProject }) => (
    <Card className="relative bg-slate-50 border border-slate-200 animate-fade-in">
        <CloseButton onClick={onClose} colorClassName="text-slate-400 hover:text-slate-600" />
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">AI 可行性分析報告</h3>
        <div className="space-y-6">
            <ReportSection icon={<ClipboardDocumentCheckIcon />} title="AI靈感分析摘要卡" content={report.summaryCard} />
            <ReportSection icon={<MagnifyingGlassIcon />} title="市場與需求分析" content={report.marketAnalysis} />
            <ReportSection icon={<CpuChipIcon />} title="技術與應用可行性分析" content={report.techFeasibility} />
            <ReportSection icon={<DocumentTextIcon />} title="政策與補助對應分析" content={report.policyAnalysis} />
            <ReportSection icon={<BuildingOfficeIcon />} title="產業導向建議" content={report.industryGuidance} />
            
            <div className="p-4 bg-white rounded-lg border">
                 <div className="flex items-center mb-3">
                    <TableCellsIcon />
                    <h4 className="font-semibold text-lg text-slate-800 ml-2">KPI與效益建議表</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-100">
                            <tr>
                                {Object.keys(report.kpiSuggestions[0] || {}).map(key => <th key={key} className="text-left text-sm font-semibold text-gray-600 px-3 py-2">{key}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {report.kpiSuggestions.map((kpi, index) => (
                                <tr key={index} className="border-t">
                                    {Object.values(kpi).map((val, i) => <td key={i} className="text-sm text-gray-700 px-3 py-2">{val}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="p-4 bg-white rounded-lg border">
                <div className="flex items-center mb-2">
                    <RocketLaunchIcon />
                    <h4 className="font-semibold text-lg text-slate-800 ml-2">三項行動方向＋一句亮點標語</h4>
                </div>
                <p className="text-lg font-bold text-center text-indigo-600 my-4 p-2 bg-indigo-50 rounded">"{report.callToAction}"</p>
                <ul className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                    {report.actionItems.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
            </div>

            <ReportSection icon={<ChatBubbleLeftRightIcon />} title="顧問觀點" content={report.consultantView} />
            
            {report.groundingSources && report.groundingSources.length > 0 && (
                <div className="p-4">
                    <h4 className="font-semibold text-sm text-slate-600 mb-2">資料來源 (Grounding Sources)</h4>
                    <div className="flex flex-wrap gap-2">
                        {report.groundingSources.map((source, index) => (
                             <a href={source.uri} key={index} target="_blank" rel="noopener noreferrer" className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full hover:bg-gray-300 transition-colors">
                                {source.title || new URL(source.uri).hostname}
                             </a>
                        ))}
                    </div>
                </div>
            )}

            <div className="border-t pt-6 text-center">
                <button 
                    onClick={onCreateProject}
                    className="bg-[#FF6B6B] text-white font-semibold py-3 px-8 rounded-2xl shadow-sm hover:bg-[#fa5a5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B6B] transition-transform transform hover:scale-105 inline-flex items-center"
                >
                    <PlusIcon />
                    以此分析建立計畫案
                </button>
            </div>
        </div>
    </Card>
);

const ReportSection: React.FC<{icon: React.ReactNode, title: string, content: string}> = ({ icon, title, content }) => (
    <div className="p-4 bg-white rounded-lg border">
        <div className="flex items-center mb-2">
            {icon}
            <h4 className="font-semibold text-lg text-slate-800 ml-2">{title}</h4>
        </div>
        <div className="text-sm text-gray-700 whitespace-pre-wrap prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }} />
    </div>
);


const Spinner = () => ( <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> );
const CloseButton: React.FC<{onClick: () => void, colorClassName?: string}> = ({ onClick, colorClassName = "text-indigo-400 hover:text-indigo-600" }) => ( <button onClick={onClick} className={`absolute top-3 right-3 z-10 ${colorClassName}`} aria-label="關閉建議"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button> );
const PlusIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2 inline"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg> );
const ClipboardDocumentCheckIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-600"><path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12" /></svg> );
const MagnifyingGlassIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-600"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg> );
const SparklesIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg> );
const CpuChipIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-600"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 21v-1.5M15.75 3v1.5M12 4.5v-1.5m0 18v-1.5M15.75 21v-1.5m-6-1.5v-15A2.25 2.25 0 0 1 12 3a2.25 2.25 0 0 1 2.25 2.25v15A2.25 2.25 0 0 1 12 21a2.25 2.25 0 0 1-2.25-2.25Z" /></svg>);
const DocumentTextIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-600"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12.75h7.5" /></svg>);
const BuildingOfficeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-600"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6h1.5m-1.5 3h1.5m-1.5 3h1.5M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>);
const TableCellsIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-600"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h12A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6ZM3.75 12h16.5" /></svg>);
const RocketLaunchIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-600"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.82m5.84-2.56a14.96 14.96 0 0 0-5.84-2.56m0 0a14.96 14.96 0 0 1 5.84-2.56M12 21a9 9 0 0 1 9-9" /></svg>);
const ChatBubbleLeftRightIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-600"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.72 3.72a1.125 1.125 0 0 1-1.59 0l-3.72-3.72a2.122 2.122 0 0 1-1.98-2.193v-4.286c0-.97.616-1.813 1.5-2.097m6.498 6.498 3.72-3.72a.75.75 0 0 0-.53-1.28H4.26a.75.75 0 0 0-.53 1.28l3.72 3.72" /></svg>);

export default StageInspiration;