# Zotero Sync Plus

`obsidian-zotero-sync-plus` is an Obsidian community plugin for one-way Zotero → Obsidian integration.

Zotero is the source of truth. Obsidian markdown files are local representations. Version 1 never writes back to Zotero.

## Features

- Search Zotero items inside Obsidian.
- Insert citations at the cursor.
- Insert formatted bibliography when available, with a safe metadata fallback.
- Import Zotero child notes.
- Import PDF annotations when exposed by the configured Zotero data source.
- Create one markdown note per Zotero item.
- Map Zotero collection paths to Obsidian folders.
- Sync Zotero tags into markdown frontmatter using a configurable prefix.
- Preserve user-authored markdown body content.

## Recommended Zotero setup

For full sync, configure the Zotero Web API:

1. Create a Zotero API key from your Zotero account settings.
2. In plugin settings, choose `zoteroApi`.
3. Set library type (`user` or `group`).
4. Set library ID.
5. Paste the API key.
6. Use **Test Zotero Connection**.

The Zotero API is recommended because it exposes Zotero-specific metadata such as item keys, tags, collections, child notes, attachments, and annotation items.

## Optional Better BibTeX setup

Better BibTeX is optional. It is useful for stable citation keys and bibliography generation.

Default JSON-RPC endpoint:

```txt
http://localhost:23119/better-bibtex/json-rpc
```

The plugin uses Better BibTeX for:

- citekey lookup
- bibliography formatting when available
- optional local citation-related search/export support

The plugin does **not** require Better BibTeX for Zotero API metadata sync.

## Why Better CSL JSON is not enough

Better CSL JSON is citation/bibliography-oriented. It is not a reliable source for Zotero tags, collections, child notes, attachments, or PDF annotations.

For tag sync, collection folder sync, note import, and annotation import, use Zotero API or a full Zotero JSON export that actually contains those fields.

## Local export fallback

`localExport` mode reads a JSON file and detects capabilities defensively:

- citation metadata
- tags
- collections
- notes
- annotations

If tags are missing, tag sync is skipped and existing Zotero-prefixed tags are preserved. If collections are missing, collection folder sync is skipped and notes are created under the root output folder.

## Collection folder sync

Default root output folder: `Papers`.

Example Zotero collection path:

```txt
Diffusion / 360 Panorama
```

Markdown path:

```txt
Papers/Diffusion/360 Panorama/smith2024diffusion.md
```

If an item belongs to multiple collections, the first collection is used as the primary folder and all collection paths are stored in frontmatter. The plugin does not duplicate notes.

Existing notes are not moved unless **Move existing notes when Zotero collection changes** is enabled.

## Tag sync

Default tag prefix: `Zotero/`.

Example:

```txt
Zotero tag: diffusion model
Obsidian tag: Zotero/diffusion-model
```

Rules:

- Only tags with the configured Zotero prefix are replaced.
- Non-Zotero tags are preserved by default.
- If Zotero tags are unavailable, Zotero-prefixed tags are not removed.
- If Zotero tags are available and empty, Zotero-prefixed tags are removed because Zotero is the source of truth.

## Markdown safety

Created notes include managed sections:

```markdown
<!-- ZOTERO_SYNC_NOTES_START -->
<!-- ZOTERO_SYNC_NOTES_END -->

<!-- ZOTERO_SYNC_ANNOTATIONS_START -->
<!-- ZOTERO_SYNC_ANNOTATIONS_END -->
```

Frontmatter may be updated during sync. User-written markdown body content is never overwritten. Imported notes and annotations are updated only inside those explicit delimiters.

## Commands

- `Zotero Sync Plus: Sync Library`
- `Zotero Sync Plus: Sync Current Note`
- `Zotero Sync Plus: Rebuild Index`
- `Zotero Sync Plus: Search Zotero Items`
- `Zotero Sync Plus: Insert Citation`
- `Zotero Sync Plus: Insert Bibliography`
- `Zotero Sync Plus: Import Notes for Current Note`
- `Zotero Sync Plus: Import Annotations for Current Note`
- `Zotero Sync Plus: Test Zotero Connection`

## Settings

Settings cover:

- data source mode and Zotero API credentials
- local API and Better BibTeX endpoints
- local export JSON path
- output folders
- note creation/update/move behavior
- frontmatter field names
- tag prefix and tag preservation
- citation format
- auto-sync interval and startup sync
- capability indicator

## Limitations

- Local Zotero API and PDF annotation availability vary by Zotero version and local configuration.
- Obsidian `processFrontMatter` preserves unrelated fields but may reformat YAML comments/quoting.
- Local export mode depends on the selected JSON file containing the needed fields.
- v1 is one-way only and never modifies Zotero.

## Development

```bash
npm install
npm run build
npm test
```

Build output is bundled into `main.js` for Obsidian.
