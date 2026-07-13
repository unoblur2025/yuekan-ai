# 阅槛 AI 代码修复交接文档

## 1. 当前任务是什么

项目正在修复“岗位 JD 分析结果前后矛盾”的问题。核心目标是让所有报告模块只读取同一份经过归一化的 `JobAnalysisResult`，避免服务端规则、模型输出、报告页重算和 LocalStorage 顶层快照各自给出不同结论。

当前权威数据链路应为：

```text
用户画像与 JD
→ app/api/analyze-job/route.ts
→ evaluateDeterministicRules()
→ 大模型 JSON
→ validateAnalysis() 统一归一化
→ record.analysis 保存
→ app/report/page.tsx 只展示 record.analysis
```

注意：项目根目录最初没有用户提到的 `HANDOFF.md`，所以此前工作完全依据源码分析完成。

## 2. 已经完成了什么

### 2.1 唯一结果归一化层

已修改 `lib/job-analysis-schema.ts`：

- `validateAnalysis()` 成为唯一结果归一化层。
- 明确硬门槛失败时：
  - `recommendation` 强制改为谨慎申请；
  - `priority` 不再为高，调整为“中”；
  - `fitScore` 上限为 59；
  - `matchGrade` 调整为 `C`。
- `topRisk` 固定优先级：
  1. 明确硬门槛失败；
  2. 核心技能差距；
  3. 有 JD 文本依据的隐藏风险。
- 企业偏好、加分项、未明确字段不允许成为最大风险。
- `shortTermSkills` 直接从最终核心技能差距派生；已达标或 JD 未明确要求的技能不会进入。
- `whyMayNotFit` 和 `beforeApplying` 基于最终 `gateChecks`、`skillMatches`、`hiddenRisks` 生成。
- 隐藏风险增加 JD 文本依据过滤。

### 2.2 报告页只展示，不再重算

已修改 `app/report/page.tsx`：

- 删除前端调用：
  - `buildSkillMatches()`；
  - `calculateProfileRadar()`；
  - `mentionsSkill()`；
  - `skillNamesInText()`。
- 删除前端二次判断：
  - `maximumRisk`；
  - `finalWhyMayNotFit`；
  - `finalBeforeApplying`；
  - `keepRequirement`。
- 页面现在直接读取：
  - `analysis.skillMatches`；
  - `analysis.radar`；
  - `analysis.gateChecks`；
  - `analysis.hardRequirements/coreCapabilities/shortTermSkills/bonusItems`；
  - `analysis.hiddenRisks/topRisk`；
  - `analysis.whyMayNotFit/beforeApplying`；
  - `analysis.fitScore/matchGrade/recommendation/priority`。
- 旧历史记录缺字段时只显示“暂无结构化数据”，不再填充模拟岗位要求、模拟隐藏风险或看似真实的默认结论。
- 仍保留纯 UI 格式处理，例如状态到颜色映射、数组拼接、标题映射和雷达数组排列。

### 2.3 `record.analysis` 成为存储唯一事实来源

已修改 `lib/analysis-data.ts`：

- `saveAIAnalysis()` 先把传入的同一个对象保存到 `record.analysis`。
- 顶层字段只作为旧页面和旧历史结构的兼容快照：
  - `fitScore`；
  - `matchGrade`；
  - `recommendation`；
  - `priority`；
  - `topRisk`；
  - `report.direction`；
  - `report.summary`。
- 上述快照全部直接从同一个 `analysis` 对象复制，不再单独判断。
- `plan` 和 `interviewQuestionIds` 仍是旧功能需要的格式投影，不是业务事实来源。
- current 和 history 序列化的是同一个 `record`。

### 2.4 修复无依据的专业限制误判

已修改 `lib/deterministic-rules.ts`：

- 删除了过宽的专业识别 `/计算机|人工智能|软件|数据|电子信息|专业/`。
- 现在 JD 句子必须同时包含：
  - 专业或背景语义；
  - 要求关系（要求、仅限、优先、相关专业、专业背景等）。
- 普通“数据分析、人工智能技术、软件产品、AI 应用、数据工具”不再触发专业限制。
- 只有 JD 明确列出专业范围后才比较 `input.major`。
- JD 没有明确专业要求时固定返回：
  - `type = "未明确"`；
  - `status = "未明确"`；
  - `reason = "JD 未发现明确专业要求。"`。
- JD 只泛称专业背景但没有给出具体专业范围时，也保持“未明确”。

### 2.5 修复硬门槛语义重复

已继续修改 `lib/job-analysis-schema.ts`：

- `hardRequirements` 不再只用 `Set<string>` 按全文去重。
- 增加业务字段分类：
  - 学历要求；
  - 毕业年份；
  - 每周到岗；
  - 实习周期；
  - 专业限制。
- 同一字段只保留一条，优先级：
  1. `gateCheck.sourceText` 的 JD 原文；
  2. 信息更完整的文本；
  3. 含括号说明、限定条件、学信网可查等可验证信息的文本；
  4. 模型概括。
- 无法归入已知字段的硬门槛继续保留，只做全文精确去重。
- 不能按“明确硬门槛”整体去重，否则会误删学历、到岗、周期等不同要求。

## 3. 当前卡在哪里

当前没有构建阻塞。最近一次执行结果：

```text
npm run lint 通过
npm run build 通过
TypeScript 检查通过
Next.js 11 个页面生成通过
```

PowerShell 环境直接执行 `npm run ...` 可能被执行策略拦截 `npm.ps1`。此前使用 `npm.cmd run lint` 和 `npm.cmd run build` 成功；这与代码无关。

当前尚未修复的已知业务问题是：明确岗位职责没有进入技能匹配。

典型回归：

```text
JD：负责 PRD 撰写
结果：PRD 岗位要求“未提及”，状态“不参与匹配”
```

根因位于 `lib/skill-matching.ts`：

- `sourceSentence()` 能找到包含 PRD 的句子；
- 但 `explicitRequirementPattern` 只识别熟悉、掌握、精通、能够使用、具备经验等能力要求词；
- 不识别负责、参与、完成、撰写、设计、搭建、输出、制定、规划、推动等职责语义；
- 因此 `buildSkillMatches()` 在 `if (!explicitRequirement)` 分支把它写成 `requirementType: "未提及"`、`status: "不参与匹配"`。

此外技能目录本身缺项：

- “需求调研”不匹配当前“用户调研/用户研究”；
- “产品规划”没有技能定义；
- “原型设计”没有独立技能定义，不能无依据映射为 Figma；
- “协同开发”没有技能定义。

## 4. 下一步计划

建议下一轮只修改 `lib/skill-matching.ts`，不要同时碰报告页或 schema。

### 4.1 增加职责语义

将证据区分为：

- 能力要求语义：熟悉、掌握、精通、能够使用、具备经验等；
- 岗位职责语义：负责、参与、完成、撰写、设计、搭建、输出、制定、规划、推动等。

职责动词与技能必须出现在同一句或同一职责项中。职责证据应生成：

```text
requirementType = 核心岗位要求
requiredLevel = 1
```

职责不能自动升级为明确硬门槛，也不能自动认定熟练或精通。

### 4.2 扩充技能和同义词

至少覆盖：

- PRD：PRD、产品需求文档；
- 用户调研：用户调研、用户研究、需求调研；
- 产品规划：产品规划、产品路线规划；
- 原型设计：原型设计、产品原型、原型制作；
- 协同开发：协同开发、配合开发、推动开发落地。

“原型设计”不要自动映射成 Figma。工具要求必须有 JD 工具原文证据。

### 4.3 改进证据选择顺序

当前 `sourceSentence()` 只取第一个包含技能的句子。如果前文是“对 PRD 感兴趣”，后文才是“负责 PRD 撰写”，会错误选择较弱证据。

应从全部候选句中按以下顺序选择：

1. 明确核心职责/能力要求；
2. 企业偏好或加分项；
3. 方向兴趣；
4. 仅提及。

完成后至少回归：

- `负责 PRD 撰写` → PRD 核心要求，参与匹配；
- `负责需求调研` → 用户调研核心要求；
- `负责原型设计` → 原型设计核心要求；
- `对 PRD 感兴趣` → 方向兴趣，不产生技能差距；
- `PRD 经验优先` → 企业偏好，不产生核心技能差距；
- 完全没提技能 → 未提及。

## 5. 绝对不要再踩的坑

1. **不要在报告页重新计算业务结果。** 报告页只能读取 `record.analysis`，否则旧报告会随前端规则变化。
2. **不要把顶层 `record.fitScore/recommendation/topRisk/report` 当事实来源。** 它们只是兼容快照。
3. **不要仅凭技术关键词推断专业要求。** “数据、软件、人工智能”可能只是工作内容。
4. **不要用用户专业本身反推岗位专业限制。** 必须先有 JD 明确专业要求证据。
5. **不要让未明确字段参与扣分、风险或建议。** `未明确`必须保持中性。
6. **不要按 `RequirementType === 明确硬门槛` 整体去重。** 应按学历、届别、到岗、周期、专业等业务字段去重。
7. **不要只用完整字符串判断语义重复。** JD 原文与模型概括通常措辞不同。
8. **不要把“优先、加分、有经验者优先”当核心差距或硬门槛。**
9. **不要把“兴趣、关注、愿意学习”当技能要求。**
10. **不要把职责词无条件扩散到其他句子的技能。** 技能与职责证据必须同句/同项。
11. **不要把“参与”解释成高熟练度。** 职责证据默认只支持一级核心要求。
12. **不要用岗位常识补充 JD 没写的技能或工具。** 原型设计不等于 Figma，AI 产品不等于必须会 Prompt/RAG。
13. **不要用模拟默认内容掩盖旧数据缺失。** 缺字段应显示中性空状态。
14. **不要修改或迁移旧历史结构，除非用户明确授权。** 当前采取兼容快照方案。
15. **不要覆盖或回滚现有未提交改动。** 当前工作区修改均属于本轮连续修复成果。

## 6. 当前工作区状态

尚未提交 Git。当前已有修改：

```text
app/report/page.tsx
lib/analysis-data.ts
lib/deterministic-rules.ts
lib/job-analysis-schema.ts
HANDOFFcodex.md
```

用户此前多次明确要求“不要提交 Git”，继续遵守，除非后续明确授权。

后续每轮仍应遵守用户指定的单文件修改范围，修改前先确认 `git status --short`，不要碰范围外文件。完成后执行：

```text
npm.cmd run lint
npm.cmd run build
```

