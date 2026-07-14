import { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Input, Card, TagChip, ScoreDisplay } from '@/shared/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useImageUpload } from '@/shared/hooks/useImageUpload';
import {
  useCategories,
  useGroupItems,
  useItem,
  useMyRatingForItem,
  useRateItem,
} from '@/features/items/hooks/useItems';
import type { ItemWithCategory } from '@/features/items/items.service';
import { getScoreLabel } from '@/shared/utils/formatScore';
import { colors, spacing, borderRadius } from '@/theme';

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function RateScreen() {
  const { id: groupId, itemId: paramItemId } = useLocalSearchParams<{ id: string; itemId?: string }>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const { data: items } = useGroupItems(groupId);
  const { data: categories } = useCategories();
  const { data: paramItem } = useItem(paramItemId ?? '');
  const { upload, uploading } = useImageUpload('rating-photos');
  const rateItem = useRateItem();

  const [name, setName] = useState('');
  const [manualSelectedId, setManualSelectedId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Resolve the item this rating attaches to:
  //  1. a route-param item ("Rate this" from item detail),
  //  2. a suggestion the user tapped,
  //  3. an exact name match of what they typed (the server dedups regardless;
  //     this just lets the category picker step aside in the UI).
  const manualItem = useMemo(
    () => items?.find((i) => i.id === manualSelectedId) ?? null,
    [items, manualSelectedId],
  );
  const matchedItem = useMemo(() => {
    const n = name.trim().toLowerCase();
    if (!n || manualSelectedId) return null;
    return items?.find((i) => i.name.trim().toLowerCase() === n) ?? null;
  }, [items, name, manualSelectedId]);
  const effectiveItem: ItemWithCategory | null = paramItem ?? manualItem ?? matchedItem;

  const suggestions = useMemo(() => {
    const n = name.trim().toLowerCase();
    if (paramItem || manualItem || !n) return [];
    return (items ?? []).filter((i) => i.name.toLowerCase().includes(n)).slice(0, 6);
  }, [items, name, paramItem, manualItem]);

  // Prefill from the caller's existing rating of the resolved item (upsert path).
  const { data: myRating } = useMyRatingForItem(effectiveItem?.id ?? '', user?.id ?? '');
  useEffect(() => {
    if (myRating) {
      setScore(myRating.score);
      setComment(myRating.comment ?? '');
    }
    // Only re-run when the resolved item (hence myRating) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveItem?.id, myRating?.id]);

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo library permission is required to add a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled && result.assets?.[0]) {
      setError(null);
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function onSubmit() {
    if (!user) return;
    if (score == null) {
      setError('Pick a score from 1 to 10.');
      return;
    }
    const useExisting = !!effectiveItem;
    const trimmedName = name.trim();
    if (!useExisting) {
      if (trimmedName.length < 1) {
        setError('Give the item a name.');
        return;
      }
      if (!categoryId) {
        setError('Pick a category.');
        return;
      }
    }
    setError(null);
    try {
      let photoUrl: string | null = null;
      if (photoUri) {
        const res = await upload(photoUri);
        photoUrl = res.publicUrl;
      }
      const rating = await rateItem.mutateAsync({
        groupId,
        itemId: useExisting ? effectiveItem!.id : null,
        itemName: useExisting ? undefined : trimmedName,
        categoryId: useExisting ? undefined : categoryId!,
        score,
        comment: comment.trim() || null,
        photoUrl,
        visitedAt: null,
      });
      router.replace(`/group/${groupId}/item/${rating.item_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit your rating.');
    }
  }

  const submitting = uploading || rateItem.isPending;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.lg }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text variant="h2">Rate</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
      </View>

      {effectiveItem ? (
        <Card style={styles.section}>
          <Text variant="labelSmall" color={colors.textMuted}>
            ITEM
          </Text>
          <Text variant="h3">{effectiveItem.name}</Text>
          {effectiveItem.categories ? (
            <Text variant="caption" color={colors.textMuted}>
              {effectiveItem.categories.name}
            </Text>
          ) : null}
          {!paramItem ? (
            <Pressable
              onPress={() => {
                setManualSelectedId(null);
                setName('');
              }}
              hitSlop={8}
            >
              <Text variant="caption" color={colors.primary}>
                Rate a different item
              </Text>
            </Pressable>
          ) : null}
        </Card>
      ) : (
        <View style={styles.section}>
          <Input
            label="What are you rating?"
            placeholder="e.g. Pizza Palace"
            value={name}
            onChangeText={setName}
            autoFocus
          />
          {suggestions.length > 0 ? (
            <Card style={styles.suggestions}>
              <Text variant="caption" color={colors.textMuted}>
                Did you mean…
              </Text>
              {suggestions.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    setManualSelectedId(s.id);
                    setName(s.name);
                  }}
                  style={styles.suggestionRow}
                  hitSlop={4}
                >
                  <Text variant="bodySmall" color={colors.primary}>
                    {s.name}
                  </Text>
                  {s.categories ? (
                    <Text variant="caption" color={colors.textMuted}>
                      {s.categories.name}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </Card>
          ) : null}
          <Text variant="label" color={colors.textSecondary}>
            Category
          </Text>
          <View style={styles.chipsWrap}>
            {(categories ?? []).map((c) => (
              <TagChip
                key={c.id}
                label={c.name}
                selected={categoryId === c.id}
                onPress={() => setCategoryId(c.id)}
              />
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text variant="label" color={colors.textSecondary}>
          Score
        </Text>
        <View style={styles.chipsWrap}>
          {SCORES.map((n) => (
            <TagChip key={n} label={String(n)} selected={score === n} onPress={() => setScore(n)} />
          ))}
        </View>
        {score != null ? (
          <View style={styles.scorePreview}>
            <ScoreDisplay score={score} size="lg" />
            <Text variant="label" color={colors.textSecondary}>
              {getScoreLabel(score)}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Input
          label="Comment (optional)"
          placeholder="What did you think?"
          value={comment}
          onChangeText={setComment}
          multiline
          style={styles.commentInput}
        />
      </View>

      <View style={styles.section}>
        <Text variant="label" color={colors.textSecondary}>
          Photo (optional)
        </Text>
        {photoUri ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            <Button title="Remove photo" onPress={() => setPhotoUri(null)} variant="ghost" size="sm" />
          </View>
        ) : (
          <Button title="Add photo" onPress={pickPhoto} variant="outline" />
        )}
      </View>

      {error ? (
        <Text variant="caption" color={colors.error}>
          {error}
        </Text>
      ) : null}

      <Button
        title={submitting ? 'Submitting…' : 'Submit rating'}
        onPress={onSubmit}
        loading={submitting}
        fullWidth
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  section: { gap: spacing.sm },
  suggestions: { gap: spacing.sm },
  suggestionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  scorePreview: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  commentInput: { height: 96, paddingTop: spacing.md, textAlignVertical: 'top' },
  photoWrap: { gap: spacing.sm },
  photoPreview: { width: '100%', height: 200, borderRadius: borderRadius.md, backgroundColor: colors.surfaceLight },
});
