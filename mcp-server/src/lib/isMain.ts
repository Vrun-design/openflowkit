import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** True when the module at `url` is the script node was started with — also through npm's bin symlinks. */
export function isMain(url: string): boolean {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(url));
  } catch {
    return false;
  }
}
