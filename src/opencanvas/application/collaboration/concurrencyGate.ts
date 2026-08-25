import type { SceneDocumentV1 } from '../../domain/document/types';
import {
  replayCanonicalOperationLog,
  type CanonicalCollaborationOperation,
  type CanonicalOperationLogResult,
} from './canonicalOperationLog';

const MAX_EXHAUSTIVE_OPERATIONS = 7;

export interface CanonicalConcurrencyGateResult {
  readonly converged: boolean;
  readonly ordersEvaluated: number;
  readonly reference: CanonicalOperationLogResult;
  readonly divergentOrder: readonly string[] | null;
}

function resultSignature(result: CanonicalOperationLogResult): string {
  return JSON.stringify({
    document: result.document,
    appliedOperationIds: result.appliedOperationIds,
    rejected: result.rejected.map((item) => ({
      opId: item.operation.opId,
      reason: item.reason,
      message: item.message,
    })),
  });
}

function *permutations<T>(values: readonly T[]): Generator<readonly T[]> {
  if (values.length <= 1) {
    yield [...values];
    return;
  }
  for (const [index, value] of values.entries()) {
    const rest = [...values.slice(0, index), ...values.slice(index + 1)];
    for (const suffix of permutations(rest)) yield [value, ...suffix];
  }
}

export function evaluateCanonicalConcurrency(
  initialDocument: SceneDocumentV1,
  operations: readonly CanonicalCollaborationOperation[]
): CanonicalConcurrencyGateResult {
  if (operations.length > MAX_EXHAUSTIVE_OPERATIONS) {
    throw new RangeError(
      `Exhaustive concurrency gate supports at most ${MAX_EXHAUSTIVE_OPERATIONS} operations.`
    );
  }
  const reference = replayCanonicalOperationLog(initialDocument, operations);
  const expected = resultSignature(reference);
  let ordersEvaluated = 0;
  for (const order of permutations(operations)) {
    ordersEvaluated += 1;
    const candidate = replayCanonicalOperationLog(initialDocument, order);
    if (resultSignature(candidate) !== expected) {
      return {
        converged: false,
        ordersEvaluated,
        reference,
        divergentOrder: order.map((operation) => operation.opId),
      };
    }
  }
  return { converged: true, ordersEvaluated, reference, divergentOrder: null };
}
