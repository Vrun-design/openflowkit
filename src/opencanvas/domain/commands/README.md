# OpenCanvas Command Domain

Immutable, renderer-independent document mutations.

- every command carries explicit preconditions;
- stale commands fail instead of overwriting newer state;
- applying a command returns its exact inverse;
- collection insertion/removal retains the original index;
- batches validate atomically after all child operations and invert in reverse order;
- input and final documents pass canonical validation;
- commands never contain selection, renderer objects, timestamps, or side effects.

Nested batches are intentionally rejected to keep transaction boundaries and
history labels unambiguous.
