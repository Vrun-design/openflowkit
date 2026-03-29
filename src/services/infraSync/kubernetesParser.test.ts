import { describe, it, expect } from 'vitest';
import { parseKubernetesManifests } from './kubernetesParser';

const DEPLOYMENT = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
`;

const SERVICE = `
apiVersion: v1
kind: Service
metadata:
  name: api-svc
  namespace: production
spec:
  selector:
    matchLabels:
      app: api
  type: ClusterIP
`;

const INGRESS = `
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: main-ingress
  namespace: production
spec:
  rules:
    - http:
        paths:
          - backend:
              service:
                name: api-svc
`;

const NAMESPACE = `
apiVersion: v1
kind: Namespace
metadata:
  name: staging
`;

const CONFIGMAP = `
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
`;

describe('parseKubernetesManifests', () => {
  it('parses a single Deployment into a [system] node', () => {
    const result = parseKubernetesManifests(DEPLOYMENT);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].nodeType).toBe('system');
    expect(result.nodes[0].resourceType).toBe('Deployment');
    expect(result.nodes[0].label).toBe('api-server');
    expect(result.provider).toBe('kubernetes');
  });

  it('parses an Ingress into a [browser] node', () => {
    const result = parseKubernetesManifests(INGRESS);
    expect(result.nodes[0].nodeType).toBe('browser');
  });

  it('parses a Namespace into a [section] node', () => {
    const result = parseKubernetesManifests(NAMESPACE);
    expect(result.nodes[0].nodeType).toBe('section');
  });

  it('skips ConfigMap manifests', () => {
    const result = parseKubernetesManifests(CONFIGMAP);
    expect(result.nodes).toHaveLength(0);
  });

  it('creates edge from Service to Deployment when selector labels match', () => {
    const input = `${DEPLOYMENT}\n---\n${SERVICE}`;
    const result = parseKubernetesManifests(input);
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    const svcNode = result.nodes.find((n) => n.resourceType === 'Service');
    const depNode = result.nodes.find((n) => n.resourceType === 'Deployment');
    expect(svcNode).toBeDefined();
    expect(depNode).toBeDefined();
    expect(result.edges[0].from).toBe(svcNode!.id);
    expect(result.edges[0].to).toBe(depNode!.id);
  });

  it('creates edge from Ingress to Service via backend service name', () => {
    const input = `${SERVICE}\n---\n${INGRESS}`;
    const result = parseKubernetesManifests(input);
    const ingressNode = result.nodes.find((n) => n.resourceType === 'Ingress');
    const svcNode = result.nodes.find((n) => n.resourceType === 'Service');
    expect(ingressNode).toBeDefined();
    expect(svcNode).toBeDefined();
    const edge = result.edges.find((e) => e.from === ingressNode!.id && e.to === svcNode!.id);
    expect(edge).toBeDefined();
  });

  it('strips Helm template syntax before parsing', () => {
    const helmDeployment = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.name }}
  namespace: {{ .Release.Namespace }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Values.name }}
  template:
    metadata:
      labels:
        app: {{ .Values.name }}
`;
    const result = parseKubernetesManifests(helmDeployment);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].resourceType).toBe('Deployment');
  });
});
