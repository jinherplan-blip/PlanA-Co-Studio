import React, { useState } from 'react';
import { AITone, LLMProvider, IndustrySuggestion, IndustrySuggestInputs } from '../../types';
import { suggestIndustry } from '../../services/geminiService';
import Card from '../ui/Card';

interface StageIndustrySuggestProps {
  onProceed: (suggestion: IndustrySuggestion) => void;
  aiTone: AITone;
  llmProvider: LLMProvider;
}

const initialInputs: IndustrySuggestInputs = {
    idea: '',
    painPoint: '',
    companySize: '新創 (1-10人)',
    capital: '',
    timeline: '6-12 個月',
    coreTech: ''
};

const StageIndustrySuggest: React.FC<StageIndustrySuggestProps> = ({ onProceed, aiTone, llmProvider }) => {
    const [inputs, setInputs] = useState<IndustrySuggestInputs>(initialInputs);
    const [suggestion, setSuggestion] = useState<IndustrySuggestion | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const handleInputChange = (field: keyof IndustrySuggestInputs, value: string) => {
        setInputs(prev => ({ ...prev, [field]: value }));
    };

    const handleAnalyze = async () => {
        if (!inputs.idea.trim() || !inputs.painPoint.trim()) {
            alert('請至少填寫「構想簡述」與「主要需求或痛點」。');
            return;
        }
        setIsLoading(true);
        setSuggestion(null);
        try {
            const result = await suggestIndustry(inputs, aiTone, llmProvider);
            if (result) {
                setSuggestion(result);
            } else {
                alert('AI 產業匹配分析失敗，請稍後再試。');
            }
        } catch (error) {
            console.error('Error in industry suggestion:', error);
            alert('AI 產業匹配分析時發生錯誤。');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <Card>
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold text-gray-800 text-center">AI 產業智能匹配</h2>
                    <p className="mt-2 text-center text-gray-600">
                        輸入您的初步構想與企業條件，AI 將自動分析最適合的產業、主管部會與補助主軸，為您的計畫找到最佳定位。
                    </p>
                    <div className="mt-8 space-y-6">
                        <Fieldset legend="核心構想">
                            <Input label="構想簡述" value={inputs.idea} onChange={e => handleInputChange('idea', e.target.value)} placeholder="例如：開發一套 AI 智慧點餐與 CRM 系統" isRequired />
                            <Textarea label="主要需求或痛點" value={inputs.painPoint} onChange={e => handleInputChange('painPoint', e.target.value)} placeholder="例如：解決餐廳人力不足、會員資料分散且無法精準行銷的問題" isRequired />
                        </Fieldset>
                        
                        <Fieldset legend="企業與計畫條件">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Select label="企業規模" value={inputs.companySize} onChange={e => handleInputChange('companySize', e.target.value)} options={['新創 (1-10人)', '中小企業 (11-100人)', '中大型企業 (101人以上)']} />
                                <Input label="實收資本額 (萬元)" value={inputs.capital} onChange={e => handleInputChange('capital', e.target.value)} placeholder="例如：100" />
                                <Select label="預計時程" value={inputs.timeline} onChange={e => handleInputChange('timeline', e.target.value)} options={['3-6 個月', '6-12 個月', '1年以上']} />
                                <Input label="核心技術主軸" value={inputs.coreTech} onChange={e => handleInputChange('coreTech', e.target.value)} placeholder="例如：AI, SaaS, CRM" />
                           </div>
                        </Fieldset>

                        <button
                            onClick={handleAnalyze}
                            disabled={isLoading}
                            className="w-full px-4 py-3 text-base font-medium text-white bg-[#FF6B6B] rounded-lg hover:bg-[#fa5a5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B6B] disabled:bg-slate-300 flex items-center justify-center shadow-lg hover:shadow-xl transition"
                        >
                            {isLoading ? <Spinner /> : <SparklesIcon />}
                            {isLoading ? 'AI 分析中...' : '開始智能匹配'}
                        </button>
                    </div>
                </div>
            </Card>

            {suggestion && (
                <Card className="relative bg-slate-50 border border-slate-200 animate-fade-in">
                    <CloseButton onClick={() => setSuggestion(null)} colorClassName="text-slate-400 hover:text-slate-600" />
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">AI 產業匹配報告</h3>
                    <div className="space-y-6">
                        <SuggestionItem title="產業分類建議" content={suggestion.industryClassification} icon={<FolderOpenIcon />} />
                        <SuggestionItem title="主要主管部會建議" content={suggestion.mainDepartment} icon={<BuildingLibraryIcon />} />
                        <SuggestionItem title="對應補助主軸" content={suggestion.grantThemes.join(', ')} icon={<TagIcon />} />
                        <SuggestionItem title="AI預測案型建議" content={suggestion.predictedGrantType} icon={<DocumentCheckIcon />} />
                        <SuggestionItem title="顧問建議" content={suggestion.consultantAdvice} icon={<ChatBubbleLeftRightIcon />} />
                        
                        <div className="border-t pt-6 text-center">
                            <button
                                onClick={() => onProceed(suggestion)}
                                className="bg-[#FF6B6B] text-white font-semibold py-3 px-8 rounded-2xl shadow-sm hover:bg-[#fa5a5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B6B] transition-transform transform hover:scale-105 inline-flex items-center"
                            >
                                <ArrowRightIcon />
                                用此建議開始靈感分析
                            </button>
                        </div>
                    </div>
                </Card>
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

const Input: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, isRequired?: boolean}> = ({label, value, onChange, placeholder, isRequired}) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label} {isRequired && <span className="text-red-500">*</span>}</label>
        <input type="text" value={value} onChange={onChange} placeholder={placeholder} className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]" />
    </div>
);

const Textarea: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, placeholder?: string, isRequired?: boolean}> = ({label, value, onChange, placeholder, isRequired}) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label} {isRequired && <span className="text-red-500">*</span>}</label>
        <textarea value={value} onChange={onChange} placeholder={placeholder} rows={3} className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]" />
    </div>
);

const Select: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: string[]}> = ({label, value, onChange, options}) => (
     <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <select value={value} onChange={onChange} className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] bg-white">
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);


const SuggestionItem: React.FC<{ title: string; content: string; icon: React.ReactNode; }> = ({ title, content, icon }) => (
    <div className="p-4 bg-white rounded-lg border">
        <div className="flex items-center mb-2">
            {icon}
            <h4 className="font-semibold text-lg text-slate-800 ml-2">{title}</h4>
        </div>
        <p className="text-sm text-gray-700">{content}</p>
    </div>
);

const Spinner = () => ( <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> );
const CloseButton: React.FC<{onClick: () => void, colorClassName?: string}> = ({ onClick, colorClassName = "text-indigo-400 hover:text-indigo-600" }) => ( <button onClick={onClick} className={`absolute top-3 right-3 z-10 ${colorClassName}`} aria-label="關閉建議"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button> );
const SparklesIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg> );
const FolderOpenIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-600"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25M9 14.25v2.25m6-2.25v2.25m-6-4.5v-1.5m6 1.5v-1.5m-3.75 6H12M9 12h1.5M12 12h1.5m-3 0h-1.5m6 0h-1.5m-3.75-3.75h1.5m-1.5 0h-1.5" /></svg>);
const BuildingLibraryIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-600"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18" /></svg>);
const TagIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-600"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" /></svg>);
const DocumentCheckIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-600"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>);
const ChatBubbleLeftRightIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-600"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.72 3.72a1.125 1.125 0 0 1-1.59 0l-3.72-3.72a2.122 2.122 0 0 1-1.98-2.193v-4.286c0-.97.616-1.813 1.5-2.097m6.498 6.498 3.72-3.72a.75.75 0 0 0-.53-1.28H4.26a.75.75 0 0 0-.53 1.28l3.72 3.72" /></svg>);
const ArrowRightIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2 inline"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg> );

export default StageIndustrySuggest;