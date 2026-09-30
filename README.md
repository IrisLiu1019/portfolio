# Hairong Liu portfolio

Static modular portfolio using the supplied Home, Work and About designs and original SVG lettering.

- Home: the approved illustrated pond is the full-screen opening. 72 small koi form loose schools (large koi approximately one sixth of their previous length); two swim left and the rest right with gentle tail motion. Two dragonflies circle the opening between the lily pads with slight wing flutter and fixed body orientations. The frog releases groups of four rising bubbles. Pointer movement, taps and the keyboard-accessible trigger create water ripples. Original handwritten name and navigation remain separate and sharp. Pause/Play, reduced-motion preference, responsive cropping and a static-image fallback are supported.
- Work: moving over preview artwork creates localized water refraction in the image pixels. Captions remain clear, clicks navigate immediately, and reduced-motion users see the original artwork. Six projects in the approved order, horizontally scrolling at 24 px/second. Pause/Play, project hover/focus pause (empty space continues scrolling), touch and keyboard browsing. Reduced-motion users start paused.
- About: approved biography, original-ratio portrait, CV preview and email links. The CV opens a two-page HTML preview with a download link to the unchanged original PDF, so browsers without a working PDF viewer can read it.
- All six projects: 41 complete boards in a shared chapter reader. Desktop scenes hold during native scrolling, with subtle entrance/departure transitions. Chapters, progress, optional auto-scroll, previous/next controls and full-size image viewing are provided. Mobile uses a compact vertical layout with scrollable full-size images. Reduced-motion preferences are respected.

Run: python3 -m http.server 8765 --directory dist

Project records: dist/projects.js. Page rendering: dist/site.js. Shared appearance: dist/style.css. The opening renderer is dist/pond/scene.js, movement settings are dist/pond/motion.js, and sprite coordinates are dist/pond/atlas.json. Work movement is dist/work-rail.js. Each project has a slug and path, with its boards in projectStories. Add a matching route with data-page="project" and data-project="slug". Reading behavior is in dist/story-reader.js.

Source assets came from the user’s Desktop/web folder. Name, navigation, CV and email SVGs remain unchanged. Artwork thumbnails and portrait are extracted from the supplied page designs. Pollen boards are web-optimized complete images, not redrawn or rewritten.

Verified in the browser at 1440, 768, 390 and 320 px: route navigation, image loading, portrait proportions, no unintended horizontal page overflow. Automatic Work movement and pause, home ripple initialization and pointer events, Pollen detail entry and return, CV and email targets checked.

The 33 added boards match every currently supplied non-Pollen source file, including LEGO 05–08 added on 2026-09-29. A Batch of Honesty follows 01, 02, 02-1, 04–13; no source 03 was supplied. Original artwork is preserved in full.
