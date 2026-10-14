import assert from "node:assert/strict";
import test from "node:test";

import {
  createProtocolParameterValues,
  validateProtocolParameterValues,
} from "../lib/protocol-parameters.ts";
import type { ProtocolDefinition } from "../types/protocol.ts";

const tcpProtocol: ProtocolDefinition = {
  id: "tcp",
  name: "TCP Three-Way Handshake",
  description: "A test TCP definition.",
  parameters: [
    {
      name: "latency_ms",
      label: "Network latency",
      data_type: "integer",
      default: 100,
      minimum: 0,
      maximum: 5000,
      unit: "ms",
      description: "Latency.",
    },
    {
      name: "client_initial_sequence",
      label: "Client initial sequence",
      data_type: "integer",
      default: 1000,
      minimum: 0,
      maximum: 4294967295,
      unit: null,
      description: "Client sequence.",
    },
  ],
};

test("builds editable defaults entirely from protocol metadata", () => {
  assert.deepEqual(createProtocolParameterValues(tcpProtocol), {
    latency_ms: "100",
    client_initial_sequence: "1000",
  });

  assert.deepEqual(
    createProtocolParameterValues(tcpProtocol, {
      latency_ms: 250,
      client_initial_sequence: 42,
    }),
    {
      latency_ms: "250",
      client_initial_sequence: "42",
    },
  );
});

test("validates integer and range constraints from protocol metadata", () => {
  assert.deepEqual(
    validateProtocolParameterValues(tcpProtocol, {
      latency_ms: "0",
      client_initial_sequence: "4294967295",
    }),
    {
      valid: true,
      values: {
        latency_ms: 0,
        client_initial_sequence: 4294967295,
      },
    },
  );

  assert.deepEqual(
    validateProtocolParameterValues(tcpProtocol, {
      latency_ms: "1.5",
      client_initial_sequence: "42",
    }),
    {
      valid: false,
      error: "Network latency must be a whole number.",
    },
  );

  assert.deepEqual(
    validateProtocolParameterValues(tcpProtocol, {
      latency_ms: "5001",
      client_initial_sequence: "42",
    }),
    {
      valid: false,
      error: "Network latency must be between 0 and 5000.",
    },
  );
});
