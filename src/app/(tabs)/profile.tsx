import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Avatar } from '@/shared/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { getProfile } from '@/features/auth/auth.service';
import { useSignOut } from '@/features/auth/hooks/useAuth';
import type { Profile } from '@/types/database';
import { colors, spacing } from '@/theme';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useSignOut();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (user?.id) getProfile(user.id).then(setProfile).catch(() => {});
  }, [user?.id]);

  return (
    <View style={styles.container}>
      {profile?.avatar_url ? <Avatar uri={profile.avatar_url} size="xl" /> : null}
      <Text style={styles.hello}>
        {profile ? `Signed in as @${profile.username}` : 'Loading profile…'}
      </Text>
      <Button title="Sign out" onPress={() => signOut.mutate()} loading={signOut.isPending} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md },
  hello: { fontSize: 20, fontWeight: '700', color: colors.text },
});
