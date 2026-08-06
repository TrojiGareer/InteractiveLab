export function getNextTraceStep(
  selectedStep: number,
  eventCount: number,
): number | null {
  if (
    eventCount === 0 ||
    selectedStep >= eventCount - 1
  ) {
    return null;
  }

  return selectedStep + 1;
}
