import type { JobAnalysisResult } from "./job-analysis-schema";

export type SkillLevel = 1 | 2 | 3;
export type ProfileAnswers = Record<string, string | string[] | Record<string, SkillLevel>>;

export interface AnalysisRecord {
  id: string;
  createdAt: string;
  profile: ProfileAnswers;
  jobTitle: string;
  companyName: string;
  city: string;
  jd: string;
  skills: string[];
  skillLevels: Record<string, SkillLevel>;
  fitScore: number;
  matchGrade: string;
  recommendation: string;
  priority: string;
  topRisk: string;
  report: { direction: string; summary: string };
  plan: string[];
  companyResearch: { business: string; aiDirection: string };
  interviewQuestionIds: string[];
  // AI 记录以 analysis 为唯一事实来源；顶层分析字段仅供旧页面和历史数据兼容。
  analysis?: JobAnalysisResult;
  analysisSource?: "ai" | "demo";
}

export const STORAGE = {
  profile: "yuekan-profile-v2",
  current: "yuekan-current-analysis-v2",
  history: "yuekan-analysis-history-v2",
  legacy: "shikan-profile",
  step: "yuekan-profile-step-v2",
  activeId: "yuekan-active-analysis-id-v2",
  pending: "yuekan-pending-analysis-v2",
};

export const levelNames: Record<SkillLevel, string> = { 1: "了解", 2: "熟悉", 3: "熟练操作" };

const demoProfile: ProfileAnswers = {
  degree: "本科", major: "建筑 / 规划 / 设计", grad: "2027 届", direction: ["AI 产品", "RAG / 知识库"], city: "苏州",
  arrival: "两周以内", days: "5 天", months: "4 个月", office: "线下", code: "能使用 AI Coding 制作 Demo", internship: "1 段", projects: "2 个",
  skills: ["Prompt Engineering", "RAG", "PRD", "用户调研", "Figma", "Agent"],
  skillLevels: { "Prompt Engineering": 3, RAG: 2, PRD: 3, "用户调研": 2, Figma: 2, Agent: 1 },
};

export function createRecord(profile: ProfileAnswers, demo = false): AnalysisRecord {
  const skills = Array.isArray(profile.skills) ? profile.skills as string[] : [];
  const rawLevels = profile.skillLevels && !Array.isArray(profile.skillLevels) && typeof profile.skillLevels === "object" ? profile.skillLevels as Record<string, SkillLevel> : {};
  const skillLevels = Object.fromEntries(skills.map(s => [s, rawLevels[s] || 1])) as Record<string, SkillLevel>;
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    profile,
    jobTitle: String(profile.job || (demo ? "AI 产品实习生" : "未命名岗位")),
    companyName: String(profile.company || (demo ? "示例科技公司" : "未填写企业")),
    city: String(profile.jobCity || profile.city || (demo ? "苏州" : "城市未填写")),
    jd: String(profile.jd || ""), skills, skillLevels,
    fitScore: 82, matchGrade: "A", recommendation: "建议优先投递", priority: "高",
    topRisk: "Agent 实操与技术协作证据不足",
    report: { direction: "AI 产品 + 企业知识库", summary: "你的项目和能力可以覆盖岗位主要工作，当前短板以可补能力为主，暂未发现明显淘汰型硬门槛。" },
    plan: ["补充 Agent Workflow Demo", "整理 RAG 评估记录", "准备项目证据与业务案例"],
    companyResearch: { business: "企业数字化与知识服务", aiDirection: "企业知识库与业务 AI 助手" },
    interviewQuestionIds: Array.from({ length: 15 }, (_, i) => `q${i + 1}`),
  };
}

export const demoRecord = createRecord({ ...demoProfile, job: "AI 产品实习生", company: "示例科技公司", jobCity: "苏州" }, true);

function parse<T>(raw: string | null, fallback: T): T { try { return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; } }

export function loadProfile(): ProfileAnswers {
  if (typeof window === "undefined") return {};
  const current = parse<ProfileAnswers>(localStorage.getItem(STORAGE.profile), {});
  if (Object.keys(current).length) return normalizeProfile(current);
  const legacy = parse<ProfileAnswers>(localStorage.getItem(STORAGE.legacy), {});
  if (Object.keys(legacy).length) { const migrated = normalizeProfile(legacy); localStorage.setItem(STORAGE.profile, JSON.stringify(migrated)); return migrated; }
  return {};
}

export function normalizeProfile(profile: ProfileAnswers): ProfileAnswers {
  const skills = Array.isArray(profile.skills) ? profile.skills as string[] : [];
  const raw = profile.skillLevels && !Array.isArray(profile.skillLevels) && typeof profile.skillLevels === "object" ? profile.skillLevels as Record<string, SkillLevel> : {};
  return { ...profile, skills, skillLevels: Object.fromEntries(skills.map(s => [s, raw[s] || 1])) };
}

export function saveProfile(profile: ProfileAnswers) { if (typeof window !== "undefined") localStorage.setItem(STORAGE.profile, JSON.stringify(normalizeProfile(profile))); }
export function loadCurrent(): AnalysisRecord | null { return typeof window === "undefined" ? null : parse<AnalysisRecord | null>(localStorage.getItem(STORAGE.current), null); }
export function loadHistory(): AnalysisRecord[] { return typeof window === "undefined" ? [] : parse<AnalysisRecord[]>(localStorage.getItem(STORAGE.history), []).map(r => ({ ...r, skillLevels: r.skillLevels || Object.fromEntries((r.skills || []).map(s => [s, 1])) })); }
export function setCurrent(record: AnalysisRecord) { if (typeof window !== "undefined") localStorage.setItem(STORAGE.current, JSON.stringify(record)); }
export function completeAnalysis(profile: ProfileAnswers): AnalysisRecord { const record = createRecord(normalizeProfile(profile)); setCurrent(record); const history = loadHistory(); localStorage.setItem(STORAGE.history, JSON.stringify([record, ...history])); return record; }
export function saveAIAnalysis(profile: ProfileAnswers, analysis: JobAnalysisResult): AnalysisRecord {
  const normalized = normalizeProfile(profile);
  const record = createRecord(normalized);
  const authoritativeAnalysis = analysis;

  // 唯一事实来源：新页面必须读取 record.analysis，不得基于顶层兼容字段重新做业务判断。
  record.analysis = authoritativeAnalysis;
  record.analysisSource = "ai";

  // 兼容快照：旧页面和历史记录仍依赖这些字段，所有值均直接来自同一次 analysis。
  record.fitScore = authoritativeAnalysis.fitScore;
  record.matchGrade = authoritativeAnalysis.matchGrade;
  record.recommendation = authoritativeAnalysis.recommendation;
  record.priority = authoritativeAnalysis.priority;
  record.topRisk = authoritativeAnalysis.topRisk;
  record.report = { direction: authoritativeAnalysis.roleDirection, summary: authoritativeAnalysis.summary };

  // 旧功能入口所需的兼容投影，不作为分析结论来源。
  record.plan = authoritativeAnalysis.preparationPlan72h.flatMap(day => day.tasks);
  record.interviewQuestionIds = authoritativeAnalysis.interviewQuestions.map((_, i) => `ai-q${i + 1}`);

  // current 与 history 序列化的是同一个 record，权威结果和兼容快照不会跨分析混用。
  setCurrent(record);
  const history = loadHistory();
  localStorage.setItem(STORAGE.history, JSON.stringify([record, ...history]));
  return record;
}
export function selectHistoryRecord(id: string) { const record = loadHistory().find(r => r.id === id); if (record) { setCurrent(record); saveProfile(record.profile); saveProfileStep(4); localStorage.setItem(STORAGE.activeId, id); } return record || null; }
export function deleteHistoryRecord(id: string) { if (typeof window !== "undefined") localStorage.setItem(STORAGE.history, JSON.stringify(loadHistory().filter(r => r.id !== id))); }
export function loadProfileStep() { if (typeof window === "undefined") return 1; const value=Number(localStorage.getItem(STORAGE.step)); return value>=1&&value<=4?value:1; }
export function saveProfileStep(step: number) { if (typeof window !== "undefined") localStorage.setItem(STORAGE.step, String(Math.max(1,Math.min(4,step)))); }
export function resetCurrentAnalysis() {
  if (typeof window === "undefined") return;
  [STORAGE.profile,STORAGE.current,STORAGE.legacy,STORAGE.step,STORAGE.activeId,STORAGE.pending,"activeAnalysisId"].forEach(key=>localStorage.removeItem(key));
}
export function clearDraft() { resetCurrentAnalysis(); }
