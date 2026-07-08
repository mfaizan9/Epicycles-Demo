# Epicycles Demonstrator (HTML5)

An accessible HTML5 port of the Flash *Path Tracing* / *Epicycles* demonstrator,
built on the shared KL-UNL foundation.

## ⚠️ It must be served over HTTP — double-clicking `index.html` will NOT work

The KL-UNL masthead (`foundation/kl-unl-masthead.js`) loads the page title and the
Help/About text with `fetch('foundation/contents.json')`. Browsers **block
`fetch()` of local files under the `file://` protocol** (same-origin policy), so if
you just double-click `index.html` the masthead comes up empty/broken and the
console shows a fetch error. Serving the folder over HTTP fixes this.

## How to run it locally

Open a terminal **inside this `html5/` folder** and start any static server:

```bash
# Python (3.x)
python3 -m http.server 8123
#   then open  http://localhost:8123/

# Node
npx serve
#   or
npx http-server
```

Or, in VS Code, use the **Live Server** extension.

Because you are serving from inside `html5/`, the simulation is at the server
**root** — open `http://localhost:8123/` (not `.../html5/index.html`).

## Production

When deployed to the cloud host (served over HTTP/HTTPS) it "just works" — the
`file://` limitation only affects local double-clicking.

## What's in here

```
index.html            KL-UNL scaffold: .app-shell + <kl-unl-masthead> + panels
foundation/           shared KL-UNL files, copied UNCHANGED
                        (kl-unl-masthead.js, kl-unl.css, kl-unl.js, contents.json)
styles/styles.css     sim-specific styles only (never overrides the foundation)
simulation.js         all sim logic (a faithful port of the ActionScript)
assets/               reused exported vector art (the three colored ball shapes)
CONVERSION_NOTES.md   behavior model, AS→HTML5 mapping, deviations
ACCESSIBILITY.md      WCAG affordances, ARIA, keyboard map, screen-reader notes
```

No build step, no bundler, no framework, no CDN. Everything is local. The only
runtime network request is the local `foundation/contents.json`.
