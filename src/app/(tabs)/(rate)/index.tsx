import { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRatingDraftStore } from '@/stores/ratingDraftStore';
import { Button } from '@/shared/components/ui/Button';
import { colors, typography, spacing } from '@/theme';

export default function RateScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const setPhoto = useRatingDraftStore((s) => s.setPhoto);
  const reset = useRatingDraftStore((s) => s.reset);
  const router = useRouter();

  const handleTakePhoto = useCallback(async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
    if (photo) {
      setPhotoPreview(photo.uri);
    }
  }, []);

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoPreview(result.assets[0].uri);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (photoPreview) {
      reset();
      setPhoto(photoPreview);
      router.push('/(tabs)/(rate)/select-product');
    }
  }, [photoPreview, reset, setPhoto, router]);

  const handleRetake = useCallback(() => {
    setPhotoPreview(null);
  }, []);

  const handleSkipPhoto = useCallback(() => {
    reset();
    router.push('/(tabs)/(rate)/select-product');
  }, [reset, router]);

  // Photo preview state
  if (photoPreview) {
    return (
      <SafeAreaView style={styles.container}>
        <Image source={{ uri: photoPreview }} style={styles.preview} />
        <View style={styles.previewActions}>
          <Button title="Retake" onPress={handleRetake} variant="outline" size="lg" />
          <Button title="Use Photo" onPress={handleConfirm} variant="primary" size="lg" />
        </View>
      </SafeAreaView>
    );
  }

  // Permission not granted
  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.textMuted} />
          <Text style={styles.permissionTitle}>Camera Access</Text>
          <Text style={styles.permissionText}>
            Take a photo of your drink to include with your rating
          </Text>
          <View style={styles.permissionButtons}>
            <Button title="Enable Camera" onPress={requestPermission} variant="primary" size="lg" fullWidth />
            <Button title="Skip Photo" onPress={handleSkipPhoto} variant="ghost" size="md" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Camera view
  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <SafeAreaView style={styles.cameraOverlay}>
          <View style={styles.cameraTop}>
            <Pressable onPress={handleSkipPhoto} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          </View>

          <View style={styles.cameraBottom}>
            <Pressable onPress={handlePickImage} style={styles.galleryButton}>
              <Ionicons name="images-outline" size={28} color={colors.text} />
            </Pressable>

            <Pressable onPress={handleTakePhoto} style={styles.captureButton}>
              <View style={styles.captureInner} />
            </Pressable>

            <View style={{ width: 48 }} />
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  skipButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  skipText: {
    ...typography.label,
    color: colors.text,
  },
  cameraBottom: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  galleryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.text,
  },
  preview: {
    flex: 1,
    resizeMode: 'cover',
  },
  previewActions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  permissionTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.lg,
  },
  permissionText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  permissionButtons: {
    gap: spacing.md,
    width: '100%',
    marginTop: spacing.lg,
    alignItems: 'center',
  },
});
