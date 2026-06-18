'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import {
  addFeature,
  addTier,
  createProduct,
  updateFeature,
  updateProduct,
  updateTier,
} from '@/lib/actions/catalog';
import { Button, Field, Input, Textarea } from '@/components/ui';
import { centsToDollars, formatUsd } from '@/lib/pricing/money';
import { idleState, type ActionState } from '@/lib/validation/result';

/** Reset the form element after each successful submit (deps on the state object so it fires every time). */
function useResetOnSuccess(state: ActionState, ref: React.RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    if (state.status === 'success') ref.current?.reset();
  }, [state, ref]);
}

/* ---------------------------------------------------------------- Create product */

export function ProductForm() {
  const [state, formAction, pending] = useActionState(createProduct, idleState);
  const errors = state.status === 'error' ? state.errors : undefined;
  return (
    <form action={formAction} className="space-y-4">
      <Field label="Product name" htmlFor="name" error={errors?.name}>
        <Input id="name" name="name" placeholder="Analytics Suite" autoFocus required maxLength={100} />
      </Field>
      <Field label="Notes (optional)" htmlFor="notes" error={errors?.notes}>
        <Textarea id="notes" name="notes" placeholder="Internal notes about this product" maxLength={1000} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create product'}
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------ Edit product */

export function EditProductForm({
  productId,
  name,
  notes,
}: {
  productId: string;
  name: string;
  notes: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateProduct, idleState);
  const errors = state.status === 'error' ? state.errors : undefined;
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="productId" defaultValue={productId} />
      <Field label="Product name" htmlFor="ep-name" error={errors?.name}>
        <Input id="ep-name" name="name" defaultValue={name} required maxLength={100} />
      </Field>
      <Field label="Notes (optional)" htmlFor="ep-notes" error={errors?.notes}>
        <Textarea id="ep-notes" name="notes" defaultValue={notes ?? ''} maxLength={1000} />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? 'Saving…' : 'Save details'}
        </Button>
        {state.status === 'success' ? <span className="text-sm font-medium text-green-700">Saved ✓</span> : null}
        {errors?._form ? <span className="text-sm text-red-600">{errors._form}</span> : null}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------- Add tier/feature */

export function AddTierForm({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState(addTier, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  useResetOnSuccess(state, formRef);
  const errors = state.status === 'error' ? state.errors : undefined;

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-start gap-3">
      {/* defaultValue (uncontrolled) so form.reset() restores it instead of clearing it. */}
      <input type="hidden" name="productId" defaultValue={productId} />
      <div className="min-w-40 flex-1">
        <Input name="name" placeholder="Tier name (e.g. Growth)" required maxLength={80} aria-label="New tier name" />
        {errors?.name ? <p className="mt-1 text-sm text-red-600">{errors.name}</p> : null}
      </div>
      <div className="w-40">
        <Input
          name="basePriceDollars"
          type="number"
          min={0}
          step="0.01"
          placeholder="Price / seat / mo"
          required
          aria-label="New tier price (USD)"
        />
        {errors?.basePriceDollars ? <p className="mt-1 text-sm text-red-600">{errors.basePriceDollars}</p> : null}
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Adding…' : 'Add tier'}
      </Button>
      {errors?._form ? <p className="w-full text-sm text-red-600">{errors._form}</p> : null}
    </form>
  );
}

export function AddFeatureForm({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState(addFeature, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  useResetOnSuccess(state, formRef);
  const errors = state.status === 'error' ? state.errors : undefined;

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-start gap-3">
      <input type="hidden" name="productId" defaultValue={productId} />
      <div className="min-w-40 flex-1">
        <Input
          name="name"
          placeholder="Feature name (e.g. Single Sign-On)"
          required
          maxLength={120}
          aria-label="New feature name"
        />
        {errors?.name ? <p className="mt-1 text-sm text-red-600">{errors.name}</p> : null}
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Adding…' : 'Add feature'}
      </Button>
      {errors?._form ? <p className="w-full text-sm text-red-600">{errors._form}</p> : null}
    </form>
  );
}

/* -------------------------------------------------- Edit existing tier / feature (toggle) */

export function EditableTierRow({
  productId,
  tier,
}: {
  productId: string;
  tier: { id: string; name: string; basePriceCents: number };
}) {
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3 py-2.5">
        <span className="font-medium text-slate-900">{tier.name}</span>
        <div className="flex items-center gap-3">
          <span className="tabular-nums text-sm text-slate-600">{formatUsd(tier.basePriceCents)} / seat / mo</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      </div>
    );
  }
  return <TierEditForm productId={productId} tier={tier} onClose={() => setEditing(false)} />;
}

// useActionState lives in the edit form, which is only mounted while a row is actually being
// edited — so the product page keeps just a couple of live action hooks during normal use.
function TierEditForm({
  productId,
  tier,
  onClose,
}: {
  productId: string;
  tier: { id: string; name: string; basePriceCents: number };
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateTier, idleState);
  const errors = state.status === 'error' ? state.errors : undefined;
  useEffect(() => {
    if (state.status === 'success') onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2 py-2.5">
      <input type="hidden" name="tierId" defaultValue={tier.id} />
      <input type="hidden" name="productId" defaultValue={productId} />
      <Input
        name="name"
        defaultValue={tier.name}
        required
        maxLength={80}
        aria-label="Tier name"
        className="min-w-32 flex-1"
      />
      <Input
        name="basePriceDollars"
        type="number"
        min={0}
        step="0.01"
        defaultValue={centsToDollars(tier.basePriceCents)}
        required
        aria-label="Tier base price (USD)"
        className="w-28"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Saving…' : 'Save'}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onClose}>
        Cancel
      </Button>
      {errors?.name ? <span className="w-full text-sm text-red-600">{errors.name}</span> : null}
      {errors?.basePriceDollars ? <span className="w-full text-sm text-red-600">{errors.basePriceDollars}</span> : null}
      {errors?._form ? <span className="w-full text-sm text-red-600">{errors._form}</span> : null}
    </form>
  );
}

export function EditableFeatureRow({
  productId,
  feature,
}: {
  productId: string;
  feature: { id: string; name: string };
}) {
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3 py-2.5">
        <span className="font-medium text-slate-900">{feature.name}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Edit
        </Button>
      </div>
    );
  }
  return <FeatureEditForm productId={productId} feature={feature} onClose={() => setEditing(false)} />;
}

function FeatureEditForm({
  productId,
  feature,
  onClose,
}: {
  productId: string;
  feature: { id: string; name: string };
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateFeature, idleState);
  const errors = state.status === 'error' ? state.errors : undefined;
  useEffect(() => {
    if (state.status === 'success') onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2 py-2.5">
      <input type="hidden" name="featureId" defaultValue={feature.id} />
      <input type="hidden" name="productId" defaultValue={productId} />
      <Input
        name="name"
        defaultValue={feature.name}
        required
        maxLength={120}
        aria-label="Feature name"
        className="min-w-32 flex-1"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Saving…' : 'Save'}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onClose}>
        Cancel
      </Button>
      {errors?.name ? <span className="w-full text-sm text-red-600">{errors.name}</span> : null}
      {errors?._form ? <span className="w-full text-sm text-red-600">{errors._form}</span> : null}
    </form>
  );
}
