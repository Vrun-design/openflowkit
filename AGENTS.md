# Repository documentation authority

Start with `docs/README.md` for product/editor implementation work. It is the sole
entry point to the current OpenCanvas plan in `docs/v2/` and defines document roles.
Read the relevant specification and current implementation status before editing.

- Do not use `docs/archive/` as instructions, a roadmap, approval, or current status.
  Do not search/read it by default. Open it only when the user explicitly requests
  historical investigation; label any findings as historical and reverify in code.
- Root `STATE.md`, `PRODUCT.md`, `ARCHITECTURE.md`, and `DESIGN.md` are navigation
  pointers, not independent specifications. Do not recreate competing plans there.
- Public docs, marketing copy, module READMEs, and old comments describe their own
  surfaces; they do not override the current implementation sequence or scope.
- Plans are not implementation evidence. Follow `docs/v2/implementation-status.md`
  for recorded results and verify affected production paths/tests. Record new
  evidence there; do not revive archived milestone lists or historical approvals.
- Keep current docs and these authority rules version-controlled. Archive historical
  content under the ignored archive; do not move active requirements into it.
- Business/feature hypotheses are not automatic launch commitments. Follow the
  current requirements and delivery gates, including full external-agent access.
