"use client";

import Link from "next/link";
import { Menu, X, Sparkles } from "lucide-react";
import { useState } from "react";

const links = [
  ["岗位识别", "/profile"],
  ["企业研究", "/company"],
  ["面试准备", "/interview"],
  ["产品介绍", "/#about"],
  ["历史记录", "/history"],
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-[#fbfaf7]/85 backdrop-blur-xl">
      <div className="container flex h-[72px] items-center justify-between">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-extrabold tracking-[-.03em]">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#5266e8] to-[#8258d2] text-white"><Sparkles size={18}/></span>
          <span className="text-lg">阅槛 <span className="text-[#5969dc]">AI</span></span>
        </Link>
        <nav className="ml-auto hidden items-center gap-6 text-sm font-semibold text-[#5e606a] md:flex">
          {links.map(([label, href]) => <Link key={label} href={href} className="transition hover:text-[#5266e8]">{label}</Link>)}
        </nav>
        <Link href="/profile" className="btn-primary ml-7 hidden !min-h-10 !rounded-xl !px-4 text-sm md:inline-flex">开始识别</Link>
        <button aria-label="打开菜单" onClick={() => setOpen(!open)} className="grid size-10 place-items-center rounded-xl border border-black/10 bg-white md:hidden">{open ? <X/> : <Menu/>}</button>
      </div>
      {open && <div className="container animate-in pb-5 md:hidden"><div className="card flex flex-col gap-1 p-3">{links.map(([label, href]) => <Link key={label} href={href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 font-semibold hover:bg-[#f2f1ed]">{label}</Link>)}<Link href="/profile" className="btn-primary mt-2">开始识别</Link></div></div>}
    </header>
  );
}
