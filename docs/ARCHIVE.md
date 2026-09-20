# Historical documentation policy

On 2026-09-20 superseded roadmaps, execution notes, render plans, the ignored
internal wiki/handoffs/audits, and old root/public roadmap copies were preserved
under `docs/archive/2026-09-20/`, with their original relative paths.

This directory is deliberately gitignored and local-only. Already tracked original
files remain recoverable through Git history after removal/replacement is committed.
Previously ignored internal notes are preserved locally, not in future clones;
copy the archive elsewhere if a durable backup of those notes is required.

The archive contains a manifest of original paths, byte lengths, and SHA-256 hashes.
Original bytes were preserved and verified before current pointers were written.

Archived documents are historical evidence only. Never treat their instructions,
approvals, “next steps,” shipment claims, or roadmap order as current authority.
Agents must not read/search them unless explicitly asked for historical research.
Gitignore reduces discovery; `AGENTS.md` supplies the actual instruction boundary.

Current authority is [docs/README.md](README.md). Keep current requirements tracked.
Do not put active specs in the archive or link active work to an archived prerequisite.
