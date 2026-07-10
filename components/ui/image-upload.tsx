"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {v4} from "uuid"
import ImageCropModal from "@/components/ui/image-crop-modal";

interface ImageUploadProps {
  currentUrl?: string | null;
  bucket: string;
  shape?: "circle" | "square";
  size?: "sm" | "md" | "lg";
  onUploaded: (url: string) => void;
  placeholder?: React.ReactNode;
  className?: string;
  enableCrop?: boolean;
}

const sizeClasses = { sm: "w-16 h-16", md: "w-24 h-24", lg: "w-32 h-32" };

export default function ImageUpload({
  currentUrl, bucket,  shape = "square",
  size = "md", onUploaded, placeholder, className, enableCrop = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const radius = shape === "circle" ? "rounded-full" : "rounded-xl";

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (inputRef.current) inputRef.current.value = "";

    if (enableCrop) {
      setCropSrc(URL.createObjectURL(file));
    } else {
      uploadBlob(file, file.name.split(".").pop() ?? "jpg");
    }
  }

  async function uploadBlob(blobOrFile: Blob | File, ext = "jpg") {
    setUploading(true);
    setError("");

    const previewUrl = URL.createObjectURL(blobOrFile);
    setPreview(previewUrl);

    const supabase = createClient();
    const storageKey = `${v4()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storageKey, blobOrFile, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setPreview(currentUrl ?? null);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(storageKey);

    const urlWithBust = `${publicUrl}?t=${Date.now()}`;
    setPreview(urlWithBust);
    onUploaded(urlWithBust);
    setUploading(false);
  }

  function handleCropped(blob: Blob) {
    setCropSrc(null);
    uploadBlob(blob, "jpg");
  }

  function handleCropClose() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  return (
    <>
      <div className={cn("flex flex-col items-center gap-1.5", className)}>
        <div
          className={cn("relative cursor-pointer group flex-shrink-0", sizeClasses[size], radius)}
          onClick={() => inputRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="" className={cn("w-full h-full object-cover", radius)} />
          ) : (
            <div className={cn("w-full h-full bg-muted flex items-center justify-center", radius)}>
              {placeholder ?? <Camera size={20} className="text-muted-foreground" />}
            </div>
          )}

          <div className={cn(
            "absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
            radius
          )}>
            {uploading
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Camera size={16} className="text-white" />
            }
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        {error && <p className="text-xs text-status-overdue text-center">{error}</p>}
        {!error && <p className="text-xs text-muted-foreground">Click to upload</p>}
      </div>

      {cropSrc && (
        <ImageCropModal
          open={!!cropSrc}
          imageSrc={cropSrc}
          onClose={handleCropClose}
          onCropped={handleCropped}
        />
      )}
    </>
  );
}
