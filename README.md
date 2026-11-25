# IRF Government Document Portal — Complete release

Static document editor for the Imperialist Robloxian Federation. No backend or build step is required. This consolidated release supersedes the earlier incremental ZIP packages. Upload this package only; no previous releases need to be merged.

## Templates

- Prime Minister's Decree
- Decree of Appointment
- Cabinet Minutes
- Cabinet Directive
- Federal Cabinet Proposal
- Imperial Bill

The Cabinet templates use artwork from the supplied Federal Cabinet agenda and Cabinet Clerk directive. The original signatures and meeting-specific details have not been imported. Meeting item headings, notes, times, proposal entries, and the clerk's name and signature are editable. The Cabinet cover page is included automatically. Cabinet Directive also supports an optional fortnightly ministry report addendum.

## Publish on GitHub Pages

1. Extract the ZIP and upload its contents to the root of your existing repository, preserving the `assets` folder.
2. Commit the changes. If Pages is not already enabled, select **Settings → Pages → Deploy from a branch**, then `main` and `/(root)`.
3. Open the deployed site. `index.html` is the entrance page; each card links to `editor.html?type=...`.

Use the hosted site to ensure the browser can fetch the separate scripts and artwork. Downloaded editable HTML documents are self-contained and can be reopened offline.

## Exports

The A4 preview shows the exact page divisions used for printing and PNG export. One page exports as a PNG; multiple pages export as a ZIP of individually numbered PNGs (1588 × 2246 pixels). Individual preview pages can also be downloaded. Use Print / Save PDF for a paginated PDF. For unusually long proposals, put detailed discussion in the meeting notes rather than a single table cell.

All editing and signature uploads are local to the browser. Use Save draft to store a named document in this browser, or download editable HTML as a portable backup. The portal does not include user accounts or shared storage.


## Cabinet cover pages

Cabinet Minutes and Cabinet Directive automatically include their front covers as the first A4 page in the preview, PDF output and PNG page exports.

## Prime Minister stamp

Select **Add PM stamp** in any template to include the transparent red Office of the Prime Minister seal in the signing block. Choose a size and horizontal position. Each template remembers its own stamp settings in saved HTML. The stamp is included in the A4 preview, print/PDF and individual PNG pages. It is off by default.

## Included features

- Government-branded entrance page, favicon and Home navigation.
- Six document templates with editable text, signatures and live A4 pagination.
- Mandatory original front covers for both Cabinet templates.
- Optional Prime Minister stamp, with size and position controls.
- Individual numbered PNG pages, ZIP export for multi-page documents, PDF printing and portable editable HTML.
- Separated HTML, CSS, JavaScript and local image assets.

A `.nojekyll` file is not required for this static site.

## Repair release

Upload all files together. This release uses fresh `editor-v7.js`, `styles-v7.css` and `portal-v7.css` filenames to avoid mixing cached releases. The exporter selects content by document type rather than relying on CSS visibility. Keep the `assets` directory. Old `editor.js`, `styles.css` and `portal.css` may be removed once the updated files are deployed.

## Editorial interface

The entrance page and editor use a warm ivory and deep green editorial palette. Controls are grouped in a sidebar, with export actions in the header. Screen-only sheet scaling keeps the A4 document geometry unchanged. Google Fonts supply Libre Baskerville and DM Sans when online; system and serif fallbacks are available offline.


## Latest UI adjustment

The Cabinet Minutes and Cabinet Directive cards on the entrance page have been given more vertical space and internal padding so their cover thumbnails do not feel cramped, especially on smaller screens.

## Legislative templates

Both use the original header artwork from the supplied PDFs, repeated on every A4 page. Federal Cabinet Proposal includes dates, contents, definitions, preface, sections, conclusion and signing fields. Imperial Bill includes introduction, editable articles and subarticles, comments, six signing positions and recurring author/date footers. The drafting checklist and guidance are editor-only and do not print. Both support signature uploads, stamps, separate PNG pages and portable HTML.


## Saved-document library (v7)

The editor's entire logo and document heading links back to the entrance page. To save a document:

1. Select any of the six templates.
2. Enter a draft name in the sidebar and select **Save draft** in the header.
3. Open the entrance page and select **Saved documents → Continue editing** to reopen it.
4. Select Save draft again to update the existing record. Change the draft name in the editor and save to rename it.

Drafts preserve editable content, added sections/rows, uploaded signatures, document and stamp settings, and the bill checklist. The library also supports deleting drafts with confirmation. Unsaved changes trigger the browser's normal navigation warning when supported. Saving is manual.

Storage uses IndexedDB, scoped to the website origin and repository path. The portal requires no login, server, or database service. Drafts remain available when reopening the same site in the same browser profile, but they do not sync between browsers, devices or users. Anyone with access to the same browser profile can access them. Private browsing, clearing site data or browser storage eviction may remove drafts. Keep a downloaded editable HTML backup for important documents.

Discord OAuth is not configured. Account-based, cross-device storage would require a backend or managed authentication and database service, with Discord secrets kept server-side and per-user access controls. Do not add a Discord client secret or database administrative key to a public GitHub Pages repository.

Upload all v7 files together, including `draft-store-v7.js` and `library-v7.js`.
