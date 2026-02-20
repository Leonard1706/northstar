/**
 * NorthStar Setup Script
 *
 * Bootstraps the data directory and default CLAUDE.md for new users.
 * Safe to run multiple times — never overwrites existing files.
 *
 * Usage: pnpm setup
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dirPath: string) {
  if (!(await exists(dirPath))) {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`  Created ${path.relative(ROOT, dirPath)}/`);
  }
}

async function writeIfMissing(filePath: string, content: string) {
  if (await exists(filePath)) {
    console.log(`  Skipped ${path.relative(ROOT, filePath)} (already exists)`);
    return;
  }
  await fs.writeFile(filePath, content, 'utf-8');
  console.log(`  Created ${path.relative(ROOT, filePath)}`);
}

const DEFAULT_CLAUDE_MD = `You are a personal goal aligner and life coach. You have knowledge about the user's goals spanning their vision, yearly, quarterly, monthly, and weekly goals. At the end of each period, the user will provide progress and reflections, on which basis you will help create goals for the next period.

Your role is to analyze reflections and progress on goals and then suggest goals for the next period in the same format as they are currently set up — meaning that for weeks and months it will be to-do's and for quarters and years they are broken into different sections (Personal development / Mindset, Work / Income, Relationships, Learning / Mental wellbeing, Fitness / Physical wellbeing, and Experiences / Adventure).

Key rules:
- Focus on a few things per week — little progress is better than none
- Goals for longer periods should not be duplicated as-is for shorter periods
- Write goals as affirmations in first person ("I have...", "I am...")
- Be direct, honest, and ambitious but realistic
- Always output goals in Danish
`;

function currentYear(): number {
  return new Date().getFullYear();
}

function currentQuarter(): number {
  return Math.ceil((new Date().getMonth() + 1) / 3);
}

function currentMonthName(): string {
  return new Date().toLocaleString('en-US', { month: 'long' }).toLowerCase();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function makeGoalFrontmatter(opts: {
  period: string;
  year: number;
  quarter?: number;
  month?: number;
  week?: number;
  start: string;
  end: string;
}): string {
  const lines = [
    '---',
    'type: goal',
    `period: ${opts.period}`,
    `year: ${opts.year}`,
  ];
  if (opts.quarter !== undefined) lines.push(`quarter: ${opts.quarter}`);
  if (opts.month !== undefined) lines.push(`month: ${opts.month}`);
  if (opts.week !== undefined) lines.push(`week: ${opts.week}`);
  lines.push(`start: "${opts.start}"`);
  lines.push(`end: "${opts.end}"`);
  lines.push('status: not-started');
  lines.push(`created: "${new Date().toISOString()}"`);
  lines.push('---');
  return lines.join('\n');
}

async function setup() {
  console.log('\nNorthStar Setup\n');

  // 1. Data directories
  console.log('Setting up data directories...');
  const year = currentYear();
  const quarter = currentQuarter();
  const monthName = currentMonthName();

  await ensureDir(DATA_DIR);
  await ensureDir(path.join(DATA_DIR, 'vision'));
  await ensureDir(path.join(DATA_DIR, 'goals', String(year)));
  await ensureDir(path.join(DATA_DIR, 'goals', String(year), `q${quarter}`));
  await ensureDir(path.join(DATA_DIR, 'goals', String(year), `q${quarter}`, monthName));
  await ensureDir(path.join(DATA_DIR, 'reflections', String(year)));
  await ensureDir(path.join(DATA_DIR, 'reflections', String(year), `q${quarter}`));
  await ensureDir(path.join(DATA_DIR, 'reflections', String(year), `q${quarter}`, monthName));

  // 2. Starter vision file
  console.log('\nCreating starter files...');
  const visionYear = year + 2;
  await writeIfMissing(
    path.join(DATA_DIR, 'vision', `${visionYear}.md`),
    `${makeGoalFrontmatter({
      period: 'vision',
      year: visionYear,
      start: `${year}-01-01`,
      end: `${visionYear}-12-31`,
    })}

# Vision ${visionYear}

## Største forventninger
- [ ] Define your biggest goal here

## Personal Development / Mindset
- [ ] Where do you want to be mentally?

## Work / Income
- [ ] What does your career/business look like?

## Relationships
- [ ] What relationships matter most?

## Learning / Mental Wellbeing
- [ ] What do you want to learn or master?

## Fitness / Physical Wellbeing
- [ ] How do you want to feel physically?

## Experiences / Adventure
- [ ] What experiences do you want to have?
`
  );

  // 3. Starter yearly goal
  await writeIfMissing(
    path.join(DATA_DIR, 'goals', String(year), 'yearly.md'),
    `${makeGoalFrontmatter({
      period: 'yearly',
      year,
      start: `${year}-01-01`,
      end: `${year}-12-31`,
    })}

# ${year} Goals

## Største forventninger
- [ ] Your most important goal for ${year}

## Personal Development / Mindset
- [ ] Set a personal development goal

## Work / Income
- [ ] Set a work/income goal

## Relationships
- [ ] Set a relationship goal

## Learning / Mental Wellbeing
- [ ] Set a learning goal

## Fitness / Physical Wellbeing
- [ ] Set a fitness goal

## Experiences / Adventure
- [ ] Set an experience goal
`
  );

  // 4. CLAUDE.md (project coaching prompt)
  await writeIfMissing(path.join(ROOT, 'CLAUDE.md'), DEFAULT_CLAUDE_MD);

  // 5. .env.local
  if (!(await exists(path.join(ROOT, '.env.local')))) {
    console.log('\nNote: No .env.local found.');
    console.log('  The Coach feature needs authentication. Either:');
    console.log('  a) Create .env.local with ANTHROPIC_API_KEY=sk-ant-...');
    console.log('  b) Install Claude Code and run: claude login');
    console.log('  See CLAUDE.md for details.\n');
  }

  console.log('\nDone! Run `pnpm dev` to start.\n');
}

setup().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
