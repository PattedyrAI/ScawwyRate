import { supabase } from '@/lib/supabase';
import type { Product, Brand, ProductWithBrand, InsertTables, Tag } from '@/types/database';

export async function searchProducts(query: string, limit = 20): Promise<ProductWithBrand[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, brands(*)')
    .or(`name.ilike.%${query}%,brands.name.ilike.%${query}%`)
    .order('rating_count', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as ProductWithBrand[];
}

export async function getProduct(id: string): Promise<ProductWithBrand> {
  const { data, error } = await supabase
    .from('products')
    .select('*, brands(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as unknown as ProductWithBrand;
}

export async function getProductsByCategory(categorySlug: string, limit = 50): Promise<ProductWithBrand[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, brands(*), categories!inner(slug)')
    .eq('categories.slug', categorySlug)
    .order('avg_rating', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as ProductWithBrand[];
}

export async function addProduct(product: InsertTables<'products'>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getBrands(): Promise<Brand[]> {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export async function addBrand(name: string): Promise<Brand> {
  const { data, error } = await supabase
    .from('brands')
    .insert({ name })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTags(categoryId?: string | null): Promise<Tag[]> {
  let query = supabase.from('tags').select('*').order('name');

  if (categoryId) {
    query = query.or(`category_id.eq.${categoryId},category_id.is.null`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
