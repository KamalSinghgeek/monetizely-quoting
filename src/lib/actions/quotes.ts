'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db';
import { addMonths } from '@/lib/dates';
import { computeQuote } from '@/lib/pricing/engine';
import { percentToBps } from '@/lib/pricing/money';
import type { SelectedAddon } from '@/lib/pricing/types';
import { quoteInput } from '@/lib/validation/quote';

export type CreateQuoteResult = { ok: false; message: string };

/**
 * Validate the quote, recompute pricing from the AUTHORITATIVE catalog (never trusting
 * client-supplied prices), then snapshot the inputs + computed line items into an
 * immutable Quote and redirect to its public share URL.
 */
export async function createQuote(input: unknown): Promise<CreateQuoteResult> {
  const parsed = quoteInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Please check the form and try again' };
  }
  const data = parsed.data;

  const tier = await prisma.tier.findUnique({
    where: { id: data.tierId },
    include: { product: true },
  });
  if (!tier || tier.productId !== data.productId) {
    return { ok: false, message: 'The selected product or tier no longer exists.' };
  }

  // Resolve the selected add-ons against their TierFeature rows (server is the source of truth for price).
  const selectedIds = data.addons.map((a) => a.tierFeatureId);
  const tierFeatures = selectedIds.length
    ? await prisma.tierFeature.findMany({
        where: { id: { in: selectedIds }, tierId: data.tierId, availability: 'ADDON' },
        include: { feature: true },
      })
    : [];
  const tfById = new Map(tierFeatures.map((tf) => [tf.id, tf]));

  const addons: SelectedAddon[] = [];
  for (const sel of data.addons) {
    const tf = tfById.get(sel.tierFeatureId);
    if (!tf || tf.addonModel == null || tf.addonValue == null) {
      return { ok: false, message: 'One of the selected add-ons is no longer available on this tier.' };
    }
    addons.push({
      featureName: tf.feature.name,
      model: tf.addonModel,
      value: tf.addonValue,
      addonSeats: tf.addonModel === 'PER_SEAT' ? sel.addonSeats ?? 0 : undefined,
    });
  }

  const overallDiscountBps = percentToBps(data.overallDiscountPercent);
  const result = computeQuote({
    productName: tier.product.name,
    tierName: tier.name,
    basePriceCents: tier.basePriceCents,
    seats: data.seats,
    term: data.term,
    addons,
    overallDiscountBps,
  });

  const quoteDate = new Date();
  const validUntil = addMonths(quoteDate, 1);

  const quote = await prisma.quote.create({
    data: {
      // Crypto-strong, unguessable token for the unauthenticated public URL (~192 bits).
      shareToken: randomBytes(24).toString('base64url'),
      name: data.name,
      customerName: data.customerName,
      productId: tier.productId,
      productName: tier.product.name,
      tierName: tier.name,
      seats: data.seats,
      term: data.term,
      termMonths: result.termMonths,
      termDiscountBps: result.termDiscountBps,
      overallDiscountBps,
      subtotalCents: result.subtotalCents,
      discountCents: result.discountCents,
      totalCents: result.totalCents,
      quoteDate,
      validUntil,
      lineItems: {
        create: result.lineItems.map((li, i) => ({
          sortOrder: i,
          kind: li.kind,
          label: li.label,
          explanation: li.explanation,
          notes: li.notes,
          amountCents: li.amountCents,
        })),
      },
    },
  });

  revalidatePath('/quotes');
  redirect(`/q/${quote.shareToken}`);
}
