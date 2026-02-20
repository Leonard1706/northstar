'use client';

import { useCallback, useRef, useState } from 'react';
import { useAgentPanel, type AgentMessage, type AgentArtifact } from '@/lib/agent-context';

interface SendMessageOptions {
  context?: {
    periodType?: string;
    currentPath?: string;
    hint?: string;
  };
}

export function useAgentChat() {
  const {
    messages,
    setMessages,
    sessionId,
    setSessionId,
    isStreaming,
    setIsStreaming,
    openContext,
    clearContext,
    resetSession,
  } = useAgentPanel();

  const [currentStreamingText, setCurrentStreamingText] = useState('');
  const [currentToolUse, setCurrentToolUse] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text: string, options?: SendMessageOptions) => {
    if (isStreaming || !text.trim()) return;

    // Add user message
    const userMessage: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setCurrentStreamingText('');
    setCurrentToolUse(null);

    // Prepare context
    const context = options?.context || (openContext ? {
      periodType: openContext.periodType,
      currentPath: openContext.currentPath,
      hint: openContext.hint,
    } : undefined);

    // Clear the open context after first use
    if (openContext) {
      clearContext();
    }

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          sessionId,
          context,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let newSessionId: string | null = null;
      let buffer = '';
      const toolsUsed: string[] = [];
      const artifacts: AgentArtifact[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        let eventType = '';
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7);
          } else if (line.startsWith('data: ')) {
            eventData = line.slice(6);

            try {
              const parsed = JSON.parse(eventData);

              switch (eventType) {
                case 'token':
                  fullText += parsed.text;
                  setCurrentStreamingText(fullText);
                  break;

                case 'message':
                  // Complete message - use the full text from streaming
                  if (parsed.text && !fullText) {
                    fullText = parsed.text;
                  }
                  if (parsed.sessionId) {
                    newSessionId = parsed.sessionId;
                  }
                  break;

                case 'tool_use':
                  setCurrentToolUse(parsed.toolName);
                  if (parsed.toolName && !toolsUsed.includes(parsed.toolName)) {
                    toolsUsed.push(parsed.toolName);
                  }
                  break;

                case 'artifact':
                  artifacts.push({
                    type: parsed.type,
                    input: parsed.input,
                  });
                  break;

                case 'done':
                  if (parsed.sessionId) {
                    newSessionId = parsed.sessionId;
                  }
                  break;

                case 'error':
                  throw new Error(parsed.error);
              }
            } catch (e) {
              if (e instanceof SyntaxError) {
                // Incomplete JSON, skip
              } else {
                throw e;
              }
            }

            eventType = '';
            eventData = '';
          }
        }
      }

      // Add assistant message
      if (fullText) {
        const assistantMessage: AgentMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: fullText,
          timestamp: new Date(),
          toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
          artifacts: artifacts.length > 0 ? artifacts : undefined,
        };

        setMessages(prev => [...prev, assistantMessage]);
      }

      // Update session ID
      if (newSessionId) {
        setSessionId(newSessionId);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;

      const errorMessage: AgentMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Der opstod en fejl: ${(error as Error).message}. Prøv igen.`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
      setCurrentStreamingText('');
      setCurrentToolUse(null);
      abortRef.current = null;
    }
  }, [isStreaming, sessionId, openContext, setMessages, setSessionId, setIsStreaming, clearContext]);

  const stopStreaming = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  return {
    messages,
    sendMessage,
    isStreaming,
    currentStreamingText,
    currentToolUse,
    resetSession,
    stopStreaming,
  };
}
