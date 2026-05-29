import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { isDevMode } from '@/lib/isDevMode';
import { searchMockProducts, MOCK_PRODUCTS, MOCK_BRANDS, MOCK_TAGS } from '@/lib/mockData';
import * as productsService from '../products.service';
import type { InsertTables } from '@/types/database';

export function useSearchProducts(query: string) {
  return useQuery({
    queryKey: queryKeys.products.search(query),
    queryFn: () => {
      if (isDevMode()) return searchMockProducts(query) as any;
      return productsService.searchProducts(query);
    },
    enabled: query.length >= 2,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => {
      if (isDevMode()) {
        const product = MOCK_PRODUCTS.find((p) => p.id === id);
        if (!product) throw new Error('Product not found');
        return product as any;
      }
      return productsService.getProduct(id);
    },
    enabled: !!id,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.brands.all,
    queryFn: () => {
      if (isDevMode()) return MOCK_BRANDS as any;
      return productsService.getBrands();
    },
  });
}

export function useTags(categoryId?: string | null) {
  return useQuery({
    queryKey: queryKeys.tags.byCategory(categoryId ?? null),
    queryFn: () => {
      if (isDevMode()) return MOCK_TAGS as any;
      return productsService.getTags(categoryId);
    },
  });
}

export function useAddProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (product: InsertTables<'products'>) => productsService.addProduct(product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

export function useAddBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => productsService.addBrand(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
    },
  });
}
