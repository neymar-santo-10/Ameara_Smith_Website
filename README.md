# Ameara Smith — personal site

A static single-page site. No build step, no framework, no dependencies.
Open `index.html` in a browser and it works.

```
ameara-smith-site/
├── index.html              ← all the words
├── assets/
│   ├── css/
│   │   ├── tokens.css      ← all the colours, fonts, sizes  ⭐ start here
│   │   └── styles.css      ← layout & components
│   ├── js/
│   │   └── main.js         ← animations, nav, scroll spy
│   └── img/                ← put the portrait + share image here
└── README.md
```

---

## Before it goes live — the TODO list

Search `index.html` for `TODO`. There are four:

| What | Where | Notes |
|---|---|---|
| **Email address** | `#contact` | Change it in **both** the `href="mailto:…"` and the visible text. |
| **Résumé PDF** | `#contact` | Drop it at `assets/ameara-smith-resume.pdf`, or delete that row for now. |
| **Domain** | `<head>` | Three places: `canonical`, `og:url`, `og:image`. |
| **Share image** | `<head>` | A 1200×630 JPG at `assets/img/og-image.jpg` — this is the preview card when the link is texted or posted. |

One more to **verify**: the *Biblioteca delle Donne* entry at the top of the
Experience timeline came from Ameara's own announcement post, not from the
Experience section of her LinkedIn. Confirm the job title and dates, or delete
the block.

---

## Making changes

### Change a colour, font, or size
Open **`assets/css/tokens.css`**. Nothing else in the project hardcodes a
colour or a font — change a value there and the whole site follows.

The palette is Pantone-anchored:

| Role | Pantone | Hex |
|---|---|---|
| Ink Navy — primary | **539 C** | `#00263A` |
| Graphite — headings | **419 C** | `#212322` |
| Slate — body text | **Cool Gray 11 C** | `#53565A` |
| Old Gold — accent **on navy** | **4515 C** | `#B3A369` |
| Antique Gold — accent **on paper** | **871 C** | `#84754E` |
| Parchment — rules | **7527 C** | `#D6D2C4` |
| Pale Blue — quiet fills | **5455 C** | `#BFCED6` |
| Ash — cool hairlines | **Cool Gray 1 C** | `#D9D9D6` |

**Why there are two golds.** `#B3A369` on white is only **2.51:1** contrast,
which fails WCAG AA and is genuinely hard to read. On Ink Navy it's **6.24:1**
and passes comfortably. So gold-on-dark and gold-on-light are deliberately
different swatches: `--c-accent-inverse` for navy grounds, `--c-accent` for
paper. If you swap either one, re-check it at
<https://webaim.org/resources/contrastchecker/>.

The Pantone anchors are the published hex conversions of real spot colours.
The paper, hover, and shade steps (`--paper`, `--gold-soft`, `--navy-raised`)
are tints and shades derived from those anchors — spot inks have no exact
digital equivalent, so a derived ramp is the honest way to build one.

### Swap the portrait
Drop a new file at `assets/img/ameara-smith.jpg` and update the `width` and
`height` attributes on the `<img>` in `#about` to its real pixel size (they
prevent layout shift while it loads). A **4:5 portrait crop** fits the frame
with no cropping — the current photo is 1185×1492, which is 4:5 to within 1%.

The frame is built in `styles.css` under *Portrait*: a white mat with a
hairline edge, a fillet line around the image, and a gold rule offset behind
it. `--portrait-offset` controls how far the gold rule sits down-and-right
(16px desktop, 10px on narrow screens so it stays inside the gutter).

### Add a job, school, or service entry
Copy an existing block in `index.html` and edit it:

- **Legal/policy role** → copy an `<li class="entry">` inside `<ol class="timeline">`
- **Side job** → copy a row in `<ul class="compact">`
- **School** → copy an `<li>` inside `<ul class="edu">`
- **Service role** → copy an `<li>` inside `<ul class="service">`

The fade-in stagger is assigned automatically by `main.js` — you never have to
number anything.

### Add a whole new section
Copy any `<section class="section">`, give it a new `id`, and add a matching
`<a class="nav__link" href="#your-id">` in the header. The scroll-spy picks it
up on its own. Add `class="section on-navy"` to make it a dark band.

### Change the typefaces
Currently **EB Garamond** for display and **Inter** for text. To change: two
lines in `tokens.css` (`--font-display`, `--font-body`) plus the Google Fonts
`<link>` in `index.html`. Both stacks have full system fallbacks, so the page
still reads correctly if Google Fonts is blocked.

**If you change the display face, change the sizes too.** EB Garamond has a
small x-height, so `--t-hero`, `--t-h2`, and `--t-h3` all carry an ~8% uplift
and the tracking (`--ls-hero`, `--ls-h2`) is looser than a transitional serif
would want. Drop in a larger-eyed face without undoing that and the headings
will look oversized and loose. Both blocks are commented in `tokens.css`.

Use `_fonts.html` to compare six pairings live on the real hero — it prints
the exact line to paste.

---

## The animations

Tuned slow and generous — a cinematic feel rather than a brisk one.

- **Reveals run 1000ms** with 34px of travel (16px on phones), on an expo-out
  curve — quick departure, long graceful settle.
- **Elements reveal once.** Scrolling back up never re-hides or re-animates
  anything — the observer stops watching an element the moment it fires.
- **Siblings stagger 115ms apart**, capped at 6 steps. Longest tail in the
  page is the 5-item experience timeline at ~1.6s.
- **The hero runs as a sequence:** name (1.3s, 190ms between the two lines) →
  gold rule → kicker, tagline, affiliation, buttons (150ms apart) → scroll cue
  at 2.2s. The monogram fades over 2.2s underneath all of it.
- **Interaction speeds are deliberately NOT slowed.** Hovers stay at 160ms and
  menus at 260ms. Those are feedback, not choreography — stretch them and the
  site feels laggy rather than elegant.
- **No scrolljacking, no parallax.** The page scrolls exactly as fast as you
  scroll it.

Three knobs in `tokens.css` control the reveals: `--dur-reveal`, `--stagger`,
`--reveal-lift`. Set `--reveal-lift: 0px` for fades with no motion.

**The tradeoff, so it's on the record:** this is well past the 150–400ms band
Nielsen Norman Group recommends for scroll reveals. It looks better and it
reads as deliberate, but someone scrolling fast can outrun it and watch content
still arriving. The reveal trigger already fires slightly early
(`rootMargin: 0px 0px 4% 0px` in `main.js`) to compensate. If it ever tips from
considered into sluggish, bring `--dur-reveal` and `--reveal-lift` down
together — they need to move as a pair or the easing stops feeling right.

**Reduced motion is fully honoured.** Anyone with "reduce motion" enabled in
their OS gets the complete page with zero animation — not a degraded version.
Worth testing before launch (macOS: System Settings → Accessibility → Display →
Reduce Motion; Windows: Settings → Accessibility → Visual effects → Animation).

---

## Accessibility & SEO notes

Both matter more than usual here — this site exists to be found by recruiters
and read on a phone.

- All content is real HTML, so it's crawlable with JavaScript off. The page is
  fully readable without JS; script only adds motion and the mobile menu.
- Semantic landmarks, a skip link, visible keyboard focus rings, and
  `aria-current` on the active nav item.
- Body text is `#53565A` on `#FAF9F6` — **7.2:1**, comfortably past AA.
- `Person` structured data (JSON-LD) at the bottom of `index.html` helps Google
  render her correctly in search results.
- **Ctrl+P gives a clean printable résumé view** — navy bands drop to white, the
  nav and portrait are hidden, and link URLs are printed inline.

---

## The footer disclaimer — please keep it

```
Ameara Smith is an undergraduate student and is not a licensed attorney.
Nothing on this site is legal advice, an offer to provide legal services,
or an invitation to form an attorney–client relationship.
```

Every US jurisdiction restricts who may hold themselves out as able to practise
law (ABA Model Rule 5.5 and its state equivalents), and attorney-advertising
rules govern how legal services may be described online. A pre-law site that
uses courtroom language can drift toward implying admission the author doesn't
have yet. The site's copy is written to avoid that — *aspiring*, *studying
toward*, *legal intern*, never "practice areas", "clients", or "consultation" —
and the notice closes the gap.

It costs nothing and it protects her. When she's admitted, replace it with her
bar admissions.

---

## Publishing it

Any static host works, free:

- **Netlify / Vercel** — drag the folder onto the dashboard. Done.
- **GitHub Pages** — push the folder to a repo, enable Pages in Settings.
- **Cloudflare Pages** — connect the repo, no build command, output dir `/`.

Point a domain at it (`amearasmith.com` is the obvious one), then update the
three `TODO` domain references in `<head>`.

To preview locally with working relative paths:

```bash
python -m http.server 8777
```

Then open <http://127.0.0.1:8777>.
