import { describe, it, expect } from 'vitest';
import { parseTerraformState } from './terraformStateParser';

function makeTfState(resources: unknown[]): string {
  return JSON.stringify({ version: 4, resources });
}

function makeResource(type: string, name: string, attributes: Record<string, unknown> = {}) {
  return {
    type,
    name,
    provider: `provider["registry.terraform.io/hashicorp/aws"]`,
    instances: [{ attributes: { id: `${type}-${name}-id`, ...attributes } }],
  };
}

describe('parseTerraformState', () => {
  it('returns empty result for empty resources array', () => {
    const result = parseTerraformState(makeTfState([]));
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
    expect(result.resourceCount).toBe(0);
  });

  it('parses a single aws_instance into a [system] node', () => {
    const result = parseTerraformState(makeTfState([makeResource('aws_instance', 'web')]));
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].nodeType).toBe('system');
    expect(result.nodes[0].provider).toContain('aws');
    expect(result.provider).toBe('aws');
  });

  it('parses aws_lambda_function into a [process] node', () => {
    const result = parseTerraformState(
      makeTfState([makeResource('aws_lambda_function', 'handler')])
    );
    expect(result.nodes[0].nodeType).toBe('process');
  });

  it('uses tags.Name as label when present', () => {
    const resource = makeResource('aws_instance', 'web', { tags: { Name: 'My Web Server' } });
    const result = parseTerraformState(makeTfState([resource]));
    expect(result.nodes[0].label).toBe('My Web Server');
  });

  it('falls back to type+name label when no tags.Name', () => {
    const result = parseTerraformState(makeTfState([makeResource('aws_instance', 'app')]));
    expect(result.nodes[0].label).toContain('app');
  });

  it('parses aws_vpc into a [section] node', () => {
    const result = parseTerraformState(makeTfState([makeResource('aws_vpc', 'main')]));
    expect(result.nodes[0].nodeType).toBe('section');
  });

  it('creates edge from vpc to instance via vpc_id attribute', () => {
    const vpcId = 'vpc-abc123';
    const vpc = {
      type: 'aws_vpc',
      name: 'main',
      provider: 'provider["registry.terraform.io/hashicorp/aws"]',
      instances: [{ attributes: { id: vpcId } }],
    };
    const instance = {
      type: 'aws_instance',
      name: 'web',
      provider: 'provider["registry.terraform.io/hashicorp/aws"]',
      instances: [{ attributes: { id: 'i-123', vpc_id: vpcId } }],
    };
    const result = parseTerraformState(makeTfState([vpc, instance]));
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].from).toBe('aws_vpc_main');
    expect(result.edges[0].to).toBe('aws_instance_web');
  });

  it('skips aws_security_group resources', () => {
    const result = parseTerraformState(makeTfState([makeResource('aws_security_group', 'sg')]));
    expect(result.nodes).toHaveLength(0);
  });

  it('returns empty result for invalid JSON', () => {
    const result = parseTerraformState('not json');
    expect(result.nodes).toHaveLength(0);
  });

  it('detects mixed provider when aws and azure resources coexist', () => {
    const aws = makeResource('aws_instance', 'web');
    const azure = {
      type: 'azurerm_linux_virtual_machine',
      name: 'vm',
      provider: 'provider["registry.terraform.io/hashicorp/azurerm"]',
      instances: [{ attributes: { id: 'vm-id' } }],
    };
    const result = parseTerraformState(makeTfState([aws, azure]));
    expect(result.provider).toBe('mixed');
  });

  it('creates edge from depends_on references', () => {
    const vpc = makeResource('aws_vpc', 'main', { id: 'vpc-123' });
    const instance = {
      type: 'aws_instance',
      name: 'web',
      provider: 'provider["registry.terraform.io/hashicorp/aws"]',
      instances: [{ attributes: { id: 'i-789', vpc_id: 'vpc-123' } }],
    };
    const result = parseTerraformState(makeTfState([vpc, instance]));
    const edge = result.edges.find((e) => e.to === 'aws_instance_web');
    expect(edge).toBeDefined();
    expect(edge?.from).toBe('aws_vpc_main');
  });

  it('creates edge from subnet_id attribute', () => {
    const lb = {
      type: 'aws_lb',
      name: 'main',
      provider: 'provider["registry.terraform.io/hashicorp/aws"]',
      instances: [{ attributes: { id: 'arn:aws:elb:lb-123', vpc_id: 'vpc-abc' } }],
    };
    const target = {
      type: 'aws_lb_target_group',
      name: 'app',
      provider: 'provider["registry.terraform.io/hashicorp/aws"]',
      instances: [{ attributes: { id: 'tg-456', load_balancer_arn: 'arn:aws:elb:lb-123' } }],
    };
    const result = parseTerraformState(makeTfState([lb, target]));
    const edge = result.edges.find((e) => e.to === 'aws_lb_target_group_app');
    expect(edge).toBeDefined();
    expect(edge?.from).toBe('aws_lb_main');
  });
});
