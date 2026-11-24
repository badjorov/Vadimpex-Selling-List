# CLAUDE.md

This file guides Claude Code when working in this repository.

## What this project is

The public **VADIMPEX Selling List**: a single web page that shows the current
stock list of VADIMPEX Handels GmbH to customers and partners. Visitors can
search the table, refresh it, export it as CSV or Excel, and open the Warranty &
Return Policy in a pop-up. A collapsible "API Access" section explains how
customers with an API key can pull the same stock as JSON or CSV.

## Tech stack

- Plain static site: HTML, CSS, vanilla JavaScript. No build step, no framework,
  no package manager, no tests.
- Libraries are loaded from cdnjs in `index.html`: SheetJS (`xlsx`), jsPDF and
  jspdf-autotable, html2canvas. jsPDF is included twice, and the PDF and
  html2canvas libraries are currently unused.
- Data comes from two Google sources (see "Data flow").

## How it is deployed

- **GitHub Pages** from the `main` branch, served at the custom domain
  **wts.vadimpex.com** (set in `CNAME`). A push to `main` is a publish:
  customers see it within a minute or two.
- The data backend is a **Google Apps Script web app** bound to a Google
  Sheet. Its code is **not in this repo**. It is deployed separately in the
  Apps Script editor (see the Apps Script section).

## Data flow (`script.js`)

1. **Live feed:** a JSONP call to the Apps Script `/exec` URL (`scriptUrl`) with
   `?callback=handleData_<timestamp>`. It returns `{ success, data: [rows] }`;
   the first row's `Last Updated` value is shown as the timestamp.
2. **Fallback:** if the live feed has not answered after 5 s
   (`FALLBACK_AFTER_MS`), the page loads the sheet's **published CSV**
   (`csvExportUrl`, docs.google.com `.../pub?output=csv`). The CSV has the same
   rows but no `Last Updated` column. If the live feed arrives later (up to
   45 s, `LIVE_GIVE_UP_MS`), it replaces the CSV data, keeping the visitor's
   search when nothing changed.
3. An error is shown only when both sources fail.
4. The customer API (`?key=...&format=json|csv`) is served by the same Apps
   Script. Key checking happens there, not in this repo.

## File structure

| File | Purpose |
|---|---|
| `index.html` | Page layout, contact block, controls, policy pop-up (inline CSS + JS at the bottom) |
| `script.js` | Data loading (live feed + CSV fallback), table, search, refresh, CSV/Excel export, API section |
| `style.css` | Site styles (CSS variables such as `--primary`, `--primary-dark`) |
| `warranty-policy.html` | Standalone Warranty & Return Policy, shown in an iframe in the pop-up |
| `assets/` | `logo.png`, `favicon.ico` |
| `CNAME` | Custom domain for GitHub Pages; do not delete or change it |
| `README.md` | Title only |

## Risky areas

- **`scriptUrl` and `csvExportUrl`** in `script.js`. If either is wrong, the
  public stock list breaks. A new Apps Script deployment gets a **new** `/exec`
  URL, so the constant must be updated in the same change.
- **The fallback/late-answer logic** in `loadProductData()`. The JSONP callback
  is never deleted on purpose (a late answer must not throw). The 5 s / 45 s
  timings were chosen because Google sometimes takes 20–45 s. Do not "simplify"
  this back to a single request with a short timeout.
- **EAN codes must stay text.** `parseCsv` keeps all values as strings on
  purpose; do not parse numbers.
- **Column names** come from the sheet header row. Renaming a column in the
  sheet (especially `Last Updated`) changes the page.
- **Public personal data:** names, work e-mails and WhatsApp numbers of staff
  are in `index.html`. Change them only when asked.
- **`CNAME`** — removing it takes the site off wts.vadimpex.com.
- The API section displays the real `/exec` URL. Real API keys must never be
  written into this repo, which is public.

## Live vs. test copy

- **Live:** the `main` branch on GitHub = wts.vadimpex.com, used by customers.
  The Apps Script web app and its Google Sheet are also live.
- **Test copy:** open `index.html` locally (or run `python -m http.server` in
  this folder and open http://localhost:8000). It reads the **live** data
  sources, but it does not change them, so local testing is safe for the
  front end.
- Work on a branch, check locally, and only merge/push to `main` after
  Nikolay's explicit "yes". Pushing to `main` publishes.
- To test a backend change, use a **copy** of the sheet with its own Apps
  Script deployment, and point a local copy of `script.js` at that test `/exec`
  URL. Do not commit the test URL.

## Google Apps Script (backend, not in this repo)

Nikolay deploys Apps Script **by hand**, by pasting complete files into the
Apps Script editor. **No clasp.** So for any Apps Script change:

- Always give **whole files**, ready to paste over the old one, and name the
  exact editor file each one replaces (for example `Code.gs`).
- Never give fragments to insert at specific lines.
- Say explicitly when a file must be **created** or **removed** in the editor.
- After a code change the web app needs a new deployment version
  (Deploy → Manage deployments → edit → new version) to keep the same `/exec`
  URL. A brand-new deployment changes the URL, and `scriptUrl` here must then
  be updated too.
