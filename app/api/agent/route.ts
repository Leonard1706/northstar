import { NextRequest } from 'next/server';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { northstarMcpServer } from '@/lib/agent-tools';
import { getWeek, getQuarter, getMonth, getYear } from 'date-fns';
import path from 'path';
import { readFileSync } from 'fs';

function buildSystemPrompt(context?: { periodType?: string; currentPath?: string; hint?: string }): string {
  const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
  let claudeMd = '';
  try {
    claudeMd = readFileSync(claudeMdPath, 'utf-8');
  } catch {
    // CLAUDE.md might not exist
  }

  const now = new Date();
  const week = getWeek(now, { weekStartsOn: 1 });
  const month = getMonth(now) + 1;
  const quarter = getQuarter(now);
  const year = getYear(now);

  const monthNames = ['', 'januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];

  let prompt = `${claudeMd}

# Context
Dagens dato: ${now.toISOString().split('T')[0]}
Uge: ${week}
Måned: ${monthNames[month]} (${month})
Kvartal: Q${quarter}
År: ${year}

# Data Directory Conventions
Goals are stored as markdown files with YAML frontmatter under data/goals/.
Reflections are stored under data/reflections/.
Vision files are under data/vision/.

File path patterns:
- Vision: vision/{year}.md
- Yearly: goals/{year}/yearly.md
- Quarterly: goals/{year}/q{quarter}/quarterly.md
- Monthly: goals/{year}/q{quarter}/{month_name}/monthly.md
- Weekly: goals/{year}/q{quarter}/{month_name}/week-{week_number}.md

# Instructions
Du er Leonards personlige coach og mål-guide. Du taler dansk.

Vigtige regler:
1. Brug ALTID de tilgængelige tools til at læse mål og refleksioner - gæt aldrig på indholdet.
2. Når du foreslår nye mål, PRESENTER dem først i dit svar som formateret markdown og vent på brugerens godkendelse.
3. Brug KUN writeGoal/writeReflection tools EFTER brugeren har bekræftet.
4. Hold ugentlige mål realistiske - fokuser på 5-8 opgaver fordelt på de vigtigste kategorier.
5. Skriv altid mål i "jeg-format" som affirmationer.
6. Vær direkte, ærlig og ambitiøs men realistisk.`;

  if (context?.hint) {
    prompt += `\n\n# User Context\n${context.hint}`;
  }

  if (context?.periodType) {
    prompt += `\n\nBrugeren arbejder med: ${context.periodType} mål.`;
  }

  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId, context } = body as {
      message: string;
      sessionId?: string;
      context?: { periodType?: string; currentPath?: string; hint?: string };
    };

    if (!message) {
      return new Response(JSON.stringify({ error: 'Missing message' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = buildSystemPrompt(context);
    const dataDir = path.join(process.cwd(), 'data');

    const mcpToolNames = [
      'mcp__northstar__getCurrentGoals',
      'mcp__northstar__getReflections',
      'mcp__northstar__getGoalHierarchy',
      'mcp__northstar__writeGoal',
      'mcp__northstar__writeReflection',
      'mcp__northstar__readGoalFile',
    ];

    const agentQuery = query({
      prompt: message,
      options: {
        systemPrompt,
        cwd: dataDir,
        model: 'claude-sonnet-4-6',
        tools: ['Read', 'Glob', 'Grep'],
        allowedTools: ['Read', 'Glob', 'Grep', ...mcpToolNames],
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        maxTurns: 15,
        includePartialMessages: true,
        resume: sessionId || undefined,
        mcpServers: { northstar: northstarMcpServer },
        persistSession: true,
        thinking: { type: 'disabled' },
      },
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of agentQuery) {
            switch (event.type) {
              case 'stream_event': {
                // Streaming text deltas
                const streamEvent = event.event;
                if (streamEvent.type === 'content_block_delta') {
                  const delta = streamEvent.delta;
                  if ('text' in delta) {
                    controller.enqueue(
                      encoder.encode(`event: token\ndata: ${JSON.stringify({ text: delta.text })}\n\n`)
                    );
                  }
                }
                break;
              }

              case 'assistant': {
                // Complete assistant message
                const contentBlocks = event.message.content as Array<{ type: string; text?: string; name?: string; input?: unknown }>;
                const textBlocks = contentBlocks
                  .filter((b) => b.type === 'text' && b.text)
                  .map(b => b.text!)
                  .join('\n');

                const toolUseBlocks = contentBlocks
                  .filter((b) => b.type === 'tool_use');

                // Check for write tool calls (artifacts)
                for (const toolUse of toolUseBlocks) {
                  if (toolUse.name === 'mcp__northstar__writeGoal' || toolUse.name === 'mcp__northstar__writeReflection') {
                    controller.enqueue(
                      encoder.encode(`event: artifact\ndata: ${JSON.stringify({
                        type: toolUse.name?.includes('writeGoal') ? 'goal' : 'reflection',
                        input: toolUse.input || {},
                      })}\n\n`)
                    );
                  }
                }

                controller.enqueue(
                  encoder.encode(`event: message\ndata: ${JSON.stringify({
                    text: textBlocks,
                    sessionId: event.session_id,
                  })}\n\n`)
                );
                break;
              }

              case 'tool_progress': {
                controller.enqueue(
                  encoder.encode(`event: tool_use\ndata: ${JSON.stringify({
                    toolName: event.tool_name,
                    elapsed: event.elapsed_time_seconds,
                  })}\n\n`)
                );
                break;
              }

              case 'result': {
                controller.enqueue(
                  encoder.encode(`event: done\ndata: ${JSON.stringify({
                    sessionId: event.session_id,
                    success: event.subtype === 'success',
                    numTurns: event.num_turns,
                  })}\n\n`)
                );
                break;
              }
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
