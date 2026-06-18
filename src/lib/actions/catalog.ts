'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db';
import { dollarsToCents, percentToBps } from '@/lib/pricing/money';
import { featureInput, matrixSaveInput, productInput, tierInput } from '@/lib/validation/catalog';
import { fieldErrors, toNumber, type ActionState } from '@/lib/validation/result';

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

/** Foreign-key violation — e.g. the productId doesn't reference an existing product. */
function isForeignKeyViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003';
}

/** Record-not-found on update/delete. */
function isNotFound(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025';
}

/** Create a product, then go to its detail page to add tiers/features. */
export async function createProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = productInput.safeParse({
    name: formData.get('name'),
    notes: (formData.get('notes') as string)?.trim() || undefined,
  });
  if (!parsed.success) return { status: 'error', errors: fieldErrors(parsed.error) };

  const product = await prisma.product.create({
    data: { name: parsed.data.name, notes: parsed.data.notes },
  });
  revalidatePath('/catalog');
  redirect(`/catalog/${product.id}`);
}

export async function addTier(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const productId = String(formData.get('productId') ?? '');
  if (!productId) return { status: 'error', errors: { _form: 'Missing product reference.' } };
  const parsed = tierInput.safeParse({
    name: formData.get('name'),
    basePriceDollars: toNumber(formData.get('basePriceDollars')),
  });
  if (!parsed.success) return { status: 'error', errors: fieldErrors(parsed.error) };

  try {
    const count = await prisma.tier.count({ where: { productId } });
    await prisma.tier.create({
      data: {
        productId,
        name: parsed.data.name,
        basePriceCents: dollarsToCents(parsed.data.basePriceDollars),
        sortOrder: count,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { status: 'error', errors: { name: 'A tier with that name already exists' } };
    if (isForeignKeyViolation(e)) return { status: 'error', errors: { _form: 'That product no longer exists.' } };
    throw e;
  }
  revalidatePath(`/catalog/${productId}`);
  return { status: 'success', message: 'Tier added' };
}

export async function addFeature(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const productId = String(formData.get('productId') ?? '');
  if (!productId) return { status: 'error', errors: { _form: 'Missing product reference.' } };
  const parsed = featureInput.safeParse({ name: formData.get('name') });
  if (!parsed.success) return { status: 'error', errors: fieldErrors(parsed.error) };

  try {
    const count = await prisma.feature.count({ where: { productId } });
    await prisma.feature.create({
      data: { productId, name: parsed.data.name, sortOrder: count },
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { status: 'error', errors: { name: 'A feature with that name already exists' } };
    if (isForeignKeyViolation(e)) return { status: 'error', errors: { _form: 'That product no longer exists.' } };
    throw e;
  }
  revalidatePath(`/catalog/${productId}`);
  return { status: 'success', message: 'Feature added' };
}

export type SaveMatrixResult = { ok: true } | { ok: false; message: string };

/**
 * Persist the feature×tier matrix. Called directly from the client editor with a
 * structured payload. `addonValue` arrives in the analyst's units (dollars for
 * fixed/per-seat, percent for percentage) and is converted to cents / basis points.
 */
export async function saveMatrix(input: unknown): Promise<SaveMatrixResult> {
  const parsed = matrixSaveInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid matrix data' };
  }
  const { productId, cells } = parsed.data;

  // Integrity: every cell's tier and feature must actually belong to this product
  // (the DB foreign keys only guarantee they exist somewhere).
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { tiers: { select: { id: true } }, features: { select: { id: true } } },
  });
  if (!product) return { ok: false, message: 'Product not found.' };
  const tierIds = new Set(product.tiers.map((t) => t.id));
  const featureIds = new Set(product.features.map((f) => f.id));
  if (cells.some((c) => !tierIds.has(c.tierId) || !featureIds.has(c.featureId))) {
    return { ok: false, message: 'Matrix contains a tier or feature that is not part of this product.' };
  }

  await prisma.$transaction(
    cells.map((cell) => {
      const isAddon = cell.availability === 'ADDON';
      const model = isAddon ? cell.addonModel ?? null : null;
      const value =
        isAddon && model != null
          ? model === 'PERCENT_OF_PRODUCT'
            ? percentToBps(cell.addonValue as number)
            : dollarsToCents(cell.addonValue as number)
          : null;

      return prisma.tierFeature.upsert({
        where: { tierId_featureId: { tierId: cell.tierId, featureId: cell.featureId } },
        create: {
          tierId: cell.tierId,
          featureId: cell.featureId,
          availability: cell.availability,
          addonModel: model,
          addonValue: value,
        },
        update: { availability: cell.availability, addonModel: model, addonValue: value },
      });
    }),
  );

  revalidatePath(`/catalog/${productId}`);
  revalidatePath(`/catalog/${productId}/matrix`);
  return { ok: true };
}

// --- Editing existing catalog entries (create + edit; deletion is intentionally out of scope) ---

export async function updateProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const productId = String(formData.get('productId') ?? '');
  if (!productId) return { status: 'error', errors: { _form: 'Missing product reference.' } };
  const parsed = productInput.safeParse({
    name: formData.get('name'),
    notes: (formData.get('notes') as string)?.trim() || undefined,
  });
  if (!parsed.success) return { status: 'error', errors: fieldErrors(parsed.error) };

  try {
    await prisma.product.update({
      where: { id: productId },
      data: { name: parsed.data.name, notes: parsed.data.notes ?? null },
    });
  } catch (e) {
    if (isNotFound(e)) return { status: 'error', errors: { _form: 'That product no longer exists.' } };
    throw e;
  }
  revalidatePath('/catalog');
  revalidatePath(`/catalog/${productId}`);
  return { status: 'success', message: 'Saved' };
}

export async function updateTier(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const tierId = String(formData.get('tierId') ?? '');
  const productId = String(formData.get('productId') ?? '');
  if (!tierId) return { status: 'error', errors: { _form: 'Missing tier reference.' } };
  const parsed = tierInput.safeParse({
    name: formData.get('name'),
    basePriceDollars: toNumber(formData.get('basePriceDollars')),
  });
  if (!parsed.success) return { status: 'error', errors: fieldErrors(parsed.error) };

  try {
    await prisma.tier.update({
      where: { id: tierId },
      data: { name: parsed.data.name, basePriceCents: dollarsToCents(parsed.data.basePriceDollars) },
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { status: 'error', errors: { name: 'A tier with that name already exists' } };
    if (isNotFound(e)) return { status: 'error', errors: { _form: 'That tier no longer exists.' } };
    throw e;
  }
  if (productId) revalidatePath(`/catalog/${productId}`);
  return { status: 'success', message: 'Saved' };
}

export async function updateFeature(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const featureId = String(formData.get('featureId') ?? '');
  const productId = String(formData.get('productId') ?? '');
  if (!featureId) return { status: 'error', errors: { _form: 'Missing feature reference.' } };
  const parsed = featureInput.safeParse({ name: formData.get('name') });
  if (!parsed.success) return { status: 'error', errors: fieldErrors(parsed.error) };

  try {
    await prisma.feature.update({ where: { id: featureId }, data: { name: parsed.data.name } });
  } catch (e) {
    if (isUniqueViolation(e)) return { status: 'error', errors: { name: 'A feature with that name already exists' } };
    if (isNotFound(e)) return { status: 'error', errors: { _form: 'That feature no longer exists.' } };
    throw e;
  }
  if (productId) revalidatePath(`/catalog/${productId}`);
  return { status: 'success', message: 'Saved' };
}
