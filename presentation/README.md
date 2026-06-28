# Presentation

Short (2–3 min) project presentation in Bulgarian.

- **Ready to submit:** [`presentation.pdf`](./presentation.pdf)
- Source: [`presentation.md`](./presentation.md) — Marp-flavoured Markdown
- GitHub repo (linked from the slides): <https://github.com/danielstefanov212/CryptoSim>

## Re-render the PDF after editing

[Marp CLI](https://github.com/marp-team/marp-cli) — no install needed via `npx`:

```bash
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  npx -y @marp-team/marp-cli@latest presentation.md --pdf --no-stdin --allow-local-files
```

> The slides include speaker notes in HTML comments — Marp surfaces them in
> its own presenter view.

## Live preview while editing

Install the **Marp for VS Code** extension and open `presentation.md` —
preview pane renders the slides as you type.
