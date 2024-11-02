function recursiveGenerateCombinations(
  arrays: string[][],
  index: number = 0,
  current: string[] = []
): string[][] {
  if (index === arrays.length) {
    return [current];
  }

  const currentArray = arrays[index].length === 0 ? [''] : arrays[index];

  const results: string[][] = [];
  for (const element of currentArray) {
    const combinations = recursiveGenerateCombinations(arrays, index + 1, [
      ...current,
      element,
    ]);
    results.push(...combinations);
  }

  return results;
}

export function generateCombinations(arrays: string[][]): string[] {
  return recursiveGenerateCombinations(arrays)
    .map((combination) => combination.join(''))
    .filter((combination) => combination !== '');
}
