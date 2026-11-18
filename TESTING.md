# Testing the extension

You need Chrome (or Edge) and Node 18 or newer. There is nothing to install: the
extension has no dependencies.

## 1. Build

```bash
npm run build:extension
```

That copies `core/rules.js`, `core/analyze.js` and `core/filescan.js` into
`extension/lib/`, regenerates `extension/tokens.css` from the site's palette, and
redraws the icons. Expect this output:

```
extension/lib: rules.js, analyze.js, filescan.js
extension/tokens.css: 16 site colours, 16 used by popup.css, 0 missing
extension/icons: 16, 32, 48, 128
```

If npm says `Missing script: "build:extension"`, your clone is behind — run
`git pull`, or call the script directly: `node tools/build-extension.js`.

Also worth running, it needs no browser:

```bash
npm test        # 10 fixture cases, expects "10/10 passed"
```

## 2. Load it into Chrome

1. Go to `chrome://extensions` (Edge: `edge://extensions`).
2. Turn on **Developer mode** (top right).
3. **Load unpacked** → pick the **`extension`** folder inside the repo, not the
   repo root. The root has no `manifest.json`, so Chrome will refuse it.
4. Pin Verisafe so the toolbar icon is visible.

After any change: press the reload arrow on the Verisafe card. Changes under
`core/` are not picked up until you re-run step 1, because `extension/lib/` holds
generated copies.

## 3. Test the popup (no download needed)

The popup checks the address of the tab you are on when that address ends in a
file name. So open any URL ending in one, for example:

```
https://example.com/Invoice_2026.pdf.js
```

The page itself 404s — irrelevant, the address is what gets checked. Click the
Verisafe icon and expect:

- heading `Invoice_2026.pdf.js`
- **This looks very risky**
- a reason about the name pretending to be a `.pdf` while really being a `.js`
  (35 points) and one about `.js` being a program that can run code (25 points),
  which is 60, exactly the high threshold
- the recommended action "Don't open this file unless you are sure it's
  legitimate."

Then open `https://example.com/` (no file name in the address) with no recent
download and expect **Nothing to check yet**.

## 4. Test the download warning

The background worker checks every download as it starts. To trigger one with a
risky name, serve a dummy file:

```bash
printf 'dummy' > Setup.msi
node dev-server.js
```

In another terminal open <http://127.0.0.1:8137/Setup.msi>. Chrome downloads it,
a small Verisafe window opens with the verdict (**This looks risky**, mentioning
the `.msi` name), and the same message arrives as a notification. That window is
`popup.html` in a real popup window, about 380x560 — the toolbar popup's own
layout, opened by the background worker. Start a second risky download and the
window is replaced, not duplicated, so it never shows the older file. Chrome may
also ask **Keep** / **Discard** about the file itself; that banner is Chrome's,
not Verisafe's. Afterwards delete the dummy:

```bash
rm Setup.msi
```

Repeat with `Invoice.pdf.exe` for the **very risky** window. To confirm the silent
path, do the same with `Photo.jpg`: it scores 0, so no window and no notification
appear (only the popup's "last download" view changes).

Open the popup right after a download: it falls back to that download and shows
the reasons and the recommended action.

## 5. Where the site link goes

"Open full checker" opens the hosted site:
<https://verisafe-p1zjak-preview.freebuff.site/website/>
(`SITE_URL` in `extension/popup.js`). For local work, set that constant to
`http://127.0.0.1:8137/website/index.html` and run `node dev-server.js`.

## If something looks broken

| Symptom | Cause |
|---|---|
| `Manifest file is missing or unreadable` | You loaded the repo root instead of `extension/`. |
| Popup is blank or shows "Could not check this page" | `extension/lib/` is empty or stale: run step 1, then reload the extension. |
| No notification on download | Open `chrome://extensions` → Verisafe → **service worker** and read the console. Also check Windows Focus Assist / Do Not Disturb, which silences notifications. |
| No report window | Only medium and high open one; a clean file opens nothing. Look in the service worker console for "could not open the report window". |
| Notification appears twice | Check the service worker console for a duplicated `onCreated` listener. |
