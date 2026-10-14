import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  ApiError,
  createScenario,
  deleteScenario,
  listScenarios,
  patchScenario,
  replaceScenario,
  runScenario,
} from "../lib/api-client.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function scenarioPayload(id: number) {
  return {
    id,
    name: "Latency experiment",
    description: null,
    protocol: "tcp",
    parameters: {
      latency_ms: 100,
      client_initial_sequence: 1000,
      server_initial_sequence: 5000,
    },
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

test("lists scenarios from the centralized API client", async () => {
  globalThis.fetch = async (input) => {
    assert.equal(
      String(input),
      "http://localhost:8000/api/v1/scenarios?skip=6&limit=6",
    );

    return Response.json({
      items: [scenarioPayload(7)],
      total: 7,
      skip: 6,
      limit: 6,
    });
  };

  const page = await listScenarios(6, 6);

  assert.equal(page.total, 7);
  assert.equal(page.items[0]?.id, 7);
});

test("extracts structured FastAPI validation errors", async () => {
  globalThis.fetch = async () =>
    Response.json(
      {
        detail: [
          { msg: "Scenario name must not be blank." },
          { msg: "Network latency is invalid." },
        ],
      },
      { status: 422 },
    );

  await assert.rejects(
    createScenario({
      name: "",
      description: null,
      protocol: "tcp",
      parameters: {},
    }),
    (error: unknown) =>
      error instanceof ApiError &&
      error.status === 422 &&
      error.message ===
        "Scenario name must not be blank.; Network latency is invalid.",
  );
});

test("converts network failures to an API error", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("Network unavailable");
  };

  await assert.rejects(
    listScenarios(),
    (error: unknown) =>
      error instanceof ApiError &&
      error.status === 0 &&
      error.message === "Could not reach the API.",
  );
});

test("supports scenario create, replace, patch, run, and 204 delete workflows", async () => {
  const requests: Array<{
    url: string;
    method: string;
    body: string | null;
  }> = [];
  const responses = [
    Response.json(scenarioPayload(9), { status: 201 }),
    Response.json(
      {
        ...scenarioPayload(9),
        description: "A full replacement payload.",
      },
      { status: 200 },
    ),
    Response.json(
      { ...scenarioPayload(9), name: "Updated latency experiment" },
      { status: 200 },
    ),
    Response.json(
      {
        id: 12,
        scenario_id: 9,
        protocol: "tcp",
        input_parameters: scenarioPayload(9).parameters,
        result: null,
        status: "completed",
        created_at: "2026-01-01T00:00:00Z",
      },
      { status: 201 },
    ),
    new Response(null, { status: 204 }),
  ];

  globalThis.fetch = async (input, init) => {
    requests.push({
      url: String(input),
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? init.body : null,
    });

    const response = responses.shift();

    if (!response) {
      throw new Error("Unexpected API request");
    }

    return response;
  };

  const created = await createScenario({
    name: "Latency experiment",
    description: null,
    protocol: "tcp",
    parameters: scenarioPayload(9).parameters,
  });
  const replaced = await replaceScenario(created.id, {
    name: "Latency experiment",
    description: "A full replacement payload.",
    protocol: "tcp",
    parameters: scenarioPayload(9).parameters,
  });
  const updated = await patchScenario(created.id, {
    name: "Updated latency experiment",
  });
  const run = await runScenario(created.id);
  const deletion = await deleteScenario(created.id);

  assert.equal(replaced.description, "A full replacement payload.");
  assert.equal(updated.name, "Updated latency experiment");
  assert.equal(run.scenario_id, created.id);
  assert.equal(deletion, undefined);
  assert.deepEqual(
    requests.map((request) => request.method),
    ["POST", "PUT", "PATCH", "POST", "DELETE"],
  );
  assert.equal(
    requests[0]?.url,
    "http://localhost:8000/api/v1/scenarios",
  );
  assert.equal(
    requests[3]?.url,
    "http://localhost:8000/api/v1/scenarios/9/run",
  );
  assert.equal(
    requests[4]?.url,
    "http://localhost:8000/api/v1/scenarios/9",
  );
  assert.deepEqual(
    JSON.parse(requests[2]?.body ?? "{}"),
    { name: "Updated latency experiment" },
  );
});
