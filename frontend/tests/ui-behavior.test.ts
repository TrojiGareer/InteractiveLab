import assert from "node:assert/strict";
import test from "node:test";

import { getSkipAfterScenarioDeletion } from "../lib/scenario-pagination.ts";
import { getNextTraceStep } from "../lib/trace-playback.ts";

test("replays each handshake step and stops at the final packet", () => {
  assert.equal(getNextTraceStep(0, 3), 1);
  assert.equal(getNextTraceStep(1, 3), 2);
  assert.equal(getNextTraceStep(2, 3), null);
  assert.equal(getNextTraceStep(0, 0), null);
});

test("moves to the previous scenario page after deleting its last item", () => {
  assert.equal(getSkipAfterScenarioDeletion(6, 6, 1), 0);
  assert.equal(getSkipAfterScenarioDeletion(12, 6, 1), 6);
  assert.equal(getSkipAfterScenarioDeletion(6, 6, 2), 6);
  assert.equal(getSkipAfterScenarioDeletion(0, 6, 1), 0);
});
