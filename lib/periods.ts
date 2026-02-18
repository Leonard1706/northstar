import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  getWeek,
  getMonth,
  getQuarter,
  getYear,
  format,
  isWithinInterval,
  addWeeks,
  addMonths,
  addQuarters,
  addYears,
} from 'date-fns';
import type { PeriodType, PeriodInfo } from '@/types';

// Get current period info for any period type
export function getCurrentPeriod(type: PeriodType, date: Date = new Date()): PeriodInfo {
  const year = getYear(date);

  switch (type) {
    case 'vision':
      return {
        type: 'vision',
        year: year + 2, // Vision is typically 2-5 years out
        label: `Vision ${year + 2}`,
        start: startOfYear(date),
        end: endOfYear(addYears(date, 2)),
        isCurrent: true,
      };

    case 'yearly':
      return {
        type: 'yearly',
        year,
        label: `${year}`,
        start: startOfYear(date),
        end: endOfYear(date),
        isCurrent: true,
      };

    case 'quarterly':
      const quarter = getQuarter(date);
      return {
        type: 'quarterly',
        year,
        quarter,
        label: `Q${quarter} ${year}`,
        start: startOfQuarter(date),
        end: endOfQuarter(date),
        isCurrent: true,
      };

    case 'monthly':
      const month = getMonth(date) + 1; // date-fns uses 0-indexed months
      return {
        type: 'monthly',
        year,
        quarter: getQuarter(date),
        month,
        label: format(date, 'MMMM yyyy'),
        start: startOfMonth(date),
        end: endOfMonth(date),
        isCurrent: true,
      };

    case 'weekly':
      const week = getWeek(date, { weekStartsOn: 1 }); // Monday start
      return {
        type: 'weekly',
        year,
        quarter: getQuarter(date),
        month: getMonth(date) + 1,
        week,
        label: `Week ${week}, ${year}`,
        start: startOfWeek(date, { weekStartsOn: 1 }),
        end: endOfWeek(date, { weekStartsOn: 1 }),
        isCurrent: true,
      };
  }
}

// Get all periods of a type for a given year
export function getPeriodsForYear(type: PeriodType, year: number): PeriodInfo[] {
  const periods: PeriodInfo[] = [];
  const now = new Date();

  switch (type) {
    case 'quarterly':
      for (let q = 1; q <= 4; q++) {
        const date = new Date(year, (q - 1) * 3, 1);
        const period = getCurrentPeriod('quarterly', date);
        period.isCurrent = isWithinInterval(now, { start: period.start, end: period.end });
        periods.push(period);
      }
      break;

    case 'monthly':
      for (let m = 0; m < 12; m++) {
        const date = new Date(year, m, 1);
        const period = getCurrentPeriod('monthly', date);
        period.isCurrent = isWithinInterval(now, { start: period.start, end: period.end });
        periods.push(period);
      }
      break;

    case 'weekly':
      let weekDate = startOfYear(new Date(year, 0, 1));
      while (getYear(weekDate) === year) {
        const period = getCurrentPeriod('weekly', weekDate);
        if (period.year === year) {
          period.isCurrent = isWithinInterval(now, { start: period.start, end: period.end });
          periods.push(period);
        }
        weekDate = addWeeks(weekDate, 1);
      }
      break;
  }

  return periods;
}

// Get parent period
export function getParentPeriod(period: PeriodInfo): PeriodInfo | null {
  switch (period.type) {
    case 'weekly':
      return getCurrentPeriod('monthly', period.start);
    case 'monthly':
      return getCurrentPeriod('quarterly', period.start);
    case 'quarterly':
      return getCurrentPeriod('yearly', period.start);
    case 'yearly':
      return getCurrentPeriod('vision', period.start);
    case 'vision':
      return null;
  }
}

// Get child periods
export function getChildPeriods(period: PeriodInfo): PeriodInfo[] {
  switch (period.type) {
    case 'vision':
      // Return years within vision timeframe
      const years: PeriodInfo[] = [];
      let yearDate = period.start;
      while (yearDate <= period.end) {
        years.push(getCurrentPeriod('yearly', yearDate));
        yearDate = addYears(yearDate, 1);
      }
      return years;

    case 'yearly':
      return getPeriodsForYear('quarterly', period.year);

    case 'quarterly':
      const monthlyPeriods: PeriodInfo[] = [];
      let monthDate = period.start;
      while (monthDate <= period.end) {
        monthlyPeriods.push(getCurrentPeriod('monthly', monthDate));
        monthDate = addMonths(monthDate, 1);
      }
      return monthlyPeriods;

    case 'monthly':
      const weeklyPeriods: PeriodInfo[] = [];
      let weekDate = period.start;
      while (weekDate <= period.end) {
        const weekPeriod = getCurrentPeriod('weekly', weekDate);
        // Only include weeks that are primarily in this month
        if (weekPeriod.start >= period.start || weekPeriod.end <= period.end) {
          weeklyPeriods.push(weekPeriod);
        }
        weekDate = addWeeks(weekDate, 1);
      }
      return weeklyPeriods;

    case 'weekly':
      return []; // Weekly has no children
  }
}

// Format period for file path
export function periodToPath(period: PeriodInfo): string {
  switch (period.type) {
    case 'vision':
      return `vision/${period.year}.md`;
    case 'yearly':
      return `goals/${period.year}/yearly.md`;
    case 'quarterly':
      return `goals/${period.year}/q${period.quarter}/quarterly.md`;
    case 'monthly':
      const monthName = format(period.start, 'MMMM').toLowerCase();
      return `goals/${period.year}/q${period.quarter}/${monthName}/monthly.md`;
    case 'weekly':
      const weekMonthName = format(period.start, 'MMMM').toLowerCase();
      const weekNum = String(period.week).padStart(2, '0');
      return `goals/${period.year}/q${period.quarter}/${weekMonthName}/week-${weekNum}.md`;
  }
}

// Get period hierarchy (from vision down to current period)
export function getPeriodHierarchy(period: PeriodInfo): PeriodInfo[] {
  const hierarchy: PeriodInfo[] = [period];
  let current = period;

  while (true) {
    const parent = getParentPeriod(current);
    if (!parent) break;
    hierarchy.unshift(parent);
    current = parent;
  }

  return hierarchy;
}

// Get month name from number
export function getMonthName(month: number): string {
  return format(new Date(2000, month - 1, 1), 'MMMM');
}

// Get quarter months
export function getQuarterMonths(quarter: number): number[] {
  const startMonth = (quarter - 1) * 3 + 1;
  return [startMonth, startMonth + 1, startMonth + 2];
}
