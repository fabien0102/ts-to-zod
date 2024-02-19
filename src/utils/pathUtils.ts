import { normalize, parse, relative } from "path";

export function countNetParentDirectoriesInRelativePath(
  relativePath: string
): number {
  if (!relativePath) return 0;

  const segments = relativePath.split("/").slice(0, -1);

  let currentStreak = 0;
  let maxStreak = 0;
  let downCounter = 0;

  for (const segment of segments) {
    if (segment === "..") {
      if (downCounter > 0) {
        downCounter--;
      } else {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      }
    } else if (segment !== "." && segment !== "") {
      downCounter++;
    }
  }

  return maxStreak;
}

export function areRelativePathsEqualIgnoringExtension(
  path1: string,
  path2: string
): boolean {
  return relative(normalizePath(path1), normalizePath(path2)) === "";
}

const normalizePath = (path: string) => {
  const { dir, name } = parse(normalize(path));
  // Ensure directory path ends with a separator for consistency
  const dirWithSeparator = dir ? `${dir}/` : "";
  return `${dirWithSeparator}${name}`;
};
