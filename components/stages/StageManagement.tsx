import React, { useState, useMemo } from 'react';
import { Proposal, AITone, LLMProvider, UploadedFile } from '../../types';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import { suggestMultipleProjectTitles, suggestTitlesForExistingProject } from '../../services/geminiService';
import { useNotification } from '../../contexts/NotificationProvider';
import ProjectStatus from '../ui/ProjectStatus';
import FileUpload from '../ui/FileUpload'; // Import the shared component

interface StageManagementProps {
    allProjects: Proposal[];
    activeProjectId: string | null;
    onSelectProject: (id: string) => void;
    onCreateProject: (title?: string) => Promise<void>;
    onCreateBlankProject: () => void;
    onCreateProjectFromImport: (text: string) => void;
    onDeleteProject: (id: string) => void;
    onUpdateProject: (id: string, updates: Partial<Proposal>) => void;
    aiTone: AITone;
    llmProvider: LLMProvider;
}

const StageManagement: React.FC<StageManagementProps> = ({ 
    allProjects,
    activeProjectId,
    onSelectProject, 
    onCreateProject, 
    onCreateBlankProject,
    onCreateProjectFromImport,
    onDeleteProject,
    onUpdateProject,
    aiTone,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingState, setEditingState] = useState<{ id: string | null; field: 'title' | 'tags' | 'dueDate' | null }>({ id: null, field: null });
    const [editingInputValue, setEditingInputValue] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [ideaInput, setIdeaInput] = useState('');
    const [isSuggesting, setIsSuggesting] = useState(false);
    const { showNotification } = useNotification();
    
    // States for new project title suggestion modal
    const [createModalStep, setCreateModalStep] = useState<'input' | 'selection'>('input');
    const [newProjectSuggestedTitles, setNewProjectSuggestedTitles] = useState<string[]>([]);
    const [selectedNewProjectTitle, setSelectedNewProjectTitle] = useState<string | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);


    // States for existing project title suggestion modal
    const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
    const [projectForSuggestions, setProjectForSuggestions] = useState<Proposal | null>(null);
    const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
    const [isSuggestingTitles, setIsSuggestingTitles] = useState(false);
    const [selectedNewTitle, setSelectedNewTitle] = useState<string | null>(null);


    const filteredAndSortedProjects = useMemo(() => {
        const parseId = (id: string) => parseInt(id.split('-')[1] || '0', 10);
        return allProjects
            .filter(project => 
                project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (project.aiTags && project.aiTags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
            )
            .sort((a, b) => parseId(b.id) - parseId(a.id));
    }, [allProjects, searchTerm]);

    const handleStartEdit = (project: Proposal, field: 'title' | 'tags' | 'dueDate') => {
        setEditingState({ id: project.id, field });
        if (field === 'title') {
            setEditingInputValue(project.title);
        } else if (field === 'tags') {
            setEditingInputValue((project.aiTags || []).join(', '));
        } else if (field === 'dueDate') {
            setEditingInputValue(project.dueDate || '');
        }
    };

    const handleCancelEdit = () => {
        setEditingState({ id: null, field: null });
        setEditingInputValue('');
    };

    const handleSaveEdit = () => {
        if (!editingState.id || !editingState.field) return;
        
        if (editingState.field === 'title') {
            if (!editingInputValue.trim()) {
                showNotification('計畫標題不能為空。', 'warning');
                return;
            }
            onUpdateProject(editingState.id, { title: editingInputValue.trim() });
        } else if (editingState.field === 'tags') {
            const tags = editingInputValue.split(',').map(tag => tag.trim()).filter(Boolean);
            onUpdateProject(editingState.id, { aiTags: tags });
        } else if (editingState.field === 'dueDate') {
            onUpdateProject(editingState.id, { dueDate: editingInputValue });
        }
        handleCancelEdit();
    };

    const handleOpenCreateModal = () => {
        setIdeaInput('');
        setNewProjectSuggestedTitles([]);
        setSelectedNewProjectTitle(null);
        setCreateModalStep('input');
        setIsCreateModalOpen(true);
        setUploadedFiles([]);
    };

    const handleSuggestTitlesForNewProject = async () => {
        if (!ideaInput.trim()) {
            showNotification('請輸入您的初步構想', 'warning');
            return;
        }
        setIsSuggesting(true);
        try {
            const titles = await suggestMultipleProjectTitles(ideaInput, uploadedFiles, aiTone);
            if (titles && titles.length > 0) {
                setNewProjectSuggestedTitles(titles);
                setSelectedNewProjectTitle(titles[0]);
                setCreateModalStep('selection');
            } else {
                showNotification('AI 未能建議標題，請稍後再試。', 'warning');
            }
        } catch (error: any) {
            showNotification(error.message || 'AI 標題建議失敗。', 'error');
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleCreateProjectFromSelection = async () => {
        if (!selectedNewProjectTitle) {
            showNotification('請選擇一個計畫標題。', 'warning');
            return;
        }
        await onCreateProject(selectedNewProjectTitle);
        
        setIsCreateModalOpen(false);
    };

    const handleOpenSuggestModal = async (project: Proposal) => {
        setProjectForSuggestions(project);
        setIsTitleModalOpen(true);
        setIsSuggestingTitles(true);
        setSuggestedTitles([]);
        setSelectedNewTitle(null);
        try {
            const titles = await suggestTitlesForExistingProject(project, aiTone);
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
            setIsSuggestingTitles(false);
        }
    };
    
    const handleCloseSuggestModal = () => {
        setIsTitleModalOpen(false);
        setProjectForSuggestions(null);
    };
    
    const handleApplyNewTitle = () => {
        if (!selectedNewTitle || !projectForSuggestions) return;
        onUpdateProject(projectForSuggestions.id, { title: selectedNewTitle });
        showNotification('計畫標題已更新。', 'success');
        handleCloseSuggestModal();
    };

    const getDateStatus = (dueDateString?: string) => {
        if (!dueDateString) return { text: '未設定截止日', color: 'text-slate-400' };

        const dueDate = new Date(dueDateString);
        dueDate.setHours(23, 59, 59, 999);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(today.getDate() + 7);

        if (dueDate < today) {
            return { text: `${dueDateString} (已逾期)`, color: 'text-red-600 font-semibold' };
        }
        if (dueDate <= sevenDaysFromNow) {
            return { text: `${dueDateString} (即將截止)`, color: 'text-amber-600 font-semibold' };
        }
        return { text: dueDateString, color: 'text-slate-600' };
    };
    
    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                 <div className="relative flex-grow">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon />
                    </span>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="依標題或標籤搜尋計畫..."
                        className="w-full max-w-md pl-10 pr-4 py-2 border border-slate-300 bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] shadow-sm transition-all"
                    />
                </div>
                <button
                    onClick={handleOpenCreateModal}
                    className="ml-4 flex-shrink-0 inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-[#FF6B6B] border border-transparent rounded-full shadow-sm hover:bg-[#fa5a5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B6B] transition-transform transform hover:scale-105"
                >
                   <PlusIcon/>
                   新增計畫
                </button>
            </div>

            {filteredAndSortedProjects.length > 0 ? (
                 <div className="space-y-4">
                    {filteredAndSortedProjects.map((project) => (
                        <Card 
                            key={project.id} 
                            className={`group transition-all duration-300 hover:shadow-lg hover:border-[#FF6B6B]/60 ${project.id === activeProjectId && !editingState.id ? 'border-[#FF6B6B] ring-2 ring-red-100' : ''}`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1 cursor-pointer" onClick={() => !editingState.id && onSelectProject(project.id)}>
                                    {editingState.id === project.id && editingState.field === 'title' ? (
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="text"
                                                value={editingInputValue}
                                                onChange={(e) => setEditingInputValue(e.target.value)}
                                                className="flex-grow bg-white border border-slate-300 rounded-md px-2 py-1 text-lg font-bold focus:ring-[#FF6B6B] focus:border-[#FF6B6B]"
                                                autoFocus
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit(); }}
                                            />
                                            <button onClick={handleSaveEdit} className="p-1 text-green-500 hover:bg-green-100 rounded-full"><CheckIcon /></button>
                                            <button onClick={handleCancelEdit} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><XIcon /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-lg text-slate-800 group-hover:text-[#FF6B6B] transition-colors truncate">{project.title}</h4>
                                            <button onClick={(e) => { e.stopPropagation(); handleStartEdit(project, 'title'); }} className="p-1 text-slate-400 hover:text-[#FF6B6B] opacity-0 group-hover:opacity-100 transition-opacity">
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleOpenSuggestModal(project); }} className="p-1 text-slate-400 hover:text-[#FF6B6B] opacity-0 group-hover:opacity-100 transition-opacity" title="AI 建議新標題">
                                                <SparklesIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                    <p className="text-sm mt-1 text-slate-500 line-clamp-2 h-10">{project.conceptionSummary.what || '尚無摘要。'}</p>
                                </div>
                                <div className="flex items-center ml-4">
                                     <button onClick={() => onDeleteProject(project.id)} className="p-2 ml-2 text-slate-400 hover:text-red-500 rounded-full transition-colors">
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4">
                                <ProjectStatus proposal={project} />
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                                {editingState.id === project.id && editingState.field === 'dueDate' ? (
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon className="w-5 h-5 text-slate-400" />
                                        <input
                                            type="date"
                                            value={editingInputValue}
                                            onChange={(e) => setEditingInputValue(e.target.value)}
                                            className="flex-grow bg-white border border-slate-300 rounded-md px-2 py-1 text-sm focus:ring-[#FF6B6B] focus:border-[#FF6B6B]"
                                            autoFocus
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit(); }}
                                        />
                                        <button onClick={handleSaveEdit} className="p-1 text-green-500 hover:bg-green-100 rounded-full"><CheckIcon /></button>
                                        <button onClick={handleCancelEdit} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><XIcon /></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className={`flex items-center text-sm ${getDateStatus(project.dueDate).color}`}>
                                            <CalendarIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                                            <span>{getDateStatus(project.dueDate).text}</span>
                                        </div>
                                        <button onClick={() => handleStartEdit(project, 'dueDate')} className="text-xs font-semibold text-slate-500 hover:text-[#FF6B6B] flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                                            <PencilIcon className="w-3.5 h-3.5 mr-1"/> {project.dueDate ? '變更' : '設定'}
                                        </button>
                                    </div>
                                )}
                                {editingState.id === project.id && editingState.field === 'tags' ? (
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="text"
                                            value={editingInputValue}
                                            onChange={(e) => setEditingInputValue(e.target.value)}
                                            placeholder="輸入關鍵詞，以逗號分隔"
                                            className="flex-grow bg-white border border-slate-300 rounded-md px-2 py-1 text-sm focus:ring-[#FF6B6B] focus:border-[#FF6B6B]"
                                            autoFocus
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') handleCancelEdit(); }}
                                        />
                                        <button onClick={handleSaveEdit} className="p-1 text-green-500 hover:bg-green-100 rounded-full"><CheckIcon /></button>
                                        <button onClick={handleCancelEdit} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><XIcon /></button>
                                    </div>
                                ) : (
                                     <div className="flex items-center justify-between">
                                        <div className="flex items-center flex-wrap gap-2">
                                            <span className="text-xs font-semibold text-slate-500 mr-2">關鍵詞:</span>
                                            {(project.aiTags && project.aiTags.length > 0) ? project.aiTags.map(tag => (
                                                <span key={tag} className="px-2 py-0.5 text-xs font-medium text-red-800 bg-red-100 rounded-full">{tag}</span>
                                            )) : <span className="text-xs text-slate-400 italic">No tags</span>}
                                        </div>
                                        <button onClick={() => handleStartEdit(project, 'tags')} className="text-xs font-semibold text-slate-500 hover:text-[#FF6B6B] flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                                            <PencilIcon className="w-3.5 h-3.5 mr-1"/> 編輯
                                        </button>
                                     </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="text-center py-24 px-6 border-2 border-dashed border-slate-200">
                    <DocumentPlusIcon />
                    <h3 className="mt-4 text-xl font-bold text-slate-800">
                        {allProjects.length > 0 ? '找不到相符的計畫' : '開始您的第一個補助計畫'}
                    </h3>
                    <p className="mt-2 text-md text-slate-500">
                        {allProjects.length > 0 ? '請嘗試調整您的搜尋關鍵字。' : '點擊按鈕以建立新計畫。'}
                    </p>
                </Card>
            )}
             {isCreateModalOpen && (
                <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="新增計畫案">
                    {createModalStep === 'input' && (
                        <>
                            <p className="text-slate-600 mb-4 text-sm">請簡單描述您的計畫構想，AI 將為您建議多個具吸引力的標題。</p>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="idea-input" className="block text-sm font-medium text-slate-700 mb-1">初步構想</label>
                                    <textarea
                                        id="idea-input"
                                        value={ideaInput}
                                        onChange={(e) => setIdeaInput(e.target.value)}
                                        rows={3}
                                        className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]"
                                        placeholder="例如：「為我的咖啡店開發一套結合會員系統的智慧點餐 APP」"
                                    />
                                </div>
                                <FileUpload 
                                    onFilesChanged={setUploadedFiles}
                                    accept="image/*,.txt,.md,.pdf,.docx,.pptx"
                                />
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-2xl hover:bg-slate-200">取消</button>
                                <button onClick={handleSuggestTitlesForNewProject} disabled={isSuggesting} className="px-4 py-2 text-sm font-semibold text-white bg-[#FF6B6B] rounded-2xl shadow-sm hover:bg-[#fa5a5a] disabled:bg-[#fab4b4] flex items-center">
                                    {isSuggesting && <Spinner />}
                                    {isSuggesting ? '建議中...' : 'AI 建議標題'}
                                </button>
                            </div>
                        </>
                    )}
                    {createModalStep === 'selection' && (
                        <>
                            <p className="text-slate-600 mb-4 text-sm">AI 已為您建議以下標題，請選擇一個最適合的：</p>
                            <div className="space-y-2 my-4 max-h-60 overflow-y-auto pr-2">
                                {newProjectSuggestedTitles.map((title, index) => (
                                    <label key={index} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${selectedNewProjectTitle === title ? 'bg-red-50 border-[#FF6B6B] ring-2 ring-red-100' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                                        <input 
                                            type="radio"
                                            name="suggestedTitle"
                                            value={title}
                                            checked={selectedNewProjectTitle === title}
                                            onChange={() => setSelectedNewProjectTitle(title)}
                                            className="h-4 w-4 text-[#FF6B6B] focus:ring-[#FF6B6B] border-gray-300"
                                        />
                                        <span className="ml-3 text-sm font-medium text-slate-800">{title}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="mt-6 flex justify-between items-center">
                                <button onClick={() => setCreateModalStep('input')} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-2xl hover:bg-slate-200">
                                    返回修改
                                </button>
                                <button onClick={handleCreateProjectFromSelection} disabled={!selectedNewProjectTitle} className="px-4 py-2 text-sm font-semibold text-white bg-[#FF6B6B] rounded-2xl shadow-sm hover:bg-[#fa5a5a] disabled:bg-[#fab4b4]">
                                    用此標題建立計畫
                                </button>
                            </div>
                        </>
                    )}
                </Modal>
            )}
            {isTitleModalOpen && (
                <Modal isOpen={isTitleModalOpen} onClose={handleCloseSuggestModal} title={`為「${projectForSuggestions?.title}」建議新標題`}>
                    {isSuggestingTitles ? (
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
                                <button onClick={handleCloseSuggestModal} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-2xl hover:bg-slate-200">
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


// --- ICONS & SPINNER ---
const Spinner = () => ( <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> );
const DocumentPlusIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mx-auto h-12 w-12 text-slate-300"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3h-6m-1.5-6H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9Z" /></svg> );
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09.921-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>);
const SearchIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-slate-400"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>);
const PlusIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2 -ml-1"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg> );
const PencilIcon = ({className = 'w-3.5 h-3.5'}: {className?: string}) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>);
const CheckIcon = ({className = 'w-5 h-5'}: {className?: string}) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>);
const XIcon = ({className = 'w-5 h-5'}: {className?: string}) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>);
const CalendarIcon = ({className = 'w-5 h-5'}: {className?: string}) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0h18" /></svg>);
const SparklesIcon = ({className = 'w-4 h-4'}: {className?: string}) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg> );

export default StageManagement;