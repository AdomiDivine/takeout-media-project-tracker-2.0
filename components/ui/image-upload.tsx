"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  currentUrl?: string | null;
  bucket: string;
  filePath: string;
  shape?: "circle" | "square";
  size?: "sm" | "md" | "lg";
  onUploaded: (url: string) => void;
  placeholder?: React.ReactNode;
  className?: string;
}

const sizeClasses = { sm: "w-16 h-16", md: "w-24 h-24", lg: "w-32 h-32" };

export default function ImageUpload({
  currentUrl, bucket, filePath, shape = "square",
  size = "md", onUploaded, placeholder, className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const radius = shape === "circle" ? "rounded-full" : "rounded-xl";

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setError("");

    const ext = file.name.split(".").pop() ?? "jpg";
    const supabase = createClient();

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(`${filePath}.${ext}`, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setPreview(currentUrl ?? null);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(`${filePath}.${ext}`);

    onUploaded(publicUrl);
    setUploading(false);
    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
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
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {error && <p className="text-xs text-status-overdue text-center">{error}</p>}
      {!error && <p className="text-xs text-muted-foreground">Click to upload</p>}
    </div>
  );
}
