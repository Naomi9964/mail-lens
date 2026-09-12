# Mail Lens 2.1

English, browser-local phishing email triage. Serve `dist` using a local HTTP server. No API key is required. The English guide is linked from the page and available in `output/pdf/mail-lens-guide.pdf`.

## Virtual machine setup

See [VM_GUIDE.md](VM_GUIDE.md) for Ubuntu / Debian and Windows setup, local-only operation, host access, email import and troubleshooting.

## Input methods

- Import or drag one `.eml` file (maximum 10 MB).
- Paste complete email source, including headers and MIME body.
- Import a UTF-8 `.html`, `.htm`, or `.txt` file.
- Paste into the body normally: clipboard HTML is preferred when supplied, preserving link hrefs. A plain-text-only clipboard produces an explicit coverage warning.

PostalMime decodes multipart, base64, quoted-printable, encoded headers and declared text charsets. Both text and HTML alternatives are retained. It fills the editor and analyzes the message, clears the expected domain, and imports attachment names. Attached messages remain attachments; they require separate import. Files are never uploaded. Input is not persisted. HTML, links and attachment contents are not executed or opened.

Body limit: 100,000 decoded characters; headers: 50,000; subject: 2,000; sender: 500; attachment names: 5,000. Oversize inputs fail without silent truncation or replacing prior state. Outlook MSG, PDFs, encrypted messages and QR/image analysis are unsupported.

## Analysis

Thirty deterministic rules with five category caps, evidence snippets, actual URL hostnames, authentication-claim parsing and coverage gaps. This is a heuristic screening tool, not a trained classifier. No accuracy, precision, recall or probability calibration is claimed. No DNS, reputation, redirect resolution or signature verification is performed.

## Build and checks

Run `npm ci`, `npm run build`, and `npm test` to reproduce the MIME importer and run 37 functional checks. The dependency lockfile pins PostalMime and esbuild. `dist/importer.js` is a standalone browser bundle with no runtime CDN dependency; the PostalMime license is included beside it.

- `dist/engine.js`: analysis engine and rule catalog; also supports Node CommonJS.
- `dist/app.js`: English UI and local file / clipboard flows.
- `src/importer.mjs`: MIME decoder adapter and clipboard input preparation.
- `tests/hidden-link.eml`: synthetic fixture with an encoded HTML button target.
- `scripts/create_guide.py`: builds the five-page guide using ReportLab and the engine's actual rule catalog.

Version 2.1 has 24 scoring checks plus 13 import / link-preservation checks. PDF pages were rendered and visually reviewed. These checks do not measure real-world phishing detection accuracy. 

## Hosting

The existing Site identity is retained in `.openai/hosting.json`. Static output is `dist`. Changes are available in the local preview; the existing online version has not been replaced in this edit.
