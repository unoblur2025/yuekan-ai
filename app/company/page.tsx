"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, History, MessageSquareText, RotateCcw, Search, ShieldCheck } from "lucide-react";
import PageShell from "@/components/PageShell";
import { SectionCard } from "@/components/ReportUI";
import { AnalysisRecord, loadCurrent, resetCurrentAnalysis } from "@/lib/analysis-data";
import type { CompanyResearchResult, CompanyResearchSource } from "@/lib/company-research";

const EMPTY_SUMMARY = "已找到相关公开来源，但暂无可直接确认的企业信息摘要，请查看下方来源并自行核验。";

function isSearchableCompanyName(value: string) {
  const name = value.trim();
  return Boolean(name) && name !== "未填写企业";
}

function isSafeSourceUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function formatRetrievedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
}

export default function CompanyPage() {
  const [record, setRecord] = useState<AnalysisRecord | null>();
  const [research, setResearch] = useState<CompanyResearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const requestController = useRef<AbortController | null>(null);

  const runResearch = useCallback(async (current: AnalysisRecord) => {
    if (!isSearchableCompanyName(current.companyName)) return;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setLoading(true);
    setResearch(null);
    try {
      const response = await fetch("/api/company-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: current.companyName, city: current.city || "" }),
        signal: controller.signal,
      });
      const result = await response.json() as CompanyResearchResult;
      if (!result || !["found", "ambiguous", "not_found", "error"].includes(result.status)) throw new Error("企业搜索接口返回格式不正确。");
      setResearch(result);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setResearch({
        status: "error",
        queryCompanyName: current.companyName,
        queryCity: current.city || "",
        summary: "",
        sources: [],
        errorMessage: error instanceof Error ? error.message : "企业公开信息检索失败。",
      });
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => setRecord(loadCurrent()), []);
  useEffect(() => {
    if (!record || !isSearchableCompanyName(record.companyName)) return;
    void runResearch(record);
    return () => requestController.current?.abort();
  }, [record, runResearch]);

  if (record === undefined) return <PageShell><div className="container py-24 muted">正在读取当前记录…</div></PageShell>;

  const hasCompanyName = Boolean(record && isSearchableCompanyName(record.companyName));
  return <PageShell><section className="container py-12 sm:py-16">
    <div className="mb-8">
      <span className="tag"><ShieldCheck size={14}/> 企业公开信息检索</span>
      <h1 className="title mt-5">{hasCompanyName ? record?.companyName : "企业研究"}</h1>
      {record&&<p className="muted mt-2">目标岗位：{record.jobTitle}{record.city?` · ${record.city}`:""}</p>}
      <div className="mt-4 rounded-2xl border border-[#dedff0] bg-[#f3f4ff] p-4 text-sm leading-6 text-[#5c6091]">
        企业信息来自公开网页检索，请结合来源自行核验。搜索结果不等于已确认企业主体，同名企业可能导致来源混杂；请结合招聘平台中的公司全称、岗位城市和官网确认。
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/report" className="btn-secondary"><ArrowLeft size={16}/>返回岗位分析</Link>
        <Link href="/interview" className="btn-primary"><MessageSquareText size={16}/>进入面试准备</Link>
        <Link href="/history" className="btn-secondary"><History size={16}/>历史记录</Link>
        <Link href="/profile" onClick={() => resetCurrentAnalysis()} className="btn-secondary"><RotateCcw size={16}/>新的测试</Link>
      </div>
    </div>

    {!hasCompanyName&&<SectionCard title="暂无企业信息"><p className="muted">暂无可检索的企业名称，请先完成岗位识别。</p></SectionCard>}
    {hasCompanyName&&loading&&<SectionCard title="企业公开信息检索"><div className="flex items-center gap-3 text-[#5969dc]"><Search className="animate-pulse"/><b>正在检索企业公开信息，请稍候……</b></div></SectionCard>}
    {hasCompanyName&&!loading&&research?.status==="found"&&<FoundResult result={research}/>}
    {hasCompanyName&&!loading&&research?.status==="ambiguous"&&<AmbiguousResult result={research}/>}
    {hasCompanyName&&!loading&&research?.status==="not_found"&&<SectionCard title="企业公开信息检索结果"><p className="font-bold">暂未找到可靠的企业公开信息。</p><p className="muted mt-3 leading-7">当前无法确认企业主体，请勿根据公司简称推断企业规模、业务、融资或办公地址。</p></SectionCard>}
    {hasCompanyName&&!loading&&research?.status==="error"&&<SectionCard title="企业公开信息检索结果"><p className="font-bold">企业公开信息检索失败，请稍后重试。</p>{research.errorMessage&&<p className="muted mt-3 text-sm">{research.errorMessage}</p>}<button type="button" onClick={() => record&&void runResearch(record)} className="btn-primary mt-5"><RotateCcw size={16}/>重新检索</button></SectionCard>}
  </section></PageShell>;
}

function FoundResult({ result }: { result: CompanyResearchResult }) {
  return <div className="grid gap-5">
    <SectionCard title="企业公开信息检索结果">
      <div className="grid gap-4 sm:grid-cols-2">
        <Info title="查询企业" text={result.queryCompanyName || "暂无可靠公开信息"}/>
        <Info title="辅助检索城市" text={result.queryCity || "未提供"}/>
      </div>
      <p className="muted mt-4 text-xs leading-6">岗位城市仅用于辅助检索，不代表企业注册地址或实际办公地址。</p>
    </SectionCard>
    <SectionCard title="企业公开信息摘要">
      <p className="leading-8 text-[#60626c]">{result.summary || EMPTY_SUMMARY}</p>
      <p className="muted mt-4 text-xs leading-6">当前版本尚未完成同名企业主体自动确认，缺失信息不会由模型补全。</p>
    </SectionCard>
    <SectionCard title="信息来源">
      {result.sources.length?<div className="space-y-4">{result.sources.map(source=><SourceCard key={source.id} source={source}/>)}</div>:<p className="muted">暂无可展示的公开来源。</p>}
    </SectionCard>
  </div>;
}

function AmbiguousResult({ result }: { result: CompanyResearchResult }) {
  const detectedCompanyNames = (result.detectedCompanyNames || []).filter(name => name.trim());
  return <div className="grid gap-5">
    <SectionCard title="企业主体待核验">
      <p className="leading-8 text-[#60626c]">已检索到多个可能相关的企业主体，目前无法确认该岗位对应的具体公司。以下内容仅作为公开信息线索，请结合招聘页面中的公司全称、官网及所在城市进一步核验。</p>
      {detectedCompanyNames.length>0&&<div className="mt-5 rounded-2xl border border-[#dedff0] bg-[#f7f7ff] p-5">
        <h3 className="font-extrabold">检索到的候选企业主体</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-[#60626c]">
          {detectedCompanyNames.map(name=><li key={name}>{name}</li>)}
        </ul>
      </div>}
      <p className="mt-5 text-sm font-bold leading-7 text-[#8a5a2b]">当前搜索结果不可直接作为已确认的企业事实，也不应直接用于生成企业针对性面试题。</p>
    </SectionCard>
    <SectionCard title="公开信息来源（待核验）">
      {result.sources.length?<div className="space-y-4">{result.sources.map(source=><SourceCard key={source.id} source={source}/>)}</div>:<p className="muted">暂无可展示的公开来源。</p>}
    </SectionCard>
  </div>;
}

function SourceCard({ source }: { source: CompanyResearchSource }) {
  const safeUrl = isSafeSourceUrl(source.url);
  return <article className="rounded-2xl border border-[#e5e3de] bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        {safeUrl?<a href={source.url} target="_blank" rel="noopener noreferrer" className="font-extrabold text-[#4f5fc4] hover:underline">{source.title}<ExternalLink className="ml-1 inline" size={14}/></a>:<h3 className="font-extrabold">{source.title}</h3>}
        <p className="muted mt-1 text-xs">发布方：{source.publisher || "未知发布方"}</p>
      </div>
      <span className="tag">相关性 {Number.isFinite(source.score)?source.score.toFixed(3):"暂无"}</span>
    </div>
    <p className="muted mt-4 text-sm leading-7">{source.snippet || "该来源未返回可展示摘要，请打开来源页面核验。"}</p>
    <p className="mt-3 text-xs text-[#8a8b93]">查询时间：{formatRetrievedAt(source.retrievedAt)}</p>
  </article>;
}

function Info({ title, text }: { title: string; text: string }) {
  return <div className="soft-card p-4"><p className="text-xs text-[#888a93]">{title}</p><b className="mt-2 block leading-6">{text}</b></div>;
}
