# Verification — Zotero Sync Plus

This file records implementation verification evidence.

## Automated verification

- `npm install`: **passed**
  - Result: added 116 packages, audited 117 packages, 0 vulnerabilities.
- `npm test`: **passed**
  - Result: Vitest 1 file passed, 10 tests passed.
- `npm run build`: **passed**
  - Result: `tsc -noEmit -skipLibCheck` passed and esbuild produced `main.js`.

## Unit coverage added

- tag normalization
- filename/folder sanitization
- markdown marker replacement including malformed-marker safety
- frontmatter tag merge behavior
- Zotero API JSON normalization
- local export capability detection
- simple bibliography fallback

## Manual test checklist

- [ ] Configure Zotero Web API credentials and run **Test Zotero Connection**.
- [ ] Run **Sync Library** and confirm notes are created under `Papers`.
- [ ] Confirm `_zotero/index.json` is created.
- [ ] Confirm collection paths create folders only when collection capability is available.
- [ ] Confirm non-Zotero frontmatter tags are preserved.
- [ ] Confirm Zotero-prefixed tags are not removed when tags are unavailable.
- [ ] Use **Search Zotero Items** and open/create a note.
- [ ] Insert citation in Pandoc, LaTeX, and plain modes.
- [ ] Insert bibliography with Better BibTeX available and with fallback unavailable.
- [ ] Import Zotero notes and confirm only the notes marker block changes.
- [ ] Import PDF annotations and confirm only the annotations marker block changes.
- [ ] Confirm existing notes are not moved unless `moveExistingNotes` is enabled.

## Known limitations

- Live Zotero/Obsidian runtime tests were not run in this CLI session because they require a configured vault, Zotero library credentials, and optionally a running Zotero desktop instance.
- Local API and PDF annotation shapes can vary by Zotero version and configuration; unsupported shapes should produce warnings rather than crashes.
- Node tests cover pure utilities and normalization; full Obsidian runtime behavior requires manual vault testing.

## Post-deslop regression

- `npm test && npm run build`: **passed** after the cleanup pass.
- `grep -R "TODO\|FIXME\|placeholder" -n src tests README.md verify/VERIFY.md`: **no matches**.
