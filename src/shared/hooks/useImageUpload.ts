import { useState } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface UploadResult {
  publicUrl: string;
}

export function useImageUpload(bucket: string) {
  const [uploading, setUploading] = useState(false);
  const user = useAuthStore((s) => s.user);

  const upload = async (uri: string): Promise<UploadResult> => {
    if (!user) throw new Error('Must be authenticated to upload');

    setUploading(true);
    try {
      // Compress and resize
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );

      // Read as blob
      const response = await fetch(manipulated.uri);
      const blob = await response.blob();

      const fileExt = 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);

      return { publicUrl: urlData.publicUrl };
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading };
}
