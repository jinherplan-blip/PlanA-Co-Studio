import React, { useState } from 'react';
import Stage1Conception from './stages/Stage1Conception';
import Stage2Analysis from './stages/Stage2Analysis';
import Stage3Writing from './stages/Stage3Writing';
import Stage4Review from './stages/Stage4Review';
import Stage5Finalize from './stages/Stage5Finalize';
import { Proposal, TableData, ScoringCriterion, AITone, LLMProvider, ProjectSection, GrantInfo, SwotAnalysis } from '../types';
import ProjectStatus from './ui/ProjectStatus';
import { suggestTitlesForExistingProject } from '../services/geminiService';
import { useNotification } from '../contexts/NotificationProvider';
import Modal from './ui/Modal';


interface ProjectWorkspaceProps {
    activeProject: Proposal;
    setActiveProject: (updater: React.SetStateAction<Proposal>) => void;
    activeSection: ProjectSection;
    setActiveSection: (section: ProjectSection) => void;
    tableData: TableData;
    setTableData: React.Dispatch<React.SetStateAction<TableData>>;
    scoringCriteria: ScoringCriterion[];
    setScoringCriteria: React.Dispatch<React.SetStateAction<ScoringCriterion[]>>;
    aiTone: AITone;
    setAiTone: (tone: AITone) => void;
    llmProvider: LLMProvider;
    grants: GrantInfo[];
    onCompareGrants: (selectedGrants: GrantInfo[]) => void;
    allProjects: Proposal[];
    onSelectProject: (id: string) => void;
}

const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = (props) => {
    const { activeProject, setActiveProject, activeSection, setActiveSection, aiTone, setAiTone, llmProvider, allProjects, onSelectProject, grants } = props;
    const { showNotification } = useNotification();
    const sections = Object.values(ProjectSection);
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

    // States for title suggestion modal
    const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
    const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [selectedNewTitle, setSelectedNewTitle] = useState<string | null>(null);

    const recentProjects = allProjects
        .filter(p => p.id !== activeProject.id)
        .sort((a, b) => parseInt(b.id.split('-')[1]) - parseInt(a.id.split('-')[1]))
        .slice(0, 5);
    
    const handleSetSwotAnalysis = (analysis: SwotAnalysis | null) => {
        setActiveProject(prev => ({
            ...prev,
            swotAnalysis: analysis || undefined,
        }));
    };

    const handleSuggestTitles = async () => {
        setIsSuggesting(true);
        setSuggestedTitles([]);
        setSelectedNewTitle(null);
        try {
            const titles = await suggestTitlesForExistingProject(activeProject, aiTone);
            if (titles && titles.length > 0) {
                setSuggestedTitles(titles);
                setSelectedNewTitle(titles[0]);
            } else {
                showNotification('AI 未能建議標題。', 'warning');
                setIsTitleModalOpen(false);
            }
        } catch (error: any) {
            showNotification(error.message || 'AI 標題建議失敗。', 'error');
            setIsTitleModalOpen(false);
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleOpenTitleModal = () => {
        setIsTitleModalOpen(true);
        handleSuggestTitles();
    };

    const handleApplyNewTitle = () => {
        if (!selectedNewTitle) return;
        setActiveProject(prev => ({ ...prev, title: selectedNewTitle }));
        showNotification('計畫標題已更新。', 'success');
        setIsTitleModalOpen(false);
    };

    const renderSectionContent = () => {
        switch (activeSection) {
            case ProjectSection.CONCEPTION:
                return <Stage1Conception proposal={activeProject} setProposal={setActiveProject} aiTone={props.aiTone} llmProvider={props.llmProvider} grants={props.grants} onCompareGrants={props.onCompareGrants} setActiveSection={setActiveSection} />;
            case ProjectSection.ANALYSIS:
                return <Stage2Analysis 
                            tableData={props.tableData} 
                            setTableData={props.setTableData} 
                            proposal={activeProject} 
                            aiTone={props.aiTone} 
                            llmProvider={props.llmProvider}
                            swotAnalysis={activeProject.swotAnalysis}
                            setSwotAnalysis={handleSetSwotAnalysis}
                        />;
            case ProjectSection.WRITING:
                return <Stage3Writing proposal={activeProject} setProposal={setActiveProject} aiTone={aiTone} setAiTone={setAiTone} llmProvider={llmProvider} />;
            case ProjectSection.REVIEW:
                return <Stage4Review proposal={activeProject} scoringCriteria={props.scoringCriteria} setScoringCriteria={props.setScoringCriteria} aiTone={props.aiTone} llmProvider={props.llmProvider} />;
            case ProjectSection.FINALIZE:
                return <Stage5Finalize proposal={activeProject} tableData={props.tableData} aiTone={props.aiTone} llmProvider={props.llmProvider} />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* New Workspace Header */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4 mb-6">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-slate-800 truncate" title={activeProject.title}>
                                {activeProject.title}
                            </h2>
                            <button
                                onClick={handleOpenTitleModal}
                                title="AI 建議新標題"
                                className="text-slate-400 hover:text-[#FF6B6B] transition-colors p-1 rounded-full hover:bg-red-100 flex-shrink-0"
                            >
                                <SparklesIcon />
                            </button>
                        </div>
                        <div className="mt-2">
                           <ProjectStatus proposal={activeProject} />
                        </div>
                    </div>
                    <div className="relative flex-shrink-0">
                        <button
                            onClick={() => setIsSwitcherOpen(prev => !prev)}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                           <SwitchIcon />
                           切換計畫
                        </button>
                        {isSwitcherOpen && (
                            <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-10 animate-fade-in-fast">
                                <div className="p-2">
                                    <h4 className="px-2 py-1 text-xs font-semibold text-slate-500">最近的計畫</h4>
                                    {recentProjects.length > 0 ? (
                                        recentProjects.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => {
                                                    onSelectProject(p.id);
                                                    setIsSwitcherOpen(false);
                                                }}
                                                className="w-full text-left p-2 rounded-md hover:bg-slate-100"
                                            >
                                                <p className="text-sm font-medium text-slate-700 truncate">{p.title}</p>
                                                <div className="mt-1">
                                                    <ProjectStatus proposal={p} />
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <p className="p-2 text-sm text-slate-500">沒有其他最近的計畫。</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="border-b border-slate-200 mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {sections.map(section => (
                        <button
                            key={section}
                            onClick={() => setActiveSection(section)}
                            className={`${
                                activeSection === section
                                    ? 'border-[#FF6B6B] text-[#FF6B6B]'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            } whitespace-nowrap pb-4 px-1 border-b-2 font-semibold text-sm focus:outline-none transition-colors`}
                        >
                            {section}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="flex-1">
                {renderSectionContent()}
            </div>
             {isTitleModalOpen && (
                <Modal isOpen={isTitleModalOpen} onClose={() => setIsTitleModalOpen(false)} title="AI 標題建議">
                    {isSuggesting ? (
                        <div className="flex justify-center items-center p-8 gap-2 text-slate-600"><Spinner /> AI 正在產生建議...</div>
                    ) : (
                        <>
                            <p className="text-slate-600 mb-4 text-sm">AI 根據您目前的計畫內容，建議了以下標題：</p>
                            <div className="space-y-2 my-4 max-h-60 overflow-y-auto pr-2">
                                {suggestedTitles.map((title, index) => (
                                    <label key={index} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${selectedNewTitle === title ? 'bg-red-50 border-[#FF6B6B] ring-2 ring-red-100' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                                        <input
                                            type="radio"
                                            name="suggestedTitle"
                                            value={title}
                                            checked={selectedNewTitle === title}
                                            onChange={() => setSelectedNewTitle(title)}
                                            className="h-4 w-4 text-[#FF6B6B] focus:ring-[#FF6B6B] border-gray-300"
                                        />
                                        <span className="ml-3 text-sm font-medium text-slate-800">{title}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="mt-6 flex justify-end items-center gap-3">
                                <button onClick={() => setIsTitleModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-2xl hover:bg-slate-200">
                                    取消
                                </button>
                                <button onClick={handleApplyNewTitle} disabled={!selectedNewTitle} className="px-4 py-2 text-sm font-semibold text-white bg-[#FF6B6B] rounded-2xl shadow-sm hover:bg-[#fa5a5a] disabled:bg-[#fab4b4]">
                                    套用新標題
                                </button>
                            </div>
                        </>
                    )}
                </Modal>
            )}
        </div>
    );
};

const SwitchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
);

const SparklesIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg> );
const Spinner = () => ( <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> );


export default ProjectWorkspace;