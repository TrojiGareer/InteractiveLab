import type { TcpHandshakeEvent } from "@/types/simulation";

export const DEMO_PACKET_DURATION_MS = 700;

export type PlaybackMode = "demo" | "real";

export type PlaybackStatus =
  | "idle"
  | "playing"
  | "paused"
  | "completed";

export type TraceTimelineStep = {
  eventIndex: number;
  durationMs: number;
  startsAtMs: number;
};

export type TraceTimeline = {
  steps: TraceTimelineStep[];
  totalDurationMs: number;
};

export function getNextTraceStep(
  selectedStep: number,
  eventCount: number,
): number | null {
  if (eventCount === 0 || selectedStep >= eventCount - 1) {
    return null;
  }

  return selectedStep + 1;
}

function asNonNegativeDuration(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

export function getRealTimePacketDuration(
  event: TcpHandshakeEvent,
  inputParameters: Record<string, number> = {},
): number {
  const eventDuration = asNonNegativeDuration(
    event.arrives_at_ms - event.sent_at_ms,
  );

  if (eventDuration !== null) {
    return eventDuration;
  }

  return asNonNegativeDuration(inputParameters.latency_ms) ?? 0;
}

export function getPacketPlaybackDuration(
  event: TcpHandshakeEvent,
  mode: PlaybackMode,
  inputParameters: Record<string, number> = {},
): number {
  if (mode === "demo") {
    return DEMO_PACKET_DURATION_MS;
  }

  return getRealTimePacketDuration(event, inputParameters);
}

export function createTraceTimeline(
  events: TcpHandshakeEvent[],
  mode: PlaybackMode,
  inputParameters: Record<string, number> = {},
): TraceTimeline {
  let startsAtMs = 0;

  const steps = events.map((event, eventIndex) => {
    const durationMs = getPacketPlaybackDuration(
      event,
      mode,
      inputParameters,
    );
    const step = { eventIndex, durationMs, startsAtMs };

    startsAtMs += durationMs;
    return step;
  });

  return { steps, totalDurationMs: startsAtMs };
}

export function createPlaybackSnapshot(): {
  status: PlaybackStatus;
  activeStep: number;
  progress: number;
} {
  return {
    status: "idle",
    activeStep: 0,
    progress: 0,
  };
}

export function getTimelinePlaybackState(
  timeline: TraceTimeline,
  elapsedMs: number,
): {
  status: PlaybackStatus;
  activeStep: number;
  progress: number;
} {
  if (timeline.steps.length === 0) {
    return createPlaybackSnapshot();
  }

  let remainingMs = Math.max(0, elapsedMs);

  for (const step of timeline.steps) {
    if (step.durationMs === 0) {
      continue;
    }

    if (remainingMs < step.durationMs) {
      return {
        status: "playing",
        activeStep: step.eventIndex,
        progress: remainingMs / step.durationMs,
      };
    }

    remainingMs -= step.durationMs;
  }

  return {
    status: "completed",
    activeStep: timeline.steps.length - 1,
    progress: 1,
  };
}

export function isPlaybackSessionCurrent(
  callbackSession: number,
  activeSession: number,
): boolean {
  return callbackSession === activeSession;
}
