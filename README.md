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

1. Sign in to Zotero and open <https://www.zotero.org/settings/security>.
2. Under API keys, create a new private key for this plugin. Give it read access to the Zotero library you want to sync.
3. Copy the generated API key immediately; Zotero may not show the full key again later.
4. Find your Zotero library ID:
   - For a user library, use the numeric user/library ID shown in your Zotero settings/API key page.
   - For a group library, open the Zotero group page and use the numeric group ID from the group URL/settings.
5. In Obsidian, open **Settings → Zotero Sync Plus**.
6. Set **Data source mode** to `zoteroApi`.
7. Set **Zotero library type** to `user` or `group`.
8. Paste the **Zotero library ID** and **Zotero API key**.
9. Click **Test Zotero Connection** before running your first sync.

Do not commit or publish your personal API key. It belongs only in your local Obsidian plugin settings.

The Zotero API is recommended because it exposes Zotero-specific metadata such as item keys, tags, collections, child notes, attachments, and annotation items.

## Local Zotero API setup

If Web API sync feels slow, you can use Zotero Desktop's local API. Zotero Desktop must be running while you sync.

### Enable Zotero local API

In Zotero Desktop:

1. Open Zotero settings.
   - macOS: **Zotero → Settings…**
   - Windows/Linux: **Edit → Settings…**
2. Go to **Advanced**.
3. Enable the option that allows local app communication. The wording may vary by Zotero version, but it is usually similar to:

   ```txt
   Allow other applications on this computer to communicate with Zotero
   ```

   or:

   ```txt
   Enable local API / Enable HTTP server
   ```

4. Restart Zotero if the endpoint does not respond immediately.

### Find the local library ID

Do not guess the local library ID. Ask Zotero's local API which ID it accepts.

Run this in a terminal while Zotero Desktop is open:

```bash
curl -H 'Zotero-Allowed-Request: 1' \
  'http://127.0.0.1:23119/api/users/local/items/top?limit=1&format=json'
```

If Zotero replies with something like:

```txt
Only data for the logged-in user is available locally -- use userID 0 or 14633680
```

then your local user library ID is one of the values shown. Usually `0` works for local-only access, and the larger number is your Zotero account user ID. Test them:

```bash
curl -H 'Zotero-Allowed-Request: 1' \
  'http://127.0.0.1:23119/api/users/0/items/top?limit=1&format=json'

curl -H 'Zotero-Allowed-Request: 1' \
  'http://127.0.0.1:23119/api/users/YOUR_USER_ID/items/top?limit=1&format=json'
```

Use whichever returns JSON.

### Obsidian plugin settings for local API

In **Settings → Zotero Sync Plus**:

```txt
Data source mode: localApi
Zotero local API endpoint: http://127.0.0.1:23119/api
Zotero library type: user
Zotero library ID: 0
```

If `0` does not work, use the numeric user ID returned by the curl check.

Then click **Test Zotero Connection**.

### Common local API messages

- `No endpoint found`: you opened the root path, such as `http://127.0.0.1:23119/api`. This is not a real item endpoint. Use `/api/users/<id>/items/top`.
- `Request not allowed`: the request is missing Zotero's local API safety header. The plugin sends `Zotero-Allowed-Request: 1` automatically for `localhost` and `127.0.0.1`; browser address bars do not. Use the curl examples above for manual testing.
- `Local API is not enabled`: enable local app communication in Zotero Desktop settings.
- `Only data for the logged-in user is available locally -- use userID ...`: replace the plugin's library ID with `0` or the numeric user ID shown by Zotero.

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

## Releasing to GitHub and the Obsidian community plugin directory

Before submitting, review the official Obsidian guide: <https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin>.

Important naming note: the GitHub repository may be named `obsidian-zotero-sync-plus`, but Obsidian community plugin IDs cannot contain `obsidian`. This plugin therefore uses the manifest ID `zotero-sync-plus`. The `id` in `manifest.json` must exactly match the `id` you add to `community-plugins.json`.

Release checklist:

1. Confirm the repository root contains:
   - `README.md`
   - `LICENSE`
   - `manifest.json`
   - `versions.json`
2. Update `manifest.json` to the release version, for example `1.0.0`. Obsidian requires semantic versions in `x.y.z` format.
3. If `minAppVersion` changes, update `versions.json` with the plugin version and compatible Obsidian version.
4. Build the plugin:

   ```bash
   npm install
   npm test
   npm run build
   ```

5. Create a GitHub release whose tag exactly matches `manifest.json` `version`. For example, if the manifest version is `1.0.0`, use tag `1.0.0`, not `v1.0.0`.
6. Upload these release assets as individual files:
   - `main.js`
   - `manifest.json`
   - `styles.css` if you add one later
7. Fork <https://github.com/obsidianmd/obsidian-releases>.
8. Add an entry to the end of `community-plugins.json`:

   ```json
   {
     "id": "zotero-sync-plus",
     "name": "Zotero Sync Plus",
     "author": "raffin",
     "description": "One-way Zotero to Obsidian sync for papers, collections, tags, notes, annotations, citations, and bibliographies.",
     "repo": "YOUR-GITHUB-USERNAME/obsidian-zotero-sync-plus"
   }
   ```

9. Open a pull request titled `Add plugin: Zotero Sync Plus`. In the PR template, switch to **Preview**, choose **Community Plugin**, and complete the checklist.
10. Wait for the validation bot. If it adds **Validation failed**, fix the listed issues and update the same PR/release. If it adds **Ready for review**, wait for Obsidian team review.

After the plugin is accepted, future updates are distributed by creating new GitHub releases with tags matching the updated `manifest.json` version. You do not need to submit a new PR for every update.

## Development

```bash
npm install
npm run build
npm test
```

Build output is bundled into `main.js` for Obsidian.
