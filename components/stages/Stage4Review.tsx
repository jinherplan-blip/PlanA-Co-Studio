import React, { useState } from 'react';
import { Proposal, AITone, ScoringCriterion, LLMProvider } from '../../types';
import Card from '../ui/Card';
import { simulateReviewerQuestions, predictScoresForCriterion } from '../../services/geminiService';
import { useNotification } from '../../contexts/NotificationProvider';

interface Stage4Props {
  proposal: Proposal;
  scoringCriteria: ScoringCriterion[];
  setScoringCriteria: React.Dispatch<React.SetStateAction<ScoringCriterion[]>>;
  aiTone: AITone;
  llmProvider: LLMProvider;
}

const Stage4Review: React.FC<Stage4Props> = ({ proposal, scoringCriteria, setScoringCriteria, aiTone, llmProvider }) => {
    const [mockQuestions, setMockQuestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingScores, setLoadingScores] = useState<Record<string, boolean>>({});
    const { showNotification } = useNotification();

    const handleCriterionChange = (id: string, field: 'name' | 'weight', value: string) => {
        setScoringCriteria(prev => prev.map(c => 
            c.id === id ? { ...c, [field]: field === 'weight' ? parseInt(value) || 0 : value } : c
        ));
    };
    
    const handleQuestionChange = (critId: string, qId: string, value: string) => {
        setScoringCriteria(prev => prev.map(c => 
            c.id === critId ? { ...c, questions: c.questions.map(q => q.id === qId ? { ...q, text: value } : q) } : c
        ));
    };

    const addCriterion = () => {
        const newCriterion: ScoringCriterion = {
            id: `crit-${Date.now()}`,
            name: '新評分面向',
            weight: 10,
            questions: [{ id: `q-${Date.now()}`, text: '新指標問題' }],
        };
        setScoringCriteria(prev => [...prev, newCriterion]);
    };

    const deleteCriterion = (id: string) => {
        setScoringCriteria(prev => prev.filter(c => c.id !== id));
    };

    const addQuestion = (critId: string) => {
        setScoringCriteria(prev => prev.map(c => 
            c.id === critId ? { ...c, questions: [...c.questions, { id: `q-${Date.now()}`, text: '' }] } : c
        ));
    };

    const deleteQuestion = (critId: string, qId: string) => {
        setScoringCriteria(prev => prev.map(c => 
            c.id === critId ? { ...c, questions: c.questions.filter(q => q.id !== qId) } : c
        ));
    };

    const handleMockReview = async () => {
        setIsLoading(true);
        setMockQuestions([]);
        const fullProposalText = proposal.chapters.map(c => c.content).join('\n\n');
        try {
            const questions = await simulateReviewerQuestions(fullProposalText, proposal.title, scoringCriteria, aiTone, llmProvider);
            setMockQuestions(questions);
        } catch (error: any) {
            showNotification(error.message || "模擬審查失敗，請稍後再試。", 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePredictScores = async (criterionId: string) => {
        setLoadingScores(prev => ({ ...prev, [criterionId]: true }));
        const criterion = scoringCriteria.find(c => c.id === criterionId);
        if (!criterion) {
            showNotification('找不到指定的評分標準。', 'warning');
            setLoadingScores(prev => ({ ...prev, [criterionId]: false }));
            return;
        }

        const fullProposalText = proposal.chapters.map(c => c.content).join('\n\n');
        try {
            const result = await predictScoresForCriterion(fullProposalText, criterion, aiTone, llmProvider);
            if (result) {
                setScoringCriteria(prev => prev.map(c => {
                    if (c.id === criterionId) {
                        const updatedQuestions = c.questions.map(q => {
                            const questionScore = result.questionScores.find(qs => qs.id === q.id);
                            return questionScore ? { ...q, aiScore: questionScore.score, aiJustification: questionScore.justification } : q;
                        });
                        return {
                            ...c,
                            aiScore: result.criterionScore.score,
                            aiJustification: result.criterionScore.justification,
                            questions: updatedQuestions,
                        };
                    }
                    return c;
                }));
            } else {
                 showNotification('AI 無法回傳有效的評分結果。', 'warning');
            }
        } catch (error: any) {
            showNotification(error.message || "AI 預測評分失敗。", 'error');
        } finally {
            setLoadingScores(prev => ({ ...prev, [criterionId]: false }));
        }
    };

    const totalWeight = scoringCriteria.reduce((sum, crit) => sum + crit.weight, 0);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <Card>
                <h3 className="text-xl font-bold text-gray-900 mb-4">自評計分卡 (可編輯)</h3>
                <p className="text-gray-600 mb-6">點擊文字即可編輯。請依據目標補助案的真實審查標準，動態調整評分權重與指標。</p>
                <div className="space-y-4">
                    {scoringCriteria.map(item => (
                        <div key={item.id} className="p-4 border rounded-lg bg-gray-50 group relative">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-grow space-y-2">
                                    <input
                                        type="text"
                                        value={item.name}
                                        onChange={(e) => handleCriterionChange(item.id, 'name', e.target.value)}
                                        className="font-semibold text-gray-800 bg-transparent border-b border-transparent focus:border-[#FF6B6B] focus:outline-none w-full"
                                    />
                                    <AIScoreDisplay score={item.aiScore} justification={item.aiJustification} />
                                </div>
                                <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                                    <button
                                        onClick={() => handlePredictScores(item.id)}
                                        disabled={loadingScores[item.id]}
                                        className="flex items-center justify-center px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-lg hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-400 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-wait transition-colors"
                                    >
                                        {loadingScores[item.id] ? <MiniSpinner /> : <SparklesIcon />}
                                        <span className="ml-1">{loadingScores[item.id] ? '預測中' : 'AI 預測'}</span>
                                    </button>
                                    <input
                                      type="number"
                                      value={item.weight}
                                      onChange={(e) => handleCriterionChange(item.id, 'weight', e.target.value)}
                                      className="text-[#FF6B6B] font-bold bg-transparent border-b border-transparent focus:border-[#FF6B6B] focus:outline-none w-16 text-right"
                                    />
                                    <span className="text-[#FF6B6B] font-bold">%</span>
                                </div>
                            </div>
                            <div className="mt-2 text-sm text-gray-600 space-y-2">
                                {item.questions.map(q => (
                                    <div key={q.id} className="flex items-center group justify-between">
                                        <div className="flex items-center flex-grow">
                                            <span className="mr-2 text-gray-500">・</span>
                                            <input
                                                type="text"
                                                value={q.text}
                                                onChange={(e) => handleQuestionChange(item.id, q.id, e.target.value)}
                                                className="w-full bg-transparent border-b border-transparent focus:border-gray-300 focus:outline-none"
                                            />
                                        </div>
                                         <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                                            <AIScoreDisplay score={q.aiScore} justification={q.aiJustification} />
                                            <button onClick={() => deleteQuestion(item.id, q.id)} className="ml-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={() => addQuestion(item.id)} className="text-[#FF6B6B] hover:text-[#fa5a5a] text-sm font-medium mt-2">+ 新增指標</button>
                            </div>
                             <button onClick={() => deleteCriterion(item.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                    <button onClick={addCriterion} className="w-full mt-4 py-2 px-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 hover:border-[#FF6B6B] hover:text-[#FF6B6B] transition">
                        + 新增評分面向
                    </button>
                </div>
                <div className={`mt-4 text-right font-bold ${totalWeight !== 100 ? 'text-red-500' : 'text-green-600'}`}>
                    總權重: {totalWeight}%
                </div>
            </Card>
            <Card>
                <h3 className="text-xl font-bold text-gray-900 mb-4">AI 模擬答辯</h3>
                <p className="text-gray-600 mb-6">讓 AI 依據您「自訂的計分卡」扮演審查委員，對計畫提出尖銳問題。</p>
                <button
                    onClick={handleMockReview}
                    disabled={isLoading}
                    className="w-full bg-[#FF6B6B] text-white font-semibold py-2.5 px-4 rounded-2xl shadow-sm hover:bg-[#fa5a5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B6B] disabled:bg-slate-300 disabled:text-slate-500 flex items-center justify-center transition-colors"
                >
                 {isLoading ? '生成問題中...' : '開始模擬提問'}
                </button>

                <div className="mt-6 space-y-3">
                    {isLoading && <p className="text-center text-gray-500">AI 正在閱讀您的計畫書並準備問題...</p>}
                    {mockQuestions.map((q, index) => (
                        <div key={index} className="flex items-start p-3 bg-blue-50 rounded-lg animate-fade-in">
                           <span className="text-blue-600 font-bold mr-3">{`Q${index+1}:`}</span>
                           <p className="text-gray-800 text-sm">{q}</p>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};

const AIScoreDisplay: React.FC<{ score?: number; justification?: string; }> = ({ score, justification }) => {
    if (typeof score !== 'number') return null;

    const getScoreColor = (s: number) => {
        if (s >= 85) return 'bg-green-100 text-green-800';
        if (s >= 70) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
    };

    return (
        <div className="relative group flex items-center space-x-1">
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getScoreColor(score)}`}>
                AI 預測: {score}
            </span>
            {justification && (
                <>
                    <InformationCircleIcon />
                    <div className="absolute z-10 bottom-full mb-2 w-64 p-2 text-xs font-normal text-white bg-gray-900 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {justification}
                    </div>
                </>
            )}
        </div>
    );
};


const TrashIcon: React.FC<{className?: string}> = ({className="w-4 h-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09.921-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);

const InformationCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400 group-hover:text-gray-600 cursor-pointer">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
);

const MiniSpinner = () => (
    <svg className="animate-spin h-4 w-4 text-red-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);

export default Stage4Review;