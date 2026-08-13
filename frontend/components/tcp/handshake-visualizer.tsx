"use client";

import { useMemo, useState } from "react";

import {
  HostIllustration,
  type ClientHostAppearance,
  type ServerHostAppearance,
} from "@/components/tcp/host-illustration";
import { useTracePlayback } from "@/components/tcp/use-trace-playback";
import {
  createTraceTimeline,
  type PlaybackMode,
  type PlaybackStatus,
} from "@/lib/trace-playback";
import type {
  SimulationRun,
  TcpHandshakeEvent,
} from "@/types/simulation";

type HandshakeVisualizerProps = {
  simulation: SimulationRun | null;
  emptyMessage?: string;
  autoPlay?: boolean;
  showAppearanceControls?: boolean;
};

const CLIENT_APPEARANCES: Array<{
  value: ClientHostAppearance;
  label: string;
}> = [
  {
    value: "desktop",
    label: "Desktop",
  },
  {
    value: "laptop",
    label: "Laptop",
  },
];

const SERVER_APPEARANCES: Array<{
  value: ServerHostAppearance;
  label: string;
}> = [
  {
    value: "server-rack",
    label: "Server rack",
  },
  {
    value: "desktop",
    label: "Desktop",
  },
];

function getPlaybackStatusLabel(
  status: PlaybackStatus,
  event: TcpHandshakeEvent | undefined,
): string {
  if (status === "completed") {
    return "Handshake playback completed.";
  }

  if (!event) {
    return (
      "Playback is ready when a simulation " +
      "result is available."
    );
  }

  const packetLabel = event.flags.join(" + ");

  const action =
    status === "playing"
      ? "is moving"
      : status === "paused"
        ? "is paused"
        : "is ready";

  return (
    `Step ${event.step}: ${packetLabel} ${action} ` +
    `from ${event.source} to ${event.destination}.`
  );
}

function getEndpointStates(
  result: SimulationRun["result"],
  event: TcpHandshakeEvent | undefined,
  status: PlaybackStatus,
) {
  if (result && status === "completed") {
    return result.final_state;
  }

  return {
    client: event?.client_state ?? "CLOSED",
    server: event?.server_state ?? "LISTEN",
  };
}

export function HandshakeVisualizer({
  simulation,
  emptyMessage = (
    "Set your values, then send the first SYN packet."
  ),
  autoPlay = false,
  showAppearanceControls = false,
}: HandshakeVisualizerProps) {
  const [mode, setMode] =
    useState<PlaybackMode>("demo");

  const [
    clientAppearance,
    setClientAppearance,
  ] = useState<ClientHostAppearance>("desktop");

  const [
    serverAppearance,
    setServerAppearance,
  ] = useState<ServerHostAppearance>("server-rack");

  const result = simulation?.result ?? null;

  const events = useMemo(
    () => result?.events ?? [],
    [result],
  );

  const timeline = useMemo(
    () =>
      createTraceTimeline(
        events,
        mode,
        simulation?.input_parameters,
      ),
    [
      events,
      mode,
      simulation?.input_parameters,
    ],
  );

  const traceKey = simulation
    ? [
        simulation.id,
        result?.events.length ?? 0,
        result?.total_duration_ms ?? "empty",
      ].join("-")
    : null;

  const playback = useTracePlayback({
    traceKey,
    timeline,
    autoPlay,
  });

  const activeStep = Math.min(
    playback.activeStep,
    Math.max(events.length - 1, 0),
  );

  const event = events[activeStep];

  const endpointStates = getEndpointStates(
    result,
    event,
    playback.status,
  );

  const hasTrace = events.length > 0;
  const isPlaying =
    playback.status === "playing";

  const packetProgress =
    playback.status === "completed"
      ? 1
      : playback.progress;

  const flightPosition = event
    ? event.source === "client"
      ? 5 + packetProgress * 90
      : 95 - packetProgress * 90
    : 5;

  function selectMode(
    nextMode: PlaybackMode,
  ) {
    if (!isPlaying) {
      setMode(nextMode);
    }
  }

  return (
    <section
      className={
        `visual-panel ${result ? "has-result" : ""}`
      }
      aria-busy={isPlaying}
      aria-label="TCP handshake playback"
    >
      <div className="visual-topline">
        <span className="live-label">
          <i />
          {result
            ? "Run complete"
            : "Ready to simulate"}
        </span>

        <span>
          {result
            ? `Run #${simulation?.id}`
            : "TCP / IPv4"}
        </span>
      </div>

      <div className="playback-toolbar">
        <div
          className="playback-mode"
          aria-label="Playback speed"
        >
          <span>Playback speed</span>

          <div
            role="group"
            aria-label="Playback mode"
          >
            <button
              type="button"
              onClick={() => selectMode("demo")}
              aria-pressed={mode === "demo"}
              disabled={isPlaying}
            >
              Demo time
            </button>

            <button
              type="button"
              onClick={() => selectMode("real")}
              aria-pressed={mode === "real"}
              disabled={isPlaying}
            >
              Real time
            </button>
          </div>
        </div>

        <div
          className="playback-actions"
          aria-label="Trace playback controls"
        >
          <button
            type="button"
            className="play-button"
            onClick={playback.play}
            disabled={!hasTrace || isPlaying}
          >
            {playback.status === "paused"
              ? "Resume"
              : playback.status === "completed"
                ? "Replay"
                : "Play trace"}
          </button>

          <button
            type="button"
            className="pause-button"
            onClick={playback.pause}
            disabled={!isPlaying}
          >
            Pause
          </button>

          <button
            type="button"
            className="replay-button"
            onClick={playback.replay}
            disabled={!hasTrace}
          >
            Restart
          </button>
        </div>
      </div>

      {showAppearanceControls && (
        <fieldset className="appearance-controls">
          <legend>Endpoint appearance</legend>

          <AppearanceChooser
            label="Client host"
            options={CLIENT_APPEARANCES}
            selected={clientAppearance}
            onSelect={setClientAppearance}
          />

          <AppearanceChooser
            label="Server host"
            options={SERVER_APPEARANCES}
            selected={serverAppearance}
            onSelect={setServerAppearance}
          />
        </fieldset>
      )}

      <div className="network-stage">
        <Node
          name="Client"
          state={endpointStates.client}
          appearance={clientAppearance}
        />

        <div className="packet-lane">
          <div
            className="connection-line"
            aria-hidden="true"
          />

          {event ? (
            <div
              className={
                `packet-flight ${
                  event.source === "client"
                    ? "packet-right"
                    : "packet-left"
                }`
              }
              style={{
                left: `${flightPosition}%`,
              }}
            >
              <span className="packet-step">
                0{event.step}
              </span>

              <span className="packet-body">
                <strong>
                  {event.flags.join(" + ")}
                </strong>

                <small>
                  seq {event.sequence_number}
                  {event.acknowledgment_number !==
                    null &&
                    ` · ack ${
                      event.acknowledgment_number
                    }`}
                </small>
              </span>

              <span
                className="packet-arrow"
                aria-hidden="true"
              >
                {event.source === "client"
                  ? "→"
                  : "←"}
              </span>
            </div>
          ) : (
            <p className="empty-stage">
              {emptyMessage}
            </p>
          )}
        </div>

        <Node
          name="Server"
          state={endpointStates.server}
          appearance={serverAppearance}
        />
      </div>

      <div
        className="trace-steps"
        aria-label="TCP handshake steps"
      >
        {events.map((packet, index) => (
          <button
            key={
              `${packet.step}-${packet.sent_at_ms}`
            }
            type="button"
            className={
              index === activeStep
                ? "trace-step-active"
                : ""
            }
            onClick={() =>
              playback.selectStep(index)
            }
            aria-pressed={index === activeStep}
            disabled={isPlaying}
          >
            <span>0{packet.step}</span>

            <strong>
              {packet.flags.join(" + ")}
            </strong>

            <small>
              {packet.source} to{" "}
              {packet.destination}
            </small>
          </button>
        ))}
      </div>

      <div className="packet-details">
        <div className="detail-number">
          {event ? `0${event.step}` : "?"}
        </div>

        <div>
          <p>
            {event
              ? `${event.source} → ${
                  event.destination
                }`
              : "Awaiting simulation"}
          </p>

          <strong>
            {event?.description ??
              "The packet details will appear here."}
          </strong>
        </div>

        <span
          className="playback-status"
          aria-live="polite"
        >
          {getPlaybackStatusLabel(
            playback.status,
            event,
          )}
        </span>
      </div>

      <div className="run-stats">
        <Stat
          label="Simulated total time"
          value={
            result
              ? `${result.total_duration_ms} ms`
              : "—"
          }
        />

        <Stat
          label="Packets"
          value={
            result
              ? String(events.length)
              : "—"
          }
        />

        <Stat
          label="Final state"
          value={
            result
              ? `${result.final_state.client} / ${
                  result.final_state.server
                }`
              : "—"
          }
        />
      </div>

      <p className="simulated-time-note">
        Total time is simulated protocol time;
        Demo time changes only the visual playback
        speed.
      </p>
    </section>
  );
}

function AppearanceChooser<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: Array<{
    value: T;
    label: string;
  }>;
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="appearance-choice">
      <span>{label}</span>

      <div
        role="group"
        aria-label={label}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={
              selected === option.value
            }
            onClick={() =>
              onSelect(option.value)
            }
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Node({
  name,
  state,
  appearance,
}: {
  name: "Client" | "Server";
  state: string;
  appearance:
    | ClientHostAppearance
    | ServerHostAppearance;
}) {
  return (
    <div
      className={
        `node node-${name.toLowerCase()}`
      }
    >
      <HostIllustration
        endpoint={name}
        appearance={appearance}
      />

      <strong>{name}</strong>
      <small>{state}</small>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}