import { createId } from '@/lib/id';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { DiagramPlugin } from '@/diagram-types/core';

interface JourneyStepRecord {
  section: string;
  task: string;
  actor?: string;
  score?: number;
  lineNumber: number;
}

const SECTION_X_GAP = 320;
const STEP_Y_GAP = 150;

function normalizeScore(input: string): number | null {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  if (rounded < 0 || rounded > 5) return null;
  return rounded;
}

function getJourneyScoreColor(score: number | undefined): string {
  if (typeof score !== 'number') return 'slate';
  if (score >= 4) return 'emerald';
  if (score === 3) return 'amber';
  if (score === 2) return 'orange';
  return 'red';
}

interface ParsedJourneyStep {
  task: string;
  actor?: string;
  score?: number;
  scoreMalformed: boolean;
}

function parseJourneyStep(line: string): ParsedJourneyStep | null {
  const parts = line.split(':').map((item) => item.trim());
  if (parts.length === 0) return null;

  const task = parts[0];
  if (!task) return null;

  if (parts.length === 1) {
    return { task, scoreMalformed: false };
  }

  if (parts.length === 2) {
    const score = normalizeScore(parts[1]);
    if (score === null) {
      return { task, scoreMalformed: true };
    }
    return { task, score, scoreMalformed: false };
  }

  const score = normalizeScore(parts[1]);
  if (score === null) {
    return {
      task,
      actor: parts.slice(2).join(':').trim() || undefined,
      scoreMalformed: true,
    };
  }
  return {
    task,
    score,
    actor: parts.slice(2).join(':').trim() || undefined,
    scoreMalformed: false,
  };
}

function parseJourney(input: string): { nodes: FlowNode[]; edges: FlowEdge[]; error?: string; diagnostics?: string[] } {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const diagnostics: string[] = [];
  const steps: JourneyStepRecord[] = [];

  let hasHeader = false;
  let currentSection = 'General';

  for (const [index, rawLine] of lines.entries()) {
    const lineNumber = index + 1;
    const line = rawLine.trim();
    if (!line || line.startsWith('%%')) continue;

    if (/^journey\b/i.test(line)) {
      hasHeader = true;
      continue;
    }
    if (!hasHeader) continue;

    if (/^title\s+/i.test(line)) {
      continue;
    }

    if (/^section\b/i.test(line) && !/^section\s+.+$/i.test(line)) {
      diagnostics.push(`Invalid journey section syntax at line ${lineNumber}: "${line}"`);
      continue;
    }

    const sectionMatch = line.match(/^section\s+(.+)$/i);
    if (sectionMatch) {
      const sectionName = sectionMatch[1].trim();
      if (!sectionName) {
        diagnostics.push(`Invalid journey section syntax at line ${lineNumber}: "${line}"`);
        continue;
      }
      currentSection = sectionName;
      continue;
    }

    const parsedStep = parseJourneyStep(line);
    if (!parsedStep) {
      diagnostics.push(`Invalid journey step syntax at line ${lineNumber}: "${line}" (expected "Task", "Task: Score", or "Task: Score: Actor")`);
      continue;
    }
    if (parsedStep.scoreMalformed) {
      diagnostics.push(`Invalid journey score at line ${lineNumber}: "${line}" (expected 0-5)`);
      continue;
    }

    steps.push({
      section: currentSection,
      task: parsedStep.task,
      actor: parsedStep.actor,
      score: parsedStep.score,
      lineNumber,
    });
  }

  if (!hasHeader) {
    return {
      nodes: [],
      edges: [],
      error: 'Missing journey header.',
    };
  }

  if (steps.length === 0) {
    return {
      nodes: [],
      edges: [],
      error: 'No valid journey steps found.',
    };
  }

  const sectionOrder: string[] = [];
  const sectionIndexByName = new Map<string, number>();
  const stepOffsetBySection = new Map<string, number>();

  const nodes: FlowNode[] = steps.map((step, index) => {
    if (!sectionIndexByName.has(step.section)) {
      sectionIndexByName.set(step.section, sectionOrder.length);
      sectionOrder.push(step.section);
    }
    const sectionIndex = sectionIndexByName.get(step.section)!;
    const stepOffset = stepOffsetBySection.get(step.section) ?? 0;
    stepOffsetBySection.set(step.section, stepOffset + 1);

    return {
      id: `journey-${index + 1}`,
      type: 'journey',
      position: {
        x: sectionIndex * SECTION_X_GAP,
        y: stepOffset * STEP_Y_GAP,
      },
      data: {
        label: step.task,
        subLabel: step.actor,
        color: getJourneyScoreColor(step.score),
        shape: 'rounded',
        journeySection: step.section,
        journeyTask: step.task,
        journeyActor: step.actor,
        journeyScore: step.score,
      },
    };
  });

  const edges: FlowEdge[] = [];
  const lastNodeIdBySection = new Map<string, string>();
  nodes.forEach((node) => {
    const section = node.data.journeySection || 'General';
    const previousNodeId = lastNodeIdBySection.get(section);
    if (previousNodeId) {
      edges.push({
        id: createId(`e-journey-${previousNodeId}-${node.id}`),
        source: previousNodeId,
        target: node.id,
        type: 'smoothstep',
      });
    }
    lastNodeIdBySection.set(section, node.id);
  });

  return diagnostics.length > 0 ? { nodes, edges, diagnostics } : { nodes, edges };
}

export const JOURNEY_PLUGIN: DiagramPlugin = {
  id: 'journey',
  displayName: 'Journey',
  parseMermaid: parseJourney,
};
