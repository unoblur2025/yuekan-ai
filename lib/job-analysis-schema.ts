import type { ProfileAnswers, SkillLevel } from "./analysis-data";
import { buildSkillMatches, calculateProfileRadar, mentionsSkill, skillNamesInText } from "./skill-matching";

export type RequirementType = "明确硬门槛" | "核心岗位要求" | "企业偏好" | "普通加分项" | "未明确";
export type GateStatus = "符合" | "不符合" | "达到要求" | "存在能力差距" | "满足偏好" | "未满足偏好，但不构成硬门槛" | "已具备加分项" | "暂未具备加分项" | "存在风险" | "未明确";
export type SkillGapStatus = "已达到岗位要求" | "部分匹配，仍需补充" | "证据不足" | "不参与匹配" | "已具备偏好能力" | "暂未提供偏好能力证据" | "岗位方向相关";
export type SkillRequirementType = "核心岗位要求" | "企业偏好" | "普通加分项" | "方向兴趣" | "未提及";
export interface SkillMatch {
  skill: string;
  requiredLevel: 0 | SkillLevel;
  personalLevel: 0 | SkillLevel;
  requirementType: SkillRequirementType;
  sourceText: string;
  evidenceText: string;
  status: SkillGapStatus;
  advice: string;
}

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
  skillMatches: SkillMatch[];
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
export function validateAnalysis(raw: unknown, input: JobAnalysisInput, rules: DeterministicRules): JobAnalysisResult {
  if (!raw || typeof raw !== "object") throw new Error("模型没有返回有效的 JSON 对象");
  const data = raw as Record<string, unknown>;
  const skillMatches = buildSkillMatches(input);
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
  const gateChecks = rules.gateChecks.length ? rules.gateChecks : [];
  const jdSkillNames = new Set(skillMatches.filter(item => item.requiredLevel > 0).map(item => item.skill));
  const keepsOnlyJdSkills = (value: string) => skillNamesInText(value).every(skill => jdSkillNames.has(skill));
  const hardFailures = gateChecks.filter(check => check.type === "明确硬门槛" && check.status === "不符合");
  const preferenceChecks = gateChecks.filter(check => check.type === "企业偏好" || check.type === "普通加分项");
  const preferenceMisses = gateChecks.filter(check => (check.type === "企业偏好" || check.type === "普通加分项") && (check.status === "未满足偏好，但不构成硬门槛" || check.status === "暂未具备加分项"));
  const modelHardRequirements = list(data.hardRequirements, []);
  const overlapsPreference = (value: string) => preferenceMisses.some(check => check.item === "毕业年份" ? /毕业|20\d{2}\s*届/.test(value) : value.includes(check.item.replace("限制", "")));
  const resolvedHardRequirements = Array.from(new Set([
    ...gateChecks.filter(check => check.type === "明确硬门槛").map(check => check.sourceText),
    ...modelHardRequirements.filter(value => !/优先|更佳|加分|倾向|有则更好/.test(value) && !overlapsPreference(value) && keepsOnlyJdSkills(value)),
  ])).slice(0, 10);
  const resolvedBonusItems = Array.from(new Set([
    ...skillMatches.filter(item => item.requirementType === "企业偏好" || item.requirementType === "普通加分项").map(item => item.sourceText),
    ...list(data.bonusItems, []).filter(value => keepsOnlyJdSkills(value) && !preferenceChecks.some(check => check.sourceText === value && ["学历要求", "毕业年份", "每周到岗", "实习周期", "专业限制"].includes(check.item))),
  ])).slice(0, 10);
  const requiredSkillGaps = skillMatches.filter(item => item.requirementType === "核心岗位要求" && (item.status === "部分匹配，仍需补充" || item.status === "证据不足"));
  const modelTopRisk = text(data.topRisk, "岗位要求与个人项目证据之间仍有差距");
  const topRiskMentionsPreference = preferenceChecks.some(check => modelTopRisk.includes(check.item.replace("限制", "")) || (check.item === "毕业年份" && /毕业|届/.test(modelTopRisk)) || (check.item === "实习周期" && /实习|周期|月份/.test(modelTopRisk)));
  const topRiskHasUnsupportedSkill = mentionsSkill(modelTopRisk) && !requiredSkillGaps.some(item => modelTopRisk.includes(item.skill));
  const resolvedTopRisk = hardFailures[0]?.reason || requiredSkillGaps[0]?.advice || (topRiskMentionsPreference || topRiskHasUnsupportedSkill ? "当前主要风险为岗位能力与项目证据仍需补充" : modelTopRisk);
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
    .map(risk => ({ title: softenPreferenceLanguage(risk.title), detail: softenPreferenceLanguage(risk.detail) }))
    .filter(risk => !mentionsSkill(`${risk.title}${risk.detail}`) || requiredSkillGaps.some(item => `${risk.title}${risk.detail}`.includes(item.skill)));
  const reachedCapabilities = skillMatches.filter(item => item.status === "已达到岗位要求").map(item => `${item.skill} 已达到岗位要求`);
  const capabilityGaps = skillMatches.filter(item => item.status === "部分匹配，仍需补充").map(item => item.advice);
  const missingEvidence = skillMatches.filter(item => item.status === "证据不足").map(item => item.advice);
  const modelWhyMayNotFit = softenPreferenceLanguage(text(data.whyMayNotFit, "部分能力或实习条件仍需进一步核实。"));
  const whyMayNotFit = mentionsSkill(modelWhyMayNotFit) && !requiredSkillGaps.some(item => modelWhyMayNotFit.includes(item.skill))
    ? (requiredSkillGaps.map(item => item.advice).join("；") || "暂未发现 JD 明确技能要求上的能力差距")
    : modelWhyMayNotFit;
  const beforeApplying = Array.from(new Set([
    ...list(data.beforeApplying, []).filter(item => !mentionsSkill(item) || requiredSkillGaps.some(skill => item.includes(skill.skill))),
    ...requiredSkillGaps.map(item => item.advice),
  ])).slice(0, 8);
  const hasUnsupportedSkillText = (value: string) => skillNamesInText(value).some(skill => !jdSkillNames.has(skill));
  const safeSummary = hasUnsupportedSkillText(resolvedSummary)
    ? `已根据 JD 明确要求完成匹配；用户自报但 JD 未提及的技能仅作为个人能力展示，不参与岗位匹配。${preferenceMisses.length ? "未满足的企业偏好不构成硬门槛。" : ""}`
    : resolvedSummary;
  const modelWhyWorthApplying = text(data.whyWorthApplying, "岗位方向与用户目标存在交集，值得结合风险尝试。");
  const whyWorthApplying = hasUnsupportedSkillText(modelWhyWorthApplying) ? "岗位方向与用户目标存在交集，可结合 JD 明确要求与个人经历尝试申请。" : modelWhyWorthApplying;
  const safeRecommendation = hasUnsupportedSkillText(resolvedRecommendation) ? (hardFailures.length ? `谨慎申请，主要风险为${hardFailures[0].item}` : "建议结合明确门槛与岗位职责综合判断") : resolvedRecommendation;
  return {
    fitScore: score(data.fitScore, 50),
    matchGrade: text(data.matchGrade, "B"),
    recommendation: softenPreferenceLanguage(safeRecommendation),
    priority: resolvedPriority,
    confidence: text(data.confidence, "中等"),
    summary: softenPreferenceLanguage(safeSummary),
    roleDirection: text(data.roleDirection, input.jobTitle),
    coreGoal: text(data.coreGoal, "理解业务需求并推动 AI 产品落地"),
    plainExplanation: text(data.plainExplanation, "该岗位需要把业务问题转化为可执行的 AI 产品方案。"),
    serviceAudience: text(data.serviceAudience, "业务用户与产品团队"),
    dailyWork: list(data.dailyWork, ["需求分析", "方案设计", "测试与迭代"]),
    commonOutputs: list(data.commonOutputs, ["产品文档", "原型", "测试记录"]),
    radar: calculateProfileRadar(input),
    hardRequirements: resolvedHardRequirements.length ? resolvedHardRequirements : ["JD 未发现明确淘汰型硬门槛"],
    coreCapabilities: list(data.coreCapabilities, ["需求分析", "产品理解"]).filter(keepsOnlyJdSkills),
    shortTermSkills: list(data.shortTermSkills, ["补充岗位相关实操"]).filter(keepsOnlyJdSkills),
    bonusItems: resolvedBonusItems.length ? resolvedBonusItems : ["相关行业或项目经验"],
    reachedCapabilities,
    transferableCapabilities: list(data.transferableCapabilities, ["复杂问题拆解", "资料整理"]),
    capabilityGaps,
    missingEvidence,
    skillMatches,
    gateChecks,
    hiddenRisks: resolvedHiddenRisks,
    topRisk: resolvedTopRisk,
    whyWorthApplying,
    whyMayNotFit,
    beforeApplying: beforeApplying.length ? beforeApplying : ["整理与 JD 明确要求相关的项目证据", "核实硬门槛"],
    estimatedPreparationTime: text(data.estimatedPreparationTime, "6–8 小时"),
    preparationPlan72h: preparationPlan72h.length ? preparationPlan72h : [
      { day: "第 1 天", tasks: ["拆解 JD 与硬门槛"], hours: "2 小时" },
      { day: "第 2 天", tasks: ["补充核心能力实操"], hours: "3 小时" },
      { day: "第 3 天", tasks: ["准备项目表达与模拟面试"], hours: "3 小时" },
    ],
    interviewQuestions: interviewQuestions.length ? interviewQuestions : [{ category: "岗位匹配", question: `为什么你适合 ${input.jobTitle}？`, probability: "高", purpose: "考察岗位理解与能力证据" }],
  };
}
