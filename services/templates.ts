import { Node, Edge } from 'reactflow';
import { NodeType } from '../types';
import { createDefaultEdge } from '../constants';
import {
  Layout, Database, Shield, Server, Mail, AlertTriangle, Play, FileText, CheckCircle,
  CreditCard, Globe, Cpu, Truck, Package, GitBranch, GitMerge, Terminal, Code,
  MessageSquare, LifeBuoy, ShoppingCart, User, Image as ImageIcon, ThumbsUp, ThumbsDown,
  Layers, Lock, Zap, Box, Activity, GitCommit, Search, Rocket
} from 'lucide-react';

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  icon: any; // Lucide icon
  msg: string;
  nodes: Node[];
  edges: Edge[];
}


export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: 'saas-onboarding',
    name: 'SaaS Subscription Flow',
    description: 'Complete user journey from signup to payment and provisioning.',
    icon: CreditCard,
    msg: 'SaaS Flow',
    nodes: [
      { id: 't-saas-1', type: NodeType.START, position: { x: 0, y: 0 }, data: { label: 'User Signup', subLabel: 'Form Submit', icon: 'User', color: 'blue' } },
      { id: 't-saas-2', type: NodeType.DECISION, position: { x: 0, y: 150 }, data: { label: 'Select Plan', subLabel: 'Free vs Pro', icon: 'Layers', color: 'amber' } },
      { id: 't-saas-3', type: NodeType.PROCESS, position: { x: -200, y: 300 }, data: { label: 'Free Tier', subLabel: 'Limited Features', icon: 'Box', color: 'slate' } },
      { id: 't-saas-4', type: NodeType.PROCESS, position: { x: 200, y: 300 }, data: { label: 'Pro Tier', subLabel: 'Payment Process', icon: 'CreditCard', color: 'emerald' } },
      { id: 't-saas-5', type: NodeType.PROCESS, position: { x: 200, y: 450 }, data: { label: 'Gateway Charge', subLabel: 'Stripe/PayPal', icon: 'DollarSign', color: 'emerald' } },
      { id: 't-saas-6', type: NodeType.PROCESS, position: { x: 0, y: 600 }, data: { label: 'Provision Org', subLabel: 'Create DB Shard', icon: 'Database', color: 'violet' } },
      { id: 't-saas-7', type: NodeType.END, position: { x: 0, y: 750 }, data: { label: 'Welcome Email', subLabel: 'Send Magic Link', icon: 'Mail', color: 'blue' } },
    ],
    edges: [
      createDefaultEdge('t-saas-1', 't-saas-2'),
      createDefaultEdge('t-saas-2', 't-saas-3', 'Free'),
      createDefaultEdge('t-saas-2', 't-saas-4', 'Pro'),
      createDefaultEdge('t-saas-4', 't-saas-5'),
      createDefaultEdge('t-saas-3', 't-saas-6'),
      createDefaultEdge('t-saas-5', 't-saas-6'),
      createDefaultEdge('t-saas-6', 't-saas-7'),
    ]
  },
  {
    id: 'ecommerce-fulfillment',
    name: 'E-commerce Fulfillment',
    description: 'Order processing, inventory check, packing and shipping logic.',
    icon: ShoppingCart,
    msg: 'E-com Flow',
    nodes: [
      { id: 't-ecom-1', type: NodeType.START, position: { x: 0, y: 0 }, data: { label: 'Order Placed', subLabel: 'Checkout Success', icon: 'ShoppingCart', color: 'emerald' } },
      { id: 't-ecom-2', type: NodeType.PROCESS, position: { x: 0, y: 150 }, data: { label: 'Check Inventory', subLabel: 'Query Warehouse', icon: 'Box', color: 'slate' } },
      { id: 't-ecom-3', type: NodeType.DECISION, position: { x: 0, y: 300 }, data: { label: 'In Stock?', subLabel: 'Available?', icon: 'Activity', color: 'amber' } },
      { id: 't-ecom-4', type: NodeType.PROCESS, position: { x: 200, y: 450 }, data: { label: 'Pick & Pack', subLabel: 'Warehouse Ops', icon: 'Package', color: 'blue' } },
      { id: 't-ecom-5', type: NodeType.PROCESS, position: { x: 200, y: 600 }, data: { label: 'Ship Order', subLabel: 'Generate Label', icon: 'Truck', color: 'violet' } },
      { id: 't-ecom-6', type: NodeType.END, position: { x: -200, y: 450 }, data: { label: 'Backorder', subLabel: 'Notify User', icon: 'AlertTriangle', color: 'red' } },
      { id: 't-ecom-7', type: NodeType.END, position: { x: 200, y: 750 }, data: { label: 'Delivered', subLabel: 'Update Status', icon: 'CheckCircle', color: 'green' } },
    ],
    edges: [
      createDefaultEdge('t-ecom-1', 't-ecom-2'),
      createDefaultEdge('t-ecom-2', 't-ecom-3'),
      createDefaultEdge('t-ecom-3', 't-ecom-4', 'Yes'),
      createDefaultEdge('t-ecom-3', 't-ecom-6', 'No'),
      createDefaultEdge('t-ecom-4', 't-ecom-5'),
      createDefaultEdge('t-ecom-5', 't-ecom-7'),
    ]
  },
  {
    id: 'ai-moderation',
    name: 'AI Content Moderation',
    description: 'Automated text/image scanning with manual review fallback.',
    icon: Cpu,
    msg: 'AI Mod Flow',
    nodes: [
      { id: 't-ai-1', type: NodeType.START, position: { x: 0, y: 0 }, data: { label: 'User Post', subLabel: 'Upload Content', icon: 'User', color: 'blue' } },
      { id: 't-ai-2', type: NodeType.PROCESS, position: { x: -150, y: 150 }, data: { label: 'Text Analysis', subLabel: 'NLP Service', icon: 'FileText', color: 'violet' } },
      { id: 't-ai-3', type: NodeType.PROCESS, position: { x: 150, y: 150 }, data: { label: 'Image Scan', subLabel: 'Computer Vision', icon: 'ImageIcon', color: 'fuchsia' } },
      { id: 't-ai-4', type: NodeType.DECISION, position: { x: 0, y: 300 }, data: { label: 'Risk Score?', subLabel: '> 0.8 Threshold', icon: 'Activity', color: 'amber' } },
      { id: 't-ai-5', type: NodeType.END, position: { x: -200, y: 450 }, data: { label: 'Auto-Block', subLabel: 'Violation Found', icon: 'Shield', color: 'red' } },
      { id: 't-ai-6', type: NodeType.DECISION, position: { x: 200, y: 450 }, data: { label: 'Unsure?', subLabel: '0.3 < Score < 0.8', icon: 'HelpCircle', color: 'slate' } },
      { id: 't-ai-7', type: NodeType.PROCESS, position: { x: 100, y: 600 }, data: { label: 'Manual Review', subLabel: 'Human Queue', icon: 'User', color: 'orange' } },
      { id: 't-ai-8', type: NodeType.END, position: { x: 350, y: 600 }, data: { label: 'Publish', subLabel: 'Safe Content', icon: 'CheckCircle', color: 'green' } },
    ],
    edges: [
      createDefaultEdge('t-ai-1', 't-ai-2'),
      createDefaultEdge('t-ai-1', 't-ai-3'),
      createDefaultEdge('t-ai-2', 't-ai-4'),
      createDefaultEdge('t-ai-3', 't-ai-4'),
      createDefaultEdge('t-ai-4', 't-ai-5', 'High Risk'),
      createDefaultEdge('t-ai-4', 't-ai-6', 'Low Risk'),
      createDefaultEdge('t-ai-6', 't-ai-7', 'Medium'),
      createDefaultEdge('t-ai-6', 't-ai-8', 'Low'),
    ]
  },
  {
    id: 'support-triage',
    name: 'Smart Support System',
    description: 'Ticket routing based on AI intent classification.',
    icon: LifeBuoy,
    msg: 'Support Flow',
    nodes: [
      { id: 't-sup-1', type: NodeType.START, position: { x: 0, y: 0 }, data: { label: 'New Ticket', subLabel: 'Customer Issue', icon: 'LifeBuoy', color: 'blue' } },
      { id: 't-sup-2', type: NodeType.PROCESS, position: { x: 0, y: 150 }, data: { label: 'Analyze Intent', subLabel: 'Classifier Model', icon: 'Cpu', color: 'violet' } },
      { id: 't-sup-3', type: NodeType.DECISION, position: { x: 0, y: 300 }, data: { label: 'Category?', subLabel: 'Route Issue', icon: 'GitBranch', color: 'amber' } },
      { id: 't-sup-4', type: NodeType.PROCESS, position: { x: -300, y: 450 }, data: { label: 'Billing Dept', subLabel: 'Payment Issues', icon: 'CreditCard', color: 'emerald' } },
      { id: 't-sup-5', type: NodeType.PROCESS, position: { x: 0, y: 450 }, data: { label: 'Tech Support', subLabel: 'Bug Reports', icon: 'Terminal', color: 'slate' } },
      { id: 't-sup-6', type: NodeType.PROCESS, position: { x: 300, y: 450 }, data: { label: 'General Inquiry', subLabel: 'Auto-FAQ', icon: 'MessageSquare', color: 'blue' } },
      { id: 't-sup-7', type: NodeType.END, position: { x: 0, y: 600 }, data: { label: 'Resolve', subLabel: 'Close Ticket', icon: 'CheckCircle', color: 'green' } },
    ],
    edges: [
      createDefaultEdge('t-sup-1', 't-sup-2'),
      createDefaultEdge('t-sup-2', 't-sup-3'),
      createDefaultEdge('t-sup-3', 't-sup-4', 'Billing'),
      createDefaultEdge('t-sup-3', 't-sup-5', 'Technical'),
      createDefaultEdge('t-sup-3', 't-sup-6', 'Other'),
      createDefaultEdge('t-sup-4', 't-sup-7'),
      createDefaultEdge('t-sup-5', 't-sup-7'),
      createDefaultEdge('t-sup-6', 't-sup-7'),
    ]
  },
  {
    id: 'cicd-pipeline',
    name: 'CI/CD DevOps Pipeline',
    description: 'Code delivery from Git push to Production deployment.',
    icon: Rocket,
    msg: 'CI/CD Flow',
    nodes: [
      { id: 't-cicd-1', type: NodeType.START, position: { x: 0, y: 0 }, data: { label: 'Git Push', subLabel: 'Branch: main', icon: 'GitBranch', color: 'slate' } },
      { id: 't-cicd-2', type: NodeType.PROCESS, position: { x: 0, y: 150 }, data: { label: 'Unit Tests', subLabel: 'Jest / Vitest', icon: 'CheckCircle', color: 'blue' } },
      { id: 't-cicd-3', type: NodeType.DECISION, position: { x: 0, y: 300 }, data: { label: 'Passed?', subLabel: 'Test Results', icon: 'Activity', color: 'amber' } },
      { id: 't-cicd-4', type: NodeType.PROCESS, position: { x: 200, y: 400 }, data: { label: 'Docker Build', subLabel: 'Create Image', icon: 'Box', color: 'blue' } },
      { id: 't-cicd-5', type: NodeType.PROCESS, position: { x: 200, y: 550 }, data: { label: 'Deploy Stage', subLabel: 'K8s Cluster', icon: 'Server', color: 'violet' } },
      { id: 't-cicd-6', type: NodeType.PROCESS, position: { x: 200, y: 700 }, data: { label: 'E2E Tests', subLabel: 'Cypress / Playwright', icon: 'Zap', color: 'fuchsia' } },
      { id: 't-cicd-7', type: NodeType.END, position: { x: 200, y: 850 }, data: { label: 'Promote Prod', subLabel: 'Release v1.x', icon: 'Globe', color: 'green' } },
      { id: 't-cicd-8', type: NodeType.END, position: { x: -250, y: 400 }, data: { label: 'Notify Failure', subLabel: 'Slack Alert', icon: 'AlertTriangle', color: 'red' } },
    ],
    edges: [
      createDefaultEdge('t-cicd-1', 't-cicd-2'),
      createDefaultEdge('t-cicd-2', 't-cicd-3'),
      createDefaultEdge('t-cicd-3', 't-cicd-4', 'Yes'),
      createDefaultEdge('t-cicd-3', 't-cicd-8', 'No'),
      createDefaultEdge('t-cicd-4', 't-cicd-5'),
      createDefaultEdge('t-cicd-5', 't-cicd-6'),
      createDefaultEdge('t-cicd-6', 't-cicd-7'),
    ]
  }
];
