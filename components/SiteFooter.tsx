import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function SiteFooter() {
  return <footer className="border-t border-black/5 bg-[#f4f3ef] py-12">
    <div className="container grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
      <div><div className="mb-3 flex items-center gap-2 font-extrabold"><Sparkles size={18} className="text-[#5969dc]"/>阅槛 AI</div><p className="max-w-xl text-sm leading-7 text-[#6f717d]">先读懂门槛，再跨过门槛。看懂岗位，找到属于你的 AI 入场路径。</p></div>
      <div className="flex flex-wrap gap-5 text-sm font-semibold text-[#666873]"><Link href="/profile">岗位识别</Link><Link href="/company">企业研究</Link><Link href="/interview">面试准备</Link><Link href="/history">历史记录</Link></div>
      <p className="text-xs leading-6 text-[#8a8b93] md:col-span-2">岗位分析结果仅作为求职决策参考。阅槛 AI 不根据性别、照片等与岗位能力无关的信息进行匹配。</p>
    </div>
  </footer>;
}
