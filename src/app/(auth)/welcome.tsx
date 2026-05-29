import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSignInWithApple, useSignInWithGoogle } from '@/features/auth/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { colors, typography, spacing } from '@/theme';

export default function WelcomeScreen() {
  const signInApple = useSignInWithApple();
  const signInGoogle = useSignInWithGoogle();
  const devSkipAuth = useAuthStore((s) => s.devSkipAuth);
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>everrate</Text>
        <Text style={styles.tagline}>Rate everything.{'\n'}Evolve your taste.</Text>
      </View>

      <View style={styles.features}>
        <FeatureItem icon="star" text="Rate drinks 1-10 with taste tags" />
        <FeatureItem icon="refresh" text="Re-review as your taste evolves" />
        <FeatureItem icon="people" text="Follow friends and share ratings" />
      </View>

      <View style={styles.buttons}>
        {Platform.OS === 'ios' && (
          <Pressable
            style={[styles.button, styles.appleButton]}
            onPress={() => signInApple.mutate()}
            disabled={signInApple.isPending}
          >
            <Ionicons name="logo-apple" size={20} color="#000" />
            <Text style={[styles.buttonText, styles.appleButtonText]}>
              Continue with Apple
            </Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.button, styles.googleButton]}
          onPress={() => signInGoogle.mutate()}
          disabled={signInGoogle.isPending}
        >
          <Ionicons name="logo-google" size={20} color={colors.text} />
          <Text style={styles.buttonText}>Continue with Google</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.devButton]}
          onPress={() => {
            devSkipAuth();
            router.replace('/(tabs)/(feed)');
          }}
        >
          <Ionicons name="code-slash" size={20} color={colors.warning} />
          <Text style={[styles.buttonText, { color: colors.warning }]}>Skip (Dev Mode)</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -2,
  },
  tagline: {
    ...typography.h3,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 28,
  },
  features: {
    gap: spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 12,
  },
  featureText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  buttons: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: 12,
  },
  appleButton: {
    backgroundColor: '#fff',
  },
  googleButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  devButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.warning,
    borderStyle: 'dashed',
  },
  buttonText: {
    ...typography.label,
    color: colors.text,
  },
  appleButtonText: {
    color: '#000',
  },
});
