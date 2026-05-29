/**
 * Mock data for dev mode testing (no Supabase connection needed).
 * Used as fallback when queries fail.
 */

const DEV_USER_ID = '00000000-0000-0000-0000-000000000000';

// ─── Categories ──────────────────────────────────────────────

export const MOCK_CATEGORIES = [
  { id: 'cat-energy', slug: 'energy_drinks', name: 'Energy Drinks', sort_order: 1, is_active: true },
  { id: 'cat-coffee', slug: 'coffee', name: 'Coffee', sort_order: 2, is_active: true },
  { id: 'cat-soda', slug: 'soda', name: 'Soda', sort_order: 3, is_active: true },
  { id: 'cat-beer', slug: 'beer', name: 'Beer', sort_order: 4, is_active: true },
  { id: 'cat-snacks', slug: 'snacks', name: 'Snacks', sort_order: 5, is_active: true },
  { id: 'cat-water', slug: 'water', name: 'Water & Sparkling', sort_order: 6, is_active: true },
];

// ─── Brands ──────────────────────────────────────────────────

const brands = {
  // Energy
  monster: { id: 'brand-monster', name: 'Monster Energy' },
  redbull: { id: 'brand-redbull', name: 'Red Bull' },
  celsius: { id: 'brand-celsius', name: 'Celsius' },
  ghost: { id: 'brand-ghost', name: 'Ghost Energy' },
  alani: { id: 'brand-alani', name: 'Alani Nu' },
  bang: { id: 'brand-bang', name: 'Bang Energy' },
  reign: { id: 'brand-reign', name: 'Reign' },
  c4: { id: 'brand-c4', name: 'C4 Energy' },
  prime: { id: 'brand-prime', name: 'Prime Energy' },
  rockstar: { id: 'brand-rockstar', name: 'Rockstar' },
  zoa: { id: 'brand-zoa', name: 'ZOA' },
  gfuel: { id: 'brand-gfuel', name: 'G Fuel' },
  nos: { id: 'brand-nos', name: 'NOS' },
  threeD: { id: 'brand-3d', name: '3D Energy' },
  // Coffee
  starbucks: { id: 'brand-starbucks', name: 'Starbucks' },
  dunkin: { id: 'brand-dunkin', name: "Dunkin'" },
  lavazza: { id: 'brand-lavazza', name: 'Lavazza' },
  nespresso: { id: 'brand-nespresso', name: 'Nespresso' },
  oatly: { id: 'brand-oatly', name: 'Oatly' },
  // Soda
  coke: { id: 'brand-coke', name: 'Coca-Cola' },
  pepsi: { id: 'brand-pepsi', name: 'Pepsi' },
  drpepper: { id: 'brand-drpepper', name: 'Dr Pepper' },
  sprite: { id: 'brand-sprite', name: 'Sprite' },
  fanta: { id: 'brand-fanta', name: 'Fanta' },
  mountaindew: { id: 'brand-mtndew', name: 'Mountain Dew' },
  jarritos: { id: 'brand-jarritos', name: 'Jarritos' },
  // Beer
  guinness: { id: 'brand-guinness', name: 'Guinness' },
  heineken: { id: 'brand-heineken', name: 'Heineken' },
  corona: { id: 'brand-corona', name: 'Corona' },
  sierranevada: { id: 'brand-sierra', name: 'Sierra Nevada' },
  lagunitas: { id: 'brand-lagunitas', name: 'Lagunitas' },
  athletic: { id: 'brand-athletic', name: 'Athletic Brewing' },
  // Snacks
  lays: { id: 'brand-lays', name: "Lay's" },
  doritos: { id: 'brand-doritos', name: 'Doritos' },
  oreo: { id: 'brand-oreo', name: 'Oreo' },
  haribo: { id: 'brand-haribo', name: 'Haribo' },
  kindbar: { id: 'brand-kind', name: 'KIND' },
  rxbar: { id: 'brand-rxbar', name: 'RXBAR' },
  // Water
  sanpellegrino: { id: 'brand-sanpel', name: 'San Pellegrino' },
  topo: { id: 'brand-topo', name: 'Topo Chico' },
  liquid_death: { id: 'brand-liquiddeath', name: 'Liquid Death' },
  voss: { id: 'brand-voss', name: 'VOSS' },
};

export const MOCK_BRANDS = Object.values(brands);

// ─── Products ──────────────────────────────────────────────

let _id = 0;
const pid = () => `prod-${String(++_id).padStart(3, '0')}`;

interface MockProduct {
  id: string;
  category_id: string;
  brand_id: string;
  name: string;
  description: string;
  image_url: string | null;
  avg_rating: number;
  rating_count: number;
  is_verified: boolean;
  attributes: Record<string, unknown>;
  brands: { id: string; name: string };
}

function p(
  cat: string,
  brand: { id: string; name: string },
  name: string,
  desc: string,
  avgRating: number,
  ratingCount: number,
  attrs: Record<string, unknown> = {},
): MockProduct {
  return {
    id: pid(),
    category_id: cat,
    brand_id: brand.id,
    name,
    description: desc,
    image_url: null,
    avg_rating: avgRating,
    rating_count: ratingCount,
    is_verified: true,
    attributes: attrs,
    brands: brand,
  };
}

export const MOCK_PRODUCTS: MockProduct[] = [
  // ─── Energy Drinks (25) ────────────────────────────────
  p('cat-energy', brands.monster, 'Monster Energy Original', 'The classic green Monster.', 7.2, 1843, { flavor: 'Original', sugar_free: false, volume_ml: 473, caffeine_mg: 160 }),
  p('cat-energy', brands.monster, 'Monster Ultra White', 'Zero sugar, light citrus.', 8.1, 2105, { flavor: 'Ultra White', sugar_free: true, volume_ml: 473, caffeine_mg: 150 }),
  p('cat-energy', brands.monster, 'Monster Ultra Rosa', 'Zero sugar, guava-strawberry.', 7.8, 987, { flavor: 'Ultra Rosa', sugar_free: true, volume_ml: 473, caffeine_mg: 150 }),
  p('cat-energy', brands.monster, 'Monster Mango Loco', 'Juice Monster with mango.', 7.5, 1203, { flavor: 'Mango Loco', sugar_free: false, volume_ml: 473, caffeine_mg: 160 }),
  p('cat-energy', brands.monster, 'Monster Ultra Watermelon', 'Zero sugar watermelon.', 7.0, 654, { flavor: 'Ultra Watermelon', sugar_free: true, volume_ml: 473, caffeine_mg: 150 }),
  p('cat-energy', brands.redbull, 'Red Bull Original', 'The original energy drink.', 7.4, 3210, { flavor: 'Original', sugar_free: false, volume_ml: 250, caffeine_mg: 80 }),
  p('cat-energy', brands.redbull, 'Red Bull Sugar Free', 'Sugar-free classic.', 6.8, 1450, { flavor: 'Original', sugar_free: true, volume_ml: 250, caffeine_mg: 80 }),
  p('cat-energy', brands.redbull, 'Red Bull Tropical Edition', 'Tropical fruit flavor.', 7.6, 890, { flavor: 'Tropical', sugar_free: false, volume_ml: 250, caffeine_mg: 80 }),
  p('cat-energy', brands.celsius, 'Celsius Sparkling Orange', 'Fitness energy, sparkling orange.', 8.3, 1567, { flavor: 'Sparkling Orange', sugar_free: true, volume_ml: 355, caffeine_mg: 200 }),
  p('cat-energy', brands.celsius, 'Celsius Tropical Vibe', 'Sparkling tropical punch.', 8.0, 1320, { flavor: 'Tropical Vibe', sugar_free: true, volume_ml: 355, caffeine_mg: 200 }),
  p('cat-energy', brands.celsius, 'Celsius Peach Vibe', 'Sparkling peach flavor.', 7.9, 988, { flavor: 'Peach Vibe', sugar_free: true, volume_ml: 355, caffeine_mg: 200 }),
  p('cat-energy', brands.ghost, 'Ghost Sour Patch Kids Blue Raspberry', 'Licensed Sour Patch flavor.', 8.5, 1789, { flavor: 'Sour Patch Kids Blue Raspberry', sugar_free: true, volume_ml: 473, caffeine_mg: 200 }),
  p('cat-energy', brands.ghost, 'Ghost Warheads Sour Watermelon', 'Licensed Warheads flavor.', 8.2, 1102, { flavor: 'Warheads Sour Watermelon', sugar_free: true, volume_ml: 473, caffeine_mg: 200 }),
  p('cat-energy', brands.alani, 'Alani Nu Cosmic Stardust', 'Fruity candy-inspired.', 8.4, 2341, { flavor: 'Cosmic Stardust', sugar_free: true, volume_ml: 355, caffeine_mg: 200 }),
  p('cat-energy', brands.alani, 'Alani Nu Hawaiian Shaved Ice', 'Tropical shaved ice flavor.', 8.1, 1654, { flavor: 'Hawaiian Shaved Ice', sugar_free: true, volume_ml: 355, caffeine_mg: 200 }),
  p('cat-energy', brands.alani, 'Alani Nu Mimosa', 'Champagne and orange juice.', 7.7, 1230, { flavor: 'Mimosa', sugar_free: true, volume_ml: 355, caffeine_mg: 200 }),
  p('cat-energy', brands.prime, 'Prime Energy Blue Raspberry', 'Low-calorie energy.', 6.5, 3450, { flavor: 'Blue Raspberry', sugar_free: true, volume_ml: 355, caffeine_mg: 200 }),
  p('cat-energy', brands.prime, 'Prime Energy Tropical Punch', 'Tropical punch flavor.', 6.3, 2870, { flavor: 'Tropical Punch', sugar_free: true, volume_ml: 355, caffeine_mg: 200 }),
  p('cat-energy', brands.c4, 'C4 Frozen Bombsicle', 'Popsicle-inspired flavor.', 7.9, 876, { flavor: 'Frozen Bombsicle', sugar_free: true, volume_ml: 473, caffeine_mg: 200 }),
  p('cat-energy', brands.reign, 'Reign Orange Dreamsicle', 'Orange cream flavor.', 7.3, 654, { flavor: 'Orange Dreamsicle', sugar_free: true, volume_ml: 473, caffeine_mg: 300 }),
  p('cat-energy', brands.bang, 'Bang Rainbow Unicorn', 'Fruity rainbow mix.', 7.0, 1567, { flavor: 'Rainbow Unicorn', sugar_free: true, volume_ml: 473, caffeine_mg: 300 }),
  p('cat-energy', brands.rockstar, 'Rockstar Original', 'Classic Rockstar energy.', 6.2, 987, { flavor: 'Original', sugar_free: false, volume_ml: 473, caffeine_mg: 160 }),
  p('cat-energy', brands.zoa, 'ZOA Wild Orange', 'Dwayne Johnson\'s energy drink.', 7.1, 543, { flavor: 'Wild Orange', sugar_free: true, volume_ml: 355, caffeine_mg: 160 }),
  p('cat-energy', brands.gfuel, 'G Fuel FaZeberry', 'Mixed berry esports drink.', 7.6, 2100, { flavor: 'FaZeberry', sugar_free: true, volume_ml: 473, caffeine_mg: 140 }),
  p('cat-energy', brands.nos, 'NOS Original', 'High-performance energy.', 6.8, 765, { flavor: 'Original', sugar_free: false, volume_ml: 473, caffeine_mg: 160 }),

  // ─── Coffee (12) ───────────────────────────────────────
  p('cat-coffee', brands.starbucks, 'Starbucks Doubleshot Espresso', 'Canned espresso with cream.', 7.3, 2340, { roast: 'medium', type: 'canned', milk: 'cream' }),
  p('cat-coffee', brands.starbucks, 'Starbucks Frappuccino Mocha', 'Bottled mocha frappuccino.', 7.0, 3120, { roast: 'medium', type: 'bottled', milk: 'whole' }),
  p('cat-coffee', brands.starbucks, 'Starbucks Cold Brew Black', 'Unsweetened cold brew.', 7.8, 1560, { roast: 'dark', type: 'bottled', milk: 'none' }),
  p('cat-coffee', brands.dunkin, "Dunkin' Iced Coffee Original", 'Classic iced coffee.', 7.1, 1890, { roast: 'medium', type: 'bottled', milk: 'cream' }),
  p('cat-coffee', brands.dunkin, "Dunkin' Cold Brew Caramel", 'Caramel cold brew.', 7.4, 1230, { roast: 'medium', type: 'bottled', milk: 'whole' }),
  p('cat-coffee', brands.lavazza, 'Lavazza Super Crema Whole Bean', 'Italian whole bean blend.', 8.5, 987, { roast: 'medium', type: 'whole_bean', origin: 'blend' }),
  p('cat-coffee', brands.nespresso, 'Nespresso Vertuo Intenso', 'Rich and intense capsule.', 8.2, 1450, { roast: 'dark', type: 'capsule', intensity: 9 }),
  p('cat-coffee', brands.nespresso, 'Nespresso Vertuo Melozio', 'Smooth and balanced.', 8.0, 1780, { roast: 'medium', type: 'capsule', intensity: 6 }),
  p('cat-coffee', brands.oatly, 'Oatly Oat Milk Latte', 'Oat milk cold brew latte.', 7.6, 654, { roast: 'medium', type: 'bottled', milk: 'oat' }),
  p('cat-coffee', brands.starbucks, 'Starbucks Pike Place Roast K-Cup', 'Smooth medium roast.', 7.2, 2100, { roast: 'medium', type: 'k-cup', origin: 'Latin America' }),
  p('cat-coffee', brands.lavazza, 'Lavazza Qualità Rossa Ground', 'Classic Italian ground coffee.', 8.1, 1340, { roast: 'medium', type: 'ground', origin: 'blend' }),
  p('cat-coffee', brands.starbucks, 'Starbucks Nitro Cold Brew Vanilla', 'Nitrogen-infused vanilla.', 8.3, 876, { roast: 'dark', type: 'canned', milk: 'vanilla_cream' }),

  // ─── Soda (15) ─────────────────────────────────────────
  p('cat-soda', brands.coke, 'Coca-Cola Original', 'The classic.', 8.0, 5430, { sugar_free: false, volume_ml: 355 }),
  p('cat-soda', brands.coke, 'Coca-Cola Zero Sugar', 'Zero sugar version.', 7.8, 3210, { sugar_free: true, volume_ml: 355 }),
  p('cat-soda', brands.coke, 'Cherry Coca-Cola', 'Cherry-flavored classic.', 7.5, 1890, { sugar_free: false, volume_ml: 355 }),
  p('cat-soda', brands.pepsi, 'Pepsi Original', 'The other classic.', 7.2, 4320, { sugar_free: false, volume_ml: 355 }),
  p('cat-soda', brands.pepsi, 'Pepsi Zero Sugar', 'Zero sugar Pepsi.', 7.0, 2100, { sugar_free: true, volume_ml: 355 }),
  p('cat-soda', brands.drpepper, 'Dr Pepper Original', '23 flavors in one.', 8.2, 2890, { sugar_free: false, volume_ml: 355 }),
  p('cat-soda', brands.drpepper, 'Dr Pepper Cherry', 'Cherry Dr Pepper.', 7.9, 1650, { sugar_free: false, volume_ml: 355 }),
  p('cat-soda', brands.sprite, 'Sprite Original', 'Lemon-lime refreshment.', 7.4, 3450, { sugar_free: false, volume_ml: 355 }),
  p('cat-soda', brands.fanta, 'Fanta Orange', 'Orange soda classic.', 7.1, 2340, { sugar_free: false, volume_ml: 355 }),
  p('cat-soda', brands.fanta, 'Fanta Grape', 'Grape soda.', 6.8, 1230, { sugar_free: false, volume_ml: 355 }),
  p('cat-soda', brands.mountaindew, 'Mountain Dew Original', 'Do the Dew.', 7.0, 2780, { sugar_free: false, volume_ml: 355 }),
  p('cat-soda', brands.mountaindew, 'Mountain Dew Baja Blast', 'Taco Bell exclusive.', 8.1, 1980, { sugar_free: false, volume_ml: 355 }),
  p('cat-soda', brands.jarritos, 'Jarritos Mandarin', 'Mexican mandarin soda.', 8.4, 876, { sugar_free: false, volume_ml: 370 }),
  p('cat-soda', brands.jarritos, 'Jarritos Tamarind', 'Mexican tamarind soda.', 8.0, 654, { sugar_free: false, volume_ml: 370 }),
  p('cat-soda', brands.jarritos, 'Jarritos Guava', 'Mexican guava soda.', 8.3, 543, { sugar_free: false, volume_ml: 370 }),

  // ─── Beer (10) ─────────────────────────────────────────
  p('cat-beer', brands.guinness, 'Guinness Draught', 'Iconic Irish dry stout.', 8.6, 3450, { abv: 4.2, style: 'Stout', volume_ml: 440 }),
  p('cat-beer', brands.heineken, 'Heineken Original', 'Dutch premium lager.', 7.0, 4320, { abv: 5.0, style: 'Lager', volume_ml: 330 }),
  p('cat-beer', brands.heineken, 'Heineken Silver', 'Light and refreshing lager.', 6.5, 1230, { abv: 4.0, style: 'Lager', volume_ml: 330 }),
  p('cat-beer', brands.corona, 'Corona Extra', 'Mexican lager. Add lime.', 7.2, 3890, { abv: 4.5, style: 'Lager', volume_ml: 355 }),
  p('cat-beer', brands.sierranevada, 'Sierra Nevada Pale Ale', 'The classic American pale ale.', 8.8, 2100, { abv: 5.6, style: 'Pale Ale', volume_ml: 355 }),
  p('cat-beer', brands.sierranevada, 'Sierra Nevada Hazy Little Thing', 'Hazy IPA.', 8.5, 1780, { abv: 6.7, style: 'Hazy IPA', volume_ml: 355 }),
  p('cat-beer', brands.lagunitas, 'Lagunitas IPA', 'West Coast IPA.', 8.4, 1890, { abv: 6.2, style: 'IPA', volume_ml: 355 }),
  p('cat-beer', brands.lagunitas, 'Lagunitas A Little Sumpin Sumpin', 'Wheat ale/IPA hybrid.', 8.7, 1560, { abv: 7.5, style: 'IPA', volume_ml: 355 }),
  p('cat-beer', brands.athletic, 'Athletic Run Wild IPA', 'Non-alcoholic craft IPA.', 7.8, 987, { abv: 0.5, style: 'NA IPA', volume_ml: 355 }),
  p('cat-beer', brands.athletic, 'Athletic Free Wave Hazy IPA', 'Non-alcoholic hazy.', 7.5, 876, { abv: 0.5, style: 'NA Hazy IPA', volume_ml: 355 }),

  // ─── Snacks (12) ───────────────────────────────────────
  p('cat-snacks', brands.lays, "Lay's Classic", 'Classic potato chips.', 7.5, 4320, { type: 'chips', flavor: 'Original' }),
  p('cat-snacks', brands.lays, "Lay's Sour Cream & Onion", 'Tangy sour cream chips.', 7.8, 3210, { type: 'chips', flavor: 'Sour Cream & Onion' }),
  p('cat-snacks', brands.lays, "Lay's BBQ", 'Smoky BBQ chips.', 7.6, 2890, { type: 'chips', flavor: 'BBQ' }),
  p('cat-snacks', brands.doritos, 'Doritos Nacho Cheese', 'The classic nacho chip.', 8.2, 3890, { type: 'chips', flavor: 'Nacho Cheese' }),
  p('cat-snacks', brands.doritos, 'Doritos Cool Ranch', 'Cool ranch flavor.', 8.0, 3450, { type: 'chips', flavor: 'Cool Ranch' }),
  p('cat-snacks', brands.doritos, 'Doritos Spicy Sweet Chili', 'Sweet heat.', 8.4, 2100, { type: 'chips', flavor: 'Spicy Sweet Chili' }),
  p('cat-snacks', brands.oreo, 'Oreo Original', 'Milk\'s favorite cookie.', 8.5, 5430, { type: 'cookie', flavor: 'Original' }),
  p('cat-snacks', brands.oreo, 'Oreo Double Stuf', 'Double the cream.', 8.3, 3210, { type: 'cookie', flavor: 'Double Stuf' }),
  p('cat-snacks', brands.haribo, 'Haribo Gold-Bears', 'Classic gummy bears.', 8.1, 2780, { type: 'candy', flavor: 'Mixed Fruit' }),
  p('cat-snacks', brands.haribo, 'Haribo Sour S\'ghetti', 'Sour gummy strings.', 7.9, 1560, { type: 'candy', flavor: 'Sour' }),
  p('cat-snacks', brands.kindbar, 'KIND Dark Chocolate Nuts & Sea Salt', 'Nutty dark chocolate bar.', 8.0, 1890, { type: 'bar', flavor: 'Dark Chocolate' }),
  p('cat-snacks', brands.rxbar, 'RXBAR Chocolate Sea Salt', 'Clean protein bar.', 7.4, 1230, { type: 'bar', flavor: 'Chocolate Sea Salt' }),

  // ─── Water & Sparkling (8) ─────────────────────────────
  p('cat-water', brands.sanpellegrino, 'San Pellegrino Aranciata', 'Italian orange sparkling.', 8.6, 1230, { type: 'sparkling', flavor: 'Blood Orange' }),
  p('cat-water', brands.sanpellegrino, 'San Pellegrino Limonata', 'Italian lemon sparkling.', 8.4, 987, { type: 'sparkling', flavor: 'Lemon' }),
  p('cat-water', brands.topo, 'Topo Chico Original', 'Mexican mineral water.', 8.8, 2340, { type: 'sparkling', flavor: 'Original' }),
  p('cat-water', brands.topo, 'Topo Chico Sabores Lime Mint', 'Flavored mineral water.', 8.2, 876, { type: 'sparkling', flavor: 'Lime Mint' }),
  p('cat-water', brands.liquid_death, 'Liquid Death Mountain Water', 'Murder your thirst. Still.', 7.5, 3210, { type: 'still', flavor: 'Original' }),
  p('cat-water', brands.liquid_death, 'Liquid Death Sparkling', 'Murder your thirst. Sparkling.', 7.8, 2780, { type: 'sparkling', flavor: 'Original' }),
  p('cat-water', brands.liquid_death, 'Liquid Death Mango Chainsaw', 'Mango agave sparkling.', 8.1, 1560, { type: 'sparkling', flavor: 'Mango' }),
  p('cat-water', brands.voss, 'VOSS Artesian Still', 'Norwegian artesian water.', 7.0, 654, { type: 'still', flavor: 'Original' }),
];

// ─── Tags ────────────────────────────────────────────────

export const MOCK_TAGS = [
  // Universal
  { id: 'tag-sweet', category_id: null, name: 'Sweet', slug: 'sweet' },
  { id: 'tag-bitter', category_id: null, name: 'Bitter', slug: 'bitter' },
  { id: 'tag-sour', category_id: null, name: 'Sour', slug: 'sour' },
  { id: 'tag-smooth', category_id: null, name: 'Smooth', slug: 'smooth' },
  { id: 'tag-refreshing', category_id: null, name: 'Refreshing', slug: 'refreshing' },
  { id: 'tag-mild', category_id: null, name: 'Mild', slug: 'mild' },
  { id: 'tag-strong', category_id: null, name: 'Strong', slug: 'strong' },
  { id: 'tag-artificial', category_id: null, name: 'Artificial', slug: 'artificial' },
  // Drinks
  { id: 'tag-citrus', category_id: null, name: 'Citrus', slug: 'citrus' },
  { id: 'tag-berry', category_id: null, name: 'Berry', slug: 'berry' },
  { id: 'tag-tropical', category_id: null, name: 'Tropical', slug: 'tropical' },
  { id: 'tag-carbonated', category_id: null, name: 'Carbonated', slug: 'carbonated' },
  { id: 'tag-crisp', category_id: null, name: 'Crisp', slug: 'crisp' },
  { id: 'tag-creamy', category_id: null, name: 'Creamy', slug: 'creamy' },
  // Food
  { id: 'tag-crunchy', category_id: null, name: 'Crunchy', slug: 'crunchy' },
  { id: 'tag-savory', category_id: null, name: 'Savory', slug: 'savory' },
  { id: 'tag-spicy', category_id: null, name: 'Spicy', slug: 'spicy' },
  { id: 'tag-salty', category_id: null, name: 'Salty', slug: 'salty' },
  { id: 'tag-chocolatey', category_id: null, name: 'Chocolatey', slug: 'chocolatey' },
  { id: 'tag-nutty', category_id: null, name: 'Nutty', slug: 'nutty' },
];

// ─── Mock Profile ────────────────────────────────────────

export const MOCK_PROFILE = {
  id: DEV_USER_ID,
  username: 'dev_tester',
  display_name: 'Dev Tester',
  avatar_url: null,
  bio: 'Testing all the things.',
  rereview_reminders: true,
  created_at: '2024-06-01T00:00:00Z',
  updated_at: '2024-06-01T00:00:00Z',
};

export const MOCK_PROFILE_STATS = {
  totalRatings: 42,
  avgScore: 7.3,
  followersCount: 8,
  followingCount: 12,
};

// ─── Mock Feed (sample ratings from "other users") ──────

export const MOCK_FEED_ITEMS = [
  {
    rating_id: 'feed-r1',
    rating_score: 9,
    rating_review_text: 'Best energy drink on the market. The citrus is so clean.',
    rating_photo_url: null,
    rating_would_buy_again: true,
    rating_created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    rating_updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    user_id: 'user-001',
    username: 'energy_queen',
    display_name: 'Sarah K.',
    avatar_url: null,
    product_id: MOCK_PRODUCTS[1].id,
    product_name: 'Monster Ultra White',
    brand_name: 'Monster Energy',
    product_image_url: null,
  },
  {
    rating_id: 'feed-r2',
    rating_score: 8,
    rating_review_text: 'Incredible flavor collab. Ghost never misses.',
    rating_photo_url: null,
    rating_would_buy_again: true,
    rating_created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    rating_updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    user_id: 'user-002',
    username: 'caffeine_mike',
    display_name: 'Mike T.',
    avatar_url: null,
    product_id: MOCK_PRODUCTS[11].id,
    product_name: 'Ghost Sour Patch Kids Blue Raspberry',
    brand_name: 'Ghost Energy',
    product_image_url: null,
  },
  {
    rating_id: 'feed-r3',
    rating_score: 5,
    rating_review_text: 'Overhyped. Tastes like flat candy water.',
    rating_photo_url: null,
    rating_would_buy_again: false,
    rating_created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    rating_updated_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    user_id: 'user-003',
    username: 'honest_reviewer',
    display_name: 'Alex J.',
    avatar_url: null,
    product_id: MOCK_PRODUCTS[16].id,
    product_name: 'Prime Energy Blue Raspberry',
    brand_name: 'Prime Energy',
    product_image_url: null,
  },
  {
    rating_id: 'feed-r4',
    rating_score: 10,
    rating_review_text: 'Sierra Nevada never disappoints. Perfect balance of hops and malt.',
    rating_photo_url: null,
    rating_would_buy_again: true,
    rating_created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    rating_updated_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    user_id: 'user-004',
    username: 'craft_beer_dan',
    display_name: 'Dan W.',
    avatar_url: null,
    product_id: MOCK_PRODUCTS.find(p => p.name.includes('Sierra Nevada Pale'))!.id,
    product_name: 'Sierra Nevada Pale Ale',
    brand_name: 'Sierra Nevada',
    product_image_url: null,
  },
  {
    rating_id: 'feed-r5',
    rating_score: 9,
    rating_review_text: 'Topo Chico is unmatched. The bubbles hit different.',
    rating_photo_url: null,
    rating_would_buy_again: true,
    rating_created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    rating_updated_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    user_id: 'user-001',
    username: 'energy_queen',
    display_name: 'Sarah K.',
    avatar_url: null,
    product_id: MOCK_PRODUCTS.find(p => p.name.includes('Topo Chico Original'))!.id,
    product_name: 'Topo Chico Original',
    brand_name: 'Topo Chico',
    product_image_url: null,
  },
];

// ─── Mock Notifications ──────────────────────────────────

export const MOCK_NOTIFICATIONS = [
  { id: 'notif-1', user_id: DEV_USER_ID, type: 'new_follower', actor_id: 'user-001', rating_id: null, comment_id: null, is_read: false, created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), actor: { username: 'energy_queen', display_name: 'Sarah K.', avatar_url: null } },
  { id: 'notif-2', user_id: DEV_USER_ID, type: 'rating_liked', actor_id: 'user-002', rating_id: 'feed-r1', comment_id: null, is_read: false, created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), actor: { username: 'caffeine_mike', display_name: 'Mike T.', avatar_url: null } },
  { id: 'notif-3', user_id: DEV_USER_ID, type: 'new_comment', actor_id: 'user-003', rating_id: 'feed-r1', comment_id: 'comment-1', is_read: true, created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), actor: { username: 'honest_reviewer', display_name: 'Alex J.', avatar_url: null } },
];

// ─── Search helper ───────────────────────────────────────

export function searchMockProducts(query: string): MockProduct[] {
  const q = query.toLowerCase();
  return MOCK_PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.brands.name.toLowerCase().includes(q) ||
      MOCK_CATEGORIES.find(c => c.id === p.category_id)?.name.toLowerCase().includes(q),
  );
}
