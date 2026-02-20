'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentPanel } from '@/lib/agent-context';
import { useAgentChat } from '@/hooks/use-agent-chat';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { QuickPrompts } from './quick-prompts';
import { StreamingIndicator } from './streaming-indicator';
import { ToolIndicator } from './tool-indicator';
import { ArtifactPreview } from './artifact-preview';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function AgentPanel() {
  const { isOpen, close, toggle, openContext, resetSession: contextReset } = useAgentPanel();
  const {
    messages,
    sendMessage,
    isStreaming,
    currentStreamingText,
    currentToolUse,
    resetSession,
    stopStreaming,
  } = useAgentChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStreamingText]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close, toggle]);

  // Send initial prompt from context
  useEffect(() => {
    if (isOpen && openContext?.initialPrompt && messages.length === 0) {
      sendMessage(openContext.initialPrompt);
    }
  }, [isOpen, openContext?.initialPrompt, messages.length, sendMessage]);

  const handleQuickPrompt = useCallback((prompt: string) => {
    sendMessage(prompt);
  }, [sendMessage]);

  const handleReset = useCallback(() => {
    resetSession();
    contextReset();
  }, [resetSession, contextReset]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={close}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'fixed right-0 top-0 z-50 h-screen',
              'w-full lg:w-[420px]',
              'bg-background border-l border-border/50',
              'flex flex-col',
              'shadow-xl shadow-black/5',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-border/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="font-serif text-lg font-medium">Coach</h2>
                {isStreaming && <StreamingIndicator />}
              </div>

              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={handleReset}
                    className={cn(
                      'h-8 w-8 rounded-lg flex items-center justify-center',
                      'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                      'transition-colors',
                    )}
                    title="Ny samtale"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={close}
                  className={cn(
                    'h-8 w-8 rounded-lg flex items-center justify-center',
                    'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                    'transition-colors',
                  )}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {messages.length === 0 && !isStreaming ? (
                <QuickPrompts onSelect={handleQuickPrompt} />
              ) : (
                <div className="px-4 py-4 space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="space-y-2">
                      <ChatMessage message={message} />
                      {message.artifacts?.map((artifact, i) => (
                        <div key={i} className={cn('ml-0', message.role === 'user' ? 'mr-0' : 'max-w-[85%]')}>
                          <ArtifactPreview artifact={artifact} />
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Streaming state */}
                  {isStreaming && (
                    <div className="space-y-2">
                      {currentToolUse && (
                        <ToolIndicator toolName={currentToolUse} />
                      )}
                      {currentStreamingText && (
                        <div className="flex justify-start">
                          <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-muted/40 border border-border/50">
                            <div className="prose prose-sm prose-stone dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {currentStreamingText}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      )}
                      {!currentStreamingText && !currentToolUse && (
                        <div className="flex justify-start">
                          <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-muted/40 border border-border/50">
                            <StreamingIndicator />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <ChatInput
              onSend={sendMessage}
              onStop={stopStreaming}
              isStreaming={isStreaming}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
