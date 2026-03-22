export type InfraProvider = 'aws' | 'gcp' | 'azure' | 'kubernetes' | 'docker-compose' | 'mixed';
export type InfraFormat = 'terraform-state' | 'kubernetes' | 'docker-compose' | 'terraform-hcl';

export interface ParsedInfraNode {
    id: string;
    label: string;
    nodeType: string;
    provider: string;
    resourceType: string;
    resourceName: string;
}

export interface ParsedInfraEdge {
    from: string;
    to: string;
    label?: string;
}

export interface InfraSyncResult {
    nodes: ParsedInfraNode[];
    edges: ParsedInfraEdge[];
    resourceCount: number;
    provider: InfraProvider;
    lastParsed: number;
}
