# nicole-li7.github.io

Nicole's portfolio, built as a Smiski sticker book: light green, chunky outlines, and little green figures hiding in the corners. Live at https://nicole-li7.github.io.

## Features

**Home page**
- **Hero** - eyebrow, a waving "hi, i'm Nicole" heading, a typed-out tagline, and a researching figure you can click (or press Enter) to get a lightbulb idea.
- **Projects** - four sticker cards (LifeTracker, InternScout, Search Algorithm Explorer, Cycle), each with a tiny animated mini-illustration, tags, and links to its page and GitHub.
- **Skills** - a looping marquee of skill chips with a skater figure sliding across.
- **About** - short bio, highlights, and two tilted polaroid photos.
- **Contact** - email, GitHub, LinkedIn, and resume buttons over a crowd of figures.

**Project pages** (`projects/`)
- **Live demos** - each page has a "try it" demo that runs in the browser, ported to JavaScript from the real project's logic.
- **LifeTracker** - click through all seven pages (To-Do, Weekly Schedule, Calendar, Budget, Gym, School, Memories) with sample data.
- **InternScout** - change term, interests, locations, remote and visa toggles, and a min score; the sample postings re-rank, and clicking one shows its score breakdown.
- **Search Algorithm Explorer** - A* on the 8-puzzle (four heuristics, shuffle, solve, compare all four) and Minimax with alpha-beta on tic-tac-toe.
- **Cycle** - log days on a calendar and watch the period prediction adapt; nothing is saved or sent.
- **Write-ups** - every page has "how it works" and "the tricky parts" notes, plus previous/next links between projects.

**Interactions**
- **Dark mode** - the moon/sun button in the nav switches themes, remembers the choice in `localStorage`, and makes the figures glow.
- **Resume viewer** - the resume buttons open an in-page dialog with the resume image and a download-PDF button; close with the button, a click outside, or Esc.
- **Sparkle cursor** - a canvas trail of green stars follows the mouse (fine pointers only).
- **Reduced motion** - the typed tagline and sparkle cursor are turned off, and CSS animations are toned down, when the visitor prefers reduced motion.
- **Responsive** - layout adjusts for narrow screens.

## Running locally

It's a static site with no build step. From this folder:

```
python3 -m http.server
```

Then open http://localhost:8000. (Opening `index.html` directly also mostly works.)

Deploys: pushing to `main` publishes to GitHub Pages. `.nojekyll` keeps Pages from processing the files.

To update the resume, replace `Nicole_Li_Resume.pdf` and `resume.jpg` (a rendered image of the first page).

## How it's built

Plain HTML, CSS, and vanilla JavaScript. No framework, no bundler, no dependencies. Fonts are Fredoka (headings) and Nunito (body) from Google Fonts. The figures are PNGs placed on CSS blob shapes and reused through SVG `<symbol>`s. Colors live in CSS variables, so dark mode is just a `data-theme` swap.

```
index.html          home page (inline script: typed tagline, hero click, resume dialog, marquee)
style.css           all styles, home and project pages
site.js             shared by every page: theme toggle + sparkle cursor
projects/
  lifetracker.html  each page has its own inline demo script
  internscout.html
  search.html
  cycle.html
figures/            green figure PNGs
arena.jpg           about-section photos
matcha.jpg
Nicole_Li_Resume.pdf
resume.jpg          image shown in the resume viewer
```
