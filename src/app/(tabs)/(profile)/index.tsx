import { useCallback } from 'react';
import { View, Text, FlatList, Pressable, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useCurrentProfile, useCurrentProfileStats } from '@/features/profile/hooks/useProfile';
import { useUserRatings } from '@/features/ratings/hooks/useRatings';
import { useSignOut } from '@/features/auth/hooks/useAuth';
import { Avatar, ScoreDisplay, Card } from '@/shared/components/ui';
import { colors, typography, spacing, borderRadius, getScoreColor } from '@/theme';
import type { RatingWithDetails } from '@/types/database';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useCurrentProfile();
  const { data: stats } = useCurrentProfileStats();
  const { data: ratings, isLoading: ratingsLoading } = useUserRatings(user?.id ?? '');
  const signOut = useSignOut();
  const router = useRouter();

  const handleEditProfile = useCallback(() => {
    router.push('/(tabs)/(profile)/edit');
  }, [router]);

  const handleRatingPress = useCallback(
    (ratingId: string) => {
      router.push(`/rating/${ratingId}`);
    },
    [router],
  );

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Profile info */}
      <View style={styles.profileRow}>
        <Avatar
          uri={profile.avatar_url}
          name={profile.display_name || profile.username}
          size="xl"
        />
        <View style={styles.profileActions}>
          <Pressable style={styles.editButton} onPress={handleEditProfile}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </Pressable>
          <Pressable style={styles.settingsButton} onPress={() => signOut.mutate()}>
            <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.displayName}>{profile.display_name || profile.username}</Text>
      <Text style={styles.usernameText}>@{profile.username}</Text>
      {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

      {/* Stats */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.totalRatings}</Text>
            <Text style={styles.statLabel}>Ratings</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: stats.avgScore > 0 ? getScoreColor(stats.avgScore) : colors.text }]}>
              {stats.avgScore > 0 ? stats.avgScore.toFixed(1) : '-'}
            </Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>
          <Pressable style={styles.stat} onPress={() => router.push(`/user/${user!.id}`)}>
            <Text style={styles.statValue}>{stats.followersCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </Pressable>
          <Pressable style={styles.stat} onPress={() => router.push(`/user/${user!.id}`)}>
            <Text style={styles.statValue}>{stats.followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.ratingsHeader}>Your Ratings</Text>
    </View>
  );

  const renderRating = ({ item }: { item: RatingWithDetails }) => (
    <Pressable style={styles.ratingCard} onPress={() => handleRatingPress(item.id)}>
      <View style={styles.ratingRow}>
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={styles.ratingPhoto} />
        ) : (
          <View style={[styles.ratingPhoto, styles.ratingPhotoPlaceholder]}>
            <Ionicons name="beer-outline" size={20} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.ratingInfo}>
          <Text style={styles.ratingProduct} numberOfLines={1}>{item.products.name}</Text>
          <Text style={styles.ratingBrand} numberOfLines={1}>{item.products.brands?.name ?? ''}</Text>
        </View>
        <ScoreDisplay score={item.score} size="sm" showOutOf={false} />
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={ratings}
        keyExtractor={(item) => item.id}
        renderItem={renderRating}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editButtonText: {
    ...typography.labelSmall,
    color: colors.text,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayName: {
    ...typography.h2,
    color: colors.text,
  },
  usernameText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: -spacing.sm,
  },
  bio: {
    ...typography.body,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stat: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  ratingsHeader: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.sm,
  },
  listContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  ratingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ratingPhoto: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
  },
  ratingPhotoPlaceholder: {
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingInfo: {
    flex: 1,
  },
  ratingProduct: {
    ...typography.label,
    color: colors.text,
  },
  ratingBrand: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
