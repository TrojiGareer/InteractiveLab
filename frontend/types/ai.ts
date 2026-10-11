
export type AiExplainResponse = {
  simulation_id: number;
  content: string;
};

export type AiTroubleshootRequest = {
  simulation_id: number;
  problem_description: string;
};

export type AiTroubleshootResponse = {
  simulation_id: number;
  content: string;
  problem_description: string;
};

export type AiReportRequest = {
  simulation_id: number;
  analysis?: string | null;
};

export type AiReportResponse = {
  simulation_id: number;
  content: string;
  report_format: string;
};
