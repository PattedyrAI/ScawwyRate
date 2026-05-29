import { useState, useCallback } from 'react';
import { View, TextInput, FlatList, Pressable, Text, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSearchProducts } from '@/features/products/hooks/useProducts';
import { useRatingDraftStore } from '@/stores/ratingDraftStore';
import { colors, typography, spacing, borderRadius } from '@/theme';
import type { ProductWithBrand } from '@/types/database';

export default function SelectProductScreen() {
  const [query, setQuery] = useState('');
  const { data: products, isLoading } = useSearchProducts(query);
  const setProduct = useRatingDraftStore((s) => s.setProduct);
  const router = useRouter();

  const handleSelect = useCallback(
    (product: ProductWithBrand) => {
      setProduct(product.id, product.name);
      router.push('/(tabs)/(rate)/write-review');
    },
    [setProduct, router],
  );

  const handleAddNew = useCallback(() => {
    router.push('/(tabs)/(rate)/add-product');
  }, [router]);

  const renderProduct = useCallback(
    ({ item }: { item: ProductWithBrand }) => (
      <Pressable style={styles.item} onPress={() => handleSelect(item)}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
            <Ionicons name="beer-outline" size={20} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemBrand} numberOfLines={1}>
            {item.brands?.name ?? 'Unknown brand'}
          </Text>
        </View>
        <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
      </Pressable>
    ),
    [handleSelect],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>What are you rating?</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search drinks, snacks, coffee..."
          placeholderTextColor={colors.textMuted}
          autoFocus
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={styles.list}
        ListFooterComponent={
          query.length >= 2 ? (
            <Pressable style={styles.addNewButton} onPress={handleAddNew}>
              <Ionicons name="add" size={24} color={colors.primary} />
              <Text style={styles.addNewText}>
                Can't find it? Add "{query}"
              </Text>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          query.length < 2 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>Start typing to search</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xl,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    height: '100%',
  },
  list: {
    padding: spacing.xl,
    paddingTop: spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  itemImage: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
  },
  itemImagePlaceholder: {
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.label,
    color: colors.text,
  },
  itemBrand: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addNewText: {
    ...typography.bodySmall,
    color: colors.primary,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
