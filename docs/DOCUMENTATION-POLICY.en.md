# Documentation policy

[Versión en español (principal)](DOCUMENTATION-POLICY.md) | **English**

This policy makes this repository's human-authored documentation **Spanish-first** and also available in English, without changing the provenance of technical or generated artifacts.

## Language rule

- Every new or modified human-authored document is written in Spanish first.
- Each such document must have an English companion with the same basename and the `.en.md` suffix.
- `README.md` and `docs/README.md` are the Spanish primary entry points; their `.en.md` companions are the complete English entry points.
- Commands, API names, identifiers, code, paths, hashes and official links retain their technical original form.

## Translation boundaries

Do not translate or rewrite `AGENTS.md`, the immutable PRD package, generated evidence, snapshots, logs, reports, screenshots, synthetic fixtures, third-party/vendor material, attributions or licenses. These bytes carry provenance or operational instructions; the index should link them without editing them.

## Change checklist

1. Update the Spanish document and its English companion in the same change.
2. Keep relative links valid and state limitations or unexecuted evidence.
3. Review the diff to confirm that only authored documentation changed, not evidence, vendor or instruction files.

The documentation index is [`docs/README.md`](README.md), with its [English version](README.en.md).