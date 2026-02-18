import { readMarkdownFile, writeMarkdownFile, listMarkdownFiles } from './files';
import { getMonthName } from './periods';
import type { Reflection, ReflectionFrontmatter, ReflectionSection, PeriodInfo, PeriodType } from '@/types';

// ============================================================================
// PERIOD-SPECIFIC QUESTION DEFINITIONS
// ============================================================================

export interface ReflectionQuestion {
  id: string;
  question: string;
  placeholder: string;
}

// Weekly/Monthly: 4 questions
const WEEKLY_MONTHLY_QUESTIONS: ReflectionQuestion[] = [
  {
    id: 'goals',
    question: 'Har jeg nået mine mål?',
    placeholder: 'Beskriv om du har nået dine mål og hvorfor/hvorfor ikke...',
  },
  {
    id: 'do-differently',
    question: 'Hvad vil jeg gøre anderledes næste gang?',
    placeholder: 'Hvad kan forbedres eller gøres anderledes...',
  },
  {
    id: 'continue',
    question: 'Hvad skal jeg fortsætte med?',
    placeholder: 'Hvad fungerer godt og skal fortsættes...',
  },
  {
    id: 'learned',
    question: 'Hvad har jeg lært?',
    placeholder: 'Indsigter, færdigheder eller viden opnået...',
  },
];

// Quarterly: 7 questions
const QUARTERLY_QUESTIONS: ReflectionQuestion[] = [
  {
    id: 'goals',
    question: 'Har jeg nået mine kvartårlige mål?',
    placeholder: 'Gennemgå dine mål og beskriv fremskridt...',
  },
  {
    id: 'favorites',
    question: '3 yndlingsdele af dette kvartal',
    placeholder: 'Hvad var de bedste øjeblikke...',
  },
  {
    id: 'proud',
    question: 'Hvad er jeg mest stolt af?',
    placeholder: 'Beskriv dine største præstationer...',
  },
  {
    id: 'challenged',
    question: 'Hvad udfordrede mig mest?',
    placeholder: 'Hvilke udfordringer mødte du...',
  },
  {
    id: 'scared',
    question: 'Hvornår følte jeg mig mest skræmt?',
    placeholder: 'Beskriv situationer der var skræmmende...',
  },
  {
    id: 'learned',
    question: 'Hvad lærte jeg om mig selv?',
    placeholder: 'Indsigter om dig selv...',
  },
  {
    id: 'moment',
    question: 'Beskriv dit yndlingsøjeblik',
    placeholder: 'Det mest mindeværdige øjeblik...',
  },
];

// Yearly Part 1: Refleksioner (6 questions about past year)
const YEARLY_REFLECTION_QUESTIONS: ReflectionQuestion[] = [
  {
    id: 'favorites',
    question: '3 yndlingsdele af året',
    placeholder: 'Hvad var årets bedste øjeblikke...',
  },
  {
    id: 'proud',
    question: 'Hvad er jeg mest stolt af?',
    placeholder: 'Beskriv dine største præstationer...',
  },
  {
    id: 'challenged',
    question: 'Hvad udfordrede mig mest?',
    placeholder: 'Hvilke udfordringer mødte du...',
  },
  {
    id: 'scared',
    question: 'Hvornår følte jeg mig mest skræmt?',
    placeholder: 'Beskriv situationer der var skræmmende...',
  },
  {
    id: 'learned',
    question: 'Hvad lærte jeg om mig selv?',
    placeholder: 'Indsigter om dig selv...',
  },
  {
    id: 'moment',
    question: 'Beskriv dit yndlingsøjeblik',
    placeholder: 'Det mest mindeværdige øjeblik...',
  },
];

// Yearly Part 2: Vækst (7 questions about coming year)
const YEARLY_GROWTH_QUESTIONS: ReflectionQuestion[] = [
  {
    id: 'feeling',
    question: 'Hvordan vil du gerne have det i dette år?',
    placeholder: 'Beskriv hvordan du vil føle dig...',
  },
  {
    id: 'meaning',
    question: 'Hvad betyder dette år for dig?',
    placeholder: 'Hvad er betydningen af dette år...',
  },
  {
    id: 'looking-forward',
    question: 'Hvad ser du frem til?',
    placeholder: 'Hvad glæder du dig til...',
  },
  {
    id: 'worried',
    question: 'Hvad er du bekymret for?',
    placeholder: 'Hvad bekymrer dig...',
  },
  {
    id: 'learn-develop',
    question: 'Hvad vil du gerne lære mere om eller udvikle?',
    placeholder: 'Områder for læring og udvikling...',
  },
  {
    id: 'committed',
    question: 'Hvad er du forpligtet til i år?',
    placeholder: 'Hvad forpligter du dig til...',
  },
  {
    id: 'one-year',
    question: 'Hvordan ser denne dag om præcis et år ud?',
    placeholder: 'Visualiser din fremtid...',
  },
];

// Yearly Part 3: Affirmations (4 sections)
const YEARLY_AFFIRMATION_QUESTIONS: ReflectionQuestion[] = [
  {
    id: 'open-to',
    question: 'Dette år vil jeg åbne mig op for',
    placeholder: 'Hvad vil du åbne dig op for...',
  },
  {
    id: 'learn-more',
    question: 'Jeg vil lære mere omkring',
    placeholder: 'Hvad vil du lære mere om...',
  },
  {
    id: 'say-no',
    question: 'Jeg vil sige NEJ til',
    placeholder: 'Hvad vil du sige nej til...',
  },
  {
    id: 'say-yes',
    question: 'Jeg vil sige JA til',
    placeholder: 'Hvad vil du sige ja til...',
  },
];

// ============================================================================
// GET QUESTIONS BY PERIOD TYPE
// ============================================================================

export function getReflectionQuestions(periodType: PeriodType = 'weekly'): ReflectionQuestion[] {
  switch (periodType) {
    case 'weekly':
    case 'monthly':
      return WEEKLY_MONTHLY_QUESTIONS;
    case 'quarterly':
      return QUARTERLY_QUESTIONS;
    case 'yearly':
      return [...YEARLY_REFLECTION_QUESTIONS, ...YEARLY_GROWTH_QUESTIONS, ...YEARLY_AFFIRMATION_QUESTIONS];
    default:
      return WEEKLY_MONTHLY_QUESTIONS;
  }
}

// Get yearly sections separately for structured display
export function getYearlyReflectionSections() {
  return {
    reflection: YEARLY_REFLECTION_QUESTIONS,
    growth: YEARLY_GROWTH_QUESTIONS,
    affirmations: YEARLY_AFFIRMATION_QUESTIONS,
  };
}

// ============================================================================
// CONTENT PARSING
// ============================================================================

export function parseReflectionSections(content: string): ReflectionSection[] {
  const sections: ReflectionSection[] = [];
  const lines = content.split('\n');

  let currentQuestion = '';
  let currentAnswer: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentQuestion) {
        sections.push({
          question: currentQuestion,
          answer: currentAnswer.join('\n').trim(),
        });
      }
      currentQuestion = line.replace('## ', '').trim();
      currentAnswer = [];
    } else if (line.startsWith('# ') && !line.startsWith('## ')) {
      if (currentQuestion) {
        sections.push({
          question: currentQuestion,
          answer: currentAnswer.join('\n').trim(),
        });
        currentQuestion = '';
        currentAnswer = [];
      }
    } else if (line.startsWith('---')) {
      if (currentQuestion) {
        sections.push({
          question: currentQuestion,
          answer: currentAnswer.join('\n').trim(),
        });
        currentQuestion = '';
        currentAnswer = [];
      }
    } else if (currentQuestion) {
      currentAnswer.push(line);
    }
  }

  if (currentQuestion) {
    sections.push({
      question: currentQuestion,
      answer: currentAnswer.join('\n').trim(),
    });
  }

  return sections;
}

export function generateReflectionTitle(frontmatter: ReflectionFrontmatter): string {
  const { period, year, quarter, month, week } = frontmatter;

  switch (period) {
    case 'weekly':
      return `Week ${week}`;
    case 'monthly':
      return getMonthName(month!);
    case 'quarterly':
      return `Q${quarter} ${year}`;
    case 'yearly':
      return `${year}`;
    default:
      return `${period} Reflection`;
  }
}

// ============================================================================
// CREATE DEFAULT CONTENT BY PERIOD TYPE
// ============================================================================

export function createDefaultReflectionContent(
  period: PeriodInfo,
  goalsCompleted: number = 0,
  goalsTotal: number = 0
): { frontmatter: ReflectionFrontmatter; content: string } {
  const completionRate = goalsTotal > 0 ? goalsCompleted / goalsTotal : 0;

  const frontmatter: ReflectionFrontmatter = {
    type: 'reflection',
    period: period.type,
    year: period.year,
    quarter: period.quarter,
    month: period.month,
    week: period.week,
    date: new Date().toISOString().split('T')[0],
    goalsCompleted,
    goalsTotal,
    completionRate: Math.round(completionRate * 100) / 100,
    created: new Date().toISOString(),
  };

  let content = '';

  switch (period.type) {
    case 'weekly':
    case 'monthly':
      content = createWeeklyMonthlyContent();
      break;
    case 'quarterly':
      content = createQuarterlyContent(period.quarter || 1);
      break;
    case 'yearly':
      content = createYearlyContent(period.year);
      break;
    default:
      content = createWeeklyMonthlyContent();
  }

  return { frontmatter, content };
}

function createWeeklyMonthlyContent(): string {
  return `## Har jeg nået mine mål?



## Hvad vil jeg gøre anderledes næste gang?



## Hvad skal jeg fortsætte med?



## Hvad har jeg lært?

`;
}

function createQuarterlyContent(quarter: number): string {
  return `## Har jeg nået mine kvartårlige mål?



## 3 yndlingsdele af Q${quarter}



## Hvad er jeg mest stolt af?



## Hvad udfordrede mig mest?



## Hvornår følte jeg mig mest skræmt?



## Hvad lærte jeg om mig selv i Q${quarter}?



## Beskriv dit yndlingsøjeblik

`;
}

function createYearlyContent(year: number): string {
  const prevYear = year - 1;
  return `# ${prevYear} Refleksioner

## 3 yndlingsdele af ${prevYear}



## Hvad er jeg mest stolt af?



## Hvad udfordrede mig mest?



## Hvornår følte jeg mig mest skræmt?



## Hvad lærte jeg om mig selv i ${prevYear}?



## Beskriv dit yndlingsøjeblik



---

# ${year} Vækst

## Hvordan vil du gerne have det i ${year}?



## Hvad betyder dette år for dig?



## Hvad ser du frem til?



## Hvad er du bekymret for?



## Hvad vil du gerne lære mere om eller udvikle?



## Hvad er du forpligtet til i ${year}?



## Hvordan ser denne dag om præcis et år ud?



---

# Affirmationer

## Dette år vil jeg åbne mig op for



## Jeg vil lære mere omkring



## Jeg vil sige NEJ til



## Jeg vil sige JA til

`;
}

// ============================================================================
// BUILD CONTENT FROM SECTIONS (for saving)
// ============================================================================

export function buildContentFromSections(
  periodType: PeriodType,
  sections: Record<string, string>,
  year?: number,
  quarter?: number
): string {
  switch (periodType) {
    case 'weekly':
    case 'monthly':
      return buildWeeklyMonthlyContent(sections);
    case 'quarterly':
      return buildQuarterlyContent(sections, quarter || 1);
    case 'yearly':
      return buildYearlyContent(sections, year || new Date().getFullYear());
    default:
      return buildWeeklyMonthlyContent(sections);
  }
}

function buildWeeklyMonthlyContent(sections: Record<string, string>): string {
  const get = (key: string) => sections[key] || sections[key + '?'] || '';

  return `## Har jeg nået mine mål?

${get('Har jeg nået mine mål')}

## Hvad vil jeg gøre anderledes næste gang?

${get('Hvad vil jeg gøre anderledes næste gang')}

## Hvad skal jeg fortsætte med?

${get('Hvad skal jeg fortsætte med')}

## Hvad har jeg lært?

${get('Hvad har jeg lært')}
`;
}

function buildQuarterlyContent(sections: Record<string, string>, quarter: number): string {
  const get = (key: string) => sections[key] || sections[key + '?'] || '';

  return `## Har jeg nået mine kvartårlige mål?

${get('Har jeg nået mine kvartårlige mål')}

## 3 yndlingsdele af Q${quarter}

${get(`3 yndlingsdele af Q${quarter}`) || get('3 yndlingsdele af dette kvartal')}

## Hvad er jeg mest stolt af?

${get('Hvad er jeg mest stolt af')}

## Hvad udfordrede mig mest?

${get('Hvad udfordrede mig mest')}

## Hvornår følte jeg mig mest skræmt?

${get('Hvornår følte jeg mig mest skræmt')}

## Hvad lærte jeg om mig selv i Q${quarter}?

${get(`Hvad lærte jeg om mig selv i Q${quarter}`) || get('Hvad lærte jeg om mig selv')}

## Beskriv dit yndlingsøjeblik

${get('Beskriv dit yndlingsøjeblik')}
`;
}

function buildYearlyContent(sections: Record<string, string>, year: number): string {
  const prevYear = year - 1;
  const get = (key: string) => sections[key] || sections[key + '?'] || '';

  return `# ${prevYear} Refleksioner

## 3 yndlingsdele af ${prevYear}

${get(`3 yndlingsdele af ${prevYear}`) || get('3 yndlingsdele af året')}

## Hvad er jeg mest stolt af?

${get('Hvad er jeg mest stolt af')}

## Hvad udfordrede mig mest?

${get('Hvad udfordrede mig mest')}

## Hvornår følte jeg mig mest skræmt?

${get('Hvornår følte jeg mig mest skræmt')}

## Hvad lærte jeg om mig selv i ${prevYear}?

${get(`Hvad lærte jeg om mig selv i ${prevYear}`) || get('Hvad lærte jeg om mig selv')}

## Beskriv dit yndlingsøjeblik

${get('Beskriv dit yndlingsøjeblik')}

---

# ${year} Vækst

## Hvordan vil du gerne have det i ${year}?

${get(`Hvordan vil du gerne have det i ${year}`) || get('Hvordan vil du gerne have det i dette år')}

## Hvad betyder dette år for dig?

${get('Hvad betyder dette år for dig')}

## Hvad ser du frem til?

${get('Hvad ser du frem til')}

## Hvad er du bekymret for?

${get('Hvad er du bekymret for')}

## Hvad vil du gerne lære mere om eller udvikle?

${get('Hvad vil du gerne lære mere om eller udvikle')}

## Hvad er du forpligtet til i ${year}?

${get(`Hvad er du forpligtet til i ${year}`) || get('Hvad er du forpligtet til i år')}

## Hvordan ser denne dag om præcis et år ud?

${get('Hvordan ser denne dag om præcis et år ud')}

---

# Affirmationer

## Dette år vil jeg åbne mig op for

${get('Dette år vil jeg åbne mig op for')}

## Jeg vil lære mere omkring

${get('Jeg vil lære mere omkring')}

## Jeg vil sige NEJ til

${get('Jeg vil sige NEJ til')}

## Jeg vil sige JA til

${get('Jeg vil sige JA til')}
`;
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

export async function readReflection(filePath: string): Promise<Reflection | null> {
  const file = await readMarkdownFile<ReflectionFrontmatter>(filePath);
  if (!file) return null;

  return {
    id: filePath.replace(/[/.]/g, '-'),
    path: filePath,
    frontmatter: file.frontmatter,
    content: file.content,
    title: generateReflectionTitle(file.frontmatter),
    sections: parseReflectionSections(file.content),
  };
}

export async function writeReflection(
  filePath: string,
  frontmatter: ReflectionFrontmatter,
  content: string
): Promise<boolean> {
  const updatedFrontmatter = {
    ...frontmatter,
    updated: new Date().toISOString(),
  };
  return writeMarkdownFile(filePath, updatedFrontmatter, content);
}

export async function getAllReflections(): Promise<Reflection[]> {
  const files = await listMarkdownFiles('reflections');
  const reflections = await Promise.all(files.map((f) => readReflection(f)));
  return reflections
    .filter((r): r is Reflection => r !== null)
    .sort((a, b) => new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime());
}

export async function getReflectionsForYear(year: number): Promise<Reflection[]> {
  const files = await listMarkdownFiles(`reflections/${year}`);
  const reflections = await Promise.all(files.map((f) => readReflection(f)));
  return reflections
    .filter((r): r is Reflection => r !== null)
    .sort((a, b) => new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime());
}

export async function getRecentReflections(limit: number = 5): Promise<Reflection[]> {
  const allReflections = await getAllReflections();
  return allReflections.slice(0, limit);
}

// Generate reflection file path (nested structure)
export function getReflectionPath(period: PeriodInfo): string {
  const year = period.year;
  const quarter = period.quarter || Math.ceil((period.month || 1) / 3);
  const monthName = period.month ? getMonthName(period.month).toLowerCase() : '';

  switch (period.type) {
    case 'yearly':
      return `reflections/${year}/yearly-reflection.md`;
    case 'quarterly':
      return `reflections/${year}/q${quarter}/quarterly-reflection.md`;
    case 'monthly':
      return `reflections/${year}/q${quarter}/${monthName}/monthly-reflection.md`;
    case 'weekly':
      return `reflections/${year}/q${quarter}/${monthName}/week-${String(period.week).padStart(2, '0')}-reflection.md`;
    default:
      return `reflections/${year}/reflection.md`;
  }
}
