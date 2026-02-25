import { useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCurrentProfile, useUpdateProfile } from '@/features/profile/hooks/useProfile';
import { useImageUpload } from '@/shared/hooks/useImageUpload';
import { Avatar, Input, Button } from '@/shared/components/ui';
import { colors, typography, spacing, borderRadius } from '@/theme';

interface FormValues {
  display_name: string;
  bio: string;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { data: profile } = useCurrentProfile();
  const updateProfile = useUpdateProfile();
  const { upload, uploading } = useImageUpload('avatars');

  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      display_name: profile?.display_name ?? '',
      bio: profile?.bio ?? '',
    },
  });

  const handleSave = useCallback(
    async (values: FormValues) => {
      try {
        await updateProfile.mutateAsync({
          display_name: values.display_name || null,
          bio: values.bio || null,
        });
        router.back();
      } catch {
        Alert.alert('Error', 'Failed to update profile.');
      }
    },
    [updateProfile, router],
  );

  const handleChangeAvatar = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const { publicUrl } = await upload(result.assets[0].uri);
        await updateProfile.mutateAsync({ avatar_url: publicUrl });
      } catch {
        Alert.alert('Error', 'Failed to upload avatar.');
      }
    }
  }, [upload, updateProfile]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Pressable onPress={handleChangeAvatar}>
            <Avatar
              uri={profile?.avatar_url}
              name={profile?.display_name || profile?.username}
              size="xl"
            />
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={14} color={colors.text} />
            </View>
          </Pressable>
          {uploading && <Text style={styles.uploadingText}>Uploading...</Text>}
        </View>

        <Controller
          control={control}
          name="display_name"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Display Name"
              value={value}
              onChangeText={onChange}
              placeholder="Your name"
            />
          )}
        />

        <Controller
          control={control}
          name="bio"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Bio"
              value={value}
              onChangeText={onChange}
              placeholder="Tell people about yourself..."
              multiline
              style={styles.bioInput}
            />
          )}
        />

        <Button
          title="Save"
          onPress={handleSubmit(handleSave)}
          loading={updateProfile.isPending}
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.label,
    color: colors.text,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  avatarSection: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  uploadingText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
});
