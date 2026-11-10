/**
 * Config-driven industry questions (table sector_questions). A new industry or question is rows in the
 * database, not code. This module decides which questions show and turns raw form input into stored answers.
 */
export type QuestionType = 'text' | 'number' | 'select' | 'yesno' | 'multiselect';
export type Stage = 'existing' | 'new';
export type Answer = string | number | string[];
export type Answers = Record<string, Answer>;

export type Question = {
  key: string;
  label: string;
  icon: string | null;
  type: QuestionType;
  options: string[] | null;
  placeholder: string | null;
  required: boolean;
  stage: Stage | null;
  show_if: ShowIf | null;
  sort_order: number;
};

/** {"key":"custom","equals":"Custom-made"} | {"key":"x","in":["A","B"]} | {"key":"vet","notEquals":"No"} */
export type ShowIf = { key: string; equals?: Answer; notEquals?: Answer; in?: Answer[] };

export const YES_NO = ['Yes', 'No'] as const;

export function matchesShowIf(rule: ShowIf | null, answers: Answers): boolean {
  if (!rule || typeof rule !== 'object' || !rule.key) return true;
  const v = answers[rule.key];
  const has = (want: Answer) => (Array.isArray(v) ? v.includes(String(want)) : v === want || String(v) === String(want));
  if (rule.equals !== undefined) return v !== undefined && has(rule.equals);
  if (rule.notEquals !== undefined) return !(v !== undefined && has(rule.notEquals));
  if (rule.in) return v !== undefined && rule.in.some(has);
  return true;
}

/** Questions for this stage (null stage = both), whose show_if holds, in sort order. */
export function visibleQuestions(questions: Question[], stage: Stage | null, answers: Answers): Question[] {
  return [...questions]
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter((q) => q.stage === null || q.stage === stage)
    .filter((q) => matchesShowIf(q.show_if, answers));
}

export type Coerced = { ok: true; value: Answer | null } | { ok: false; error: string };

/** Raw form value(s) → stored answer. Empty → null (answer removed). Options are enforced. */
export function coerceAnswer(q: Question, raw: string[]): Coerced {
  const vals = raw.map((r) => r.trim()).filter((r) => r !== '');
  if (vals.length === 0) return { ok: true, value: null };
  switch (q.type) {
    case 'number': {
      const s = vals[0].replace(/[,\s]/g, '');
      if (!/^\d+(\.\d+)?$/.test(s)) return { ok: false, error: 'Enter a number (0 or more).' };
      const n = Number(s);
      return n > 1e9 ? { ok: false, error: 'That number looks too large.' } : { ok: true, value: n };
    }
    case 'yesno':
      return (YES_NO as readonly string[]).includes(vals[0]) ? { ok: true, value: vals[0] } : { ok: false, error: 'Choose Yes or No.' };
    case 'select':
      return q.options?.includes(vals[0]) ? { ok: true, value: vals[0] } : { ok: false, error: 'Choose one of the options.' };
    case 'multiselect': {
      const picked = [...new Set(vals)];
      return picked.every((p) => q.options?.includes(p)) ? { ok: true, value: picked } : { ok: false, error: 'Choose from the options.' };
    }
    default:
      return vals[0].length > 300 ? { ok: false, error: 'Keep it under 300 characters.' } : { ok: true, value: vals[0] };
  }
}

/**
 * Merge submitted answers into what is stored. Only visible questions are touched, so answers to questions
 * hidden by stage/show_if are kept (switching existing↔new and back loses nothing).
 */
export function applyAnswers(
  stored: Answers,
  questions: Question[],
  stage: Stage | null,
  getAll: (key: string) => string[],
  enforceRequired: boolean,
): { answers: Answers; errors: Record<string, string> } {
  const answers: Answers = { ...stored };
  const errors: Record<string, string> = {};
  // Evaluate visibility against the answers as she just entered them (show_if may depend on this screen).
  const draft: Answers = { ...stored };
  for (const q of questions) {
    const c = coerceAnswer(q, getAll(q.key));
    if (c.ok) {
      if (c.value === null) delete draft[q.key];
      else draft[q.key] = c.value;
    }
  }
  for (const q of visibleQuestions(questions, stage, draft)) {
    const c = coerceAnswer(q, getAll(q.key));
    if (!c.ok) {
      errors[q.key] = c.error;
      continue;
    }
    if (c.value === null) {
      delete answers[q.key];
      if (enforceRequired && q.required) errors[q.key] = 'Please answer this.';
    } else answers[q.key] = c.value;
  }
  return { answers, errors };
}

/** DB row (options/show_if as JSON) → Question. Unknown types fall back to text. */
export function toQuestion(r: {
  key: string; label: string; icon: string | null; type: string; options: unknown; placeholder: string | null;
  required: boolean; stage: Stage | null; show_if: unknown; sort_order: number;
}): Question {
  const types: QuestionType[] = ['text', 'number', 'select', 'yesno', 'multiselect'];
  return {
    key: r.key,
    label: r.label,
    icon: r.icon,
    type: types.includes(r.type as QuestionType) ? (r.type as QuestionType) : 'text',
    options: Array.isArray(r.options) ? r.options.map(String) : null,
    placeholder: r.placeholder,
    required: r.required,
    stage: r.stage,
    show_if: r.show_if && typeof r.show_if === 'object' ? (r.show_if as ShowIf) : null,
    sort_order: r.sort_order,
  };
}
