// The editor's half of the local pairing: long-poll the MCP server for op
// requests, run them against the live session, post the results back. Every op
// goes through the same registry the MCP server uses and commits through the
// session, so an agent edit is one undo step like any other edit.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BRIDGE_POLL_SECONDS, bridgeUrls, isBridgeRequest,
  type BridgeClientInfo, type BridgePageSummary, type BridgeRequest,
} from '../../../agent/bridge/protocol';
import { pageHolding, resolveAgentOpCommand } from '../../../agent/runAction';
import { commandTouchedRoots } from '../../application/ai/proposalSession';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1 } from '../../domain/document/types';
import type { OpCapabilities } from '../../../agent/ops/types';

export type V2BridgeStatus = 'off' | 'connecting' | 'connected' | 'error';

export interface V2AgentBridgeOptions {
  readonly enabled: boolean;
  readonly port: number;
  readonly token: string;
  readonly document: SceneDocumentV1 | null;
  readonly pageId: string | null;
  readonly revision: number;
  /** Capabilities the browser can honour (compile, syntax, icons, export, camera). */
  readonly capabilities: OpCapabilities;
  readonly commit: (command: DocumentCommand) => void;
  /** A document the reader cannot edit (a shared link, a repo map): a connected agent's change is refused, and told so. */
  readonly readOnly?: boolean;
  /** A page that stays as it is (a repo document's map page): a request addressed to it is refused, whichever page the reader is on. */
  readonly lockedPageId?: string | null;
  readonly onActivity: (message: string) => void;
  /** After an agent edit on the page in view, with the top-level nodes it added or changed (to bring them into view). */
  readonly onApplied?: (nodeIds: readonly string[]) => void;
}

export interface V2AgentBridge {
  readonly status: V2BridgeStatus;
  readonly detail: string;
  /** The last change the agent applied, as its undo label ("Style 2 shapes"); null before the first. */
  readonly activity: string | null;
}

export const TOKEN_REJECTED = 'The agent server did not accept this token. Copy the MCP configuration again and restart your MCP client.';

const RETRY_MS = 1500;

export function useV2AgentBridge(options: V2AgentBridgeOptions): V2AgentBridge {
  const [status, setStatus] = useState<V2BridgeStatus>('off');
  const [detail, setDetail] = useState('');
  const [activity, setActivity] = useState<string | null>(null);
  // The poll loop outlives renders; it reads the status it last set from here, not from its closure.
  const statusRef = useRef<V2BridgeStatus>('off');
  const show = useCallback((next: V2BridgeStatus, message?: string) => {
    statusRef.current = next;
    setStatus(next);
    if (message !== undefined) setDetail(message);
  }, []);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const { enabled, port, token } = options;

  const identity = JSON.stringify({ documentId: options.document?.id ?? null, revision: options.revision });
  const lastHelloRef = useRef(identity);
  const announceRef = useRef<(() => Promise<void>) | null>(null);

  const stop = useCallback(() => show('off', ''), [show]);

  useEffect(() => {
    if (!enabled) { stop(); return; }
    const controller = new AbortController();
    const urls = bridgeUrls(port);
    // The token rides in the query, not a header: a custom header makes every request a CORS preflight,
    // which a bridge server older than the editor cannot answer.
    const withToken = (url: string, params: Record<string, string> = {}): string => {
      const target = new URL(url);
      for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
      if (optionsRef.current.token) target.searchParams.set('token', optionsRef.current.token);
      return target.toString();
    };
    const post = (url: string, body: unknown): Promise<Response> =>
      fetch(withToken(url), { method: 'POST', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(body), signal: controller.signal });

    const hello = async (): Promise<void> => {
      const { document, pageId, revision } = optionsRef.current;
      if (!document) return;
      lastHelloRef.current = JSON.stringify({ documentId: document.id, revision });
      const info: BridgeClientInfo = {
        documentId: document.id, name: document.name, revision, pageId: pageId ?? document.pages[0]?.id ?? '',
        pages: document.pages.map<BridgePageSummary>((page) => ({
          pageId: page.id, name: page.name, nodes: page.nodes.length, connectors: page.connectors.length,
        })),
        app: 'openflowkit-editor',
      };
      const response = await post(urls.hello, { document: info });
      if (response.status === 401) throw new Error(TOKEN_REJECTED);
      if (!response.ok) throw new Error(`The agent bridge answered ${response.status}.`);
    };

    const runRequest = async (request: BridgeRequest): Promise<void> => {
      const { capabilities, commit, onActivity } = optionsRef.current;
      try {
        // The registry loads with the first request, so an editor that never pairs never downloads it.
        const { findAgentOp } = await import('../../../agent/ops');
        const op = findAgentOp(request.op);
        if (!op) throw new RangeError(`Unknown op "${request.op}".`);
        const document = optionsRef.current.document;
        if (!document) throw new Error('The editor has no document open.');
        // The page the op will run on (a named frame's own page), so the read-only check and the camera agree with it.
        const pageId = pageHolding({ document, pageId: request.pageId ?? optionsRef.current.pageId ?? document.pages[0]?.id ?? '', capabilities }, request.input);
        const outcome = await resolveAgentOpCommand(op, request.input, { document, pageId, capabilities });
        if (outcome.command && (optionsRef.current.readOnly || (optionsRef.current.lockedPageId ?? null) === pageId)) throw new Error('This document is read-only, so the editor did not apply the change.');
        if (outcome.command) {
          commit(outcome.command);
          setActivity(outcome.command.label);
          // Only an edit on the page in view moves the camera, so only that one pays for the diff.
          if (pageId === optionsRef.current.pageId && optionsRef.current.onApplied) {
            const touched = commandTouchedRoots(document, outcome.command, pageId);
            if (touched.length) optionsRef.current.onApplied(touched);
          }
        }
        onActivity(`${request.op} ran from the connected agent.`);
        await post(urls.result, { id: request.id, ok: true, output: outcome.output });
      } catch (error) {
        await post(urls.result, { id: request.id, ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    };

    const poll = async (): Promise<void> => {
      // Re-announce the document whenever it changed since the last hello so a
      // server that restarted (or missed a revision) still sees the truth.
      const current = JSON.stringify({ documentId: optionsRef.current.document?.id ?? null, revision: optionsRef.current.revision });
      if (lastHelloRef.current !== current) await hello();
      const response = await fetch(withToken(urls.next, { wait: String(BRIDGE_POLL_SECONDS) }), { signal: controller.signal });
      if (response.status === 204) return;
      if (response.status === 401) throw new Error(TOKEN_REJECTED);
      if (!response.ok) throw new Error(`The agent bridge answered ${response.status}.`);
      const payload: unknown = await response.json();
      if (isBridgeRequest(payload)) await runRequest(payload);
    };

    announceRef.current = () => hello().catch(() => undefined);
    void (async () => {
      while (!controller.signal.aborted) {
        try {
          // A retry leaves the error up until it succeeds; only the first attempt says "connecting".
          if (statusRef.current === 'off') show('connecting', `127.0.0.1:${port}`);
          await hello();
          show('connected');
          for (;;) {
            if (controller.signal.aborted) return;
            await poll();
          }
        } catch (error) {
          if (controller.signal.aborted) return;
          // fetch rejects with a TypeError when no server answers at all.
          const message = error instanceof TypeError ? `Nothing is listening on 127.0.0.1:${port}.`
            : error instanceof Error ? error.message : String(error);
          show('error', message);
          await new Promise((resolve) => window.setTimeout(resolve, RETRY_MS));
        }
      }
    })();

    return () => {
      controller.abort();
      announceRef.current = null;
      stop();
    };
    // Identity changes must NOT restart the loop (it would drop the socket on
    // every edit); hello() re-announces instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, port, token, stop]);

  // The bridge can start before the document has loaded (a reload with the agent still enabled). hello()
  // had nothing to send then, so tell the server the moment a document exists instead of at the next poll.
  const documentId = options.document?.id ?? null;
  useEffect(() => {
    if (documentId && lastHelloRef.current !== identity) void announceRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  return { status, detail, activity };
}
