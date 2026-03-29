import { Database, Server, Cloud, Network } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface AIStudioExample {
  label: string;
  icon: LucideIcon;
  prompt: string;
}

export const EMPTY_CANVAS_EXAMPLES: AIStudioExample[] = [
  {
    label: 'Microservices architecture',
    icon: Server,
    prompt:
      'Generate a microservices architecture with API gateway, auth service, user service, order service, and a shared PostgreSQL database',
  },
  {
    label: 'AWS 3-tier webapp',
    icon: Cloud,
    prompt:
      'Generate a 3-tier AWS architecture with CloudFront, ALB, ECS Fargate, RDS PostgreSQL, and ElastiCache Redis',
  },
  {
    label: 'User auth flow',
    icon: Network,
    prompt:
      'Generate a user authentication flow showing login, registration, password reset, OAuth, and session management',
  },
  {
    label: 'CI/CD pipeline',
    icon: Database,
    prompt:
      'Generate a CI/CD pipeline with GitHub, build, test, staging deploy, approval gate, and production deploy stages',
  },
];

export const ITERATION_EXAMPLES: AIStudioExample[] = [
  { label: 'Database', icon: Database, prompt: 'Add a PostgreSQL database to the architecture' },
  { label: 'Server', icon: Server, prompt: 'Add a backend Node.js server service' },
  { label: 'Deploy to AWS', icon: Cloud, prompt: 'Deploy the main application to AWS' },
];

export const EXAMPLE_ICON_COLORS = [
  'text-orange-500',
  'text-blue-500',
  'text-amber-500',
  'text-indigo-500',
  'text-teal-500',
  'text-rose-500',
];
