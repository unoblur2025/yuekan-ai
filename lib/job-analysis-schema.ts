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
  const keepsOnlyJdSkills = (value: string) => {
    const mentionedSkills = skillNamesInText(value);
    return mentionedSkills.length > 0 && mentionedSkills.every(skill => jdSkillNames.has(skill));
  };
  const hasNoUnsupportedJdSkills = (value: string) => !mentionsSkill(value) || keepsOnlyJdSkills(value);
  const compactJd = input.jd.replace(/\s+/g, "").toLowerCase();
  const hasJdTextEvidence = (value: string) => {
    const compactValue = value.replace(/\s+/g, "").toLowerCase();
    if (compactValue.length >= 2 && compactJd.includes(compactValue)) return true;
    const latinTerms = compactValue.match(/[a-z][a-z0-9+#.-]{1,}/g) || [];
    const chinesePhrases = compactValue.match(/[\u4e00-\u9fff]{4,}/g) || [];
    const chineseWindows = chinesePhrases.flatMap(phrase => Array.from({ length: phrase.length - 3 }, (_, index) => phrase.slice(index, index + 4)));
    return [...latinTerms, ...chineseWindows].some(term => compactJd.includes(term));
  };
  const hardFailures = gateChecks.filter(check => check.type === "明确硬门槛" && check.status === "不符合");
  const preferenceChecks = gateChecks.filter(check => check.type === "企业偏好" || check.type === "普通加分项");
  const preferenceMisses = gateChecks.filter(check => (check.type === "企业偏好" || check.type === "普通加分项") && (check.status === "未满足偏好，但不构成硬门槛" || check.status === "暂未具备加分项"));
  const modelHardRequirements = list(data.hardRequirements, []);
  const overlapsPreference = (value: string) => preferenceMisses.some(check => check.item === "毕业年份" ? /毕业|20\d{2}\s*届/.test(value) : value.includes(check.item.replace("限制", "")));
  type HardRequirementField = "学历要求" | "毕业年份" | "每周到岗" | "实习周期" | "专业限制";
  const knownHardRequirementFields: HardRequirementField[] = ["学历要求", "毕业年份", "每周到岗", "实习周期", "专业限制"];
  const hardRequirementFieldsFor = (value: string): HardRequirementField[] => knownHardRequirementFields.filter(field => {
    if (field === "学历要求") return /学历|本科|硕士|博士|专科|学信网/.test(value);
    if (field === "毕业年份") return /毕业年份|应届|20\d{2}\s*届/.test(value);
    if (field === "每周到岗") return /每周.{0,12}(?:到岗|出勤|工作).{0,8}[1-7]\s*天|到岗.{0,8}[1-7]\s*天/.test(value);
    if (field === "实习周期") return /连续实习|实习.{0,15}(?:个?月|半年)/.test(value);
    return /专业|学科|专业背景|相关背景/.test(value);
  });
  const informationScore = (value: string) => value.length
    + (/（[^）]+）|\([^)]*\)/.test(value) ? 20 : 0)
    + (/必须|仅限|只招|限定|至少|不接受|学信网|可查|连续|以上/.test(value) ? 10 : 0);
  const selectedByField = new Map<HardRequirementField, { text: string; fromGateCheck: boolean }>();
  const selectForField = (field: HardRequirementField, textValue: string, fromGateCheck: boolean) => {
    const current = selectedByField.get(field);
    if (!current || (fromGateCheck && !current.fromGateCheck) || (fromGateCheck === current.fromGateCheck && informationScore(textValue) > informationScore(current.text))) {
      selectedByField.set(field, { text: textValue, fromGateCheck });
    }
  };
  const unknownHardRequirements: string[] = [];
  gateChecks.filter(check => check.type === "明确硬门槛").forEach(check => {
    const field = knownHardRequirementFields.includes(check.item as HardRequirementField) ? check.item as HardRequirementField : null;
    if (field) selectForField(field, check.sourceText, true);
    else unknownHardRequirements.push(check.sourceText);
  });
  modelHardRequirements
    .filter(value => !/优先|更佳|加分|倾向|有则更好/.test(value) && !overlapsPreference(value) && hasNoUnsupportedJdSkills(value))
    .forEach(value => {
      const fields = hardRequirementFieldsFor(value);
      if (fields.length) fields.forEach(field => selectForField(field, value, false));
      else unknownHardRequirements.push(value);
    });
  const resolvedHardRequirements = Array.from(new Set([
    ...knownHardRequirementFields.flatMap(field => selectedByField.get(field)?.text || []),
    ...unknownHardRequirements,
  ])).slice(0, 10);
  const resolvedBonusItems = Array.from(new Set([
    ...skillMatches.filter(item => item.requirementType === "企业偏好" || item.requirementType === "普通加分项").map(item => item.sourceText),
    ...list(data.bonusItems, []).filter(value => hasNoUnsupportedJdSkills(value) && !preferenceChecks.some(check => check.sourceText === value && ["学历要求", "毕业年份", "每周到岗", "实习周期", "专业限制"].includes(check.item))),
  ])).slice(0, 10);
  const requiredSkillGaps = skillMatches.filter(item => item.requirementType === "核心岗位要求" && (item.status === "部分匹配，仍需补充" || item.status === "证据不足"));
  const deterministicCoreCapabilities = skillMatches
    .filter(item => item.requirementType === "核心岗位要求" && item.requiredLevel > 0)
    .map(item => item.skill);
  const capabilityKey = (value: string) => value.toLowerCase()
    .replace(/负责|参与|完成|撰写|设计|搭建|输出|制定|推动|落地|熟悉|掌握|具备|相关|核心|能力|经验/g, "")
    .replace(/[\s、，,；;：:（）()\-_/]/g, "");
  const resolvedCoreCapabilities: string[] = [];
  const coreCapabilityKeys = new Set<string>();
  const addCoreCapability = (value: string) => {
    const key = capabilityKey(value) || value.toLowerCase().trim();
    if (!key || coreCapabilityKeys.has(key)) return;
    coreCapabilityKeys.add(key);
    resolvedCoreCapabilities.push(value);
  };
  deterministicCoreCapabilities.forEach(addCoreCapability);
  list(data.coreCapabilities, [])
    .filter(value => skillNamesInText(value).length === 0 && hasJdTextEvidence(value))
    .forEach(addCoreCapability);
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
  const mentionsCheck = (value: string, item: string) => {
    if (item === "学历要求") return /学历|本科|硕士|博士|专科/.test(value);
    if (item === "毕业年份") return /毕业|届别|应届|20\d{2}\s*届/.test(value);
    if (item === "每周到岗") return /每周|到岗|出勤|工作天数/.test(value);
    if (item === "实习周期") return /实习周期|实习时长|连续实习|实习.{0,8}(?:月|半年)/.test(value);
    if (item === "专业限制") return /专业|学科|专业背景/.test(value);
    return value.includes(item.replace("限制", "").replace("要求", ""));
  };
  const unclearChecks = gateChecks.filter(check => check.type === "未明确" || check.status === "未明确");
  const conflictsWithFinalJudgment = (value: string) => {
    const mentionsUnsupportedSkill = mentionsSkill(value) && !requiredSkillGaps.some(item => value.includes(item.skill));
    const mentionsPreferenceOrBonus = preferenceChecks.some(check => mentionsCheck(value, check.item));
    const mentionsUnclearField = unclearChecks.some(check => mentionsCheck(value, check.item));
    const genericUnverifiedRisk = /条件不明确|条件未明确|信息不明确|未说明|尚未说明|可能不符合|存在潜在风险|需警惕/.test(value);
    return mentionsUnsupportedSkill || mentionsPreferenceOrBonus || mentionsUnclearField || genericUnverifiedRisk;
  };
  const resolvedHiddenRisks = hiddenRisks
    .map(risk => ({ title: softenPreferenceLanguage(risk.title), detail: softenPreferenceLanguage(risk.detail) }))
    .filter(risk => {
      const value = `${risk.title}${risk.detail}`;
      return !conflictsWithFinalJudgment(value) && hasJdTextEvidence(value);
    });
  const effectiveNegativeEvidence = {
    hardFailures,
    coreSkillGaps: requiredSkillGaps,
    hiddenRisks: resolvedHiddenRisks,
  };
  const resolvedRecommendation = effectiveNegativeEvidence.hardFailures.length
    ? `谨慎申请，主要风险为${effectiveNegativeEvidence.hardFailures[0].item}`
    : effectiveNegativeEvidence.coreSkillGaps.length
      ? "建议投递前补充核心技能证据"
      : effectiveNegativeEvidence.hiddenRisks.length
        ? "建议投递前核实已识别风险"
        : "建议投递";
  const resolvedSummary = effectiveNegativeEvidence.hardFailures.length
    ? `存在明确硬门槛不符合：${effectiveNegativeEvidence.hardFailures[0].reason}`
    : effectiveNegativeEvidence.coreSkillGaps.length
      ? `未发现明确硬门槛失败；当前核心差距：${effectiveNegativeEvidence.coreSkillGaps[0].advice}`
      : effectiveNegativeEvidence.hiddenRisks.length
        ? `未发现明确硬门槛或核心技能差距；需关注：${effectiveNegativeEvidence.hiddenRisks[0].title}`
        : "未发现明确硬门槛失败、核心技能差距或有 JD 依据的隐藏风险。";
  const resolvedTopRisk = hardFailures[0]?.reason
    || requiredSkillGaps[0]?.advice
    || (resolvedHiddenRisks[0] ? `${resolvedHiddenRisks[0].title}：${resolvedHiddenRisks[0].detail}` : "当前未发现有 JD 依据的明确风险");
  const reachedCapabilities = skillMatches.filter(item => item.status === "已达到岗位要求").map(item => `${item.skill} 已达到岗位要求`);
  const capabilityGaps = skillMatches.filter(item => item.status === "部分匹配，仍需补充").map(item => item.advice);
  const missingEvidence = skillMatches.filter(item => item.status === "证据不足").map(item => item.advice);
  const resolvedShortTermSkills = requiredSkillGaps.map(item => item.advice);
  const structuredWhyMayNotFit = hardFailures.map(item => item.reason)
    .concat(requiredSkillGaps.map(item => item.advice))
    .concat(resolvedHiddenRisks.slice(0, 1).map(item => `${item.title}：${item.detail}`));
  const whyMayNotFit = structuredWhyMayNotFit.length
    ? structuredWhyMayNotFit.join("；")
    : "当前未发现有 JD 依据的明确不适配项";
  const beforeApplying = Array.from(new Set([
    ...hardFailures.map(item => `核实${item.item}：${item.reason}`),
    ...requiredSkillGaps.map(item => item.advice),
    ...resolvedHiddenRisks.slice(0, 2).map(item => `面试确认${item.title}`),
  ])).slice(0, 8);
  const hasUnsupportedSkillText = (value: string) => skillNamesInText(value).some(skill => !jdSkillNames.has(skill));
  const modelWhyWorthApplying = text(data.whyWorthApplying, "岗位方向与用户目标存在交集，值得结合风险尝试。");
  const whyWorthApplying = hasUnsupportedSkillText(modelWhyWorthApplying) ? "岗位方向与用户目标存在交集，可结合 JD 明确要求与个人经历尝试申请。" : modelWhyWorthApplying;
  const modelFitScore = score(data.fitScore, 50);
  const resolvedFitScore = hardFailures.length ? Math.min(modelFitScore, 59) : modelFitScore;
  const resolvedMatchGrade = hardFailures.length ? "C" : text(data.matchGrade, "B");
  const normalizedMatchGrade = resolvedMatchGrade.trim().toUpperCase();
  const resolvedPriority = hardFailures.length || resolvedFitScore < 60 || normalizedMatchGrade === "C"
    ? "低"
    : (resolvedFitScore >= 80 || normalizedMatchGrade === "A") && requiredSkillGaps.length <= 1 && resolvedHiddenRisks.length === 0
      ? "高"
      : "中";
  type RoleEvidence = { pattern: RegExp; strong: boolean };
  const productRoleEvidence: RoleEvidence[] = [
    { pattern: /产品规划|产品路线规划|产品路线图/, strong: true },
    { pattern: /产品设计/, strong: false },
    { pattern: /\bPRD\b|产品需求文档/i, strong: true },
    { pattern: /需求分析/, strong: false },
    { pattern: /需求调研|用户调研/, strong: false },
    { pattern: /原型设计|产品原型/, strong: true },
    { pattern: /产品迭代/, strong: false },
  ];
  const operationsRoleEvidence: RoleEvidence[] = [
    { pattern: /内容运营/, strong: true },
    { pattern: /用户运营/, strong: false },
    { pattern: /社群运营/, strong: true },
    { pattern: /活动运营|运营活动/, strong: true },
    { pattern: /增长运营|用户增长/, strong: true },
    { pattern: /拉新/, strong: false },
    { pattern: /留存/, strong: false },
    { pattern: /转化/, strong: false },
    { pattern: /投放/, strong: false },
    { pattern: /渠道运营/, strong: false },
    { pattern: /运营策略/, strong: false },
  ];
  const finalCoreSkillEvidence = skillMatches
    .filter(item => item.requirementType === "核心岗位要求" && item.requiredLevel > 0)
    .map(item => `${item.skill} ${item.evidenceText}`)
    .join("\n");
  const roleEvidenceText = `${input.jd}\n${finalCoreSkillEvidence}`;
  const matchedRoleEvidence = (definitions: RoleEvidence[]) => definitions.filter(item => item.pattern.test(roleEvidenceText));
  const productEvidence = matchedRoleEvidence(productRoleEvidence);
  const operationsEvidence = matchedRoleEvidence(operationsRoleEvidence);
  const evidenceScore = (items: RoleEvidence[]) => items.reduce((total, item) => total + (item.strong ? 2 : 1), 0);
  const productScore = evidenceScore(productEvidence);
  const operationsScore = evidenceScore(operationsEvidence);
  const productTitle = /AI\s*产品(?:实习生|经理|负责人)?/i.test(input.jobTitle) && !/运营/.test(input.jobTitle);
  const modelRoleDirection = text(data.roleDirection, input.jobTitle);
  const resolvedRoleDirection = productEvidence.length >= 2 && operationsEvidence.length === 0
    ? "AI产品"
    : operationsEvidence.length >= 2 && productEvidence.length === 0
      ? "AI产品运营"
      : productEvidence.length > 0 && operationsEvidence.length > 0 && productTitle && productEvidence.length >= 2 && productScore >= operationsScore
        ? "AI产品"
        : productEvidence.length > 0 && operationsEvidence.length > 0 && productScore > operationsScore
          ? "AI产品"
          : productEvidence.length > 0 && operationsEvidence.length > 0 && operationsScore > productScore
            ? "AI产品运营"
            : modelRoleDirection;
  return {
    fitScore: resolvedFitScore,
    matchGrade: resolvedMatchGrade,
    recommendation: resolvedRecommendation,
    priority: resolvedPriority,
    confidence: text(data.confidence, "中等"),
    summary: resolvedSummary,
    roleDirection: resolvedRoleDirection,
    coreGoal: text(data.coreGoal, "理解业务需求并推动 AI 产品落地"),
    plainExplanation: text(data.plainExplanation, "该岗位需要把业务问题转化为可执行的 AI 产品方案。"),
    serviceAudience: text(data.serviceAudience, "业务用户与产品团队"),
    dailyWork: list(data.dailyWork, ["需求分析", "方案设计", "测试与迭代"]),
    commonOutputs: list(data.commonOutputs, ["产品文档", "原型", "测试记录"]),
    radar: calculateProfileRadar(input),
    hardRequirements: resolvedHardRequirements.length ? resolvedHardRequirements : ["JD 未发现明确淘汰型硬门槛"],
    coreCapabilities: resolvedCoreCapabilities,
    shortTermSkills: resolvedShortTermSkills,
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
    beforeApplying,
    estimatedPreparationTime: text(data.estimatedPreparationTime, "6–8 小时"),
    preparationPlan72h: preparationPlan72h.length ? preparationPlan72h : [
      { day: "第 1 天", tasks: ["拆解 JD 与硬门槛"], hours: "2 小时" },
      { day: "第 2 天", tasks: ["补充核心能力实操"], hours: "3 小时" },
      { day: "第 3 天", tasks: ["准备项目表达与模拟面试"], hours: "3 小时" },
    ],
    interviewQuestions: interviewQuestions.length ? interviewQuestions : [{ category: "岗位匹配", question: `为什么你适合 ${input.jobTitle}？`, probability: "高", purpose: "考察岗位理解与能力证据" }],
  };
}
