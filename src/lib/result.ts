export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function unwrapResult<T, E>(result: Result<T, E>, mapError: (error: E) => Error): T {
  if (result.ok === true) {
    return result.value;
  }

  throw mapError(result.error);
}
