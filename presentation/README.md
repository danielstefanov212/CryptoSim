# Presentation

Short (2–3 min) project presentation in Bulgarian.

- Source: [`presentation.md`](./presentation.md) — Marp-flavoured Markdown
- GitHub repo (linked from the slides): <https://github.com/danielstefanov212/CryptoSim>

## Render to PDF / PPTX

[Marp CLI](https://github.com/marp-team/marp-cli) — no install needed via `npx`:

```bash
# PDF
npx -y @marp-team/marp-cli@latest presentation.md --pdf

# PowerPoint
npx -y @marp-team/marp-cli@latest presentation.md --pptx

# HTML (open in browser, F → fullscreen)
npx -y @marp-team/marp-cli@latest presentation.md --html
```

Marp will produce `presentation.pdf` / `presentation.pptx` next to the source.

> The slides include speaker notes in HTML comments — Marp surfaces them as
> presenter notes in PowerPoint / Keynote and in Marp's own presenter view.

## Live preview while editing

Install the **Marp for VS Code** extension and open `presentation.md` —
preview pane renders the slides as you type.
