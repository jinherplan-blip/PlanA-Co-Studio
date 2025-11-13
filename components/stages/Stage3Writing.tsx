import React, { useState, useEffect, useRef } from 'react';
import { Proposal, Chapter, AITone, LLMProvider, DataSupportResult, ChapterHistory, Citation, UploadedFile } from '../../types';
import Card from '../ui/Card';
import { 
    generateChapterContent, 
    refineChapterContent, 
    fetchDataSupport,
    parseOutlineAndSuggestChapters,
} from '../../services/geminiService';
import { useNotification } from '../../contexts/NotificationProvider';
import Modal from '../ui/Modal';
import FileUpload from '../ui/FileUpload';


interface Stage3Props {
  proposal: Proposal;
  setProposal: React.Dispatch<React.SetStateAction<Proposal>>;
  aiTone: AITone;
  setAiTone: (tone: AITone) => void;
  llmProvider: LLMProvider;
}

const CHAPTER_TEMPLATES = [
    { key: 'background', name: '計畫背景與目的' },
    { key: 'innovation', name: '創新性' },
    { key: 'kpi', name: '目標與KPI' },
    { key: 'tech', name: '技術可行性' },
    { key: 'market', name: '市場分析' },
    { key: 'execution', name: '執行方法' },
    { key: 'budget', name: '預算與資源配置' },
    { key: 'risk', name: '風險與因應策略' },
    { key: 'esg', name: 'ESG與永續/淨零' },
];

const DataTable: React.FC<{ data: Record<string, string>[] }> = ({ data }) => {
    if (!data || data.length === 0) {
        return <p className="text-gray-500 italic px-4 py-4">AI 未能生成表格資料。</p>;
    }
    const headers = Object.keys(data[0]);
    return (
        <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full bg-white">
                <thead className="bg-slate-50">
                    <tr>
                        {headers.map(header => (
                            <th key={header} className="text-left text-sm font-semibold text-slate-600 px-4 py-2 border-b">{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-slate-50">
                            {headers.map(header => (
                                <td key={`${rowIndex}-${header}`} className="text-sm text-slate-700 px-4 py-2 border-b">{row[header]}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


const Stage3Writing: React.FC<Stage3Props> = ({ proposal, setProposal, aiTone, setAiTone, llmProvider }) => {
  const [activeChapterId, setActiveChapterId] = useState<string | null>(proposal.chapters[0]?.id || null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<'generate' | 'refine' | null>(null);
  const { showNotification } = useNotification();
  
  const [isAddChapterModalOpen, setIsAddChapterModalOpen] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('');
  
  const [editingChapter, setEditingChapter] = useState<{ id: string; title: string } | null>(null);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  const [isDataSupportModalOpen, setIsDataSupportModalOpen] = useState(false);
  const [dataSupportTopic, setDataSupportTopic] = useState('');
  const [dataSupportResult, setDataSupportResult] = useState<DataSupportResult | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(false);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<ChapterHistory | null>(null);
  
  // State for citations
  const [selectionRange, setSelectionRange] = useState<{ start: number, end: number} | null>(null);
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [citationSourceName, setCitationSourceName] = useState('');
  const [citationUrl, setCitationUrl] = useState('');

  // States for outline upload
  const [isOutlineModalOpen, setIsOutlineModalOpen] = useState(false);
  const [outlineModalStep, setOutlineModalStep] = useState<'upload' | 'preview' | 'loading'>('upload');
  const [outlineFiles, setOutlineFiles] = useState<UploadedFile[]>([]);
  const [parsedChapters, setParsedChapters] = useState<{title: string, templateKey: string}[]>([]);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const activeChapter = proposal.chapters.find(c => c.id === activeChapterId);

  // Local state for responsive text editing
  const [localContent, setLocalContent] = useState(activeChapter?.content || '');
  const [localUserInput, setLocalUserInput] = useState(activeChapter?.userInput || '');
  const [localCitations, setLocalCitations] = useState<Citation[]>(activeChapter?.citations || []);
  const debounceSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // When active chapter changes, update local state
  useEffect(() => {
    setLocalContent(activeChapter?.content || '');
    setLocalUserInput(activeChapter?.userInput || '');
    setLocalCitations(activeChapter?.citations || []);
    setSaveStatus('idle'); // Reset save status when chapter changes
  }, [activeChapter]);

  // Debounced save effect
  useEffect(() => {
    const isUnchanged = !activeChapter || (
        localContent === activeChapter.content &&
        localUserInput === activeChapter.userInput &&
        JSON.stringify(localCitations) === JSON.stringify(activeChapter.citations || [])
    );
    if (isUnchanged) {
        return;
    }

    setSaveStatus('saving');

    if (debounceSaveRef.current) {
        clearTimeout(debounceSaveRef.current);
    }

    debounceSaveRef.current = setTimeout(() => {
        if (!activeChapter) return;

        setProposal(prev => {
            const updatedChapters = prev.chapters.map(ch => {
                if (ch.id === activeChapter.id) {
                    const newHistoryEntry: ChapterHistory = {
                        timestamp: new Date().toISOString(),
                        userInput: localUserInput,
                        content: localContent,
                        citations: localCitations,
                    };
                    const existingHistory = ch.history || [];
                    const lastEntry = existingHistory[existingHistory.length - 1];
                    
                    if (lastEntry && lastEntry.userInput === newHistoryEntry.userInput && lastEntry.content === newHistoryEntry.content) {
                        return { ...ch, userInput: localUserInput, content: localContent, citations: localCitations };
                    }

                    return {
                        ...ch,
                        userInput: localUserInput,
                        content: localContent,
                        citations: localCitations,
                        history: [...existingHistory, newHistoryEntry],
                    };
                }
                return ch;
            });
            return { ...prev, chapters: updatedChapters };
        });
        
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1500); // Save after 1.5s of inactivity

    return () => {
        if (debounceSaveRef.current) clearTimeout(debounceSaveRef.current);
    };
  }, [localContent, localUserInput, localCitations, activeChapter, setProposal]);
  
  useEffect(() => {
    if (proposal.chapters.length > 0 && !proposal.chapters.find(c => c.id === activeChapterId)) {
        setActiveChapterId(proposal.chapters[0].id);
    } else if (proposal.chapters.length === 0) {
        setActiveChapterId(null);
    }
  }, [proposal.chapters, activeChapterId]);
  
  useEffect(() => {
    if (activeChapter && activeChapter.content === 'AI 生成中...' && activeChapter.templateKey) {
        handleGenerateContent();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChapter]);
  
  useEffect(() => {
    const template = CHAPTER_TEMPLATES.find(t => t.key === selectedTemplateKey);
    if (template) {
      setNewChapterTitle(template.name);
    }
  }, [selectedTemplateKey]);

  const updateChapterTitle = (chapterId: string, title: string) => {
    setProposal(prev => ({
      ...prev,
      chapters: prev.chapters.map(ch => ch.id === chapterId ? { ...ch, title } : ch)
    }));
  };
  
  const handleGenerateContent = async () => {
    if (!activeChapter) return;
    
    setIsLoading(true);
    setLoadingAction('generate');
    setLocalContent('AI 正在生成內容...');
    try {
        const generatedContent = await generateChapterContent(proposal, activeChapter.title, aiTone, localUserInput, activeChapter.templateKey);
        setLocalContent(generatedContent);
        showNotification(`AI 已為您生成章節「${activeChapter.title}」的內容`, 'success');
    } catch(error: any) {
        showNotification(error.message || "AI 內容生成失敗，請稍後再試。", 'error');
        setLocalContent('生成失敗，請重試。');
    } finally {
        setIsLoading(false);
        setLoadingAction(null);
    }
  };
  
  const handleRefineContent = async () => {
    if (!activeChapter || !localContent) {
        showNotification('請先生成或填寫一些內容才能進行精修。', 'info');
        return;
    };
    setIsLoading(true);
    setLoadingAction('refine');
    const originalContent = localContent;
    setLocalContent("AI 正在精修內容...");
    try {
        const refinedContent = await refineChapterContent(activeChapter.title, originalContent, aiTone);
        setLocalContent(refinedContent);
        showNotification(`AI 已為您精修章節「${activeChapter.title}」`, 'success');
    } catch(error: any) {
        showNotification(error.message || "AI 內容精修失敗，請稍後再試。", 'error');
        setLocalContent(originalContent);
    } finally {
        setIsLoading(false);
        setLoadingAction(null);
    }
  };

  const handleStartEdit = (chapter: Chapter) => {
    setEditingChapter({ id: chapter.id, title: chapter.title });
  };
  
  const handleCancelEdit = () => {
    setEditingChapter(null);
  };
  
  const handleSaveEdit = () => {
    if (editingChapter) {
        if (!editingChapter.title.trim()) {
            showNotification('章節標題不能為空。', 'warning');
            return;
        }
        updateChapterTitle(editingChapter.id, editingChapter.title.trim());
        setEditingChapter(null);
    }
  };
  
  const handleDeleteChapter = (chapterId: string) => {
    if (window.confirm(`您確定要刪除章節「${proposal.chapters.find(c=>c.id === chapterId)?.title}」嗎？`)) {
        const deletedIndex = proposal.chapters.findIndex(c => c.id === chapterId);
        const updatedChapters = proposal.chapters.filter(c => c.id !== chapterId);

        setProposal(prev => ({
            ...prev,
            chapters: updatedChapters,
        }));

        if (activeChapterId === chapterId) {
            if (updatedChapters.length > 0) {
                const newActiveIndex = Math.max(0, deletedIndex - 1);
                setActiveChapterId(updatedChapters[newActiveIndex].id);
            } else {
                setActiveChapterId(null);
            }
        }
    }
  };
  
  const handleConfirmAddChapter = () => {
    if (!newChapterTitle.trim()) {
        showNotification('章節標題不能為空。', 'warning');
        return;
    }
    const newChapter: Chapter = {
        id: `chap-${Date.now()}`,
        title: newChapterTitle.trim(),
        userInput: '',
        content: selectedTemplateKey ? 'AI 生成中...' : '',
        templateKey: selectedTemplateKey || undefined,
        history: [],
        citations: [],
    };

    const updatedChapters = [...proposal.chapters, newChapter];

    setProposal(prev => ({
        ...prev,
        chapters: updatedChapters,
    }));
    
    setActiveChapterId(newChapter.id);

    setIsAddChapterModalOpen(false);
    setNewChapterTitle('');
    setSelectedTemplateKey('');
  };

  const handleCopyContent = async () => {
    if (!localContent) {
        showNotification('目前沒有內容可以複製。', 'info');
        return;
    }
    try {
        await navigator.clipboard.writeText(localContent);
        showNotification(`已複製章節「${activeChapter?.title}」的內容！`, 'success');
    } catch (err) {
        showNotification('複製失敗，您的瀏覽器可能不支援此功能。', 'error');
    }
  };

  const handleFetchDataSupport = async () => {
    if (!dataSupportTopic.trim()) {
        showNotification('請輸入您想查找資料的主題。', 'warning');
        return;
    }
    setIsFetchingData(true);
    setDataSupportResult(null);
    try {
        const result = await fetchDataSupport(dataSupportTopic, proposal, aiTone);
        if (result) {
            setDataSupportResult(result);
        } else {
            showNotification('AI 未能找到相關資料或回傳格式錯誤。', 'warning');
        }
    } catch (error: any) {
        showNotification(error.message || '查找資料時發生錯誤。', 'error');
    } finally {
        setIsFetchingData(false);
    }
  };
  
  const handleRevert = (historyEntryToRevertTo: ChapterHistory) => {
    if (!activeChapter) return;

    const currentStateEntry: ChapterHistory = {
        timestamp: new Date().toISOString(),
        userInput: localUserInput,
        content: localContent,
        citations: localCitations,
    };
    
    setProposal(prev => {
        const updatedChapters = prev.chapters.map(ch => {
            if (ch.id === activeChapter.id) {
                const currentHistory = ch.history || [];
                const lastEntry = currentHistory[currentHistory.length - 1];
                let historyWithCurrentState = currentHistory;

                if (!lastEntry || lastEntry.content !== currentStateEntry.content || lastEntry.userInput !== currentStateEntry.userInput) {
                    historyWithCurrentState = [...currentHistory, currentStateEntry];
                }

                return {
                    ...ch,
                    userInput: historyEntryToRevertTo.userInput,
                    content: historyEntryToRevertTo.content,
                    citations: historyEntryToRevertTo.citations || [],
                    history: historyWithCurrentState
                };
            }
            return ch;
        });
        return { ...prev, chapters: updatedChapters };
    });
    
    setIsHistoryModalOpen(false);
    setSelectedHistoryEntry(null);
    showNotification('已還原至指定版本。', 'success');
  };
  
  const handleTextSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const { selectionStart, selectionEnd } = e.currentTarget;
    if (selectionEnd > selectionStart) {
        setSelectionRange({ start: selectionStart, end: selectionEnd });
    } else {
        setSelectionRange(null);
    }
  };
  
  const handleConfirmAddCitation = () => {
    if (!selectionRange || !citationSourceName.trim()) {
        showNotification('請至少填寫來源名稱。', 'warning');
        return;
    }

    const currentCitations = localCitations || [];
    const nextKey = `[${currentCitations.length + 1}]`;
    const newCitation: Citation = {
        key: nextKey,
        sourceName: citationSourceName.trim(),
        url: citationUrl.trim(),
    };

    const updatedCitations = [...currentCitations, newCitation];
    
    const { end } = selectionRange;
    let contentWithMarker = localContent.slice(0, end) + newCitation.key + localContent.slice(end);

    const contentBody = contentWithMarker.split('\n\n--- 資料引用清單 ---')[0].trim();
    const referenceListString = updatedCitations.map(c => `${c.key} ${c.sourceName}` + (c.url ? `: ${c.url}`: '')).join('\n');
    const finalContent = `${contentBody}\n\n--- 資料引用清單 ---\n${referenceListString}`;

    setLocalContent(finalContent);
    setLocalCitations(updatedCitations);

    setIsCitationModalOpen(false);
    setCitationSourceName('');
    setCitationUrl('');
    setSelectionRange(null);
    showNotification('引用已新增', 'success');
  };

  const resetOutlineModal = () => {
    setOutlineFiles([]);
    setParsedChapters([]);
    setOutlineModalStep('upload');
  };

  const handleUploadOutline = async () => {
    if (outlineFiles.length === 0) {
        showNotification('請先上傳一個大綱檔案。', 'warning');
        return;
    }
    setOutlineModalStep('loading');
    try {
        const result = await parseOutlineAndSuggestChapters(outlineFiles[0], aiTone);
        if (result && result.length > 0) {
            setParsedChapters(result);
            setOutlineModalStep('preview');
        } else {
            showNotification('AI 無法從檔案中解析出章節大綱。', 'error');
            setOutlineModalStep('upload');
        }
    } catch (error) {
        showNotification('分析大綱時發生錯誤。', 'error');
        setOutlineModalStep('upload');
    }
  };

  const handleConfirmOutline = () => {
    const newChapters: Chapter[] = parsedChapters.map((pc, index) => ({
        id: `chap-${Date.now()}-${index}`,
        title: pc.title,
        userInput: `此章節根據上傳的大綱「${pc.title}」自動建立。`,
        content: 'AI 生成中...',
        templateKey: pc.templateKey || undefined,
        history: [],
        citations: [],
    }));

    setProposal(prev => ({
        ...prev,
        chapters: [...prev.chapters, ...newChapters],
    }));

    if (newChapters.length > 0) {
      setActiveChapterId(newChapters[0].id);
    }
    setIsOutlineModalOpen(false);
    resetOutlineModal();
    showNotification(`已根據大綱成功建立 ${newChapters.length} 個章節！`, 'success');
  };

  const handleGenerateAllChapters = async () => {
    const chaptersToGenerate = proposal.chapters.filter(c => !c.content || c.content === 'AI 生成中...');
    if (chaptersToGenerate.length === 0) {
        showNotification('所有章節都已有內容。', 'info');
        return;
    }
    setIsGeneratingAll(true);
    showNotification(`AI 已開始為 ${chaptersToGenerate.length} 個章節生成草稿...`, 'info');

    let failedCount = 0;

    for (const chapter of chaptersToGenerate) {
        try {
            setActiveChapterId(chapter.id);
            setLocalContent('AI 正在生成內容...');
            
            const generatedContent = await generateChapterContent(proposal, chapter.title, aiTone, chapter.userInput, chapter.templateKey);
            
            setProposal(prev => {
                const updatedChapters = prev.chapters.map(c => c.id === chapter.id ? { ...c, content: generatedContent } : c);
                return {...prev, chapters: updatedChapters};
            });
            
            await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
            failedCount++;
            console.error(`Failed to generate content for chapter: ${chapter.title}`, error);
             setProposal(prev => {
                const updatedChapters = prev.chapters.map(c => c.id === chapter.id ? { ...c, content: `為「${chapter.title}」生成內容時發生錯誤，請稍後重試。` } : c);
                return {...prev, chapters: updatedChapters};
             });
        }
    }
    
    setIsGeneratingAll(false);
    if (failedCount > 0) {
        showNotification(`${chaptersToGenerate.length - failedCount} 個章節生成成功，${failedCount} 個失敗。`, 'warning');
    } else {
        showNotification('已成功為所有章節生成草稿！', 'success');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-wrap justify-between items-center gap-4">
            <p className="text-slate-600 flex-1 min-w-[300px]">AI 正式撰寫助手 ✍️：AI 將根據前期構思與資料分析自動生成章節內容，並可即時精修與比對依據。</p>
            <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-600">AI 寫作風格:</span>
                    <div className="flex gap-1 p-1 bg-slate-200 rounded-full">
                        {Object.values(AITone).map(tone => (
                            <button
                                key={tone}
                                onClick={() => setAiTone(tone)}
                                className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${
                                    aiTone === tone ? 'bg-[#FF6B6B] text-white shadow' : 'text-slate-700 hover:bg-white/60'
                                }`}
                            >
                                {tone}
                            </button>
                        ))}
                    </div>
                </div>
                 <button
                    onClick={handleGenerateAllChapters}
                    disabled={isGeneratingAll || proposal.chapters.every(c => c.content && c.content !== 'AI 生成中...')}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                    {isGeneratingAll ? <Spinner small /> : <MagicWandIcon />}
                    {isGeneratingAll ? '生成中...' : '一鍵生成全章節草稿'}
                </button>
            </div>
        </div>
      
        <div className="border-b border-slate-200">
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                {proposal.chapters.map((chapter) => (
                    <div
                        key={chapter.id}
                        className={`group relative flex items-center justify-between whitespace-nowrap px-3 py-2 rounded-md font-semibold text-sm focus:outline-none transition-colors border-2 ${
                            chapter.id === activeChapterId
                                ? 'bg-red-50 border-[#FF6B6B] text-red-800'
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                       {editingChapter?.id === chapter.id ? (
                            <input
                                type="text"
                                value={editingChapter.title}
                                onChange={(e) => setEditingChapter({...editingChapter, title: e.target.value})}
                                onBlur={handleSaveEdit}
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter') handleSaveEdit();
                                    if(e.key === 'Escape') handleCancelEdit();
                                }}
                                className="bg-white border border-[#FF6B6B] rounded-md px-1 py-0.5 -ml-1 text-sm font-semibold focus:outline-none"
                                autoFocus
                            />
                       ) : (
                        <button onClick={() => setActiveChapterId(chapter.id)} className="flex-grow text-left pr-6">
                            {chapter.title}
                        </button>
                       )}
                       <div className="absolute right-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {!editingChapter || editingChapter.id !== chapter.id ? (
                            <button onClick={() => handleStartEdit(chapter)} className="p-1 text-slate-500 hover:text-[#FF6B6B] rounded-full hover:bg-slate-200"><PencilIcon className="w-4 h-4"/></button>
                          ): null}
                          <button onClick={() => handleDeleteChapter(chapter.id)} className="p-1 text-slate-500 hover:text-red-600 rounded-full hover:bg-slate-200"><TrashIcon className="w-4 h-4"/></button>
                       </div>
                    </div>
                ))}
                <button
                    onClick={() => setIsAddChapterModalOpen(true)}
                    className="flex-shrink-0 flex items-center whitespace-nowrap p-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-[#FF6B6B] font-semibold text-sm focus:outline-none transition-colors"
                >
                    <PlusCircleIcon className="w-5 h-5 mr-1" />
                    新增章節
                </button>
            </div>
        </div>

        {activeChapter ? (
            <Card className="space-y-4">
                <div>
                    <h4 className="text-lg font-semibold text-[#2C2C2C] mb-2">1. 我的想法或草稿</h4>
                     <textarea
                        value={localUserInput}
                        onChange={(e) => setLocalUserInput(e.target.value)}
                        rows={6}
                        className="w-full p-3 border border-[#E5E5E5] rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] bg-white"
                        placeholder="在此輸入您對本章節的想法、重點、草稿或 bullet points..."
                    />
                </div>

                <div className="flex justify-center items-center gap-4 py-2">
                    <div className="h-px bg-slate-200 flex-grow"></div>
                    <button 
                        onClick={handleGenerateContent} 
                        disabled={isLoading || !localUserInput} 
                        className="bg-[#FF6B6B] text-white font-semibold py-2 px-4 rounded-2xl shadow-sm hover:bg-[#fa5a5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B6B] disabled:bg-slate-300 flex items-center gap-2 transition"
                    >
                        {loadingAction === 'generate' ? <Spinner/> : <ArrowDownIcon />}
                        {loadingAction === 'generate' ? '生成中...' : 'AI 內容生成'}
                    </button>
                     <div className="h-px bg-slate-200 flex-grow"></div>
                </div>

                <div className="relative">
                    <h4 className="text-lg font-semibold text-[#2C2C2C] mb-2">2. AI 生成與編輯區</h4>
                    {selectionRange && (
                        <button
                            onClick={() => setIsCitationModalOpen(true)}
                            className="absolute top-0 right-0 z-10 mt-1 mr-1 bg-black/70 text-white text-xs font-bold py-1 px-2 rounded-md hover:bg-black flex items-center gap-1 transition-all animate-fade-in-fast"
                        >
                            <CitationIcon /> 新增引用
                        </button>
                    )}
                    <textarea
                      value={localContent}
                      onSelect={handleTextSelect}
                      onChange={(e) => setLocalContent(e.target.value)}
                      rows={12}
                      className="w-full p-3 border border-[#E5E5E5] rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] bg-white"
                      placeholder="點擊上方按鈕，AI 將在此生成內容..."
                    />
                </div>

                 <div className="flex flex-wrap gap-3 justify-between items-center mt-4 border-t pt-4">
                    <div className="flex gap-3">
                        <button onClick={handleRefineContent} disabled={isLoading} className="bg-[#FF6B6B] text-white font-semibold py-2 px-4 rounded-2xl shadow-sm hover:bg-[#fa5a5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B6B] disabled:bg-slate-300 flex items-center gap-2 transition">
                            {loadingAction === 'refine' ? <Spinner/> : <EditIcon />}
                            {loadingAction === 'refine' ? 'AI 編輯中...' : 'AI 共編模式'}
                        </button>
                        <button onClick={() => setIsDataSupportModalOpen(true)} disabled={isLoading} className="bg-slate-200 text-slate-800 font-medium py-2 px-4 rounded-2xl hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 flex items-center gap-2 transition">
                           <DatabaseIcon /> AI 資料佐證
                        </button>
                        <button onClick={() => setIsHistoryModalOpen(true)} disabled={isLoading} className="bg-slate-200 text-slate-800 font-medium py-2 px-4 rounded-2xl hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 flex items-center gap-2 transition">
                           <HistoryIcon /> 版本紀錄
                        </button>
                    </div>
                     <div className="flex items-center gap-4">
                        <div className="text-sm text-slate-500 transition-opacity duration-300 h-5">
                            {saveStatus === 'saving' && (
                                <span className="flex items-center gap-1 animate-fade-in-fast">
                                    <Spinner small /> 儲存中...
                                </span>
                            )}
                            {saveStatus === 'saved' && (
                                <span className="flex items-center gap-1 text-green-600 animate-fade-in-fast">
                                    <CheckCircleIcon /> 已儲存
                                </span>
                            )}
                        </div>
                        <button onClick={handleCopyContent} className="bg-slate-200 text-slate-800 font-medium py-2 px-4 rounded-2xl hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 flex items-center gap-2 transition">
                           <ClipboardIcon /> 複製內文
                        </button>
                    </div>
                </div>
            </Card>
        ) : (
            <Card className="text-center py-12 px-6 border-2 border-dashed rounded-lg">
                <DocumentPlusIcon />
                <h3 className="text-xl font-semibold text-slate-700 mt-4">計畫書尚無章節</h3>
                <p className="text-slate-500 mt-2 mb-6">請新增章節或上傳計畫大綱，來開始您的計畫書撰寫。</p>
                <div className="flex justify-center gap-4">
                     <button
                        onClick={() => setIsAddChapterModalOpen(true)}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded-full shadow-sm hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition"
                    >
                        <PlusCircleIcon className="w-5 h-5 mr-2" />
                        新增章節
                    </button>
                     <button
                        onClick={() => setIsOutlineModalOpen(true)}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-[#FF6B6B] border border-transparent rounded-full shadow-sm hover:bg-[#fa5a5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B6B] transition"
                    >
                       <UploadIcon className="w-5 h-5 mr-2" />
                        上傳計畫書大綱
                    </button>
                </div>
            </Card>
        )}
        
        {isAddChapterModalOpen && (
            <Modal isOpen={isAddChapterModalOpen} onClose={() => setIsAddChapterModalOpen(false)} title="新增章節">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="chapter-title" className="block text-sm font-medium text-slate-700 mb-1">章節標題</label>
                        <input id="chapter-title" type="text" value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]" placeholder="例如：智慧財產權佈局" />
                    </div>
                    <div>
                        <label htmlFor="chapter-template" className="block text-sm font-medium text-slate-700 mb-1">選用範本 (選填)</label>
                        <select id="chapter-template" value={selectedTemplateKey} onChange={(e) => setSelectedTemplateKey(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] bg-white">
                            <option value="">從空白開始</option>
                            {CHAPTER_TEMPLATES.map(template => (
                                <option key={template.key} value={template.key}>{template.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">選用範本後，AI 將自動為您生成內容草稿。</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={() => setIsAddChapterModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-2xl hover:bg-slate-200">取消</button>
                    <button onClick={handleConfirmAddChapter} disabled={!newChapterTitle.trim() || isLoading} className="px-4 py-2 text-sm font-semibold text-white bg-[#FF6B6B] rounded-2xl shadow-sm hover:bg-[#fa5a5a] disabled:bg-[#fab4b4]">
                        新增章節
                    </button>
                </div>
            </Modal>
        )}

        {isCitationModalOpen && (
            <Modal isOpen={isCitationModalOpen} onClose={() => setIsCitationModalOpen(false)} title="新增引用來源">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="citation-source" className="block text-sm font-medium text-slate-700 mb-1">來源名稱</label>
                        <input id="citation-source" type="text" value={citationSourceName} onChange={(e) => setCitationSourceName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]" placeholder="例如：經濟部統計處" />
                    </div>
                    <div>
                        <label htmlFor="citation-url" className="block text-sm font-medium text-slate-700 mb-1">來源網址 (選填)</label>
                        <input id="citation-url" type="text" value={citationUrl} onChange={(e) => setCitationUrl(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]" placeholder="https://..." />
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={handleConfirmAddCitation} className="px-4 py-2 text-sm font-semibold text-white bg-[#FF6B6B] rounded-2xl shadow-sm hover:bg-[#fa5a5a]">
                        新增引用
                    </button>
                </div>
            </Modal>
        )}

        {isDataSupportModalOpen && (
            <Modal isOpen={isDataSupportModalOpen} onClose={() => {
                setIsDataSupportModalOpen(false);
                setDataSupportResult(null);
                setDataSupportTopic('');
            }} title="AI 資料佐證">
                <div className="space-y-4">
                    {!dataSupportResult && !isFetchingData ? (
                        <>
                            <div>
                                <label htmlFor="data-support-topic" className="block text-sm font-medium text-slate-700 mb-1">
                                    您想用什麼數據來支持您的論點？
                                </label>
                                <textarea
                                    id="data-support-topic"
                                    value={dataSupportTopic}
                                    onChange={(e) => setDataSupportTopic(e.target.value)}
                                    rows={3}
                                    className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]"
                                    placeholder="例如：「台灣AI產業發展現況」、「製造業能源使用統計」、「銀髮族線上購物市場規模」"
                                />
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button onClick={handleFetchDataSupport} disabled={isFetchingData} className="px-4 py-2 text-sm font-semibold text-white bg-[#FF6B6B] rounded-2xl shadow-sm hover:bg-[#fa5a5a] disabled:bg-[#fab4b4] flex items-center gap-2">
                                    <SearchIcon />
                                    AI 搜尋與生成
                                </button>
                            </div>
                        </>
                    ) : isFetchingData ? (
                        <div className="flex justify-center items-center py-10">
                            <Spinner />
                            <span className="ml-2 text-slate-600">AI 搜尋資料中...</span>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            <h4 className="font-semibold text-slate-800">📊 統計摘要表</h4>
                            <DataTable data={dataSupportResult!.summaryTable} />

                            <h4 className="font-semibold text-slate-800 mt-4">🧩 內文補充段落 (含引用)</h4>
                            <div className="p-3 bg-slate-50 border rounded-md text-sm text-slate-700 whitespace-pre-wrap">
                                {dataSupportResult!.supplementaryParagraph}
                            </div>

                            <h4 className="font-semibold text-slate-800 mt-4">📚 資料引用清單</h4>
                            <div className="p-3 bg-slate-50 border rounded-md text-sm text-slate-700 whitespace-pre-wrap">
                                {dataSupportResult!.referenceList}
                            </div>
                        </div>
                    )}
                </div>
                {dataSupportResult && (
                    <div className="mt-6 pt-4 border-t flex justify-end gap-3">
                         <button
                            onClick={() => {
                                if (!activeChapter) return;
                                const newContent = `${localContent}\n\n${dataSupportResult.supplementaryParagraph}\n\n---\n\n### 資料引用清單\n${dataSupportResult.referenceList}`;
                                setLocalContent(newContent.trim());
                                showNotification('內容已附加至編輯區。', 'success');
                                setIsDataSupportModalOpen(false);
                                setDataSupportResult(null);
                                setDataSupportTopic('');
                            }}
                            className="px-4 py-2 text-sm font-semibold text-white bg-[#FF6B6B] rounded-2xl shadow-sm hover:bg-[#fa5a5a]"
                        >
                            附加至編輯區
                        </button>
                    </div>
                )}
            </Modal>
        )}

        {isHistoryModalOpen && activeChapter && (
            <Modal
                isOpen={isHistoryModalOpen}
                onClose={() => {
                    setIsHistoryModalOpen(false);
                    setSelectedHistoryEntry(null);
                }}
                title={`「${activeChapter.title}」的版本紀錄`}
            >
                <div className="flex flex-col max-h-[80vh]">
                    <div className="flex flex-grow overflow-hidden">
                        <div className="w-1/3 border-r overflow-y-auto">
                            <ul className="p-2">
                                {(activeChapter.history || []).slice().reverse().map((entry, index) => (
                                    <li key={index}>
                                        <button 
                                            onClick={() => setSelectedHistoryEntry(entry)}
                                            className={`w-full text-left p-3 rounded-md text-sm ${selectedHistoryEntry?.timestamp === entry.timestamp ? 'bg-red-50 font-semibold' : 'hover:bg-slate-100'}`}
                                        >
                                            {new Date(entry.timestamp).toLocaleString('zh-TW')}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="w-2/3 p-6 overflow-y-auto space-y-4">
                            {selectedHistoryEntry ? (
                                <>
                                    <div>
                                        <h4 className="font-semibold text-slate-700 mb-2">我的想法或草稿</h4>
                                        <div className="p-3 bg-slate-50 border rounded-md text-sm whitespace-pre-wrap h-32 overflow-y-auto">{selectedHistoryEntry.userInput || '（無）'}</div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-700 mb-2">AI 生成與編輯區</h4>
                                        <div className="p-3 bg-slate-50 border rounded-md text-sm whitespace-pre-wrap h-64 overflow-y-auto">{selectedHistoryEntry.content}</div>
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <button onClick={() => handleRevert(selectedHistoryEntry)} className="px-4 py-2 text-sm font-semibold text-white bg-[#FF6B6B] rounded-2xl shadow-sm hover:bg-[#fa5a5a]">
                                            還原至此版本
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-500">
                                    <p>請從左側選擇一個版本以預覽。</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
        )}

        {isOutlineModalOpen && (
            <Modal isOpen={isOutlineModalOpen} onClose={resetOutlineModal} title="上傳計畫書大綱">
                {outlineModalStep === 'loading' && (
                    <div className="flex justify-center items-center p-8 gap-2 text-slate-600"><Spinner /> AI 正在分析大綱...</div>
                )}
                {outlineModalStep === 'upload' && (
                     <>
                        <p className="text-slate-600 mb-4 text-sm">上傳您的計畫書大綱文件 (e.g., .txt, .md, .pdf, .docx)，AI 將自動為您建立章節結構。</p>
                        <FileUpload onFilesChanged={setOutlineFiles} allowMultiple={false} />
                        <div className="mt-6 flex justify-end">
                            <button onClick={handleUploadOutline} disabled={outlineFiles.length === 0} className="px-4 py-2 text-sm font-semibold text-white bg-[#FF6B6B] rounded-2xl shadow-sm hover:bg-[#fa5a5a] disabled:bg-[#fab4b4] flex items-center">
                                {isLoading && <Spinner />}
                                分析檔案
                            </button>
                        </div>
                    </>
                )}
                {outlineModalStep === 'preview' && (
                    <>
                        <p className="text-slate-600 mb-4 text-sm">AI 已解析出以下章節結構，請確認是否正確：</p>
                        <div className="max-h-60 overflow-y-auto border rounded-lg p-2 bg-slate-50">
                            <ul className="list-decimal list-inside space-y-1 p-2">
                                {parsedChapters.map((pc, i) => <li key={i} className="p-1 text-slate-700">{pc.title}</li>)}
                            </ul>
                        </div>
                        <div className="mt-6 flex justify-between">
                            <button onClick={() => setOutlineModalStep('upload')} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-2xl hover:bg-slate-200">返回上傳</button>
                            <button onClick={handleConfirmOutline} className="px-4 py-2 text-sm font-semibold text-white bg-[#FF6B6B] rounded-2xl shadow-sm hover:bg-[#fa5a5a]">確認並建立章節</button>
                        </div>
                    </>
                )}
            </Modal>
        )}

    </div>
  );
};

const Spinner: React.FC<{small?: boolean}> = ({ small }) => (
    <svg className={`animate-spin ${small ? 'h-4 w-4' : 'h-5 w-5'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const ArrowDownIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" /></svg>);
const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>);
const ClipboardIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a2.25 2.25 0 0 1-2.25 2.25h-1.5a2.25 2.25 0 0 1-2.25-2.25v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>);
const DatabaseIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>);
const SearchIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>);
const HistoryIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>);
const CitationIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.122 2.122l7.81-7.81" /></svg>);
const MagicWandIcon: React.FC<{small?: boolean}> = ({small}) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={small ? 'w-4 h-4' : 'w-5 h-5 mr-2'}><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-2.25-1.328l-4.122.282.282-4.122a3 3 0 0 0 1.328-2.25l1.012-6.072a3 3 0 0 1 2.25-1.328l4.122-.282-.282 4.122a3 3 0 0 1-1.328 2.25l-1.012 6.072a3 3 0 0 0 2.25 1.328l4.122-.282-.282 4.122a3 3 0 0 0-1.328 2.25l-1.012 6.072a3 3 0 0 1-2.25 1.328l-4.122.282.282-4.122a3 3 0 0 1 1.328-2.25l1.012-6.072Zm-4.122.282-2.828-2.828m11.314 0-2.828-2.828" /></svg> );
const UploadIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);


const PlusCircleIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const DocumentPlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="mx-auto h-16 w-16 text-slate-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12.75h7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 13.5h6m-3-3v6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);


const PencilIcon: React.FC<{className?: string}> = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>);
const TrashIcon: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09.921-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>);
const CheckCircleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>);


export default Stage3Writing;