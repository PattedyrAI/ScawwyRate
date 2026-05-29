import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { useAddProduct, useBrands, useAddBrand } from '@/features/products/hooks/useProducts';
import { useRatingDraftStore } from '@/stores/ratingDraftStore';
import { useAuthStore } from '@/stores/authStore';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { colors, typography, spacing, borderRadius } from '@/theme';

const ENERGY_DRINKS_CATEGORY_ID = 'a1b2c3d4-0001-4000-8000-000000000001';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  brandName: z.string().min(1, 'Brand is required'),
  flavor: z.string().optional(),
  sugarFree: z.boolean(),
  volumeMl: z.string().optional(),
  caffeineMg: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function AddProductScreen() {
  const router = useRouter();
  const addProduct = useAddProduct();
  const addBrand = useAddBrand();
  const { data: brands } = useBrands();
  const setProduct = useRatingDraftStore((s) => s.setProduct);
  const user = useAuthStore((s) => s.user);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      brandName: '',
      flavor: '',
      sugarFree: false,
      volumeMl: '',
      caffeineMg: '',
      description: '',
    },
  });

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        // Find or create brand
        let brandId: string | undefined;
        const existingBrand = brands?.find(
          (b: any) => b.name.toLowerCase() === values.brandName.toLowerCase(),
        );

        if (existingBrand) {
          brandId = existingBrand.id;
        } else {
          const newBrand = await addBrand.mutateAsync(values.brandName);
          brandId = newBrand.id;
        }

        const attributes: Record<string, string | number | boolean> = {};
        if (values.flavor) attributes.flavor = values.flavor;
        attributes.sugar_free = values.sugarFree;
        if (values.volumeMl) attributes.volume_ml = parseInt(values.volumeMl, 10);
        if (values.caffeineMg) attributes.caffeine_mg = parseInt(values.caffeineMg, 10);

        const product = await addProduct.mutateAsync({
          name: values.name,
          brand_id: brandId,
          category_id: ENERGY_DRINKS_CATEGORY_ID,
          description: values.description || undefined,
          attributes: attributes as unknown as import('@/types/database').Json,
          added_by: user?.id,
        });

        setProduct(product.id, product.name);
        router.back();
      } catch (err) {
        Alert.alert('Error', 'Failed to add product. Please try again.');
      }
    },
    [brands, addBrand, addProduct, user, setProduct, router],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Add New Drink</Text>
        <Text style={styles.subtitle}>Add it to the community database</Text>
      </View>

      <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Drink Name"
              value={value}
              onChangeText={onChange}
              placeholder="e.g. Monster Ultra Paradise"
              error={errors.name?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="brandName"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Brand"
              value={value}
              onChangeText={onChange}
              placeholder="e.g. Monster Energy"
              error={errors.brandName?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="flavor"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Flavor"
              value={value}
              onChangeText={onChange}
              placeholder="e.g. Tropical Punch"
            />
          )}
        />

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Controller
              control={control}
              name="volumeMl"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Volume (ml)"
                  value={value}
                  onChangeText={onChange}
                  placeholder="473"
                  keyboardType="numeric"
                />
              )}
            />
          </View>
          <View style={styles.halfField}>
            <Controller
              control={control}
              name="caffeineMg"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Caffeine (mg)"
                  value={value}
                  onChangeText={onChange}
                  placeholder="160"
                  keyboardType="numeric"
                />
              )}
            />
          </View>
        </View>

        <Controller
          control={control}
          name="sugarFree"
          render={({ field: { onChange, value } }) => (
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Sugar Free</Text>
              <Switch
                value={value}
                onValueChange={onChange}
                trackColor={{ false: colors.surfaceHighlight, true: colors.primaryMuted }}
                thumbColor={value ? colors.primary : colors.textMuted}
              />
            </View>
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Description (optional)"
              value={value}
              onChangeText={onChange}
              placeholder="Brief description..."
              multiline
              style={styles.textArea}
            />
          )}
        />

        <Button
          title="Add Drink"
          onPress={handleSubmit(onSubmit)}
          loading={addProduct.isPending || addBrand.isPending}
          fullWidth
          size="lg"
        />
      </ScrollView>
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
    paddingVertical: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchLabel: {
    ...typography.label,
    color: colors.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
});
