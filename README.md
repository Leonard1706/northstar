# Northstar

A local-first personal goal tracker that organizes your goals in a hierarchy — from a multi-year vision down to weekly tasks. All data is stored as Markdown files on your machine, making it easy to read, edit, and back up.

## Features

- **Goal hierarchy** — Vision → Yearly → Quarterly → Monthly → Weekly
- **Markdown-based** — Goals and reflections are plain `.md` files with YAML frontmatter
- **Task tracking** — Check off weekly/monthly tasks directly from the UI
- **Reflections** — Write periodic reflections linked to your goals
- **Goal tree** — Visualize your full goal hierarchy and progress
- **Local-only** — No accounts, no cloud, your data stays on your machine

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

### Install & Run

```bash
git clone <repo-url> northstar
cd northstar
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Data Directory

All your goals, reflections, and vision documents live in the `data/` folder (gitignored by default). The app creates it automatically when you add your first goal.

```
data/
├── vision/
│   └── 2025.md              # Multi-year vision
├── goals/
│   └── 2025/
│       ├── yearly.md         # Yearly goals
│       └── q1/
│           ├── quarterly.md  # Quarterly goals
│           ├── january/
│           │   ├── monthly.md
│           │   ├── week-01.md
│           │   └── week-02.md
│           └── ...
└── reflections/
    └── 2025/
        └── ...               # Period reflections
```

### File Format

Goals are Markdown files with YAML frontmatter:

```markdown
---
type: goal
period: weekly
year: 2025
quarter: 1
month: 1
week: 3
start: "2025-01-13"
end: "2025-01-19"
status: in-progress
created: "2025-01-13"
---

# Week 3

### Fitness
- [x] Run 3 times
- [ ] Stretch daily

### Work
- [ ] Ship feature X
- [x] Review PRs
```

## Scripts

Helper scripts for running as a background server (useful for making it feel like a native app):

```bash
./scripts/launch.sh        # Build (if needed) and start on port 3333
./scripts/stop.sh           # Stop the background server
./scripts/start-server.sh   # Start server (used by launcher)
```

There's also a `NorthStar.applescript` you can export as a macOS app for dock-launching.

## Tech Stack

- [Next.js](https://nextjs.org/) 16 (App Router)
- [React](https://react.dev/) 19
- [Tailwind CSS](https://tailwindcss.com/) 4
- [Radix UI](https://www.radix-ui.com/) primitives
- [Framer Motion](https://www.framer.com/motion/)
- [gray-matter](https://github.com/jonschlinkert/gray-matter) for frontmatter parsing

## Using with an AI Coach

Northstar pairs well with an AI assistant (like Claude) as a personal goal coach. Add a `CLAUDE.md` at the project root with instructions about your goal structure, and the AI can:

- Analyze your reflections and suggest goals for the next period
- Ensure weekly goals align with monthly → quarterly → yearly → vision
- Push you with ambitious but realistic targets

The `CLAUDE.md` file is gitignored so your personal coaching instructions stay private.

## License

MIT
