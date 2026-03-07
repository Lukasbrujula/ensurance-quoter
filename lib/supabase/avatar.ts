/* ------------------------------------------------------------------ */
/*  Avatar Upload / Delete / URL utilities                             */
/*  Uses Supabase Storage "avatars" bucket.                            */
/*  File path: avatars/{userId}/profile.{ext}                          */
/* ------------------------------------------------------------------ */

import type { SupabaseClient } from "@supabase/supabase-js"

const BUCKET = "avatars"
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

interface UploadResult {
  publicUrl: string
}

/**
 * Upload an avatar image for a user.
 * Validates size (max 2 MB) and type (jpg, png, webp).
 * Overwrites the previous avatar if one exists.
 * Returns the public URL — caller is responsible for saving it to user metadata.
 */
export async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<UploadResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size exceeds 2 MB limit")
  }

  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    throw new Error("Only JPG, PNG, and WebP images are allowed")
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
  const path = `${userId}/profile.${ext}`

  // Upload (upsert overwrites existing file)
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    })

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path)

  // Add cache-busting param to ensure fresh image
  const url = `${publicUrl}?t=${Date.now()}`

  return { publicUrl: url }
}

/**
 * Delete a user's avatar files from storage.
 * Caller is responsible for clearing avatar_url from user metadata.
 */
export async function deleteAvatar(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  // List files in user's folder to find the avatar
  const { data: files } = await supabase.storage
    .from(BUCKET)
    .list(userId)

  if (files && files.length > 0) {
    const paths = files.map((f) => `${userId}/${f.name}`)
    await supabase.storage.from(BUCKET).remove(paths)
  }
}
