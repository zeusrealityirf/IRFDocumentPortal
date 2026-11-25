# IRF Government Document Portal — Complete release

Static document editor for the Imperialist Robloxian Federation. No backend or build step is required. This consolidated release supersedes the earlier incremental ZIP packages. Upload this package only; no previous releases need to be merged.

## Templates

- Prime Minister's Decree
- Decree of Appointment
- Cabinet Minutes
- Cabinet Directive

The Cabinet templates use artwork from the supplied Federal Cabinet agenda and Cabinet Clerk directive. The original signatures and meeting-specific details have not been imported. Meeting item headings, notes, times, proposal entries, and the clerk's name and signature are editable. The Cabinet cover page is included automatically. Cabinet Directive also supports an optional fortnightly ministry report addendum.

## Publish on GitHub Pages

1. Extract the ZIP and upload its contents to the root of your existing repository, preserving the `assets` folder.
2. Commit the changes. If Pages is not already enabled, select **Settings → Pages → Deploy from a branch**, then `main` and `/(root)`.
3. Open the deployed site. `index.html` is the entrance page; each card links to `editor.html?type=...`.

Use the hosted site to ensure the browser can fetch the separate scripts and artwork. Downloaded editable HTML documents are self-contained and can be reopened offline.

## Exports

The A4 preview shows the exact page divisions used for printing and PNG export. One page exports as a PNG; multiple pages export as a ZIP of individually numbered PNGs (1588 × 2246 pixels). Individual preview pages can also be downloaded. Use Print / Save PDF for a paginated PDF. For unusually long proposals, put detailed discussion in the meeting notes rather than a single table cell.

All editing and signature uploads are local to the browser. Save the editable HTML before leaving or refreshing. The portal does not include user accounts or shared storage.


## Cabinet cover pages

Cabinet Minutes and Cabinet Directive automatically include their front covers as the first A4 page in the preview, PDF output and PNG page exports.

## Prime Minister stamp

Select **Add PM stamp** in any template to include the transparent red Office of the Prime Minister seal in the signing block. Choose a size and horizontal position. Each template remembers its own stamp settings in saved HTML. The stamp is included in the A4 preview, print/PDF and individual PNG pages. It is off by default.

## Included features

- Government-branded entrance page, favicon and Home navigation.
- Four document templates with editable text, signatures and live A4 pagination.
- Mandatory original front covers for both Cabinet templates.
- Optional Prime Minister stamp, with size and position controls.
- Individual numbered PNG pages, ZIP export for multi-page documents, PDF printing and portable editable HTML.
- Separated HTML, CSS, JavaScript and local image assets.

A `.nojekyll` file is not required for this static site.
