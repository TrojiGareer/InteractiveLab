"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import {
  useEffect,
  useState,
} from "react";

import { HandshakeVisualizer } from "@/components/tcp/handshake-visualizer";
import { PrimaryNavigation } from "@/components/primary-navigation";
import {
  ApiError,
  createSimulation,
  getHealth,
  getProtocol,
} from "@/lib/api-client";
import {
  createProtocolParameterValues,
  validateProtocolParameterValues,
} from "@/lib/protocol-parameters";
import type {
  ProtocolDefinition,
  ProtocolParameter,
} from "@/types/protocol";
import type { SimulationRun } from "@/types/simulation";

export function TcpSimulator() {
  const [protocol, setProtocol] =
    useState<ProtocolDefinition | null>(null);

  const [parameters, setParameters] =
    useState<Record<string, string>>({});

  const [simulation, setSimulation] =
    useState<SimulationRun | null>(null);

  const [apiOnline, setApiOnline] =
    useState<boolean | null>(null);

  const [isRunning, setIsRunning] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProtocol() {
      try {
        await getHealth();

        const protocolDefinition =
          await getProtocol("tcp");

        if (!active) {
          return;
        }

        setProtocol(protocolDefinition);
        setParameters(
          createProtocolParameterValues(
            protocolDefinition,
          ),
        );
        setApiOnline(true);
      } catch (requestError) {
        if (!active) {
          return;
        }

        setApiOnline(false);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not load the TCP protocol.",
        );
      }
    }

    void loadProtocol();

    return () => {
      active = false;
    };
  }, []);

  function updateParameter(
    name: string,
    value: string,
  ) {
    setParameters((currentParameters) => ({
      ...currentParameters,
      [name]: value,
    }));
  }

  function resetParameters() {
    if (protocol) {
      setParameters(
        createProtocolParameterValues(protocol),
      );
    }

    setError(null);
  }

  async function runSimulation(
    formEvent: FormEvent<HTMLFormElement>,
  ) {
    formEvent.preventDefault();

    setError(null);

    if (!protocol) {
      setError(
        "The TCP protocol configuration is not available.",
      );
      return;
    }

    const parameterValidation =
      validateProtocolParameterValues(
        protocol,
        parameters,
      );

    if (!parameterValidation.valid) {
      setError(parameterValidation.error);
      return;
    }

    setIsRunning(true);

    try {
      const completedSimulation =
        await createSimulation({
          protocol: protocol.id,
          input_parameters: parameterValidation.values,
        });

      setSimulation(completedSimulation);
      setApiOnline(true);
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setApiOnline(requestError.status !== 0);
        setError(requestError.message);
      } else {
        setApiOnline(false);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not reach the API.",
        );
      }
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <header className="topbar">
          <Link
            className="brand"
            href="/"
            aria-label="Protocol Lab home"
          >
            <b>P</b> protocol<span>lab</span>
          </Link>

          <div className="topbar-actions">
            <span
              className={`api-status ${
                apiOnline === null
                  ? "checking"
                  : apiOnline
                    ? "online"
                    : "offline"
              }`}
            >
              <i />{" "}
              {apiOnline === null
                ? "Checking API"
                : apiOnline
                  ? "API connected"
                  : "API unavailable"}
            </span>

            <PrimaryNavigation className="topbar-navigation" />

            <a href="#learn">
              How it works
            </a>
          </div>
        </header>

        <div className="hero-content">
          <p className="eyebrow">
            <span /> Interactive networking lab
          </p>

          <h1>
            See the connection
            <br />
            <em>before</em> it happens.
          </h1>

          <p>
            Experiment with the TCP three-way
            handshake, tune its inputs, and trace
            every packet that creates a reliable
            connection.
          </p>

          <a
            className="hero-action"
            href="#simulator"
          >
            Open simulator <span>↓</span>
          </a>
        </div>

        <div
          className="hero-grid"
          aria-hidden="true"
        />

        <div
          className="hero-orb orb-one"
          aria-hidden="true"
        />

        <div
          className="hero-orb orb-two"
          aria-hidden="true"
        />
      </section>

      <section
        className="workspace"
        id="simulator"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">
              <span /> Protocol simulator
            </p>

            <h2>
              {protocol?.name ??
                "TCP three-way handshake"}
            </h2>
          </div>

          <p>
            Each run is calculated and saved by
            the FastAPI + PostgreSQL backend.
          </p>
        </div>

        <div className="simulator-grid">
          <form
            className="control-panel"
            onSubmit={runSimulation}
          >
            <div className="panel-heading">
              <b>⌘</b>

              <div>
                <strong>Configure run</strong>
                <small>
                  Adjust the starting conditions
                </small>
              </div>
            </div>

            {protocol ? (
              protocol.parameters.map(
                (parameter) => (
                  <NumberInput
                    key={parameter.name}
                    parameter={parameter}
                    value={
                      parameters[
                        parameter.name
                      ] ?? ""
                    }
                    onChange={(value) =>
                      updateParameter(
                        parameter.name,
                        value,
                      )
                    }
                  />
                ),
              )
            ) : (
              <p>
                Loading TCP configuration…
              </p>
            )}

            {error && (
              <p
                className="form-error"
                role="alert"
              >
                {error}
              </p>
            )}

            <div className="form-actions">
              <button
                className="run-button"
                type="submit"
                disabled={
                  isRunning || !protocol
                }
              >
                {isRunning
                  ? "Running simulation…"
                  : "Run simulation"}{" "}
                <span>→</span>
              </button>

              <button
                className="reset-button"
                type="button"
                onClick={resetParameters}
                disabled={!protocol}
              >
                Reset
              </button>
            </div>
          </form>

          <HandshakeVisualizer
            simulation={simulation}
            autoPlay
            showAppearanceControls
          />
        </div>
      </section>

      <section
        className="learn"
        id="learn"
      >
        <div>
          <p className="eyebrow dark">
            <span /> Why three packets?
          </p>

          <h2>
            Both sides agree
            <br />
            before data flows.
          </h2>
        </div>

        <div className="learn-steps">
          <article>
            <span>01</span>
            <h3>SYN</h3>
            <p>
              The client announces that it wants
              to begin, with its initial sequence
              number.
            </p>
          </article>

          <article>
            <span>02</span>
            <h3>SYN + ACK</h3>
            <p>
              The server confirms the request and
              supplies its own starting sequence
              number.
            </p>
          </article>

          <article>
            <span>03</span>
            <h3>ACK</h3>
            <p>
              The client confirms the server&apos;s
              sequence number. The connection is
              established.
            </p>
          </article>
        </div>
      </section>

      <footer>
        <b>
          protocol<span>lab</span>
        </b>

        <span>Learn it by sending it.</span>
        <span>TCP handshake · v0.1</span>
      </footer>
    </main>
  );
}

function NumberInput({
  parameter,
  value,
  onChange,
}: {
  parameter: ProtocolParameter;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="number-input">
      <span>
        {parameter.label}

        <b>
          {parameter.unit?.toUpperCase() ??
            "VALUE"}
        </b>
      </span>

      <input
        type="number"
        min={parameter.minimum}
        max={parameter.maximum}
        value={value}
        onChange={(changeEvent) =>
          onChange(changeEvent.target.value)
        }
        required
      />

      <small>{parameter.description}</small>
    </label>
  );
}
