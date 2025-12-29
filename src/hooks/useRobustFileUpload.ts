import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UploadResult {
  url: string;
  name: string;
  type: string;
  path: string;
}

interface UseRobustFileUploadOptions {
  bucket: string;
  folder?: string;
  onProgress?: (progress: number) => void;
}

export function useRobustFileUpload({ bucket, folder, onProgress }: UseRobustFileUploadOptions) {
  const [uploading, setUploading] = useState(false);

  const verifyUrl = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  };

  const getSignedUrl = async (path: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600 * 24 * 7); // 7 days

      if (error) {
        console.error('Failed to create signed URL:', error);
        return null;
      }
      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
  };

  const uploadFile = async (file: File, customPath?: string): Promise<UploadResult | null> => {
    setUploading(true);
    onProgress?.(0);

    try {
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = customPath || `${folder || 'uploads'}/${timestamp}_${sanitizedName}`;

      onProgress?.(10);

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: 'Upload failed',
          description: uploadError.message,
          variant: 'destructive',
        });
        return null;
      }

      onProgress?.(50);

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      let finalUrl = urlData.publicUrl;

      onProgress?.(70);

      // Verify the public URL is accessible
      const isPublicAccessible = await verifyUrl(finalUrl);

      if (!isPublicAccessible) {
        console.log('Public URL not accessible, trying signed URL...');
        
        // Try signed URL as fallback
        const signedUrl = await getSignedUrl(filePath);
        
        if (signedUrl) {
          const isSignedAccessible = await verifyUrl(signedUrl);
          if (isSignedAccessible) {
            finalUrl = signedUrl;
            console.log('Using signed URL instead');
          } else {
            console.warn('Neither public nor signed URL is accessible');
            // Still return the public URL - it might work later
          }
        }
      }

      onProgress?.(100);

      return {
        url: finalUrl,
        name: file.name,
        type: file.type,
        path: filePath,
      };
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadMultiple = async (files: File[]): Promise<UploadResult[]> => {
    const results: UploadResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress?.(Math.round((i / files.length) * 100));
      
      const result = await uploadFile(file);
      if (result) {
        results.push(result);
      }
    }
    
    onProgress?.(100);
    return results;
  };

  const deleteFile = async (path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error('Delete error:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  };

  return {
    uploading,
    uploadFile,
    uploadMultiple,
    deleteFile,
    verifyUrl,
    getSignedUrl,
  };
}
