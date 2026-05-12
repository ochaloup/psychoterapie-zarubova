# Images — provenance log

Every image used on the site is logged here with its source, photographer, and license. Update whenever an image is added, replaced, or removed.

## Portraits

### `public/images/portrait.jpg`
- **Source**: existing site at https://www.psychoterapie-zarubova.cz/pics/bara.jpg
- **Subject**: Mgr. Barbora Zárubová
- **Note**: reused from her previous website for v0.1. Original is small (350×262); a higher-resolution professional portrait will be commissioned and swapped in before v1.0.

## Mood / background imagery

*Not yet populated.* For v0.1 the site relies on typography, color, and a single portrait. If a reviewer (Barbora or otherwise) feels a mood image is needed, source 3–5 from Unsplash matching:

- *forest light morning*
- *linen warm texture*
- *path through trees*
- *hands ceramic mug*
- *botanical line drawing*

Avoid clichés (lotus flowers, mandalas, women-in-meditation-pose). For each image, append a row below with:

```
### public/images/<name>.jpg
- Source URL: <unsplash.com/photos/...>
- Photographer: <name + profile URL>
- License: Unsplash License (https://unsplash.com/license)
- Used on: <page / section>
```

## Format conventions

- Source files go in `public/images/`.
- For raster images larger than ~50 KB, use Astro's `<Image>` component to generate AVIF + WebP variants at build time.
- Use SVG for icons and decorative motifs (currently inline in components).
