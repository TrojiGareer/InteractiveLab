
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

export type PracticeLevel =
  | "beginner"
  | "intermediate"
  | "advanced";

export type AiPracticeQuestionRequest = {
  simulation_id: number;
  level: PracticeLevel;
};

export type AiPracticeQuestionResponse = {
  simulation_id: number;
  question_id: string;
  level: PracticeLevel;
  question: string;
};

export type AiPracticeEvaluateRequest = {
  simulation_id: number;
  question_id: string;
  answer: string;
};

export type AiPracticeEvaluateResponse = {
  simulation_id: number;
  question_id: string;
  is_correct: boolean;
  submitted_answer: string;
  correct_answer: string;
  feedback: string;
  explanation: string;
};
