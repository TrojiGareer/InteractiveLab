"use client";

import { useState } from "react";

import type { SimulationRun } from "@/types/simulation";

import styles from "./ai-assistant-panel.module.css";

type AssistantMode =
  | "explain"
  | "troubleshoot"
  | "report"
  | "questions";

type PracticeLevel =
  | "beginner"
  | "intermediate"
  | "interview";

type AiAssistantPanelProps = {
  simulation: SimulationRun;

  onExplain?: (
    simulationId: number,
  ) => Promise<string>;

  onTroubleshoot?: (
    simulationId: number,
    problemDescription: string,
  ) => Promise<string>;

  onGenerateReport?: (
    simulationId: number,
  ) => Promise<string>;

  onGenerateQuestion?: (
    simulationId: number,
    level: PracticeLevel,
  ) => Promise<string>;

  onEvaluateAnswer?: (
    simulationId: number,
    question: string,
    answer: string,
  ) => Promise<string>;
};

export function AiAssistantPanel({
  simulation,
  onExplain,
  onTroubleshoot,
  onGenerateReport,
  onGenerateQuestion,
  onEvaluateAnswer,
}: AiAssistantPanelProps) {
  const [activeMode, setActiveMode] =
    useState<AssistantMode>("explain");

  const [explanation, setExplanation] =
    useState<string | null>(null);

  const [
    troubleshootingResult,
    setTroubleshootingResult,
  ] = useState<string | null>(null);

  const [report, setReport] =
    useState<string | null>(null);

  const [
    problemDescription,
    setProblemDescription,
  ] = useState("");

  const [practiceLevel, setPracticeLevel] =
    useState<PracticeLevel>("beginner");

  const [question, setQuestion] =
    useState<string | null>(null);

  const [answer, setAnswer] =
    useState("");

  const [feedback, setFeedback] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(false);

  const canExplain =
    typeof onExplain === "function";

  const canTroubleshoot =
    typeof onTroubleshoot === "function";

  const canGenerateReport =
    typeof onGenerateReport === "function";

  const canGenerateQuestion =
    typeof onGenerateQuestion === "function";

  const canEvaluateAnswer =
    typeof onEvaluateAnswer === "function";

  function selectMode(mode: AssistantMode) {
    setActiveMode(mode);
    setError(null);
  }

  async function explainRun() {
    if (!onExplain) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setExplanation(null);

    try {
      const result = await onExplain(
        simulation.id,
      );

      setExplanation(result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not generate an AI explanation.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function troubleshootRun() {
    if (!onTroubleshoot) {
      return;
    }

    const trimmedDescription =
      problemDescription.trim();

    if (!trimmedDescription) {
      setError(
        "Describe the problem you want to investigate.",
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    setTroubleshootingResult(null);

    try {
      const result = await onTroubleshoot(
        simulation.id,
        trimmedDescription,
      );

      setTroubleshootingResult(result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not generate a troubleshooting analysis.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function generateReport() {
    if (!onGenerateReport) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setReport(null);

    try {
      const result =
        await onGenerateReport(
          simulation.id,
        );

      setReport(result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not generate the network analysis report.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function generateQuestion() {
    if (!onGenerateQuestion) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setQuestion(null);
    setAnswer("");
    setFeedback(null);

    try {
      const result =
        await onGenerateQuestion(
          simulation.id,
          practiceLevel,
        );

      setQuestion(result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not generate a practice question.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function evaluateAnswer() {
    if (
      !onEvaluateAnswer ||
      !question
    ) {
      return;
    }

    const trimmedAnswer = answer.trim();

    if (!trimmedAnswer) {
      setError(
        "Enter an answer before submitting.",
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    setFeedback(null);

    try {
      const result =
        await onEvaluateAnswer(
          simulation.id,
          question,
          trimmedAnswer,
        );

      setFeedback(result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not evaluate the answer.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section
      className={styles.panel}
      aria-labelledby={`ai-assistant-title-${simulation.id}`}
    >
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>
            AI Network Analysis Assistant
          </p>

          <h3
            id={`ai-assistant-title-${simulation.id}`}
          >
            Analyze this run
          </h3>

          <p className={styles.description}>
            Use the stored simulation as grounded
            context for explanation,
            troubleshooting, technical reporting
            and guided practice.
          </p>
        </div>

        <span className={styles.runBadge}>
          Run #{simulation.id}
        </span>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={
            activeMode === "explain"
              ? styles.primaryAction
              : undefined
          }
          onClick={() =>
            selectMode("explain")
          }
        >
          Explain
        </button>

        <button
          type="button"
          className={
            activeMode === "troubleshoot"
              ? styles.primaryAction
              : undefined
          }
          onClick={() =>
            selectMode("troubleshoot")
          }
        >
          Troubleshoot
        </button>

        <button
          type="button"
          className={
            activeMode === "report"
              ? styles.primaryAction
              : undefined
          }
          onClick={() =>
            selectMode("report")
          }
        >
          Generate report
        </button>

        <button
          type="button"
          className={
            activeMode === "questions"
              ? styles.primaryAction
              : undefined
          }
          onClick={() =>
            selectMode("questions")
          }
        >
          Practice questions
        </button>
      </div>

      {activeMode === "explain" && (
        <div className={styles.modePanel}>
          <p className={styles.modeDescription}>
            Generate a technical explanation based
            on the exact packets, sequence numbers,
            states and timing stored for this run.
          </p>

          <button
            type="button"
            className={styles.primaryAction}
            disabled={
              isLoading || !canExplain
            }
            onClick={() =>
              void explainRun()
            }
            title={
              canExplain
                ? undefined
                : "AI backend integration is pending."
            }
          >
            {isLoading
              ? "Explaining…"
              : "Explain this run"}
          </button>

          {!canExplain && (
            <p className={styles.pending}>
              AI backend integration is pending.
            </p>
          )}

          {explanation &&
            !isLoading && (
              <article
                className={styles.result}
                aria-live="polite"
              >
                <div
                  className={
                    styles.resultHeading
                  }
                >
                  <div>
                    <span>
                      AI explanation
                    </span>

                    <strong>
                      TCP Three-Way Handshake
                    </strong>
                  </div>

                  <span>
                    Based on Run #
                    {simulation.id}
                  </span>
                </div>

                <p>{explanation}</p>
              </article>
            )}
        </div>
      )}

      {activeMode === "troubleshoot" && (
        <div className={styles.modePanel}>
          <label className={styles.field}>
            <span>
              What problem are you investigating?
            </span>

            <textarea
              value={problemDescription}
              rows={4}
              maxLength={1000}
              placeholder="Example: Users report that connection establishment feels slow."
              onChange={(event) =>
                setProblemDescription(
                  event.target.value,
                )
              }
            />
          </label>

          <div
            className={
              styles.troubleshootFooter
            }
          >
            <span>
              {problemDescription.length}/1000
            </span>

            <button
              type="button"
              className={
                styles.primaryAction
              }
              disabled={
                isLoading ||
                !canTroubleshoot
              }
              onClick={() =>
                void troubleshootRun()
              }
              title={
                canTroubleshoot
                  ? undefined
                  : "AI backend integration is pending."
              }
            >
              {isLoading
                ? "Analyzing…"
                : "Analyze issue"}
            </button>
          </div>

          {!canTroubleshoot && (
            <p className={styles.pending}>
              Troubleshooting backend integration
              is pending.
            </p>
          )}

          {troubleshootingResult &&
            !isLoading && (
              <article
                className={styles.result}
                aria-live="polite"
              >
                <div
                  className={
                    styles.resultHeading
                  }
                >
                  <div>
                    <span>
                      Troubleshooting analysis
                    </span>

                    <strong>
                      Run #{simulation.id}
                    </strong>
                  </div>
                </div>

                <p>
                  {troubleshootingResult}
                </p>
              </article>
            )}
        </div>
      )}

      {activeMode === "report" && (
        <div className={styles.modePanel}>
          <p className={styles.modeDescription}>
            Generate a structured Network Analysis
            Report using the stored simulation as
            technical evidence.
          </p>

          <div className={styles.reportPreview}>
            <span>Report structure</span>

            <ol>
              <li>Analysis objective</li>
              <li>Simulation details</li>
              <li>Observed TCP handshake</li>
              <li>
                Sequence and acknowledgment analysis
              </li>
              <li>Timing analysis</li>
              <li>Technical interpretation</li>
              <li>Recommended checks</li>
              <li>Conclusion</li>
            </ol>
          </div>

          <button
            type="button"
            className={styles.primaryAction}
            disabled={
              isLoading ||
              !canGenerateReport
            }
            onClick={() =>
              void generateReport()
            }
            title={
              canGenerateReport
                ? undefined
                : "AI backend integration is pending."
            }
          >
            {isLoading
              ? "Generating report…"
              : "Generate network report"}
          </button>

          {!canGenerateReport && (
            <p className={styles.pending}>
              Report backend integration is pending.
            </p>
          )}

          {report && !isLoading && (
            <article
              className={`${styles.result} ${styles.reportResult}`}
              aria-live="polite"
            >
              <div
                className={
                  styles.resultHeading
                }
              >
                <div>
                  <span>
                    Network Analysis Report
                  </span>

                  <strong>
                    TCP Run #{simulation.id}
                  </strong>
                </div>
              </div>

              <div
                className={
                  styles.reportContent
                }
              >
                {report}
              </div>
            </article>
          )}
        </div>
      )}

      {activeMode === "questions" && (
        <div className={styles.modePanel}>
          <p className={styles.modeDescription}>
            Practice TCP concepts using the values
            and events from this stored simulation.
          </p>

          <label
            className={styles.practiceLevel}
          >
            <span>Practice level</span>

            <select
              value={practiceLevel}
              onChange={(event) =>
                setPracticeLevel(
                  event.target
                    .value as PracticeLevel,
                )
              }
            >
              <option value="beginner">
                Beginner
              </option>

              <option value="intermediate">
                Intermediate
              </option>

              <option value="interview">
                Interview
              </option>
            </select>
          </label>

          <button
            type="button"
            className={styles.primaryAction}
            disabled={
              isLoading ||
              !canGenerateQuestion
            }
            onClick={() =>
              void generateQuestion()
            }
            title={
              canGenerateQuestion
                ? undefined
                : "AI backend integration is pending."
            }
          >
            {isLoading
              ? "Generating question…"
              : question
                ? "Generate another question"
                : "Generate question"}
          </button>

          {!canGenerateQuestion && (
            <p className={styles.pending}>
              Practice backend integration is
              pending.
            </p>
          )}

          {question && (
            <div
              className={
                styles.questionCard
              }
            >
              <span>Question</span>

              <strong>{question}</strong>

              <label
                className={styles.field}
              >
                <span>Your answer</span>

                <textarea
                  value={answer}
                  rows={3}
                  maxLength={1000}
                  placeholder="Enter your answer..."
                  onChange={(event) =>
                    setAnswer(
                      event.target.value,
                    )
                  }
                />
              </label>

              <button
                type="button"
                className={
                  styles.primaryAction
                }
                disabled={
                  isLoading ||
                  !canEvaluateAnswer
                }
                onClick={() =>
                  void evaluateAnswer()
                }
              >
                {isLoading
                  ? "Checking answer…"
                  : "Check answer"}
              </button>

              {feedback &&
                !isLoading && (
                  <div
                    className={
                      styles.feedback
                    }
                    aria-live="polite"
                  >
                    <span>
                      AI feedback
                    </span>

                    <p>{feedback}</p>
                  </div>
                )}
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div
          className={styles.loading}
          role="status"
          aria-live="polite"
        >
          <strong>
            Analyzing the stored simulation…
          </strong>

          <span>
            Stored simulation data remains the
            source of truth.
          </span>
        </div>
      )}

      {error && (
        <div
          className={styles.error}
          role="alert"
        >
          <strong>
            AI analysis unavailable
          </strong>

          <span>{error}</span>
        </div>
      )}
    </section>
  );
}