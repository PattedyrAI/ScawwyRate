-- Everrate Seed Data (expanded with multiple categories)

-- ============================================================
-- CATEGORIES
-- ============================================================

insert into public.categories (id, slug, name, icon_url, sort_order, is_active) values
  ('a1b2c3d4-0001-4000-8000-000000000001', 'energy_drinks', 'Energy Drinks', null, 1, true),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'coffee', 'Coffee', null, 2, true),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'soda', 'Soda', null, 3, true),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'beer', 'Beer', null, 4, true),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'snacks', 'Snacks', null, 5, true),
  ('a1b2c3d4-0006-4000-8000-000000000006', 'water', 'Water & Sparkling', null, 6, true);

-- ============================================================
-- BRANDS
-- ============================================================

insert into public.brands (id, name, logo_url, website_url) values
  -- Energy
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
  ('b1b2c3d4-0014-4000-8000-000000000014', 'Alani Nu', null, 'https://www.alaninu.com'),
  -- Coffee
  ('b1b2c3d4-0015-4000-8000-000000000015', 'Starbucks', null, 'https://www.starbucks.com'),
  ('b1b2c3d4-0016-4000-8000-000000000016', 'Dunkin''', null, 'https://www.dunkindonuts.com'),
  ('b1b2c3d4-0017-4000-8000-000000000017', 'Lavazza', null, 'https://www.lavazza.com'),
  ('b1b2c3d4-0018-4000-8000-000000000018', 'Nespresso', null, 'https://www.nespresso.com'),
  ('b1b2c3d4-0019-4000-8000-000000000019', 'Oatly', null, 'https://www.oatly.com'),
  -- Soda
  ('b1b2c3d4-0020-4000-8000-000000000020', 'Coca-Cola', null, 'https://www.coca-cola.com'),
  ('b1b2c3d4-0021-4000-8000-000000000021', 'Pepsi', null, 'https://www.pepsi.com'),
  ('b1b2c3d4-0022-4000-8000-000000000022', 'Dr Pepper', null, 'https://www.drpepper.com'),
  ('b1b2c3d4-0023-4000-8000-000000000023', 'Sprite', null, null),
  ('b1b2c3d4-0024-4000-8000-000000000024', 'Fanta', null, null),
  ('b1b2c3d4-0025-4000-8000-000000000025', 'Mountain Dew', null, 'https://www.mountaindew.com'),
  ('b1b2c3d4-0026-4000-8000-000000000026', 'Jarritos', null, 'https://www.jarritos.com'),
  -- Beer
  ('b1b2c3d4-0027-4000-8000-000000000027', 'Guinness', null, 'https://www.guinness.com'),
  ('b1b2c3d4-0028-4000-8000-000000000028', 'Heineken', null, 'https://www.heineken.com'),
  ('b1b2c3d4-0029-4000-8000-000000000029', 'Corona', null, null),
  ('b1b2c3d4-0030-4000-8000-000000000030', 'Sierra Nevada', null, 'https://www.sierranevada.com'),
  ('b1b2c3d4-0031-4000-8000-000000000031', 'Lagunitas', null, 'https://lagunitas.com'),
  ('b1b2c3d4-0032-4000-8000-000000000032', 'Athletic Brewing', null, 'https://athleticbrewing.com'),
  -- Snacks
  ('b1b2c3d4-0033-4000-8000-000000000033', 'Lay''s', null, null),
  ('b1b2c3d4-0034-4000-8000-000000000034', 'Doritos', null, null),
  ('b1b2c3d4-0035-4000-8000-000000000035', 'Oreo', null, null),
  ('b1b2c3d4-0036-4000-8000-000000000036', 'Haribo', null, 'https://www.haribo.com'),
  ('b1b2c3d4-0037-4000-8000-000000000037', 'KIND', null, 'https://www.kindsnacks.com'),
  ('b1b2c3d4-0038-4000-8000-000000000038', 'RXBAR', null, 'https://www.rxbar.com'),
  -- Water
  ('b1b2c3d4-0039-4000-8000-000000000039', 'San Pellegrino', null, 'https://www.sanpellegrino.com'),
  ('b1b2c3d4-0040-4000-8000-000000000040', 'Topo Chico', null, null),
  ('b1b2c3d4-0041-4000-8000-000000000041', 'Liquid Death', null, 'https://liquiddeath.com'),
  ('b1b2c3d4-0042-4000-8000-000000000042', 'VOSS', null, 'https://www.vosswater.com');

-- ============================================================
-- TAGS (taste/experience descriptors)
-- ============================================================

-- Universal tags
insert into public.tags (id, category_id, name, slug) values
  ('c1b2c3d4-0001-4000-8000-000000000001', null, 'Sweet', 'sweet'),
  ('c1b2c3d4-0002-4000-8000-000000000002', null, 'Bitter', 'bitter'),
  ('c1b2c3d4-0003-4000-8000-000000000003', null, 'Sour', 'sour'),
  ('c1b2c3d4-0004-4000-8000-000000000004', null, 'Smooth', 'smooth'),
  ('c1b2c3d4-0005-4000-8000-000000000005', null, 'Refreshing', 'refreshing'),
  ('c1b2c3d4-0006-4000-8000-000000000006', null, 'Mild', 'mild'),
  ('c1b2c3d4-0007-4000-8000-000000000007', null, 'Strong', 'strong'),
  ('c1b2c3d4-0008-4000-8000-000000000008', null, 'Artificial', 'artificial'),
  ('c1b2c3d4-0009-4000-8000-000000000009', null, 'Citrus', 'citrus'),
  ('c1b2c3d4-0010-4000-8000-000000000010', null, 'Berry', 'berry'),
  ('c1b2c3d4-0011-4000-8000-000000000011', null, 'Tropical', 'tropical'),
  ('c1b2c3d4-0012-4000-8000-000000000012', null, 'Carbonated', 'carbonated'),
  ('c1b2c3d4-0013-4000-8000-000000000013', null, 'Crisp', 'crisp'),
  ('c1b2c3d4-0014-4000-8000-000000000014', null, 'Creamy', 'creamy'),
  ('c1b2c3d4-0015-4000-8000-000000000015', null, 'Crunchy', 'crunchy'),
  ('c1b2c3d4-0016-4000-8000-000000000016', null, 'Savory', 'savory'),
  ('c1b2c3d4-0017-4000-8000-000000000017', null, 'Spicy', 'spicy'),
  ('c1b2c3d4-0018-4000-8000-000000000018', null, 'Salty', 'salty'),
  ('c1b2c3d4-0019-4000-8000-000000000019', null, 'Chocolatey', 'chocolatey'),
  ('c1b2c3d4-0020-4000-8000-000000000020', null, 'Nutty', 'nutty');

-- Energy drink-specific tags
insert into public.tags (id, category_id, name, slug) values
  ('c1b2c3d4-0101-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'Energy Kick', 'energy-kick'),
  ('c1b2c3d4-0102-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001', 'Candy-like', 'candy-like'),
  ('c1b2c3d4-0103-4000-8000-000000000003', 'a1b2c3d4-0001-4000-8000-000000000001', 'Medicinal', 'medicinal'),
  ('c1b2c3d4-0104-4000-8000-000000000004', 'a1b2c3d4-0001-4000-8000-000000000001', 'No Aftertaste', 'no-aftertaste');

-- Coffee-specific tags
insert into public.tags (id, category_id, name, slug) values
  ('c1b2c3d4-0201-4000-8000-000000000001', 'a1b2c3d4-0002-4000-8000-000000000002', 'Roasty', 'roasty'),
  ('c1b2c3d4-0202-4000-8000-000000000002', 'a1b2c3d4-0002-4000-8000-000000000002', 'Earthy', 'earthy'),
  ('c1b2c3d4-0203-4000-8000-000000000003', 'a1b2c3d4-0002-4000-8000-000000000002', 'Fruity Notes', 'fruity-notes'),
  ('c1b2c3d4-0204-4000-8000-000000000004', 'a1b2c3d4-0002-4000-8000-000000000002', 'Bold', 'bold');

-- Beer-specific tags
insert into public.tags (id, category_id, name, slug) values
  ('c1b2c3d4-0301-4000-8000-000000000001', 'a1b2c3d4-0004-4000-8000-000000000004', 'Hoppy', 'hoppy'),
  ('c1b2c3d4-0302-4000-8000-000000000002', 'a1b2c3d4-0004-4000-8000-000000000004', 'Malty', 'malty'),
  ('c1b2c3d4-0303-4000-8000-000000000003', 'a1b2c3d4-0004-4000-8000-000000000004', 'Light', 'light-beer'),
  ('c1b2c3d4-0304-4000-8000-000000000004', 'a1b2c3d4-0004-4000-8000-000000000004', 'Sessionable', 'sessionable');

-- ============================================================
-- PRODUCTS
-- ============================================================

-- Energy Drinks (25)
insert into public.products (category_id, brand_id, name, description, is_verified, attributes) values
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0001-4000-8000-000000000001', 'Monster Energy Original', 'The classic green Monster.', true, '{"flavor": "Original", "sugar_free": false, "volume_ml": 473, "caffeine_mg": 160}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0001-4000-8000-000000000001', 'Monster Ultra White', 'Zero sugar, light citrus flavor.', true, '{"flavor": "Ultra White", "sugar_free": true, "volume_ml": 473, "caffeine_mg": 150}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0001-4000-8000-000000000001', 'Monster Ultra Rosa', 'Zero sugar, guava-strawberry flavor.', true, '{"flavor": "Ultra Rosa", "sugar_free": true, "volume_ml": 473, "caffeine_mg": 150}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0001-4000-8000-000000000001', 'Monster Mango Loco', 'Juice Monster with mango.', true, '{"flavor": "Mango Loco", "sugar_free": false, "volume_ml": 473, "caffeine_mg": 160}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0001-4000-8000-000000000001', 'Monster Ultra Watermelon', 'Zero sugar watermelon.', true, '{"flavor": "Ultra Watermelon", "sugar_free": true, "volume_ml": 473, "caffeine_mg": 150}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0002-4000-8000-000000000002', 'Red Bull Original', 'The original energy drink.', true, '{"flavor": "Original", "sugar_free": false, "volume_ml": 250, "caffeine_mg": 80}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0002-4000-8000-000000000002', 'Red Bull Sugar Free', 'Sugar free version of the classic.', true, '{"flavor": "Original", "sugar_free": true, "volume_ml": 250, "caffeine_mg": 80}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0002-4000-8000-000000000002', 'Red Bull Tropical Edition', 'Tropical fruit flavor.', true, '{"flavor": "Tropical", "sugar_free": false, "volume_ml": 250, "caffeine_mg": 80}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0003-4000-8000-000000000003', 'Celsius Sparkling Orange', 'Fitness energy with sparkling orange.', true, '{"flavor": "Sparkling Orange", "sugar_free": true, "volume_ml": 355, "caffeine_mg": 200}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0003-4000-8000-000000000003', 'Celsius Tropical Vibe', 'Sparkling tropical punch.', true, '{"flavor": "Tropical Vibe", "sugar_free": true, "volume_ml": 355, "caffeine_mg": 200}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0003-4000-8000-000000000003', 'Celsius Peach Vibe', 'Sparkling peach.', true, '{"flavor": "Peach Vibe", "sugar_free": true, "volume_ml": 355, "caffeine_mg": 200}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0007-4000-8000-000000000007', 'Ghost Sour Patch Kids Blue Raspberry', 'Licensed Sour Patch Kids flavor.', true, '{"flavor": "Sour Patch Kids Blue Raspberry", "sugar_free": true, "volume_ml": 473, "caffeine_mg": 200}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0007-4000-8000-000000000007', 'Ghost Warheads Sour Watermelon', 'Licensed Warheads flavor.', true, '{"flavor": "Warheads Sour Watermelon", "sugar_free": true, "volume_ml": 473, "caffeine_mg": 200}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0014-4000-8000-000000000014', 'Alani Nu Cosmic Stardust', 'Fruity candy-inspired.', true, '{"flavor": "Cosmic Stardust", "sugar_free": true, "volume_ml": 355, "caffeine_mg": 200}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0014-4000-8000-000000000014', 'Alani Nu Hawaiian Shaved Ice', 'Tropical shaved ice.', true, '{"flavor": "Hawaiian Shaved Ice", "sugar_free": true, "volume_ml": 355, "caffeine_mg": 200}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0014-4000-8000-000000000014', 'Alani Nu Mimosa', 'Champagne and OJ.', true, '{"flavor": "Mimosa", "sugar_free": true, "volume_ml": 355, "caffeine_mg": 200}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0012-4000-8000-000000000012', 'Prime Energy Blue Raspberry', 'Low-calorie energy drink.', true, '{"flavor": "Blue Raspberry", "sugar_free": true, "volume_ml": 355, "caffeine_mg": 200}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0012-4000-8000-000000000012', 'Prime Energy Tropical Punch', 'Tropical punch flavor.', true, '{"flavor": "Tropical Punch", "sugar_free": true, "volume_ml": 355, "caffeine_mg": 200}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0006-4000-8000-000000000006', 'C4 Frozen Bombsicle', 'Popsicle-inspired.', true, '{"flavor": "Frozen Bombsicle", "sugar_free": true, "volume_ml": 473, "caffeine_mg": 200}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0005-4000-8000-000000000005', 'Reign Orange Dreamsicle', 'Orange cream.', true, '{"flavor": "Orange Dreamsicle", "sugar_free": true, "volume_ml": 473, "caffeine_mg": 300}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0004-4000-8000-000000000004', 'Bang Rainbow Unicorn', 'Fruity rainbow mix.', true, '{"flavor": "Rainbow Unicorn", "sugar_free": true, "volume_ml": 473, "caffeine_mg": 300}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0009-4000-8000-000000000009', 'Rockstar Original', 'Classic Rockstar.', true, '{"flavor": "Original", "sugar_free": false, "volume_ml": 473, "caffeine_mg": 160}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0008-4000-8000-000000000008', 'ZOA Wild Orange', 'The Rock''s energy drink.', true, '{"flavor": "Wild Orange", "sugar_free": true, "volume_ml": 355, "caffeine_mg": 160}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0011-4000-8000-000000000011', 'G Fuel FaZeberry', 'Mixed berry esports drink.', true, '{"flavor": "FaZeberry", "sugar_free": true, "volume_ml": 473, "caffeine_mg": 140}'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'b1b2c3d4-0010-4000-8000-000000000010', 'NOS Original', 'High-performance energy.', true, '{"flavor": "Original", "sugar_free": false, "volume_ml": 473, "caffeine_mg": 160}');

-- Coffee (12)
insert into public.products (category_id, brand_id, name, description, is_verified, attributes) values
  ('a1b2c3d4-0002-4000-8000-000000000002', 'b1b2c3d4-0015-4000-8000-000000000015', 'Starbucks Doubleshot Espresso', 'Canned espresso with cream.', true, '{"roast": "medium", "type": "canned", "milk": "cream"}'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'b1b2c3d4-0015-4000-8000-000000000015', 'Starbucks Frappuccino Mocha', 'Bottled mocha frappuccino.', true, '{"roast": "medium", "type": "bottled", "milk": "whole"}'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'b1b2c3d4-0015-4000-8000-000000000015', 'Starbucks Cold Brew Black', 'Unsweetened cold brew.', true, '{"roast": "dark", "type": "bottled", "milk": "none"}'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'b1b2c3d4-0016-4000-8000-000000000016', 'Dunkin'' Iced Coffee Original', 'Classic iced coffee.', true, '{"roast": "medium", "type": "bottled", "milk": "cream"}'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'b1b2c3d4-0016-4000-8000-000000000016', 'Dunkin'' Cold Brew Caramel', 'Caramel cold brew.', true, '{"roast": "medium", "type": "bottled", "milk": "whole"}'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'b1b2c3d4-0017-4000-8000-000000000017', 'Lavazza Super Crema Whole Bean', 'Italian whole bean blend.', true, '{"roast": "medium", "type": "whole_bean", "origin": "blend"}'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'b1b2c3d4-0018-4000-8000-000000000018', 'Nespresso Vertuo Intenso', 'Rich and intense capsule.', true, '{"roast": "dark", "type": "capsule", "intensity": 9}'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'b1b2c3d4-0018-4000-8000-000000000018', 'Nespresso Vertuo Melozio', 'Smooth and balanced.', true, '{"roast": "medium", "type": "capsule", "intensity": 6}'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'b1b2c3d4-0019-4000-8000-000000000019', 'Oatly Oat Milk Latte', 'Oat milk cold brew latte.', true, '{"roast": "medium", "type": "bottled", "milk": "oat"}'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'b1b2c3d4-0015-4000-8000-000000000015', 'Starbucks Pike Place K-Cup', 'Smooth medium roast.', true, '{"roast": "medium", "type": "k-cup", "origin": "Latin America"}'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'b1b2c3d4-0017-4000-8000-000000000017', 'Lavazza Qualità Rossa Ground', 'Classic Italian ground coffee.', true, '{"roast": "medium", "type": "ground", "origin": "blend"}'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'b1b2c3d4-0015-4000-8000-000000000015', 'Starbucks Nitro Cold Brew Vanilla', 'Nitrogen-infused vanilla.', true, '{"roast": "dark", "type": "canned", "milk": "vanilla_cream"}');

-- Soda (15)
insert into public.products (category_id, brand_id, name, description, is_verified, attributes) values
  ('a1b2c3d4-0003-4000-8000-000000000003', 'b1b2c3d4-0020-4000-8000-000000000020', 'Coca-Cola Original', 'The classic.', true, '{"sugar_free": false, "volume_ml": 355}'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'b1b2c3d4-0020-4000-8000-000000000020', 'Coca-Cola Zero Sugar', 'Zero sugar version.', true, '{"sugar_free": true, "volume_ml": 355}'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'b1b2c3d4-0020-4000-8000-000000000020', 'Cherry Coca-Cola', 'Cherry-flavored.', true, '{"sugar_free": false, "volume_ml": 355}'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'b1b2c3d4-0021-4000-8000-000000000021', 'Pepsi Original', 'The other classic.', true, '{"sugar_free": false, "volume_ml": 355}'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'b1b2c3d4-0021-4000-8000-000000000021', 'Pepsi Zero Sugar', 'Zero sugar Pepsi.', true, '{"sugar_free": true, "volume_ml": 355}'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'b1b2c3d4-0022-4000-8000-000000000022', 'Dr Pepper Original', '23 flavors.', true, '{"sugar_free": false, "volume_ml": 355}'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'b1b2c3d4-0022-4000-8000-000000000022', 'Dr Pepper Cherry', 'Cherry Dr Pepper.', true, '{"sugar_free": false, "volume_ml": 355}'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'b1b2c3d4-0023-4000-8000-000000000023', 'Sprite Original', 'Lemon-lime.', true, '{"sugar_free": false, "volume_ml": 355}'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'b1b2c3d4-0024-4000-8000-000000000024', 'Fanta Orange', 'Orange soda.', true, '{"sugar_free": false, "volume_ml": 355}'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'b1b2c3d4-0024-4000-8000-000000000024', 'Fanta Grape', 'Grape soda.', true, '{"sugar_free": false, "volume_ml": 355}'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'b1b2c3d4-0025-4000-8000-000000000025', 'Mountain Dew Original', 'Do the Dew.', true, '{"sugar_free": false, "volume_ml": 355}'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'b1b2c3d4-0025-4000-8000-000000000025', 'Mountain Dew Baja Blast', 'Taco Bell exclusive.', true, '{"sugar_free": false, "volume_ml": 355}'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'b1b2c3d4-0026-4000-8000-000000000026', 'Jarritos Mandarin', 'Mexican mandarin soda.', true, '{"sugar_free": false, "volume_ml": 370}'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'b1b2c3d4-0026-4000-8000-000000000026', 'Jarritos Tamarind', 'Mexican tamarind soda.', true, '{"sugar_free": false, "volume_ml": 370}'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'b1b2c3d4-0026-4000-8000-000000000026', 'Jarritos Guava', 'Mexican guava soda.', true, '{"sugar_free": false, "volume_ml": 370}');

-- Beer (10)
insert into public.products (category_id, brand_id, name, description, is_verified, attributes) values
  ('a1b2c3d4-0004-4000-8000-000000000004', 'b1b2c3d4-0027-4000-8000-000000000027', 'Guinness Draught', 'Iconic Irish dry stout.', true, '{"abv": 4.2, "style": "Stout", "volume_ml": 440}'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'b1b2c3d4-0028-4000-8000-000000000028', 'Heineken Original', 'Dutch premium lager.', true, '{"abv": 5.0, "style": "Lager", "volume_ml": 330}'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'b1b2c3d4-0028-4000-8000-000000000028', 'Heineken Silver', 'Light and refreshing.', true, '{"abv": 4.0, "style": "Lager", "volume_ml": 330}'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'b1b2c3d4-0029-4000-8000-000000000029', 'Corona Extra', 'Mexican lager. Add lime.', true, '{"abv": 4.5, "style": "Lager", "volume_ml": 355}'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'b1b2c3d4-0030-4000-8000-000000000030', 'Sierra Nevada Pale Ale', 'Classic American pale ale.', true, '{"abv": 5.6, "style": "Pale Ale", "volume_ml": 355}'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'b1b2c3d4-0030-4000-8000-000000000030', 'Sierra Nevada Hazy Little Thing', 'Hazy IPA.', true, '{"abv": 6.7, "style": "Hazy IPA", "volume_ml": 355}'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'b1b2c3d4-0031-4000-8000-000000000031', 'Lagunitas IPA', 'West Coast IPA.', true, '{"abv": 6.2, "style": "IPA", "volume_ml": 355}'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'b1b2c3d4-0031-4000-8000-000000000031', 'Lagunitas A Little Sumpin Sumpin', 'Wheat ale/IPA hybrid.', true, '{"abv": 7.5, "style": "IPA", "volume_ml": 355}'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'b1b2c3d4-0032-4000-8000-000000000032', 'Athletic Run Wild IPA', 'Non-alcoholic craft IPA.', true, '{"abv": 0.5, "style": "NA IPA", "volume_ml": 355}'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'b1b2c3d4-0032-4000-8000-000000000032', 'Athletic Free Wave Hazy IPA', 'Non-alcoholic hazy.', true, '{"abv": 0.5, "style": "NA Hazy IPA", "volume_ml": 355}');

-- Snacks (12)
insert into public.products (category_id, brand_id, name, description, is_verified, attributes) values
  ('a1b2c3d4-0005-4000-8000-000000000005', 'b1b2c3d4-0033-4000-8000-000000000033', 'Lay''s Classic', 'Classic potato chips.', true, '{"type": "chips", "flavor": "Original"}'),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'b1b2c3d4-0033-4000-8000-000000000033', 'Lay''s Sour Cream & Onion', 'Tangy sour cream chips.', true, '{"type": "chips", "flavor": "Sour Cream & Onion"}'),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'b1b2c3d4-0033-4000-8000-000000000033', 'Lay''s BBQ', 'Smoky BBQ chips.', true, '{"type": "chips", "flavor": "BBQ"}'),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'b1b2c3d4-0034-4000-8000-000000000034', 'Doritos Nacho Cheese', 'The classic nacho chip.', true, '{"type": "chips", "flavor": "Nacho Cheese"}'),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'b1b2c3d4-0034-4000-8000-000000000034', 'Doritos Cool Ranch', 'Cool ranch flavor.', true, '{"type": "chips", "flavor": "Cool Ranch"}'),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'b1b2c3d4-0034-4000-8000-000000000034', 'Doritos Spicy Sweet Chili', 'Sweet heat.', true, '{"type": "chips", "flavor": "Spicy Sweet Chili"}'),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'b1b2c3d4-0035-4000-8000-000000000035', 'Oreo Original', 'Milk''s favorite cookie.', true, '{"type": "cookie", "flavor": "Original"}'),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'b1b2c3d4-0035-4000-8000-000000000035', 'Oreo Double Stuf', 'Double the cream.', true, '{"type": "cookie", "flavor": "Double Stuf"}'),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'b1b2c3d4-0036-4000-8000-000000000036', 'Haribo Gold-Bears', 'Classic gummy bears.', true, '{"type": "candy", "flavor": "Mixed Fruit"}'),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'b1b2c3d4-0036-4000-8000-000000000036', 'Haribo Sour S''ghetti', 'Sour gummy strings.', true, '{"type": "candy", "flavor": "Sour"}'),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'b1b2c3d4-0037-4000-8000-000000000037', 'KIND Dark Chocolate Nuts & Sea Salt', 'Nutty dark chocolate bar.', true, '{"type": "bar", "flavor": "Dark Chocolate"}'),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'b1b2c3d4-0038-4000-8000-000000000038', 'RXBAR Chocolate Sea Salt', 'Clean protein bar.', true, '{"type": "bar", "flavor": "Chocolate Sea Salt"}');

-- Water & Sparkling (8)
insert into public.products (category_id, brand_id, name, description, is_verified, attributes) values
  ('a1b2c3d4-0006-4000-8000-000000000006', 'b1b2c3d4-0039-4000-8000-000000000039', 'San Pellegrino Aranciata', 'Italian blood orange sparkling.', true, '{"type": "sparkling", "flavor": "Blood Orange"}'),
  ('a1b2c3d4-0006-4000-8000-000000000006', 'b1b2c3d4-0039-4000-8000-000000000039', 'San Pellegrino Limonata', 'Italian lemon sparkling.', true, '{"type": "sparkling", "flavor": "Lemon"}'),
  ('a1b2c3d4-0006-4000-8000-000000000006', 'b1b2c3d4-0040-4000-8000-000000000040', 'Topo Chico Original', 'Mexican mineral water.', true, '{"type": "sparkling", "flavor": "Original"}'),
  ('a1b2c3d4-0006-4000-8000-000000000006', 'b1b2c3d4-0040-4000-8000-000000000040', 'Topo Chico Sabores Lime Mint', 'Flavored mineral water.', true, '{"type": "sparkling", "flavor": "Lime Mint"}'),
  ('a1b2c3d4-0006-4000-8000-000000000006', 'b1b2c3d4-0041-4000-8000-000000000041', 'Liquid Death Mountain Water', 'Murder your thirst. Still.', true, '{"type": "still", "flavor": "Original"}'),
  ('a1b2c3d4-0006-4000-8000-000000000006', 'b1b2c3d4-0041-4000-8000-000000000041', 'Liquid Death Sparkling', 'Murder your thirst. Sparkling.', true, '{"type": "sparkling", "flavor": "Original"}'),
  ('a1b2c3d4-0006-4000-8000-000000000006', 'b1b2c3d4-0041-4000-8000-000000000041', 'Liquid Death Mango Chainsaw', 'Mango agave sparkling.', true, '{"type": "sparkling", "flavor": "Mango"}'),
  ('a1b2c3d4-0006-4000-8000-000000000006', 'b1b2c3d4-0042-4000-8000-000000000042', 'VOSS Artesian Still', 'Norwegian artesian water.', true, '{"type": "still", "flavor": "Original"}');
