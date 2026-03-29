import JSZip from 'jszip';

const MAX_ZIP_FILES = 1000;
const MAX_ZIP_SIZE = 50 * 1024 * 1024;

interface ExtractedFile {
  path: string;
  content: string;
}

export async function extractZipFiles(file: File): Promise<ExtractedFile[]> {
  if (file.size > MAX_ZIP_SIZE) {
    throw new Error(
      `Zip file is ${(file.size / 1024 / 1024).toFixed(0)}MB — max ${MAX_ZIP_SIZE / 1024 / 1024}MB.`
    );
  }

  const zip = await JSZip.loadAsync(file);
  const results: ExtractedFile[] = [];

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (results.length >= MAX_ZIP_FILES) break;
    if (path.startsWith('__MACOSX') || path.startsWith('.DS_Store')) continue;

    const content = await entry.async('string');
    results.push({ path, content });
  }

  return results;
}
