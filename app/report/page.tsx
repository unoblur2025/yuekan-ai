"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, BriefcaseBusiness, Building2, Check, ChevronDown, CircleAlert, Clock3, Code2, FileText, RotateCcw, Sparkles, Target, Users } from "lucide-react";
import PageShell from "@/components/PageShell";
import { AnalysisRecord, demoRecord, levelNames, loadCurrent, loadProfile, resetCurrentAnalysis, saveAIAnalysis } from "@/lib/analysis-data";
import { JobAnalysisResult, profileToAnalysisInput } from "@/lib/job-analysis-schema";

const requirement = {"Prompt Engineering":2,RAG:2,PRD:2,Agent:2,Python:1,"数据分析":2} as const;
const LOADING_MESSAGES=["正在理解岗位内容","正在识别真实门槛","正在检查实习条件","正在匹配个人能力","正在生成行动建议"];
type SkillStatus = "reached" | "light-gap" | "gap";

function assessSkills(record: AnalysisRecord) {
  return Object.entries(requirement).map(([skill, required]) => {
    const selected = record.skills.includes(skill);
    const personal = selected ? (record.skillLevels?.[skill] || 1) : 0;
    const difference = personal - required;
    const status: SkillStatus = !selected ? "gap" : difference >= 0 ? "reached" : difference === -1 ? "light-gap" : "gap";
    const statusText = status === "reached" ? "已达到岗位要求" : status === "light-gap" ? "具备基础，但存在轻度差距" : "当前能力差距";
    const advice = status === "reached"
      ? personal === 3 ? "保持优势，并整理真实项目证据" : `${skill} 基础达到要求，但项目证据仍需补充。`
      : status === "light-gap"
        ? skill === "Agent" ? "Agent 存在轻度能力差距，需要补充 Workflow 实操。" : `${skill} 存在轻度能力差距，需要补充针对性实操。`
        : personal === 1 ? `${skill} 目前以概念理解为主，需要补充实际操作。` : `${skill} 技能等级不足，需要从基础学习和练习开始。`;
    return { skill, required, personal, status, statusText, advice };
  });
}

export default function ReportPage(){
  const router=useRouter();
  const [record,setRecord]=useState<AnalysisRecord|null>(null);
  const [loading,setLoading]=useState(true);
  const [loadingStep,setLoadingStep]=useState(0);
  const [secondsRemaining,setSecondsRemaining]=useState(60);
  const [error,setError]=useState<string|null>(null);
  const inFlight=useRef(false);
  const countdownTimer=useRef<number|null>(null);
  const requestTimeoutTimer=useRef<number|null>(null);
  const requestController=useRef<AbortController|null>(null);
  const clearAnalysisTimers=useCallback(()=>{
    if(countdownTimer.current!==null){window.clearInterval(countdownTimer.current);countdownTimer.current=null}
    if(requestTimeoutTimer.current!==null){window.clearTimeout(requestTimeoutTimer.current);requestTimeoutTimer.current=null}
  },[]);
  const startAnalysis=useCallback(async()=>{
    if(inFlight.current)return;
    inFlight.current=true;
    clearAnalysisTimers();
    requestController.current?.abort();
    setError(null);setLoading(true);setLoadingStep(0);setSecondsRemaining(60);
    countdownTimer.current=window.setInterval(()=>setSecondsRemaining(previous=>{const next=Math.max(0,previous-1);setLoadingStep(next>48?0:next>36?1:next>24?2:next>12?3:4);return next}),1000);
    const controller=new AbortController();
    requestController.current=controller;
    requestTimeoutTimer.current=window.setTimeout(()=>controller.abort(),90000);
    try{
      const profile=loadProfile();
      const response=await fetch("/api/analyze-job",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(profileToAnalysisInput(profile)),signal:controller.signal});
      const payload=await response.json() as {analysis?:JobAnalysisResult;error?:string};
      if(!response.ok||!payload.analysis)throw new Error(payload.error||"分析失败，请稍后重试。");
      const nextRecord=saveAIAnalysis(profile,payload.analysis);
      setRecord(nextRecord);
      router.replace("/report");
    }catch(reason){setError(reason instanceof Error&&reason.name==="AbortError"?"本次岗位分析响应超时，请重新尝试。":reason instanceof Error?reason.message:"分析失败，请稍后重试。")}finally{if(requestController.current===controller){clearAnalysisTimers();requestController.current=null;inFlight.current=false;setLoading(false)}}
  },[clearAnalysisTimers,router]);
  useEffect(()=>{
    const search=window.location.search;
    let launchTimer:number|null=null;
    if(search.includes("demo=1")){setRecord(demoRecord);setLoading(false)}
    else if(search.includes("analyze=1")){launchTimer=window.setTimeout(()=>void startAnalysis(),0)}
    else{const current=loadCurrent();if(current)setRecord(current);else setError("尚未找到岗位分析结果，请返回问卷重新分析。");setLoading(false)}
    return()=>{if(launchTimer!==null)window.clearTimeout(launchTimer);clearAnalysisTimers();requestController.current?.abort()}
  },[clearAnalysisTimers,startAnalysis]);
  if(loading)return <PageShell><section className="container py-16"><div className="card mx-auto max-w-2xl p-8 sm:p-10"><div className="mb-7 flex items-center gap-4"><span className="grid size-12 animate-pulse place-items-center rounded-2xl bg-[#eff0ff] text-[#5969dc]"><Sparkles/></span><div><p className="eyebrow">AI analysis</p><h1 className="mt-1 text-2xl font-extrabold">{LOADING_MESSAGES[loadingStep]}</h1><p className="mt-2 font-bold text-[#5969dc]">{secondsRemaining>0?`预计还需约 ${secondsRemaining} 秒`:"正在完成最后校验，请再稍候……"}</p></div></div><div className="progress"><i style={{width:`${(loadingStep+1)*20}%`}}/></div><div className="mt-6 space-y-3">{LOADING_MESSAGES.map((message,index)=><div key={message} className={`flex items-center justify-between gap-3 text-sm ${index<=loadingStep?"text-[#4f5fc4]":"text-[#a2a3aa]"}`}><span className="flex items-center gap-3"><span className={`size-2 rounded-full ${index===loadingStep?"animate-pulse bg-[#5969dc]":index<loadingStep?"bg-[#68a77e]":"bg-[#dedde3]"}`}/>{message}</span>{index<loadingStep&&<span className="text-xs text-[#5f9a73]">已完成</span>}</div>)}</div><p className="muted mt-6 text-xs">{secondsRemaining>0?"分析时间会根据 JD 长度和模型响应速度变化。":"复杂 JD 可能需要更长时间，最长等待约 90 秒。"}</p></div></section></PageShell>;
  if(error)return <PageShell><section className="container py-16"><div className="card mx-auto max-w-2xl p-8 sm:p-10"><div className="flex items-start gap-4"><CircleAlert className="mt-1 shrink-0 text-[#c76843]"/><div><p className="eyebrow">Analysis failed</p><h1 className="mt-2 text-2xl font-extrabold">岗位分析未完成</h1><p className="muted mt-3 leading-7">{error}</p></div></div><div className="mt-7 flex flex-wrap gap-3"><button onClick={()=>void startAnalysis()} className="btn-primary"><RotateCcw size={17}/>重新分析</button><Link href="/profile" className="btn-secondary">返回修改</Link></div></div></section></PageShell>;
  if(!record)return <PageShell><div className="container py-24 text-center muted">正在读取分析记录…</div></PageShell>;
  const analysis=record.analysis;
  const date=new Date(record.createdAt).toLocaleString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
  const skillAssessments = analysis?.skillMatches.length ? analysis.skillMatches.map(item=>({skill:item.skill,required:item.requiredLevel,personal:item.personalLevel,status:item.status==="已达到岗位要求"?"reached" as const:item.status==="具备基础，但存在轻度差距"?"light-gap" as const:"gap" as const,statusText:item.status,advice:item.advice})) : assessSkills(record);
  const reachedSkills = analysis?.reachedCapabilities.length ? analysis.reachedCapabilities : skillAssessments.filter(item => item.status === "reached").map(item => `${item.skill} · ${levelNames[item.personal as 1 | 2 | 3]}（已达到要求）`);
  const skillGaps = analysis ? [...analysis.capabilityGaps,...analysis.missingEvidence] : skillAssessments.filter(item => item.status !== "reached" || item.personal < 3).map(item => item.advice);
  const maximumRisk = analysis?.topRisk || skillAssessments.find(item => item.status === "gap")?.advice || skillAssessments.find(item => item.status === "light-gap")?.advice || skillAssessments.find(item => item.personal < 3)?.advice || "当前技能已达到岗位要求，请重点准备项目证据。";
  const radarValues=analysis?[analysis.radar.aiTechnology,analysis.radar.product,analysis.radar.business,analysis.radar.data,analysis.radar.coding,analysis.radar.communication]:[78,86,82,62,42,80];
  const requirementLayers=[analysis?.hardRequirements||["每周到岗 5 天","连续实习至少 4 个月","本科及以上"],analysis?.coreCapabilities||["需求分析","AI 产品理解","Prompt 与产品文档"],analysis?.shortTermSkills||["Agent Workflow","RAG 评估指标","Python 基础"],analysis?.bonusItems||["行业经验","知识库项目","数据分析能力"]];
  const gateChecksForDisplay=analysis?.gateChecks||[["学历要求","符合","已达到本科及以上"],["毕业年份","符合","与实习生招聘范围一致"],["每周到岗","符合","可满足每周 5 天"],["实习周期","符合","可连续实习 4 个月"],["专业背景","存在风险","非计算机专业，但未设置淘汰限制"],["算法训练","符合","JD 未发现算法训练硬门槛"]].map(([item,status,reason])=>({item,status,reason,sourceText:"模拟案例规则",type:"明确硬门槛" as const,userCondition:"模拟用户条件"}));
  return <PageShell><section className="container py-10 sm:py-14">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><div className="tag mb-4"><Sparkles size={14}/> 阅槛 AI · 分析报告</div><h1 className="title">{record.jobTitle}</h1><p className="muted mt-2">{record.companyName} · {record.city} · 分析于 {date}</p></div><Link href="/profile" onClick={()=>resetCurrentAnalysis()} className="btn-secondary"><RotateCcw size={17}/>重新分析</Link></header>

    <section className="mb-6 overflow-hidden rounded-[32px] bg-[#292b39] text-white shadow-2xl shadow-[#303245]/15"><div className="grid gap-8 p-7 md:grid-cols-[220px_1fr] md:items-center sm:p-10">
      <div className="mx-auto"><div className="grid size-48 place-items-center rounded-full p-[13px]" style={{background:`conic-gradient(#91a0ff ${record.fitScore*3.6}deg,rgba(255,255,255,.13) 0)`}}><div className="grid size-full place-items-center rounded-full bg-[#292b39] text-center"><div><strong className="text-6xl tracking-[-.06em]">{record.fitScore}<span className="text-2xl">%</span></strong><p className="mt-2 text-xs text-white/60">综合适配度</p></div></div></div></div>
      <div><p className="text-sm font-bold text-[#aeb7ff]">综合结论</p><h2 className="mt-2 text-4xl font-extrabold tracking-tight text-[#d9ffea]">{record.recommendation}</h2><p className="mt-4 max-w-2xl leading-7 text-white/70">{record.report.summary}</p><div className="mt-6 grid gap-3 sm:grid-cols-3"><Metric label="匹配等级" value={record.matchGrade}/><Metric label="投递优先级" value={record.priority}/><Metric label="分析可信度" value={analysis?.confidence||"较高"}/></div><div className="mt-5 flex items-start gap-3 rounded-2xl bg-white/8 p-4"><AlertTriangle className="shrink-0 text-[#ffca91]" size={19}/><div><p className="text-xs text-white/55">最大风险</p><b className="mt-1 block">{maximumRisk}</b></div></div></div>
    </div></section>

    <div className="space-y-6">
      <ReportSection eyebrow="01 · Role decoded" title="这个岗位到底在做什么？" icon={BriefcaseBusiness}><div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]"><div className="rounded-3xl bg-[#f0f1ff] p-6"><p className="text-xs font-bold text-[#6972c1]">岗位真实方向</p><h3 className="mt-2 text-2xl font-extrabold">{record.report.direction}</h3><p className="mt-4 leading-8 text-[#5d6070]">{analysis?.plainExplanation||"这个岗位的核心不是训练模型，而是理解业务需求，参与知识库、工作流或 AI 应用设计，并通过测试持续优化产品效果。"}</p></div><div className="grid gap-3 sm:grid-cols-2"><Info label="核心目标" value={analysis?.coreGoal||"把业务知识变成可靠的 AI 产品"}/><Info label="服务对象" value={analysis?.serviceAudience||"企业客户与一线业务人员"}/><Info label="日常工作" value={analysis?.dailyWork.join("、")||"需求拆解、原型、测试与迭代"}/><Info label="常见产出" value={analysis?.commonOutputs.join("、")||"PRD、Prompt、评估表、原型"}/></div></div></ReportSection>

      <ReportSection eyebrow="02 · Capability radar" title="岗位能力雷达" icon={Target}><div className="grid gap-8 md:grid-cols-[340px_1fr] md:items-center"><Radar values={radarValues}/><div className="space-y-3">{["AI 技术理解","产品能力","业务理解","数据能力","代码能力","沟通协作"].map((x,index)=>{const n=radarValues[index];return <div key={x}><div className="mb-1 flex justify-between text-sm"><b>{x}</b><span>{n}</span></div><div className="progress"><i style={{width:`${n}%`}}/></div></div>})}</div></div></ReportSection>

      <ReportSection eyebrow="03 · Requirement layers" title="岗位要求分层" icon={FileText}><div className="grid gap-4 md:grid-cols-4">{["真正硬门槛","核心能力","短期可补","加分项"].map((title,i)=><div key={title} className={`rounded-3xl p-5 ${i===0?"bg-[#fff1e7]":i===1?"bg-[#edf0ff]":i===2?"bg-[#edf8f2]":"bg-[#f5f0fa]"}`}><span className="text-xs font-black opacity-50">0{i+1}</span><h3 className="mt-2 font-extrabold">{title}</h3><ul className="mt-4 space-y-2 text-sm text-[#62646e]">{requirementLayers[i].map(x=><li key={x}>· {x}</li>)}</ul></div>)}</div></ReportSection>

      <ReportSection eyebrow="04 · Personal match" title="个人匹配分析" icon={Users}><div className="grid gap-5 md:grid-cols-3"><List title="已达到岗位要求" items={reachedSkills.length?reachedSkills:["暂无达到岗位要求的技能"]} tone="blue"/><List title="专业可迁移能力" items={analysis?.transferableCapabilities.length?analysis.transferableCapabilities:["多源资料整理","复杂问题拆解","业务约束分析","方案设计"]} tone="green"/><List title="当前差距与证据不足" items={skillGaps.length?skillGaps:["当前技能已达到要求，请整理项目证据"]} tone="orange"/></div></ReportSection>

      <ReportSection eyebrow="05 · Skill details" title="技能匹配明细" icon={Code2}><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b border-[#e6e4de] text-[#7c7e87]"><th className="p-3">技能</th><th>岗位要求</th><th>个人水平</th><th>差距</th><th>建议</th></tr></thead><tbody>{skillAssessments.map(item=><tr className="border-b border-[#eeece7]" key={item.skill}><td className="p-3 font-bold">{item.skill}</td><td>{levelNames[item.required]}</td><td>{item.personal?levelNames[item.personal as 1 | 2 | 3]:"未掌握"}</td><td><span className={`tag ${item.status==="reached"?"!bg-[#eaf8ef] !text-[#26774c]":item.status==="light-gap"?"!bg-[#fff1e7] !text-[#995a31]":"!bg-[#fdeaea] !text-[#a44343]"}`}>{item.statusText}</span></td><td>{item.advice}</td></tr>)}</tbody></table></div></ReportSection>

      <ReportSection eyebrow="06 · Gate check" title="硬门槛检查" icon={Check}><div className="grid gap-3 md:grid-cols-2">{gateChecksForDisplay.map(({item,status,reason,sourceText,type,userCondition})=>{const positive=["符合","达到要求","满足偏好","已具备加分项"].includes(status);return <div className="flex items-start gap-3 rounded-2xl bg-[#f6f5f2] p-4" key={item}>{positive?<Check className="shrink-0 text-[#3e9a68]"/>:<CircleAlert className="shrink-0 text-[#cb7745]"/>}<div className="min-w-0"><b>{item} · {status}</b><p className="muted mt-1 text-sm">{reason}</p><details className="mt-3 text-xs"><summary className="cursor-pointer font-bold text-[#5969dc]">查看判断依据</summary><div className="mt-2 space-y-1 leading-5 text-[#737580]"><p>JD 原文：{sourceText}</p><p>要求类型：{type}</p><p>用户条件：{userCondition}</p><p>判断结果：{status}</p></div></details></div></div>})}</div></ReportSection>

      <ReportSection eyebrow="07 · Hidden risks" title="隐藏风险" icon={AlertTriangle}><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(analysis?.hiddenRisks||["岗位名称与真实工作基本一致","存在轻度隐性开发要求","暂未发现偏销售倾向","可能偏产品运营与测试","行业经验属于加分项","实习周期是明确筛选项"].map((title,i)=>({title,detail:i===1?"JD 出现 Python、Linux 与 API，需要面试确认实际开发工作占比。":"属于可确认或可补充项，建议面试时用具体问题核实。"}))).map(({title,detail})=><details key={title} className="rounded-2xl border border-[#e6e3dd] bg-white p-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold">{title}<ChevronDown size={16}/></summary><p className="muted mt-3 text-sm leading-6">{detail}</p></details>)}</div></ReportSection>

      <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-[#eef0ff] to-[#f3ecfb] p-7 sm:p-9"><div className="grid gap-8 lg:grid-cols-[1fr_auto]"><div><p className="eyebrow">08 · Final action</p><h2 className="mt-3 text-3xl font-extrabold">{record.recommendation}</h2><p className="muted mt-3 max-w-2xl leading-7">{analysis?`${analysis.whyWorthApplying} 需要注意：${analysis.whyMayNotFit} 投递前建议：${analysis.beforeApplying.join("、")}。`:"岗位值得投递。预计用 6–8 小时完成针对性准备：补一个 Agent Workflow Demo，整理 RAG 项目评估记录，并准备两段业务需求拆解案例。"}</p><div className="mt-5 flex flex-wrap gap-3"><span className="tag">优先级：{record.priority}</span><span className="tag">建议：{record.recommendation}</span><span className="tag"><Clock3 size={14}/>准备 {analysis?.estimatedPreparationTime||"6–8 小时"}</span></div></div><div className="flex min-w-64 flex-col justify-center gap-3"><Link href="/plan" className="btn-primary">72 小时准备计划 <ArrowRight size={17}/></Link><Link href="/company" className="btn-secondary"><Building2 size={17}/>研究目标企业</Link><Link href="/interview" className="btn-secondary"><BookOpen size={17}/>准备面试问题</Link><Link href="/history" className="btn-secondary">查看历史记录</Link></div></div></section>
    </div>
  </section></PageShell>
}

function Metric({label,value}:{label:string;value:string}){return <div className="rounded-2xl bg-white/8 p-4"><p className="text-xs text-white/50">{label}</p><b className="mt-1 block text-xl">{value}</b></div>}
function ReportSection({eyebrow,title,icon:Icon,children}:{eyebrow:string;title:string;icon:typeof Target;children:React.ReactNode}){return <section className="card p-6 sm:p-8"><div className="mb-7 flex items-start gap-4"><span className="grid size-11 place-items-center rounded-2xl bg-[#eff0ff] text-[#5969dc]"><Icon size={21}/></span><div><p className="eyebrow">{eyebrow}</p><h2 className="mt-1 text-2xl font-extrabold">{title}</h2></div></div>{children}</section>}
function Info({label,value}:{label:string;value:string}){return <div className="soft-card p-4"><p className="text-xs text-[#888a93]">{label}</p><b className="mt-2 block leading-6">{value}</b></div>}
function List({title,items,tone}:{title:string;items:string[];tone:string}){const bg=tone==="green"?"bg-[#edf8f2]":tone==="orange"?"bg-[#fff2e9]":"bg-[#eff1ff]";return <div className={`rounded-3xl p-5 ${bg}`}><h3 className="font-extrabold">{title}</h3><ul className="mt-4 space-y-2 text-sm text-[#62646e]">{items.map(x=><li key={x}>· {x}</li>)}</ul></div>}
function Radar({values}:{values:number[]}){const points=values.map((v,i)=>{const a=(-90+i*60)*Math.PI/180;return `${150+Math.cos(a)*v},${150+Math.sin(a)*v}`}).join(" ");return <svg viewBox="0 0 300 300" className="mx-auto w-full max-w-[320px]" aria-label="岗位能力雷达图">{[35,65,95].map(r=><polygon key={r} points={Array.from({length:6},(_,i)=>{const a=(-90+i*60)*Math.PI/180;return `${150+Math.cos(a)*r},${150+Math.sin(a)*r}`}).join(" ")} fill="none" stroke="#dcddea"/>)}{Array.from({length:6},(_,i)=>{const a=(-90+i*60)*Math.PI/180;return <line key={i} x1="150" y1="150" x2={150+Math.cos(a)*95} y2={150+Math.sin(a)*95} stroke="#e2e2ec"/>})}<polygon points={points} fill="rgba(89,105,220,.2)" stroke="#5969dc" strokeWidth="3"/></svg>}
