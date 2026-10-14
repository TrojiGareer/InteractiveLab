export type Scenario = {
  id: number;
  name: string;
  description: string | null;
  protocol: string;
  parameters: Record<string, number>;
  created_at: string;
  updated_at: string;
};

export type ScenarioCreateRequest = {
  name: string;
  description: string | null;
  protocol: string;
  parameters: Record<string, number>;
};

export type ScenarioReplaceRequest = ScenarioCreateRequest;

export type ScenarioPatchRequest = Partial<ScenarioCreateRequest>;

export type ScenarioListResponse = {
  items: Scenario[];
  total: number;
  skip: number;
  limit: number;
};
