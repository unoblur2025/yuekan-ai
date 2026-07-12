import Link from "next/link";
import { ArrowRight, Bot, CheckCircle2, Clock3, Code2, Database, Sparkles } from "lucide-react";
import PageShell from "@/components/PageShell";

const gaps = [
  [Bot,"Agent Workflow","基础了解","可独立搭建简单流程","中等","约 5 小时",["理解 Agent 的工具调用与记忆","用 Dify 搭建一个 JD 分析流程","记录 3 个失败案例并迭代"]],
  [Database,"RAG 检索评估","做过基础项目","能解释并选择检索指标","较小","约 3 小时",["复习切片、召回与重排","了解 Recall@K 与命中率","给自己的项目补一页评估记录"]],
  [Code2,"Python 项目证据","能修改简单代码","能展示业务自动化脚本","中等","约 6 小时",["整理现有代码并补注释","用 Python 处理一份 JD 数据","录制 2 分钟项目演示"]],
];

export default function PlanPage(){return <PageShell><section className="container py-12 sm:py-16">
  <div className="max-w-3xl"><div className="tag"><Sparkles size={14}/> 基于本次岗位报告</div><h1 className="title mt-5">你的 AI 入场路线</h1><p className="muted mt-4 text-lg leading-8">先补影响投递的关键证据，再扩展长期能力。不追求一次学完所有技术。</p></div>
  <div className="mt-10 grid gap-5">{gaps.map(([Icon,name,current,target,gap,time,tasks],i)=>{const I=Icon as typeof Bot;return <article className="card grid gap-6 p-6 md:grid-cols-[.7fr_1.3fr] sm:p-8" key={String(name)}><div><div className="mb-5 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#eef0ff] text-[#5868d7]"><I/></span><div><span className="text-xs font-bold text-[#91929a]">能力 0{i+1}</span><h2 className="text-xl font-extrabold">{String(name)}</h2></div></div><div className="space-y-3 text-sm"><Meta label="当前状态" value={String(current)}/><Meta label="岗位要求" value={String(target)}/><Meta label="差距程度" value={String(gap)}/><Meta label="预计补充" value={String(time)}/></div></div><div className="soft-card p-5"><h3 className="font-extrabold">建议学习任务</h3><div className="mt-4 space-y-3">{(tasks as string[]).map((x,j)=><div className="flex gap-3" key={x}><span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-xs font-black text-[#5a68ce]">{j+1}</span><span className="text-sm leading-6 text-[#5f616b]">{x}</span></div>)}</div></div></article>})}</div>
  <section className="mt-12"><p className="eyebrow">72 hours sprint</p><h2 className="mt-3 text-3xl font-extrabold">72 小时面试准备计划</h2><div className="mt-6 grid gap-4 md:grid-cols-3">{[
    ["第一天","打牢 RAG 基础","理解知识切片、向量检索和召回，画出一张完整流程图。","2 小时"],
    ["第二天","做出 Agent Demo","使用 Dify 搭建 Agent Workflow，完成一个可演示的流程。","3 小时"],
    ["第三天","把经历讲清楚","准备项目介绍和企业业务问题，完成一次模拟面试。","3 小时"]
  ].map(([day,title,desc,time])=><div className="card p-6" key={day}><span className="tag">{day}</span><h3 className="mt-5 text-xl font-extrabold">{title}</h3><p className="muted mt-3 min-h-20 text-sm leading-6">{desc}</p><div className="mt-5 flex items-center gap-2 text-sm font-bold"><Clock3 size={16} className="text-[#5969dc]"/>{time}</div></div>)}</div></section>
  <div className="mt-10 rounded-[28px] bg-[#292b39] p-7 text-white sm:flex sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-[#b8c0ff]"><CheckCircle2 size={18}/><b>完成后可能提升</b></div><p className="mt-3 text-lg font-bold">AI 产品、企业知识库、AI 产品运营类岗位的项目可信度</p><p className="mt-1 text-sm text-[#b9bac2]">学习计划用于提升岗位能力，不承诺一定获得 Offer。</p></div><Link href="/interview" className="btn-primary mt-6 sm:mt-0">开始模拟面试 <ArrowRight size={17}/></Link></div>
  </section></PageShell>}
function Meta({label,value}:{label:string;value:string}){return <div className="flex justify-between gap-4 border-b border-black/5 pb-2"><span className="muted">{label}</span><b>{value}</b></div>}
