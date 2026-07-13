"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, CircleAlert, History, MessageSquareText, RotateCcw, Send, Sparkles, Target } from "lucide-react";
import PageShell from "@/components/PageShell";
import { AnalysisRecord, loadCurrent } from "@/lib/analysis-data";

type InterviewQuestion = {
  category: string;
  question: string;
  probability: string;
  purpose: string;
};

const ALL_CATEGORIES = "全部";

export default function InterviewPage() {
  const [record, setRecord] = useState<AnalysisRecord | null>();
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [open, setOpen] = useState<number | null>(0);
  const [mock, setMock] = useState(false);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(false);

  useEffect(() => setRecord(loadCurrent()), []);

  if (record === undefined) return <PageShell><div className="container py-24 muted">正在准备问题…</div></PageShell>;

  const questions = record?.analysis?.interviewQuestions || [];
  if (!record?.analysis || !questions.length) {
    return <PageShell><section className="container py-12 sm:py-16">
      <div className="card mx-auto max-w-3xl p-6 sm:p-9">
        <span className="tag"><MessageSquareText size={14}/> 面试准备</span>
        <h1 className="mt-5 text-2xl font-extrabold sm:text-3xl">暂无动态面试题</h1>
        <p className="muted mt-4 leading-7">当前记录暂无可用的动态面试题，请返回岗位识别页重新分析。</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/profile" className="btn-primary"><ArrowLeft size={16}/>返回岗位识别页</Link>
          <Link href="/history" className="btn-secondary"><History size={16}/>历史记录</Link>
        </div>
      </div>
    </section></PageShell>;
  }

  const categories = [ALL_CATEGORIES, ...Array.from(new Set(questions.map(item => item.category)))];
  const shown = category === ALL_CATEGORIES ? questions : questions.filter(item => item.category === category);
  const reset = () => {
    setMock(true);
    setIdx(0);
    setAnswer("");
    setScore(false);
  };

  return <PageShell><section className="container py-12 sm:py-16">{!mock ? <>
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <span className="tag"><Sparkles size={14}/> {record.companyName} · {record.jobTitle}</span>
        <h1 className="title mt-5">{questions.length} 道岗位面试准备题</h1>
        <p className="muted mt-3">基于当前岗位 JD、岗位分析结果与个人画像生成。</p>
        <div className="mt-4 flex gap-3">
          <Link href="/report" className="btn-secondary"><ArrowLeft size={16}/>返回岗位报告</Link>
          <Link href="/history" className="btn-secondary"><History size={16}/>历史记录</Link>
        </div>
      </div>
      <button onClick={reset} className="btn-primary"><MessageSquareText size={18}/>开始模拟面试</button>
    </div>

    <div className="mt-8 flex gap-2 overflow-x-auto pb-2">{categories.map(item => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${category === item ? "bg-[#2e3040] text-white" : "border border-[#e1dfd9] bg-white text-[#686a74]"}`}>{item}{item !== ALL_CATEGORIES && ` · ${questions.filter(question => question.category === item).length}`}</button>)}</div>

    <div className="mt-4 space-y-4">{shown.map(item => {
      const global = questions.indexOf(item);
      const active = open === global;
      return <article key={`${global}-${item.question}`} className="card overflow-hidden">
        <button onClick={() => setOpen(active ? null : global)} className="flex w-full items-center gap-4 p-5 text-left sm:p-6">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#eff0ff] font-black text-[#5a68d0]">{String(global + 1).padStart(2, "0")}</span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-[#7a7d88]">{item.category}</span><span className="tag !px-2 !py-1">预计 {item.probability}</span></div>
            <h2 className="mt-2 text-base font-extrabold sm:text-lg">{item.question}</h2>
          </div>
          {active ? <ChevronUp/> : <ChevronDown/>}
        </button>
        {active && <div className="animate-in border-t border-[#eceae5] bg-[#faf9f6] p-5 sm:p-6">
          <Detail icon={Target} title="考察目的" text={item.purpose}/>
          <div className="mt-4 rounded-2xl border border-[#dfe1f5] bg-[#f2f3ff] p-4">
            <b className="text-sm text-[#525daf]">通用回答参考</b>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Detail icon={ArrowRight} title="回答结构" text="结论 → 真实证据 → 岗位关系 → 后续行动"/>
              <Detail icon={CheckCircle2} title="作答自查" text="说明自己实际完成的任务、采取的行动和可以核验的结果。"/>
              <Detail icon={CircleAlert} title="注意事项" text="只使用真实经历作答；资料不足时直接说明，不补造项目或企业信息。" warn/>
            </div>
          </div>
        </div>}
      </article>;
    })}</div>
  </> : <MockInterview questions={questions} idx={idx} setIdx={setIdx} answer={answer} setAnswer={setAnswer} score={score} setScore={setScore} reset={reset} close={() => setMock(false)}/>}</section></PageShell>;
}

function MockInterview({ questions, idx, setIdx, answer, setAnswer, score, setScore, reset, close }: {
  questions: InterviewQuestion[];
  idx: number;
  setIdx: (value: number) => void;
  answer: string;
  setAnswer: (value: string) => void;
  score: boolean;
  setScore: (value: boolean) => void;
  reset: () => void;
  close: () => void;
}) {
  const question = questions[idx];
  return <div className="mx-auto max-w-4xl animate-in">
    <button onClick={close} className="mb-6 flex items-center gap-2 text-sm font-bold text-[#60626c]"><ArrowLeft size={17}/>返回题目列表</button>
    <div className="mb-4 flex items-center justify-between"><span className="font-bold text-[#5969dc]">模拟面试 · 第 {idx + 1} 题</span><span className="muted text-sm">{idx + 1} / {questions.length}</span></div>
    <div className="progress mb-6"><i style={{ width: `${(idx + 1) / questions.length * 100}%` }}/></div>
    <div className="card p-6 sm:p-9">
      <span className="tag">{question.category} · 被问概率 {question.probability}</span>
      <h1 className="mt-5 text-2xl font-extrabold leading-9 sm:text-3xl">{question.question}</h1>
      <p className="muted mt-3 text-sm">请只使用自己的真实项目与行动作答。</p>
      <textarea value={answer} onChange={event => { setAnswer(event.target.value); setScore(false); }} className="input mt-7 min-h-52 resize-y !p-5" placeholder="按“结论—真实证据—岗位关系—未来行动”组织回答……"/>
      {!score ? <button disabled={!answer.trim()} onClick={() => setScore(true)} className="btn-primary mt-4 disabled:opacity-40"><Send size={17}/>提交回答</button> : <div className="animate-in mt-5 rounded-3xl border border-[#dde0fb] bg-[#f2f3ff] p-5">
        <div className="flex flex-wrap items-center justify-between">
          <div><p className="text-sm font-bold text-[#626ab2]">模拟综合得分</p><p className="mt-1 text-4xl font-black text-[#4f5dc5]">78<span className="text-lg"> / 100</span></p></div>
          <div className="flex gap-2"><span className="tag">相关性 82</span><span className="tag">逻辑 76</span><span className="tag">证据 68</span></div>
        </div>
        <p className="muted mt-4 text-sm">结构清楚；建议补充一项具体项目结果，并说明如何验证判断。</p>
      </div>}
    </div>
    <div className="mt-5 flex justify-between gap-3">
      <button onClick={reset} className="btn-secondary"><RotateCcw size={17}/>重新开始</button>
      <button onClick={() => { if (idx < questions.length - 1) { setIdx(idx + 1); setAnswer(""); setScore(false); } else close(); }} className="btn-primary">{idx === questions.length - 1 ? "结束模拟" : "下一题"}<ArrowRight size={17}/></button>
    </div>
  </div>;
}

function Detail({ icon: Icon, title, text, warn = false }: { icon: typeof Target; title: string; text: string; warn?: boolean }) {
  return <div className={`rounded-2xl p-4 ${warn ? "bg-[#fff3e9]" : "bg-white"}`}><div className="flex items-center gap-2 text-sm font-extrabold"><Icon size={17} className={warn ? "text-[#c86e3b]" : "text-[#5969dc]"}/>{title}</div><p className="muted mt-2 text-sm leading-6">{text}</p></div>;
}
