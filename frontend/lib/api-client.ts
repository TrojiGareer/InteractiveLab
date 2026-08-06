import type { ProtocolDefinition } from "@/types/protocol";
import type {
  Scenario,
  ScenarioCreateRequest,
  ScenarioListResponse,
  ScenarioPatchRequest,
  ScenarioReplaceRequest,
} from "@/types/scenario";
import type {
  SimulationCreateRequest,
  SimulationListResponse,
  SimulationRun,
} from "@/types/simulation";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000"
).replace(/\/$/, "");

type HealthResponse = {
  status: string;
};

type ApiValidationError = {
  msg?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getErrorMessage(payload: unknown): string | null {
  if (
    payload === null ||
    typeof payload !== "object"
  ) {
    return null;
  }

  const detail = (
    payload as { detail?: unknown }
  ).detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item: ApiValidationError) => item.msg)
      .filter(
        (message): message is string =>
          typeof message === "string",
      );

    if (messages.length > 0) {
      return messages.join("; ");
    }
  }

  return null;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (
    options.body !== undefined &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...options,
        headers,
      },
    );
  } catch {
    throw new ApiError(
      "Could not reach the API.",
      0,
    );
  }

  const payload =
    response.status === 204
      ? null
      : await response
          .json()
          .catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(payload) ??
        `The API returned status ${response.status}.`,
      response.status,
    );
  }

  return payload as T;
}

export function getHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/health");
}

export function getProtocol(
  protocolId: string,
): Promise<ProtocolDefinition> {
  return apiRequest<ProtocolDefinition>(
    `/api/v1/protocols/${encodeURIComponent(
      protocolId,
    )}`,
  );
}

export function createSimulation(
  simulationData: SimulationCreateRequest,
): Promise<SimulationRun> {
  return apiRequest<SimulationRun>(
    "/api/v1/simulations",
    {
      method: "POST",
      body: JSON.stringify(simulationData),
    },
  );
}

export function listSimulations(
  skip = 0,
  limit = 10,
): Promise<SimulationListResponse> {
  const query = new URLSearchParams({
    skip: String(skip),
    limit: String(limit),
  });

  return apiRequest<SimulationListResponse>(
    `/api/v1/simulations?${query.toString()}`,
  );
}

export function getSimulation(
  simulationId: number,
): Promise<SimulationRun> {
  return apiRequest<SimulationRun>(
    `/api/v1/simulations/${simulationId}`,
  );
}

export function listScenarios(
  skip = 0,
  limit = 10,
): Promise<ScenarioListResponse> {
  const query = new URLSearchParams({
    skip: String(skip),
    limit: String(limit),
  });

  return apiRequest<ScenarioListResponse>(
    `/api/v1/scenarios?${query.toString()}`,
  );
}

export function getScenario(
  scenarioId: number,
): Promise<Scenario> {
  return apiRequest<Scenario>(
    `/api/v1/scenarios/${scenarioId}`,
  );
}

export function createScenario(
  scenarioData: ScenarioCreateRequest,
): Promise<Scenario> {
  return apiRequest<Scenario>(
    "/api/v1/scenarios",
    {
      method: "POST",
      body: JSON.stringify(scenarioData),
    },
  );
}

export function replaceScenario(
  scenarioId: number,
  scenarioData: ScenarioReplaceRequest,
): Promise<Scenario> {
  return apiRequest<Scenario>(
    `/api/v1/scenarios/${scenarioId}`,
    {
      method: "PUT",
      body: JSON.stringify(scenarioData),
    },
  );
}

export function patchScenario(
  scenarioId: number,
  scenarioData: ScenarioPatchRequest,
): Promise<Scenario> {
  return apiRequest<Scenario>(
    `/api/v1/scenarios/${scenarioId}`,
    {
      method: "PATCH",
      body: JSON.stringify(scenarioData),
    },
  );
}

export async function deleteScenario(
  scenarioId: number,
): Promise<void> {
  await apiRequest<null>(
    `/api/v1/scenarios/${scenarioId}`,
    { method: "DELETE" },
  );
}

export function runScenario(
  scenarioId: number,
): Promise<SimulationRun> {
  return apiRequest<SimulationRun>(
    `/api/v1/scenarios/${scenarioId}/run`,
    { method: "POST" },
  );
}
