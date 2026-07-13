# 悦看 AI 项目交接文档

> 更新时间：2026-07-13  
> 当前状态：岗位分析一致性修复已完成一轮；“可信企业研究 MVP”第一、二阶段已完成；没有技术阻塞，下一阶段应处理面试准备的数据可信问题。  
> Git 状态：工作区有多项未提交改动，用户一直明确要求不要提交 Git，也不要回滚已有改动。

## 1. 我们在做什么

项目是一套“用户画像 + 岗位 JD → 岗位分析报告 → 企业研究 → 面试准备”的前端应用。

本轮工作的核心不是增加更多看似丰富的内容，而是建立可信的数据边界：

1. 岗位分析只能有一份最终结构化结论，避免确定性规则、模型输出、报告页和本地存储各自重新判断，造成前后矛盾。
2. JD 没有明确说明的条件必须保持中性，不能被包装成风险、扣分项或不适配原因。
3. 企业研究必须来自真实公开网页搜索并保留来源；搜不到就诚实显示没有可靠信息，绝不展示模拟企业画像。
4. 面试准备最终应只使用 JD 与经过来源验证的企业信息，不能继续使用硬编码的“模拟企业业务”。

## 2. 当前完整数据链路

### 2.1 岗位分析

```text
用户画像 + JD
→ app/api/analyze-job/route.ts
→ lib/deterministic-rules.ts 的确定性门槛判断
→ 大模型返回结构化 JSON
→ lib/job-analysis-schema.ts 的 validateAnalysis() 统一归一化
→ lib/analysis-data.ts 的 saveAIAnalysis()
→ record.analysis（唯一事实来源）
→ app/report/page.tsx（只展示，不重新计算）
```

重要约束：

- `record.analysis` 是 AI 岗位报告的唯一事实来源。
- `record.fitScore`、`recommendation`、`priority`、`topRisk`、`report` 等顶层字段只是旧页面兼容快照。
- 新页面不得读取顶层快照后重新做业务判断。
- `validateAnalysis()` 是跨字段一致性的唯一归一化层。

### 2.2 企业研究

```text
当前 AnalysisRecord 的 companyName + city
→ app/company/page.tsx
→ POST /api/company-research
→ app/api/company-research/route.ts（服务端读取 TAVILY_API_KEY）
→ Tavily Search API
→ CompanyResearchResult（found | not_found | error）
→ app/company/page.tsx 展示摘要与真实来源
```

当前企业研究只做实时展示，不保存回当前记录，也不传给面试页。

`found` 只代表搜索到了可展示的公开来源，不代表已经确认这些来源属于当前招聘企业。当前版本还没有同名企业主体自动确认能力。

### 2.3 面试准备（尚未可信改造）

`app/interview/page.tsx` 当前仍然：

- 使用文件内硬编码的 15 道题目；
- 包含固定的“企业业务理解”题目；
- 页面文案仍写“基于当前画像、JD 与模拟企业业务生成”；
- 使用 `loadCurrent() || demoRecord`，没有真实记录时会回退到示例记录；
- 不读取企业研究接口结果；
- 模拟面试评分固定显示 78/100 及固定分项，不是真实评估。

因此，企业页虽然已经可信化，但面试页还没有接上可信链路。这是当前最明确的下一阶段工作。

## 3. 已经完成的工作

### 3.1 `lib/job-analysis-schema.ts`

`validateAnalysis()` 已承担最终归一化职责，已完成：

- 明确硬门槛失败时，同步约束推荐、优先级、分数和等级。
- `topRisk` 固定按“明确硬门槛失败 → 核心技能差距 → 有 JD 依据的隐藏风险”确定。
- 未明确字段保持中性，不进入风险、最大风险、不适配原因或投递前负面建议。
- `shortTermSkills` 从最终 `skillMatches` 的真实核心差距派生，已达标或 JD 未要求的技能不会进入。
- `whyMayNotFit`、`beforeApplying`、`recommendation`、`summary` 基于最终有效负面依据清洗或归一化。
- `priority` 不再被无条件固定为“中”：硬门槛失败、低分或 C 为低；高匹配、差距少且无有效隐藏风险为高；其余符合规则的为中。
- `hardRequirements` 按学历、毕业年份、每周到岗、实习周期、专业限制等业务字段语义去重，同字段优先保留 JD 原文和信息更完整版本。
- `roleDirection` 增加产品与产品运营的证据归一化，PRD、产品规划、原型设计等强产品证据不会因“推动、协同、落地、迭代”等通用词被误判为运营。
- `coreCapabilities` 从最终 `skillMatches` 中的核心岗位要求确定性派生；模型能力只能作为有 JD 原文依据的补充，并做语义去重。

### 3.2 `lib/deterministic-rules.ts`

已修复专业限制误判：

- 删除“计算机、AI、软件、数据”等技术词一出现就视为专业要求的过宽规则。
- 只有 JD 同时出现专业/背景语义和明确要求关系时，才判断专业限制。
- JD 未明确专业要求时固定返回 `type = 未明确`、`status = 未明确`。
- 未明确时不比较用户专业，不能根据岗位名、岗位方向、技术关键词或用户专业反推不匹配。

### 3.3 `lib/skill-matching.ts`

已让明确岗位职责参与技能匹配：

- 保留“熟悉、掌握、精通、能够使用”等能力要求语义。
- 增加“负责、参与、完成、撰写、设计、搭建、输出、制定、规划、推动、协同、落地”等职责语义。
- 职责动词和能力词必须位于同一句、同一职责项或同一文本片段，禁止跨句拼接。
- 职责证据只产生最低有效核心要求，不会自动升级为硬门槛、熟练或精通。
- 补充 PRD、用户调研、产品规划、原型设计、协同开发等能力及同义表达。
- 同一技能多次出现时优先选择更强证据，避免“对 PRD 感兴趣”覆盖“负责 PRD 撰写”。
- 原型设计不会被无依据地反推成 Figma 要求。

### 3.4 `app/report/page.tsx`

报告页已改成纯展示层：

- 直接读取 `record.analysis` 中的技能匹配、雷达、门槛、分层、风险、建议、分数和优先级。
- 删除报告页对技能匹配、雷达、最大风险、要求分层、不适配原因和投递建议的二次计算。
- 删除/停用 `buildSkillMatches()`、`calculateProfileRadar()`、`mentionsSkill()`、`skillNamesInText()`、`maximumRisk`、`finalWhyMayNotFit`、`finalBeforeApplying`、`keepRequirement` 等重复业务逻辑。
- 旧记录缺字段时显示中性空状态，不补造模拟要求或模拟风险。

### 3.5 `lib/analysis-data.ts`

已明确存储权威关系：

- `saveAIAnalysis()` 将传入的同一个 `analysis` 保存为 `record.analysis`。
- 顶层分数、等级、推荐、优先级、最大风险及 `report` 只从同一个 analysis 直接复制为兼容快照。
- current 和 history 保存的是同一个 record，不再分别生成结论。
- 旧的 `companyResearch: { business, aiDirection }` 字段仍存在于兼容结构和示例数据中；本轮没有迁移或删除。新的企业页不会显示它。

### 3.6 可信企业研究 MVP 第一阶段

新增 `lib/company-research.ts`：

- `CompanyResearchStatus = found | not_found | error`
- `CompanyResearchSource` 保存标题、URL、发布方、摘要、相关度和查询时间。
- `CompanyResearchResult` 保存查询公司、辅助城市、Tavily 摘要、来源及错误信息。

新增 `app/api/company-research/route.ts`：

- POST 输入 `{ companyName, city }`。
- 公司名必填，城市允许空字符串。
- 只在服务端读取 `process.env.TAVILY_API_KEY`。
- 调用 `https://api.tavily.com/search`，使用 basic 搜索、最多 8 条、包含 answer、不包含 raw content，并设置 20 秒超时。
- 只保留合法 HTTP/HTTPS 来源，发布方从域名提取。
- 有来源返回 `found`；无来源返回 `not_found`；缺 Key、参数错误、超时或上游错误返回 `error`。
- 不返回默认规模、行业、融资、地址、业务或员工画像。

`.env.local.example` 已新增空值：

```text
TAVILY_API_KEY=
```

真实 Key 只存在本地 `.env.local`，不得读取、打印、提交或返回浏览器。`.gitignore` 原本已经通过 `.env*` 忽略本地环境文件，因此没有修改。

### 3.7 可信企业研究 MVP 第二阶段

已修改 `app/company/page.tsx`：

- 继续从当前分析记录读取 `companyName`、`city`、`jobTitle`。
- 页面加载后调用 `POST /api/company-research`，浏览器端没有读取 API Key。
- 请求中显示“正在检索企业公开信息，请稍候……”。
- `found` 展示查询企业、辅助城市、Tavily 摘要和真实来源。
- `not_found` 明确显示找不到可靠公开信息，不补模拟数据。
- `error` 显示错误和“重新检索”按钮，重试不刷新整页。
- 没有公司名时不发请求，提示先完成岗位识别。
- 来源标题只在 URL 为 HTTP/HTTPS 时可点击，并使用新标签页和 `noopener noreferrer`。
- 页面明确提示：岗位城市只用于辅助检索，不是企业地址；搜索结果不等于主体已确认；同名企业可能导致来源混杂。
- 已删除旧页面中固定的规模、成立时间、行业、融资、地址、业务、AI 方向、标签、目标客户、员工画像、近期业务、企业分析和企业面试题。
- 没有保存搜索结果，没有生成企业针对性面试题。

## 4. 当前卡点和真实风险

当前没有 lint、TypeScript 或构建阻塞。最近一次验证：

```text
npm.cmd run lint   通过
npm.cmd run build  通过
```

当前卡点是产品能力而非代码报错：

1. **面试页仍是硬编码模拟内容。** 它没有使用真实企业研究结果，也没有真正按当前 JD 动态生成题目。
2. **企业搜索没有主体确认。** `found` 只是“找到了来源”，同名企业结果可能混杂，绝不能显示“企业已确认”或“这些信息均属于当前招聘企业”。
3. **企业研究没有持久化。** 页面切换或刷新会重新搜索，面试页也拿不到本次检索结果。
4. **摘要不等于逐条验证事实。** `summary` 是 Tavily 基于搜索结果生成的回答；当前没有做到每条摘要事实与具体来源一一绑定。
5. **当前接口状态只有三种。** 只有 `found | not_found | error`，没有 `confirmed` 或 `ambiguous`。后续不能让页面擅自使用不存在的状态。
6. **旧兼容字段仍含模拟企业数据。** `AnalysisRecord.companyResearch` 和 `demoRecord` 仍有旧模拟值，但新的企业页已完全忽略它们。除非用户单独授权，不要顺手删除或迁移。

## 5. 推荐下一步计划

下一阶段建议优先改造“面试准备”，但开始前应让用户确认本轮允许修改哪些文件，因为可信企业结果目前没有保存机制。

推荐顺序：

1. **只读梳理面试数据链路。** 核对 `app/interview/page.tsx`、`lib/job-analysis-schema.ts` 中的 `interviewQuestions`、`app/api/analyze-job/route.ts` 的生成提示，以及 `lib/analysis-data.ts` 的存储结构。
2. **确定企业研究结果如何传给面试页。** 两个可选方案：
   - 推荐：给 `AnalysisRecord` 增加可选的新版 `CompanyResearchResult` 存储字段及安全更新函数，企业页只保存本次真实检索结果；保留旧字段兼容。
   - 临时方案：面试页重新调用企业搜索接口，但会重复请求，也不利于确保用户看到的研究结果与面试使用结果一致。
3. **拆分面试题来源。** 
   - JD 核心面试题：只使用 JD 原文和最终 `record.analysis`。
   - 企业针对性面试题：只允许使用带真实来源、且主体风险已明确提示的企业研究结果。
4. **企业信息不可用时诚实降级。** 显示：“暂未获取可靠企业业务信息，本次仅生成岗位通用面试题。”不要生成企业业务结论。
5. **移除面试页的模拟企业文案、硬编码题目和固定评分。** 不能把静态 78 分包装成真实评估。
6. **按用户每轮指定的文件范围逐步实施。** 每轮结束执行 lint 和 build。

如果后续要进一步提升企业研究可信度，再按顺序考虑：候选主体列表、官网域名匹配、城市与招聘主体辅助核验、来源到字段的逐条引用、`ambiguous/confirmed` 状态。不要在当前 `found` 语义上直接声称已确认。

## 6. 绝对不要再踩的坑

1. **不要在报告页重新计算业务结果。** 报告页只能展示 `record.analysis`，否则历史报告会随前端规则变化。
2. **不要把顶层兼容快照当作权威结果。** 新业务判断只能基于 `record.analysis`。
3. **不要让未明确字段产生风险。** 未明确 = 中性，不加分、不扣分、不进 hiddenRisks/topRisk、不影响推荐、优先级、分数或等级。
4. **不要只凭“数据、软件、AI”等词推断专业限制。** 必须有 JD 的明确专业要求关系。
5. **不要根据用户专业反推岗位专业要求。** 用户专业只能作为用户条件展示。
6. **不要按完整字符串给同一硬门槛去重。** 应按学历、毕业年份、到岗、周期、专业等业务字段归并，并优先保留 JD 原文。
7. **不要把所有硬门槛当成同一类。** 学历、周期、到岗等不同字段必须分别保留。
8. **不要把“优先、加分、感兴趣”当核心差距或硬门槛。**
9. **不要跨句关联职责动词和技能。** “负责/参与”等与技能必须出现在同一句或同一职责项。
10. **不要把职责证据自动升级成熟练、精通或淘汰条件。** 最低有效要求等级即可。
11. **不要根据岗位常识补 JD 未写的技能。** 原型设计不等于要求 Figma，AI 产品不等于必须会 RAG/Prompt。
12. **不要因为“协同、推动、落地、迭代”就判为运营。** 产品和运营方向要看明确职责证据。
13. **不要在企业页展示任何默认企业画像。** 规模、成立时间、行业、融资、地址、业务、员工画像都必须有真实来源；缺失就显示暂无可靠信息。
14. **不要把岗位城市当企业注册地址或办公地址。** 城市只作为搜索辅助条件。
15. **不要把 `found` 写成“已确认”。** 同名主体尚未自动确认，必须提示用户核验。
16. **不要用公司简称或模型常识补全企业事实。** 搜不到就返回 `not_found`。
17. **不要在前端读取或暴露 `TAVILY_API_KEY`。** Key 只允许服务端读取，不能输出到日志、响应或提交记录。
18. **不要生成假来源链接。** 页面只允许展示接口返回的合法 HTTP/HTTPS URL。
19. **不要让面试题使用未经验证的企业信息。** 企业研究不可用时只生成 JD 通用题。
20. **不要用 `demoRecord` 掩盖真实记录缺失。** 可信页面应展示明确空状态。
21. **不要顺手修改用户未授权的文件。** 用户一直采用严格的单文件/文件清单范围，每轮开始先确认边界。
22. **不要回滚当前未提交改动，也不要执行 `git reset --hard`、`git checkout --` 等破坏性命令。**
23. **不要提交 Git。** 除非用户在后续明确授权。
24. **Windows PowerShell 下优先使用 `npm.cmd run lint` 和 `npm.cmd run build`。** 直接运行 `npm` 可能触发 `npm.ps1` 执行策略问题。
25. **保存中文文件时保持 UTF-8。** 旧 `HANDOFFcodex.md` 在部分终端读取时出现乱码，而且内容已经过时；本文件应作为新会话的主交接来源。

## 7. 当前工作区状态

当前所有改动均未提交：

```text
M  .env.local.example
M  app/company/page.tsx
M  app/report/page.tsx
M  lib/analysis-data.ts
M  lib/deterministic-rules.ts
M  lib/job-analysis-schema.ts
M  lib/skill-matching.ts
?? app/api/company-research/route.ts
?? lib/company-research.ts
?? HANDOFFcodex.md
?? HANDOFF.md
```

不要假设这些改动可以丢弃。新会话应先执行 `git status --short`，再阅读本文件和目标文件；只在用户明确指定的范围内继续工作。

## 8. 新会话开始时建议先做的事

1. 阅读本文件。
2. 运行 `git status --short`，确认未提交改动仍在。
3. 根据用户本轮授权读取相关文件，不要越界修改。
4. 如果下一步是面试可信化，先做只读分析并确认企业研究结果的传递/保存方案。
5. 修改后运行：

```text
npm.cmd run lint
npm.cmd run build
```

6. 不提交 Git，等待用户确认。
