import type { ProtocolDefinition } from "@/types/protocol";

export type ProtocolParameterValues = Record<string, string>;

export type ParameterValidationResult =
  | {
      valid: true;
      values: Record<string, number>;
    }
  | {
      valid: false;
      error: string;
    };

export function createProtocolParameterValues(
  protocol: ProtocolDefinition,
  savedValues: Record<string, number> = {},
): ProtocolParameterValues {
  return Object.fromEntries(
    protocol.parameters.map((parameter) => {
      const savedValue = savedValues[parameter.name];

      return [
        parameter.name,
        String(
          Number.isInteger(savedValue)
            ? savedValue
            : parameter.default,
        ),
      ];
    }),
  );
}

export function validateProtocolParameterValues(
  protocol: ProtocolDefinition,
  parameterValues: ProtocolParameterValues,
): ParameterValidationResult {
  const values: Record<string, number> = {};

  for (const parameter of protocol.parameters) {
    const rawValue = parameterValues[parameter.name] ?? "";
    const normalizedValue = rawValue.trim();

    if (!/^-?\d+$/.test(normalizedValue)) {
      return {
        valid: false,
        error: `${parameter.label} must be a whole number.`,
      };
    }

    const numericValue = Number(normalizedValue);

    if (!Number.isSafeInteger(numericValue)) {
      return {
        valid: false,
        error: `${parameter.label} must be a safe whole number.`,
      };
    }

    if (
      numericValue < parameter.minimum ||
      numericValue > parameter.maximum
    ) {
      return {
        valid: false,
        error:
          `${parameter.label} must be between ` +
          `${parameter.minimum} and ${parameter.maximum}.`,
      };
    }

    values[parameter.name] = numericValue;
  }

  return { valid: true, values };
}
