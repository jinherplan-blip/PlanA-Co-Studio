import { Proposal, TableData, ScoringCriterion, User } from './types';

export const DUMMY_USERS: User[] = [
    { id: 'user-1', name: 'admin', title: '系統管理員', avatarUrl: 'https://randomuser.me/api/portraits/men/32.jpg', password: 'password', role: '管理員' },
    { id: 'user-2', name: 'editor', title: '專案經理', avatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg', password: 'password', role: '編輯者' },
    { id: 'user-3', name: 'sara', title: '專案經理', avatarUrl: 'https://randomuser.me/api/portraits/women/68.jpg', password: 'password123', role: '編輯者' },
    { id: 'user-5', name: 'guest', title: '訪客', avatarUrl: 'https://randomuser.me/api/portraits/lego/1.jpg', password: 'password', role: '訪客' },
];

export const INITIAL_SCORING_CRITERIA: ScoringCriterion[] = [
    { id: 'crit-1', name: '技術/服務創新性', weight: 30, questions: [{ id: 'q-1-1', text: '創新點是否具前瞻性？' }, { id: 'q-1-2', text: '與現有方案差異化是否明顯？' }] },
    { id: 'crit-2', name: '市場潛力與商業模式', weight: 30, questions: [{ id: 'q-2-1', text: '市場規模與增長潛力是否足夠？' }, { id: 'q-2-2', text: '商業模式是否清晰可行？' }] },
    { id: 'crit-3', name: '執行可行性', weight: 25, questions: [{ id: 'q-3-1', text: '團隊組成與資源是否充足？' }, { id: 'q-3-2', text: '時程與里程碑規劃是否合理？' }] },
    { id: 'crit-4', name: '預期效益', weight: 15, questions: [{ id: 'q-4-1', text: 'KPI 是否具體且可量化？' }, { id: 'q-4-2', text: '對產業或社會的貢獻度為何？' }] },
];

export const DUMMY_PROJECTS: Proposal[] = [
  {
    id: 'proj-001',
    title: 'AI 影像輔助診斷系統 - 早期肺癌篩檢',
    aiTags: ["醫療科技", "AI影像辨識", "癌症篩檢"],
    dueDate: '2024-09-30',
    conceptionSummary: {
      why: '對應「六大核心戰略產業」中的「生物及醫療科技產業」政策，解決放射科醫師判讀肺部 CT 影像耗時且易有視覺疲勞的痛點。',
      what: '開發一套基於深度學習的 AI 影像輔助診斷軟體 (SaMD)，能自動偵測、標示肺部結節，並依據大小、密度等特徵，提供惡性風險分級建議。',
      whoNeedsIt: '大型醫院的影像醫學科、放射科，以及高階健檢中心。',
      whatToVerify: 'AI 模型對於 5mm 以上肺部結節的偵測敏感度 (Sensitivity) > 95%，特異度 (Specificity) > 92%。',
      benefits: '預計縮短 40% 的影像判讀時間，提升 15% 的早期肺癌檢出率，並輔助醫師做出更精準的診斷。',
    },
    chapters: [
      { id: 'chap-001-1', title: '摘要', userInput: '', content: '本計畫旨在開發一套 AI 影像輔助診斷系統，以提升早期肺癌篩檢的效率與準確性...', history: [], citations: [] },
      { id: 'chap-001-2', title: '背景與目的', userInput: '', content: '肺癌為全球與台灣死亡率最高的癌症，早期發現與治療是提升存活率的關鍵...', history: [], citations: [] },
    ],
  },
  {
    id: 'proj-002',
    title: '線下零售業智慧客流分析與動線優化方案',
    aiTags: ["零售科技", "智慧零售", "數據分析"],
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Due in 5 days
    conceptionSummary: {
      why: '回應「亞洲矽谷 3.0」推動 AIoT 應用的政策，解決實體零售業缺乏數據化工具，無法精準掌握顧客行為與優化場域坪效的問題。',
      what: '建置一套整合 AI 影像辨識與 Wi-Fi 探針的智慧客流分析系統，提供熱力圖、顧客動線、停留時間、客群屬性等數據洞察。',
      whoNeedsIt: '大型百貨商場、連鎖實體零售店（如：超市、藥妝店、服飾店）。',
      whatToVerify: '客流計數準確率 > 98%，並能成功繪製出賣場 Top 3 的黃金動線。',
      benefits: '預計協助業者提升 5% 的提袋率，優化 10% 的商品陳列效益，並提供展店選址的數據支持。',
    },
    chapters: [
      { id: 'chap-002-1', title: '摘要', userInput: '', content: '為解決實體零售業數據決策的困境，本計畫將開發一套智慧客流分析與動線優化方案...', history: [], citations: [] },
      { id: 'chap-002-2', title: '背景與目的', userInput: '', content: '儘管電商蓬勃發展，線下零售依然是品牌與顧客互動的重要場域，但長期面臨坪效不彰與顧客行為未知等挑戰...', history: [], citations: [] },
    ],
  },
  {
    id: 'proj-003',
    title: '餐飲業 AI 智慧點餐與個人化菜單推薦系統',
    aiTags: ["餐飲科技", "SaaS", "AI推薦"],
    dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Overdue by 10 days
    conceptionSummary: {
      why: '配合「服務業創新研發」計畫，應對餐飲業缺工、食材成本高漲，以及顧客體驗個人化需求提升的挑戰。',
      what: '開發一款結合 CRM 的 AI 智慧點餐 SaaS 系統，能依據顧客歷史消費數據、天氣、時段等變因，進行個人化菜單推薦與加價購促銷。',
      whoNeedsIt: '連鎖餐飲品牌、大型美食廣場，以及希望透過數位轉型提升客單價的中小型餐廳。',
      whatToVerify: 'AI 推薦引擎的點選率 > 15%，高於傳統行銷活動 5%。',
      benefits: '預計提升 8% 的平均客單價，降低 20% 的點餐人力需求，並提升 10% 的會員回購率。',
    },
    chapters: [
      { id: 'chap-003-1', title: '摘要', userInput: '', content: '本計畫旨在開發一套餐飲業 AI 智慧點餐與個人化菜單推薦系統，以數據驅動提升營收與顧客體驗...', history: [], citations: [] },
      { id: 'chap-003-2', title: '背景與目的', userInput: '', content: '餐飲業正處於數位轉型的十字路口，面臨嚴重的人力短缺與日益激烈的市場競爭...', history: [], citations: [] },
    ],
  }
];

export const DUMMY_TABLE_DATA: TableData = {
  policyCorrespondence: [
    { '政策名稱': '六大核心戰略產業 - 生物及醫療科技產業', '年份': '2022', '關聯目標': '發展精準醫療，導入 AI 輔助診斷', '本案對應作法': '開發肺癌 CT 影像 AI 輔助判讀軟體' },
  ],
  trl: [
    { '技術模組': '肺部結節辨識演算法', 'TRL 等級': '4', '驗證環境': '實驗室 (使用 LUNA16 公開數據集)', '待補項': '需使用國內醫院之真實 CT 影像進行訓練與驗證' },
  ],
  marketOpportunity: [
    { '客群': '教學醫院影像醫學科', '規模': '全台約 80 家', '增長率': '5% (健檢需求)', '競品': '國際大廠 (如 Philips, Siemens) 之內建軟體', '差異化': '針對亞洲人肺部特徵優化，並提供更彈性的 SaaS 訂閱制' },
  ],
  resourceInventory: [
    { '資源': '人力', '內容': 'AI 演算法工程師 3 位、放射科醫師顧問 1 位、SaMD 法規顧問 1 位' },
    { '資源': '數據', '內容': '已與 A 醫學中心簽訂合作意向書(MOU)，可取得 2,000 筆去識別化 CT 影像' },
  ],
  kpiDraft: [
    { '指標': '演算法對 5mm 以上結節的敏感度 (Sensitivity)', '基準值': '90% (文獻)', '目標值': '>95%', '驗證方式': '與三位放射科醫師的判讀結果進行交叉比對' },
  ],
  riskMatrix: [
    { '風險類型': '法規', '風險描述': '衛福部食藥署 (TFDA) 對醫材軟體 (SaMD) 的認證流程耗時且要求嚴格', '緩解方案': '聘請專業法規顧問，並在開發初期即導入 IEC 62304 軟體生命週期管理' },
  ],
  budgetPlan: [],
  stakeholderAnalysis: [],
  ipStrategy: [],
  esgMetrics: [],
  projectMilestones: [],
};