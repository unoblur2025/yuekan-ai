"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ClipboardPaste, History, RotateCcw, Sparkles } from "lucide-react";
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

function Options({name,values,multi=false,answers,setAnswers}:{name:string;values:string[];multi?:boolean;answers:ProfileAnswers;setAnswers:(a:ProfileAnswers)=>void}){
  const current=answers[name]; const pick=(v:string)=>{if(!multi)return setAnswers({...answers,[name]:v});const list=Array.isArray(current)?current as string[]:[];setAnswers({...answers,[name]:list.includes(v)?list.filter(x=>x!==v):[...list,v]})};
  return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{values.map(v=>{const active=Array.isArray(current)?current.includes(v):current===v;return <button type="button" key={v} onClick={()=>pick(v)} className={`choice flex items-center justify-between ${active?"active":""}`}><span className="text-sm font-semibold">{v}</span>{active&&<Check size={16}/>}</button>})}</div>
}

function SkillPicker({answers,setAnswers}:{answers:ProfileAnswers;setAnswers:(a:ProfileAnswers)=>void}){
  const selected=Array.isArray(answers.skills)?answers.skills as string[]:[]; const levels=(answers.skillLevels||{}) as Record<string,SkillLevel>; const [editing,setEditing]=useState<string|null>(null);
  const toggle=(skill:string)=>{if(!selected.includes(skill)){setAnswers({...answers,skills:[...selected,skill],skillLevels:{...levels,[skill]:1}})}else setEditing(editing===skill?null:skill)};
  const level=(skill:string,value:SkillLevel)=>{setAnswers({...answers,skillLevels:{...levels,[skill]:value}});setEditing(null)};
  return <div className="grid gap-3 sm:grid-cols-2">{skills.map(skill=>{const active=selected.includes(skill);return <div key={skill} className={`relative rounded-2xl border p-4 transition ${active?"border-[#6575e9] bg-[#f1f2ff]":"border-[#e1dfda] bg-white"}`}><button type="button" onClick={()=>toggle(skill)} className="flex w-full items-center justify-between text-left"><span className="font-bold">{skill}</span>{active?<span className="tag !py-1">{levelNames[levels[skill]||1]}</span>:<span className="text-xs text-[#92939a]">点击掌握</span>}</button>{active&&<button type="button" onClick={()=>setEditing(editing===skill?null:skill)} className="mt-3 flex items-center gap-1 text-xs font-bold text-[#5969dc]">设置熟练度 <ChevronDown size={14}/></button>}{editing===skill&&<div className="animate-in mt-3 grid gap-2 rounded-xl bg-white p-2 shadow-lg">{([1,2,3] as SkillLevel[]).map(n=><button type="button" key={n} onClick={()=>level(skill,n)} className="rounded-lg p-2 text-left text-sm hover:bg-[#f1f2ff]"><b>{n}级 · {levelNames[n]}</b><span className="ml-2 text-xs text-[#777985]">{n===1?"知道基本概念":n===2?"做过练习或 Demo":"真实项目中可独立完成"}</span></button>)}<button type="button" onClick={()=>{setAnswers({...answers,skills:selected.filter(x=>x!==skill)});setEditing(null)}} className="rounded-lg p-2 text-left text-xs text-[#b05454]">移除技能</button></div>}</div>})}</div>
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
