"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createPlaybackSnapshot,
  isPlaybackSessionCurrent,
  type TraceTimeline,
} from "@/lib/trace-playback";

type PlaybackSnapshot =
  ReturnType<typeof createPlaybackSnapshot>;

type UseTracePlaybackOptions = {
  traceKey: string | number | null;
  timeline: TraceTimeline;
  autoPlay?: boolean;
};

function clampProgress(
  progress: number,
): number {
  return Math.min(
    1,
    Math.max(0, progress),
  );
}

export function useTracePlayback({
  traceKey,
  timeline,
  autoPlay = false,
}: UseTracePlaybackOptions) {
  const [snapshot, setSnapshot] =
    useState<PlaybackSnapshot>(() =>
      createPlaybackSnapshot(),
    );

  const snapshotRef = useRef(snapshot);
  const frameRef =
    useRef<number | null>(null);
  const sessionRef = useRef(0);

  const setPlaybackSnapshot = useCallback(
    (
      nextSnapshot: PlaybackSnapshot,
    ) => {
      snapshotRef.current = nextSnapshot;
      setSnapshot(nextSnapshot);
    },
    [],
  );

  const cancelPlayback =
    useCallback(() => {
      sessionRef.current += 1;

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(
          frameRef.current,
        );

        frameRef.current = null;
      }
    }, []);

  const beginPlayback = useCallback(
    (
      startStep: number,
      startProgress: number,
    ) => {
      if (timeline.steps.length === 0) {
        setPlaybackSnapshot(
          createPlaybackSnapshot(),
        );
        return;
      }

      cancelPlayback();

      const callbackSession =
        sessionRef.current;

      let activeStep = Math.min(
        Math.max(startStep, 0),
        timeline.steps.length - 1,
      );

      let progress =
        clampProgress(startProgress);

      let stepStartedAt:
        | number
        | null = null;

      setPlaybackSnapshot({
        status: "playing",
        activeStep,
        progress,
      });

      function finishPlayback() {
        setPlaybackSnapshot({
          status: "completed",
          activeStep:
            timeline.steps.length - 1,
          progress: 1,
        });

        frameRef.current = null;
      }

      function animate(now: number) {
        if (
          !isPlaybackSessionCurrent(
            callbackSession,
            sessionRef.current,
          )
        ) {
          return;
        }

        let activeTimelineStep =
          timeline.steps[activeStep];

        while (
          activeTimelineStep.durationMs ===
          0
        ) {
          if (
            activeStep ===
            timeline.steps.length - 1
          ) {
            finishPlayback();
            return;
          }

          activeStep += 1;
          progress = 0;
          stepStartedAt = now;

          activeTimelineStep =
            timeline.steps[activeStep];

          setPlaybackSnapshot({
            status: "playing",
            activeStep,
            progress,
          });
        }

        if (stepStartedAt === null) {
          stepStartedAt =
            now -
            progress *
              activeTimelineStep.durationMs;
        }

        progress = clampProgress(
          (now - stepStartedAt) /
            activeTimelineStep.durationMs,
        );

        setPlaybackSnapshot({
          status: "playing",
          activeStep,
          progress,
        });

        if (progress === 1) {
          if (
            activeStep ===
            timeline.steps.length - 1
          ) {
            finishPlayback();
            return;
          }

          activeStep += 1;
          progress = 0;
          stepStartedAt = now;

          setPlaybackSnapshot({
            status: "playing",
            activeStep,
            progress,
          });
        }

        frameRef.current =
          window.requestAnimationFrame(
            animate,
          );
      }

      frameRef.current =
        window.requestAnimationFrame(
          animate,
        );
    },
    [
      cancelPlayback,
      setPlaybackSnapshot,
      timeline,
    ],
  );

  const play = useCallback(() => {
    const current =
      snapshotRef.current;

    if (current.status === "playing") {
      return;
    }

    if (
      current.status === "completed"
    ) {
      beginPlayback(0, 0);
      return;
    }

    beginPlayback(
      current.activeStep,
      current.progress,
    );
  }, [beginPlayback]);

  const pause = useCallback(() => {
    const current =
      snapshotRef.current;

    if (current.status !== "playing") {
      return;
    }

    cancelPlayback();

    setPlaybackSnapshot({
      ...current,
      status: "paused",
    });
  }, [
    cancelPlayback,
    setPlaybackSnapshot,
  ]);

  const replay = useCallback(() => {
    beginPlayback(0, 0);
  }, [beginPlayback]);

  const selectStep = useCallback(
    (step: number) => {
      if (
        snapshotRef.current.status ===
          "playing" ||
        step < 0 ||
        step >= timeline.steps.length
      ) {
        return;
      }

      cancelPlayback();

      setPlaybackSnapshot({
        status: "idle",
        activeStep: step,
        progress: 0,
      });
    },
    [
      cancelPlayback,
      setPlaybackSnapshot,
      timeline,
    ],
  );

  useEffect(() => {
    cancelPlayback();

    const initialSnapshot =
      createPlaybackSnapshot();

    /*
     * Keep event handlers synchronized immediately,
     * while the visible React update is scheduled
     * through the browser animation system.
     */
    snapshotRef.current =
      initialSnapshot;

    const resetFrame =
      window.requestAnimationFrame(() => {
        if (
          timeline.steps.length === 0
        ) {
          setPlaybackSnapshot(
            initialSnapshot,
          );
          return;
        }

        if (autoPlay) {
          beginPlayback(0, 0);
          return;
        }

        setPlaybackSnapshot(
          initialSnapshot,
        );
      });

    return () => {
      window.cancelAnimationFrame(
        resetFrame,
      );

      cancelPlayback();
    };
  }, [
    autoPlay,
    beginPlayback,
    cancelPlayback,
    setPlaybackSnapshot,
    timeline,
    traceKey,
  ]);

  return {
    ...snapshot,
    pause,
    play,
    replay,
    selectStep,
  };
}