import httpService from "./http-service";
import { UserStorage } from "./user-storage";

import type {
  CreateReportTemplateInput,
  ReportRunResponse,
  ReportTemplate,
  UpdateReportTemplateInput,
} from "../lib/reports";

const userStorage = new UserStorage();

class ReportsService {
  list(): Promise<ReportTemplate[]> {
    return httpService.get<ReportTemplate[]>("/reports");
  }

  get(id: string): Promise<ReportTemplate> {
    return httpService.get<ReportTemplate>(`/reports/${id}`);
  }

  create(input: CreateReportTemplateInput): Promise<ReportTemplate> {
    return httpService.post<ReportTemplate>("/reports", input);
  }

  update(id: string, patch: UpdateReportTemplateInput): Promise<ReportTemplate> {
    return httpService.put<ReportTemplate>(`/reports/${id}`, patch);
  }

  remove(id: string): Promise<void> {
    return httpService.delete(`/reports/${id}`) as Promise<void>;
  }

  run(id: string): Promise<ReportRunResponse> {
    return httpService.get<ReportRunResponse>(`/reports/${id}/run`);
  }

  async downloadPdf(id: string, fileName: string): Promise<void> {
    const base = import.meta.env.VITE_API_BASE as string;
    const token = userStorage.token;
    const res = await fetch(`${base}/reports/${id}/export.pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      let message = `PDF download failed (${res.status})`;
      try {
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          const body = (await res.json()) as {
            error?: { message?: string; code?: string };
          };
          if (body?.error?.message) message = body.error.message;
        }
      } catch {
      }
      throw new Error(message);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}

export const reportsService = new ReportsService();
