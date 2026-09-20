# V2 design-system implementation contract

Start with repository `docs/README.md`; design authority is `docs/v2/design-system.md`.
Read this module's README before adding or consuming primitives.

- This directory is presentation infrastructure for V2, not a document theme engine.
- Tokens and canvas/motion recipes remain pure TypeScript. They cannot import React,
  DOM APIs, stores, document records, legacy UI, Pixi, providers, or network clients.
- React components accept data and callbacks. No store access, provider calls,
  persistence, document commands, history writes, or global event listeners here.
- Import pure contracts directly from `tokens`, `canvasFeedback`, or `motion` in
  renderer adapters. Do not import the React barrel into domain/agent/renderer code.
- Use semantic roles, not palette literals, in features. Add a missing shared role
  with both themes and contrast coverage. Never locally override the brand color.
- Host resolves appearance and localization. Portals must carry SystemRoot tokens.
- Keep public props typed, forward button/input refs, preserve native semantics,
  and include focus/disabled/busy/error/RTL/reduced-motion behavior where applicable.
- Proposal UI does not enforce authorization or transaction safety. Commit service
  must validate scope, permission, revision, idempotency and inverses independently.
- New interactions require keyboard/touch paths, explicit cancellation, focus
  recovery, and no motion-induced delay to document commits.
- Every new component must have a real roadmap consumer. Do not build speculative
  catalogues or fork a second copy under a feature folder. The one review surface is
  `../V2LabPage.tsx` (`/_labs/v2`, `VITE_V2_LAB=1`); add each shipped primitive's
  states there so the owner can review them in both themes. It is not a consumer.
- Update implementation-status with exact shipped coverage and actual checks.
  Do not describe token tests or component screenshots as complete editor acceptance.
