import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import * as productsService from '../products.service';
import type { InsertTables } from '@/types/database';

export function useSearchProducts(query: string) {
  return useQuery({
    queryKey: queryKeys.products.search(query),
    queryFn: () => productsService.searchProducts(query),
    enabled: query.length >= 2,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => productsService.getProduct(id),
    enabled: !!id,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.brands.all,
    queryFn: productsService.getBrands,
  });
}

export function useTags(categoryId?: string | null) {
  return useQuery({
    queryKey: queryKeys.tags.byCategory(categoryId ?? null),
    queryFn: () => productsService.getTags(categoryId),
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
