import { GoogleGenAI, Type, Part, GenerateContentResponse } from "@google/genai";
import { AITone, Proposal, TableData, LLMProvider, ScoringCriterion, ComparisonData, ProjectScores, CriterionScore, GrantInfo, PredictedScores, SwotAnalysis, InspirationReport, InspirationInputs, GrantMatchResult, IndustrySuggestion, UploadedFile, IndustrySuggestInputs, GrantAnalysisReport, StrategyFitResult, DataSupportResult, InteractiveConceptResult, PolicyFitnessAnalysis, OptimizationSuggestions } from '../types';

// Initialize the Google Gemini AI client
// The API key is automatically provided by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * A wrapper function to handle Gemini API calls with an exponential backoff retry mechanism.
 * This is used to gracefully handle 429 rate limit errors and other transient issues.
 */
const callGeminiWithRetry = async <T>(
    apiCall: () => Promise<T>,
    maxRetries: number = 5,
    initialDelay: number = 5000 // Start with a 5-second delay
): Promise<T> => {
    let attempt = 0;
    let delay = initialDelay;

    while (true) {
        try {
            return await apiCall();
        } catch (error: any) {
            const errorMessage = (error?.toString() ?? '').toLowerCase();
            const isRateLimitError = errorMessage.includes('429') || errorMessage.includes('resource_exhausted');

            if (isRateLimitError && attempt < maxRetries) {
                attempt++;
                console.warn(`Rate limit hit. Retrying in ${delay / 1000}s... (Attempt ${attempt}/${maxRetries})`);
                await new Promise(res => setTimeout(res, delay));
                delay *= 2; // Exponential backoff
            } else {
                console.error("Gemini API call failed after retries or for a non-rate-limit reason:", error);
                 if (isRateLimitError) {
                    throw new Error('AI 服務用量已達上限。請稍後再試，或檢查您的方案與帳單設定。');
                }
                throw new Error('呼叫 Gemini API 失敗：' + (error.message || '未知錯誤'));
            }
        }
    }
};


const TONE_INSTRUCTIONS: Record<AITone, string> = {
  [AITone.PROFESSIONAL]: `你是一位『政府補助案配對顧問＋專業計畫案寫手』，熟悉台灣各部會補助規範與審查邏輯。你具備：關鍵字擴散、政策查詢、產業匹配、補助比對、AI 智能審查、策略契合分析（StrategyFit）、章節一致性檢查、投案格式檢查、案例學習、Google 雲端資料萃取與文件歸檔的能力。風格：專業、條理分明、結論先行、內容可查核。所有模組均可互相引用 proposal_context 資料，未確定部分以［待補］標示。若偵測到條件不符或比例超標，須主動註記並建議修正依據（年份/單位）。`,
  [AITone.STARTUP]: `你是一位充滿活力的「新創公司策略長」，目標是為一個顛覆性的技術或商業模式爭取種子輪資金或政府的創新補助。
【語氣與風格】熱情、有遠見、強調市場潛力與破壞式創新。使用更具說服力和故事性的語言，但仍需以數據支撐。重點在於傳達願景、市場機會、團隊的獨特優勢，以及計畫將如何帶來高成長的回報。`,
  [AITone.ACADEMIC]: `You are an experienced academic researcher and grant writer at a top university. You are familiar with the rigorous standards of national science and technology grants.
Your style is formal, precise, and evidence-based. Emphasize theoretical contributions, methodological rigor, and potential for scholarly impact.
All claims must be backed by logical reasoning or references to established literature (if applicable). Use structured, academic language.`,
};

function safeJsonParse<T>(jsonString: string): T | null {
    if (!jsonString || typeof jsonString !== 'string') {
        return null;
    }
    try {
        // Find the start of the JSON object/array
        const firstBracket = jsonString.indexOf('{');
        const firstSquare = jsonString.indexOf('[');
        
        let startIndex = -1;
        
        if (firstBracket === -1 && firstSquare === -1) return null;
        
        if (firstBracket === -1) startIndex = firstSquare;
        else if (firstSquare === -1) startIndex = firstBracket;
        else startIndex = Math.min(firstBracket, firstSquare);

        const parsableString = jsonString.substring(startIndex);
        return JSON.parse(parsableString) as T;
    } catch (e) {
        // Fallback for markdown code blocks
        try {
            const match = /```json\s*([\s\S]*?)\s*```/.exec(jsonString);
            if (match && match[1]) {
                return JSON.parse(match[1]) as T;
            }
        } catch (e2) {
             console.error("Failed to parse JSON string after fallback:", jsonString, e2);
        }
        console.error("Failed to parse JSON string:", jsonString, e);
        return null;
    }
}


// --- Functions for App.tsx & StageManagement.tsx ---
export const generateProjectTags = async (project: Proposal, aiTone: AITone, llmProvider: LLMProvider): Promise<string[] | null> => {
    const prompt = `Based on the following project, generate 3-5 relevant tags for categorization.
Project Title: ${project.title}
Project Summary: ${project.conceptionSummary.what}
Return a JSON array of strings. For example: ["AI", "Healthcare", "Medical Imaging"]`;

    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                responseMimeType: 'application/json',
                responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
        }));
        return safeJsonParse<string[]>(response.text);
    } catch (e) {
        console.error("Error generating project tags after retries:", e);
        throw e;
    }
};

export const suggestMultipleProjectTitles = async (idea: string, files: UploadedFile[], aiTone: AITone): Promise<string[] | null> => {
    const textPrompt = `Based on the following project idea and any attached documents, suggest 5 professional, compelling, and grant-friendly project titles.
Project Idea: "${idea}"
Return a JSON array of 5 unique title strings. For example: ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"]`;
    
    const promptParts: Part[] = [{ text: textPrompt }];

    for (const file of files) {
        if (file.content) {
            promptParts.push({ 
                inlineData: { 
                    mimeType: file.mimeType, 
                    data: file.content 
                } 
            });
        }
    }

    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: promptParts }],
            config: {
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                responseMimeType: 'application/json',
                responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
        }));
        return safeJsonParse<string[]>(response.text);
    } catch (e) {
        console.error("Error suggesting multiple project titles:", e);
        throw e;
    }
};


// --- Functions for Stage0Information.tsx ---
export const fetchLatestGrants = async (aiTone: AITone, llmProvider: LLMProvider): Promise<GrantInfo[]> => {
    const cacheKey = 'latestGrantsCache';
    const cacheDuration = 3600 * 1000; // 1 hour in milliseconds
    const cachedItem = localStorage.getItem(cacheKey);

    if (cachedItem) {
        const { timestamp, data } = JSON.parse(cachedItem);
        if (Date.now() - timestamp < cacheDuration) {
            console.log("Returning cached grant data.");
            return data;
        }
    }
    
    const prompt = `Search for the latest government grants available for businesses in Taiwan. Focus on grants from major departments like the Ministry of Economic Affairs (經濟部), National Science and Technology Council (國科會), and Ministry of Digital Affairs (數位發展部). For each grant found, extract the following information: title, department, deadline, a brief summary, and the source URL. Return the information as a JSON array of objects.`;

    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                tools: [{ googleSearch: {} }],
            },
        }));
        const grants = safeJsonParse<GrantInfo[]>(response.text) || [];

        const cacheData = {
            timestamp: Date.now(),
            data: grants
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));

        return grants;

    } catch (e) {
        console.error("Error fetching latest grants after retries:", e);
        throw e;
    }
};

// --- Functions for Stage1Conception.tsx ---
export const suggestPolicies = async (why: string, what: string, aiTone: AITone, llmProvider: LLMProvider): Promise<string> => {
    const prompt = `Based on the project's goal (Why: ${why}) and solution (What: ${what}), suggest 2-3 relevant Taiwanese government policies or strategic industry initiatives that this project aligns with. Use Google Search to find the most current and relevant policies. Provide a brief explanation for each suggestion.`;
    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                tools: [{ googleSearch: {} }],
            },
        }));
        return response.text;
    } catch (e) {
        console.error("Error suggesting policies after retries:", e);
        throw e;
    }
};

export const consolidateSummaryCard = async (summary: Proposal['conceptionSummary'], aiTone: AITone, llmProvider: LLMProvider): Promise<string> => {
    const prompt = `Consolidate the following project conception points into a concise, compelling summary paragraph (around 150 words) suitable for a grant proposal's abstract section.
- Why: ${summary.why}
- What: ${summary.what}
- Who needs it: ${summary.whoNeedsIt}
- What to verify: ${summary.whatToVerify}
- Benefits: ${summary.benefits}`;
    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction: TONE_INSTRUCTIONS[aiTone] },
        }));
        return response.text;
    } catch (e) {
        console.error("Error consolidating summary after retries:", e);
        throw e;
    }
};

export const refineSingleConceptionField = async (
  fieldName: keyof Proposal['conceptionSummary'],
  fieldValue: string,
  proposalContext: Proposal,
  aiTone: AITone
): Promise<string> => {
  const prompt = `Act as an expert grant writer. Review the following single field from a project's core concept and refine it to be more compelling, concise, and professional for a grant proposal.
  
  The full project context is:
  - Title: ${proposalContext.title}
  - Why: ${proposalContext.conceptionSummary.why}
  - What: ${proposalContext.conceptionSummary.what}
  - Who needs it: ${proposalContext.conceptionSummary.whoNeedsIt}
  - What to verify: ${proposalContext.conceptionSummary.whatToVerify}
  - Benefits: ${proposalContext.conceptionSummary.benefits}

  The specific field to refine is "${fieldName}".
  Current content of "${fieldName}":
  """
  ${fieldValue}
  """

  Return ONLY the refined text for the "${fieldName}" field as a single string. Do not add any extra explanations or markdown.
  `;

  try {
    const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        systemInstruction: TONE_INSTRUCTIONS[aiTone]
      },
    }));
    return response.text.trim();
  } catch (e) {
    console.error(`Error refining conception field "${fieldName}":`, e);
    throw e;
  }
};


export const generateInteractiveConcept = async (
    initialInputs: { [key: string]: string },
    history: { role: 'user' | 'model'; parts: Part[] }[],
    aiTone: AITone,
    uploadedFiles: UploadedFile[] = []
): Promise<InteractiveConceptResult | null> => {
    const systemInstruction = `${TONE_INSTRUCTIONS[aiTone]}
Your task is to act as an interactive consultant.
1.  Analyze the user's input, uploaded files, and conversation history. If the information is insufficient to create a high-quality 'Conception Summary Card' and 'Consultant Advice Card', you MUST ask 1-3 specific, clarifying questions to get the necessary details.
2.  If the information is sufficient, you MUST generate the final cards. For each field in the 'conceptionSummary', provide a detailed and comprehensive paragraph (around 50-80 words). Be specific and elaborate on the core concepts.
3.  You MUST respond in the specified JSON format.
    - If you need more information: \`{ "status": "incomplete", "questions": ["Question 1", "Question 2"] }\`
    - If you have enough information: \`{ "status": "complete", "conceptionSummary": { "why": "...", "what": "...", "whoNeedsIt": "...", "whatToVerify": "...", "benefits": "..." }, "consultantAdvice": "Your advice here..." }\``;

    let currentHistory = history;
    if (history.length === 0) {
        const initialPromptText = `Here is my initial project idea. Please review it, along with any attached files, and ask questions if needed, or generate the summary and advice if you have enough information.
- 主題 (Theme): ${initialInputs.theme}
- 產業 (Industry): ${initialInputs.industry}
- 痛點 (Pain Point): ${initialInputs.painPoint}
- 技術構想 (Technical Idea): ${initialInputs.techIdea}
- 效益 (Benefits): ${initialInputs.benefits}`;
        
        const promptParts: Part[] = [{ text: initialPromptText }];
        for (const file of uploadedFiles) {
            if (file.content) {
                promptParts.push({ 
                    inlineData: { 
                        mimeType: file.mimeType, 
                        data: file.content 
                    } 
                });
            }
        }
        currentHistory = [{ role: 'user', parts: promptParts }];
    }

    const schema = {
        type: Type.OBJECT,
        properties: {
            status: { type: Type.STRING, enum: ['complete', 'incomplete'] },
            questions: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
            conceptionSummary: {
                type: Type.OBJECT,
                nullable: true,
                properties: {
                    why: { type: Type.STRING },
                    what: { type: Type.STRING },
                    whoNeedsIt: { type: Type.STRING },
                    whatToVerify: { type: Type.STRING },
                    benefits: { type: Type.STRING },
                },
                required: ['why', 'what', 'whoNeedsIt', 'whatToVerify', 'benefits'],
            },
            consultantAdvice: { type: Type.STRING, nullable: true },
        },
        required: ['status'],
    };

    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: currentHistory,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: schema,
            },
        }));
        return safeJsonParse<InteractiveConceptResult>(response.text);
    } catch (e) {
        console.error("Error in interactive concept generation:", e);
        throw e;
    }
};


export const analyzeGrantNetwork = async (scope: string, aiTone: AITone, llmProvider: LLMProvider): Promise<string> => {
    const prompt = `Analyze the grant network related to "${scope}" in Taiwan. Provide a report including:
1.  **Key Government Departments**: Which ministries or agencies are most active in this area?
2.  **Common Grant Themes**: What are the recurring keywords and focus areas in related grants?
3.  **Potential Synergies**: Suggest potential collaboration opportunities with research institutions or industry associations.
Format the response in markdown.`;
    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                tools: [{ googleSearch: {} }],
            },
        }));
        return response.text;
    } catch (e) {
        console.error("Error analyzing grant network after retries:", e);
        throw e;
    }
};

export const getConsultantAdvice = async (summary: Proposal['conceptionSummary'], aiTone: AITone, llmProvider: LLMProvider): Promise<string> => {
    const prompt = `Act as a grant consultant and provide strategic advice on the following project concept. Identify potential weaknesses, suggest ways to strengthen the proposal, and highlight the most critical aspect to emphasize for reviewers.
- Why: ${summary.why}
- What: ${summary.what}
- Who needs it: ${summary.whoNeedsIt}
- What to verify: ${summary.whatToVerify}
- Benefits: ${summary.benefits}
Format the response in markdown.`;
    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: { 
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                thinkingConfig: { thinkingBudget: 32768 },
            },
        }));
        return response.text;
    } catch (e) {
        console.error("Error getting consultant advice after retries:", e);
        throw e;
    }
};

export const matchGrantsToProposal = async (proposal: Proposal, grants: GrantInfo[], aiTone: AITone, llmProvider: LLMProvider): Promise<GrantMatchResult[] | null> => {
    const prompt = `Given the following project proposal:
Title: ${proposal.title}
Summary: ${proposal.conceptionSummary.what}
Benefits: ${proposal.conceptionSummary.benefits}

And a list of available grants:
${JSON.stringify(grants, null, 2)}

Analyze the fitness of the proposal for each grant. Return a JSON array of objects, where each object represents a grant and contains: "title", "department", "fitnessScore" (0-100), "justification" (why it's a good/bad fit), and "suggestedAngle" (how to best position the proposal for this specific grant).`;
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                department: { type: Type.STRING },
                fitnessScore: { type: Type.NUMBER },
                justification: { type: Type.STRING },
                suggestedAngle: { type: Type.STRING },
            },
            required: ['title', 'department', 'fitnessScore', 'justification', 'suggestedAngle'],
        }
    };
    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                responseMimeType: 'application/json',
                responseSchema: schema,
            },
        }));
        return safeJsonParse<GrantMatchResult[]>(response.text);
    } catch (e) {
        console.error("Error matching grants to proposal after retries:", e);
        throw e;
    }
};

export const suggestTitlesForExistingProject = async (proposal: Proposal, aiTone: AITone): Promise<string[] | null> => {
    const prompt = `Based on the following existing project's conception summary, suggest 3 alternative, professional, compelling, and grant-appropriate project titles.
    Project Context:
    - Current Title: ${proposal.title}
    - Why: ${proposal.conceptionSummary.why}
    - What: ${proposal.conceptionSummary.what}
    - Who needs it: ${proposal.conceptionSummary.whoNeedsIt}
    - Benefits: ${proposal.conceptionSummary.benefits}

    Return a JSON array of 3 unique title strings. For example: ["New Title 1", "New Title 2", "New Title 3"]`;

    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                responseMimeType: 'application/json',
                responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
        }));
        return safeJsonParse<string[]>(response.text);
    } catch (e) {
        console.error("Error suggesting titles for existing project:", e);
        throw e;
    }
};

export const generatePolicyDrivenConcept = async (
  grantAnalysis: GrantAnalysisReport | null,
  userIdea: string,
  userNeeds: string,
  referenceFiles: UploadedFile[],
  aiTone: AITone
): Promise<{
  conceptionSummary: Proposal['conceptionSummary'];
  policyFitnessAnalysis: PolicyFitnessAnalysis;
  optimizationSuggestions: OptimizationSuggestions;
} | null> => {
  if (!grantAnalysis) return null;
  const promptText = `Based on the following grant analysis, user's core idea, user needs, and any attached reference documents, generate a complete project conception.
  
  Grant Analysis: ${JSON.stringify(grantAnalysis)}
  User's Core Idea: "${userIdea}"
  User/Industry Needs: "${userNeeds}"

  Your task is to generate:
  1. A complete "conceptionSummary" object with fields: "why", "what", "whoNeedsIt", "whatToVerify", "benefits".
  2. A "policyFitnessAnalysis" object with scores (0-100) for: "policyCompliance", "technicalInnovation", "industryImpact", "feasibility", "kpiVerifiability".
  3. An "optimizationSuggestions" object with string fields: "policyLink", "bonusPoints", "expansion".

  Return a single JSON object with the keys "conceptionSummary", "policyFitnessAnalysis", and "optimizationSuggestions".`;

  const promptParts: Part[] = [{ text: promptText }];

  for (const file of referenceFiles) {
      if (file.content) {
          promptParts.push({ 
              inlineData: { 
                  mimeType: file.mimeType, 
                  data: file.content 
              } 
          });
      }
  }

  const schema = {
      type: Type.OBJECT,
      properties: {
          conceptionSummary: {
              type: Type.OBJECT,
              properties: {
                  why: { type: Type.STRING },
                  what: { type: Type.STRING },
                  whoNeedsIt: { type: Type.STRING },
                  whatToVerify: { type: Type.STRING },
                  benefits: { type: Type.STRING },
              },
              required: ['why', 'what', 'whoNeedsIt', 'whatToVerify', 'benefits'],
          },
          policyFitnessAnalysis: {
              type: Type.OBJECT,
              properties: {
                  policyCompliance: { type: Type.NUMBER },
                  technicalInnovation: { type: Type.NUMBER },
                  industryImpact: { type: Type.NUMBER },
                  feasibility: { type: Type.NUMBER },
                  kpiVerifiability: { type: Type.NUMBER },
              },
              required: ['policyCompliance', 'technicalInnovation', 'industryImpact', 'feasibility', 'kpiVerifiability'],
          },
          optimizationSuggestions: {
              type: Type.OBJECT,
              properties: {
                  policyLink: { type: Type.STRING },
                  bonusPoints: { type: Type.STRING },
                  expansion: { type: Type.STRING },
              },
              required: ['policyLink', 'bonusPoints', 'expansion'],
          },
      },
      required: ['conceptionSummary', 'policyFitnessAnalysis', 'optimizationSuggestions'],
  };

  try {
      // FIX: Add explicit generic type to callGeminiWithRetry to ensure correct type inference for `response`.
      const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: [{ parts: promptParts }],
          config: {
              systemInstruction: TONE_INSTRUCTIONS[aiTone],
              responseMimeType: 'application/json',
              responseSchema: schema,
          },
      }));
      return safeJsonParse<{
        conceptionSummary: Proposal['conceptionSummary'];
        policyFitnessAnalysis: PolicyFitnessAnalysis;
        optimizationSuggestions: OptimizationSuggestions;
      }>(response.text);
  } catch (e) {
      console.error("Error generating policy driven concept:", e);
      throw e;
  }
};

export const completeConceptionSummary = async (
  proposal: Proposal,
  aiTone: AITone
): Promise<Partial<Proposal['conceptionSummary']> | null> => {
  const summary = proposal.conceptionSummary;
  const filledFields = Object.entries(summary).filter(([, value]) => value && value.trim() !== '');
  const emptyFields = Object.keys(summary).filter(key => !summary[key as keyof typeof summary] || summary[key as keyof typeof summary].trim() === '');

  if (emptyFields.length === 0) {
    return null; // All fields are filled
  }

  const prompt = `Given the following partially filled project conception, please complete the empty fields.
  
  Project Title: ${proposal.title}
  
  Existing Information:
  ${filledFields.map(([key, value]) => `- ${key}: ${value}`).join('\n')}
  
  Fields to complete:
  ${emptyFields.join(', ')}
  
  Based on the existing information, provide detailed and professional content for the empty fields.
  Return a JSON object containing ONLY the completed fields and their generated text. For example, if you are completing "benefits" and "why", the response should be:
  { "benefits": "...", "why": "..." }
  `;

  const schemaProperties: Record<string, { type: Type }> = {};
  emptyFields.forEach(field => {
      schemaProperties[field] = { type: Type.STRING };
  });

  const schema = {
      type: Type.OBJECT,
      properties: schemaProperties,
      required: emptyFields,
  };

  try {
      // FIX: Add explicit generic type to callGeminiWithRetry to ensure correct type inference for `response`.
      const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: prompt,
          config: {
              systemInstruction: TONE_INSTRUCTIONS[aiTone],
              responseMimeType: 'application/json',
              responseSchema: schema,
          },
      }));
      return safeJsonParse<Partial<Proposal['conceptionSummary']>>(response.text);
  } catch (e) {
      console.error("Error completing conception summary:", e);
      throw e;
  }
};


// --- Helper for Stage 2 Table Generation ---
const generateTable = async (
    prompt: string,
    aiTone: AITone,
    llmProvider: LLMProvider
): Promise<Record<string, string>[]> => {
    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                responseMimeType: 'application/json',
            },
        }));
        const result = safeJsonParse<Record<string, string>[]>(response.text);
        if (!result) throw new Error("Failed to parse table from AI response.");
        return result;
    } catch (e) {
        console.error("Error generating table after retries:", e);
        throw e;
    }
};

// --- Functions for Stage2Analysis.tsx ---
export const generatePolicyTable = (p: Proposal, t: AITone, l: LLMProvider) => generateTable(`Create a "Policy Correspondence" table for this project: ${p.title} - ${p.conceptionSummary.what}. Columns: '政策名稱', '年份', '關聯目標', '本案對應作法'. Generate 2-3 relevant entries. Return as a JSON array of objects.`, t, l);
export const generateTrlTable = (p: Proposal, t: AITone, l: LLMProvider) => generateTable(`Create a "Technology Readiness Level (TRL)" table for this project: ${p.title} - ${p.conceptionSummary.what}. Columns: '技術模組', 'TRL 等級', '驗證環境', '待補項'. Generate 1-2 key entries. Return as a JSON array of objects.`, t, l);
export const generateMarketTable = (p: Proposal, t: AITone, l: LLMProvider) => generateTable(`Create a "Market Opportunity" table for this project: ${p.title} - ${p.conceptionSummary.whoNeedsIt}. Columns: '客群', '規模', '增長率', '競品', '差異化'. Generate 1-2 key entries. Return as a JSON array of objects.`, t, l);
export const generateResourceTable = (p: Proposal, t: AITone, l: LLMProvider) => generateTable(`Create a "Resource Inventory" table for this project: ${p.title} - ${p.conceptionSummary.what}. Columns: '資源', '內容'. Generate entries for '人力' and '數據'. Return as a JSON array of objects.`, t, l);
export const generateKpiTable = (p: Proposal, t: AITone, l: LLMProvider) => generateTable(`Create a "KPI Draft" table for this project, based on its benefits: "${p.conceptionSummary.benefits}". Columns: '指標', '基準值', '目標值', '驗證方式'. Generate 2-3 key KPIs. Return as a JSON array of objects.`, t, l);
export const generateBudgetPlan = (p: Proposal, t: AITone, l: LLMProvider) => generateTable(`Create a high-level "Budget Plan" table for this project: ${p.title}. Columns: '項目', '預估金額 (TWD)', '說明'. Generate 3-4 major items like '人事費用', '研發費用', '行銷費用'. Return as a JSON array of objects.`, t, l);
export const generateRiskMatrix = (p: Proposal, t: AITone, l: LLMProvider) => generateTable(`Create a "Risk Matrix" table for this project: ${p.title}. Columns: '風險類型', '風險描述', '緩解方案'. Generate 2-3 potential risks (e.g., 技術, 市場, 法規). Return as a JSON array of objects.`, t, l);

export const performThematicResearch = async (topic: string, aiTone: AITone, llmProvider: LLMProvider): Promise<string> => {
    const prompt = `Perform thematic research on the following topic: "${topic}". Use Google Search to find relevant data, market trends, and key players. Synthesize the findings into a concise report formatted in markdown. Include key statistics and sources where possible.`;
    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                tools: [{ googleSearch: {} }],
            },
        }));
        return response.text;
    } catch (e) {
        console.error("Error performing thematic research after retries:", e);
        throw e;
    }
};

export const generateSwotAnalysis = async (proposal: Proposal, aiTone: AITone, llmProvider: LLMProvider): Promise<SwotAnalysis | null> => {
    const prompt = `Generate a professional and in-depth SWOT analysis for the following project.
Project Title: ${proposal.title}
Project Conception Summary: ${JSON.stringify(proposal.conceptionSummary)}

Provide the output in a single JSON object with the following structure. Be insightful and data-driven.

- "strengths": Array of 3-4 strings detailing key internal strengths.
- "weaknesses": Array of 3-4 strings detailing key internal weaknesses.
- "opportunities": Array of 3-4 strings detailing key external opportunities.
- "threats": Array of 3-4 strings detailing key external threats.
- "scores": An object with scores:
    - "strengths": number (0-30), reflecting the magnitude of strengths.
    - "opportunities": number (0-20), reflecting the potential of opportunities.
    - "weaknesses": number (0-30), reflecting the severity of weaknesses (higher is worse).
    - "threats": number (0-20), reflecting the severity of threats (higher is worse).
    - "total": number (0-100), calculated as: strengths + opportunities + (30 - weaknesses) + (20 - threats).
- "radarData": An object with scores (0-100) for a radar chart:
    - "strategyCompleteness": How comprehensive and coherent the project strategy is.
    - "overallCompetitiveness": The project's overall competitive position in the market.
    - "strengthScore": A score representing the project's strengths.
    - "weaknessControl": How well the project can control or mitigate its weaknesses.
    - "opportunityScore": How well the project is positioned to seize opportunities.
    - "threatDefense": How resilient the project is against external threats.
- "bestCaseScenario": An object with "title" (a short, optimistic title) and "points" (an array of 3-4 strings describing the scenario). This scenario should leverage strengths to capitalize on opportunities (S-O strategy).
- "worstCaseScenario": An object with "title" (a short, pessimistic title) and "points" (an array of 3-4 strings describing the scenario). This scenario highlights the impact of threats on weaknesses (W-T strategy).
`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
            threats: { type: Type.ARRAY, items: { type: Type.STRING } },
            scores: {
                type: Type.OBJECT,
                properties: {
                    strengths: { type: Type.NUMBER },
                    opportunities: { type: Type.NUMBER },
                    weaknesses: { type: Type.NUMBER },
                    threats: { type: Type.NUMBER },
                    total: { type: Type.NUMBER },
                },
                required: ['strengths', 'opportunities', 'weaknesses', 'threats', 'total'],
            },
            radarData: {
                type: Type.OBJECT,
                properties: {
                    strategyCompleteness: { type: Type.NUMBER },
                    overallCompetitiveness: { type: Type.NUMBER },
                    strengthScore: { type: Type.NUMBER },
                    weaknessControl: { type: Type.NUMBER },
                    opportunityScore: { type: Type.NUMBER },
                    threatDefense: { type: Type.NUMBER },
                },
                required: ['strategyCompleteness', 'overallCompetitiveness', 'strengthScore', 'weaknessControl', 'opportunityScore', 'threatDefense'],
            },
            bestCaseScenario: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    points: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['title', 'points'],
            },
            worstCaseScenario: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    points: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['title', 'points'],
            },
        },
        required: ['strengths', 'weaknesses', 'opportunities', 'threats', 'scores', 'radarData', 'bestCaseScenario', 'worstCaseScenario'],
    };
    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                responseMimeType: 'application/json',
                responseSchema: schema,
            },
        }));
        return safeJsonParse<SwotAnalysis>(response.text);
    } catch (e) {
        console.error("Error generating SWOT analysis after retries:", e);
        throw e;
    }
};

export const parseOutlineAndSuggestChapters = async (
  file: UploadedFile,
  aiTone: AITone
): Promise<{ title: string; templateKey: string }[] | null> => {
  const templateKeys = ['background', 'innovation', 'kpi', 'tech', 'market', 'execution', 'budget', 'risk', 'esg'];
  const prompt = `Analyze the following document which is a project outline. 
  Identify the main chapter titles. Ignore sub-sections (e.g., "1.1", "1.2.3", "a)", "(i)").
  For each main chapter title you identify, also suggest the most relevant template key from this list: [${templateKeys.join(', ')}]. If no template seems relevant, use an empty string for the templateKey.

  Return a JSON array of objects, where each object has two keys: "title" (the chapter title you identified) and "templateKey" (the most relevant key from the list).
  
  Example response:
  [
    { "title": "計畫背景與目的", "templateKey": "background" },
    { "title": "市場分析與競爭策略", "templateKey": "market" },
    { "title": "附錄", "templateKey": "" }
  ]`;

  const promptParts: Part[] = [{ text: prompt }, { inlineData: { mimeType: file.mimeType, data: file.content } }];

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        templateKey: { type: Type.STRING },
      },
      required: ['title', 'templateKey'],
    },
  };

  try {
    const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: promptParts }],
      config: {
        systemInstruction: TONE_INSTRUCTIONS[aiTone],
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    }));
    return safeJsonParse<{ title: string; templateKey: string }[]>(response.text);
  } catch (e) {
    console.error("Error parsing outline document:", e);
    throw e;
  }
};


// --- Functions for Stage3Writing.tsx ---
export const generateChapterContent = async (proposal: Proposal, chapterTitle: string, aiTone: AITone, userInput?: string, templateKey?: string): Promise<string> => {
    let prompt = `Based on the proposal's core concept AND the user's specific notes for this chapter, automatically generate the full content for the chapter.
Proposal Title: ${proposal.title}
Core Concept (Why, What, Who, Benefits): ${JSON.stringify(proposal.conceptionSummary, null, 2)}
Chapter to Write: "${chapterTitle}"`;

    if (userInput && userInput.trim()) {
      prompt += `\n\nUSER'S NOTES/DRAFT (This is the most important context, expand on this): """${userInput}"""`;
    }

    // New logic for template boilerplate
    if (templateKey && (!userInput || !userInput.trim())) {
      prompt = `The user has created a new chapter "${chapterTitle}" using the "${templateKey}" template.
Generate a structured boilerplate/outline for this chapter in markdown format. 
Include headings, subheadings, and placeholder text like "[請在此說明...]" to guide the user on what to fill in.
Do not write a full draft, only the template structure.`;
    } else if (templateKey) {
        prompt += `\n\nIMPORTANT: Structure the content based on the "${templateKey}" template's focus. For example, a 'market' template should focus on market analysis, competitors, and opportunities. An 'execution' template should detail the methodology, timeline, and milestones.`;
    }

    prompt += `\n\nPlease provide a comprehensive draft for this chapter, adhering to the professional tone of a grant writer. The content should be structured, clear, and directly address the chapter's topic.`;

    try {
        const response: GenerateContentResponse = await callGeminiWithRetry(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction: TONE_INSTRUCTIONS[aiTone] },
        }));
        return response.text;
    } catch (e) {
        console.error(`Error generating content for chapter "${chapterTitle}":`, e);
        throw e;
    }
};

export const refineChapterContent = async (chapterTitle: string, chapterContent: string, aiTone: AITone): Promise<string> => {
    const prompt = `Refine and improve the following chapter content.
Chapter: "${chapterTitle}"
Original Content: "${chapterContent}"
Focus on strengthening policy alignment and improving logical flow. Enhance the professional tone and clarity. Return only the improved content.`;

    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                thinkingConfig: { thinkingBudget: 32768 },
            },
        }));
        return response.text;
    } catch (e) {
        console.error(`Error refining content for chapter "${chapterTitle}":`, e);
        throw e;
    }
};


export const generateReviewerFeedback = async (content: string, title: string, aiTone: AITone, llmProvider: LLMProvider): Promise<{ reviewerQuestions: string; strengtheningSuggestions: string; }> => {
    const prompt = `Review the following chapter content from the proposal "${title}".
Content: "${content}"
Provide feedback from a reviewer's perspective. Return a JSON object with two keys: "reviewerQuestions" (a string with 2-3 likely questions) and "strengtheningSuggestions" (a string with concrete suggestions for improvement).`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            reviewerQuestions: { type: Type.STRING },
            strengtheningSuggestions: { type: Type.STRING },
        },
        required: ['reviewerQuestions', 'strengtheningSuggestions'],
    };
    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                responseMimeType: 'application/json',
                responseSchema: schema,
            },
        }));
        const result = safeJsonParse<{ reviewerQuestions: string; strengtheningSuggestions: string; }>(response.text);
        if (!result) throw new Error("Failed to parse reviewer feedback.");
        return result;
    } catch (e) {
        console.error("Error generating reviewer feedback after retries:", e);
        throw e;
    }
};

export const runGapCheck = async (content: string, proposalTitle: string, chapterTitle: string, aiTone: AITone, llmProvider: LLMProvider): Promise<string> => {
    const prompt = `Review the following chapter for completeness and identify any missing key information that a grant reviewer would expect to see.
Proposal Title: "${proposalTitle}"
Chapter: "${chapterTitle}"
Content: "${content.substring(0, 2000)}..."

Provide a brief report on any gaps or missing information. If there are no gaps, confirm that the chapter appears complete. Format the response in markdown.`;
    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction: TONE_INSTRUCTIONS[aiTone] },
        }));
        return response.text;
    } catch (e) {
        console.error("Error running gap check:", e);
        throw e;
    }
};

export const generateTechnicalHighlights = async (proposal: Proposal, aiTone: AITone, llmProvider: LLMProvider): Promise<string> => {
    const prompt = `Based on the entire proposal context, generate a concise "Technical Highlights" or "Innovation Highlights" section.
Proposal Title: "${proposal.title}"
Core Concept: ${JSON.stringify(proposal.conceptionSummary)}
This section should be a few paragraphs long, suitable for inclusion in a summary or technical chapter.
Focus on the most innovative aspects and quantifiable benefits. Format the response in markdown.`;
    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction: TONE_INSTRUCTIONS[aiTone] },
        }));
        return response.text;
    } catch (e) {
        console.error("Error generating technical highlights:", e);
        throw e;
    }
};

export const reviewFullProposal = async (proposal: Proposal, aiTone: AITone, llmProvider: LLMProvider): Promise<{ chapterTitle: string; feedback: string; }[] | null> => {
    const chapterData = proposal.chapters.map(c => ({ title: c.title, content: c.content.substring(0, 1000) + '...' }));
    const prompt = `
    As a grant proposal expert, review the entire structure of the following proposal titled "${proposal.title}".
    The proposal has the following chapters:
    ${JSON.stringify(chapterData, null, 2)}

    For each chapter, provide concise feedback on its structure, clarity, and alignment with overall policy goals.
    Your feedback should be in a "comment" format, like a reviewer adding notes in the margin.
    Focus on how well each chapter contributes to the overall narrative and persuasive power of the proposal.

    Return your feedback as a JSON array of objects, where each object has two keys: "chapterTitle" (the exact title of the chapter) and "feedback" (your review comment as a string).
    `;

    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                chapterTitle: { type: Type.STRING },
                feedback: { type: Type.STRING }
            },
            required: ['chapterTitle', 'feedback']
        }
    };

    try {
        const response: GenerateContentResponse = await callGeminiWithRetry(() => ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                responseMimeType: 'application/json',
                responseSchema: schema,
                thinkingConfig: { thinkingBudget: 32768 },
            },
        }));
        return safeJsonParse<{ chapterTitle: string; feedback: string; }[]>(response.text);
    } catch (e) {
        console.error("Error reviewing full proposal after retries:", e);
        throw e;
    }
};

// --- Functions for Stage4Review.tsx ---
export const simulateReviewerQuestions = async (proposalText: string, title: string, scoringCriteria: ScoringCriterion[], aiTone: AITone, llmProvider: LLMProvider): Promise<string[]> => {
    const prompt = `Act as a critical reviewer for the proposal "${title}". Based on the full proposal text and the following scoring criteria, generate a list of 5-7 challenging questions you would ask during a review meeting.
Proposal Text: "${proposalText.substring(0, 4000)}..."
Scoring Criteria: ${JSON.stringify(scoringCriteria)}
Return a JSON array of strings.`;
    const schema = {
        type: Type.ARRAY,
        items: { type: Type.STRING }
    };
    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                responseMimeType: 'application/json',
                responseSchema: schema,
            },
        }));
        const result = safeJsonParse<string[]>(response.text);
        if (!result) throw new Error("Failed to parse reviewer questions.");
        return result;
    } catch (e) {
        console.error("Error simulating reviewer questions after retries:", e);
        throw e;
    }
};

export const predictScoresForCriterion = async (proposalText: string, criterion: ScoringCriterion, aiTone: AITone, llmProvider: LLMProvider): Promise<PredictedScores | null> => {
    const prompt = `Evaluate a proposal based on a specific scoring criterion.
Proposal Text: "${proposalText.substring(0, 4000)}..."
Criterion to evaluate: ${JSON.stringify(criterion)}

Provide scores (0-100) and brief justifications. Return a JSON object matching the specified schema.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            criterionScore: {
                type: Type.OBJECT,
                properties: {
                    score: { type: Type.NUMBER },
                    justification: { type: Type.STRING },
                },
                required: ['score', 'justification'],
            },
            questionScores: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        score: { type: Type.NUMBER },
                        justification: { type: Type.STRING },
                    },
                    required: ['id', 'score', 'justification'],
                }
            }
        },
        required: ['criterionScore', 'questionScores'],
    };
    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                responseMimeType: 'application/json',
                responseSchema: schema,
            },
        }));
        return safeJsonParse<PredictedScores>(response.text);
    } catch (e) {
        console.error("Error predicting scores after retries:", e);
        throw e;
    }
};

// --- Functions for Stage5Finalize.tsx ---
const generateText = async (prompt: string, aiTone: AITone): Promise<string> => {
    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction: TONE_INSTRUCTIONS[aiTone] },
        }));
        return response.text;
    } catch (e) {
        console.error("Error in generateText after retries:", e);
        throw e;
    }
};

export const generateSummary = (text: string, title: string, tone: AITone) => generateText(`Generate a one-page executive summary for the proposal "${title}". Full text: "${text.substring(0, 4000)}..."`, tone);
export const generatePitch = (text: string, title: string, tone: AITone) => generateText(`Create a compelling 3-minute pitch script for the proposal "${title}". Full text: "${text.substring(0, 4000)}..."`, tone);
export const generateHighlightSummary = (proposal: Proposal, tableData: TableData, tone: AITone) => generateText(`Create a one-page highlight summary for the proposal "${proposal.title}", combining the core concept with key data from tables like market size and KPIs. Concept: ${JSON.stringify(proposal.conceptionSummary)}. Tables: ${JSON.stringify(tableData, null, 2).substring(0, 2000)}. Format it as a visually appealing, scannable document using markdown.`, tone);
export const generatePresentationDeck = (summary: Proposal['conceptionSummary'], tone: AITone) => generateText(`Create a 5-slide presentation outline (deck skeleton) based on the project's conception summary. For each slide, provide a title and 3-4 bullet points. Conception Summary: ${JSON.stringify(summary)}`, tone);

// --- Functions for Stage6Comparison.tsx ---
export const compareProposals = async (projects: Proposal[], scoringCriteria: ScoringCriterion[], aiTone: AITone, llmProvider: LLMProvider): Promise<ComparisonData | null> => {
    const prompt = `Compare the following grant proposals based on the provided scoring criteria.
Projects: ${JSON.stringify(projects.map(p => ({id: p.id, title: p.title, summary: p.conceptionSummary.what})))}
Scoring Criteria: ${JSON.stringify(scoringCriteria)}
Full Proposal Content (for context): ${JSON.stringify(projects.map(p => ({id: p.id, content: p.chapters.map(c => c.content).join(' ').substring(0, 1000)})))}

Return a single JSON object with two keys:
1. "scores": An object where each key is a projectId. The value is another object where each key is a criterionId. The value for this is an object with "score" (0-100) and a brief "justification".
2. "summary": A high-level executive summary comparing the projects and recommending a winner, with justification.`;

    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                responseMimeType: "application/json",
                thinkingConfig: { thinkingBudget: 32768 },
            },
        }));
        return safeJsonParse<ComparisonData>(response.text);
    } catch (e) {
        console.error("Error comparing proposals after retries:", e);
        throw e;
    }
};

// --- Functions for LearningModal.tsx ---
export const learnFromExample = async (exampleText: string, learningGoal: string, aiTone: AITone, llmProvider: LLMProvider): Promise<string> => {
    const prompt = `Analyze the provided example text based on the user's learning goal.
Example Text: "${exampleText}"
Learning Goal: "${learningGoal}"
Provide a detailed analysis, extracting key patterns, structures, and successful techniques. Offer a reusable template or checklist based on your findings. Format the response in markdown.`;
    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: { 
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                thinkingConfig: { thinkingBudget: 32768 },
            },
        }));
        return response.text;
    } catch (e) {
        console.error("Error learning from example after retries:", e);
        throw e;
    }
};

// --- Functions for StageInspiration.tsx ---
export const generateInspirationReport = async (inputs: InspirationInputs, uploadedFiles: UploadedFile[], aiTone: AITone, llmProvider: LLMProvider): Promise<InspirationReport | null> => {
    const prompt = `Generate a comprehensive "Inspiration and Feasibility Report" based on the user's inputs. Use Google Search to enrich the analysis with real-world data and examples.
User Inputs: ${JSON.stringify(inputs, null, 2)}

Return a single JSON object with the specified structure. The 'kpiSuggestions' should be an array of objects with keys '指標', '量化成果', '可驗證方式'.`;
    
    const promptParts: Part[] = [{ text: prompt }];
    for (const file of uploadedFiles) {
        if (file.content) {
            promptParts.push({ 
                inlineData: { 
                    mimeType: file.mimeType, 
                    data: file.content 
                } 
            });
        }
    }
    
    try {
        // FIX: Add explicit generic type to callGeminiWithRetry to ensure correct type inference for `response`.
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: promptParts }],
            config: {
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                tools: [{ googleSearch: {} }],
            },
        }));

        const parsed = safeJsonParse<any>((response as GenerateContentResponse).text);
        if (!parsed) return null;

        const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.map((chunk: any) => chunk.web && { title: chunk.web.title, uri: chunk.web.uri })
            .filter(Boolean) ?? [];

        return { ...parsed, groundingSources };
    } catch (e) {
        console.error("Error generating inspiration report after retries:", e);
        throw e;
    }
};


// --- Functions for StageStrategyPositioning.tsx ---
export const suggestIndustry = async (inputs: IndustrySuggestInputs, aiTone: AITone, llmProvider: LLMProvider): Promise<IndustrySuggestion | null> => {
    const prompt = `Based on the following business idea, and using Google Search for the most up-to-date information, suggest the best industry positioning for seeking government grants in Taiwan.
Inputs: ${JSON.stringify(inputs)}
Return a JSON object with keys: "industryClassification", "mainDepartment", "grantThemes" (array of strings), "predictedGrantType", "consultantAdvice".`;
    
    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                tools: [{ googleSearch: {} }],
            },
        }));
        return safeJsonParse<IndustrySuggestion>(response.text);
    } catch (e) {
        console.error("Error suggesting industry after retries:", e);
        throw e;
    }
};

export const analyzeGrantDocument = async (documentText: string, aiTone: AITone, llmProvider: LLMProvider): Promise<GrantAnalysisReport | null> => {
    const prompt = `Analyze the following Taiwanese grant document text.
Document: "${documentText.substring(0, 5000)}..."
Extract key information and return it as a JSON object with keys: "title", "department", "deadline" (in YYYY-MM-DD format), "summary" (plain language summary), "eligibility" (key eligibility criteria), "reviewFocus" (what reviewers will focus on), and "keywords" (an array of important keywords).`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            department: { type: Type.STRING },
            deadline: { type: Type.STRING },
            summary: { type: Type.STRING },
            eligibility: { type: Type.STRING },
            reviewFocus: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['title', 'department', 'deadline', 'summary', 'eligibility', 'reviewFocus', 'keywords'],
    };
    try {
        // FIX: Add explicit generic type to callGeminiWithRetry to ensure correct type inference for `response`.
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                responseMimeType: 'application/json',
                responseSchema: schema,
            },
        }));
        return safeJsonParse<GrantAnalysisReport>(response.text);
    } catch (e) {
        console.error("Error analyzing grant document after retries:", e);
        throw e;
    }
};

export const analyzeImportedDocument = async (documentText: string, aiTone: AITone): Promise<{ title: string; conceptionSummary: Proposal['conceptionSummary'] } | null> => {
    const prompt = `Analyze the following grant proposal document.
Document: "${documentText.substring(0, 8000)}..."
Your tasks are:
1.  Suggest a concise and professional project title based on the content.
2.  Extract the core concepts and populate a "Conception Summary" object with the following keys: "why", "what", "whoNeedsIt", "whatToVerify", "benefits". For each of these fields, synthesize a detailed and comprehensive paragraph (around 50-80 words) from the document that captures the essence of that concept.

Return a single JSON object with two keys: "title" (a string) and "conceptionSummary" (an object).`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            conceptionSummary: {
                type: Type.OBJECT,
                properties: {
                    why: { type: Type.STRING },
                    what: { type: Type.STRING },
                    whoNeedsIt: { type: Type.STRING },
                    whatToVerify: { type: Type.STRING },
                    benefits: { type: Type.STRING },
                },
                required: ['why', 'what', 'whoNeedsIt', 'whatToVerify', 'benefits'],
            },
        },
        required: ['title', 'conceptionSummary'],
    };

    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                responseMimeType: 'application/json',
                responseSchema: schema,
                thinkingConfig: { thinkingBudget: 16384 }
            },
        }));
        return safeJsonParse<{ title: string; conceptionSummary: Proposal['conceptionSummary'] }>(response.text);
    } catch (e) {
        console.error("Error analyzing imported document:", e);
        throw e;
    }
};


export const generateStrategyFitAnalysis = async (idea: string, painPoint: string, files: UploadedFile[], aiTone: AITone, llmProvider: LLMProvider): Promise<StrategyFitResult | null> => {
    const promptText = `As a grant reviewer, analyze the fit between a project idea and a grant document.

Project Idea: "${idea}"
Problem to Solve: "${painPoint}"

Analyze against the provided grant document(s) across these 7 dimensions and provide a score from 0-100 for each:
1.  **policyFit**: How well does the idea align with the grant's stated policy goals?
2.  **scopeAlignment**: Is the project's scope (technical work, deliverables) within the grant's specified range?
3.  **eligibility**: Based on the idea, does the applicant profile seem to match the eligibility criteria?
4.  **techReadiness**: Does the proposed technology's maturity level fit the grant's expectations (e.g., research vs. commercialization)?
5.  **impactKPI**: Can the idea generate the kind of quantifiable impact/KPIs the grant is looking for?
6.  **budgetMatch**: Does the scale of the idea seem appropriate for the likely budget range of this grant?
7.  **timelineFit**: Is the project's likely duration compatible with the grant's timeline?

Based on these scores, calculate an 'overallScore'.

Return a single JSON object with two keys:
- "overallScore": A number from 0-100.
- "radar": An object with the 7 dimension scores (policyFit, scopeAlignment, etc.).
`;

    const promptParts: Part[] = [{ text: promptText }];
    for (const file of files) {
        if (file.content) {
            promptParts.push({ 
                inlineData: { 
                    mimeType: file.mimeType, 
                    data: file.content 
                } 
            });
        }
    }

    const schema = {
      type: Type.OBJECT,
      properties: {
        overallScore: { type: Type.NUMBER },
        radar: {
          type: Type.OBJECT,
          properties: {
            policyFit: { type: Type.NUMBER },
            scopeAlignment: { type: Type.NUMBER },
            eligibility: { type: Type.NUMBER },
            techReadiness: { type: Type.NUMBER },
            impactKPI: { type: Type.NUMBER },
            budgetMatch: { type: Type.NUMBER },
            timelineFit: { type: Type.NUMBER },
          },
          required: ['policyFit', 'scopeAlignment', 'eligibility', 'techReadiness', 'impactKPI', 'budgetMatch', 'timelineFit'],
        },
      },
      required: ['overallScore', 'radar'],
    };

    try {
        const response = await callGeminiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: promptParts }],
            config: {
                systemInstruction: TONE_INSTRUCTIONS[aiTone],
                responseMimeType: 'application/json',
                responseSchema: schema,
            },
        }));
        const result = safeJsonParse<StrategyFitResult>(response.text);
        if (result && files.length > 0) {
            result.grantName = files[0].name.replace(/\.[^/.]+$/, ""); // Use first file name as grant name
        }
        return result;
    } catch (e) {
        console.error("Error generating strategy fit analysis after retries:", e);
        throw e;
    }
};

export const fetchDataSupport = async (
  topic: string,
  proposalContext: Proposal,
  aiTone: AITone
): Promise<DataSupportResult | null> => {
  const prompt = `Based on the proposal context, find statistical data to support the following topic.
Proposal Title: "${proposalContext.title}"
Topic to research: "${topic}"

Your tasks are:
1. Use Google Search to find relevant government or industry statistical data (including year, source, and key figures).
2. Create a "Statistical Summary Table" from your findings.
3. Write a "Supplementary Paragraph" that incorporates the key data with proper inline citations, like "(Source, Year)".
4. Create a "Reference List" in a formal format.

Return the result as a single JSON object with three keys: "summaryTable" (an array of objects), "supplementaryParagraph" (a string), and "referenceList" (a string).
Example JSON structure:
\`\`\`json
{
  "summaryTable": [
    {"資料項目": "2023年台灣餐飲業營業額", "數值": "新台幣 8,112 億元", "來源": "經濟部統計處"},
    {"資料項目": "行動支付普及率", "數值": "72.4%", "來源": "資策會MIC"}
  ],
  "supplementaryParagraph": "根據經濟部統計處資料，2023年台灣餐飲業營業額已達新台幣 8,112 億元，顯示市場規模龐大。同時，高達 72.4% 的行動支付普及率（資策會MIC, 2023）為智慧點餐系統提供了良好的發展基礎。",
  "referenceList": "- 經濟部統計處 (2024)。《餐飲業營業額統計》。網址：https://...\\n- 財團法人資訊工業策進會產業情報研究所(MIC) (2023)。《行動支付消費者調查》。網址：https://..."
}
\`\`\`
`;

  try {
    const response: GenerateContentResponse = await callGeminiWithRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: TONE_INSTRUCTIONS[aiTone],
        tools: [{ googleSearch: {} }],
      },
    }));
    
    const result = safeJsonParse<DataSupportResult>((response as GenerateContentResponse).text);
    return result;

  } catch (e) {
    console.error("Error fetching data support:", e);
    throw e;
  }
};

export const generateStakeholderTable = (p: Proposal, t: AITone, l: LLMProvider) => generateTable(`Create a "Stakeholder Analysis" table for this project: ${p.title}. Columns: '利害關係人', '類型', '期望與需求', '影響力', '溝通策略'. Generate 3-4 key stakeholders. Return as a JSON array of objects.`, t, l);
export const generateIpStrategyTable = (p: Proposal, t: AITone, l: LLMProvider) => generateTable(`Create an "Intellectual Property Strategy" table for this project: ${p.title}. Columns: 'IP 標的', 'IP 類型', '目前狀態', '保護策略'. Identify 2-3 potential IP assets. Return as a JSON array of objects.`, t, l);
export const generateEsgMetricsTable = (p: Proposal, t: AITone, l: LLMProvider) => generateTable(`Create an "ESG/Sustainability Metrics" table for this project: ${p.title}. Columns: '面向 (E/S/G)', '指標項目', '本案貢獻', '衡量方式'. Generate 2-3 relevant metrics. Return as a JSON array of objects.`, t, l);
export const generateProjectMilestonesTable = (p: Proposal, t: AITone, l: LLMProvider) => generateTable(`Create a high-level "Project Milestones" table for a 12-month project: ${p.title}. Columns: '階段', '主要任務', '預計時程 (月)', '交付成果'. Generate 3-4 major phases. Return as a JSON array of objects.`, t, l);