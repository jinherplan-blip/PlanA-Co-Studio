import * as React from 'react';
import { Proposal, AITone, LLMProvider, GrantInfo, GrantMatchResult, InteractiveConceptResult, UploadedFile, ProjectSection, GrantAnalysisReport } from '../../types';
import Card from '../ui/Card';
import { suggestPolicies, consolidateSummaryCard, generateInteractiveConcept, analyzeGrantNetwork, getConsultantAdvice, matchGrantsToProposal, refineSingleConceptionField, generatePolicyDrivenConcept, completeConceptionSummary, analyzeGrantDocument } from '../../services/geminiService';
import Modal from '../ui/Modal';
import { useNotification } from '../../contexts/NotificationProvider';
import { Part } from '@google/genai';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import FileUpload from '../ui/FileUpload';
import RadarChart from '../ui/RadarChart';


interface Stage1Props {
  proposal: Proposal;
  setProposal: React.Dispatch<React.SetStateAction<Proposal>>;
  aiTone: AITone;
  llmProvider: LLMProvider;
  grants: GrantInfo[];
  onCompareGrants: (selectedGrants: GrantInfo[]) => void;
  setActiveSection: (section: ProjectSection) => void;
}

const SummaryFieldCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    isRefining: boolean;
    onRefine: () => void;
    onCopy: (value: string, label: string) => void;
    placeholder: string;
}> = ({ icon, label, value, isRefining, onRefine, onCopy, placeholder }) => (
    <div className="bg-white border border-slate-200/80 rounded-xl flex flex-col h-full transition-shadow hover:shadow-md overflow-hidden relative group">
        <div className="flex items-center p-3 bg-slate-50/80 border-b border-slate-200/60">
            <div className="w-7 h-7 mr-3 text-[#FF6B6B] flex-shrink-0 flex items-center justify-center">{icon}</div>
            <h4 className="text-base font-semibold text-slate-700">{label}</h4>
            <div className="ml-auto flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={() => onCopy(value, label)}
                    disabled={!value}
                    className="flex items-center justify-center p-1.5 text-xs font-semibold bg-white text-slate-600 rounded-full border border-slate-300 hover:bg-slate-100 hover:border-slate-400 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    title="複製內文"
                >
                    <ClipboardIcon />
                </button>
                <button 
                    onClick={onRefine}
                    disabled={isRefining || !value}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-white text-slate-600 px-2 py-1 rounded-full border border-slate-300 hover:bg-slate-100 hover:border-slate-400 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    title="AI 精修此段"
                >
                    {isRefining ? <Spinner small /> : <MagicWandIcon small />}
                </button>
            </div>
        </div>
        <div className="p-4 text-sm text-slate-600 flex-grow">
            {value ? (
                <p className="whitespace-pre-wrap">{value}</p>
            ) : (
                <p className="text-slate-400 italic">{placeholder}</p>
            )}
        </div>
    </div>
);


const Stage1Conception: React.FC<Stage1Props> = ({ proposal, setProposal, aiTone, llmProvider, setActiveSection }) => {
    const { showNotification } = useNotification();
    
    // States for policy-driven module
    const [grantFile, setGrantFile] = React.useState<UploadedFile[]>([]);
    const [grantAnalysis, setGrantAnalysis] = React.useState<GrantAnalysisReport | null>(null);
    const [isAnalyzingGrant, setIsAnalyzingGrant] = React.useState(false);
    const [userIdea, setUserIdea] = React.useState('');
    const [userNeeds, setUserNeeds] = React.useState('');
    const [referenceFiles, setReferenceFiles] = React.useState<UploadedFile[]>([]);
    const [isGeneratingConcept, setIsGeneratingConcept] = React.useState(false);

    const [isExportingPdf, setIsExportingPdf] = React.useState(false);
    const [refiningField, setRefiningField] = React.useState<keyof Proposal['conceptionSummary'] | null>(null);
    const [isAutoCompleting, setIsAutoCompleting] = React.useState(false);


    const handleAnalyzeGrantFile = async () => {
        if (grantFile.length === 0) {
            showNotification('請先上傳一個徵案文件。', 'warning');
            return;
        }
        setIsAnalyzingGrant(true);
        setGrantAnalysis(null);
        try {
            const fileContent = atob(grantFile[0].content);
            const result = await analyzeGrantDocument(fileContent, aiTone, llmProvider);
            if (result) {
                setGrantAnalysis(result);
                showNotification('徵案文件分析完成！', 'success');
            } else {
                showNotification('AI 無法分析此文件，請確認內容。', 'error');
            }
        } catch (error: any) {
            showNotification(error.message || '分析徵案文件時發生錯誤。', 'error');
            console.error("Error analyzing grant document:", error);
        } finally {
            setIsAnalyzingGrant(false);
        }
    };

    const handleGeneratePolicyConcept = async () => {
        if (!userIdea.trim() || !userNeeds.trim()) {
            showNotification('請輸入您的核心構想與業者需求。', 'warning');
            return;
        }
        setIsGeneratingConcept(true);
        try {
            const result = await generatePolicyDrivenConcept(grantAnalysis, userIdea, userNeeds, referenceFiles, aiTone);
            if(result) {
                setProposal(prev => ({
                    ...prev,
                    conceptionSummary: result.conceptionSummary,
                    policyFitnessAnalysis: result.policyFitnessAnalysis,
                    optimizationSuggestions: result.optimizationSuggestions,
                }));
                showNotification('已成功生成政策導向構想！', 'success');
            } else {
                showNotification('AI 生成構想失敗，請稍後再試。', 'error');
            }
        } catch (error: any) {
            showNotification(error.message || '生成政策導向構想時發生錯誤。', 'error');
            console.error("Error generating policy driven concept:", error);
        } finally {
            setIsGeneratingConcept(false);
        }
    };

    const handleAutoCompleteSummary = async () => {
        setIsAutoCompleting(true);
        try {
            const result = await completeConceptionSummary(proposal, aiTone);
            if (result) {
                setProposal(prev => ({
                    ...prev,
                    conceptionSummary: {
                        ...prev.conceptionSummary,
                        ...result,
                    },
                }));
                showNotification('AI 已補完摘要內容！', 'success');
            } else {
                showNotification('AI 未能補完摘要，或所有欄位皆已有內容。', 'info');
            }
        } catch (error: any) {
            showNotification(error.message || 'AI 補完摘要時發生錯誤。', 'error');
            console.error("Error auto-completing summary:", error);
        } finally {
            setIsAutoCompleting(false);
        }
    };
    
    const handleRefineSingleField = async (field: keyof Proposal['conceptionSummary']) => {
        const value = proposal.conceptionSummary[field];
        if (!value || !value.trim()) {
            showNotification('請先填寫內容才能進行精修。', 'warning');
            return;
        }
        setRefiningField(field);
        try {
            const refinedText = await refineSingleConceptionField(field, value, proposal, aiTone);
            setProposal(prev => ({
                ...prev,
                conceptionSummary: { ...prev.conceptionSummary, [field]: refinedText }
            }));
            showNotification(`已成功精修「${labelMap[field]}」段落！`, 'success');
        } catch (error: any) {
            console.error(`Error refining field ${field}:`, error);
            showNotification(error.message || `精修「${labelMap[field]}」時發生錯誤。`, 'error');
        } finally {
            setRefiningField(null);
        }
    };
    

    const handleCopy = async (value: string, label: string) => {
        if (!value || !value.trim()) {
            showNotification('沒有內容可以複製。', 'info');
            return;
        }
        try {
            await navigator.clipboard.writeText(value);
            showNotification(`已複製「${label}」的內容！`, 'success');
        } catch (err) {
            console.error('Copy failed: ', err);
            showNotification('複製失敗。', 'error');
        }
    };
    
    const handleExportPdf = async () => {
        const element = document.getElementById('conception-summary-export');
        if (!element) {
            showNotification('無法找到匯出內容。', 'error');
            return;
        }
        setIsExportingPdf(true);
        
        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const ratio = Math.min((pdfWidth - 40) / canvas.width, (pdfHeight - 40) / canvas.height);
            const imgX = (pdfWidth - canvas.width * ratio) / 2;
            const imgY = 20;
            pdf.addImage(imgData, 'PNG', imgX, imgY, canvas.width * ratio, canvas.height * ratio);
            pdf.save(`構想摘要_${proposal.title}.pdf`);
            showNotification('PDF 已成功匯出！', 'success');
        } catch (error) {
            console.error("Error exporting PDF:", error);
            showNotification('匯出 PDF 時發生錯誤。', 'error');
        } finally {
            setIsExportingPdf(false);
        }
    };

    const isConceptionSummaryEmpty = React.useMemo(() => {
        const { why, what, whoNeedsIt, whatToVerify, benefits } = proposal.conceptionSummary;
        return ![why, what, whoNeedsIt, whatToVerify, benefits].some(v => typeof v === 'string' && v.trim() !== '');
    }, [proposal.conceptionSummary]);

    const labelMap: Record<keyof Proposal['conceptionSummary'], string> = {
        why: '為何 (Why)',
        what: '做什麼 (What)',
        whoNeedsIt: '誰需要 (Who needs it)',
        whatToVerify: '能驗證什麼 (What to verify)',
        benefits: '效益在哪 (Benefits)'
    };
    
    return (
        <div className="space-y-6 animate-fade-in">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Step 1 */}
                <Card className={`p-4 ${!grantAnalysis ? 'bg-white' : 'bg-slate-50'}`}>
                    <div className="flex items-center mb-4">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FF6B6B] text-white font-bold text-lg mr-3">1</span>
                        <h3 className="text-lg font-bold text-slate-800">上傳並分析徵案文件</h3>
                    </div>
                    <FileUpload onFilesChanged={setGrantFile} accept=".pdf,.docx,.txt" allowMultiple={false}/>
                    <button onClick={handleAnalyzeGrantFile} disabled={isAnalyzingGrant || grantFile.length === 0} className="w-full mt-4 bg-[#FF6B6B] text-white font-semibold py-2 px-4 rounded-xl shadow-sm hover:bg-[#fa5a5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B6B] disabled:bg-slate-300 flex items-center justify-center">
                        {isAnalyzingGrant ? <><Spinner small />分析中...</> : 'AI 解析文件'}
                    </button>
                </Card>
                {/* Step 2 */}
                <Card className={`p-4 ${grantAnalysis && !proposal.conceptionSummary.what ? 'bg-white' : 'bg-slate-50'}`}>
                     <div className="flex items-center mb-4">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FF6B6B] text-white font-bold text-lg mr-3">2</span>
                        <h3 className="text-lg font-bold text-slate-800">輸入您的核心構想</h3>
                    </div>
                    <div className="space-y-4">
                        <Textarea label="核心構想" value={userIdea} onChange={e => setUserIdea(e.target.value)} placeholder="例：AI 智慧餐飲OMO系統" disabled={!grantAnalysis} />
                        <Textarea label="業者需求/痛點" value={userNeeds} onChange={e => setUserNeeds(e.target.value)} placeholder="例：人力成本高、會員數據分散" disabled={!grantAnalysis} />
                        <FileUpload 
                            onFilesChanged={setReferenceFiles}
                            allowMultiple={true}
                            description="支援Word、PDF、PPT、圖片（PNG、JPG）。最多10個檔案、單檔≤50MB。"
                            accept=".pdf,.docx,.doc,.pptx,.ppt,.png,.jpg,.jpeg,.txt"
                            disabled={!grantAnalysis}
                            label="參考文件上傳（選填）"
                        />
                    </div>
                </Card>
                {/* Step 3 */}
                 <Card className="p-4 bg-slate-50">
                    <div className="flex items-center mb-4">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FF6B6B] text-white font-bold text-lg mr-3">3</span>
                        <h3 className="text-lg font-bold text-slate-800">AI 生成完整構想</h3>
                    </div>
                     <button onClick={handleGeneratePolicyConcept} disabled={!grantAnalysis || !userIdea || !userNeeds || isGeneratingConcept} className="w-full bg-[#FF6B6B] text-white font-semibold py-2 px-4 rounded-xl shadow-sm hover:bg-[#fa5a5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B6B] disabled:bg-slate-300 flex items-center justify-center">
                        {isGeneratingConcept ? <><Spinner small />生成中...</> : '生成完整構想'}
                    </button>
                     <div className="relative mt-4">
                        <button onClick={() => setActiveSection(ProjectSection.ANALYSIS)} disabled={isConceptionSummaryEmpty} className="w-full bg-slate-600 text-white font-semibold py-2 px-4 rounded-xl shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:bg-slate-300 disabled:cursor-not-allowed group">
                            前往分析階段
                        </button>
                         {isConceptionSummaryEmpty && <div className="absolute bottom-full mb-2 w-max max-w-xs left-1/2 -translate-x-1/2 px-3 py-1.5 text-xs font-medium text-white bg-slate-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">請先生成或填寫構想摘要內容。</div>}
                    </div>
                </Card>
            </div>
            
            {grantAnalysis && (
                <Card>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">徵案摘要卡</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <InfoItem label="計畫名稱" value={grantAnalysis.title} />
                        <InfoItem label="主辦單位" value={grantAnalysis.department} />
                        <InfoItem label="截止日期" value={grantAnalysis.deadline} />
                        <InfoItem label="摘要" value={grantAnalysis.summary} className="md:col-span-3" />
                        <InfoItem label="申請資格" value={grantAnalysis.eligibility} />
                        <InfoItem label="審查重點" value={grantAnalysis.reviewFocus} />
                        <InfoItem label="關鍵詞" value={grantAnalysis.keywords.join(', ')} />
                    </div>
                </Card>
            )}

            <div id="conception-summary-export" className="bg-white p-6 rounded-xl border border-slate-200/60">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-slate-800">構想摘要</h3>
                    <div className="flex items-center gap-2">
                         <button onClick={handleAutoCompleteSummary} disabled={isAutoCompleting} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-full shadow-sm hover:bg-slate-100 disabled:bg-slate-200 transition-colors">
                            {isAutoCompleting ? <Spinner small /> : <MagicWandIcon small />}
                            {isAutoCompleting ? '補完中...' : 'AI 補完摘要'}
                        </button>
                         <button onClick={handleExportPdf} disabled={isExportingPdf} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-full shadow-sm hover:bg-slate-100 disabled:bg-slate-200 transition-colors">
                            {isExportingPdf ? <Spinner small /> : <DownloadIcon />}
                            {isExportingPdf ? '匯出中...' : '匯出 PDF'}
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-1"><SummaryFieldCard icon={<QuestionMarkCircleIcon />} label={labelMap.why} value={proposal.conceptionSummary.why} isRefining={refiningField === 'why'} onRefine={() => handleRefineSingleField('why')} onCopy={handleCopy} placeholder="對應哪項政策？解決什麼市場痛點？此計畫為何重要？" /></div>
                    <div className="lg:col-span-1"><SummaryFieldCard icon={<WrenchScrewdriverIcon />} label={labelMap.what} value={proposal.conceptionSummary.what} isRefining={refiningField === 'what'} onRefine={() => handleRefineSingleField('what')} onCopy={handleCopy} placeholder="具體要開發的技術、產品或服務是什麼？" /></div>
                    <div className="lg:col-span-1"><SummaryFieldCard icon={<UserGroupIcon />} label={labelMap.whoNeedsIt} value={proposal.conceptionSummary.whoNeedsIt} isRefining={refiningField === 'whoNeedsIt'} onRefine={() => handleRefineSingleField('whoNeedsIt')} onCopy={handleCopy} placeholder="目標客戶是誰？他們的需求有多迫切？" /></div>
                    <div className="lg:col-span-2"><SummaryFieldCard icon={<CheckBadgeIcon />} label={labelMap.whatToVerify} value={proposal.conceptionSummary.whatToVerify} isRefining={refiningField === 'whatToVerify'} onRefine={() => handleRefineSingleField('whatToVerify')} onCopy={handleCopy} placeholder="計畫成功的關鍵指標是什麼？(TRL、性能規格、市場驗證指標)" /></div>
                    <div className="lg:col-span-1"><SummaryFieldCard icon={<ChartTrendingUpIcon />} label={labelMap.benefits} value={proposal.conceptionSummary.benefits} isRefining={refiningField === 'benefits'} onRefine={() => handleRefineSingleField('benefits')} onCopy={handleCopy} placeholder="預期的量化效益是什麼？(提升效率 X%、降低成本 Y%)" /></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {proposal.policyFitnessAnalysis && (
                    <Card>
                        <h3 className="text-lg font-bold text-slate-800 mb-2 text-center">契合度分析雷達圖</h3>
                        <RadarChart data={[{
                            title: '契合度分數',
                            scoresByCriterion: Object.entries(proposal.policyFitnessAnalysis).reduce((acc, [key, value]: [string, number]) => {
                                acc[key] = { raw: value };
                                return acc;
                            }, {} as Record<string, { raw: number }>)
                        }]} criteria={[
                            {id: 'policyCompliance', name: '政策符合'},
                            {id: 'technicalInnovation', name: '技術創新'},
                            {id: 'industryImpact', name: '產業影響'},
                            {id: 'feasibility', name: '執行可行'},
                            {id: 'kpiVerifiability', name: 'KPI 可驗證'},
                        ]} />
                    </Card>
                )}
                 {proposal.optimizationSuggestions && (
                    <Card>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">AI 策略優化建議</h3>
                        <div className="space-y-4">
                            <SuggestionCard title="政策關聯提示" content={proposal.optimizationSuggestions.policyLink} icon={<LinkIcon />} />
                            <SuggestionCard title="加分建議" content={proposal.optimizationSuggestions.bonusPoints} icon={<StarIcon />} />
                            <SuggestionCard title="延伸應用建議" content={proposal.optimizationSuggestions.expansion} icon={<LightBulbIcon />} />
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
};


const InfoItem: React.FC<{label: string, value: string, className?: string}> = ({label, value, className}) => (
    <div className={className}>
        <p className="font-semibold text-slate-600">{label}</p>
        <p className="text-slate-800 mt-1">{value}</p>
    </div>
);

const SuggestionCard: React.FC<{title: string, content: string, icon: React.ReactNode}> = ({ title, content, icon }) => (
    <div className="bg-slate-50 p-3 rounded-lg border">
        <div className="flex items-center text-slate-700 font-semibold mb-1">
            {icon}
            <span className="ml-2">{title}</span>
        </div>
        <p className="text-sm text-slate-600">{content}</p>
    </div>
);

const Input: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, disabled?: boolean}> = ({label, value, onChange, placeholder, disabled}) => (<div><label className="block text-sm font-medium text-slate-700 mb-1">{label}</label><input type="text" value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] disabled:bg-slate-100" /></div>);
const Textarea: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, placeholder?: string, disabled?: boolean}> = ({label, value, onChange, placeholder, disabled}) => (<div><label className="block text-sm font-medium text-slate-700 mb-1">{label}</label><textarea value={value} onChange={onChange} rows={2} placeholder={placeholder} disabled={disabled} className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] disabled:bg-slate-100" /></div>);


// ICONS
const QuestionMarkCircleIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg>;
const WrenchScrewdriverIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.495-2.495a1.125 1.125 0 0 1 1.59 0l3.128 3.128a1.125 1.125 0 0 1 0 1.59l-2.495 2.495M11.42 15.17 8.354 18.24a1.125 1.125 0 0 1-1.59 0L2.25 13.73a1.125 1.125 0 0 1 0-1.59l8.364-8.364a1.125 1.125 0 0 1 1.59 0l2.495 2.495" /></svg>;
const UserGroupIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m-7.5-2.962c.51.056 1.02.086 1.53.086 2.17 0 4.24-.585 6.12-1.58M12 6.03a6.002 6.002 0 0 0-4.148 2.002 6.002 6.002 0 0 0-4.148-2.002Zm0 2.262a6.002 6.002 0 0 1 4.148 2.002 6.002 6.002 0 0 1 4.148-2.002m-9.292 8.41a5.988 5.988 0 0 1-2.874-.478 3 3 0 0 1 4.682-2.72m-3.741.479A9.094 9.094 0 0 1 6 18.72Z" /></svg>;
const CheckBadgeIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const ChartTrendingUpIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 18 9-9 4.5 4.5L21.75 6" /></svg>;
const DownloadIcon: React.FC = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>);
const Spinner: React.FC<{small?: boolean}> = ({small}) => ( <svg className={`animate-spin ${small ? 'h-4 w-4 mr-1' : 'h-5 w-5 -ml-1 mr-2'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> );
const ClipboardIcon: React.FC = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0w.055.194.084.4.084.612v0a2.25 2.25 0 0 1-2.25 2.25h-1.5a2.25 2.25 0 0 1-2.25-2.25v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>);
const MagicWandIcon: React.FC<{small?: boolean}> = ({small}) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={small ? 'w-4 h-4' : 'w-5 h-5'}><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-2.25-1.328l-4.122.282.282-4.122a3 3 0 0 0 1.328-2.25l1.012-6.072a3 3 0 0 1 2.25-1.328l4.122-.282-.282 4.122a3 3 0 0 1-1.328 2.25l-1.012 6.072a3 3 0 0 0 2.25 1.328l4.122-.282-.282 4.122a3 3 0 0 0-1.328 2.25l-1.012 6.072a3 3 0 0 1-2.25 1.328l-4.122.282.282-4.122a3 3 0 0 1 1.328-2.25l1.012-6.072Zm-4.122.282-2.828-2.828m11.314 0-2.828-2.828" /></svg> );
const LinkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>;
const StarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 21.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>;
const LightBulbIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.311a7.5 7.5 0 01-7.5 0c.407.567.92.99 1.5.1209m6-1.209c.58.21.993.642 1.5 1.209M18 12a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>;


export default Stage1Conception;