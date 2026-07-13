export type CompanyResearchStatus = "found" | "ambiguous" | "not_found" | "error";

export interface CompanyResearchSource {
  id: string;
  title: string;
  url: string;
  publisher: string;
  snippet: string;
  score: number;
  retrievedAt: string;
}

export interface CompanyResearchResult {
  status: CompanyResearchStatus;
  queryCompanyName: string;
  queryCity: string;
  summary: string;
  sources: CompanyResearchSource[];
  detectedCompanyNames?: string[];
  errorMessage: string | null;
}
