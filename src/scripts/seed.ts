/* eslint-disable no-console */
/**
 * seed.ts — Complete database seeder
 *
 * Run with:   npm run seed
 *
 * Idempotent: safe to run multiple times — skips records that already exist.
 *
 * Seeds (in order):
 *   1. IAM  — Permissions + Roles   (delegates to initializeIAMSystem)
 *   2. Users — super_admin, admin, farmer, buyer, expert, trader
 *   3. Personal Workspaces
 *   4. Organizations
 *   5. Farmer profiles
 *   6. Products (catalogue)
 *   7. Markets
 *   8. Price records
 *   9. Marketplace listings
 *  10. Notification templates
 */

import mongoose from 'mongoose';
import connectDB from '../common/config/database';
import { PasswordUtil } from '../common/utils/password';
import { initializeIAMSystem } from './initializeIAM';

// ── Models ────────────────────────────────────────────────────────────────────
import User from '../modules/users/user.model';
import PersonalWorkspace from '../modules/users/personalWorkspace.model';
import Organization from '../modules/organizations/organization.model';
import Farmer from '../modules/farmers/farmer.model';
import Product from '../modules/products/product.model';
import Market from '../modules/markets/market.model';
import Price from '../modules/prices/price.model';
import Listing from '../modules/marketplace/listing.model';
import templateService from '../modules/notifications/template.service';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function log(msg: string) { console.log(msg); }
function ok(msg: string)  { console.log(`  ✅ ${msg}`); }
function skip(msg: string){ console.log(`  →  ${msg}`); }

async function upsertUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'super_admin' | 'platform_admin' | 'farmer' | 'buyer' | 'expert' | 'trader';
}) {
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    skip(`User already exists: ${data.email}`);
    return existing;
  }
  const hashed = await PasswordUtil.hash(data.password);
  const user = await User.create({
    ...data,
    password: hashed,
    isEmailVerified: true,
    emailVerifiedAt: new Date(),
    isActive: true,
    isPhoneVerified: !!data.phone,
  });
  ok(`Created user: ${data.email}  [${data.role}]`);
  return user;
}

async function upsertWorkspace(userId: string, displayName: string) {
  const existing = await PersonalWorkspace.findOne({ user: new mongoose.Types.ObjectId(userId) });
  if (existing) return existing;
  const ws = await PersonalWorkspace.create({
    user: new mongoose.Types.ObjectId(userId),
    displayName,
  });
  ok(`Created workspace: ${displayName}`);
  return ws;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 — IAM (permissions & roles)
// ─────────────────────────────────────────────────────────────────────────────

async function seedIAM() {
  log('\n── 1. IAM — Permissions & Roles ─────────────────────────────────────');
  await initializeIAMSystem();
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 — Users
// ─────────────────────────────────────────────────────────────────────────────

async function seedUsers() {
  log('\n── 2. Users ──────────────────────────────────────────────────────────');

  const superAdmin = await upsertUser({
    email:     'superadmin@clycites.com',
    password:  'SuperAdmin@2025!',
    firstName: 'Super',
    lastName:  'Admin',
    phone:     '+256700000001',
    role:      'super_admin',
  });

  const admin = await upsertUser({
    email:     'admin@clycites.com',
    password:  'Admin@2025!',
    firstName: 'Platform',
    lastName:  'Admin',
    phone:     '+256700000002',
    role:      'platform_admin',
  });

  const farmer1 = await upsertUser({
    email:     'john.farmer@example.com',
    password:  'Farmer@2025!',
    firstName: 'John',
    lastName:  'Mukasa',
    phone:     '+256770000001',
    role:      'farmer',
  });

  const farmer2 = await upsertUser({
    email:     'grace.farmer@example.com',
    password:  'Farmer@2025!',
    firstName: 'Grace',
    lastName:  'Nakato',
    phone:     '+256770000002',
    role:      'farmer',
  });

  const buyer = await upsertUser({
    email:     'david.buyer@example.com',
    password:  'Buyer@2025!',
    firstName: 'David',
    lastName:  'Ochieng',
    phone:     '+256780000001',
    role:      'buyer',
  });

  const expert = await upsertUser({
    email:     'sarah.expert@example.com',
    password:  'Expert@2025!',
    firstName: 'Sarah',
    lastName:  'Nambozo',
    phone:     '+256750000001',
    role:      'expert',
  });

  const trader = await upsertUser({
    email:     'peter.trader@example.com',
    password:  'Trader@2025!',
    firstName: 'Peter',
    lastName:  'Kato',
    phone:     '+256760000001',
    role:      'trader',
  });

  return { superAdmin, admin, farmer1, farmer2, buyer, expert, trader };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 — Personal Workspaces
// ─────────────────────────────────────────────────────────────────────────────

async function seedWorkspaces(users: Awaited<ReturnType<typeof seedUsers>>) {
  log('\n── 3. Personal Workspaces ────────────────────────────────────────────');
  await Promise.all([
    upsertWorkspace(users.superAdmin._id.toString(), "Super Admin's Workspace"),
    upsertWorkspace(users.admin._id.toString(),      "Platform Admin's Workspace"),
    upsertWorkspace(users.farmer1._id.toString(),    "John's Farm"),
    upsertWorkspace(users.farmer2._id.toString(),    "Grace's Farm"),
    upsertWorkspace(users.buyer._id.toString(),      "David's Workspace"),
    upsertWorkspace(users.expert._id.toString(),     "Sarah's Workspace"),
    upsertWorkspace(users.trader._id.toString(),     "Peter's Workspace"),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 — Organizations
// ─────────────────────────────────────────────────────────────────────────────

async function seedOrganizations(adminId: string) {
  log('\n── 4. Organizations ──────────────────────────────────────────────────');

  const orgs = [
    {
      name:  'ClyCites Platform',
      slug:  'clycites-platform',
      type:  'enterprise' as const,
      industry: 'Agriculture Technology',
      description: 'Official ClyCites platform organisation for system-wide operations.',
      email: 'ops@clycites.com',
      phone: '+256414000000',
      address: { city: 'Kampala', state: 'Central', country: 'Uganda' },
      owner: adminId,
      status: 'active' as const,
      isVerified: true,
    },
    {
      name:  'Buganda Farmers Cooperative',
      slug:  'buganda-farmers-coop',
      type:  'cooperative' as const,
      industry: 'Agriculture',
      description: 'A cooperative of smallholder farmers from the Buganda region.',
      email: 'info@bugandacoop.ug',
      phone: '+256752000001',
      address: { city: 'Masaka', state: 'Central', country: 'Uganda' },
      owner: adminId,
      status: 'active' as const,
      isVerified: true,
    },
    {
      name:  'East Africa Grain Traders Ltd',
      slug:  'ea-grain-traders',
      type:  'enterprise' as const,
      industry: 'Agricultural Trade',
      description: 'Bulk grain traders operating across East Africa.',
      email: 'trade@eagrains.com',
      phone: '+256792000002',
      address: { city: 'Jinja', state: 'Eastern', country: 'Uganda' },
      owner: adminId,
      status: 'active' as const,
      isVerified: false,
    },
  ];

  const results = [];
  for (const org of orgs) {
    const existing = await Organization.findOne({ slug: org.slug });
    if (existing) {
      skip(`Organisation already exists: ${org.name}`);
      results.push(existing);
    } else {
      const created = await Organization.create({
        ...org,
        owner: new mongoose.Types.ObjectId(adminId),
        settings: {
          security: { mfaRequired: false, sessionTimeoutMinutes: 60, ipWhitelist: [] },
          accessControl: { allowPublicSignup: false, requireEmailVerification: true, requireAdminApproval: false },
          features: { marketplace: true, analytics: true, apiAccess: true, customBranding: false },
          billing: { plan: 'free', maxUsers: 50, maxStorage: 10 },
        },
        stats: { memberCount: 1, adminCount: 1 },
      });
      ok(`Created organisation: ${org.name}`);
      results.push(created);
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5 — Farmer profiles
// ─────────────────────────────────────────────────────────────────────────────

async function seedFarmerProfiles(farmer1Id: string, farmer2Id: string) {
  log('\n── 5. Farmer profiles ────────────────────────────────────────────────');

  const profiles = [
    {
      user:         new mongoose.Types.ObjectId(farmer1Id),
      businessName: 'Mukasa Family Farm',
      farmSize:     5,
      farmSizeUnit: 'acres' as const,
      location:    { region: 'Central', district: 'Wakiso', village: 'Ssisa' },
      farmingType:  ['crop', 'livestock'] as ('crop' | 'livestock')[],
      certifications: ['Organic Uganda'],
      verified:    true,
      rating:       4.5,
      totalSales:   1200000,
    },
    {
      user:         new mongoose.Types.ObjectId(farmer2Id),
      businessName: 'Nakato Agri Enterprises',
      farmSize:     3.5,
      farmSizeUnit: 'acres' as const,
      location:    { region: 'Eastern', district: 'Mbale', village: 'Namatala' },
      farmingType:  ['crop'] as ('crop')[],
      certifications: [],
      verified:    false,
      rating:       4.0,
      totalSales:   780000,
    },
  ];

  const results = [];
  for (const p of profiles) {
    const existing = await Farmer.findOne({ user: p.user });
    if (existing) { skip(`Farmer profile exists for user ${p.user}`); results.push(existing); }
    else {
      const f = await Farmer.create(p);
      ok(`Created farmer profile: ${p.businessName}`);
      results.push(f);
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6 — Products catalogue
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCTS = [
  { name: 'Maize (Corn)',        category: 'Grains',      variety: 'Longe 5H',    unit: 'kg'  as const, description: 'Hybrid maize grain, suitable for human consumption and animal feed.' },
  { name: 'Rice (Paddy)',        category: 'Grains',      variety: 'NERICA 4',    unit: 'kg'  as const, description: 'Paddy rice grown in irrigated lowlands.' },
  { name: 'Beans (Dry)',         category: 'Legumes',     variety: 'K132',        unit: 'kg'  as const, description: 'Dried common beans, high protein content.' },
  { name: 'Groundnuts',          category: 'Legumes',     variety: 'Serenut 2',   unit: 'kg'  as const, description: 'Raw groundnuts for oil and direct consumption.' },
  { name: 'Sorghum',             category: 'Grains',      variety: 'Seremi',      unit: 'kg'  as const, description: 'Sorghum grains for brewing and food.' },
  { name: 'Sweet Potatoes',      category: 'Root Crops',  variety: 'NASPOT 10',   unit: 'kg'  as const, description: 'Orange-flesh sweet potatoes, vitamin A rich.' },
  { name: 'Cassava (Fresh)',     category: 'Root Crops',  variety: 'Nase 14',     unit: 'kg'  as const, description: 'Fresh cassava roots, harvested at maturity.' },
  { name: 'Irish Potatoes',      category: 'Root Crops',  variety: 'Victoria',    unit: 'kg'  as const, description: 'Ware potatoes for market and processing.' },
  { name: 'Banana (Matooke)',    category: 'Fruits',      variety: 'Mbidde',      unit: 'bag'   as const, description: 'Cooking banana, staple food in Uganda. Sold per bag/bunch.' },
  { name: 'Tomatoes',            category: 'Vegetables',  variety: 'Tengeru 97',  unit: 'kg'  as const, description: 'Fresh tomatoes for market.' },
  { name: 'Onions',              category: 'Vegetables',  variety: 'Red Creole',  unit: 'kg'  as const, description: 'Dry onions for cooking.' },
  { name: 'Cabbage',             category: 'Vegetables',  variety: 'Prize Drum',  unit: 'kg'  as const, description: 'Fresh cabbage heads.' },
  { name: 'Sunflower Seeds',     category: 'Oil Crops',   variety: 'Sunfola',     unit: 'kg'  as const, description: 'Sunflower seeds for oil extraction.' },
  { name: 'Coffee (Robusta)',    category: 'Cash Crops',  variety: 'New Robusta', unit: 'kg'  as const, description: 'Dried robusta coffee beans.' },
  { name: 'Tea Leaves (Green)',  category: 'Cash Crops',  variety: 'CPI/1',       unit: 'kg'  as const, description: 'Green tea leaf for processing.' },
  { name: 'Milk (Fresh)',        category: 'Dairy',       variety: 'Friesian',    unit: 'liter' as const, description: 'Fresh whole milk from dairy cows.' },
  { name: 'Eggs (Tray)',         category: 'Poultry',     variety: 'Layer Eggs',  unit: 'piece' as const, description: 'Free-range chicken eggs, tray of 30.' },
  { name: 'Beef (Carcass)',      category: 'Livestock',   variety: 'Ankole',      unit: 'kg'  as const, description: 'Beef carcass from locally raised Ankole cattle.' },
  { name: 'Fish (Tilapia)',      category: 'Aquaculture', variety: 'Nile Tilapia',unit: 'kg'  as const, description: 'Fresh Nile tilapia, whole fish.' },
  { name: 'Simsim (Sesame)',     category: 'Oil Crops',   variety: 'Sesim 1',     unit: 'kg'  as const, description: 'Sesame seeds for oil and export.' },
];

async function seedProducts() {
  log('\n── 6. Products catalogue ─────────────────────────────────────────────');
  const results = [];
  for (const p of PRODUCTS) {
    const existing = await Product.findOne({ name: p.name });
    if (existing) { skip(`Product exists: ${p.name}`); results.push(existing); }
    else {
      const prod = await Product.create({ ...p, minOrderQuantity: 1, isActive: true });
      ok(`Created product: ${p.name}`);
      results.push(prod);
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7 — Markets
// ─────────────────────────────────────────────────────────────────────────────

const MARKETS = [
  // Central
  { name: 'Owino Market (St. Balikuddembe)',  location: 'Kampala City',  region: 'Central' },
  { name: 'Nakasero Market',                   location: 'Kampala City',  region: 'Central' },
  { name: 'Kasubi Market',                     location: 'Kampala',       region: 'Central' },
  { name: 'Wandegeya Market',                  location: 'Kampala',       region: 'Central' },
  { name: 'Entebbe Produce Market',            location: 'Entebbe',       region: 'Central' },
  { name: 'Masaka Main Market',                location: 'Masaka',        region: 'Central' },
  // Northern
  { name: 'Gulu Main Market',                  location: 'Gulu',          region: 'Northern' },
  { name: 'Lira Market',                       location: 'Lira',          region: 'Northern' },
  // Eastern
  { name: 'Mbale Main Market',                 location: 'Mbale',         region: 'Eastern' },
  { name: 'Jinja Central Market',              location: 'Jinja',         region: 'Eastern' },
  { name: 'Iganga Market',                     location: 'Iganga',        region: 'Eastern' },
  // Western
  { name: 'Mbarara Main Market',               location: 'Mbarara',       region: 'Western' },
  { name: 'Fort Portal Central Market',        location: 'Fort Portal',   region: 'Western' },
  { name: 'Kabale Main Market',                location: 'Kabale',        region: 'Western' },
];

async function seedMarkets() {
  log('\n── 7. Markets ────────────────────────────────────────────────────────');
  const results = [];
  for (const m of MARKETS) {
    const existing = await Market.findOne({ name: m.name });
    if (existing) { skip(`Market exists: ${m.name}`); results.push(existing); }
    else {
      const mkt = await Market.create({ ...m, country: 'Uganda', isActive: true });
      ok(`Created market: ${m.name}`);
      results.push(mkt);
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8 — Prices  (last 7 days for the first 6 products × 3 markets)
// ─────────────────────────────────────────────────────────────────────────────

async function seedPrices(
  products: mongoose.Document[],
  markets:  mongoose.Document[],
  addedById: string,
) {
  log('\n── 8. Prices ─────────────────────────────────────────────────────────');

  type ProductDoc = { _id: mongoose.Types.ObjectId; unit?: string };
  type MarketDoc  = { _id: mongoose.Types.ObjectId };

  // Base prices per product (UGX per kg/unit)
  const BASE_PRICES: Record<string, number> = {
    'Maize (Corn)':       1200,
    'Rice (Paddy)':       3500,
    'Beans (Dry)':        4200,
    'Groundnuts':         6000,
    'Sorghum':            1400,
    'Sweet Potatoes':     800,
    'Cassava (Fresh)':    600,
    'Irish Potatoes':     1500,
    'Banana (Matooke)':   8000,
    'Tomatoes':           2000,
    'Onions':             3000,
    'Cabbage':            1000,
    'Milk (Fresh)':       1800,
    'Coffee (Robusta)':   12000,
    'Sunflower Seeds':    5000,
    'Simsim (Sesame)':    9000,
    'Eggs (Tray)':        14000,
    'Beef (Carcass)':     18000,
    'Fish (Tilapia)':     10000,
    'Tea Leaves (Green)': 4500,
  };

  const unitMap: Record<string, 'kg' | 'liters' | 'grams' | 'pieces'> = {
    'kg':    'kg',
    'liter': 'liters',
    'piece': 'pieces',
    'bunch': 'kg',
    'crate': 'kg',
    'bag':   'kg',
    'ton':   'kg',
  };

  const productDocs = products.slice(0, 8) as ProductDoc[];
  const marketDocs  = markets.slice(0, 4)  as MarketDoc[];
  const today       = new Date();
  let count = 0;

  for (const prod of productDocs) {
    // Get the product name to look up base price
    const fullProd = await Product.findById(prod._id).lean() as { name: string; unit?: string } | null;
    if (!fullProd) continue;
    const base = BASE_PRICES[fullProd.name] ?? 2000;
    const unit = unitMap[fullProd.unit ?? 'kg'] ?? 'kg';

    for (const mkt of marketDocs) {
      for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
        const date = new Date(today);
        date.setDate(date.getDate() - daysAgo);
        date.setHours(8, 0, 0, 0);

        const existing = await Price.findOne({ product: prod._id, market: mkt._id, date });
        if (existing) continue;

        // Small random daily variation ±8%
        const variation = 1 + (Math.random() * 0.16 - 0.08);
        const price = Math.round(base * variation);

        await Price.create({
          product:     prod._id,
          market:      mkt._id,
          addedBy:     new mongoose.Types.ObjectId(addedById),
          price,
          currency:    'UGX',
          date,
          lastUpdated: date,
          productType: ['liter', 'liters'].includes(unit) ? 'liquid' : 'solid',
          quantity:    1,
          unit,
          trendPercentage:      parseFloat((Math.random() * 10 - 5).toFixed(2)),
          priceChangePercentage: parseFloat((Math.random() * 6 - 3).toFixed(2)),
          isValid: true,
        });
        count++;
      }
    }
  }
  ok(`Created ${count} price records`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9 — Marketplace listings
// ─────────────────────────────────────────────────────────────────────────────

async function seedListings(
  farmers:  mongoose.Document[],
  products: mongoose.Document[],
) {
  log('\n── 9. Marketplace listings ───────────────────────────────────────────');

  type FarmerDoc  = { _id: mongoose.Types.ObjectId };
  type ProductDoc = { _id: mongoose.Types.ObjectId; name?: string };

  const listingsData = [
    {
      farmer:  (farmers[0] as FarmerDoc)._id,
      product: (products[0] as ProductDoc)._id,           // Maize
      title:           'Fresh Grade-A Maize — Wakiso',
      description:     'Freshly harvested hybrid maize (Longe 5H). Dried, clean, no aflatoxin. Minimum order 100 kg.',
      quantity:        2000,
      price:           1300,
      priceUnit:       'UGX/kg',
      quality:         'grade-a'  as const,
      harvestDate:     new Date('2025-01-10'),
      availableFrom:   new Date('2025-01-15'),
      availableUntil:  new Date('2025-04-30'),
      location:       { region: 'Central', district: 'Wakiso' },
      status:          'active'   as const,
    },
    {
      farmer:  (farmers[0] as FarmerDoc)._id,
      product: (products[2] as ProductDoc)._id,           // Beans
      title:           'Organic K132 Beans — Wakiso',
      description:     'Organic certified K132 beans. Hand sorted, low moisture. Great for export.',
      quantity:        800,
      price:           4500,
      priceUnit:       'UGX/kg',
      quality:         'premium'  as const,
      harvestDate:     new Date('2025-01-20'),
      availableFrom:   new Date('2025-01-25'),
      availableUntil:  new Date('2025-03-31'),
      location:       { region: 'Central', district: 'Wakiso' },
      status:          'active'   as const,
    },
    {
      farmer:  (farmers[1] as FarmerDoc)._id,
      product: (products[5] as ProductDoc)._id,           // Sweet Potatoes
      title:           'NASPOT 10 Sweet Potatoes — Mbale',
      description:     'Vitamin A rich orange-flesh sweet potatoes. Suitable for baby food processing.',
      quantity:        1500,
      price:           900,
      priceUnit:       'UGX/kg',
      quality:         'grade-b'  as const,
      harvestDate:     new Date('2025-02-01'),
      availableFrom:   new Date('2025-02-05'),
      availableUntil:  new Date('2025-04-15'),
      location:       { region: 'Eastern', district: 'Mbale' },
      status:          'active'   as const,
    },
    {
      farmer:  (farmers[1] as FarmerDoc)._id,
      product: (products[9] as ProductDoc)._id,           // Tomatoes
      title:           'Fresh Tomatoes — Mbale',
      description:     'Red ripe Tengeru 97 tomatoes. Ready for market. Same-week delivery available.',
      quantity:        300,
      price:           2200,
      priceUnit:       'UGX/kg',
      quality:         'standard' as const,
      harvestDate:     new Date('2025-02-10'),
      availableFrom:   new Date('2025-02-11'),
      availableUntil:  new Date('2025-02-25'),
      location:       { region: 'Eastern', district: 'Mbale' },
      status:          'active'   as const,
    },
  ];

  let count = 0;
  for (const l of listingsData) {
    const existing = await Listing.findOne({ farmer: l.farmer, title: l.title });
    if (existing) { skip(`Listing exists: ${l.title}`); }
    else {
      await Listing.create({ ...l, images: [], views: 0, inquiries: 0 });
      ok(`Created listing: ${l.title}`);
      count++;
    }
  }
  if (count === 0 && listingsData.length > 0) ok('All listings already exist');
}

// ─────────────────────────────────────────────────────────────────────────────
// 10 — Notification templates
// ─────────────────────────────────────────────────────────────────────────────

async function seedNotificationTemplates(adminUserId: string) {
  log('\n── 10. Notification templates ────────────────────────────────────────');
  try {
    await templateService.seedDefaultTemplates(adminUserId);
    ok('Notification templates seeded');
  } catch (err) {
    console.warn(`  ⚠  Notification templates seed skipped: ${err}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          ClyCites — Database Seeder                         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  await connectDB();

  await seedIAM();

  const users    = await seedUsers();
  await seedWorkspaces(users);
  await seedOrganizations(users.admin._id.toString());
  const farmers  = await seedFarmerProfiles(users.farmer1._id.toString(), users.farmer2._id.toString());
  const products = await seedProducts();
  const markets  = await seedMarkets();
  await seedPrices(products, markets, users.admin._id.toString());
  await seedListings(farmers, products);
  await seedNotificationTemplates(users.admin._id.toString());

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  ✅  Seeding complete!                                       ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  Default credentials:                                        ║');
  console.log('║  Super Admin  superadmin@clycites.com  SuperAdmin@2025!      ║');
  console.log('║  Admin        admin@clycites.com       Admin@2025!           ║');
  console.log('║  Farmer       john.farmer@example.com  Farmer@2025!          ║');
  console.log('║  Buyer        david.buyer@example.com  Buyer@2025!           ║');
  console.log('║  Expert       sarah.expert@example.com Expert@2025!          ║');
  console.log('║  Trader       peter.trader@example.com Trader@2025!          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
}

main()
  .then(() => {
    mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Seeder failed:', err);
    mongoose.disconnect();
    process.exit(1);
  });
