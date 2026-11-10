import 'server-only';
import { generateText } from 'ai';
import type { PlanContext } from './context';
import { PROMPT_VERSION, SYSTEM_PROMPT, buildUserPrompt, narrativeSchema, numberGuard, type Narrative } from './prompts';
import { templateNarrative } from './template';

/**
 * Writes the plan's prose. Server-only; the browser never talks to an AI service.
 *
 *   AI_PROVIDER unset / "none"  → standard wording (free, nothing leaves the system)          ← default
 *   AI_PROVIDER = "gateway"     → Vercel AI Gateway (auth on Vercel via OIDC; or AI_GATEWAY_API_KEY)
 *   AI_MODEL                    → gateway model id, default "anthropic/claude-sonnet-5-5"
 *
 * The AI only writes prose from the frozen context; numberGuard checks every number it uses. One corrective
 * retry; anything still unverified becomes a warning for the reviewer. If the AI fails, standard wording is used.
 */
export const aiEnabled = () => process.env.AI_PROVIDER === 'gateway';
export const aiModel = () => process.env.AI_MODEL || 'anthropic/claude-sonnet-5-5';

export type NarrativeResult = {
  narrative: Narrative;
  warnings: string[];
  model: string; // "standard-wording" or the AI model id
  promptVersion: string;
  usage?: { inputTokens: number; outputTokens: number };
};

function parseJson(text: string): unknown {
  const t = text.replace(/```json|```/g, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  return JSON.parse(start >= 0 && end > start ? t.slice(start, end + 1) : t);
}

const unverified = (bad: string[]) => bad.map((w) => `Number "${w}" in the text is not in the verified data. Please check it.`);

export async function writeNarrative(context: PlanContext): Promise<NarrativeResult> {
  const standard = (): NarrativeResult => ({
    narrative: templateNarrative(context),
    warnings: [],
    model: 'standard-wording',
    promptVersion: 'standard-v1',
  });
  if (!aiEnabled()) return standard();

  const model = aiModel();
  let inputTokens = 0;
  let outputTokens = 0;
  async function draft(extra?: string): Promise<Narrative> {
    const res = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(context) + (extra ? `\n\n${extra}` : ''),
      maxOutputTokens: 4000,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(45_000),
    });
    inputTokens += res.usage.inputTokens ?? 0;
    outputTokens += res.usage.outputTokens ?? 0;
    return narrativeSchema.parse(parseJson(res.text));
  }

  try {
    let narrative = await draft();
    let bad = numberGuard(narrative, context);
    if (bad.length) {
      narrative = await draft(
        `Your previous draft contained numbers not present in the input: ${bad.join(', ')}. Rewrite without them. Use only numbers from the input.`,
      );
      bad = numberGuard(narrative, context);
    }
    return { narrative, warnings: unverified(bad), model, promptVersion: PROMPT_VERSION, usage: { inputTokens, outputTokens } };
  } catch (e) {
    // Never block the operator on an AI outage: fall back to the standard wording and say so.
    console.error('AI narrative failed; using standard wording', e instanceof Error ? e.name : 'error');
    const r = standard();
    r.warnings = ['The AI writer was unavailable, so the standard wording was used. You can regenerate later.'];
    return r;
  }
}
