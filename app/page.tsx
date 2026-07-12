import Link from "next/link";
import { ArrowRight, BarChart3, Check, Compass, FileSearch, ShieldCheck, Sparkles, Target, Zap } from "lucide-react";
import PageShell from "@/components/PageShell";

const abilities = [
  [FileSearch, "看懂岗位", "把复杂 JD 翻译成真实工作内容"],
  [ShieldCheck, "识别门槛", "分清硬性条件与模糊表述"],
  [Sparkles, "发现优势", "找到非科班经历中的迁移能力"],
  [Compass, "明确行动", "给出可执行的补齐与投递建议"],
];

export default function Home() {
  return <PageShell>
    <section className="container grid min-h-[690px] items-center gap-14 py-20 lg:grid-cols-[1.05fr_.95fr]">
      <div className="animate-in">
        <div className="eyebrow mb-6 flex items-center gap-2"><Zap size={14}/> 阅槛，亦是越槛。</div>
        <h1 className="display">关关难过，<br/><span className="gradient-text">关关过。</span></h1>
        <p className="mt-7 max-w-xl text-lg leading-8 text-[#686a75]">读懂 AI 岗位的真实门槛，看见你的可迁移优势，找到属于非科班的 AI 入场路径。</p>
        <p className="mt-4 max-w-xl text-sm leading-7 text-[#777984]">不是只告诉你一个匹配分数，而是帮你分清：现在能不能投、真正的硬门槛、短期可补能力，以及过去经历可以迁移什么。</p>
        <div className="mt-9 flex flex-wrap gap-3"><Link className="btn-primary" href="/profile">开始识别岗位 <ArrowRight size={18}/></Link><Link className="btn-secondary" href="/report?demo=1">查看分析案例</Link><Link className="btn-secondary" href="/history">查看历史分析</Link></div>
        <div className="mt-8 flex items-center gap-5 text-sm text-[#777984]"><span className="flex items-center gap-1.5"><Check size={15} className="text-[#5266e8]"/>无需登录</span><span className="flex items-center gap-1.5"><Check size={15} className="text-[#5266e8]"/>约 3 分钟</span></div>
      </div>
      <div className="relative animate-in [animation-delay:.12s]">
        <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-[#dfe3ff] to-[#eee2ff] blur-3xl"/>
        <div className="card p-6 sm:p-8">
          <div className="flex items-start justify-between"><div><p className="text-xs font-bold text-[#8a8b94]">岗位分析示例</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight">AI 产品实习生</h2></div><span className="tag !bg-[#eaf8ef] !text-[#26774c]">优先投递</span></div>
          <div className="my-7 flex items-end justify-between border-y border-[#eceae5] py-6"><div><p className="text-sm text-[#7b7d87]">综合适配度</p><div className="mt-1 text-5xl font-black tracking-[-.05em] text-[#5266e8]">82<span className="text-2xl">%</span></div></div><div className="grid size-20 place-items-center rounded-full border-[7px] border-[#dfe2ff] border-t-[#5969dc] text-lg font-black text-[#5969dc]">A</div></div>
          <div className="space-y-5"><div><p className="text-xs font-bold text-[#888a93]">岗位真实方向</p><p className="mt-1 font-bold">AI 产品 + 企业知识库</p></div><div><p className="mb-2 text-xs font-bold text-[#888a93]">你已经具备</p><div className="flex gap-2"><span className="tag">Prompt</span><span className="tag">RAG</span><span className="tag">PRD</span></div></div><div className="soft-card flex items-center gap-3 p-4"><Target className="text-[#d07843]"/><div><p className="text-xs text-[#8a7464]">当前最大风险</p><p className="mt-0.5 text-sm font-bold">Agent 实操证据不足</p></div></div></div>
        </div>
      </div>
    </section>

    <section className="border-y border-black/5 bg-white/60 py-16"><div className="container grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{abilities.map(([Icon, title, desc]) => { const I = Icon as typeof FileSearch; return <div key={String(title)} className="rounded-3xl p-5 transition hover:bg-white hover:shadow-lg"><I className="mb-4 text-[#5969dc]"/><h3 className="font-extrabold">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-[#737580]">{String(desc)}</p></div>})}</div></section>

    <section id="about" className="section container">
      <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]"><div><p className="eyebrow">不只是一个分数</p><h2 className="title mt-4">真正帮你做出<br/>求职判断。</h2><p className="mt-5 max-w-md leading-7 text-[#70727c]">把 JD 里的行话、套话和隐性期待，变成你可以判断和执行的信息。</p></div>
      <div className="grid gap-4 sm:grid-cols-2">{[
        ["01", "这个岗位实际在做什么？"], ["02", "哪些要求是真正的硬门槛？"], ["03", "哪些短板可以快速补齐？"], ["04", "非科班经历有哪些可迁移能力？"], ["05", "现在是否值得投递？"], ["→", "下一步应该先做什么？"]
      ].map(([n,q]) => <div key={q} className="soft-card group p-5 transition hover:-translate-y-1 hover:bg-white hover:shadow-lg"><span className="text-xs font-black text-[#7b84d9]">{n}</span><p className="mt-5 font-bold leading-6">{q}</p></div>)}</div></div>
    </section>

    <section className="container pb-24"><div className="overflow-hidden rounded-[36px] bg-[#272936] px-7 py-14 text-center text-white sm:px-12"><BarChart3 className="mx-auto mb-5 text-[#aab3ff]"/><h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">从一份 JD，找到你的 AI 入场路线</h2><p className="mx-auto mt-4 max-w-xl text-[#c4c5cd]">用 3 分钟完成画像，获得岗位报告、能力补齐计划和面试问题。</p><Link href="/profile" className="btn-primary mt-8 !bg-white !text-[#353a75]">免费开始分析 <ArrowRight size={18}/></Link></div></section>
  </PageShell>;
}
