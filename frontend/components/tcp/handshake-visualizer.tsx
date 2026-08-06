"use client";

import {
  useEffect,
  useState,
} from "react";

import type {
  SimulationRun,
  TcpHandshakeEvent,
} from "@/types/simulation";

type HandshakeVisualizerProps = {
  simulation: SimulationRun | null;
  emptyMessage?: string;
};

export function HandshakeVisualizer({
  simulation,
  emptyMessage = (
    "Set your values, then send the first SYN packet."
  ),
}: HandshakeVisualizerProps) {
  const [selectedStep, setSelectedStep] =
    useState(0);

  const [isPlaying, setIsPlaying] =
    useState(false);

  const result = simulation?.result ?? null;
  const event = result?.events[selectedStep];

  useEffect(() => {
    if (!isPlaying || !result) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (
        selectedStep >=
        result.events.length - 1
      ) {
        setIsPlaying(false);
      } else {
        setSelectedStep(
          (currentStep) => currentStep + 1,
        );
      }
    }, 850);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isPlaying, result, selectedStep]);

  function selectStep(step: number) {
    setSelectedStep(step);
    setIsPlaying(false);
  }

  function playTrace() {
    if (
      !result ||
      result.events.length === 0
    ) {
      return;
    }

    setSelectedStep(0);
    setIsPlaying(true);
  }

  return (
    <div
      className={`visual-panel ${
        result ? "has-result" : ""
      }`}
    >
      <div className="visual-topline">
        <span className="live-label">
          <i />{" "}
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

      <div className="network-stage">
        <Node
          name="Client"
          state={
            event?.client_state ?? "CLOSED"
          }
          icon="↗"
        />

        <div
          className="packet-lane"
          aria-live="polite"
        >
          {result ? (
            result.events.map(
              (packet, index) => (
                <Packet
                  key={packet.step}
                  event={packet}
                  active={
                    index === selectedStep
                  }
                  onClick={() =>
                    selectStep(index)
                  }
                />
              ),
            )
          ) : (
            <p className="empty-stage">
              {emptyMessage}
            </p>
          )}
        </div>

        <Node
          name="Server"
          state={
            event?.server_state ?? "LISTEN"
          }
          icon="◆"
          server
        />
      </div>

      <div className="packet-details">
        <div className="detail-number">
          {event ? `0${event.step}` : "?"}
        </div>

        <div>
          <p>
            {event
              ? `${event.source} → ${event.destination}`
              : "Awaiting simulation"}
          </p>

          <strong>
            {event?.description ??
              "The packet details will appear here."}
          </strong>
        </div>

        {event && (
          <button
            type="button"
            className="play-button"
            onClick={playTrace}
            disabled={isPlaying}
          >
            {isPlaying
              ? "Playing…"
              : "Play trace"}{" "}
            <span>▶</span>
          </button>
        )}
      </div>

      <div className="run-stats">
        <Stat
          label="Total time"
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
              ? String(result.events.length)
              : "—"
          }
        />

        <Stat
          label="Final state"
          value={
            result?.final_state.client ?? "—"
          }
        />
      </div>
    </div>
  );
}

function Node({
  name,
  state,
  icon,
  server = false,
}: {
  name: string;
  state: string;
  icon: string;
  server?: boolean;
}) {
  return (
    <div
      className={`node ${
        server
          ? "node-server"
          : "node-client"
      }`}
    >
      <span className="node-icon">
        {icon}
      </span>

      <strong>{name}</strong>
      <small>{state}</small>
    </div>
  );
}

function Packet({
  event,
  active,
  onClick,
}: {
  event: TcpHandshakeEvent;
  active: boolean;
  onClick: () => void;
}) {
  const fromClient =
    event.source === "client";

  return (
    <button
      type="button"
      className={`packet ${
        fromClient
          ? "packet-right"
          : "packet-left"
      } ${
        active ? "packet-active" : ""
      }`}
      onClick={onClick}
      aria-pressed={active}
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
            ` · ack ${event.acknowledgment_number}`}
        </small>
      </span>

      <span className="packet-arrow">
        {fromClient ? "→" : "←"}
      </span>
    </button>
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