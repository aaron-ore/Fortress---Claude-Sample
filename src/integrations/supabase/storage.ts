import { supabase } from "@/lib/supabaseClient";
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads a file to a specified Supabase Storage bucket via a secure Edge Function
 * and returns its internal file path.
 * @param file The File object to upload.
 * @param bucketName The name of the Supabase Storage bucket.
 * @param folderPath The path within the bucket (e.g., 'avatars/', 'company-logos/').
 * @returns A promise that resolves with the internal file path of the uploaded file.
 * @throws An error if the upload fails or is rejected by server-side validation.
 */
export const uploadFileToSupabase = async (file: File, bucketName: string, folderPath: string = ''): Promise<string> => {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  const fileExtension = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExtension}`;
  
  // Read file as base64
  const reader = new FileReader();
  const base64Data = await new Promise<string>((resolve, reject) => {
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]); // Get base64 part
      } else {
        reject(new Error("Failed to read file as base64."));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  console.log(`[Storage] Calling secure upload Edge Function for bucket: ${bucketName}, path: ${folderPath}${fileName}`);

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    throw new Error("Authentication session expired. Please log in again.");
  }

  const { data, error } = await supabase.functions.invoke('upload-image-with-validation', {
    body: JSON.stringify({
      base64Data: base64Data,
      mimeType: file.type,
      fileName: fileName,
      bucketName: bucketName,
      folderPath: folderPath,
    }),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionData.session.access_token}`,
    },
  });

  if (error) {
    console.error("[Storage] Secure upload Edge Function error:", error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  if (data.error) {
    console.error("[Storage] Secure upload Edge Function returned error:", data.error);
    throw new Error(`Failed to upload file: ${data.error}`);
  }

  console.log(`[Storage] File uploaded successfully via Edge Function. Internal path: ${data.filePath}`);
  return data.filePath; // Return the internal file path from the Edge Function response
};

/**
 * Extracts the file path within the bucket from a Supabase public URL.
 * This is needed for deleting files from storage.
 * @param publicUrl The public URL of the file.
 * @param bucketName The name of the bucket.
 * @returns The file path within the bucket, or null if not found.
 */
export const getFilePathFromPublicUrl = (publicUrl: string, bucketName: string): string | null => {
  console.log(`[Storage] getFilePathFromPublicUrl called. Public URL: "${publicUrl}", Bucket: "${bucketName}"`);
  // Ensure publicUrl is actually a URL and contains the bucket name
  if (!publicUrl || !publicUrl.includes(`/${bucketName}/`)) {
    console.warn(`[Storage] getFilePathFromPublicUrl: Invalid publicUrl or bucketName mismatch. Returning null.`);
    return null;
  }
  const regex = new RegExp(`/${bucketName}/(.+)`);
  const match = publicUrl.match(regex);
  console.log(`[Storage] getFilePathFromPublicUrl: Regex match result:`, match);
  const filePath = match ? match[1] : null;
  console.log(`[Storage] getFilePathFromPublicUrl: Extracted internal path: ${filePath}`);
  return filePath;
};

/**
 * Generates the public URL for a file given its internal path and bucket name.
 * @param filePath The internal path of the file within the bucket (e.g., 'items/uuid.png').
 * @param bucketName The name of the Supabase Storage bucket.
 * @returns The full public URL of the file, or `undefined` if filePath is empty/invalid.
 */
export const getPublicUrlFromSupabase = (filePath: string | undefined | null, bucketName: string): string | undefined => {
  console.log(`[Storage] getPublicUrlFromSupabase called. FilePath: "${filePath}" (Type: ${typeof filePath}), Bucket: "${bucketName}"`);

  // Explicitly handle null, undefined, or empty string filePaths
  if (!filePath || filePath.trim() === '') {
    console.warn(`[Storage] getPublicUrlFromSupabase: filePath is null, undefined, or empty. Returning undefined.`);
    return undefined;
  }

  // Ensure filePath is not already a public URL
  if (filePath.startsWith('http')) {
    console.warn(`[Storage] getPublicUrlFromSupabase: filePath already looks like a public URL. Returning as is. FilePath: ${filePath}`);
    return filePath;
  }
  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  
  // NEW CHECK: If Supabase returns a public URL for an an empty path, treat it as undefined
  // This happens when filePath is an empty string, and Supabase returns the base bucket URL.
  if (data.publicUrl && data.publicUrl.endsWith(`/${bucketName}/`)) {
    console.warn(`[Storage] getPublicUrlFromSupabase: Supabase returned a base URL for an empty path. Treating as undefined.`);
    return undefined;
  }

  console.log(`[Storage] getPublicUrlFromSupabase: Internal path: ${filePath}, Generated public URL: ${data.publicUrl}`);
  return data.publicUrl;
};