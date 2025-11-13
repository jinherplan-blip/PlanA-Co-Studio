import React, { useState, useCallback, useMemo } from 'react';
import { GrantInfo, AITone, LLMProvider, UploadedFile, GrantAnalysisReport } from '../../types';
import { fetchLatestGrants, analyzeGrantDocument } from '../../services/geminiService';
import Card from '../ui/Card';
import { useNotification } from '../../contexts/NotificationProvider';
import Modal from '../ui/Modal';
import FileUpload from '../ui/FileUpload';

interface Stage0Props {
  grants: GrantInfo[];
  setGrants: React.Dispatch<React.SetStateAction<GrantInfo[]>>;
  aiTone: AITone;
  llmProvider: LLMProvider;
  onAddGrantFromFile: (grantData: GrantAnalysisReport, fileContent: string) => void;
}

const Stage0Information: React.FC<Stage0Props> = ({ grants, setGrants, aiTone, llmProvider, onAddGrantFromFile }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(grants.length > 0);
    const { showNotification } = useNotification();
    
    // State for filters
    const [filterKeyword, setFilterKeyword] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('all');
    const [filterDeadline, setFilterDeadline] = useState('all');

    // State for upload modal
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [pastedText, setPastedText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleFetchGrants = useCallback(async () => {
        setIsLoading(true);
        setHasFetched(true);
        try {
            const result = await fetchLatestGrants(aiTone, llmProvider);
            const existingKeys = new Set(grants.map(g => `${g.title}|${g.department}`));
            const newGrants = result.filter(g => !existingKeys.has(`${g.title}|${g.department}`));
            setGrants(prev => [...prev, ...newGrants]);
            if (newGrants.length > 0) {
              showNotification(`成功獲取 ${newGrants.length} 筆新的補助資訊！`, 'success');
            } else {
              showNotification('目前沒有新的補助資訊。', 'info');
            }
        } catch (err) {
            showNotification('無法獲取補助資訊，請稍後再試。', 'error');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [aiTone, llmProvider, setGrants, grants, showNotification]);
    
    const handleAnalyzeAndAddGrant = async () => {
        const fileContent = uploadedFiles[0] ? atob(uploadedFiles[0].content) : pastedText;
        if (!fileContent.trim()) {
            showNotification('請上傳檔案或貼上內容。', 'warning');
            return;
        }

        setIsAnalyzing(true);
        try {
            const analysisResult = await analyzeGrantDocument(fileContent, aiTone, llmProvider);
            if (analysisResult) {
                onAddGrantFromFile(analysisResult, fileContent);
                setIsUploadModalOpen(false);
                setUploadedFiles([]);
                setPastedText('');
            } else {
                showNotification('AI 無法分析此文件，請確認內容是否為有效的補助案說明。', 'error');
            }
        } catch (error) {
            showNotification('分析文件時發生錯誤。', 'error');
            console.error(error);
        } finally {
            setIsAnalyzing(false);
        }
    };


    const getDepartmentColor = (department: string) => {
        if (department.includes('經濟部')) return 'bg-blue-100 text-blue-800';
        if (department.includes('國科會') || department.includes('科技')) return 'bg-green-100 text-green-800';
        if (department.includes('數位')) return 'bg-purple-100 text-purple-800';
        if (department.includes('文化')) return 'bg-rose-100 text-rose-800';
        if (department.includes('勞動')) return 'bg-amber-100 text-amber-800';
        return 'bg-gray-100 text-gray-800';
    };

    const uniqueDepartments = useMemo(() => {
        const depts = new Set(grants.map(g => g.department));
        return Array.from(depts);
    }, [grants]);
    
    const filteredGrants = useMemo(() => {
        return grants.filter(grant => {
            const keywordMatch = filterKeyword.trim() === '' ||
                grant.title.toLowerCase().includes(filterKeyword.toLowerCase()) ||
                grant.summary.toLowerCase().includes(filterKeyword.toLowerCase());
            const departmentMatch = filterDepartment === 'all' || grant.department === filterDepartment;
            const deadlineMatch = filterDeadline === 'all' || (filterDeadline === '30days' && (() => {
                const deadlineDate = new Date(grant.deadline);
                if (isNaN(deadlineDate.getTime())) return false;
                const today = new Date();
                const thirtyDaysFromNow = new Date();
                thirtyDaysFromNow.setDate(today.getDate() + 30);
                return deadlineDate >= today && deadlineDate <= thirtyDaysFromNow;
            })());
            
            return keywordMatch && departmentMatch && deadlineMatch;
        });
    }, [grants, filterKeyword, filterDepartment, filterDeadline]);
    
    const handleClearFilters = () => {
        setFilterKeyword('');
        setFilterDepartment('all');
        setFilterDeadline('all');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <Card>
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-800">最新政府補助情報</h2>
                    <p className="mt-2 max-w-2xl mx-auto text-gray-600">
                        啟用 AI 搜尋引擎，自動從全台各大政府網站同步最新的補助案資訊，或手動上傳您已有的徵案文件。
                    </p>
                    <div className="mt-6 flex flex-wrap gap-4 items-center justify-center">
                        <button
                            onClick={handleFetchGrants}
                            disabled={isLoading}
                            className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-white bg-[#FF6B6B] border border-transparent rounded-2xl shadow-sm hover:bg-[#fa5a5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B6B] disabled:bg-slate-300 disabled:text-slate-500 transition-transform transform hover:scale-105"
                        >
                            {isLoading ? <Spinner /> : <SearchIcon />}
                            {isLoading ? 'AI 搜尋中...' : '立即獲取最新補助情報'}
                        </button>
                         <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-slate-700 bg-white border border-slate-300 rounded-2xl shadow-sm hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-transform transform hover:scale-105"
                        >
                           <UploadIcon />
                            上傳徵案文件
                        </button>
                    </div>
                    {isLoading && <p className="mt-3 text-sm text-gray-500 animate-pulse">處理中...</p>}
                </div>
            </Card>
            
            {grants.length > 0 && (
                <Card>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-2">
                            <label htmlFor="keyword-filter" className="block text-sm font-medium text-gray-700 mb-1">計畫關鍵字</label>
                            <input type="text" id="keyword-filter" value={filterKeyword} onChange={e => setFilterKeyword(e.target.value)} placeholder="搜尋標題或摘要..." className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]" />
                        </div>
                        <div>
                            <label htmlFor="dept-filter" className="block text-sm font-medium text-gray-700 mb-1">主辦部會</label>
                            <select id="dept-filter" value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] bg-white">
                                <option value="all">所有部會</option>
                                {uniqueDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="deadline-filter" className="block text-sm font-medium text-gray-700 mb-1">截止日期</label>
                            <select id="deadline-filter" value={filterDeadline} onChange={e => setFilterDeadline(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] bg-white">
                                <option value="all">所有日期</option>
                                <option value="30days">30 天內截止</option>
                            </select>
                        </div>
                        <button onClick={handleClearFilters} className="text-sm text-gray-600 hover:text-[#FF6B6B] text-right md:col-span-4">清除篩選</button>
                    </div>
                </Card>
            )}

            {(hasFetched || grants.length > 0) && !isLoading && filteredGrants.length === 0 && (
                <Card>
                    <p className="text-center text-gray-500">{grants.length > 0 ? "找不到符合篩選條件的補助案。" : "找不到相關的補助資訊，或 AI 服務暫時無法連線。請稍後再試。"}</p>
                </Card>
            )}

            {filteredGrants.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredGrants.map((grant, index) => (
                        <Card key={`${grant.title}-${index}`} className="flex flex-col justify-between hover:shadow-xl transition-shadow duration-300">
                            <div>
                                <div className="flex justify-between items-start">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDepartmentColor(grant.department)}`}>
                                        {grant.isUploaded && <UploadIcon className="w-3 h-3 mr-1.5" />}
                                        {grant.department}
                                    </span>
                                </div>
                                <h3 className="mt-3 text-lg font-bold text-gray-900">{grant.title}</h3>
                                <p className="mt-2 text-sm text-gray-600">{grant.summary}</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center text-gray-500">
                                        <CalendarIcon />
                                        <span className="ml-1.5">申請截止：<span className="font-semibold text-red-600">{grant.deadline}</span></span>
                                    </div>
                                    {!grant.isUploaded && (
                                        <a
                                            href={grant.sourceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center text-[#FF6B6B] hover:text-[#fa5a5a] font-semibold"
                                        >
                                            查看原文 <ExternalLinkIcon />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
             {isUploadModalOpen && (
                <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="上傳並分析徵案文件">
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">請上傳、貼上或從雲端匯入補助案的申請須知（例如 .txt, .md, .pdf, .docx），AI 將自動為您解析關鍵資訊並建立卡片。</p>
                        <FileUpload onFilesChanged={(files) => setUploadedFiles(files.slice(0, 1))} allowMultiple={false} accept=".txt,.md,.pdf,.docx" />
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">或直接貼上內文</label>
                            <textarea
                                value={pastedText}
                                onChange={(e) => setPastedText(e.target.value)}
                                rows={8}
                                className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]"
                                placeholder="從 PDF 或網頁複製徵案須知內容並貼於此處..."
                                disabled={uploadedFiles.length > 0}
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleAnalyzeAndAddGrant}
                            disabled={isAnalyzing}
                            className="px-4 py-2 text-sm font-semibold text-white bg-[#FF6B6B] rounded-2xl shadow-sm hover:bg-[#fa5a5a] disabled:bg-[#fab4b4] flex items-center"
                        >
                            {isAnalyzing && <Spinner />}
                            {isAnalyzing ? '分析中...' : '分析並新增'}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// --- SVG Icons ---
const Spinner = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
);

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0h18" />
    </svg>
);

const ExternalLinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 ml-1">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
);

const UploadIcon: React.FC<{className?: string}> = ({className = "w-5 h-5 mr-2"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);


export default Stage0Information;