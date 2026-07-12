import type { SkillLevel } from "./analysis-data";
import type { JobAnalysisInput, JobAnalysisResult, SkillMatch } from "./job-analysis-schema";

type SkillDefinition = { name: string; pattern: RegExp };

export const SKILL_CATALOG: SkillDefinition[] = [
  { name: "Prompt Engineering", pattern: /Prompt(?:\s*Engineering)?|提示词/i },
  { name: "RAG", pattern: /\bRAG\b|检索增强/i },
  { name: "Dify", pattern: /\bDify\b/i },
  { name: "Coze", pattern: /\bCoze\b|扣子平台/i },
  { name: "Agent", pattern: /\bAgent\b|智能体/i },
  { name: "AI Workflow", pattern: /AI\s*Workflow|AI\s*工作流|智能工作流/i },
  { name: "Python", pattern: /\bPython\b/i },
  { name: "SQL", pattern: /\bSQL\b/i },
  { name: "Excel", pattern: /\bExcel\b/i },
  { name: "数据分析", pattern: /数据分析/i },
  { name: "PRD", pattern: /\bPRD\b|产品需求文档/i },
  { name: "用户调研", pattern: /用户调研|用户研究/i },
  { name: "Figma", pattern: /\bFigma\b/i },
  { name: "API", pattern: /\bAPI\b|接口调用/i },
  { name: "Linux", pattern: /\bLinux\b/i },
  { name: "AI 工具", pattern: /AI\s*工具/i },
];

const preferredPattern = /优先|加分|更佳|有则更好|最好|倾向|有经验者优先|具备者优先/;
const interestPattern = /对.{0,80}有(?:明确)?兴趣|感兴趣|有明确兴趣|关注|愿意学习|乐于探索/;
const skilledPattern = /熟练(?:掌握)?|精通|能独立完成|能独立搭建|有丰富经验/;
const familiarPattern = /熟悉|掌握|有实际使用经验|能够使用|具备相关经验|要求具备/;
const explicitRequirementPattern = /熟悉|掌握|熟练|精通|能够使用|能独立完成|能独立搭建|具备相关经验|有实际使用经验|要求具备|有丰富经验/;

function sourceSentence(jd: string, pattern: RegExp) {
  return jd.split(/[。！？!？\n；;]/).map(value => value.trim()).find(value => pattern.test(value)) || "";
}

function requiredLevel(source: string): SkillLevel {
  if (skilledPattern.test(source)) return 3;
  if (familiarPattern.test(source)) return 2;
  return 1;
}

function userLevelFor(skill: string, input: JobAnalysisInput): 0 | SkillLevel {
  const direct = input.skills.find(item => item.name.toLowerCase() === skill.toLowerCase());
  if (direct) return direct.level;
  if (skill === "AI 工具") {
    const related = input.skills.filter(item => ["Dify", "Coze", "Agent", "AI Workflow"].includes(item.name));
    return related.length ? Math.max(...related.map(item => item.level)) as SkillLevel : 0;
  }
  return 0;
}

export function buildSkillMatches(input: JobAnalysisInput): SkillMatch[] {
  const names = Array.from(new Set([...SKILL_CATALOG.map(item => item.name), ...input.skills.map(item => item.name)]));
  return names.map(skill => {
    const definition = SKILL_CATALOG.find(item => item.name.toLowerCase() === skill.toLowerCase());
    const evidenceText = definition ? sourceSentence(input.jd, definition.pattern) : sourceSentence(input.jd, new RegExp(skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    const personalLevel = userLevelFor(skill, input);
    if (!evidenceText) return {
      skill, requiredLevel: 0 as const, personalLevel, requirementType: "未提及" as const, sourceText: "JD 未提及该技能", evidenceText: "",
      status: "不参与匹配" as const, advice: "可作为个人加分能力，但不是该岗位明确要求",
    };
    const sourceText = evidenceText;
    if (interestPattern.test(evidenceText)) return {
      skill, requiredLevel: 0 as const, personalLevel, requirementType: "方向兴趣" as const, sourceText, evidenceText,
      status: "岗位方向相关" as const, advice: "JD 仅表达方向兴趣，不是岗位明确技能要求",
    };
    const preference = preferredPattern.test(evidenceText);
    const explicitRequirement = explicitRequirementPattern.test(evidenceText);
    if (preference) return {
      skill, requiredLevel: 0 as const, personalLevel, requirementType: /加分|有则更好/.test(evidenceText) ? "普通加分项" as const : "企业偏好" as const, sourceText, evidenceText,
      status: personalLevel ? "已具备偏好能力" as const : "暂未提供偏好能力证据" as const,
      advice: personalLevel ? "可作为企业偏好或加分能力" : "该项属于企业偏好，不构成明确技能差距",
    };
    if (!explicitRequirement) return {
      skill, requiredLevel: 0 as const, personalLevel, requirementType: "未提及" as const, sourceText, evidenceText,
      status: "不参与匹配" as const, advice: "JD 提及了相关方向，但没有明确技能要求语义，不参与岗位匹配",
    };
    const required = requiredLevel(evidenceText);
    const requirementType = "核心岗位要求" as const;
    if (!personalLevel) return {
      skill, requiredLevel: required, personalLevel, requirementType, sourceText, evidenceText,
      status: "证据不足" as const, advice: `${skill} 是 JD 明确要求，但用户未提供该技能证据`,
    };
    if (personalLevel >= required) return {
      skill, requiredLevel: required, personalLevel, requirementType, sourceText, evidenceText,
      status: "已达到岗位要求" as const, advice: `${skill} 当前等级已达到 JD 明确要求`,
    };
    return {
      skill, requiredLevel: required, personalLevel, requirementType, sourceText, evidenceText,
      status: "部分匹配，仍需补充" as const, advice: `${skill} 个人等级低于 JD 明确要求，需要补充针对性实操`,
    };
  }).filter(item => item.requiredLevel > 0 || item.personalLevel > 0 || Boolean(item.evidenceText));
}

const levelScore = (level: 0 | SkillLevel) => level === 3 ? 85 : level === 2 ? 65 : level === 1 ? 40 : 30;
const average = (values: number[]) => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

export function calculateProfileRadar(input: JobAnalysisInput): JobAnalysisResult["radar"] {
  const levels = new Map(input.skills.map(item => [item.name, item.level]));
  const dimension = (skills: string[]) => average(skills.map(skill => levelScore(levels.get(skill) || 0)));
  const codingFromAnswer = /独立完成开发/.test(input.codingAbility) ? 85 : /AI Coding|修改简单代码/.test(input.codingAbility) ? 65 : /看懂简单代码/.test(input.codingAbility) ? 40 : 30;
  return {
    aiTechnology: dimension(["Prompt Engineering", "RAG", "Dify", "Coze", "Agent", "AI Workflow"]),
    product: dimension(["PRD", "用户调研", "Figma"]),
    business: dimension(["PRD", "用户调研", "数据分析"]),
    data: dimension(["SQL", "Excel", "数据分析"]),
    coding: average([dimension(["Python", "API"]), codingFromAnswer]),
    communication: dimension(["用户调研", "PRD"]),
  };
}

export function mentionsSkill(value: string) {
  return SKILL_CATALOG.some(item => item.pattern.test(value));
}

export function skillNamesInText(value: string) {
  return SKILL_CATALOG.filter(item => item.pattern.test(value)).map(item => item.name);
}
