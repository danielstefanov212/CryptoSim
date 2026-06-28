export interface ReportTemplate {
  id: string;
  name: string;
  symbols: string[];
  startDate: string | null;
  endDate: string | null;
  rollingDays: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportTemplateInput {
  name: string;
  symbols: string[];
  startDate?: string | null;
  endDate?: string | null;
  rollingDays?: number | null;
}

export interface UpdateReportTemplateInput {
  name?: string;
  symbols?: string[];
  startDate?: string | null;
  endDate?: string | null;
  rollingDays?: number | null;
}

export type ReportGranularity = "hourly" | "daily";
export type EffectiveGranularity = "hourly" | "daily" | "weekly" | "monthly";

export type DataGapReason = "history_gap" | "fetch_failed";

export interface DataGap {
  symbol: string;
  gapBefore: string;
  reason: DataGapReason;
}

export interface ReportPoint {
  t: string;
  value: string | null;
}

export interface ReportRunResponse {
  template: {
    id: string;
    name: string;
    symbols: string[];
    startDate: string | null;
    endDate: string | null;
    rollingDays: number | null;
  };
  window: {
    start: string;
    end: string;
    granularity: ReportGranularity;
    clamped: boolean;
    effectiveGranularity?: EffectiveGranularity;
  };
  dataGaps: DataGap[];
  inactiveSymbols: string[];
  points: ReportPoint[];
}
