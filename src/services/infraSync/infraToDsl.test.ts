import { describe, it, expect } from 'vitest';
import { infraSyncResultToDsl } from './infraToDsl';
import type { InfraSyncResult } from './types';

function makeResult(overrides: Partial<InfraSyncResult> = {}): InfraSyncResult {
    return {
        nodes: [],
        edges: [],
        resourceCount: 0,
        provider: 'aws',
        lastParsed: Date.now(),
        ...overrides,
    };
}

describe('infraSyncResultToDsl', () => {
    it('renders nodes and edges as valid DSL', () => {
        const result = makeResult({
            nodes: [
                { id: 'lb_main', label: 'Main LB', nodeType: 'system', provider: 'aws', resourceType: 'aws_lb', resourceName: 'main' },
                { id: 'ec2_web', label: 'Web Server', nodeType: 'system', provider: 'aws', resourceType: 'aws_instance', resourceName: 'web' },
            ],
            edges: [{ from: 'lb_main', to: 'ec2_web' }],
        });
        const dsl = infraSyncResultToDsl(result);
        expect(dsl).toContain('[system] lb_main: Main LB');
        expect(dsl).toContain('[system] ec2_web: Web Server');
        expect(dsl).toContain('lb_main -> ec2_web');
    });

    it('renders infrastructure nodes as flat DSL nodes', () => {
        const result = makeResult({
            nodes: [
                { id: 'vpc_main', label: 'Production VPC', nodeType: 'architecture', provider: 'aws', resourceType: 'aws_vpc', resourceName: 'main' },
                { id: 'ec2_web', label: 'Web Server', nodeType: 'system', provider: 'aws', resourceType: 'aws_instance', resourceName: 'web' },
            ],
            edges: [{ from: 'vpc_main', to: 'ec2_web' }],
        });
        const dsl = infraSyncResultToDsl(result);
        expect(dsl).toContain('[architecture] vpc_main: Production VPC');
        expect(dsl).toContain('[system] ec2_web: Web Server');
        expect(dsl).toContain('vpc_main -> ec2_web');
    });

    it('renders edge labels with |label| syntax', () => {
        const result = makeResult({
            nodes: [
                { id: 'svc_web', label: 'web', nodeType: 'system', provider: 'docker-compose', resourceType: 'service', resourceName: 'web' },
                { id: 'svc_api', label: 'api', nodeType: 'system', provider: 'docker-compose', resourceType: 'service', resourceName: 'api' },
            ],
            edges: [{ from: 'svc_web', to: 'svc_api', label: 'depends_on' }],
        });
        const dsl = infraSyncResultToDsl(result);
        expect(dsl).toContain('svc_web -> svc_api |depends_on|');
    });

    it('sanitizes node IDs — replaces non-alphanumeric chars with underscore', () => {
        const result = makeResult({
            nodes: [
                { id: 'aws-instance.web', label: 'web', nodeType: 'system', provider: 'aws', resourceType: 'aws_instance', resourceName: 'web' },
            ],
            edges: [],
        });
        const dsl = infraSyncResultToDsl(result);
        expect(dsl).not.toContain('aws-instance.web');
        expect(dsl).toContain('aws_instance_web');
    });

    it('uses provided flow title', () => {
        const result = makeResult();
        const dsl = infraSyncResultToDsl(result, 'My Cloud');
        expect(dsl).toContain('flow: "My Cloud"');
    });
});
