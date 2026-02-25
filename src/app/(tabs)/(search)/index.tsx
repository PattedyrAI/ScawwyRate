import { useState, useCallback } from 'react';
import { View, TextInput, FlatList, Pressable, Text, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSearchProducts } from '@/features/products/hooks/useProducts';
import { ScoreDisplay } from '@/shared/components/ui/ScoreDisplay';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { colors, typography, spacing, borderRadius } from '@/theme';
import type { ProductWithBrand } from '@/types/database';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const { data: products, isLoading } = useSearchProducts(query);
  const router = useRouter();

  const handleProductPress = useCallback(
    (id: string) => {
      router.push(`/product/${id}`);
    },
    [router],
  );

  const renderProduct = useCallback(
    ({ item }: { item: ProductWithBrand }) => (
      <Pressable
        style={styles.productCard}
        onPress={() => handleProductPress(item.id)}
      >
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <Ionicons name="beer-outline" size={24} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.brandName} numberOfLines={1}>
            {item.brands?.name ?? 'Unknown brand'}
          </Text>
          {item.rating_count > 0 && (
            <View style={styles.ratingRow}>
              <ScoreDisplay score={item.avg_rating} size="sm" showOutOf={false} />
              <Text style={styles.ratingCount}>
                ({item.rating_count} {item.rating_count === 1 ? 'rating' : 'ratings'})
              </Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>
    ),
    [handleProductPress],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search drinks..."
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          returnKeyType="search"
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
        ListEmptyComponent={
          query.length >= 2 && !isLoading ? (
            <EmptyState
              icon="search-outline"
              title="No results"
              message={`No drinks found for "${query}"`}
            />
          ) : query.length < 2 ? (
            <EmptyState
              icon="beer-outline"
              title="Find your drink"
              message="Search by drink name or brand"
            />
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.h1,
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    height: '100%',
  },
  list: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
    flexGrow: 1,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
  },
  productImagePlaceholder: {
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  productName: {
    ...typography.label,
    color: colors.text,
  },
  brandName: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  ratingCount: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
