import type { ZodError } from 'zod';

export type FieldErrors = Record<string, string>;

/**
 * Build a `{ field: message }` map from a ZodError. Uses `error.issues` directly
 * (stable across zod versions) rather than `.flatten()`. Nested paths are joined
 * with dots; top-level errors use the `_form` key.
 */
export function fieldErrors(error: ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_form';
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/** Standard result shape for server actions driven by `useActionState`. */
export type ActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  errors?: FieldErrors;
};

export const idleState: ActionState = { status: 'idle' };

/** Parse a FormData value into a number, returning NaN for missing/blank/invalid input. */
export function toNumber(value: FormDataEntryValue | null | undefined): number {
  if (value == null) return NaN;
  const s = String(value).trim();
  if (s === '') return NaN;
  return Number(s);
}
