"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { PrimaryNavigation } from "@/components/primary-navigation";
import { HandshakeVisualizer } from "@/components/tcp/handshake-visualizer";
import {
  createScenario,
  deleteScenario,
  getProtocol,
  getScenario,
  listScenarios,
  patchScenario,
  runScenario,
} from "@/lib/api-client";
import {
  createProtocolParameterValues,
  type ProtocolParameterValues,
  validateProtocolParameterValues,
} from "@/lib/protocol-parameters";
import { getSkipAfterScenarioDeletion } from "@/lib/scenario-pagination";
import type { ProtocolDefinition } from "@/types/protocol";
import type {
  Scenario,
  ScenarioCreateRequest,
  ScenarioListResponse,
  ScenarioPatchRequest,
} from "@/types/scenario";
import type { SimulationRun } from "@/types/simulation";

import styles from "./scenario-manager.module.css";

const PAGE_SIZE = 6;

type ScenarioFormValues = {
  name: string;
  description: string;
  protocol: string;
  parameters: ProtocolParameterValues;
};

type PendingOperation =
  | "create"
  | "update"
  | "delete"
  | "run"
  | null;

function createBlankForm(
  protocol: ProtocolDefinition | null,
): ScenarioFormValues {
  return {
    name: "",
    description: "",
    protocol: protocol?.id ?? "tcp",
    parameters: protocol
      ? createProtocolParameterValues(protocol)
      : {},
  };
}

function createFormFromScenario(
  scenario: Scenario,
  protocol: ProtocolDefinition,
): ScenarioFormValues {
  return {
    name: scenario.name,
    description: scenario.description ?? "",
    protocol: scenario.protocol,
    parameters: createProtocolParameterValues(
      protocol,
      scenario.parameters,
    ),
  };
}

function formatDate(dateValue: string): string {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeDescription(value: string): string | null {
  const trimmedValue = value.trim();
  return trimmedValue === "" ? null : trimmedValue;
}

function listsHaveExpectedShape(
  response: ScenarioListResponse,
): boolean {
  return (
    Array.isArray(response.items) &&
    Number.isInteger(response.total) &&
    Number.isInteger(response.skip) &&
    Number.isInteger(response.limit)
  );
}

function parameterValuesMatch(
  values: Record<string, number>,
  comparison: Record<string, number>,
): boolean {
  const valueKeys = Object.keys(values);
  const comparisonKeys = Object.keys(comparison);

  return (
    valueKeys.length === comparisonKeys.length &&
    valueKeys.every(
      (key) => values[key] === comparison[key],
    )
  );
}

function getFieldValidationError(
  form: ScenarioFormValues,
): string | null {
  const name = form.name.trim();
  const description = normalizeDescription(form.description);

  if (name.length === 0) {
    return "Scenario name is required.";
  }

  if (name.length > 100) {
    return "Scenario name must be 100 characters or fewer.";
  }

  if (description !== null && description.length > 1000) {
    return "Description must be 1000 characters or fewer.";
  }

  return null;
}

export function ScenarioManager() {
  const [protocol, setProtocol] =
    useState<ProtocolDefinition | null>(null);
  const [form, setForm] = useState<ScenarioFormValues>(
    createBlankForm(null),
  );
  const [editingScenario, setEditingScenario] =
    useState<Scenario | null>(null);
  const [scenarioPage, setScenarioPage] =
    useState<ScenarioListResponse | null>(null);
  const [skip, setSkip] = useState(0);
  const [isProtocolLoading, setIsProtocolLoading] =
    useState(true);
  const [isListLoading, setIsListLoading] =
    useState(true);
  const [isDetailLoading, setIsDetailLoading] =
    useState(false);
  const [pendingOperation, setPendingOperation] =
    useState<PendingOperation>(null);
  const [deleteCandidate, setDeleteCandidate] =
    useState<Scenario | null>(null);
  const [lastRun, setLastRun] =
    useState<SimulationRun | null>(null);
  const [formError, setFormError] =
    useState<string | null>(null);
  const [listError, setListError] =
    useState<string | null>(null);
  const [protocolError, setProtocolError] =
    useState<string | null>(null);
  const [actionError, setActionError] =
    useState<string | null>(null);
  const [feedback, setFeedback] =
    useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const listRequestId = useRef(0);

  useEffect(() => {
    let active = true;

    async function loadProtocol() {
      try {
        const protocolDefinition = await getProtocol("tcp");

        if (
          !Array.isArray(protocolDefinition.parameters) ||
          protocolDefinition.parameters.length === 0
        ) {
          throw new Error(
            "The API returned an incomplete TCP protocol definition.",
          );
        }

        if (!active) {
          return;
        }

        setProtocol(protocolDefinition);
        setForm((currentForm) =>
          Object.keys(currentForm.parameters).length === 0
            ? {
                ...currentForm,
                protocol: protocolDefinition.id,
                parameters: createProtocolParameterValues(
                  protocolDefinition,
                ),
              }
            : currentForm,
        );
        setProtocolError(null);
      } catch (requestError) {
        if (active) {
          setProtocolError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load TCP parameter metadata.",
          );
        }
      } finally {
        if (active) {
          setIsProtocolLoading(false);
        }
      }
    }

    void loadProtocol();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const requestId = listRequestId.current + 1;
    listRequestId.current = requestId;

    async function loadScenarios() {
      setIsListLoading(true);

      try {
        const response = await listScenarios(skip, PAGE_SIZE);

        if (!listsHaveExpectedShape(response)) {
          throw new Error(
            "The API returned an incomplete scenario list.",
          );
        }

        if (active && requestId === listRequestId.current) {
          setScenarioPage(response);
          setListError(null);
        }
      } catch (requestError) {
        if (active && requestId === listRequestId.current) {
          setListError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load saved scenarios.",
          );
        }
      } finally {
        if (active && requestId === listRequestId.current) {
          setIsListLoading(false);
        }
      }
    }

    void loadScenarios();

    return () => {
      active = false;
    };
  }, [reloadKey, skip]);

  const total = scenarioPage?.total ?? 0;
  const currentPage = Math.floor(skip / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPreviousPage = skip > 0;
  const hasNextPage =
    scenarioPage !== null &&
    skip + scenarioPage.items.length < total;
  const isBusy =
    pendingOperation !== null || isDetailLoading;
  const displayError =
    actionError ?? formError ?? protocolError ?? listError;

  function resetForm() {
    setEditingScenario(null);
    setForm(createBlankForm(protocol));
    setFormError(null);
  }

  function refreshCurrentPage() {
    setReloadKey((currentKey) => currentKey + 1);
  }

  function updateParameter(name: string, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      parameters: {
        ...currentForm.parameters,
        [name]: value,
      },
    }));
  }

  function getValidatedPayload(): ScenarioCreateRequest | null {
    if (!protocol) {
      setFormError("TCP parameter metadata is not available yet.");
      return null;
    }

    const fieldError = getFieldValidationError(form);

    if (fieldError) {
      setFormError(fieldError);
      return null;
    }

    const parameterValidation = validateProtocolParameterValues(
      protocol,
      form.parameters,
    );

    if (!parameterValidation.valid) {
      setFormError(parameterValidation.error);
      return null;
    }

    return {
      name: form.name.trim(),
      description: normalizeDescription(form.description),
      protocol: form.protocol,
      parameters: parameterValidation.values,
    };
  }

  async function submitScenario(
    submitEvent: FormEvent<HTMLFormElement>,
  ) {
    submitEvent.preventDefault();

    if (isBusy) {
      return;
    }

    setActionError(null);
    setFeedback(null);
    setFormError(null);

    const payload = getValidatedPayload();

    if (!payload) {
      return;
    }

    if (!editingScenario) {
      setPendingOperation("create");

      try {
        const createdScenario = await createScenario(payload);
        setFeedback(`Scenario "${createdScenario.name}" was saved.`);
        resetForm();

        if (skip === 0) {
          refreshCurrentPage();
        } else {
          setSkip(0);
        }
      } catch (requestError) {
        setActionError(
          requestError instanceof Error
            ? requestError.message
            : "Could not create the scenario.",
        );
      } finally {
        setPendingOperation(null);
      }

      return;
    }

    const patch: ScenarioPatchRequest = {};

    if (payload.name !== editingScenario.name) {
      patch.name = payload.name;
    }

    if (payload.description !== editingScenario.description) {
      patch.description = payload.description;
    }

    if (payload.protocol !== editingScenario.protocol) {
      patch.protocol = payload.protocol;
    }

    if (!parameterValuesMatch(
      payload.parameters,
      editingScenario.parameters,
    )) {
      patch.parameters = payload.parameters;
    }

    if (Object.keys(patch).length === 0) {
      setFeedback("No scenario changes need to be saved.");
      return;
    }

    setPendingOperation("update");

    try {
      const updatedScenario = await patchScenario(
        editingScenario.id,
        patch,
      );
      setFeedback(`Scenario "${updatedScenario.name}" was updated.`);
      resetForm();

      if (skip === 0) {
        refreshCurrentPage();
      } else {
        setSkip(0);
      }
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Could not update the scenario.",
      );
    } finally {
      setPendingOperation(null);
    }
  }

  async function startEditing(scenario: Scenario) {
    if (isBusy || !protocol) {
      return;
    }

    setActionError(null);
    setFormError(null);
    setFeedback(null);
    setIsDetailLoading(true);

    try {
      const currentScenario = await getScenario(scenario.id);
      setEditingScenario(currentScenario);
      setForm(createFormFromScenario(currentScenario, protocol));
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load this scenario for editing.",
      );
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function confirmDeletion() {
    if (!deleteCandidate || isBusy) {
      return;
    }

    const deletedScenario = deleteCandidate;
    setPendingOperation("delete");
    setActionError(null);
    setFeedback(null);

    try {
      await deleteScenario(deletedScenario.id);
      setDeleteCandidate(null);
      setFeedback(`Scenario "${deletedScenario.name}" was deleted.`);

      if (editingScenario?.id === deletedScenario.id) {
        resetForm();
      }

      const nextSkip = getSkipAfterScenarioDeletion(
        skip,
        PAGE_SIZE,
        scenarioPage?.items.length ?? 0,
      );

      if (nextSkip !== skip) {
        setSkip(nextSkip);
      } else {
        refreshCurrentPage();
      }
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Could not delete the scenario.",
      );
    } finally {
      setPendingOperation(null);
    }
  }

  async function executeScenario(scenario: Scenario) {
    if (isBusy) {
      return;
    }

    setPendingOperation("run");
    setActionError(null);
    setFeedback(null);

    try {
      const completedRun = await runScenario(scenario.id);
      setLastRun(completedRun);
      setFeedback(
        `Scenario "${scenario.name}" completed as run #${completedRun.id}.`,
      );
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Could not run the scenario.",
      );
    } finally {
      setPendingOperation(null);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          <b>P</b> protocol<span>lab</span>
        </Link>

        <PrimaryNavigation className={styles.navigation} />
      </header>

      <section className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>Reusable experiments</p>
          <h1>Saved TCP scenarios</h1>
        </div>

        <p>
          Save a set of protocol inputs, revise it when your experiment
          changes, and create immutable handshake runs from it.
        </p>
      </section>

      <div className={styles.feedbackRegion} aria-live="polite">
        {feedback && <p className={styles.success}>{feedback}</p>}
        {lastRun && (
          <Link className={styles.historyLink} href="/simulations">
            View run history
          </Link>
        )}
      </div>

      {displayError && (
        <p className={styles.error} role="alert">
          {displayError}
        </p>
      )}

      <section className={styles.workspace}>
        <section
          className={styles.formPanel}
          aria-busy={isProtocolLoading || isDetailLoading}
        >
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.panelEyebrow}>
                {editingScenario ? "Editing scenario" : "New scenario"}
              </p>
              <h2>
                {editingScenario
                  ? editingScenario.name
                  : "Configure a repeatable run"}
              </h2>
            </div>

            {editingScenario && (
              <button
                type="button"
                className={styles.textButton}
                onClick={resetForm}
                disabled={isBusy}
              >
                Cancel edit
              </button>
            )}
          </div>

          <form onSubmit={submitScenario}>
            <fieldset
              className={styles.fieldset}
              disabled={isProtocolLoading || isDetailLoading || isBusy}
            >
              <label className={styles.field} htmlFor="scenario-name">
                <span>Scenario name</span>
                <input
                  id="scenario-name"
                  type="text"
                  value={form.name}
                  maxLength={100}
                  required
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      name: event.target.value,
                    }))
                  }
                />
              </label>

              <label
                className={styles.field}
                htmlFor="scenario-description"
              >
                <span>
                  Description <small>Optional</small>
                </span>
                <textarea
                  id="scenario-description"
                  value={form.description}
                  maxLength={1000}
                  rows={3}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      description: event.target.value,
                    }))
                  }
                />
              </label>

              <label className={styles.field} htmlFor="scenario-protocol">
                <span>Protocol</span>
                <select
                  id="scenario-protocol"
                  value={form.protocol}
                  disabled
                  aria-describedby="protocol-help"
                >
                  <option value={protocol?.id ?? "tcp"}>
                    {protocol?.name ?? "Loading TCP..."}
                  </option>
                </select>
                <small id="protocol-help">
                  TCP is currently the available protocol.
                </small>
              </label>

              <div className={styles.parameterHeading}>
                <span>Parameters</span>
                <small>Loaded from the protocol catalog</small>
              </div>

              {protocol?.parameters.map((parameter) => (
                <label className={styles.field} key={parameter.name}>
                  <span>
                    {parameter.label}
                    <small>{parameter.unit?.toUpperCase() ?? "VALUE"}</small>
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={parameter.minimum}
                    max={parameter.maximum}
                    step="1"
                    value={form.parameters[parameter.name] ?? ""}
                    onChange={(event) =>
                      updateParameter(parameter.name, event.target.value)
                    }
                    required
                  />
                  <small>
                    {parameter.description} Range: {parameter.minimum} to{" "}
                    {parameter.maximum}.
                  </small>
                </label>
              ))}
            </fieldset>

            <div className={styles.formActions}>
              <button
                className={styles.primaryButton}
                type="submit"
                disabled={isProtocolLoading || isDetailLoading || isBusy}
              >
                {pendingOperation === "create"
                  ? "Saving..."
                  : pendingOperation === "update"
                    ? "Updating..."
                    : editingScenario
                      ? "Save changes"
                      : "Save scenario"}
              </button>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={resetForm}
                disabled={isProtocolLoading || isDetailLoading || isBusy}
              >
                Reset
              </button>
            </div>
          </form>
        </section>

        <section
          className={styles.listPanel}
          aria-busy={isListLoading}
          aria-labelledby="saved-scenarios-heading"
        >
          <div className={styles.listHeading}>
            <div>
              <p className={styles.panelEyebrow}>Scenario library</p>
              <h2 id="saved-scenarios-heading">Saved scenarios</h2>
              <span>
                {total} saved scenario{total === 1 ? "" : "s"}
              </span>
            </div>
            {isListLoading && <span className={styles.loading}>Loading...</span>}
          </div>

          {!isListLoading && scenarioPage?.items.length === 0 && (
            <div className={styles.empty}>
              <strong>No saved scenarios yet</strong>
              <p>
                Save a parameter set here to rerun the same TCP experiment
                later.
              </p>
            </div>
          )}

          <div className={styles.scenarioList}>
            {scenarioPage?.items.map((scenario) => (
              <article className={styles.scenarioCard} key={scenario.id}>
                <div className={styles.cardHeading}>
                  <div>
                    <p>Scenario #{scenario.id}</p>
                    <h3>{scenario.name}</h3>
                  </div>
                  <time dateTime={scenario.updated_at}>
                    Updated {formatDate(scenario.updated_at)}
                  </time>
                </div>

                <p className={styles.description}>
                  {scenario.description ?? "No description provided."}
                </p>

                <dl className={styles.parameters}>
                  {Object.entries(scenario.parameters).map(([name, value]) => (
                    <div key={name}>
                      <dt>
                        {protocol?.parameters.find(
                          (parameter) => parameter.name === name,
                        )?.label ?? name.replaceAll("_", " ")}
                      </dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
                </dl>

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => void executeScenario(scenario)}
                    disabled={isBusy}
                  >
                    {pendingOperation === "run" ? "Running..." : "Run scenario"}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => void startEditing(scenario)}
                    disabled={isBusy || isDetailLoading || !protocol}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={styles.dangerButton}
                    onClick={() => setDeleteCandidate(scenario)}
                    disabled={isBusy}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.pagination}>
            <button
              type="button"
              onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
              disabled={!hasPreviousPage || isListLoading || isBusy}
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setSkip(skip + PAGE_SIZE)}
              disabled={!hasNextPage || isListLoading || isBusy}
            >
              Next
            </button>
          </div>
        </section>
      </section>

      {lastRun && (
        <section className={styles.runPanel} aria-labelledby="scenario-run-heading">
          <div className={styles.runHeading}>
            <div>
              <p className={styles.panelEyebrow}>Latest scenario run</p>
              <h2 id="scenario-run-heading">Run #{lastRun.id}</h2>
            </div>
            <Link href="/simulations">Open immutable history</Link>
          </div>
          <HandshakeVisualizer simulation={lastRun} autoPlay />
        </section>
      )}

      {deleteCandidate && (
        <div className={styles.dialogBackdrop}>
          <section
            className={styles.dialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-scenario-heading"
            aria-describedby="delete-scenario-description"
          >
            <p className={styles.panelEyebrow}>Permanent scenario action</p>
            <h2 id="delete-scenario-heading">Delete this scenario?</h2>
            <p id="delete-scenario-description">
              Delete &quot;{deleteCandidate.name}&quot;? Its saved configuration will be
              removed. Historical simulation runs will remain available.
            </p>
            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={() => void confirmDeletion()}
                disabled={isBusy}
              >
                {pendingOperation === "delete" ? "Deleting..." : "Delete scenario"}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setDeleteCandidate(null)}
                disabled={isBusy}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
