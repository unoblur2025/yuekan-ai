"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Building2, CalendarDays, History as HistoryIcon, MapPin, MessageSquareText, RotateCcw, Trash2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import { AnalysisRecord, deleteHistoryRecord, loadHistory, resetCurrentAnalysis, selectHistoryRecord } from "@/lib/analysis-data";

export default function HistoryPage(){
  const [records,setRecords]=useState<AnalysisRecord[]>([]); useEffect(()=>setRecords(loadHistory()),[]);
  const open=(id:string)=>{selectHistoryRecord(id)}; const startNew=()=>{resetCurrentAnalysis()}; const remove=(id:string)=>{if(window.confirm("确定删除这条分析记录吗？")){deleteHistoryRecord(id);setRecords(loadHistory())}};
  return <PageShell><section className="container py-12 sm:py-16"><div className="flex flex-wrap items-end justify-between gap-4"><div><span className="tag"><HistoryIcon size={15}/> 本机浏览器保存</span><h1 className="title mt-5">历史分析记录</h1><p className="muted mt-3">回到任何一次分析，无需重复填写问卷。</p></div><Link href="/profile" onClick={startNew} className="btn-primary"><RotateCcw size={17}/>开始新的分析</Link></div>
    {records.length===0?<div className="card mt-10 py-20 text-center"><HistoryIcon className="mx-auto text-[#a0a3c5]" size={36}/><h2 className="mt-4 text-xl font-extrabold">还没有分析记录</h2><p className="muted mt-2">完成一次岗位识别后，记录会自动出现在这里。</p><Link href="/profile" onClick={startNew} className="btn-primary mt-6">开始第一次分析</Link></div>:
    <div className="mt-10 grid gap-5">{records.map(r=><article className="card p-6 sm:p-7" key={r.id}><div className="grid gap-6 lg:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-2"><span className="tag">适配度 {r.fitScore}%</span><span className="tag !bg-[#eaf8ef] !text-[#26774c]">{r.recommendation}</span><span className="tag">等级 {r.matchGrade}</span></div><h2 className="mt-4 text-2xl font-extrabold">{r.jobTitle}</h2><div className="muted mt-2 flex flex-wrap gap-4 text-sm"><span className="flex items-center gap-1"><Building2 size={15}/>{r.companyName}</span><span className="flex items-center gap-1"><MapPin size={15}/>{r.city}</span><span className="flex items-center gap-1"><CalendarDays size={15}/>{new Date(r.createdAt).toLocaleDateString("zh-CN")}</span></div><div className="mt-5 flex items-center gap-2 rounded-2xl bg-[#fff3e9] p-3 text-sm text-[#855535]"><BriefcaseBusiness size={17}/><b>最高风险：</b>{r.topRisk}</div></div><div className="flex min-w-56 flex-col justify-center gap-2"><Link href="/report" onClick={()=>open(r.id)} className="btn-primary">查看完整报告 <ArrowRight size={16}/></Link><Link href="/company" onClick={()=>open(r.id)} className="btn-secondary"><Building2 size={16}/>继续企业研究</Link><Link href="/interview" onClick={()=>open(r.id)} className="btn-secondary"><MessageSquareText size={16}/>继续面试准备</Link><Link href="/profile" onClick={startNew} className="btn-secondary"><RotateCcw size={16}/>重新分析</Link><button onClick={()=>remove(r.id)} className="btn-secondary !text-[#a34f4f]"><Trash2 size={16}/>删除记录</button></div></div></article>)}</div>}
  </section></PageShell>
}
