"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { v4 } from "uuid";
import ImageCropModal from "@/components/ui/image-crop-modal";
import { createClient } from "@/lib/supabase/client";

// Pick and crop a profile photo without uploading it yet — for forms where
// the account doesn't exist until the form is submitted (sign-up, accept invite).
export function AvatarPicker({ value, onChange, invalid }: {
  value: Blob | null;
  onChange: (blob: Blob | null) => void;
  invalid?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (file) setCropSrc(URL.createObjectURL(file));
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={value ? "Change profile photo" : "Add profile photo"}
        className={
          "relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 group bg-muted flex items-center justify-center " +
          (invalid && !value ? "ring-2 ring-status-overdue" : "ring-1 ring-border")
        }
      >
        {value && preview
          ? <img src={preview} alt="" className="w-full h-full object-cover" />
          : <Camera size={20} className="text-muted-foreground" />}
        <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera size={16} className="text-white" />
        </span>
      </button>
      <div className="text-xs text-muted-foreground">
        <button type="button" onClick={() => inputRef.current?.click()} className="text-brand font-medium hover:underline">
          {value ? "Change photo" : "Upload a photo"}
        </button>
        <p className="mt-0.5">JPG, PNG or WebP. Your team will see this.</p>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />

      {cropSrc && (
        <ImageCropModal
          open
          imageSrc={cropSrc}
          onClose={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null); }}
          onCropped={(blob) => {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
            if (preview) URL.revokeObjectURL(preview);
            setPreview(URL.createObjectURL(blob));
            onChange(blob);
          }}
        />
      )}
    </div>
  );
}

// Upload a picked photo for the signed-in user and save it on their profile.
export async function uploadAvatarForCurrentUser(blob: Blob): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const key = `${v4()}.jpg`;
  const { error } = await supabase.storage.from("avatars").upload(key, blob, { upsert: true, contentType: "image/jpeg" });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(key);
  const url = `${publicUrl}?t=${Date.now()}`;
  await supabase.from("users").update({ avatar_url: url }).eq("id", user.id);
  return url;
}
