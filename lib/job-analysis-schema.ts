import type { ProfileAnswers, SkillLevel } from "./analysis-data";

export type RequirementType = "明确硬门槛" | "核心岗位要求" | "企业偏好" | "普通加分项" | "未明确";
export type GateStatus = "符合" | "不符合" | "达到要求" | "存在能力差距" | "满足偏好" | "未满足偏好，但不构成硬门槛" | "已具备加分项" | "暂未具备加分项" | "存在风险" | "未明确";
export type SkillGapStatus = "已达到岗位要求" | "具备基础，但存在轻度差距" | "当前能力差距";

export interface JobAnalysisInput {
  degree: string;
  major: string;
  graduationYear: string;
  targetDirections: string[];
  targetCity: string;
  earliestStart: string;
  daysPerWeek: string;
  internshipDuration: string;
  workMode: string;
  skills: Array<{ name: string; level: SkillLevel }>;
  codingAbility: string;
  internshipCount: string;
  projectCount: string;
  jobTitle: string;
  companyName: string;
  jobCity: string;
  jd: string;
}

export interface JobAnalysisResult {
  fitScore: number;
  matchGrade: string;
  recommendation: string;
  priority: string;
  confidence: string;
  summary: string;
  roleDirection: string;
  coreGoal: string;
  plainExplanation: string;
  serviceAudience: string;
  dailyWork: string[];
  commonOutputs: string[];
  radar: {
    aiTechnology: number;
    product: number;
    business: number;
    data: number;
    coding: number;
    communication: number;
  };
  hardRequirements: string[];
  coreCapabilities: string[];
  shortTermSkills: string[];
  bonusItems: string[];
  reachedCapabilities: string[];
  transferableCapabilities: string[];
  capabilityGaps: string[];
  missingEvidence: string[];
  skillMatches: Array<{
    skill: string;
    requiredLevel: SkillLevel;
    personalLevel: 0 | SkillLevel;
    status: SkillGapStatus;
    advice: string;
  }>;
  gateChecks: Array<{ item: string; sourceText: string; type: RequirementType; userCondition: string; status: GateStatus; reason: string }>;
  hiddenRisks: Array<{ title: string; detail: string }>;
  topRisk: string;
  whyWorthApplying: string;
  whyMayNotFit: string;
  beforeApplying: string[];
  estimatedPreparationTime: string;
  preparationPlan72h: Array<{ day: string; tasks: string[]; hours: string }>;
  interviewQuestions: Array<{ category: string; question: string; probability: string; purpose: string }>;
}

export interface DeterministicRules {
  gateChecks: JobAnalysisResult["gateChecks"];
  notes: string[];
}

export function profileToAnalysisInput(profile: ProfileAnswers): JobAnalysisInput {
  const names = Array.isArray(profile.skills) ? profile.skills as string[] : [];
  const levels = profile.skillLevels && !Array.isArray(profile.skillLevels) && typeof profile.skillLevels === "object"
    ? profile.skillLevels as Record<string, SkillLevel> : {};
  const directions = Array.isArray(profile.direction) ? profile.direction as string[] : profile.direction ? [String(profile.direction)] : [];
  return {
    degree: String(profile.degree || "未填写"),
    major: String(profile.major || "未填写"),
    graduationYear: String(profile.grad || "未填写"),
    targetDirections: directions,
    targetCity: String(profile.city || "不限"),
    earliestStart: String(profile.arrival || "未填写"),
    daysPerWeek: String(profile.days || "未填写"),
    internshipDuration: String(profile.months || "未填写"),
    workMode: String(profile.office || "未填写"),
    skills: names.map(name => ({ name, level: levels[name] || 1 })),
    codingAbility: String(profile.code || "未填写"),
    internshipCount: String(profile.internship || "未填写"),
    projectCount: String(profile.projects || "未填写"),
    jobTitle: String(profile.job || ""),
    companyName: String(profile.company || "未填写企业"),
    jobCity: String(profile.jobCity || "未填写城市"),
    jd: String(profile.jd || ""),
  };
}

const text = (value: unknown, fallback: string) => typeof value === "string" && value.trim() ? value.trim() : fallback;
const list = (value: unknown, fallback: string[]) => Array.isArray(value)
  ? value.filter((x): x is string => typeof x === "string" && Boolean(x.trim())).map(x => x.trim()).slice(0, 20)
  : typeof value === "string" && value.trim() ? value.split(/[\n、,，;；]+/).map(x => x.trim()).filter(Boolean).slice(0, 20) : fallback;
const score = (value: unknown, fallback: number) => {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace("%", "")) : NaN;
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100, Math.round(numeric))) : fallback;
};
const level = (value: unknown, fallback: SkillLevel): SkillLevel => {
  const numeric = typeof value === "string" ? Number(value) : value;
  return numeric === 1 || numeric === 2 || numeric === 3 ? numeric : fallback;
};

export function validateAnalysis(raw: unknown, input: JobAnalysisInput, rules: DeterministicRules): JobAnalysisResult {
  if (!raw || typeof raw !== "object") throw new Error("模型没有返回有效的 JSON 对象");
  const data = raw as Record<string, unknown>;
  const radar = data.radar && typeof data.radar === "object" ? data.radar as Record<string, unknown> : {};
  const skillMatches = Array.isArray(data.skillMatches) ? data.skillMatches.map((item) => {
    const x = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const requiredLevel = level(x.requiredLevel, 1);
    const personalRaw = x.personalLevel;
    const personalLevel: 0 | SkillLevel = personalRaw === 0 ? 0 : level(personalRaw, 1);
    const difference = personalLevel - requiredLevel;
    const status: SkillGapStatus = difference >= 0 ? "已达到岗位要求" : difference === -1 ? "具备基础，但存在轻度差距" : "当前能力差距";
    return { skill: text(x.skill, "未命名技能"), requiredLevel, personalLevel, status, advice: text(x.advice, status === "已达到岗位要求" ? "整理项目证据" : "补充针对性学习与实操") };
  }).filter(x => x.skill !== "未命名技能").slice(0, 20) : [];
  const hiddenRisks = Array.isArray(data.hiddenRisks) ? data.hiddenRisks.map(item => {
    if (typeof item === "string") return { title: item, detail: "建议在面试中进一步确认。" };
    const x = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return { title: text(x.title, "待确认风险"), detail: text(x.detail, "建议在面试中进一步确认。") };
  }).slice(0, 12) : [];
  const preparationPlan72h = Array.isArray(data.preparationPlan72h) ? data.preparationPlan72h.map((item, i) => {
    const x = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return { day: text(x.day, `第 ${i + 1} 天`), tasks: list(x.tasks, ["完成针对性准备任务"]), hours: text(x.hours, "2 小时") };
  }).slice(0, 3) : [];
  const interviewQuestions = Array.isArray(data.interviewQuestions) ? data.interviewQuestions.map(item => {
    if (typeof item === "string") return { category: "岗位匹配", question: item, probability: "中", purpose: "考察岗位理解与能力证据" };
    const x = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return { category: text(x.category, "岗位匹配"), question: text(x.question, "请介绍你与该岗位最匹配的经历。"), probability: text(x.probability, "中"), purpose: text(x.purpose, "考察岗位匹配与表达能力") };
  }).slice(0, 20) : [];
  const safeSkillMatches = skillMatches.length ? skillMatches : input.skills.map(item => ({
    skill: item.name,
    requiredLevel: 1 as SkillLevel,
    personalLevel: item.level as 0 | SkillLevel,
    status: "已达到岗位要求" as SkillGapStatus,
    advice: item.level === 3 ? "保持优势，并整理真实项目证据" : "当前具备基础，请补充可验证的项目证据",
  }));
  const gateChecks = rules.gateChecks.length ? rules.gateChecks : [];
  const hardFailures = gateChecks.filter(check => check.type === "明确硬门槛" && check.status === "不符合");
  const preferenceMisses = gateChecks.filter(check => (check.type === "企业偏好" || check.type === "普通加分项") && (check.status === "未满足偏好，但不构成硬门槛" || check.status === "暂未具备加分项"));
  const modelHardRequirements = list(data.hardRequirements, []);
  const overlapsPreference = (value: string) => preferenceMisses.some(check => check.item === "毕业年份" ? /毕业|20\d{2}\s*届/.test(value) : value.includes(check.item.replace("限制", "")));
  const resolvedHardRequirements = Array.from(new Set([
    ...gateChecks.filter(check => check.type === "明确硬门槛").map(check => check.sourceText),
    ...modelHardRequirements.filter(value => !/优先|更佳|加分|倾向|有则更好/.test(value) && !overlapsPreference(value)),
  ])).slice(0, 10);
  const resolvedBonusItems = Array.from(new Set([
    ...gateChecks.filter(check => check.type === "企业偏好" || check.type === "普通加分项").map(check => check.sourceText),
    ...list(data.bonusItems, []),
  ])).slice(0, 10);
  const modelTopRisk = text(data.topRisk, "岗位要求与个人项目证据之间仍有差距");
  const topRiskMentionsPreference = preferenceMisses.some(check => modelTopRisk.includes(check.item.replace("限制", "")) || (check.item === "毕业年份" && /毕业|届/.test(modelTopRisk)));
  const resolvedTopRisk = hardFailures[0]?.reason || (topRiskMentionsPreference ? "当前主要风险为岗位能力与项目证据仍需补充" : modelTopRisk);
  const resolvedRecommendation = hardFailures.length ? `谨慎申请，主要风险为${hardFailures[0].item}` : text(data.recommendation, "建议结合风险审慎决策");
  const resolvedPriority = hardFailures.length ? "中" : text(data.priority, "中");
  const baseSummary = text(data.summary, `已完成对 ${input.jobTitle} 的岗位分析，建议重点核实硬门槛与项目证据。`);
  const resolvedSummary = preferenceMisses.length ? `${baseSummary} 未满足的企业偏好不构成淘汰型硬门槛。` : baseSummary;
  const softenPreferenceLanguage = (value: string) => preferenceMisses.reduce((result, check) => {
    if (check.item === "毕业年份") {
      return result
        .replace(/毕业年份(?:不符合|不匹配|不满足)/g, "未满足毕业年份偏好（不构成硬门槛）")
        .replace(/不符合(?:岗位)?毕业年份要求/g, "未满足毕业年份偏好（不构成硬门槛）");
    }
    if (check.item === "专业限制") {
      return result
        .replace(/专业(?:不符合|不匹配|不满足)/g, "未满足专业偏好（不构成硬门槛）")
        .replace(/不符合(?:岗位)?专业要求/g, "未满足专业偏好（不构成硬门槛）");
    }
    return result;
  }, value);
  const resolvedHiddenRisks = (hiddenRisks.length ? hiddenRisks : [{ title: "岗位边界待确认", detail: "建议确认实际工作内容与职位名称是否一致。" }])
    .map(risk => ({ title: softenPreferenceLanguage(risk.title), detail: softenPreferenceLanguage(risk.detail) }));
  return {
    fitScore: score(data.fitScore, 50),
    matchGrade: text(data.matchGrade, "B"),
    recommendation: softenPreferenceLanguage(resolvedRecommendation),
    priority: resolvedPriority,
    confidence: text(data.confidence, "中等"),
    summary: softenPreferenceLanguage(resolvedSummary),
    roleDirection: text(data.roleDirection, input.jobTitle),
    coreGoal: text(data.coreGoal, "理解业务需求并推动 AI 产品落地"),
    plainExplanation: text(data.plainExplanation, "该岗位需要把业务问题转化为可执行的 AI 产品方案。"),
    serviceAudience: text(data.serviceAudience, "业务用户与产品团队"),
    dailyWork: list(data.dailyWork, ["需求分析", "方案设计", "测试与迭代"]),
    commonOutputs: list(data.commonOutputs, ["产品文档", "原型", "测试记录"]),
    radar: {
      aiTechnology: score(radar.aiTechnology, 50), product: score(radar.product, 50), business: score(radar.business, 50),
      data: score(radar.data, 50), coding: score(radar.coding, 50), communication: score(radar.communication, 50),
    },
    hardRequirements: resolvedHardRequirements.length ? resolvedHardRequirements : ["JD 未发现明确淘汰型硬门槛"],
    coreCapabilities: list(data.coreCapabilities, ["需求分析", "产品理解"]),
    shortTermSkills: list(data.shortTermSkills, ["补充岗位相关实操"]),
    bonusItems: resolvedBonusItems.length ? resolvedBonusItems : ["相关行业或项目经验"],
    reachedCapabilities: list(data.reachedCapabilities, []),
    transferableCapabilities: list(data.transferableCapabilities, ["复杂问题拆解", "资料整理"]),
    capabilityGaps: list(data.capabilityGaps, ["需要补充岗位相关实操"]),
    missingEvidence: list(data.missingEvidence, ["需要补充可验证的项目证据"]),
    skillMatches: safeSkillMatches,
    gateChecks,
    hiddenRisks: resolvedHiddenRisks,
    topRisk: resolvedTopRisk,
    whyWorthApplying: text(data.whyWorthApplying, "岗位方向与用户目标存在交集，值得结合风险尝试。"),
    whyMayNotFit: softenPreferenceLanguage(text(data.whyMayNotFit, "部分能力或实习条件仍需进一步核实。")),
    beforeApplying: list(data.beforeApplying, ["整理项目证据", "核实硬门槛"]),
    estimatedPreparationTime: text(data.estimatedPreparationTime, "6–8 小时"),
    preparationPlan72h: preparationPlan72h.length ? preparationPlan72h : [
      { day: "第 1 天", tasks: ["拆解 JD 与硬门槛"], hours: "2 小时" },
      { day: "第 2 天", tasks: ["补充核心能力实操"], hours: "3 小时" },
      { day: "第 3 天", tasks: ["准备项目表达与模拟面试"], hours: "3 小时" },
    ],
    interviewQuestions: interviewQuestions.length ? interviewQuestions : [{ category: "岗位匹配", question: `为什么你适合 ${input.jobTitle}？`, probability: "高", purpose: "考察岗位理解与能力证据" }],
  };
}
