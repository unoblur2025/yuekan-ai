import type { DeterministicRules, GateStatus, JobAnalysisInput, RequirementType } from "./job-analysis-schema";

const numberFrom = (value: string) => Number(value.match(/\d+/)?.[0] || 0);
const degreeRank = (value: string) => value.includes("博士") ? 4 : value.includes("硕士") ? 3 : value.includes("本科") ? 2 : value.includes("专科") ? 1 : 0;
const preferencePattern = /优先|更佳|有经验者优先|具备者优先|最好|倾向|相关背景优先/;
const bonusPattern = /加分|有则更好|了解者优先|经验不限但有经验更佳/;
const hardPattern = /必须|仅限|只招|限定|要求为|需满足|至少|不得低于|不接受|必须具备|连续实习不少于|以上|明确排除/;
const sentences = (jd: string) => jd.split(/[。；;\n]/).map(x => x.trim()).filter(Boolean);
const sourceFor = (jd: string, pattern: RegExp) => sentences(jd).find(sentence => pattern.test(sentence)) || "JD 未发现对应原文";
const classify = (source: string): RequirementType => bonusPattern.test(source) ? "普通加分项" : preferencePattern.test(source) ? "企业偏好" : hardPattern.test(source) ? "明确硬门槛" : "核心岗位要求";

export function evaluateDeterministicRules(input: JobAnalysisInput): DeterministicRules {
  const jd = input.jd.replace(/[ \t]+/g, " ");
  const gateChecks: DeterministicRules["gateChecks"] = [];
  const notes: string[] = [];
  const add = (item: string, sourceText: string, type: RequirementType, userCondition: string, status: GateStatus, reason: string) => {
    gateChecks.push({ item, sourceText, type, userCondition, status, reason });
    notes.push(`${item}｜${type}｜${status}：${reason}`);
  };

  const degreeSource = sourceFor(jd, /学历|本科|硕士|博士|专科/);
  const requiredDegree = /博士/.test(degreeSource) ? 4 : /硕士(?:及|或)?以上/.test(degreeSource) ? 3 : /本科(?:及|或)?以上|本科/.test(degreeSource) ? 2 : /专科(?:及|或)?以上/.test(degreeSource) ? 1 : 0;
  if (requiredDegree) {
    const type = classify(degreeSource);
    const met = degreeRank(input.degree) >= requiredDegree;
    const status: GateStatus = type === "企业偏好" ? met ? "满足偏好" : "未满足偏好，但不构成硬门槛" : type === "普通加分项" ? met ? "已具备加分项" : "暂未具备加分项" : met ? "符合" : "不符合";
    add("学历要求", degreeSource, type, input.degree, status, type === "企业偏好" && !met ? "原文是偏好表达，没有明确排除其他学历。" : `JD 提到${["", "专科", "本科", "硕士", "博士"][requiredDegree]}，用户学历为${input.degree}。`);
  } else add("学历要求", degreeSource, "未明确", input.degree, "未明确", "JD 未发现明确学历要求。");

  const yearSource = sourceFor(jd, /20\d{2}\s*届/);
  const years = Array.from(new Set(yearSource.match(/20\d{2}\s*届/g)?.map(x => x.match(/20\d{2}/)?.[0]).filter((x): x is string => Boolean(x)) || []));
  const userYear = input.graduationYear.match(/20\d{2}/)?.[0];
  if (years.length) {
    const type = classify(yearSource);
    const met = Boolean(userYear && years.includes(userYear));
    const status: GateStatus = type === "企业偏好" ? met ? "满足偏好" : "未满足偏好，但不构成硬门槛" : type === "普通加分项" ? met ? "已具备加分项" : "暂未具备加分项" : met ? "符合" : "不符合";
    const reason = type === "企业偏好" && !met ? `岗位更倾向 ${years.map(x=>`${x} 届`).join("、")}，但“优先”没有明确排除其他毕业年份。` : `JD 面向 ${years.map(x=>`${x} 届`).join("、")}，用户为${input.graduationYear}。`;
    add("毕业年份", yearSource, type, input.graduationYear, status, reason);
  } else add("毕业年份", yearSource, "未明确", input.graduationYear, "未明确", "JD 未发现明确毕业年份要求。");

  const daysSource = sourceFor(jd, /每周.{0,8}(?:到岗)?.{0,4}[3-7]\s*天/);
  const daysMatch = daysSource.match(/每周(?:至少)?(?:到岗)?\s*([3-7])\s*天/);
  const requiredDays = daysMatch ? Number(daysMatch[1]) : 0;
  const userDays = numberFrom(input.daysPerWeek);
  if (requiredDays) {
    const type = classify(daysSource);
    const met = userDays >= requiredDays;
    const status: GateStatus = type === "企业偏好" ? met ? "满足偏好" : "未满足偏好，但不构成硬门槛" : met ? "符合" : "不符合";
    add("每周到岗", daysSource, type, input.daysPerWeek, status, `JD 提到每周 ${requiredDays} 天，用户可到岗 ${input.daysPerWeek}。`);
  } else add("每周到岗", daysSource, "未明确", input.daysPerWeek, "未明确", "JD 未发现明确的每周到岗天数。");

  const durationSource = sourceFor(jd, /实习.{0,15}(?:个?月|半年)|连续实习/);
  const durationMatch = durationSource.match(/(?:连续)?实习(?:至少|不低于|不少于)?\s*([3-9]|1[0-2])\s*个?月|实习\s*([3-9]|1[0-2])\s*个?月(?:以上|及以上)/);
  const requiredMonths = durationMatch ? Number(durationMatch[1] || durationMatch[2]) : /半年/.test(durationSource) ? 6 : 0;
  const userMonths = numberFrom(input.internshipDuration);
  if (requiredMonths) {
    const type: RequirementType = preferencePattern.test(durationSource) ? "企业偏好" : "明确硬门槛";
    const met = userMonths >= requiredMonths;
    const status: GateStatus = type === "企业偏好" ? met ? "满足偏好" : "未满足偏好，但不构成硬门槛" : met ? "符合" : "不符合";
    add("实习周期", durationSource, type, input.internshipDuration, status, met ? `用户可满足连续实习 ${requiredMonths} 个月。` : `用户最长实习 ${input.internshipDuration}，但岗位要求连续实习 ${requiredMonths} 个月以上。`);
  } else add("实习周期", durationSource, "未明确", input.internshipDuration, "未明确", "JD 未发现明确的连续实习周期。");

  const majorFieldPattern = /计算机|软件(?=.{0,20}(?:专业|背景))|人工智能|数据(?=.{0,20}(?:专业|背景))|电子信息|设计类?|商科/;
  const majorSemanticsPattern = /相关专业|专业背景|(?:计算机|软件|人工智能|数据|电子信息|设计类?|商科).{0,20}(?:专业|背景)/;
  const majorRequirementPattern = /要求|限|仅限|只招|优先|倾向|需|应|本科及以上|硕士及以上|博士及以上|相关专业|专业背景|等背景|背景或/;
  const majorSource = sentences(jd).find(sentence => majorSemanticsPattern.test(sentence) && majorRequirementPattern.test(sentence)) || "JD 未发现对应原文";
  const hasMajor = majorSource !== "JD 未发现对应原文";
  if (hasMajor) {
    const type = classify(majorSource);
    const requiredMajorMatchers = [
      { source: /计算机/, user: /计算机/ },
      { source: /软件/, user: /软件/ },
      { source: /人工智能/, user: /人工智能/ },
      { source: /数据/, user: /数据/ },
      { source: /电子信息/, user: /电子信息/ },
      { source: /设计/, user: /设计|建筑|规划/ },
      { source: /商科/, user: /商科|经济|金融|管理|市场|会计/ },
    ].filter(item => item.source.test(majorSource));
    if (!majorFieldPattern.test(majorSource) && !/软件(?:、|，|,|\/|及|或|等).{0,12}相关专业|数据(?:、|，|,|\/|及|或|等).{0,12}相关专业/.test(majorSource)) {
      add("专业限制", majorSource, type, input.major, "未明确", "JD 提到专业背景，但未明确限定具体专业范围。");
      return { gateChecks, notes };
    }
    const related = requiredMajorMatchers.some(item => item.user.test(input.major));
    const status: GateStatus = type === "企业偏好" ? related ? "满足偏好" : "未满足偏好，但不构成硬门槛" : type === "普通加分项" ? related ? "已具备加分项" : "暂未具备加分项" : related ? "符合" : "不符合";
    const reason = type === "企业偏好" && !related ? "相关专业仅为优先条件，非相关专业不构成淘汰型硬门槛。" : `用户专业背景为${input.major}。`;
    add("专业限制", majorSource, type, input.major, status, reason);
  } else add("专业限制", majorSource, "未明确", input.major, "未明确", "JD 未发现明确专业要求。");

  return { gateChecks, notes };
}
