import { NextResponse } from "next/server";
import type { CompanyResearchResult, CompanyResearchSource } from "@/lib/company-research";

export const runtime = "nodejs";

type TavilySearchResult = {
  title?: unknown;
  url?: unknown;
  content?: unknown;
  score?: unknown;
};

type TavilySearchResponse = {
  answer?: unknown;
  results?: unknown;
};

const COMPANY_SUFFIX_PATTERN = "(?:股份有限公司|集团有限公司|有限责任公司|有限公司)";
const COMPANY_NAME_PATTERN = new RegExp(
  `^([A-Za-z0-9\\u3400-\\u9FFF（）()·&＆+＋\\s]{2,48}?${COMPANY_SUFFIX_PATTERN})(?:\\s*(?:官网|官方网站|招聘信息|企业信息|工商信息|公司简介|百度百科|爱企查|企查查|天眼查))?$`,
  "u",
);
const OUTER_NAME_PUNCTUATION = /^[\s,，.。;；:：!！?？'"“”‘’《》〈〉【】\[\]{}]+|[\s,，.。;；:：!！?？'"“”‘’《》〈〉【】\[\]{}]+$/g;
const EDITORIAL_TITLE_PREFIX = /^(?:关于|走进|探访|聚焦|专访|恭喜|祝贺|热烈欢迎)/;

function responseResult(result: CompanyResearchResult, status = 200) {
  return NextResponse.json(result, { status });
}

function errorResult(queryCompanyName: string, queryCity: string, errorMessage: string, status: number) {
  return responseResult({
    status: "error",
    queryCompanyName,
    queryCity,
    summary: "",
    sources: [],
    errorMessage,
  }, status);
}

function publisherFromUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

function normalizeCompanyName(value: string) {
  return value
    .trim()
    .replace(/\(/g, "（")
    .replace(/\)/g, "）")
    .replace(/\s+/g, " ")
    .replace(OUTER_NAME_PUNCTUATION, "")
    .trim();
}

function extractCompanyNamesFromTitle(title: string) {
  const segments = title.split(/\s+[—–-]\s+|[|｜_]|\s*[:：]\s*/);
  const names: string[] = [];
  const seen = new Set<string>();
  for (const segment of segments) {
    const cleaned = normalizeCompanyName(segment);
    const match = cleaned.match(COMPANY_NAME_PATTERN);
    if (!match) continue;
    const name = normalizeCompanyName(match[1]);
    if (!name || EDITORIAL_TITLE_PREFIX.test(name)) continue;
    const comparisonKey = name.toLocaleLowerCase("zh-CN");
    if (seen.has(comparisonKey)) continue;
    seen.add(comparisonKey);
    names.push(name);
  }
  return names;
}

function detectAmbiguousCompanyNames(sources: CompanyResearchSource[], queryCompanyName: string) {
  const names: string[] = [];
  const seenNames = new Set<string>();
  const seenSources = new Set<string>();
  const normalizedQueryCompanyName = normalizeCompanyName(queryCompanyName).toLocaleLowerCase("zh-CN");
  if (!normalizedQueryCompanyName) return [];

  for (const source of sources) {
    const sourceKey = source.url.trim();
    if (!sourceKey || seenSources.has(sourceKey)) continue;
    seenSources.add(sourceKey);

    const titleNames = extractCompanyNamesFromTitle(source.title);
    if (titleNames.length !== 1) continue;
    const name = titleNames[0];
    const comparisonKey = name.toLocaleLowerCase("zh-CN");
    if (!comparisonKey.includes(normalizedQueryCompanyName)) continue;
    if (seenNames.has(comparisonKey)) continue;
    seenNames.add(comparisonKey);
    names.push(name);
  }

  return names.length >= 2 ? names : [];
}

function toSources(results: unknown, retrievedAt: string): CompanyResearchSource[] {
  if (!Array.isArray(results)) return [];
  return results.flatMap((item, index) => {
    const result = item && typeof item === "object" ? item as TavilySearchResult : null;
    if (!result || typeof result.title !== "string" || typeof result.url !== "string") return [];
    const publisher = publisherFromUrl(result.url);
    if (!publisher) return [];
    const numericScore = typeof result.score === "number" ? result.score : Number(result.score);
    return [{
      id: `source-${index + 1}`,
      title: result.title.trim() || publisher,
      url: result.url,
      publisher,
      snippet: typeof result.content === "string" ? result.content.trim() : "",
      score: Number.isFinite(numericScore) ? numericScore : 0,
      retrievedAt,
    }];
  });
}

export async function POST(request: Request) {
  let queryCompanyName = "";
  let queryCity = "";
  try {
    const input: unknown = await request.json();
    if (!input || typeof input !== "object") return errorResult("", "", "请求参数格式不正确。", 400);
    const value = input as Record<string, unknown>;
    if (typeof value.companyName !== "string" || !value.companyName.trim()) return errorResult("", typeof value.city === "string" ? value.city.trim() : "", "公司名称不能为空。", 400);
    if (typeof value.city !== "string") return errorResult(value.companyName.trim(), "", "岗位城市格式不正确。", 400);
    queryCompanyName = value.companyName.trim();
    queryCity = value.city.trim();

    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return errorResult(queryCompanyName, queryCity, "服务端尚未配置企业搜索服务。", 503);

    const query = [queryCompanyName, queryCity, "官网", "主营业务", "AI 业务"].filter(Boolean).join(" ");
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        max_results: 8,
        include_answer: true,
        include_raw_content: false,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return errorResult(queryCompanyName, queryCity, `企业搜索服务调用失败（HTTP ${response.status}）。`, 502);

    const payload = await response.json() as TavilySearchResponse;
    const sources = toSources(payload.results, new Date().toISOString());
    if (!sources.length) {
      return responseResult({
        status: "not_found",
        queryCompanyName,
        queryCity,
        summary: "暂未找到可靠的企业公开信息。",
        sources: [],
        errorMessage: null,
      });
    }

    const detectedCompanyNames = detectAmbiguousCompanyNames(sources, queryCompanyName);
    if (detectedCompanyNames.length >= 2) {
      return responseResult({
        status: "ambiguous",
        queryCompanyName,
        queryCity,
        summary: "",
        sources,
        detectedCompanyNames,
        errorMessage: null,
      });
    }

    return responseResult({
      status: "found",
      queryCompanyName,
      queryCity,
      summary: typeof payload.answer === "string" ? payload.answer.trim() : "",
      sources,
      errorMessage: null,
    });
  } catch (error) {
    const isTimeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    const message = error instanceof SyntaxError
      ? "请求内容不是有效 JSON。"
      : isTimeout
        ? "企业公开信息检索超时，请稍后重试。"
        : "企业公开信息检索失败，请稍后重试。";
    return errorResult(queryCompanyName, queryCity, message, error instanceof SyntaxError ? 400 : 500);
  }
}
