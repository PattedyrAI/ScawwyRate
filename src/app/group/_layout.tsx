import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme';

export default function GroupLayout() {
  const session = useAuthStore((s) => s.session);
  const isLoading = useAuthStore((s) => s.isLoading);

  // Guard the whole group/* subtree: a logged-out deep link into
  // group/create, group/join, or group/[id]/* must land on welcome,
  // not a broken screen.
  if (!session && !isLoading) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="create" options={{ presentation: 'modal' }} />
      <Stack.Screen name="join" options={{ presentation: 'modal' }} />
      <Stack.Screen name="[id]/rate" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
