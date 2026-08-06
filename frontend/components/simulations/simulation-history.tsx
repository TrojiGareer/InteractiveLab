"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import { HandshakeVisualizer } from "@/components/tcp/handshake-visualizer";
import { PrimaryNavigation } from "@/components/primary-navigation";
import {
  getSimulation,
  listSimulations,
} from "@/lib/api-client";
import type {
  SimulationListResponse,
  SimulationRun,
} from "@/types/simulation";

import styles from "./simulation-history.module.css";

const PAGE_SIZE = 10;

function formatDate(dateValue: string): string {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(dateValue));
}

function formatParameterName(
  parameterName: string,
): string {
  return parameterName
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(" ");
}

export function SimulationHistory() {
  const [skip, setSkip] = useState(0);

  const [history, setHistory] =
    useState<SimulationListResponse | null>(
      null,
    );

  const [
    selectedSimulation,
    setSelectedSimulation,
  ] = useState<SimulationRun | null>(null);

  const [isListLoading, setIsListLoading] =
    useState(true);

  const [
    isDetailLoading,
    setIsDetailLoading,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      try {
        const historyResponse =
          await listSimulations(
            skip,
            PAGE_SIZE,
          );

        if (!active) {
          return;
        }

        setHistory(historyResponse);
        setSelectedSimulation(
          historyResponse.items[0] ?? null,
        );
        setError(null);
      } catch (requestError) {
        if (!active) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not load simulation history.",
        );
      } finally {
        if (active) {
          setIsListLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      active = false;
    };
  }, [skip]);

  async function selectSimulation(
    simulationId: number,
  ) {
    if (
      selectedSimulation?.id === simulationId
    ) {
      return;
    }

    setIsDetailLoading(true);
    setError(null);

    try {
      const simulation =
        await getSimulation(simulationId);

      setSelectedSimulation(simulation);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load the simulation.",
      );
    } finally {
      setIsDetailLoading(false);
    }
  }

  function changePage(newSkip: number) {
    setIsListLoading(true);
    setSelectedSimulation(null);
    setSkip(newSkip);
  }

  const total = history?.total ?? 0;

  const currentPage =
    Math.floor(skip / PAGE_SIZE) + 1;

  const totalPages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE),
  );

  const hasPreviousPage = skip > 0;

  const hasNextPage =
    history !== null &&
    skip + history.items.length < total;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link
          className={styles.brand}
          href="/"
        >
          <b>P</b> protocol<span>lab</span>
        </Link>

        <PrimaryNavigation className={styles.navigation} />
      </header>

      <section className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>
            Saved simulations
          </p>

          <h1>TCP run history</h1>
        </div>

        <p>
          Inspect previous runs, their input
          parameters and every packet used to
          establish the connection.
        </p>
      </section>

      {error && (
        <p
          className={styles.error}
          role="alert"
        >
          {error}
        </p>
      )}

      <section className={styles.layout}>
        <aside className={styles.listPanel}>
          <div className={styles.listHeading}>
            <div>
              <strong>Recent runs</strong>
              <span>
                {total} saved simulation
                {total === 1 ? "" : "s"}
              </span>
            </div>

            {isListLoading && (
              <span className={styles.loading}>
                Loading…
              </span>
            )}
          </div>

          <div className={styles.runList}>
            {!isListLoading &&
              history?.items.length === 0 && (
                <div className={styles.empty}>
                  <strong>
                    No simulations yet
                  </strong>

                  <p>
                    Run the TCP simulator to
                    create the first entry.
                  </p>

                  <Link href="/">
                    Open simulator
                  </Link>
                </div>
              )}

            {history?.items.map(
              (simulation) => (
                <button
                  key={simulation.id}
                  type="button"
                  className={`${styles.runItem} ${
                    selectedSimulation?.id ===
                    simulation.id
                      ? styles.runItemActive
                      : ""
                  }`}
                  onClick={() =>
                    void selectSimulation(
                      simulation.id,
                    )
                  }
                >
                  <span
                    className={styles.runNumber}
                  >
                    #{simulation.id}
                  </span>

                  <span
                    className={styles.runSummary}
                  >
                    <strong>
                      {simulation.protocol.toUpperCase()}
                    </strong>

                    <time
                      dateTime={
                        simulation.created_at
                      }
                    >
                      {formatDate(
                        simulation.created_at,
                      )}
                    </time>
                  </span>

                  <span
                    className={styles.runStatus}
                  >
                    {simulation.status}
                  </span>
                </button>
              ),
            )}
          </div>

          <div className={styles.pagination}>
            <button
              type="button"
              disabled={
                !hasPreviousPage ||
                isListLoading
              }
              onClick={() =>
                changePage(
                  Math.max(
                    0,
                    skip - PAGE_SIZE,
                  ),
                )
              }
            >
              ← Previous
            </button>

            <span>
              Page {currentPage} of{" "}
              {totalPages}
            </span>

            <button
              type="button"
              disabled={
                !hasNextPage ||
                isListLoading
              }
              onClick={() =>
                changePage(skip + PAGE_SIZE)
              }
            >
              Next →
            </button>
          </div>
        </aside>

        <div
          className={styles.detailPanel}
          aria-busy={isDetailLoading}
        >
          {selectedSimulation ? (
            <>
              <div
                className={
                  styles.detailHeading
                }
              >
                <div>
                  <p>Selected simulation</p>

                  <h2>
                    Run #
                    {selectedSimulation.id}
                  </h2>
                </div>

                <div
                  className={
                    styles.detailMetadata
                  }
                >
                  <span>
                    {selectedSimulation.scenario_id
                      ? `Scenario #${selectedSimulation.scenario_id}`
                      : "Direct run"}
                  </span>

                  <time
                    dateTime={
                      selectedSimulation.created_at
                    }
                  >
                    {formatDate(
                      selectedSimulation.created_at,
                    )}
                  </time>
                </div>
              </div>

              <HandshakeVisualizer
                key={selectedSimulation.id}
                simulation={
                  selectedSimulation
                }
                emptyMessage="This simulation has no result."
              />

              <div
                className={
                  styles.parametersPanel
                }
              >
                <h3>Input parameters</h3>

                <div
                  className={
                    styles.parameterGrid
                  }
                >
                  {Object.entries(
                    selectedSimulation.input_parameters,
                  ).map(([name, value]) => (
                    <div key={name}>
                      <span>
                        {formatParameterName(
                          name,
                        )}
                      </span>

                      <strong>
                        {String(value)}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div
              className={
                styles.noSelection
              }
            >
              {isListLoading
                ? "Loading simulation history…"
                : "Select a simulation to inspect it."}
            </div>
          )}

          {isDetailLoading && (
            <div
              className={
                styles.detailLoading
              }
            >
              Loading selected run…
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
