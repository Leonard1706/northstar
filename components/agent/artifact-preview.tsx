'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, RefreshCw } from 'lucide-react';
import type { AgentArtifact } from '@/lib/agent-context';

interface ArtifactPreviewProps {
  artifact: AgentArtifact;
  onSaved?: () => void;
}

export function ArtifactPreview({ artifact, onSaved }: ArtifactPreviewProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(artifact.saved || false);

  if (saved) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg',
        'bg-primary/5 border border-primary/20 text-primary',
        'text-xs',
      )}>
        <Check className="h-3 w-3" />
        <span>{artifact.type === 'goal' ? 'Mål gemt' : 'Refleksion gemt'}</span>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      // The artifact was already saved by the agent's writeGoal tool call
      // This is just a confirmation UI
      setSaved(true);
      artifact.saved = true;
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const periodType = artifact.input?.periodType as string || '';
  const badgeClass = `badge-${periodType}`;

  return (
    <div className={cn(
      'rounded-xl border border-border/50 bg-card/50 p-3',
      'space-y-2',
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn(
            'inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border',
            badgeClass,
          )}>
            {periodType}
          </span>
          <span className="text-xs text-muted-foreground">
            {artifact.type === 'goal' ? 'Mål oprettet' : 'Refleksion oprettet'}
          </span>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg',
          'bg-primary text-primary-foreground text-xs font-medium',
          'hover:bg-primary/90 transition-colors',
          'disabled:opacity-50',
        )}
      >
        {saving ? (
          <RefreshCw className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3" />
        )}
        <span>Bekræft</span>
      </button>
    </div>
  );
}
