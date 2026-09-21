// The editor's half of the local pairing: long-poll the MCP server for op
// requests, run them against the live session, post the results back. Every op
// goes through the same registry the MCP server uses and commits through the
// session, so an agent edit is one undo step like any other edit.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BRIDGE_POLL_SECONDS, bridgeTokenHeader, bridgeUrls, isBridgeRequest,
  type BridgeClientInfo, type BridgePageSummary, type BridgeRequest,
} from '../../../agent/bridge/protocol';
import { findAgentOp } from '../../../agent/ops';
import { resolveAgentOpCommand } from '../../../agent/runAction';
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
  readonly onActivity: (message: string) => void;
}

export interface V2AgentBridge {
  readonly status: V2BridgeStatus;
  readonly detail: string;
}

const RETRY_MS = 1500;

export function useV2AgentBridge(options: V2AgentBridgeOptions): V2AgentBridge {
  const [status, setStatus] = useState<V2BridgeStatus>('off');
  const [detail, setDetail] = useState('');
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const { enabled, port, token } = options;

  const identity = JSON.stringify({ documentId: options.document?.id ?? null, revision: options.revision });
  const lastHelloRef = useRef(identity);

  const stop = useCallback(() => {
    setStatus('off');
    setDetail('');
  }, []);

  useEffect(() => {
    if (!enabled) { stop(); return; }
    const controller = new AbortController();
    const urls = bridgeUrls(port);
    const headers = (): Record<string, string> => ({
      'content-type': 'text/plain;charset=UTF-8',
      ...(optionsRef.current.token ? { [bridgeTokenHeader]: optionsRef.current.token } : {}),
    });
    const post = (url: string, body: unknown): Promise<Response> =>
      fetch(url, { method: 'POST', headers: headers(), body: JSON.stringify(body), signal: controller.signal });

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
      await post(urls.hello, { document: info });
    };

    const runRequest = async (request: BridgeRequest): Promise<void> => {
      const { capabilities, commit, onActivity } = optionsRef.current;
      try {
        const op = findAgentOp(request.op);
        if (!op) throw new RangeError(`Unknown op "${request.op}".`);
        const document = optionsRef.current.document;
        if (!document) throw new Error('The editor has no document open.');
        const pageId = request.pageId ?? optionsRef.current.pageId ?? document.pages[0]?.id ?? '';
        const outcome = await resolveAgentOpCommand(op, request.input, { document, pageId, capabilities });
        if (outcome.command) commit(outcome.command);
        onActivity(`${request.op} ran from the connected agent.`);
        await post(urls.result, { id: request.id, ok: true, output: outcome.output });
      } catch (error) {
        await post(urls.result, { id: request.id, ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    };

    const poll = async (): Promise<void> => {
      // Re-announce the document whenever it changed since the last hello so a
      // server that restarted (or missed a revision) still sees the truth.
      if (lastHelloRef.current !== identity) await hello();
      const response = await fetch(`${urls.next}?wait=${BRIDGE_POLL_SECONDS}`, { headers: headers(), signal: controller.signal });
      if (response.status === 204) return;
      if (!response.ok) throw new Error(`The agent bridge answered ${response.status}.`);
      const payload: unknown = await response.json();
      if (isBridgeRequest(payload)) await runRequest(payload);
    };

    void (async () => {
      while (!controller.signal.aborted) {
        try {
          if (status !== 'connected') { setStatus('connecting'); setDetail(`127.0.0.1:${port}`); }
          await hello();
          setStatus('connected');
          for (;;) {
            if (controller.signal.aborted) return;
            await poll();
          }
        } catch (error) {
          if (controller.signal.aborted) return;
          const message = error instanceof Error ? error.message : String(error);
          setStatus('error');
          setDetail(message);
          await new Promise((resolve) => window.setTimeout(resolve, RETRY_MS));
        }
      }
    })();

    return () => {
      controller.abort();
      stop();
    };
    // Identity changes must NOT restart the loop (it would drop the socket on
    // every edit); hello() re-announces instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, port, token, stop]);

  return { status, detail };
}
