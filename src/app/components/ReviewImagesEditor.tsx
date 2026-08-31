"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ReviewImage = {
  id: string;
  status: string;
  mimeType: string;
  byteSize: number;
  sortOrder: number;
  signedUrl: string | null;
};

const MAX_FILES = 4;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function ReviewImagesEditor({ reviewId, guestToken }: { reviewId: string; guestToken: string | null }) {
  const [images, setImages] = useState<ReviewImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const query = new URLSearchParams({ reviewId });
    if (guestToken) query.set("guestToken", guestToken);
    const response = await fetch(`/api/reviews/media?${query.toString()}`, { cache: "no-store", referrerPolicy: "no-referrer" });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error || "تعذر تحميل صور التقييم.");
    setImages(Array.isArray(body?.media) ? body.media : []);
  }, [guestToken, reviewId]);

  useEffect(() => {
    let active = true;
    load()
      .catch((loadError) => active && setError(loadError instanceof Error ? loadError.message : "تعذر تحميل صور التقييم."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [load]);

  async function uploadFiles(files: File[]) {
    setError("");
    setMessage("");
    if (files.length === 0) return;
    if (images.length + files.length > MAX_FILES) {
      setError(`يمكن إضافة ${MAX_FILES} صور كحد أقصى لكل تقييم.`);
      return;
    }
    for (const file of files) {
      if (!ALLOWED.has(file.type)) {
        setError("الصور المسموحة فقط JPEG أو PNG أو WebP.");
        return;
      }
      if (file.size <= 0 || file.size > MAX_BYTES) {
        setError("حجم كل صورة يجب ألا يتجاوز 5 MB.");
        return;
      }
    }

    setUploading(true);
    try {
      const supabase = createClient();
      for (const file of files) {
        const intentResponse = await fetch("/api/reviews/media/upload-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          referrerPolicy: "no-referrer",
          body: JSON.stringify({ reviewId, mimeType: file.type, fileSize: file.size, guestToken }),
        });
        const intent = await intentResponse.json();
        if (!intentResponse.ok) throw new Error(intent?.error || "تعذر بدء رفع الصورة.");

        const { error: uploadError } = await supabase.storage
          .from("review-media")
          .uploadToSignedUrl(intent.storagePath, intent.token, file, { contentType: file.type, upsert: false });
        if (uploadError) throw new Error("تعذر رفع الصورة إلى التخزين الآمن.");

        const finalizeResponse = await fetch("/api/reviews/media/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          referrerPolicy: "no-referrer",
          body: JSON.stringify({ reviewId, storagePath: intent.storagePath, guestToken }),
        });
        const finalized = await finalizeResponse.json();
        if (!finalizeResponse.ok) throw new Error(finalized?.error || "تعذر اعتماد الصورة المرفوعة.");
      }
      await load();
      setMessage("تم رفع الصور بأمان وهي الآن في انتظار مراجعة IRTH.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "تعذر رفع الصور.");
      try { await load(); } catch { /* keep primary error */ }
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <p className="text-sm text-[var(--text-secondary)]">جاري تحميل صور التقييم...</p>;

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-[var(--color-espresso)]">صور التقييم</p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">حتى 4 صور · 5 MB للصورة · JPEG / PNG / WebP. الصور خاصة ولا تظهر للعامة إلا بعد موافقة IRTH.</p>
        </div>
        <span className="text-xs text-[var(--text-muted)]">{images.length}/{MAX_FILES}</span>
      </div>

      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image) => (
            <div key={image.id} className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-soft)]">
              {image.signedUrl ? <img src={image.signedUrl} alt="Review upload" className="aspect-square w-full object-cover" /> : <div className="aspect-square bg-[var(--surface-muted)]" />}
              <p className="px-2 py-2 text-center text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{image.status.replaceAll("_", " ")}</p>
            </div>
          ))}
        </div>
      )}

      {images.length < MAX_FILES && (
        <label className="mt-4 block cursor-pointer rounded-[var(--radius-md)] border border-dashed border-[var(--border-soft)] px-4 py-4 text-center text-sm text-[var(--color-copper)] hover:bg-[var(--surface-muted)]">
          {uploading ? "جاري رفع الصور..." : "اختيار صور"}
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={uploading}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.currentTarget.value = "";
              void uploadFiles(files);
            }}
          />
        </label>
      )}

      {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
