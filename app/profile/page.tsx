"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ClipboardPaste, History, RotateCcw, Sparkles } from "lucide-react";
import PageShell from "@/components/PageShell";
import { levelNames, loadCurrent, loadProfile, loadProfileStep, ProfileAnswers, resetCurrentAnalysis, saveProfile, saveProfileStep, SkillLevel } from "@/lib/analysis-data";

const sampleJD = `岗位职责：参与企业知识库与 AI 应用的产品设计，梳理业务需求，设计 Prompt 与 RAG 检索方案，跟踪 Badcase 并推动优化；协助输出 PRD 与产品原型。\n任职要求：本科及以上，每周到岗 5 天，连续实习 4 个月；有 AI 产品项目经验，了解 Python、Linux、API；熟悉 Dify 或 Coze 优先。`;
const groups = {
  degree:["专科","本科","硕士","博士"], major:["计算机相关","其他理工科","经管商科","建筑 / 规划 / 设计","人文社科","其他专业"], grad:["2026 届","2027 届","2028 届","2029 届","其他"],
  direction:["还不确定","AI 产品","AI 产品运营","AI 评测","Prompt","RAG / 知识库","Agent","AI 数据运营","AI 应用开发"], city:["不限","北京","上海","苏州","杭州","深圳","其他"],
  arrival:["立即到岗","一周以内","两周以内","一个月以内","暂未确定"], days:["3 天","4 天","5 天"], months:["不足 3 个月","3 个月","4 个月","5 个月","6 个月及以上"], office:["线下","混合办公","远程","均可"],
  code:["完全没有代码基础","能看懂简单代码","能修改简单代码","能使用 AI Coding 制作 Demo","能独立完成开发项目"], internship:["暂无","1 段","2 段","3 段及以上"], projects:["暂无","1 个","2 个","3 个及以上"]
};
const skills=["Prompt Engineering","RAG","Dify","Coze","Agent","AI Workflow","Python","SQL","Excel","数据分析","PRD","用户调研","Figma","API"];
const skillLevelDescriptions: Record<string, Record<SkillLevel, string>> = {
  "Prompt Engineering": {
    1: "能写出包含目标、背景和输出格式的单轮提示词。",
    2: "能使用示例、约束和结构化输出，并根据结果迭代提示词。",
    3: "能为多步骤任务设计可复用提示词，并定位常见输出偏差。",
  },
  RAG: {
    1: "能搭建或操作简单知识库问答，并说明检索与生成的基本流程。",
    2: "能配置切片、召回数量和引用来源，并检查回答是否命中原文。",
    3: "能独立完成基础 RAG 流程，并排查召回不足、内容混杂和错误引用。",
  },
  Dify: {
    1: "能创建基础应用、连接模型并运行简单提示词。",
    2: "能配置知识库、变量和工作流节点，并完成基本调试。",
    3: "能独立搭建包含多节点、工具调用和异常分支的可用应用。",
  },
  Coze: {
    1: "能创建 Bot、配置角色提示词并完成基础对话测试。",
    2: "能使用知识库、插件和工作流实现多步骤功能。",
    3: "能独立搭建完整 Bot 流程，并调试变量传递、插件调用和异常结果。",
  },
  Agent: {
    1: "能配置一个使用明确指令和单个工具完成任务的简单 Agent。",
    2: "能让 Agent 组合多个工具，并处理上下文、变量和任务步骤。",
    3: "能独立设计基础任务型 Agent，并排查工具失败、错误决策和重复执行。",
  },
  "AI Workflow": {
    1: "能搭建输入、模型处理和结果输出组成的简单流程。",
    2: "能使用变量、条件分支和结构化输出完成多步骤流程。",
    3: "能独立搭建包含异常处理、重试和人工确认节点的可复用流程。",
  },
  Python: {
    1: "能使用变量、条件、循环和函数，并读懂简单脚本。",
    2: "能编写脚本处理文件、JSON 和 API 数据，并使用常见第三方库。",
    3: "能独立完成结构清晰的小型程序，并定位异常和修复常见问题。",
  },
  SQL: {
    1: "能使用 SELECT、WHERE 和 ORDER BY 完成基础查询。",
    2: "能使用 GROUP BY、JOIN 和聚合函数完成常见分析。",
    3: "能独立完成多表分析、复杂条件查询，并核验查询结果的正确性。",
  },
  Excel: {
    1: "能使用基础公式、排序和筛选整理表格。",
    2: "能使用查找函数、条件统计和数据透视表完成常见分析。",
    3: "能独立清洗多表数据，并制作可复用的分析表和图表。",
  },
  数据分析: {
    1: "能计算基础指标，并用表格或图表描述数据现象。",
    2: "能清洗数据、拆分维度并解释主要变化和差异。",
    3: "能独立完成问题定义、指标设计、分析验证和结论输出。",
  },
  PRD: {
    1: "能读懂已有 PRD，并识别目标、需求和基本流程。",
    2: "能独立整理需求并撰写包含背景、流程和功能说明的基础 PRD。",
    3: "能完成需求拆解、验收标准、异常场景和迭代跟进。",
  },
  用户调研: {
    1: "能准备基础访谈问题、记录反馈并整理主要观点。",
    2: "能独立执行访谈或问卷，并归纳用户需求和痛点。",
    3: "能设计小型调研方案、交叉验证发现并转化为产品需求。",
  },
  Figma: {
    1: "能查看和修改现有设计稿，并制作简单页面或线框图。",
    2: "能使用组件、自动布局和交互连线完成多页面原型。",
    3: "能独立制作结构一致的交互原型，并整理组件和交付标注。",
  },
  API: {
    1: "能读懂请求方法、参数和状态码，并使用工具调用简单接口。",
    2: "能根据文档完成鉴权、参数传递和 JSON 响应处理。",
    3: "能独立接入基础 REST API，并处理分页、异常返回和常见调试问题。",
  },
};

function Options({name,values,multi=false,answers,setAnswers}:{name:string;values:string[];multi?:boolean;answers:ProfileAnswers;setAnswers:(a:ProfileAnswers)=>void}){
  const current=answers[name]; const pick=(v:string)=>{if(!multi)return setAnswers({...answers,[name]:v});const list=Array.isArray(current)?current as string[]:[];setAnswers({...answers,[name]:list.includes(v)?list.filter(x=>x!==v):[...list,v]})};
  return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{values.map(v=>{const active=Array.isArray(current)?current.includes(v):current===v;return <button type="button" key={v} onClick={()=>pick(v)} className={`choice flex items-center justify-between ${active?"active":""}`}><span className="text-sm font-semibold">{v}</span>{active&&<Check size={16}/>}</button>})}</div>
}

function SkillPicker({answers,setAnswers}:{answers:ProfileAnswers;setAnswers:(a:ProfileAnswers)=>void}){
  const selected=Array.isArray(answers.skills)?answers.skills as string[]:[]; const levels=(answers.skillLevels||{}) as Record<string,SkillLevel>;
  const select=(skill:string)=>setAnswers({...answers,skills:[...selected,skill],skillLevels:{...levels,[skill]:1}});
  const level=(skill:string,value:SkillLevel)=>setAnswers({...answers,skillLevels:{...levels,[skill]:value}});
  const remove=(skill:string)=>setAnswers({...answers,skills:selected.filter(x=>x!==skill)});
  return <div>
    <p className="mb-4 rounded-xl border border-[#dedff0] bg-[#f7f7ff] p-3 text-xs leading-6 text-[#65688b]">技能等级仅用于用户自评与岗位匹配参考，不代表系统已对实际能力进行认证。</p>
    <div className="grid gap-3 sm:grid-cols-2">{skills.map(skill=>{const active=selected.includes(skill);const currentLevel=levels[skill]||1;const descriptions=skillLevelDescriptions[skill];return <div key={skill} className={`relative rounded-2xl border p-4 transition ${active?"border-[#6575e9] bg-[#f1f2ff]":"border-[#e1dfda] bg-white"}`}>
      {active?<div className="flex w-full items-center justify-between gap-3"><span className="font-bold">{skill}</span><span className="tag !py-1">{levelNames[currentLevel]}</span></div>:<button type="button" onClick={()=>select(skill)} className="flex w-full items-center justify-between text-left"><span className="font-bold">{skill}</span><span className="text-xs text-[#92939a]">点击掌握</span></button>}
      {active&&<div className="animate-in mt-4 rounded-xl border border-[#dfe1f5] bg-white p-3">
        <p className="mb-2 text-xs font-extrabold text-[#5969dc]">等级参考</p>
        <div className="grid gap-2">{([1,2,3] as SkillLevel[]).map(n=>{const current=n===currentLevel;return <button type="button" key={n} onClick={()=>level(skill,n)} aria-pressed={current} className={`rounded-lg border p-3 text-left transition ${current?"border-[#6575e9] bg-[#f1f2ff] shadow-sm":"border-[#ececf2] bg-white hover:border-[#cfd3f3] hover:bg-[#fafaff]"}`}><span className={`block text-sm font-extrabold ${current?"text-[#5363cf]":"text-[#555762]"}`}>{n}级｜{levelNames[n]}</span><span className="mt-1 block text-xs leading-5 text-[#777985]">{descriptions[n]}</span></button>})}</div>
        <button type="button" onClick={()=>remove(skill)} className="mt-3 rounded-lg px-2 py-1 text-left text-xs text-[#b05454] hover:bg-[#fff2f2]">移除技能</button>
      </div>}
    </div>})}</div>
  </div>
}

export default function ProfilePage(){
  const router=useRouter(); const [step,setStep]=useState(1); const [answers,setAnswers]=useState<ProfileAnswers>({}); const [hasPrevious,setHasPrevious]=useState(false);
  useEffect(()=>{setAnswers(loadProfile());setStep(loadProfileStep());setHasPrevious(Boolean(loadCurrent())||Object.keys(loadProfile()).length>0)},[]);
  const set=(a:ProfileAnswers)=>{setAnswers(a);saveProfile(a)};
  const goStep=(value:number)=>{setStep(value);saveProfileStep(value)};
  const startNew=()=>{if(window.confirm("开始新的测试？新的测试不会删除历史记录。")){resetCurrentAnalysis();setAnswers({});goStep(1);setHasPrevious(false)}};
  const next=()=>{if(step<4)goStep(step+1);else{saveProfile(answers);saveProfileStep(4);router.push("/report?analyze=1")}};
  return <PageShell><section className="container py-10 sm:py-14"><div className="mx-auto max-w-4xl">
    {hasPrevious&&<div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[#dedff3] bg-[#f3f4ff] p-4"><Sparkles size={18} className="text-[#5969dc]"/><span className="mr-auto text-sm font-semibold">检测到上次测试，可以继续填写或重新开始。</span><button onClick={()=>setHasPrevious(false)} className="btn-secondary !min-h-9 text-sm">继续上次测试</button><Link href="/history" className="btn-secondary !min-h-9 text-sm"><History size={15}/>查看历史记录</Link><button onClick={startNew} className="btn-secondary !min-h-9 text-sm"><RotateCcw size={15}/>重新开始测试</button></div>}
    <div className="mb-8"><div className="mb-3 flex items-center justify-between text-sm"><span className="font-bold text-[#5969dc]">求职画像 · 第 {step} 步</span><span className="text-[#80828b]">{step} / 4</span></div><div className="progress"><i style={{width:`${step*25}%`}}/></div></div>
    <div className="card min-h-[560px] p-5 sm:p-9">
      {step===1&&<Step title="先认识一下你" en="Personal background" desc="只需选择，不需要写长篇自我介绍。"><Field title="当前学历"><Options name="degree" values={groups.degree} answers={answers} setAnswers={set}/></Field><Field title="专业背景"><Options name="major" values={groups.major} answers={answers} setAnswers={set}/></Field><Field title="毕业年份"><Options name="grad" values={groups.grad} answers={answers} setAnswers={set}/></Field><Field title="希望进入的 AI 方向" hint="可多选"><Options name="direction" multi values={groups.direction} answers={answers} setAnswers={set}/></Field><Field title="目标城市"><Options name="city" values={groups.city} answers={answers} setAnswers={set}/></Field></Step>}
      {step===2&&<Step title="你的实习条件" en="Internship conditions" desc="很多 JD 的第一道门槛，其实是时间匹配。"><Field title="最早到岗"><Options name="arrival" values={groups.arrival} answers={answers} setAnswers={set}/></Field><Field title="每周可以到岗"><Options name="days" values={groups.days} answers={answers} setAnswers={set}/></Field><Field title="最长连续实习"><Options name="months" values={groups.months} answers={answers} setAnswers={set}/></Field><Field title="办公方式"><Options name="office" values={groups.office} answers={answers} setAnswers={set}/></Field></Step>}
      {step===3&&<Step title="你已经积累了什么" en="Skills & experience" desc="先选择技能，再按需要补充熟练度；未设置时默认按“了解”处理。"><Field title="技能与掌握程度"><SkillPicker answers={answers} setAnswers={set}/></Field><Field title="代码能力"><Options name="code" values={groups.code} answers={answers} setAnswers={set}/></Field><Field title="实习经历"><Options name="internship" values={groups.internship} answers={answers} setAnswers={set}/></Field><Field title="项目经历"><Options name="projects" values={groups.projects} answers={answers} setAnswers={set}/></Field></Step>}
      {step===4&&<Step title="粘贴目标岗位 JD" en="Job description" desc="不会联网搜索企业，当前分析使用模拟逻辑与示例数据。"><div className="grid gap-4 sm:grid-cols-2"><input className="input" placeholder="岗位名称" value={String(answers.job||"")} onChange={e=>set({...answers,job:e.target.value})}/><input className="input" placeholder="企业名称" value={String(answers.company||"")} onChange={e=>set({...answers,company:e.target.value})}/><input className="input sm:col-span-2" placeholder="岗位城市" value={String(answers.jobCity||"")} onChange={e=>set({...answers,jobCity:e.target.value})}/><div className="relative sm:col-span-2"><textarea className="input min-h-64 resize-y !p-5" placeholder="在这里粘贴完整的岗位描述……" value={String(answers.jd||"")} onChange={e=>set({...answers,jd:e.target.value})}/><button type="button" onClick={()=>set({...answers,job:"AI 产品实习生",company:"示例科技公司",jobCity:"苏州",jd:sampleJD})} className="btn-secondary absolute bottom-4 right-4 !min-h-10 text-sm"><ClipboardPaste size={16}/>使用示例 JD</button></div></div></Step>}
    </div><div className="mt-6 flex justify-between"><button disabled={step===1} onClick={()=>goStep(step-1)} className="btn-secondary disabled:invisible"><ArrowLeft size={17}/>上一步</button><button onClick={next} className="btn-primary">{step===4?"开始识别岗位":"继续"}<ArrowRight size={17}/></button></div>
  </div></section></PageShell>
}
function Step({title,en,desc,children}:{title:string;en:string;desc:string;children:React.ReactNode}){return <div className="animate-in"><p className="eyebrow">{en}</p><h1 className="mt-2 text-3xl font-extrabold">{title}</h1><p className="muted mt-2">{desc}</p><div className="mt-8 space-y-8">{children}</div></div>}
function Field({title,hint,children}:{title:string;hint?:string;children:React.ReactNode}){return <div><div className="mb-3 flex items-center gap-2"><h2 className="font-extrabold">{title}</h2>{hint&&<span className="text-xs text-[#8a8b94]">{hint}</span>}</div>{children}</div>}
