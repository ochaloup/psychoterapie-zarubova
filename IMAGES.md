# Images — provenance log

Every image used on the site is logged here with its source, photographer, and license. Update whenever an image is added, replaced, or removed.

Source files as delivered by Barbora live in `images/` at the repo root; the copies actually used by the site live in `src/assets/` (optimized at build by `astro:assets`) and `public/images/` (og:image only).

## Portraits

### `src/assets/barbora-zarubova.jpeg` (+ copy at `public/images/portrait.jpg` for og:image)
- **Source**: provided by Barbora (2026-05-26), professional photo, 1600×1066
- **Subject**: Mgr. Barbora Zárubová in a sunset field
- **Used on**: homepage hero (CSS-cropped to 4:5), social-preview og:image
- **Note**: replaced the low-res `bara.jpg` (350×262) reused from her previous website in v0.1.

## Service photos

### `src/assets/psychoterapie.jpeg`
- **Source**: provided by Barbora (2026-05-26), own photo, 651×869
- **Subject**: apple blossom in spring light
- **Used on**: `/sluzby/psychoterapie` banner

### `src/assets/rodicovske-poradenstvi.jpeg`
- **Source**: provided by Barbora (2026-05-26), own photo, 1159×869
- **Subject**: tree canopy with sunlight
- **Used on**: `/sluzby/poradenstvi-pro-rodice` banner

### `src/assets/lesni-terapie.jpeg`
- **Source**: provided by Barbora (2026-05-26), own photo, 651×869
- **Subject**: forest path covered in autumn leaves
- **Used on**: `/sluzby/lesni-terapie` banner

## Logos

### `src/assets/logo-cap.jpeg`
- **Source**: provided by Barbora (2026-06-05), © Česká asociace pro psychoterapii
- **Subject**: ČAP membership badge „Psychoterapeutka — řádná členka"
- **License**: used as a membership mark with the association's standard permission for members
- **Used on**: `/pribeh` below the story text, linked to https://czap.cz/

## Format conventions

- Site images live in `src/assets/` and render through `astro:assets` `<Image>` (build-time optimized variants).
- `public/images/` holds only assets that need a stable public URL (og:image).
- Use SVG for icons and decorative motifs (currently inline in components).
