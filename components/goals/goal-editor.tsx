'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Goal, Task } from '@/types';

interface GoalEditorProps {
  goal: Goal;
  onSave: (content: string) => Promise<void>;
  onCancel: () => void;
}

interface EditableTask extends Task {
  isNew?: boolean;
}

export function GoalEditor({ goal, onSave, onCancel }: GoalEditorProps) {
  const [title, setTitle] = useState(goal.title);
  const [tasks, setTasks] = useState<EditableTask[]>(goal.tasks);
  const [notes, setNotes] = useState(() => {
    // Extract notes section from content
    const notesMatch = goal.content.match(/## Notes\n([\s\S]*?)(?=\n##|$)/);
    return notesMatch ? notesMatch[1].trim() : '';
  });
  const [isSaving, setIsSaving] = useState(false);

  // Group tasks by section
  const tasksBySection = tasks.reduce<Record<string, EditableTask[]>>((acc, task) => {
    const section = task.section || 'General';
    if (!acc[section]) acc[section] = [];
    acc[section].push(task);
    return acc;
  }, {});

  const handleTaskToggle = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  }, []);

  const handleTaskTextChange = useCallback((taskId: string, text: string) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, text } : t)));
  }, []);

  const handleAddTask = useCallback((section: string) => {
    const newTask: EditableTask = {
      id: `task-new-${Date.now()}`,
      text: '',
      completed: false,
      section,
      isNew: true,
    };
    setTasks((prev) => [...prev, newTask]);
  }, []);

  const handleRemoveTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Rebuild content from editor state
      let content = `# ${title}\n\n`;

      // Group tasks by section for output
      const sections = Object.entries(tasksBySection);

      if (sections.length > 0) {
        content += '## Focus Areas\n\n';
        for (const [section, sectionTasks] of sections) {
          content += `### ${section}\n`;
          for (const task of sectionTasks) {
            if (task.text.trim()) {
              content += `- [${task.completed ? 'x' : ' '}] ${task.text}\n`;
            }
          }
          content += '\n';
        }
      }

      content += '## Notes\n\n' + notes;

      await onSave(content);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Edit Goal</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Title */}
        <div>
          <label className="text-sm font-medium mb-2 block">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-semibold"
          />
        </div>

        {/* Tasks by Section */}
        {Object.entries(tasksBySection).map(([section, sectionTasks]) => (
          <motion.div
            key={section}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm text-muted-foreground">{section}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAddTask(section)}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Task
              </Button>
            </div>

            <div className="space-y-2">
              {sectionTasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={task.isNew ? { opacity: 0, y: -10 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  className="group flex items-center gap-3 rounded-lg border bg-card p-2"
                >
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => handleTaskToggle(task.id)}
                  />
                  <Input
                    value={task.text}
                    onChange={(e) => handleTaskTextChange(task.id, e.target.value)}
                    placeholder="Task description..."
                    className={cn(
                      'flex-1 border-0 bg-transparent p-0 h-auto focus-visible:ring-0',
                      task.completed && 'line-through text-muted-foreground'
                    )}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Notes */}
        <div>
          <label className="text-sm font-medium mb-2 block">Notes</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional context or thoughts..."
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  );
}
