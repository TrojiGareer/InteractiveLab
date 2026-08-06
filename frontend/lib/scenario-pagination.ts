export function getSkipAfterScenarioDeletion(
  skip: number,
  pageSize: number,
  itemCount: number,
): number {
  if (itemCount === 1 && skip > 0) {
    return Math.max(0, skip - pageSize);
  }

  return skip;
}
