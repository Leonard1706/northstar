'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getYearlyReflectionSections } from '@/lib/reflection-utils';
import type { PeriodType } from '@/types';

interface ReflectionQuestion {
  id: string;
  question: string;
  placeholder: string;
}

interface ReflectionFormProps {
  questions: ReflectionQuestion[];
  periodLabel: string;
  onComplete: (answers: Record<string, string>) => Promise<void>;
  onCancel: () => void;
  periodType?: PeriodType;
  year?: number;
}

// Helper to get section title for yearly reflections
function getYearlySectionInfo(questionIndex: number, year: number): { title: string; description: string } | null {
  const prevYear = year - 1;
  const yearlyParts = getYearlyReflectionSections();
  const reflectionCount = yearlyParts.reflection.length;
  const growthCount = yearlyParts.growth.length;

  if (questionIndex === 0) {
    return {
      title: `${prevYear} Refleksioner`,
      description: `Reflektér over det forgangne år`,
    };
  } else if (questionIndex === reflectionCount) {
    return {
      title: `${year} Vækst`,
      description: `Sæt intentioner for det nye år`,
    };
  } else if (questionIndex === reflectionCount + growthCount) {
    return {
      title: 'Affirmationer',
      description: 'Bekræft dine værdier og prioriteter',
    };
  }
  return null;
}

export function ReflectionForm({
  questions,
  periodLabel,
  onComplete,
  onCancel,
  periodType,
  year,
}: ReflectionFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLastStep = currentStep === questions.length - 1;
  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  // Auto-focus and auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.max(160, textareaRef.current.scrollHeight) + 'px';
    }
  }, [currentStep]);

  const handleNext = () => {
    if (isLastStep) {
      handleSubmit();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      onCancel();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onComplete(answers);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswerChange = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.max(160, textareaRef.current.scrollHeight) + 'px';
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault();
      handleNext();
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Minimal progress indicator */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">
            {periodLabel} Reflection
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {currentStep + 1} / {questions.length}
          </span>
        </div>

        {/* Elegant progress bar */}
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          />
        </div>
      </div>

      {/* Section header for yearly reflections */}
      {periodType === 'yearly' && year && (() => {
        const sectionInfo = getYearlySectionInfo(currentStep, year);
        if (sectionInfo) {
          return (
            <motion.div
              key={`section-${currentStep}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 pb-6 border-b border-border/50"
            >
              <h2 className="font-serif text-2xl font-medium text-primary mb-1">{sectionInfo.title}</h2>
              <p className="text-sm text-muted-foreground">{sectionInfo.description}</p>
            </motion.div>
          );
        }
        return null;
      })()}

      {/* Question - Clean, focused design */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Question text */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <PenLine className="h-3 w-3 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Question {currentStep + 1}
              </span>
            </div>
            <h3 className="font-serif text-xl md:text-2xl font-medium leading-snug">
              {currentQuestion.question}
            </h3>
          </div>

          {/* Textarea - Minimal, focused writing area */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentQuestion.placeholder}
              className={cn(
                'w-full min-h-[160px] p-4 rounded-xl',
                'bg-muted/30 border border-border/50',
                'focus:bg-background focus:border-primary/30 focus:ring-2 focus:ring-primary/10',
                'resize-none text-[15px] leading-relaxed',
                'placeholder:text-muted-foreground/50',
                'transition-all duration-200 outline-none'
              )}
            />

            {/* Character hint */}
            <div className="absolute bottom-3 right-3 text-xs text-muted-foreground/50">
              ⌘ + Enter to continue
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation - Clean, minimal */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
        <button
          onClick={handleBack}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-lg',
            'text-sm text-muted-foreground',
            'hover:text-foreground hover:bg-muted/50',
            'transition-colors'
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          {currentStep === 0 ? 'Cancel' : 'Back'}
        </button>

        {/* Step dots - Only show if reasonable number */}
        {questions.length <= 12 && (
          <div className="flex items-center gap-1.5">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-200',
                  index === currentStep
                    ? 'w-6 bg-primary'
                    : answers[questions[index].id]?.trim()
                    ? 'w-1.5 bg-primary/50'
                    : 'w-1.5 bg-muted-foreground/30'
                )}
              />
            ))}
          </div>
        )}

        <Button
          onClick={handleNext}
          disabled={isSubmitting}
          size="sm"
          className="gap-1.5"
        >
          {isLastStep ? (
            <>
              {isSubmitting ? 'Saving...' : 'Complete'}
              <Check className="h-4 w-4" />
            </>
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {/* Skip - More subtle */}
      {!isLastStep && (
        <div className="text-center mt-4">
          <button
            onClick={handleNext}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            Skip this question
          </button>
        </div>
      )}
    </div>
  );
}
