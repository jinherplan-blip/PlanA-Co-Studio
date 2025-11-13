export enum Stage {
  INFORMATION = '補助資源池',
  STRATEGY_AND_INSPIRATION = 'AI 策略擬定',
  MANAGEMENT = '專案工作台',
  PROJECT = '計畫工作區', 
  COMPARISON = '專案比較分析',
  SETTINGS = '帳號設定',
}

export enum ProjectSection {
  CONCEPTION = '啟動與構思',
  ANALYSIS = '資料整理與前期分析',
  WRITING = '正式撰寫',
  REVIEW = '內審與模擬審查',
  FINALIZE = '完成與交件準備',
}

export enum AITone {
  PROFESSIONAL = '專業顧問',
  STARTUP = '新創科技',
  ACADEMIC = '學術研究',
}

export enum LLMProvider {
  GEMINI = 'Gemini',
  CHATGPT = 'ChatGPT',
  HYBRID = '混合模式',
}

export interface User {
  id: string;
  name: string;
  title: string;
  avatarUrl: string;
  password?: string;
  role: '管理員' | '編輯者' | '訪客';
}

export interface ScoringCriterion {
  id: string;
  name: string;
  weight: number;
  questions: {
    id: string;
    text: string;
    aiScore?: number;
    aiJustification?: string;
  }[];
  aiScore?: number;
  aiJustification?: string;
}

export interface Citation {
  key: string;
  sourceName: string;
  url: string;
}

export interface ChapterHistory {
  timestamp: string; // ISO string for date
  userInput: string;
  content: string;
  citations?: Citation[];
}

export interface Chapter {
  id: string;
  title: string;
  userInput: string; // User's personal notes or draft
  content: string; // The main, AI-generated and user-edited content
  reviewerQuestions?: string;
  strengtheningSuggestions?: string;
  todoList?: string;
  gapCheckResult?: string;
  fullReviewFeedback?: string;
  templateKey?: string;
  history?: ChapterHistory[];
  citations?: Citation[];
}

export interface UploadedFile {
  name: string;
  mimeType: string;
  content: string; // Base64 for all file types
}

export interface InspirationInputs {
  projectName: string;
  oneLiner: string;
  problemSource: string;
  targetIndustries: string[];
  userType: string;
  painPoints: string;
  existingResources: string;
  desiredOutcome: string;
  coreTech: string;
  trl: string;
  applicationField: string;
  mvpIdea: string;
  marketRegion: string;
  relatedPolicies: string;
  targetGrant: string;
}

export interface InspirationReport {
  summaryCard: string;
  marketAnalysis: string;
  techFeasibility: string;
  policyAnalysis: string;
  industryGuidance: string;
  kpiSuggestions: { '指標': string; '量化成果': string; '可驗證方式': string; }[];
  actionItems: string[];
  callToAction: string; // The "一句亮點標語"
  consultantView: string;
  groundingSources: { title: string; uri: string }[];
}


export interface Proposal {
  id: string;
  title: string;
  conceptionSummary: {
    why: string;
    what: string;
    whoNeedsIt: string;
    whatToVerify: string;
    benefits: string;
  };
  chapters: Chapter[];
  aiTags?: string[];
  swotAnalysis?: SwotAnalysis;
  dueDate?: string;
  policyFitnessAnalysis?: PolicyFitnessAnalysis;
  optimizationSuggestions?: OptimizationSuggestions;
}

export interface TableData {
  policyCorrespondence: Record<string, string>[];
  trl: Record<string, string>[];
  marketOpportunity: Record<string, string>[];
  resourceInventory: Record<string, string>[];
  kpiDraft: Record<string, string>[];
  riskMatrix: Record<string, string>[];
  budgetPlan: Record<string, string>[];
  stakeholderAnalysis: Record<string, string>[];
  ipStrategy: Record<string, string>[];
  esgMetrics: Record<string, string>[];
  projectMilestones: Record<string, string>[];
}

export interface GrantInfo {
  title: string;
  department: string;
  deadline: string;
  summary: string;
  sourceUrl: string;
  fullText?: string;
  isUploaded?: boolean;
}

export interface GrantMatchResult {
  title: string;
  department: string;
  fitnessScore: number;
  justification: string;
  suggestedAngle: string;
}

// New types for the redesigned Comparison Stage
export interface CriterionScore {
  score: number;
  justification: string;
}

export interface ProjectScores {
  [criterionId: string]: CriterionScore;
}

export interface ComparisonData {
  scores: {
    [projectId: string]: ProjectScores;
  };
  summary: string;
}

// New type for score prediction service
export interface PredictedScores {
    criterionScore: {
        score: number;
        justification: string;
    };
    questionScores: {
        id: string;
        score: number;
        justification: string;
    }[];
}

export interface SwotAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  scores?: {
    strengths: number;
    opportunities: number;
    weaknesses: number;
    threats: number;
    total: number;
  };
  radarData?: {
    strategyCompleteness: number;
    overallCompetitiveness: number;
    strengthScore: number;
    weaknessControl: number;
    opportunityScore: number;
    threatDefense: number;
  };
  bestCaseScenario?: {
    title: string;
    points: string[];
  };
  worstCaseScenario?: {
    title: string;
    points: string[];
  };
}


export interface PolicyFitnessAnalysis {
  policyCompliance: number;
  technicalInnovation: number;
  industryImpact: number;
  feasibility: number;
  kpiVerifiability: number;
}

export interface OptimizationSuggestions {
  policyLink: string;
  bonusPoints: string;
  expansion: string;
}

export interface IndustrySuggestion {
  industryClassification: string;
  mainDepartment: string;
  grantThemes: string[];
  predictedGrantType: string;
  consultantAdvice: string;
}

export interface IndustrySuggestInputs {
  idea: string;
  painPoint: string;
  companySize: string;
  capital: string;
  timeline: string;
  coreTech: string;
}

export interface GrantAnalysisReport {
  title: string;
  department: string;
  deadline: string;
  summary: string;
  eligibility: string;
  reviewFocus: string;
  keywords: string[];
}

export type RadarScores = {
  policyFit: number;
  scopeAlignment: number;
  eligibility: number;
  techReadiness: number;
  impactKPI: number;
  budgetMatch: number;
  timelineFit: number;
};

export interface StrategyFitResult {
  grantName?: string;
  overallScore: number;
  radar: RadarScores;
}

export interface DataSupportResult {
  summaryTable: Record<string, string>[];
  supplementaryParagraph: string;
  referenceList: string;
}

export interface InteractiveConceptResult {
  status: 'complete' | 'incomplete';
  questions?: string[];
  conceptionSummary?: Proposal['conceptionSummary'];
  consultantAdvice?: string;
}