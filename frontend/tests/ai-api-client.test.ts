
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  API_BASE_URL,
  ApiError,
  evaluatePracticeAnswer,
  explainSimulation,
  generateAiReport,
  generatePracticeQuestion,
  troubleshootSimulation,
} from "../lib/api-client.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("AI Explain sends the selected simulation ID", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(
      String(input),
      `${API_BASE_URL}/api/v1/ai/explain/42`,
    );

    assert.equal(init?.method, "POST");

    return Response.json({
      simulation_id: 42,
      content: "TCP handshake explanation.",
    });
  };

  const result = await explainSimulation(42);

  assert.equal(result.simulation_id, 42);
  assert.equal(
    result.content,
    "TCP handshake explanation.",
  );
});

test("AI Troubleshoot sends the problem description", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(
      String(input),
      `${API_BASE_URL}/api/v1/ai/troubleshoot`,
    );

    assert.equal(init?.method, "POST");

    assert.deepEqual(
      JSON.parse(String(init?.body)),
      {
        simulation_id: 42,
        problem_description: "High connection latency",
      },
    );

    return Response.json({
      simulation_id: 42,
      problem_description: "High connection latency",
      content: "Troubleshooting analysis.",
    });
  };

  const result = await troubleshootSimulation({
    simulation_id: 42,
    problem_description: "High connection latency",
  });

  assert.equal(
    result.content,
    "Troubleshooting analysis.",
  );
});

test("AI Report generates a report for the selected run", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(
      String(input),
      `${API_BASE_URL}/api/v1/ai/report`,
    );

    assert.equal(init?.method, "POST");

    assert.deepEqual(
      JSON.parse(String(init?.body)),
      { simulation_id: 42 },
    );

    return Response.json({
      simulation_id: 42,
      content: "# Network Analysis Report",
      report_format: "markdown",
    });
  };

  const result = await generateAiReport({
    simulation_id: 42,
  });

  assert.equal(
    result.content,
    "# Network Analysis Report",
  );

  assert.equal(result.report_format, "markdown");
});

test("Practice generates a question at the requested level", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(
      String(input),
      `${API_BASE_URL}/api/v1/ai/practice/question`,
    );

    assert.equal(init?.method, "POST");

    assert.deepEqual(
      JSON.parse(String(init?.body)),
      {
        simulation_id: 42,
        level: "advanced",
      },
    );

    return Response.json({
      simulation_id: 42,
      question_id: "tcp-ack-question",
      level: "advanced",
      question: "What is the expected ACK value?",
    });
  };

  const result = await generatePracticeQuestion({
    simulation_id: 42,
    level: "advanced",
  });

  assert.equal(
    result.question_id,
    "tcp-ack-question",
  );

  assert.equal(result.level, "advanced");
});

test("Practice evaluation uses question_id and returns feedback", async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(
      String(input),
      `${API_BASE_URL}/api/v1/ai/practice/evaluate`,
    );

    assert.equal(init?.method, "POST");

    assert.deepEqual(
      JSON.parse(String(init?.body)),
      {
        simulation_id: 42,
        question_id: "tcp-ack-question",
        answer: "1001",
      },
    );

    return Response.json({
      simulation_id: 42,
      question_id: "tcp-ack-question",
      is_correct: true,
      submitted_answer: "1001",
      correct_answer: "1001",
      feedback: "Correct answer.",
      explanation: "SYN consumes one sequence number.",
    });
  };

  const result = await evaluatePracticeAnswer({
    simulation_id: 42,
    question_id: "tcp-ack-question",
    answer: "1001",
  });

  assert.equal(result.is_correct, true);
  assert.equal(result.correct_answer, "1001");
  assert.equal(result.feedback, "Correct answer.");
});

test("AI errors are handled through ApiError", async () => {
  globalThis.fetch = async () =>
    Response.json(
      {
        detail: "The AI service is temporarily unavailable.",
      },
      { status: 502 },
    );

  await assert.rejects(
    explainSimulation(42),
    (error: unknown) =>
      error instanceof ApiError &&
      error.status === 502 &&
      error.message ===
        "The AI service is temporarily unavailable.",
  );
});

test("Practice evaluation reports invalid questions", async () => {
  globalThis.fetch = async () =>
    Response.json(
      {
        detail: "Invalid practice question.",
      },
      { status: 422 },
    );

  await assert.rejects(
    evaluatePracticeAnswer({
      simulation_id: 42,
      question_id: "invalid-question",
      answer: "1001",
    }),
    (error: unknown) =>
      error instanceof ApiError &&
      error.status === 422 &&
      error.message === "Invalid practice question.",
  );
});
