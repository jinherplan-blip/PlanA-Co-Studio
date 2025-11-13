import React, { useState } from 'react';
import { AITone, LLMProvider, InspirationReport, InspirationInputs, IndustrySuggestion, GrantAnalysisReport, StrategyFitResult } from '../../types';
import StageIndustrySuggest from './StageIndustrySuggest';
import StageInspiration from './StageInspiration';
import Card from '../ui/Card';

// Props from App.tsx
interface StageStrategyPositioningProps {
  onCreateProject: (report: InspirationReport, inputs: InspirationInputs) => void;
  aiTone: AITone;
  llmProvider: LLMProvider;
}

// Main container component for this stage
const StageStrategyPositioning: React.FC<StageStrategyPositioningProps> = (props) => {
  const [currentView, setCurrentView] = useState<'suggest' | 'inspire'>('suggest');
  const [prefillData, setPrefillData] = useState<IndustrySuggestion | GrantAnalysisReport | StrategyFitResult | null>(null);

  const renderContent = () => {
    switch (currentView) {
      case 'suggest':
        return <StageIndustrySuggest 
          aiTone={props.aiTone} 
          llmProvider={props.llmProvider} 
          onProceed={(suggestion) => {
            setPrefillData(suggestion);
            setCurrentView('inspire');
          }} 
        />;
      case 'inspire':
        return <StageInspiration
          onCreateProjectFromInspiration={props.onCreateProject}
          aiTone={props.aiTone}
          llmProvider={props.llmProvider}
          prefillData={prefillData}
          onPrefillConsumed={() => setPrefillData(null)}
        />;
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-center bg-white p-1.5 rounded-full shadow-sm border w-fit mx-auto">
         <button onClick={() => setCurrentView('suggest')} className={`px-6 py-2 rounded-full text-sm font-semibold transition ${currentView === 'suggest' ? 'bg-[#FF6B6B] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>1. 產業定位</button>
         <button onClick={() => setCurrentView('inspire')} className={`px-6 py-2 rounded-full text-sm font-semibold transition ${currentView === 'inspire' ? 'bg-[#FF6B6B] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>2. 靈感生成</button>
      </div>
      {renderContent()}
    </div>
  );
};

export default StageStrategyPositioning;