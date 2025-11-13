import React, { useState } from 'react';
import { AITone, LLMProvider } from '../../types';
import { learnFromExample } from '../../services/geminiService';
import Card from './Card';

interface LearningModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiTone: AITone;
  llmProvider: LLMProvider;
}

const LearningModal: React.FC<LearningModalProps> = ({ isOpen, onClose, aiTone, llmProvider }) => {
  const [exampleText, setExampleText] = useState('');
  const [learningGoal, setLearningGoal] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!exampleText.trim() || !learningGoal.trim()) {
      alert('請輸入案例內文與學習目標。');
      return;
    }
    setIsLoading(true);
    setAnalysisResult('');
    try {
      const result = await learnFromExample(exampleText, learningGoal, aiTone, llmProvider);
      setAnalysisResult(result);
    } catch (error) {
      console.error("Error learning from example:", error);
      alert('AI 學習失敗，請稍後再試。');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in-fast" onClick={onClose}>
      <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">AI 案例學習中心</h2>
            <p className="text-sm text-slate-500 mt-1">貼上成功的計畫書範例，讓 AI 為您分析高分關鍵與可複用的寫作模板。</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="example-text" className="block text-sm font-medium text-slate-700 mb-2">
                1. 貼上成功案例內文
              </label>
              <textarea
                id="example-text"
                value={exampleText}
                onChange={(e) => setExampleText(e.target.value)}
                rows={10}
                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] bg-white transition-colors"
                placeholder="在此貼上您想讓 AI 學習的計畫書段落或全文..."
              />
            </div>
            <div>
              <label htmlFor="learning-goal" className="block text-sm font-medium text-slate-700 mb-2">
                2. 設定學習目標
              </label>
              <textarea
                id="learning-goal"
                value={learningGoal}
                onChange={(e) => setLearningGoal(e.target.value)}
                rows={10}
                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] bg-white transition-colors"
                placeholder="例如：&#10;- 學習「技術亮點」的鋪陳方式&#10;- 分析「政策對應」的高分寫法&#10;- 拆解「ESG 效益」的敘述結構"
              />
            </div>
          </div>

          {analysisResult && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-3">AI 分析報告</h3>
                <div 
                    className="text-sm text-slate-800 whitespace-pre-wrap prose prose-sm max-w-none prose-headings:text-[#FF6B6B] prose-strong:text-slate-800" 
                    dangerouslySetInnerHTML={{ __html: analysisResult.replace(/\n/g, '<br />') }} 
                />
            </div>
          )}

        </div>

        <div className="p-4 bg-slate-100 border-t border-slate-200 rounded-b-xl flex justify-end space-x-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-2xl hover:bg-slate-100 transition-colors">
            關閉
          </button>
          <button onClick={handleAnalyze} disabled={isLoading} className="px-5 py-2.5 text-sm font-semibold text-white bg-[#FF6B6B] rounded-2xl shadow-sm hover:bg-[#fa5a5a] disabled:bg-[#fab4b4] flex items-center transition-colors">
            {isLoading ? (
                <>
                    <Spinner />
                    分析中...
                </>
            ) : '開始分析'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Spinner = () => (
    <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export default LearningModal;