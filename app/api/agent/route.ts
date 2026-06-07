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
Goals: data/goals/ · Reflections: data/reflections/ · Vision: data/vision/.

Filstier:
- Vision: vision/{år}.md
- År: goals/{år}/yearly.md
- Kvartal: goals/{år}/q{kvartal}/quarterly.md
- Måned: goals/{år}/q{kvartal}/{månedsnavn}/monthly.md
- Uge (program): goals/{år}/q{kvartal}/{månedsnavn}/week-{ugenr}.md
- Refleksioner (fladt pr. år): reflections/{år}/week-{ugenr}-reflection.md · {månedsnavn}-reflection.md · q{kvartal}-reflection.md · yearly-reflection.md

# Struktur (NY model — vigtig)
Måneden er den mindste planlægningsenhed. Ugen er IKKE længere selvstændige mål, men et konkret PROGRAM kogt ned fra månedens mål.

MÅNEDLIGE MÅL dækker alle seks livsområder, og hver opgave tagges med sit område:
#mindset (personlig udvikling), #arbejde, #relationer, #læring, #fitness, #oplevelser.
Eksempel: "- [ ] Træn 4x styrketræning ugentligt #fitness".
Sørg ALTID for at ikke-arbejdsområderne (relationer, oplevelser, fitness, læring) også har konkrete opgaver — ellers æder arbejdet alt.

UGENS PROGRAM er tidssat og fordelt på ugedage. Brug ### som ugedags-overskrifter (Mandag, Tirsdag, Onsdag, Torsdag, Fredag, Lørdag, Søndag, samt evt. Fleksibel for opgaver uden fast dag). Hver linje:
- [ ] HH:MM Kort handling #område
(tidspunkt og #område er valgfrit men anbefalet). Eksempel:

### Mandag
- [ ] 07:00 Styrketræning #fitness
- [ ] 21:00 Læs 80.000 hours, 30 min #læring
### Onsdag
- [ ] 07:00 Styrketræning #fitness
- [ ] 12:30 Start én samtale med en fremmed #relationer
### Fredag
- [ ] 07:00 Styrketræning #fitness
### Fleksibel
- [ ] Ring til familien #relationer

Hold programmet realistisk: typisk 8–15 delopgaver fordelt over ugen — ikke alt på én dag. Læg faste vaner (fx træning) på samme tid på faste dage.

# Refleksion
- Ugentlig refleksion er KORT: kun to spørgsmål — "Har jeg nået mine mål?" (hvorfor/hvorfor ikke) og "Hvad har jeg lært?". Opgaverne krydses af i selve programmet, så spørg ikke til hver enkelt.
- Månedlig refleksion er dybere (fire spørgsmål). Brug den ugentlige refleksion som kontekst, når du planlægger næste uges program.

# Instructions
Du er Leonards personlige coach og mål-guide. Du taler dansk og er direkte, ærlig og ambitiøs men realistisk — intet filter; pres ham når det gavner væksten.

Vigtige regler:
1. Brug ALTID de tilgængelige tools til at læse mål og refleksioner — gæt aldrig. Når du planlægger ugen, så læs både de nuværende månedlige mål OG den seneste ugerefleksion.
2. Når du foreslår mål eller et ugeprogram, PRÆSENTÉR det først som formateret markdown og vent på Leonards godkendelse.
3. Brug KUN writeGoal/writeReflection EFTER godkendelse. Ugeprogram: periodType "weekly" i ### dag-formatet ovenfor. Månedlige mål: periodType "monthly" med #område-tags.
4. Skriv altid i "jeg-format" som affirmationer.
5. Beskyt balancen: hvis et livsområde har været forsømt (fx relationer/oplevelser/fitness/læring), så giv det plads i programmet — og sig det højt.`;

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

    // Build env for the Agent SDK subprocess.
    // The SDK spawns a Claude Code process that needs authentication.
    // It checks (in order): ANTHROPIC_API_KEY env var, then ~/.claude/ OAuth tokens.
    const agentEnv: Record<string, string | undefined> = {
      ...process.env,
    };
    // Forward API key from .env.local if set
    if (process.env.ANTHROPIC_API_KEY) {
      agentEnv.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    }

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
        env: agentEnv,
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
