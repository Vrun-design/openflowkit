# Contributing to OpenFlowKit

First off, thanks for taking the time to contribute! ❤️

All types of contributions are encouraged and valued. See the [Table of Contents](#table-of-contents) for different ways to help and details about how this project handles them. Please make sure to read the relevant section before making your contribution. It will make it a lot easier for us maintainers and smooth out the experience for all involved. The community looks forward to your contributions.

## Table of Contents

- [I Have a Question](#i-have-a-question)
- [I Want To Contribute](#i-want-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Code Contribution](#your-first-code-contribution)
- [Styleguides](#styleguides)
  - [Commit Messages](#commit-messages)

## I Have a Question

> If you want to ask a question, we assume that you have read the available [Documentation](https://openflowkit.com).

Before you ask a question, it is best to search for existing [Issues](https://github.com/Vrun-design/OpenFlowKit/issues) that might help you. In case you have found a suitable issue and still need clarification, you can write your question in this issue. It is also advisable to search the internet for answers first.

## I Want To Contribute

### Reporting Bugs

#### Before Submitting a Bug Report

A good bug report shouldn't leave others needing to chase you up for more information. Therefore, we ask you to investigate carefully, collect information and describe the issue in detail in your report. Please complete the following steps in advance to help us fix any potential bug as fast as possible.

- Make sure that you are using the latest version.
- Determine if your bug is really a bug and not an error on your side e.g. using incompatible environment components/versions.
- Collect information about the bug:
  - Stack trace (Traceback)
  - OS, Platform and Version (Windows, Linux, macOS, x86, ARM)
  - Version of the interpreter, compiler, SDK, runtime environment, package manager, depending on what seems relevant.
  - Possibly your input and the output
  - Can you reliably reproduce the issue? And can you also reproduce it with older versions?

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for OpenFlowKit, **including completely new features and minor improvements to existing functionality**. Following these guidelines will help maintainers and the community to understand your suggestion and find related suggestions.

### Your First Code Contribution

1.  **Fork the repository** on GitHub.
2.  **Clone the project** to your own machine.
3.  **Commit changes** to your own branch.
4.  **Push your work** back up to your fork.
5.  **Submit a Pull Request** so that we can review your changes.

NOTE: Be sure to merge the latest from "upstream" before making a pull request!

## Styleguides

### Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

---

## Developer Setup

```bash
# Install dependencies (also activates husky pre-commit hooks)
npm install

# Start dev server
npm run dev          # http://localhost:5173

# Run unit + integration tests (Vitest)
npm test

# Watch mode
npm run test:watch

# Run E2E tests (requires dev server already running)
npm run e2e

# Lint
npm run lint
```

### Pre-commit hooks

Husky runs `lint-staged` on every commit. It lints changed `.ts` / `.tsx` files with ESLint. Fix all errors before pushing — the CI gate runs the same check.

---

## Code Guidelines

- **TypeScript everywhere** — avoid `any`; if you must use it, add a comment explaining why.
- **React 19 Compiler** rules: `useMemo` / `useCallback` dependencies must be stable store references, not inline-constructed objects.
- **Component size**: aim for ≤ 250 lines per component. Larger components should be split along the layers described in [AGENTS.md](AGENTS.md).
- **No new runtime dependencies** without opening an issue and getting agreement first.

---

## Rollout Flags

Gate new features behind a flag in `src/config/rolloutFlags.ts`:

```ts
export type RolloutFlagKey = 'myFeature' | /* … */;

export const ROLLOUT_FLAGS = {
  myFeature: import.meta.env.VITE_ROLLOUT_MY_FEATURE === 'true',
};
```

Remove the flag and its dead branches once the feature is fully promoted.

---

## Storage Key Warning

Persistence keys (`flowmind_snapshots`, `flowmind-clipboard`, etc.) use a legacy prefix. **Do not rename them** without a migration path — renaming silently erases existing user browser data.

---

## Architecture Reference

Start with [AGENTS.md](AGENTS.md) for the layering and code rules, and [STATE.md](STATE.md) for what is done and what is next.
