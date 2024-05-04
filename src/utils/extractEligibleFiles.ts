import { readdirSync } from "fs-extra";

/**
 * Extracts all `.ts` files from a folder and its subfolders.
 * @param rootFolderPath the path of the folder to extract the files from
 * @returns a list of `.ts` files
 */
export function extractEligibleFiles(rootFolderPath: string) {
  const dirContent = readdirSync(rootFolderPath, { withFileTypes: true });
  const tsFiles = dirContent
    .filter((file) => file.isFile() && file.name.endsWith(".ts"))
    .map((file) => file.name);

  const folders = dirContent.filter((file) => file.isDirectory());
  folders.forEach((folder) => {
    const folderTsFiles = extractEligibleFiles(
      `${rootFolderPath}/${folder.name}`
    ).map((file) => `${folder.name}/${file}`);

    tsFiles.push(...folderTsFiles);
  });

  return tsFiles;
}
