# Lesson figures

Circuit diagrams, component symbols and photos used inside the lessons.

## Folder convention

```
site/static/img/figures/<module-folder>/<lesson-slug>/<figure-name>.<ext>
```

- `<module-folder>` — exactly the folder name under `site/docs/`, e.g. `module-07-active-passive-components`
- `<lesson-slug>` — the lesson file name without extension, e.g. `inductors-capacitors`
- `<figure-name>` — short kebab-case description, e.g. `capacitor-inductor-symbols`
- `<ext>` — `.svg` for diagrams / schematic symbols, `.png` or `.jpg` for photos

Example:

```
site/static/img/figures/module-07-active-passive-components/inductors-capacitors/capacitor-inductor-symbols.svg
```

Files placed here are shared by **both** the English and Gujarati sites. Only add a
locale-specific copy (same path under `site/i18n/<locale>/...`) when a figure has
embedded text that must be translated.

## Using a figure in a lesson

`<Figure>` is registered globally — no import line needed. In any `.md` / `.mdx` lesson:

```mdx
<Figure
  src="/img/figures/module-07-active-passive-components/inductors-capacitors/capacitor-inductor-symbols.svg"
  number="7.1"
  alt="Circuit symbols for a capacitor and an inductor, side by side"
  caption="Standard schematic symbols for a capacitor (C) and an inductor (L)."
/>
```

`src` is always the **site-absolute path** starting with `/img/figures/...` (the
component adds the site baseUrl for you). Do not use `./` relative paths.

### Props

| Prop           | Required | Purpose |
|----------------|----------|---------|
| `src`          | yes      | Site-absolute path, `/img/figures/...` |
| `alt`          | yes      | Screen-reader / fallback description |
| `caption`      | no       | Text shown under the image |
| `number`       | no       | Figure number, e.g. `"7.1"` → renders "Figure 7.1 — …" |
| `darkSrc`      | no       | Separate image for dark mode |
| `invertInDark` | no       | For black line-art with no dark variant: invert colours in dark mode instead of showing a white plate |
| `bare`         | no       | Remove the white plate / border — use for photographs |
| `width`        | no       | Fixed width, number (px) or CSS value |
| `href`         | no       | Make the figure a link (source file, Falstad simulation, datasheet) |

## Making the images

- **Schematics / symbols:** KiCad, Fritzing, or draw.io (save as editable `.drawio.svg`). Export **SVG**.
- **Simulations (modules 8, 9, 13, 14):** build in [Falstad](https://www.falstad.com/circuit/), export SVG, and pass the shareable URL as `href`.
- **Photos:** crop tight, keep under ~200 KB, export PNG/JPG, use the `bare` prop.
- Prefer transparent-background SVGs with dark strokes — the default white plate keeps them readable in dark mode.

## Adding a video to a lesson

`<Video>` is also registered globally — no import line, no file to download (the
video stays on YouTube / Vimeo). Responsive 16:9, lazy-loaded, uses
`youtube-nocookie.com`.

```mdx
<Video id="dQw4w9WgXcQ" title="Full-wave bridge rectifier explained" />
```

or with a full URL and a caption:

```mdx
<Video
  url="https://youtu.be/dQw4w9WgXcQ"
  title="Full-wave bridge rectifier explained"
  number="8.3"
  caption="Bridge rectifier walk-through."
/>
```

For a plain text link instead of an embedded player, just use normal markdown:
`📺 [Watch on YouTube](https://youtu.be/...)`.

### Props

| Prop      | Required | Purpose |
|-----------|----------|---------|
| `id`      | one of `id` / `url` | YouTube video ID only, e.g. `"dQw4w9WgXcQ"` |
| `url`     | one of `id` / `url` | Full URL — youtu.be, youtube.com/watch, /embed, /shorts, or vimeo.com/&lt;number&gt;. Anything else is used as the iframe src unchanged |
| `title`   | yes      | Screen-reader title for the player |
| `caption` | no       | Text shown under the video |
| `number`  | no       | e.g. `"8.3"` → renders "Video 8.3 — …" |
| `start`   | no       | Start time in seconds (YouTube only) |
