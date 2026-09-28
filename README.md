# Hairong Liu portfolio

Static modular portfolio using the supplied Home, Work and About designs and original SVG lettering.

- Home: original water painting with pointer-driven WebGL refraction; typography remains separate and sharp. Reduced-motion preference and WebGL fallback supported.
- Work: six projects in the approved order, horizontally scrolling at 24 px/second. Pause/Play, hover/focus pause, touch and keyboard browsing. Reduced-motion users start paused.
- About: approved biography, original-ratio portrait, CV PDF and email links.
- Pollen Express: all eight supplied boards; each opens at full size. Other project entries have no detail route yet.

Run: python3 -m http.server 8765 --directory dist

Project records: dist/projects.js. Page rendering: dist/site.js. Shared appearance: dist/style.css. Effects: dist/water.js and dist/work-rail.js. Add a path to a project record and create its route when a new case study is ready.

Source assets came from the user’s Desktop/web folder. Name, navigation, CV and email SVGs remain unchanged. Artwork thumbnails and portrait are extracted from the supplied page designs. Pollen boards are web-optimized complete images, not redrawn or rewritten.

Verified in the browser at 1440, 768, 390 and 320 px: route navigation, image loading, portrait proportions, no unintended horizontal page overflow. Automatic Work movement and pause, home ripple initialization and pointer events, Pollen detail entry and return, CV and email targets checked.
