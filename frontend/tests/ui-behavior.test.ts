import assert from "node:assert/strict";
import test from "node:test";

import { getSkipAfterScenarioDeletion } from "../lib/scenario-pagination.ts";
import {
  DEMO_PACKET_DURATION_MS,
  createPlaybackSnapshot,
  createTraceTimeline,
  getNextTraceStep,
  getTimelinePlaybackState,
  isPlaybackSessionCurrent,
} from "../lib/trace-playback.ts";
import type { TcpHandshakeEvent } from "../types/simulation.ts";

const handshakeEvents: TcpHandshakeEvent[] = [
  {
    step: 1,
    sent_at_ms: 0,
    arrives_at_ms: 100,
    source: "client",
    destination: "server",
    flags: ["SYN"],
    sequence_number: 10,
    acknowledgment_number: null,
    client_state: "SYN_SENT",
    server_state: "LISTEN",
    description: "Client opens the connection.",
  },
  {
    step: 2,
    sent_at_ms: 100,
    arrives_at_ms: 200,
    source: "server",
    destination: "client",
    flags: ["SYN", "ACK"],
    sequence_number: 20,
    acknowledgment_number: 11,
    client_state: "SYN_SENT",
    server_state: "SYN_RECEIVED",
    description: "Server acknowledges the connection.",
  },
  {
    step: 3,
    sent_at_ms: 200,
    arrives_at_ms: 300,
    source: "client",
    destination: "server",
    flags: ["ACK"],
    sequence_number: 11,
    acknowledgment_number: 21,
    client_state: "ESTABLISHED",
    server_state: "SYN_RECEIVED",
    description: "Client confirms the connection.",
  },
];

test("replays each handshake step and stops at the final packet", () => {
  assert.equal(getNextTraceStep(0, 3), 1);
  assert.equal(getNextTraceStep(1, 3), 2);
  assert.equal(getNextTraceStep(2, 3), null);
  assert.equal(getNextTraceStep(0, 0), null);
});

test("uses a central demo duration without changing simulated packet data", () => {
  const timeline = createTraceTimeline(handshakeEvents, "demo", {
    latency_ms: 5000,
  });

  assert.deepEqual(
    timeline.steps.map((step) => step.durationMs),
    [DEMO_PACKET_DURATION_MS, DEMO_PACKET_DURATION_MS, DEMO_PACKET_DURATION_MS],
  );
  assert.equal(timeline.totalDurationMs, DEMO_PACKET_DURATION_MS * 3);
  assert.equal(handshakeEvents[1].acknowledgment_number, 11);
  assert.equal(handshakeEvents[2].arrives_at_ms, 300);
});

test("maps real-time playback to each event's simulated hop duration", () => {
  const timeline = createTraceTimeline(handshakeEvents, "real", {
    latency_ms: 5000,
  });

  assert.deepEqual(
    timeline.steps.map((step) => step.durationMs),
    [100, 100, 100],
  );
  assert.deepEqual(
    timeline.steps.map((step) => step.startsAtMs),
    [0, 100, 200],
  );
  assert.equal(timeline.totalDurationMs, 300);

  const incompleteTiming = {
    ...handshakeEvents[0],
    arrives_at_ms: Number.NaN,
  };
  const fallbackTimeline = createTraceTimeline([incompleteTiming], "real", {
    latency_ms: 45,
  });

  assert.equal(fallbackTimeline.steps[0].durationMs, 45);
});

test("completes a three-packet timeline and handles zero latency", () => {
  const timeline = createTraceTimeline(handshakeEvents, "real");

  assert.deepEqual(getTimelinePlaybackState(timeline, 150), {
    status: "playing",
    activeStep: 1,
    progress: 0.5,
  });
  assert.deepEqual(getTimelinePlaybackState(timeline, 300), {
    status: "completed",
    activeStep: 2,
    progress: 1,
  });

  const zeroLatencyEvents = handshakeEvents.map((event) => ({
    ...event,
    arrives_at_ms: event.sent_at_ms,
  }));
  const zeroTimeline = createTraceTimeline(zeroLatencyEvents, "real", {
    latency_ms: 0,
  });

  assert.equal(zeroTimeline.totalDurationMs, 0);
  assert.deepEqual(getTimelinePlaybackState(zeroTimeline, 0), {
    status: "completed",
    activeStep: 2,
    progress: 1,
  });
});

test("restart resets playback and stale callbacks can be ignored", () => {
  assert.deepEqual(createPlaybackSnapshot(), {
    status: "idle",
    activeStep: 0,
    progress: 0,
  });
  assert.equal(isPlaybackSessionCurrent(4, 4), true);
  assert.equal(isPlaybackSessionCurrent(4, 5), false);
});

test("moves to the previous scenario page after deleting its last item", () => {
  assert.equal(getSkipAfterScenarioDeletion(6, 6, 1), 0);
  assert.equal(getSkipAfterScenarioDeletion(12, 6, 1), 6);
  assert.equal(getSkipAfterScenarioDeletion(6, 6, 2), 6);
  assert.equal(getSkipAfterScenarioDeletion(0, 6, 1), 0);
});
