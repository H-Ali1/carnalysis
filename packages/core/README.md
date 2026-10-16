# @carnalysis/core

Framework-free TypeScript shared by the Chrome extension and the mobile app, so both clients
read lot pages, talk to the backend and do their arithmetic the same way.

| Import | Contents |
| --- | --- |
| `@carnalysis/core` | API types and client, panel vocabulary, transport quotes, max-bid maths, formatting, colour tokens |
| `@carnalysis/core/extract` | `extractLotData(document)`, which reads a Copart lot page (used by the extension) |
| `@carnalysis/core/webview` | The same extractor as an injectable script string (used by the mobile WebView) |

The package is consumed as TypeScript source through a `file:` dependency, so there is no
build step for consumers.

## The generated WebView script

A WebView can't import modules, so `src/extract/webview-script.generated.ts` is bundled from
`src/extract/webview-entry.ts` with esbuild. After changing anything under `src/extract/` or
`src/parse.ts`, regenerate and commit it:

```bash
npm run build:webview-script
```

`test/extract.test.ts` checks that the script and `extractLotData` give identical results on
the fixture page, and CI fails if the committed script is out of date.

## Checks

```bash
npm install
npm run typecheck
npm test
```
