import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import StageManagement from './components/stages/StageManagement';
import Stage0Information from './components/stages/Stage0Information';
import StageStrategyPositioning from './components/stages/StageStrategyPositioning';
import Stage6Comparison from './components/stages/Stage6Comparison';
import { Stage, Proposal, TableData, AITone, LLMProvider, ScoringCriterion, GrantInfo, ProjectSection, InspirationReport, InspirationInputs, User, GrantAnalysisReport, Chapter } from './types';
import { DUMMY_PROJECTS, DUMMY_TABLE_DATA, INITIAL_SCORING_CRITERIA, DUMMY_USERS } from './constants';
import Card from './components/ui/Card';
import LearningModal from './components/ui/LearningModal';
import ProjectWorkspace from './components/ProjectWorkspace';
import Header from './components/Header';
import { useNotification } from './contexts/NotificationProvider';
import { generateProjectTags, analyzeImportedDocument } from './services/geminiService';
import LoginPage from './components/LoginPage';
import StageSettings from './components/stages/StageSettings';


const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(DUMMY_USERS);
  const [activeStage, setActiveStage] = useState<Stage>(Stage.MANAGEMENT);
  const [activeProjectSection, setActiveProjectSection] = useState<ProjectSection>(ProjectSection.CONCEPTION);
  
  const [allProjects, setAllProjects] = useState<Proposal[]>(DUMMY_PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(DUMMY_PROJECTS[0]?.id || null);
  
  const [tableData, setTableData] = useState<TableData>(DUMMY_TABLE_DATA);
  const [scoringCriteria, setScoringCriteria] = useState<ScoringCriterion[]>(INITIAL_SCORING_CRITERIA);
  const [aiTone, setAiTone] = useState<AITone>(AITone.PROFESSIONAL);
  const [llmProvider, setLlmProvider] = useState<LLMProvider>(LLMProvider.HYBRID);
  const [isLearningModalOpen, setIsLearningModalOpen] = useState(false);
  const [grants, setGrants] = useState<GrantInfo[]>([]);
  const [preselectedComparisonIds, setPreselectedComparisonIds] = useState<string[]>([]);
  const { showNotification } = useNotification();

  useEffect(() => {
    const storedUserId = localStorage.getItem('currentUserId');
    if (storedUserId) {
      const user = users.find(u => u.id === storedUserId);
      if (user) {
        setCurrentUser(user);
      }
    }
  }, [users]);

  const activeProject = useMemo(() => allProjects.find(p => p.id === activeProjectId), [allProjects, activeProjectId]);

  // Auto-generate tags for existing projects on first load
  useEffect(() => {
    if (!currentUser) return;
    const taglessProjects = allProjects.filter(p => !p.aiTags || p.aiTags.length === 0);
    if (taglessProjects.length > 0) {
      const generateTagsForProjects = async () => {
        let hasShownError = false;
        const updatedProjects = [...allProjects];
        for (const project of taglessProjects) {
          try {
            const tags = await generateProjectTags(project, aiTone, llmProvider);
            if (tags) {
              const projectIndex = updatedProjects.findIndex(p => p.id === project.id);
              if (projectIndex !== -1) {
                updatedProjects[projectIndex] = { ...updatedProjects[projectIndex], aiTags: tags };
              }
            }
             await new Promise(resolve => setTimeout(resolve, 2000)); // Add delay
          } catch (error) {
             if (!hasShownError) {
                showNotification('AI 服務用量可能已達上限，部分標籤生成失敗。', 'warning');
                hasShownError = true;
            }
            console.error(`Failed to generate tags for project ${project.id}:`, error);
          }
        }
        setAllProjects(updatedProjects);
      };
      generateTagsForProjects();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]); 

  const handleLogin = (username: string, password: string): User | null => {
    const user = users.find(u => u.name === username && u.password === password);
    if (user) {
      localStorage.setItem('currentUserId', user.id);
      setCurrentUser(user);
      return user;
    }
    return null;
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('rememberedUsername');
    setCurrentUser(null);
  };

  const handleAddUser = (newUser: Omit<User, 'id' | 'avatarUrl'>) => {
    const userWithId: User = {
        ...newUser,
        id: `user-${Date.now()}`,
        avatarUrl: `https://i.pravatar.cc/150?u=user-${Date.now()}`
    };
    setUsers(prev => [...prev, userWithId]);
    showNotification(`已新增使用者：${newUser.name}`, 'success');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    showNotification(`已更新使用者：${updatedUser.name}`, 'success');
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    showNotification(`已刪除使用者`, 'success');
  };


  const handleStageSelect = useCallback((stage: Stage) => {
    setActiveStage(stage);
  }, []);

  const handleSelectProject = (id: string) => {
    setActiveProjectId(id);
    setActiveStage(Stage.PROJECT);
    setActiveProjectSection(ProjectSection.CONCEPTION);
  };

  const handleUpdateProject = (id: string, updates: Partial<Proposal>) => {
    setAllProjects(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const handleDeleteProject = (id: string) => {
    if (window.confirm('您確定要刪除這個計畫案嗎？此操作無法復原。')) {
      setAllProjects(prev => prev.filter(p => p.id !== id));
      if (activeProjectId === id) {
        const remainingProjects = allProjects.filter(p => p.id !== id);
        const newActiveId = remainingProjects.length > 0 ? remainingProjects[0].id : null;
        setActiveProjectId(newActiveId);
        if (!newActiveId) {
          setActiveStage(Stage.MANAGEMENT);
        }
      }
    }
  };
  
  const handleCreateBlankProject = useCallback(async () => {
    handleCreateProjectWithAITitle('新的空白計畫案');
  }, []);

  const handleCreateProjectWithAITitle = useCallback(async (title: string) => {
    const newProject: Proposal = {
      id: `proj-${Date.now()}`,
      title: title,
      conceptionSummary: { why: '', what: '', whoNeedsIt: '', whatToVerify: '', benefits: '' },
      chapters: [],
      aiTags: [],
    };

    try {
        const tags = await generateProjectTags(newProject, aiTone, llmProvider);
        if(tags) {
            newProject.aiTags = tags;
        }
    } catch (error: any) {
        showNotification(error.message || '計畫已建立，但 AI 標籤生成失敗。', 'error');
        console.error("Error generating project tags on create:", error);
    }

    setAllProjects(prev => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
    setActiveStage(Stage.PROJECT);
    setActiveProjectSection(ProjectSection.CONCEPTION);
    showNotification(`已成功建立計畫：${title}`, 'success');
  }, [aiTone, llmProvider, showNotification]);

  const handleCreateProjectFromImport = useCallback(async (documentText: string) => {
    try {
        showNotification('AI 正在分析您的文件...', 'info');
        const analysis = await analyzeImportedDocument(documentText, aiTone);
        if (!analysis || !analysis.title || !analysis.conceptionSummary) {
            showNotification('AI 無法分析文件內容，請確認文件格式或內容。', 'error');
            return;
        }
        
        const firstChapter: Chapter = {
            id: `chap-import-${Date.now()}`,
            title: '匯入的原始文件',
            content: documentText,
            userInput: '這是從外部文件匯入的原始內容，作為參考。',
            history: [],
            citations: []
        };
        
        let newProject: Proposal = {
            id: `proj-${Date.now()}`,
            title: analysis.title,
            conceptionSummary: analysis.conceptionSummary,
            chapters: [firstChapter],
            aiTags: [],
        };

        const tags = await generateProjectTags(newProject, aiTone, llmProvider);
        if(tags) {
            newProject.aiTags = tags;
        }

        setAllProjects(prev => [newProject, ...prev]);
        setActiveProjectId(newProject.id);
        setActiveStage(Stage.PROJECT);
        setActiveProjectSection(ProjectSection.CONCEPTION);
        showNotification(`已成功從文件建立新計畫：${newProject.title}`, 'success');

    } catch (error: any) {
        showNotification(error.message || '從文件建立計畫時發生錯誤。', 'error');
        console.error("Error creating project from import:", error);
    }
  }, [aiTone, llmProvider, showNotification]);


  const handleCreateProjectFromInspiration = async (report: InspirationReport, inputs: InspirationInputs) => {
    let newProject: Proposal = {
      id: `proj-${Date.now()}`,
      title: inputs.projectName || '未命名計畫案',
      conceptionSummary: {
        why: `**市場與痛點分析**\n${report.marketAnalysis}\n\n**政策對應分析**\n${report.policyAnalysis}`,
        what: report.techFeasibility,
        whoNeedsIt: `此計畫主要服務 ${inputs.userType}，以解決他們面臨的「${inputs.painPoints}」挑戰。`,
        whatToVerify: report.kpiSuggestions.map(k => `**${k['指標']}**: ${k['量化成果']} (${k['可驗證方式']})`).join('; '),
        benefits: report.summaryCard
      },
      chapters: [
        { id: `chap-${Date.now()}-1`, title: '摘要', userInput: '', content: report.summaryCard, history: [], citations: [] },
        { id: `chap-${Date.now()}-2`, title: '市場與需求分析', userInput: '', content: report.marketAnalysis, history: [], citations: [] },
        { id: `chap-${Date.now()}-3`, title: '技術可行性分析', userInput: '', content: report.techFeasibility, history: [], citations: [] },
        { id: `chap-${Date.now()}-4`, title: '政策對應分析', userInput: '', content: report.policyAnalysis, history: [], citations: [] },
      ],
      aiTags: [],
    };

    try {
        const tags = await generateProjectTags(newProject, aiTone, llmProvider);
        if(tags) {
            newProject.aiTags = tags;
        }
    } catch (error: any) {
        showNotification(error.message || '計畫已建立，但 AI 標籤生成失敗。', 'error');
        console.error("Error generating project tags from inspiration:", error);
    }

    setAllProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);
    setActiveStage(Stage.PROJECT);
    setActiveProjectSection(ProjectSection.CONCEPTION);
    showNotification(`已從靈感報告成功建立新計畫：${newProject.title}`, 'success');
  };

  const handleCompareGrants = useCallback((selectedGrants: GrantInfo[]) => {
    const newProjects: Proposal[] = selectedGrants.map((grant, index) => ({
      id: `proj-${Date.now()}-${index}`,
      title: grant.title,
      dueDate: grant.deadline,
      conceptionSummary: {
        why: `此計畫草案旨在對應「${grant.department}」發布的「${grant.title}」補助案。`,
        what: grant.summary,
        whoNeedsIt: '［待補：請根據補助案要求，填寫］',
        whatToVerify: '［待補：請根據補助案要求，填寫］',
        benefits: '［待補：請根據補助案要求，填寫］',
      },
      chapters: [{ id: `chap-comp-${index}`, title: '摘要', userInput: '', content: grant.summary, history: [], citations: [] }],
    }));

    const newProjectIds = newProjects.map(p => p.id);

    setAllProjects(prev => [...prev, ...newProjects]);
    setPreselectedComparisonIds(newProjectIds);
    setActiveStage(Stage.COMPARISON);
  }, []);

  const handleAddGrantFromFile = (grantData: GrantAnalysisReport, fileContent: string) => {
    const newGrant: GrantInfo = {
        title: grantData.title,
        department: grantData.department,
        deadline: grantData.deadline,
        summary: grantData.summary,
        sourceUrl: '#uploaded',
        fullText: fileContent,
        isUploaded: true,
    };

    setGrants(prev => {
        if (prev.some(g => g.title === newGrant.title && g.department === newGrant.department)) {
            showNotification(`補助案 "${newGrant.title}" 已存在。`, 'info');
            return prev;
        }
        showNotification(`已成功從檔案匯入補助案：${newGrant.title}`, 'success');
        return [newGrant, ...prev];
    });
  };

  const setActiveProject = useCallback((updater: React.SetStateAction<Proposal>) => {
    if (!activeProjectId) return;
    setAllProjects(currentProjects => 
        currentProjects.map(p => {
            if (p.id === activeProjectId) {
                if (typeof updater === 'function') {
                    return updater(p);
                }
                return updater;
            }
            return p;
        })
    );
  }, [activeProjectId]);


  const renderStageContent = () => {
    switch (activeStage) {
      case Stage.INFORMATION:
        return <Stage0Information 
          grants={grants}
          setGrants={setGrants}
          aiTone={aiTone} 
          llmProvider={llmProvider}
          onAddGrantFromFile={handleAddGrantFromFile} 
        />;
      case Stage.STRATEGY_AND_INSPIRATION:
        return <StageStrategyPositioning
          onCreateProject={handleCreateProjectFromInspiration}
          aiTone={aiTone}
          llmProvider={llmProvider}
        />;
      case Stage.MANAGEMENT:
        return <StageManagement
          allProjects={allProjects}
          activeProjectId={activeProjectId}
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProjectWithAITitle}
          onCreateBlankProject={handleCreateBlankProject}
          onCreateProjectFromImport={handleCreateProjectFromImport}
          onDeleteProject={handleDeleteProject}
          onUpdateProject={handleUpdateProject}
          aiTone={aiTone}
          llmProvider={llmProvider}
        />;
      case Stage.PROJECT:
        if (!activeProject) {
          return (
              <Card className="text-center">
                  <h3 className="text-xl font-bold text-slate-800">沒有選擇任何計畫</h3>
                  <p className="mt-2 text-slate-600">請返回「計畫管理」頁面選擇或建立一個新計畫。</p>
              </Card>
          );
        }
        return <ProjectWorkspace
          activeProject={activeProject}
          setActiveProject={setActiveProject}
          activeSection={activeProjectSection}
          setActiveSection={setActiveProjectSection}
          tableData={tableData}
          setTableData={setTableData}
          scoringCriteria={scoringCriteria}
          setScoringCriteria={setScoringCriteria}
          aiTone={aiTone}
          setAiTone={setAiTone}
          llmProvider={llmProvider}
          grants={grants}
          onCompareGrants={handleCompareGrants}
          allProjects={allProjects}
          onSelectProject={handleSelectProject}
        />;
      case Stage.COMPARISON:
        return <Stage6Comparison 
                  projects={allProjects} 
                  scoringCriteria={scoringCriteria} 
                  aiTone={aiTone} 
                  llmProvider={llmProvider}
                  initialSelectedIds={preselectedComparisonIds}
                  onComparisonLoaded={() => setPreselectedComparisonIds([])}
                />;
      case Stage.SETTINGS:
        return <StageSettings
                  currentUser={currentUser!}
                  users={users}
                  onAddUser={handleAddUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                />;
      default:
        return <StageManagement
          allProjects={allProjects}
          activeProjectId={activeProjectId}
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProjectWithAITitle}
          onCreateBlankProject={handleCreateBlankProject}
          onCreateProjectFromImport={handleCreateProjectFromImport}
          onDeleteProject={handleDeleteProject}
          onUpdateProject={handleUpdateProject}
          aiTone={aiTone}
          llmProvider={llmProvider}
        />;
    }
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen p-4 sm:p-5 gap-5">
      <Sidebar 
        activeStage={activeStage} 
        onStageSelect={handleStageSelect}
        user={currentUser}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200/60">
         <Header 
            llmProvider={llmProvider}
            setLlmProvider={setLlmProvider}
          />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {renderStageContent()}
        </main>
      </div>
      {isLearningModalOpen && (
        <LearningModal
          isOpen={isLearningModalOpen}
          onClose={() => setIsLearningModalOpen(false)}
          aiTone={aiTone}
          llmProvider={llmProvider}
        />
      )}
    </div>
  );
};

export default App;