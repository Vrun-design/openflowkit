import { useState, useCallback, useRef } from 'react';
import { parseTerraformState } from '@/services/infraSync/terraformStateParser';
import { parseKubernetesManifests } from '@/services/infraSync/kubernetesParser';
import { parseDockerCompose } from '@/services/infraSync/dockerComposeParser';
import { infraSyncResultToDsl } from '@/services/infraSync/infraToDsl';
import type { InfraFormat, InfraSyncResult } from '@/services/infraSync/types';

interface UseInfraSyncState {
    result: InfraSyncResult | null;
    dsl: string | null;
    isParsing: boolean;
    error: string | null;
}

interface UseInfraSyncReturn extends UseInfraSyncState {
    parse: (input: string, format: InfraFormat) => Promise<void>;
    refresh: () => Promise<void>;
    reset: () => void;
}

export function useInfraSync(onHclAnalysis?: (text: string) => Promise<void>): UseInfraSyncReturn {
    const [state, setState] = useState<UseInfraSyncState>({
        result: null,
        dsl: null,
        isParsing: false,
        error: null,
    });

    const lastInputRef = useRef<string | null>(null);
    const lastFormatRef = useRef<InfraFormat | null>(null);

    const parse = useCallback(
        async (input: string, format: InfraFormat): Promise<void> => {
            lastInputRef.current = input;
            lastFormatRef.current = format;

            setState((prev) => ({ ...prev, isParsing: true, error: null }));

            try {
                if (format === 'terraform-hcl') {
                    if (onHclAnalysis) {
                        await onHclAnalysis(input);
                    }
                    setState((prev) => ({ ...prev, isParsing: false }));
                    return;
                }

                let syncResult: InfraSyncResult;
                if (format === 'terraform-state') {
                    syncResult = parseTerraformState(input);
                } else if (format === 'kubernetes') {
                    syncResult = parseKubernetesManifests(input);
                } else {
                    syncResult = parseDockerCompose(input);
                }

                const dsl = infraSyncResultToDsl(syncResult);
                setState({ result: syncResult, dsl, isParsing: false, error: null });
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to parse infrastructure file';
                setState((prev) => ({ ...prev, isParsing: false, error: message }));
            }
        },
        [onHclAnalysis]
    );

    const refresh = useCallback(async (): Promise<void> => {
        if (lastInputRef.current && lastFormatRef.current) {
            await parse(lastInputRef.current, lastFormatRef.current);
        }
    }, [parse]);

    const reset = useCallback((): void => {
        lastInputRef.current = null;
        lastFormatRef.current = null;
        setState({ result: null, dsl: null, isParsing: false, error: null });
    }, []);

    return { ...state, parse, refresh, reset };
}
