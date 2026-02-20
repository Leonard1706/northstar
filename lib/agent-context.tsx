'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolsUsed?: string[];
  artifacts?: AgentArtifact[];
}

export interface AgentArtifact {
  type: 'goal' | 'reflection';
  input: Record<string, unknown>;
  saved?: boolean;
}

interface AgentContextType {
  isOpen: boolean;
  toggle: () => void;
  openWithContext: (ctx: AgentOpenContext) => void;
  close: () => void;
  messages: AgentMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AgentMessage[]>>;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  openContext: AgentOpenContext | null;
  clearContext: () => void;
  resetSession: () => void;
}

export interface AgentOpenContext {
  periodType?: string;
  currentPath?: string;
  hint?: string;
  initialPrompt?: string;
}

const AgentContext = createContext<AgentContextType | null>(null);

export function AgentPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('northstar-agent-session');
    }
    return null;
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [openContext, setOpenContext] = useState<AgentOpenContext | null>(null);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const openWithContext = useCallback((ctx: AgentOpenContext) => {
    setOpenContext(ctx);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearContext = useCallback(() => {
    setOpenContext(null);
  }, []);

  const resetSession = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setOpenContext(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('northstar-agent-session');
    }
  }, []);

  // Persist sessionId to localStorage
  const handleSetSessionId = useCallback((id: string | null) => {
    setSessionId(id);
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem('northstar-agent-session', id);
      } else {
        localStorage.removeItem('northstar-agent-session');
      }
    }
  }, []);

  return (
    <AgentContext.Provider
      value={{
        isOpen,
        toggle,
        openWithContext,
        close,
        messages,
        setMessages,
        sessionId,
        setSessionId: handleSetSessionId,
        isStreaming,
        setIsStreaming,
        openContext,
        clearContext,
        resetSession,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentPanel() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgentPanel must be used within AgentPanelProvider');
  }
  return context;
}
