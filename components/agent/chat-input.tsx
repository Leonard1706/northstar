'use client';

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isStreaming: boolean;
  initialValue?: string;
}

export function ChatInput({ onSend, onStop, isStreaming, initialValue }: ChatInputProps) {
  const [value, setValue] = useState(initialValue || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
    }
  }, [initialValue]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [value]);

  const handleSend = () => {
    if (isStreaming) {
      onStop?.();
      return;
    }
    if (!value.trim()) return;
    onSend(value.trim());
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative flex items-end gap-2 p-3 border-t border-border/50 bg-card/50">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Skriv en besked..."
        disabled={isStreaming}
        rows={1}
        className={cn(
          'flex-1 resize-none rounded-xl px-4 py-2.5',
          'bg-background border border-border/50',
          'text-sm placeholder:text-muted-foreground/50',
          'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30',
          'transition-all duration-200',
          'disabled:opacity-50',
          'max-h-40',
        )}
      />
      <button
        onClick={handleSend}
        disabled={!isStreaming && !value.trim()}
        className={cn(
          'flex-shrink-0 h-10 w-10 rounded-xl',
          'flex items-center justify-center',
          'transition-all duration-200',
          isStreaming
            ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
            : value.trim()
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground',
          'disabled:opacity-30',
        )}
      >
        {isStreaming ? (
          <Square className="h-4 w-4" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
