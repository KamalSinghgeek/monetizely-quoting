/**
 * Seed the example catalog from docs/reference/catalog-example.xlsx (Acme Analytics —
 * "Analytics Suite"). Idempotent: re-running replaces the seeded product. Any saved
 * quotes are preserved (their snapshot is independent of the catalog).
 */
import { PrismaClient } from '@prisma/client';
import type { AddonPricingModel, FeatureAvailability } from '@prisma/client';

const prisma = new PrismaClient();

const PRODUCT_NAME = 'Analytics Suite';

const TIERS = [
  { name: 'Starter', basePriceCents: 2_500, sortOrder: 0 },
  { name: 'Growth', basePriceCents: 5_000, sortOrder: 1 },
  { name: 'Enterprise', basePriceCents: 10_000, sortOrder: 2 },
];

type Cell =
  | { availability: FeatureAvailability } // INCLUDED | NOT_AVAILABLE
  | { availability: 'ADDON'; addonModel: AddonPricingModel; addonValue: number };

const inc: Cell = { availability: 'INCLUDED' };
const na: Cell = { availability: 'NOT_AVAILABLE' };
const addon = (addonModel: AddonPricingModel, addonValue: number): Cell => ({
  availability: 'ADDON',
  addonModel,
  addonValue,
});

// Feature matrix + add-on pricing, exactly as in catalog-example.xlsx.
// Add-on values: cents for FIXED_MONTHLY/PER_SEAT, basis points for PERCENT_OF_PRODUCT.
const FEATURES: { name: string; cells: Record<string, Cell> }[] = [
  { name: 'Real-time dashboards', cells: { Starter: inc, Growth: inc, Enterprise: inc } },
  { name: 'Custom reports', cells: { Starter: na, Growth: inc, Enterprise: inc } },
  {
    name: 'API access',
    cells: { Starter: na, Growth: addon('PER_SEAT', 5_000), Enterprise: inc },
  },
  {
    name: 'Single Sign-On (SSO)',
    cells: { Starter: na, Growth: addon('FIXED_MONTHLY', 20_000), Enterprise: inc },
  },
  {
    name: 'Advanced anomaly detection',
    cells: { Starter: na, Growth: addon('PERCENT_OF_PRODUCT', 1_000), Enterprise: inc },
  },
  { name: 'Dedicated support', cells: { Starter: na, Growth: na, Enterprise: inc } },
  {
    name: 'White-label option',
    cells: {
      Starter: na,
      Growth: addon('FIXED_MONTHLY', 50_000),
      Enterprise: addon('FIXED_MONTHLY', 30_000), // cheaper rate for Enterprise
    },
  },
  {
    name: 'Custom integrations',
    cells: {
      Starter: na,
      Growth: addon('FIXED_MONTHLY', 100_000),
      Enterprise: addon('PERCENT_OF_PRODUCT', 500),
    },
  },
];

async function main() {
  // Idempotent: remove any prior seeded product (cascades to tiers/features/cells).
  const existing = await prisma.product.findFirst({ where: { name: PRODUCT_NAME } });
  if (existing) {
    await prisma.product.delete({ where: { id: existing.id } });
  }

  const product = await prisma.product.create({
    data: {
      name: PRODUCT_NAME,
      notes: 'Example catalog (Acme Analytics) — seeded from catalog-example.xlsx.',
      tiers: { create: TIERS },
      features: {
        create: FEATURES.map((f, i) => ({ name: f.name, sortOrder: i })),
      },
    },
    include: { tiers: true, features: true },
  });

  const tierByName = new Map(product.tiers.map((t) => [t.name, t]));
  const featureByName = new Map(product.features.map((f) => [f.name, f]));

  const tierFeatures = FEATURES.flatMap((feature) =>
    Object.entries(feature.cells).map(([tierName, cell]) => {
      const tier = tierByName.get(tierName)!;
      const feat = featureByName.get(feature.name)!;
      return {
        tierId: tier.id,
        featureId: feat.id,
        availability: cell.availability as FeatureAvailability,
        addonModel: 'addonModel' in cell ? cell.addonModel : null,
        addonValue: 'addonValue' in cell ? cell.addonValue : null,
      };
    }),
  );

  await prisma.tierFeature.createMany({ data: tierFeatures });

  console.log(
    `Seeded "${product.name}" with ${product.tiers.length} tiers, ` +
      `${product.features.length} features, ${tierFeatures.length} matrix cells.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
