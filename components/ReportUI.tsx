import { Check, CircleAlert, Info } from "lucide-react";

export function SectionCard({ title, subtitle, children, className="" }: { title:string; subtitle?:string; children:React.ReactNode; className?:string }) {
  return <section className={`card p-5 sm:p-7 ${className}`}><div className="mb-6"><h2 className="text-xl font-extrabold tracking-tight">{title}</h2>{subtitle&&<p className="muted mt-1 text-sm">{subtitle}</p>}</div>{children}</section>;
}
export function ScoreBar({ label, score, total }: { label:string;score:number;total:number }) {
  return <div><div className="mb-2 flex justify-between text-sm"><span className="font-semibold">{label}</span><span className="font-extrabold">{score} <span className="text-[#a0a1a8]">/ {total}</span></span></div><div className="progress"><i style={{width:`${score/total*100}%`}}/></div></div>;
}
export function StatusLine({ children, status="ok" }: {children:React.ReactNode;status?:"ok"|"warn"|"info"}) {
  const Icon=status==="ok"?Check:status==="warn"?CircleAlert:Info;
  const cls=status==="ok"?"bg-[#edf8f1] text-[#24744a]":status==="warn"?"bg-[#fff3e9] text-[#9a5a2e]":"bg-[#f0f2ff] text-[#505cad]";
  return <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${cls}`}><Icon size={16}/>{children}</div>;
}
