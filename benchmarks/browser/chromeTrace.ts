import fs from 'node:fs';
import path from 'node:path';
import type { CDPSession, Page } from '@playwright/test';

interface TracingCompleteEvent {
  stream?: string;
}

async function readTraceStream(session: CDPSession, stream: string): Promise<string> {
  const chunks: string[] = [];
  let endOfFile = false;

  while (!endOfFile) {
    const response = await session.send('IO.read', { handle: stream });
    chunks.push(response.data);
    endOfFile = response.eof ?? false;
  }

  await session.send('IO.close', { handle: stream });
  return chunks.join('');
}

export async function captureChromeTrace<T>(
  page: Page,
  outputPath: string,
  action: () => Promise<T>
): Promise<T> {
  const session = await page.context().newCDPSession(page);
  const tracingComplete = new Promise<TracingCompleteEvent>((resolve) => {
    session.once('Tracing.tracingComplete', resolve);
  });

  await session.send('Tracing.start', {
    categories: [
      'blink.user_timing',
      'devtools.timeline',
      'disabled-by-default-devtools.timeline.frame',
      'disabled-by-default-v8.cpu_profiler',
    ].join(','),
    options: 'sampling-frequency=10000',
    transferMode: 'ReturnAsStream',
  });

  let result: T | undefined;
  let actionError: unknown;
  let actionFailed = false;
  try {
    result = await action();
  } catch (error) {
    actionFailed = true;
    actionError = error;
  } finally {
    await session.send('Tracing.end');
  }

  const { stream } = await tracingComplete;
  if (!stream) {
    throw new Error('Chrome trace completed without a readable stream.');
  }
  const trace = await readTraceStream(session, stream);
  await session.detach();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, trace);
  if (actionFailed) {
    throw actionError;
  }
  return result as T;
}
