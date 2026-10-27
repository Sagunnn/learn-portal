# Kakshya 7 — Grade 7 learning portal

Bite-sized lessons, flashcards and instant-feedback quizzes for Grade 7 **Science**, **Mathematics** and **Nepali grammar**. Static, client-only, no backend: progress, XP and streaks live in the browser's `localStorage`.

Served at `learn.sagunpradhan.com.np`. Stack: React 19 + Vite + TypeScript + Tailwind CSS v4, KaTeX for maths, Inter + Mukta (self-hosted) for Latin and Devanagari.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (answer matching, streaks, text rendering)
npm run build      # validate content → typecheck → build to dist/
```

## Folder structure

```
learn-portal/
├── content/                    ← everything a teacher edits; no code
│   ├── subjects.json           subject cards (name, icon, colour theme)
│   └── lessons/
│       ├── math/01-indices.json
│       ├── math/02-fractions.json   interactive fractions chapter
│       ├── nepali/01-upasarga.json
│       └── science/01-cell.json
├── schema/
│   ├── lesson.schema.json      JSON Schema for a lesson (autocomplete in VS Code)
│   └── subjects.schema.json
├── scripts/validate-content.mjs  schema + rules check; runs before every build
├── public/                     favicon, CNAME, and lesson images (public/images/…)
├── src/
│   ├── main.tsx, App.tsx       entry + routes
│   ├── index.css               Tailwind theme, Devanagari typography, flip-card CSS
│   ├── types/content.ts        TypeScript mirror of the schema
│   ├── lib/
│   │   ├── content.ts          loads the lesson index + lazy-loads lesson bodies
│   │   ├── progress.ts         localStorage store: XP, streak, per-lesson progress
│   │   ├── richText.ts         $math$, **bold**, ==highlight==, lists → safe HTML
│   │   ├── answer.ts           fill-in matching (Unicode NFC, Devanagari digits, fractions)
│   │   ├── fraction.ts         gcd/lcm, parsing "5/6" and "2 3/4"
│   │   ├── stats.ts, date.ts, theme.ts
│   │   └── logic.test.ts
│   ├── components/
│   │   ├── AppHeader.tsx       streak / XP / level badges
│   │   ├── ui/primitives.tsx   Button, ProgressBar, Accordion, Rich text, …
│   │   ├── lesson/             LearnRunner, ChunkView, FlashcardDeck, PrintSheet
│   │   ├── widgets/            interactive visualizers + still SVG figures (registry.tsx)
│   │   └── quiz/               QuizRunner, McqQuestion, FillQuestion, Feedback, HintLadder
│   └── pages/                  Dashboard, SubjectPage, LessonPage, NotFound
├── vite.config.ts              includes the `virtual:lesson-index` plugin
├── vercel.json                 SPA rewrites + asset caching for Vercel
└── .github/workflows/deploy.yml  GitHub Pages deploy
```

## Adding a chapter

1. Create `content/lessons/<subject>/<nn-name>.json` (copy a sample to start).
2. Give it a unique `meta.id`. It becomes the URL (`/lesson/<id>`) and the progress key, so don't rename it later.
3. Run `npm run dev`. The dashboard, subject page and progress bars pick it up automatically.

No UI code changes are needed. The build fails with a clear message if a file breaks the schema, uses an unknown subject, repeats an id, has an MCQ without exactly one correct option, or has a wrong option with no `why`.

Set `"draft": true` in `meta` to hide a lesson while you write it. To add a subject, add an entry to `subjects.json` (themes: `emerald`, `indigo`, `rose`, `amber`, `sky`, `violet`) and create its folder.

## Lesson format

```jsonc
{
  "$schema": "../../../schema/lesson.schema.json",
  "meta": { "id": "math-indices", "subject": "math", "chapter": 1, "title": "…", "titleLocal": "…",
            "summary": "…", "lang": "en", "estMinutes": 20 },
  "chunks":     [ /* the Learn path, shown one per "Continue" */ ],
  "flashcards": [ { "id": "product", "front": "$a^m \\times a^n$", "back": "$a^{m+n}$" } ],
  "quiz":       { "passPercent": 70, "questions": [ /* mcq | fill */ ] }
}
```

**Text fields** take a string or an array of lines (one paragraph each) and support `$inline math$`, `$$display math$$`, `**bold**`, `*italic*`, `==highlight==`, `` `code` ``, and `- ` / `1. ` lists. In JSON, backslashes double up: `$\\frac{a}{b}$`.

**`lang: "ne"`** on `meta` (or on any chunk/question) switches on Devanagari typography and Nepali UI labels.

| Chunk `type`    | Fields                                                     | Use                                          |
| --------------- | ---------------------------------------------------------- | -------------------------------------------- |
| `text`          | `title?`, `body`                                           | Explanation                                  |
| `callout`       | `variant` (tip/remember/warning/example/fact), `title?`, `body` | Highlighted box                          |
| `formula`       | `title?`, `items[{tex, label?}]`, `caption?`               | Formula cards                                |
| `wordBreakdown` | `title?`, `intro?`, `items[{word, parts[{text, role}], meaning?}]` | Tap-to-split words: role = prefix/root/suffix (उपसर्ग/मूल/प्रत्यय) |
| `table`         | `title?`, `headers`, `rows`                                | Comparisons                                  |
| `practice`      | `title?`, `problem`, `hint?`, `steps[]`, `answer`          | Worked problem with Hint + step-by-step Solution accordions |
| `check`         | `question` (an `mcq` or `fill`)                            | Quick question; Continue stays locked until answered |
| `image`         | `src`, `alt`, `caption?`                                   | Put files in `public/images/…`               |
| `interactive`   | `widget`, `title?`, `intro?`, `props?`, `tasks?`           | Hands-on visualizer (see below)              |

**Interactive widgets** (`props` are the starting values):

| `widget`              | `props`              | What it shows                                                         |
| --------------------- | -------------------- | --------------------------------------------------------------------- |
| `equivalentFractions` | `a`, `b`, `k`        | Knife & Glue: bar + pie, cut each piece into k; glue to simplest form |
| `mixedNumberTank`     | `n`, `d`             | Pieces fill containers of d; improper ↔ mixed number                  |
| `gridMerger`          | `a1`, `b1`, `a2`, `b2` | Columns vs rows, overlay to a common grid, combine (adding)          |
| `areaOverlap`         | `a`, `b`, `c`, `d`   | Blue columns × yellow rows, green overlap (multiplying)               |

To add a widget: build it in `src/components/widgets/`, register it in `registry.tsx`, and add its name to `WidgetName` and the schema's `widget` enum.

**Questions**

- Both types take `hints`: up to 5 shown one at a time. With three, they're labelled Nudge → Set it up → Full solution. A hint can be `{ "text": …, "visual": { "kind": "bar" | "pie" | "tank" | "sum" | "product", … } }` to include a picture.
- `mcq`: `prompt`, `options[{text, correct?: true, why?}]`, `explanation?`, `hint?`, `shuffle?` (default true). Every wrong option needs a `why`, which is shown in a bubble under that option when it's picked.
- `fill`: `prompt` with `___` where the blank goes, `answers[]` (the first is shown on "Show answer"), `match: "text" | "number"`, `tolerance?`, `mistakes[{answers[], why}]` for predictable wrong answers. `match: "fraction"` compares by value ("4/6" = "2/3") and accepts mixed numbers ("2 3/4"); add `simplest: true` to require lowest terms, or `form: "mixed" | "improper"` to require a way of writing it. Mistakes match by value too, so a `"2/5"` trap also catches `"4/10"`. For Nepali answers, also list romanised spellings so the student can answer without a Nepali keyboard.

**Print summary**: add a top-level `cheatSheet` (`title?`, `intro?`, up to 8 `items` with `title`, `tex?`, `body?`, `visual?`) and the lesson gets a "Print 1-page summary" button. Only the sheet prints, sized for one A4 page.

**Sandbox challenges**: an `interactive` chunk can list `challenges: [{ "id", "text", "goal": { "top": 8, "bottom": 12 } }]`. A challenge is solved (confetti, +5 XP, saved) the moment the widget's state matches every key in `goal`. The state keys for each widget are listed in the schema's description of `challenges`.

## Design system

- **Tactile**: buttons use a chunky `border-b-4` that squashes on click (`active:border-b-0 active:translate-y-1`, plus `active:mb-1` so nothing below moves). Cards and answer options use the `.press` class in `index.css` for the same effect.
- **Colour roles**: indigo = direction / primary action, emerald = success / done, amber = energy (XP, streak, hints), rose = opposing (wrong answers, traps). Background `#F8FAFC`.
- **No walls of text**: `text` chunks are told by **Tara**, the coach (`components/ui/Coach.tsx`), as speech bubbles, one per Continue (`lib/story.ts` does the splitting). Keep each line of `body` to about 3 lines. Lists render as icon badges, not bullet points.
- **Rewards**: the sticky HUD shows the streak, XP/level bar and one badge per lesson section (each interactive module, all flashcards known, quiz passed) that pops when it lights up. `lib/confetti.ts` fires on correct answers, solved challenges, finished lessons, passed quizzes and a fully known deck. It's off when the device asks for reduced motion.

## How progress works

- **Score**: only first-try answers count. After a wrong answer the student reads why, then tries again.
- **XP**: finish a lesson +20 (+5 on re-reads), quick check +2, quiz +5 per first-try correct, +10 for a perfect quiz, +1 per flashcard marked known. Daily goal: 30 XP.
- **Streak**: goes up on any day with XP (local midnight). It's shown as 0 once a full day is missed.
- **Mastered**: Learn path finished and quiz best at or above `passPercent`.
- Progress lives in one browser. Use **Back up / Restore** on the dashboard to move it to another device.

## Deploying

**GitHub Pages**: push to `main` with Pages set to "GitHub Actions". `public/CNAME` sets the custom domain; add a `CNAME` DNS record `learn` → `<user>.github.io`. The build copies `index.html` to `404.html` so deep links like `/lesson/math-indices` work.

**Vercel**: import the repo; `vercel.json` handles the build and SPA rewrites. Add `learn.sagunpradhan.com.np` under Domains.
