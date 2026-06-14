import { describe, expect, it } from 'vitest';
import { analyzeCodebase } from './codebaseAnalyzer';

describe('analyzeCodebase', () => {
  it('detects cloud platform, infra files, and common services from repo content', () => {
    const analysis = analyzeCodebase([
      {
        path: 'package.json',
        content: JSON.stringify({
          dependencies: {
            '@aws-sdk/client-s3': '^3.0.0',
            ioredis: '^5.0.0',
            pg: '^8.0.0',
          },
        }),
      },
      {
        path: 'src/index.ts',
        content: `
          import { S3Client } from "@aws-sdk/client-s3";
          import Redis from "ioredis";
          import { Client } from "pg";
        `,
      },
      {
        path: 'docker-compose.yml',
        content: `
          services:
            api:
              image: node:20
            redis:
              image: redis:7
        `,
      },
      {
        path: 'infra/main.tf',
        content: `
          provider "aws" {
            region = "us-east-1"
          }
        `,
      },
    ]);

    expect(analysis.cloudPlatform).toBe('mixed');
    expect(analysis.infraFiles).toEqual(['docker-compose.yml', 'infra/main.tf']);
    expect(analysis.detectedServices.map((service) => service.name)).toEqual(
      expect.arrayContaining(['Docker Compose', 'PostgreSQL', 'Redis', 'S3'])
    );
    expect(analysis.detectedServices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Redis',
          resourceType: 'service',
          suggestedColor: 'yellow',
        }),
        expect.objectContaining({
          name: 'S3',
          iconPackId: 'aws-official-starter-v1',
          iconShapeId: 'storage-simple-storage-service',
        }),
      ])
    );
    expect(analysis.summary).toContain('Detected platform: mixed');
    expect(analysis.summary).toContain('DETECTED SERVICES:');
    expect(analysis.summary).toContain('Redis [cache] via unknown -> service/yellow');
    expect(analysis.summary).toContain('S3 [storage] via aws -> service/emerald icon=aws-official-starter-v1:storage-simple-storage-service');
    expect(analysis.summary).toContain('INFRA FILES:');
  });

  it('maps broader aws and azure service aliases to provider-aware architecture hints', () => {
    const analysis = analyzeCodebase([
      {
        path: 'infra/main.tf',
        content: `
          resource "aws_cloudfront_distribution" "cdn" {}
          resource "aws_elasticache_replication_group" "cache" {}
          resource "aws_eks_cluster" "cluster" {}
          resource "azurerm_api_management" "gateway" {}
          resource "azurerm_servicebus_namespace" "bus" {}
        `,
      },
      {
        path: 'src/platform.ts',
        content: `
          const services = ['cloudfront', 'elasticache', 'eks', 'api management', 'service bus'];
          export default services;
        `,
      },
    ]);

    expect(analysis.detectedServices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'CloudFront',
          iconShapeId: 'networking-content-delivery-cloudfront',
        }),
        expect.objectContaining({
          name: 'ElastiCache',
          iconShapeId: 'databases-elasticache',
        }),
        expect.objectContaining({
          name: 'EKS',
          iconShapeId: 'containers-elastic-kubernetes-service',
        }),
        expect.objectContaining({
          name: 'Azure API Management',
          iconShapeId: 'web-api-management-services',
        }),
        expect.objectContaining({
          name: 'Azure Service Bus',
          iconShapeId: 'integration-azure-service-bus',
        }),
      ])
    );
  });
});
