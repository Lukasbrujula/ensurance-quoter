/* ------------------------------------------------------------------ */
/*  Avatar Upload / Delete / URL utilities                             */
/*  Uses Supabase Storage "avatars" bucket.                            */
/*  File path: avatars/{userId}/profile.{ext}                          */
/* ------------------------------------------------------------------ */

import { createAuthBrowserClient } from "@/lib/supabase/auth-client"

const BUCKET = "avatars"
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

interface UploadResult {
  publicUrl: string
}

/**
 * Upload an avatar image for the current user.
 * Validates size (max 2 MB) and type (jpg, png, webp).
 * Overwrites the previous avatar if one exists.
 * Updates user_metadata.avatar_url automatically.
 */
export async function uploadAvatar(file: File): Promise<UploadResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size exceeds 2 MB limit")
  }

  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    throw new Error("Only JPG, PNG, and WebP images are allowed")
  }

  const supabase = createAuthBrowserClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("Not authenticated")
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
  const path = `${user.id}/profile.${ext}`

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

  // Save to user_metadata
  const { error: updateError } = await supabase.auth.updateUser({
    data: { avatar_url: url },
  })

  if (updateError) {
    throw new Error(`Failed to update profile: ${updateError.message}`)
  }

  return { publicUrl: url }
}

/**
 * Delete the current user's avatar and clear avatar_url from metadata.
 */
export async function deleteAvatar(): Promise<void> {
  const supabase = createAuthBrowserClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("Not authenticated")
  }

  // List files in user's folder to find the avatar
  const { data: files } = await supabase.storage
    .from(BUCKET)
    .list(user.id)

  if (files && files.length > 0) {
    const paths = files.map((f) => `${user.id}/${f.name}`)
    await supabase.storage.from(BUCKET).remove(paths)
  }

  // Clear avatar_url from metadata
  await supabase.auth.updateUser({
    data: { avatar_url: null },
  })
}

/**
 * Get the avatar URL from user metadata, or null if not set.
 */
export function getAvatarUrl(
  user: { user_metadata?: Record<string, unknown> } | null,
): string | null {
  if (!user?.user_metadata?.avatar_url) return null
  return user.user_metadata.avatar_url as string
}
