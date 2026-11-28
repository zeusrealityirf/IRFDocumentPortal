# IRF Government Document Portal — V10 (Policy Instruments and scanned presentation)

This complete release includes all seven templates, Cabinet covers, stamps, signature uploads, A4 preview, PDF printing, separate PNG pages, portable editable HTML and the clickable home header.

## Upgrading directly from V8

If Discord and cloud drafts already work, run only `upgrade-v9.sql` in Supabase, then upload all website files to the same repository. No need to install V9 first, rerun setup.sql, or change your OAuth configuration.

## Configure a new installation

1. Rotate the previously disclosed Supabase secret API key and Discord client secret. Revoke the compromised Supabase key. Enter the replacement Discord secret directly in Supabase; neither private credential belongs in this repository.
2. In Discord Developer Portal, select application `1575242893592109228`, OAuth2, and add `https://aigtruuaaturhuypvosr.supabase.co/auth/v1/callback` under Redirects. Save.
3. In Supabase project `aigtruuaaturhuypvosr`, Authentication > Sign In / Providers > Discord, enable Discord, enter the Client ID and the new client secret, and save.
4. Authentication > URL Configuration: set Site URL to your real GitHub Pages root (including the repository name, if any). Add the exact entrance page URL ending in `/index.html` to Redirect URLs. The site requests that URL automatically at login. Do not use a broad wildcard for production.
5. SQL Editor > New query: copy the contents of `setup.sql`, then Run. This creates the documents table if needed and enforces per-account row-level security. If you previously created a different schema, inspect it before running. No admin key is needed in the frontend.
6. Upload all website files and the assets directory to the same GitHub Pages repository root. The SQL file is only for dashboard setup and need not be uploaded. No build step or separate server is needed. Fresh v10 CSS and JS filenames prevent mixing cached releases. Only the public project URL and publishable key are configured in `cloud-v10.js`.
7. Open the deployed site, press Sign in with Discord, authorise and return to the entrance page. Create a test document and select Save to > Discord account (cloud), then Save draft. Reopen it from Saved documents. Sign in to the same account on a second device and check the document is there. Test a separate Discord account and verify it cannot see or edit the first account's documents. If login fails, verify the exact redirect URL and provider settings.

## Local and cloud drafts

Existing IndexedDB drafts remain available on the same browser and site path. New drafts default to cloud storage when signed in; guests use local storage. Choose a destination explicitly in the sidebar. When changing the destination of a previously saved draft, the editor creates a separate copy and leaves the original untouched. Saving is manual, not automatic. Cloud saves include the editable document, uploaded signature images and settings. Local drafts are accessible to anyone using the same browser profile. Clearing site data can remove local drafts. Sign out on shared computers. Keep portable HTML backups of important documents. Account documents are private per authenticated user, not shared government archives. Discord login does not enforce server membership or roles. No simultaneous collaborative editing or revision history is included. Last save wins when editing the same draft on multiple devices.

## Dependencies and testing

The website uses the pinned Supabase JavaScript SDK via jsDelivr, and Google Fonts with fallbacks. Cloud access requires internet and a configured Supabase provider/database. No Discord secret or Supabase administrative key is shipped. Portable HTML downloads omit cloud scripts and work independently. The project remains a static website; RLS is the actual access-control boundary, not the UI. Live login/database integration requires completing the dashboard steps and acceptance tests above.

## Upgrading from V8

Run `upgrade-v9.sql` in the Supabase SQL Editor before saving a Policy Instrument to the cloud. This updates the default `documents_type_check` constraint without removing documents or modifying access policies. If your database has a custom type constraint, inspect it before running. For a new project, run `setup.sql` instead. Upload the complete website, including the assets folder; SQL files are for the dashboard, not the website. Old drafts retain their contents and acquire the blank Policy Instrument fields on reopening. Keep the same deployed URL to retain the browser-local database.

The new Policy Instrument recreates the two supplied transmission examples with editable fields, clauses, optional signature and stamp, and continuation notices on every non-final A4 page. The paper texture uses the blank lower portion of the supplied continuation image.


## New in V10

A universal **Scanned effect** toggle has been added to all document templates. It applies a slight tilt, photocopy-style speckling and faint edge shading to the live preview, PDF output and separate PNG page exports.
