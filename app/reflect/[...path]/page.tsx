'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  BookOpen,
  Edit2,
  Target,
  Save,
  X,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { buildContentFromSections } from '@/lib/reflection-utils';
import type { Reflection, Goal, PeriodType } from '@/types';

const periodColors: Record<PeriodType, string> = {
  vision: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  yearly: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  quarterly: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  monthly: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  weekly: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

export default function ReflectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [linkedGoal, setLinkedGoal] = useState<Goal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSections, setEditedSections] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const path = Array.isArray(params.path) ? params.path.join('/') : (params.path || '');

  const fetchReflection = useCallback(async () => {
    if (!path) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/reflections?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.success) {
        setReflection(data.data);

        // Initialize edited sections
        const sections: Record<string, string> = {};
        for (const section of data.data.sections) {
          sections[section.question] = section.answer;
        }
        setEditedSections(sections);

        // Fetch linked goal if exists
        const linkedPath = data.data.frontmatter.linkedGoalPath;
        if (linkedPath) {
          const goalRes = await fetch(`/api/goals?path=${encodeURIComponent(linkedPath)}`);
          const goalData = await goalRes.json();
          if (goalData.success) {
            setLinkedGoal(goalData.data);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch reflection:', error);
    } finally {
      setIsLoading(false);
    }
  }, [path]);

  useEffect(() => {
    fetchReflection();
  }, [fetchReflection]);

  const handleSave = async () => {
    if (!reflection) return;

    setIsSaving(true);
    try {
      // Build content using period-specific function
      const content = buildContentFromSections(
        reflection.frontmatter.period,
        editedSections,
        reflection.frontmatter.year,
        reflection.frontmatter.quarter
      );

      const res = await fetch('/api/reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: reflection.path,
          frontmatter: reflection.frontmatter,
          content,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReflection(data.data);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to save reflection:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!reflection) {
    return (
      <div className="min-h-screen">
        <Header title="Reflection Not Found" />
        <div className="p-6">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">
                This reflection could not be found.
              </p>
              <Button onClick={() => router.push('/reflect')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Reflections
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { frontmatter, sections } = reflection;
  const completionPercent = (frontmatter.completionRate || 0) * 100;
  const formattedDate = format(new Date(frontmatter.date), 'MMMM d, yyyy');

  return (
    <div className="min-h-screen">
      <Header
        title={reflection.title}
        subtitle={
          <Breadcrumb
            items={[
              { label: 'Reflections', href: '/reflect' },
              { label: formattedDate },
            ]}
            className="mt-1"
          />
        }
        actions={
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => router.push('/reflect')}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Overview card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={cn('capitalize', periodColors[frontmatter.period])}>
                      {frontmatter.period}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl">{reflection.title}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formattedDate}</span>
                  </div>
                </div>

                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {frontmatter.goalsTotal !== undefined && frontmatter.goalsTotal > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Goals completed</span>
                    <span className="font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      {frontmatter.goalsCompleted} / {frontmatter.goalsTotal}
                    </span>
                  </div>
                  <Progress value={completionPercent} className="h-2" />
                </div>
              )}

              {/* Linked Goal */}
              {(linkedGoal || frontmatter.linkedGoalPath) && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Linked Goal</p>
                  {linkedGoal ? (
                    <Link href={`/goals/${linkedGoal.path}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <Target className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{linkedGoal.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {linkedGoal.frontmatter.period} goal
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          View
                        </Badge>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-muted-foreground">
                      <Target className="h-5 w-5" />
                      <p className="text-sm">Linked goal not found</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reflection sections */}
          {isEditing ? (
            <div className="space-y-4">
              {sections.map((section, index) => (
                <motion.div
                  key={section.question}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-muted-foreground">
                        {section.question}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={editedSections[section.question] || ''}
                        onChange={(e) =>
                          setEditedSections((prev) => ({
                            ...prev,
                            [section.question]: e.target.value,
                          }))
                        }
                        rows={4}
                        className="resize-none"
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            sections.map((section, index) => (
              <motion.div
                key={section.question}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="mb-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-muted-foreground">
                      {section.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {section.answer.split('\n').map((line, i) => (
                        <p key={i} className="mb-2 last:mb-0">
                          {line}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
}
