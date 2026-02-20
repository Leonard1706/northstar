'use client';

import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AgentMessage } from '@/lib/agent-context';

export function ChatMessage({ message }: { message: AgentMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted/40 border border-border/50 rounded-bl-md'
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm prose-stone dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="font-serif text-lg font-medium mt-4 mb-2">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="font-serif text-base font-medium mt-3 mb-1.5">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="font-medium text-sm mt-2 mb-1">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-sm leading-relaxed mb-2">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="text-sm space-y-1 mb-2 list-none pl-0">{children}</ul>
                ),
                li: ({ children }) => {
                  const text = String(children);
                  // Check if it's a task list item
                  if (text.startsWith('[ ] ') || text.startsWith('[x] ') || text.startsWith('[X] ')) {
                    const checked = text.startsWith('[x] ') || text.startsWith('[X] ');
                    const taskText = text.slice(4);
                    return (
                      <li className="flex items-start gap-2">
                        <span className={cn(
                          'flex-shrink-0 mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center',
                          checked
                            ? 'bg-primary/60 border-primary/60 text-primary-foreground'
                            : 'border-muted-foreground/30'
                        )}>
                          {checked && <span className="text-[10px]">&#10003;</span>}
                        </span>
                        <span className={cn(checked && 'line-through text-muted-foreground')}>{taskText}</span>
                      </li>
                    );
                  }
                  return <li className="flex items-start gap-2"><span className="text-muted-foreground">&#8226;</span><span>{children}</span></li>;
                },
                strong: ({ children }) => (
                  <strong className="font-semibold">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-muted-foreground">{children}</em>
                ),
                code: ({ children, className }) => {
                  const isInline = !className;
                  if (isInline) {
                    return <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">{children}</code>;
                  }
                  return <code className={className}>{children}</code>;
                },
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-primary/30 pl-3 my-2 text-muted-foreground italic">{children}</blockquote>
                ),
                hr: () => (
                  <hr className="border-border/50 my-3" />
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground">
              Brugte: {message.toolsUsed.map(t => t.replace('mcp__northstar__', '')).join(', ')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
