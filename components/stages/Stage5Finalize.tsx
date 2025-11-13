import React, { useState } from 'react';
import { Proposal, AITone, TableData, LLMProvider } from '../../types';
import Card from '../ui/Card';
import { generateSummary, generatePitch, generateHighlightSummary, generatePresentationDeck } from '../../services/geminiService';
import { useNotification } from '../../contexts/NotificationProvider';

interface Stage5Props {
    proposal: Proposal;
    tableData: TableData;
    aiTone: AITone;
    llmProvider: LLMProvider;
}

const Stage5Finalize: React.FC<Stage5Props> = ({ proposal, tableData, aiTone, llmProvider }) => {
    const [summary, setSummary] = useState('');
    const [pitch, setPitch] = useState('');
    const [highlight, setHighlight] = useState('');
    const [deck, setDeck] = useState('');
    const [loadingState, setLoadingState] = useState({ summary: false, pitch: false, highlight: false, deck: false });
    const { showNotification } = useNotification();
    
    const handleGenerate = async (type: 'summary' | 'pitch' | 'highlight' | 'deck') => {
        setLoadingState(prev => ({ ...prev, [type]: true }));
        const fullProposalText = proposal.chapters.map(c => c.content).join('\n\n');
        
        try {
            let resultText = '';
            let resultTitle = '';

            if (type === 'summary') {
                resultText = await generateSummary(fullProposalText, proposal.title, aiTone);
                setSummary(resultText);
                resultTitle = '一頁計畫摘要';
            } else if (type === 'pitch') {
                resultText = await generatePitch(fullProposalText, proposal.title, aiTone);
                setPitch(resultText);
                resultTitle = '三分鐘簡報稿';
            } else if (type === 'highlight') {
                resultText = await generateHighlightSummary(proposal, tableData, aiTone);
                setHighlight(resultText);
                resultTitle = '一頁式亮點簡報';
            } else if (type === 'deck') {
                resultText = await generatePresentationDeck(proposal.conceptionSummary, aiTone);
                setDeck(resultText);
                resultTitle = '提案簡報骨架';
            }
            showNotification(`已成功生成「${resultTitle}」。`, 'success');
        } catch (error: any) {
            console.error(`Error generating ${type}:`, error);
            showNotification(error.message || `無法生成${type}，請稍後再試。`, 'error');
        } finally {
            setLoadingState(prev => ({ ...prev, [type]: false }));
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            <div className="space-y-6">
                <Card>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">提案簡報骨架</h3>
                     <button 
                        onClick={() => handleGenerate('deck')} 
                        disabled={loadingState.deck}
                        className="text-sm bg-red-100 text-red-900 font-semibold py-1 px-3 rounded-xl hover:bg-red-200 disabled:opacity-50 mb-4"
                    >
                         {loadingState.deck ? '生成中...' : 'AI 生成簡報骨架'}
                    </button>
                    <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700 h-40 overflow-y-auto border whitespace-pre-wrap">
                        {deck || '點擊按鈕，AI 將從「構想摘要卡」自動生成一份 5 頁的簡報骨架。'}
                    </div>
                </Card>
                 <Card>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">三分鐘簡報稿</h3>
                     <button 
                        onClick={() => handleGenerate('pitch')} 
                        disabled={loadingState.pitch}
                        className="text-sm bg-red-100 text-red-900 font-semibold py-1 px-3 rounded-xl hover:bg-red-200 disabled:opacity-50 mb-4"
                    >
                         {loadingState.pitch ? '生成中...' : 'AI 生成簡報稿'}
                    </button>
                    <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700 h-40 overflow-y-auto border">
                        {pitch || '點擊按鈕，AI 將為您產生一份具說服力的三分鐘簡報講稿。'}
                    </div>
                </Card>
            </div>


            <div className="space-y-6">
                <Card>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">一頁計畫摘要</h3>
                    <button 
                        onClick={() => handleGenerate('summary')} 
                        disabled={loadingState.summary}
                        className="text-sm bg-red-100 text-red-900 font-semibold py-1 px-3 rounded-xl hover:bg-red-200 disabled:opacity-50 mb-4"
                    >
                        {loadingState.summary ? '生成中...' : 'AI 生成摘要'}
                    </button>
                    <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700 h-40 overflow-y-auto border">
                        {summary || '點擊按鈕，AI 將為您濃縮整份計畫書的精華。'}
                    </div>
                </Card>
                 <Card>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">一頁式亮點簡報</h3>
                     <button 
                        onClick={() => handleGenerate('highlight')} 
                        disabled={loadingState.highlight}
                        className="text-sm bg-red-100 text-red-900 font-semibold py-1 px-3 rounded-xl hover:bg-red-200 disabled:opacity-50 mb-4"
                    >
                         {loadingState.highlight ? '生成中...' : 'AI 生成亮點簡報'}
                    </button>
                    <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700 h-40 overflow-y-auto border whitespace-pre-wrap">
                        {highlight || '點擊按鈕，AI 將為您整理一份適合簡報的單頁亮點摘要。'}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Stage5Finalize;