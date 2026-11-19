# Neon Boulevard Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/irfanirawan1108-spec/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard)
[![reward](https://make.fun/badge/gta6-cover-art-01/irfanirawan1108-spec/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns your photos and a caption into GTA-style poster cover art: multi-panel layouts, a Vice City sunset or neon colour grade, bold Anton lettering with a Pacifico neon subtitle, and a one-click PNG export in 1080×1080, 1080×1350, 1920×1080 and 1080×1920. Your photos never leave your machine.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

Pick a layout, pick a grade, load your photos (or use the samples), drag each photo inside its panel, type a title — then Export PNG.

## What it does

- **6 layouts**: nine-panel grid, hero + three, four-panel, full bleed, tilted snapshots, story strip.
- **5 colour grades**: Vice Sunset, Neon Nights, Palm Dusk, Hot Pink, Teal Noir — gradient maps applied on the machine, per photo.
- **Per-panel photos**: one photo across every panel or a different photo per panel, each cropped and positioned by dragging, with a zoom slider and mouse-wheel zoom.
- **Lettering**: Anton title with a sunset gradient and outline, Pacifico neon subtitle, badge ribbon, five-star heat meter, halftone title band.
- **Finish**: film grain and vignette toggles, white poster frame, undo/redo, export one size or all four sizes at once.
- **Offline**: static files under `app/`, no network request, no upload. Fonts (Anton, Pacifico, SIL Open Font License) are vendored under `app/fonts/`.

## Entry

Built for [make.fun's gta6-cover-art-01 bounty](https://make.fun/bounty/gta6-cover-art-01). `main.ts` hands `app/` and `screenshots/` to `/output` with a dossier built by `vendor/makefun-app.ts`. All photos in `app/samples/` are AI-generated (no real person, no Rockstar artwork); all lettering uses OFL fonts. No Rockstar logo, wordmark, artwork or font anywhere in this app.
