import { useCallback, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRatingDraftStore } from '@/stores/ratingDraftStore';
import { useAuthStore } from '@/stores/authStore';
import { useCreateRating } from '@/features/ratings/hooks/useRatings';
import { useTags } from '@/features/products/hooks/useProducts';
import { useImageUpload } from '@/shared/hooks/useImageUpload';
import { TagChip } from '@/shared/components/ui/TagChip';
import { Button } from '@/shared/components/ui/Button';
import { ScoreDisplay } from '@/shared/components/ui/ScoreDisplay';
import { colors, typography, spacing, borderRadius, getScoreColor } from '@/theme';

export default function WriteReviewScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const {
    photoUri, productId, productName, score, reviewText, wouldBuyAgain, tagIds,
    setScore, setReviewText, setWouldBuyAgain, toggleTag, reset,
  } = useRatingDraftStore();

  const createRating = useCreateRating();
  const { data: tags } = useTags();
  const { upload, uploading } = useImageUpload('rating-photos');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!user || !productId || !score) return;

    setSubmitting(true);
    try {
      let photoUrl: string | undefined;
      if (photoUri) {
        const result = await upload(photoUri);
        photoUrl = result.publicUrl;
      }

      const rating = await createRating.mutateAsync({
        rating: {
          user_id: user.id,
          product_id: productId,
          score,
          review_text: reviewText || undefined,
          photo_url: photoUrl,
          would_buy_again: wouldBuyAgain ?? undefined,
        },
        tagIds,
      });

      reset();
      router.replace(`/rating/${rating.id}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [user, productId, score, photoUri, reviewText, wouldBuyAgain, tagIds, upload, createRating, reset, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>Rate: {productName}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Photo preview */}
        {photoUri && (
          <Image source={{ uri: photoUri }} style={styles.photoPreview} />
        )}

        {/* Score picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Score</Text>
          <View style={styles.scoreContainer}>
            {score && <ScoreDisplay score={score} size="lg" />}
          </View>
          <View style={styles.scoreSlider}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <Pressable
                key={n}
                style={[
                  styles.scoreButton,
                  score === n && { backgroundColor: getScoreColor(n) },
                ]}
                onPress={() => setScore(n)}
              >
                <Text
                  style={[
                    styles.scoreButtonText,
                    score === n && styles.scoreButtonTextActive,
                  ]}
                >
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Taste Tags</Text>
          <View style={styles.tagsContainer}>
            {tags?.map((tag: any) => (
              <TagChip
                key={tag.id}
                label={tag.name}
                selected={tagIds.includes(tag.id)}
                onPress={() => toggleTag(tag.id)}
              />
            ))}
          </View>
        </View>

        {/* Review text */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Review</Text>
          <TextInput
            style={styles.reviewInput}
            value={reviewText}
            onChangeText={setReviewText}
            placeholder="What did you think? (optional)"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{reviewText.length}/500</Text>
        </View>

        {/* Would buy again */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Would buy again?</Text>
          <View style={styles.buyAgainRow}>
            <Pressable
              style={[styles.buyAgainButton, wouldBuyAgain === true && styles.buyAgainYes]}
              onPress={() => setWouldBuyAgain(wouldBuyAgain === true ? null : true)}
            >
              <Ionicons
                name="thumbs-up"
                size={20}
                color={wouldBuyAgain === true ? colors.textInverse : colors.success}
              />
              <Text style={[styles.buyAgainText, wouldBuyAgain === true && styles.buyAgainTextActive]}>
                Yes
              </Text>
            </Pressable>
            <Pressable
              style={[styles.buyAgainButton, wouldBuyAgain === false && styles.buyAgainNo]}
              onPress={() => setWouldBuyAgain(wouldBuyAgain === false ? null : false)}
            >
              <Ionicons
                name="thumbs-down"
                size={20}
                color={wouldBuyAgain === false ? colors.textInverse : colors.error}
              />
              <Text style={[styles.buyAgainText, wouldBuyAgain === false && styles.buyAgainTextActive]}>
                No
              </Text>
            </Pressable>
          </View>
        </View>

        <Button
          title={submitting || uploading ? 'Submitting...' : 'Submit Rating'}
          onPress={handleSubmit}
          loading={submitting || uploading}
          disabled={!score}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.lg,
    resizeMode: 'cover',
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  scoreSlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  scoreButton: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreButtonText: {
    ...typography.label,
    color: colors.textSecondary,
    fontSize: 13,
  },
  scoreButtonTextActive: {
    color: colors.textInverse,
    fontWeight: '800',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reviewInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...typography.body,
    color: colors.text,
    minHeight: 100,
  },
  charCount: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'right',
  },
  buyAgainRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  buyAgainButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buyAgainYes: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  buyAgainNo: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  buyAgainText: {
    ...typography.label,
    color: colors.text,
  },
  buyAgainTextActive: {
    color: colors.textInverse,
  },
});
