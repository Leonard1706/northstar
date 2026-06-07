'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  buildWeeklyProgram,
  groupTasksByArea,
  getArea,
  taskLabel,
} from '@/lib/areas';
import type { Task } from '@/types';

interface WeeklyProgramProps {
  tasks: Task[];
  weekStart?: Date;
  onToggle: (taskId: string, completed: boolean) => void;
  /** Hide whole days that have no tasks (today is always shown). Default true. */
  hideEmptyDays?: boolean;
  className?: string;
}

export function WeeklyProgramView({
  tasks,
  weekStart,
  onToggle,
  hideEmptyDays = true,
  className,
}: WeeklyProgramProps) {
  const program = useMemo(() => buildWeeklyProgram(tasks, weekStart), [tasks, weekStart]);
  const areaGroups = useMemo(() => groupTasksByArea(tasks), [tasks]);

  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;

  const visibleDays = program.days.filter(
    (d) => !hideEmptyDays || d.tasks.length > 0 || d.isToday,
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Area legend — which life-areas this week touches */}
      {areaGroups.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {areaGroups.map(({ area, tasks: areaTasks }) => {
            const done = areaTasks.filter((t) => t.completed).length;
            return (
              <div key={area.key} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: area.color }}
                />
                <span className="text-xs text-muted-foreground">
                  {area.name}
                  <span className="text-muted-foreground/50 tabular-nums">
                    {' '}
                    {done}/{areaTasks.length}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Days */}
      <div className="space-y-2">
        {visibleDays.map((day, di) => (
          <motion.div
            key={day.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: di * 0.03 }}
            className={cn(
              'rounded-2xl border p-3 sm:p-4',
              day.isToday
                ? 'border-primary/30 bg-primary/[0.04]'
                : 'border-border/50 bg-card',
            )}
          >
            <div className="flex items-center gap-2 mb-2 px-1">
              <h4
                className={cn(
                  'text-sm font-medium',
                  day.isToday ? 'text-primary' : 'text-foreground/80',
                )}
              >
                {day.label}
              </h4>
              {day.date && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {day.date.getDate()}.
                </span>
              )}
              {day.isToday && (
                <span className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full badge-weekly border">
                  I dag
                </span>
              )}
              {day.tasks.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {day.tasks.filter((t) => t.completed).length}/{day.tasks.length}
                </span>
              )}
            </div>

            {day.tasks.length > 0 ? (
              <div className="space-y-1">
                {day.tasks.map((task) => (
                  <ProgramTask key={task.id} task={task} onToggle={onToggle} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/60 px-1 py-1">
                Ingen planlagte opgaver
              </p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Flexible / anytime bucket */}
      {program.flexible.length > 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <h4 className="text-sm font-medium text-foreground/70">Fleksibel</h4>
            <span className="text-xs text-muted-foreground">når som helst i ugen</span>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {program.flexible.filter((t) => t.completed).length}/{program.flexible.length}
            </span>
          </div>
          <div className="space-y-1">
            {program.flexible.map((task) => (
              <ProgramTask key={task.id} task={task} onToggle={onToggle} />
            ))}
          </div>
        </div>
      )}

      {total > 0 && (
        <p className="text-xs text-muted-foreground text-center pt-1">
          {completed} af {total} opgaver gennemført i denne uge
        </p>
      )}
    </div>
  );
}

function ProgramTask({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: (taskId: string, completed: boolean) => void;
}) {
  const area = getArea(task.area);

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-xl px-2 py-2',
        'transition-colors duration-200',
        task.completed ? 'opacity-60' : 'hover:bg-muted/40',
      )}
    >
      <button
        onClick={() => onToggle(task.id, !task.completed)}
        aria-label={task.completed ? 'Markér som ikke fuldført' : 'Markér som fuldført'}
        className={cn(
          'flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center',
          'transition-all duration-200',
          task.completed
            ? 'bg-primary/70 border-primary/70 hover:bg-primary hover:border-primary'
            : 'border-muted-foreground/30 hover:border-primary/60',
        )}
      >
        {task.completed && <Check className="h-3 w-3 text-primary-foreground" />}
      </button>

      {task.time && (
        <span
          className={cn(
            'flex-shrink-0 font-mono text-xs tabular-nums w-11',
            task.completed ? 'text-muted-foreground/60' : 'text-muted-foreground',
          )}
        >
          {task.time}
        </span>
      )}

      {area && (
        <span
          className="flex-shrink-0 h-2 w-2 rounded-full"
          style={{ backgroundColor: area.color }}
          title={area.name}
        />
      )}

      <span
        className={cn(
          'flex-1 text-sm leading-snug',
          task.completed && 'line-through text-muted-foreground',
        )}
      >
        {taskLabel(task)}
      </span>
    </div>
  );
}
