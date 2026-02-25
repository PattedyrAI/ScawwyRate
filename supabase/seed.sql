-- Everrate Seed Data

-- ============================================================
-- CATEGORIES
-- ============================================================

insert into public.categories (id, slug, name, icon_url, sort_order, is_active) values
  ('a1b2c3d4-0001-4000-8000-000000000001', 'energy_drinks', 'Energy Drinks', null, 1, true);

-- ============================================================
-- BRANDS
-- ============================================================

insert into public.brands (id, name, logo_url, website_url) values
  ('b1b2c3d4-0001-4000-8000-000000000001', 'Monster Energy', null, 'https://www.monsterenergy.com'),
  ('b1b2c3d4-0002-4000-8000-000000000002', 'Red Bull', null, 'https://www.redbull.com'),
  ('b1b2c3d4-0003-4000-8000-000000000003', 'Celsius', null, 'https://www.celsius.com'),
  ('b1b2c3d4-0004-4000-8000-000000000004', 'Bang Energy', null, 'https://bangenergy.com'),
  ('b1b2c3d4-0005-4000-8000-000000000005', 'Reign', null, 'https://www.reignbodyfuel.com'),
  ('b1b2c3d4-0006-4000-8000-000000000006', 'C4 Energy', null, 'https://c4energy.com'),
  ('b1b2c3d4-0007-4000-8000-000000000007', 'Ghost Energy', null, 'https://www.ghostlifestyle.com'),
  ('b1b2c3d4-0008-4000-8000-000000000008', 'ZOA', null, 'https://zoaenergy.com'),
  ('b1b2c3d4-0009-4000-8000-000000000009', 'Rockstar', null, 'https://www.rockstarenergy.com'),
  ('b1b2c3d4-0010-4000-8000-000000000010', 'NOS', null, null),
  ('b1b2c3d4-0011-4000-8000-000000000011', 'G Fuel', null, 'https://gfuel.com'),
  ('b1b2c3d4-0012-4000-8000-000000000012', 'Prime Energy', null, 'https://drinkprime.com'),
  ('b1b2c3d4-0013-4000-8000-000000000013', '3D Energy', null, 'https://3denergy.com'),
  ('b1b2c3d4-0014-4000-8000-000000000014', 'Alani Nu', null, 'https://www.alaninu.com');

-- ============================================================
-- TAGS (taste/experience descriptors)
-- ============================================================

-- Universal tags (category_id = null)
insert into public.tags (id, category_id, name, slug) values
  ('c1b2c3d4-0001-4000-8000-000000000001', null, 'Sweet', 'sweet'),
  ('c1b2c3d4-0002-4000-8000-000000000002', null, 'Bitter', 'bitter'),
  ('c1b2c3d4-0003-4000-8000-000000000003', null, 'Sour', 'sour'),
  ('c1b2c3d4-0004-4000-8000-000000000004', null, 'Smooth', 'smooth'),
  ('c1b2c3d4-0005-4000-8000-000000000005', null, 'Refreshing', 'refreshing'),
  ('c1b2c3d4-0006-4000-8000-000000000006', null, 'Mild', 'mild'),
  ('c1b2c3d4-0007-4000-8000-000000000007', null, 'Strong', 'strong'),
  ('c1b2c3d4-0008-4000-8000-000000000008', null, 'Artificial', 'artificial');

-- Energy drink-specific tags
insert into public.tags (id, category_id, name, slug) values
  ('c1b2c3d4-0101-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'Citrus', 'citrus'),
  ('c1b2c3d4-0102-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001', 'Berry', 'berry'),
  ('c1b2c3d4-0103-4000-8000-000000000003', 'a1b2c3d4-0001-4000-8000-000000000001', 'Tropical', 'tropical'),
  ('c1b2c3d4-0104-4000-8000-000000000004', 'a1b2c3d4-0001-4000-8000-000000000001', 'Carbonated', 'carbonated'),
  ('c1b2c3d4-0105-4000-8000-000000000005', 'a1b2c3d4-0001-4000-8000-000000000001', 'Energy Kick', 'energy-kick'),
  ('c1b2c3d4-0106-4000-8000-000000000006', 'a1b2c3d4-0001-4000-8000-000000000001', 'Candy-like', 'candy-like'),
  ('c1b2c3d4-0107-4000-8000-000000000007', 'a1b2c3d4-0001-4000-8000-000000000001', 'Medicinal', 'medicinal'),
  ('c1b2c3d4-0108-4000-8000-000000000008', 'a1b2c3d4-0001-4000-8000-000000000001', 'Crisp', 'crisp'),
  ('c1b2c3d4-0109-4000-8000-000000000009', 'a1b2c3d4-0001-4000-8000-000000000001', 'Creamy', 'creamy'),
  ('c1b2c3d4-0110-4000-8000-000000000010', 'a1b2c3d4-0001-4000-8000-000000000001', 'No Aftertaste', 'no-aftertaste');

-- ============================================================
-- SAMPLE PRODUCTS (popular energy drinks)
-- ============================================================

insert into public.products (id, category_id, brand_id, name, description, is_verified, attributes) values
  ('d1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0001-4000-8000-000000000001',
   'Monster Energy Original', 'The classic green Monster.', true,
   '{"flavor": "Original", "sugar_free": false, "volume_ml": 473, "caffeine_mg": 160}'),

  ('d1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0001-4000-8000-000000000001',
   'Monster Ultra White', 'Zero sugar, light citrus flavor.', true,
   '{"flavor": "Ultra White", "sugar_free": true, "volume_ml": 473, "caffeine_mg": 150}'),

  ('d1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0001-4000-8000-000000000001',
   'Monster Ultra Rosa', 'Zero sugar, guava-strawberry flavor.', true,
   '{"flavor": "Ultra Rosa", "sugar_free": true, "volume_ml": 473, "caffeine_mg": 150}'),

  ('d1b2c3d4-0004-4000-8000-000000000004', 'a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0002-4000-8000-000000000002',
   'Red Bull Original', 'The original energy drink.', true,
   '{"flavor": "Original", "sugar_free": false, "volume_ml": 250, "caffeine_mg": 80}'),

  ('d1b2c3d4-0005-4000-8000-000000000005', 'a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0002-4000-8000-000000000002',
   'Red Bull Sugar Free', 'Sugar free version of the classic.', true,
   '{"flavor": "Original", "sugar_free": true, "volume_ml": 250, "caffeine_mg": 80}'),

  ('d1b2c3d4-0006-4000-8000-000000000006', 'a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0003-4000-8000-000000000003',
   'Celsius Sparkling Orange', 'Fitness energy drink with sparkling orange.', true,
   '{"flavor": "Sparkling Orange", "sugar_free": true, "volume_ml": 355, "caffeine_mg": 200}'),

  ('d1b2c3d4-0007-4000-8000-000000000007', 'a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0003-4000-8000-000000000003',
   'Celsius Tropical Vibe', 'Sparkling tropical punch flavor.', true,
   '{"flavor": "Tropical Vibe", "sugar_free": true, "volume_ml": 355, "caffeine_mg": 200}'),

  ('d1b2c3d4-0008-4000-8000-000000000008', 'a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0007-4000-8000-000000000007',
   'Ghost Energy Sour Patch Kids Blue Raspberry', 'Licensed Sour Patch Kids flavor.', true,
   '{"flavor": "Sour Patch Kids Blue Raspberry", "sugar_free": true, "volume_ml": 473, "caffeine_mg": 200}'),

  ('d1b2c3d4-0009-4000-8000-000000000009', 'a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0014-4000-8000-000000000014',
   'Alani Nu Cosmic Stardust', 'Fruity candy-inspired flavor.', true,
   '{"flavor": "Cosmic Stardust", "sugar_free": true, "volume_ml": 355, "caffeine_mg": 200}'),

  ('d1b2c3d4-0010-4000-8000-000000000010', 'a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0012-4000-8000-000000000012',
   'Prime Energy Blue Raspberry', 'Low-calorie energy drink.', true,
   '{"flavor": "Blue Raspberry", "sugar_free": true, "volume_ml": 355, "caffeine_mg": 200}');
