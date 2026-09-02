"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as tus from "tus-js-client";

import { createClient } from "@/lib/supabase/client";

type ProductMedia = {
  id: string;
  product_id: string;
  media_type: "image" | "video";
  storage_path: string;
  sort_order: number;
  signedUrl: string;
};

type ProductMediaManagerProps = {
  productId: string;
  productLifecycle: string;
  pendingReview: boolean;
  onMutation?: () => void | Promise<void>;
};

const IMAGE_MAX_SIZE = 8 * 1024 * 1024;
const VIDEO_MAX_SIZE = 50 * 1024 * 1024;
const VIDEO_MAX_DURATION_SECONDS = 60;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("تعذر قراءة مدة الفيديو."));
        return;
      }
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("تعذر قراءة بيانات الفيديو."));
    };
    video.src = url;
  });
}

export default function ProductMediaManager({
  productId,
  productLifecycle,
  pendingReview,
  onMutation,
}: ProductMediaManagerProps) {
  const [media, setMedia] = useState<ProductMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const images = useMemo(
    () => media.filter((item) => item.media_type === "image"),
    [media]
  );
  const video = useMemo(
    () => media.find((item) => item.media_type === "video") ?? null,
    [media]
  );

  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/products/${productId}/media`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || "تعذر تحميل وسائط المنتج.");
      }
      setMedia(Array.isArray(body.media) ? body.media : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "تعذر تحميل وسائط المنتج."
      );
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);

  async function notifyMutation() {
    await loadMedia();
    if (onMutation) await onMutation();
  }

  async function requestIntent(file: File, mediaType: "image" | "video") {
    const response = await fetch(`/api/products/${productId}/media/upload-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mediaType,
        mimeType: file.type,
        fileSize: file.size,
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body?.error || "تعذر تجهيز رفع الملف.");
    }
    return body as {
      storagePath: string;
      token?: string;
      bucketName?: string;
      resumableEndpoint?: string;
    };
  }

  async function finalizeUpload(
    storagePath: string,
    mediaType: "image" | "video"
  ) {
    const response = await fetch(`/api/products/${productId}/media/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storagePath, mediaType }),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body?.error || "تعذر اعتماد الملف بعد الرفع.");
    }
  }

  async function uploadImage(file: File) {
    if (pendingReview || working) return;
    setError("");
    setMessage("");

    if (!IMAGE_TYPES.has(file.type)) {
      setError("الصورة يجب أن تكون JPEG أو PNG أو WebP.");
      return;
    }
    if (file.size <= 0 || file.size > IMAGE_MAX_SIZE) {
      setError("حجم الصورة يجب ألا يزيد عن 8 MB.");
      return;
    }
    if (images.length >= 8) {
      setError("المنتج يحتوي بالفعل على الحد الأقصى: 8 صور.");
      return;
    }

    setWorking(true);
    try {
      const intent = await requestIntent(file, "image");
      if (!intent.token) throw new Error("تعذر الحصول على إذن رفع الصورة.");

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("product-media")
        .uploadToSignedUrl(intent.storagePath, intent.token, file, {
          contentType: file.type,
        });
      if (uploadError) {
        throw new Error(uploadError.message || "فشل رفع الصورة.");
      }

      await finalizeUpload(intent.storagePath, "image");
      await notifyMutation();
      setMessage(
        productLifecycle === "published"
          ? "تمت إضافة الصورة. المنتج عاد لمسودة ويحتاج إرسالًا جديدًا للمراجعة قبل ظهوره للعامة."
          : "تمت إضافة الصورة بنجاح."
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "فشل رفع الصورة."
      );
    } finally {
      setWorking(false);
    }
  }

  async function uploadVideo(file: File) {
    if (pendingReview || working) return;
    setError("");
    setMessage("");

    if (file.type !== "video/mp4") {
      setError("فيديو المنتج يجب أن يكون MP4.");
      return;
    }
    if (file.size <= 0 || file.size > VIDEO_MAX_SIZE) {
      setError("حجم فيديو المنتج يجب ألا يزيد عن 50 MB.");
      return;
    }
    if (video) {
      setError("المنتج يحتوي بالفعل على فيديو واحد.");
      return;
    }

    setWorking(true);
    setVideoProgress(0);
    try {
      const duration = await readVideoDuration(file);
      if (duration > VIDEO_MAX_DURATION_SECONDS + 0.25) {
        throw new Error("مدة فيديو المنتج يجب ألا تزيد عن 60 ثانية.");
      }

      const intent = await requestIntent(file, "video");
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const resumableEndpoint = intent.resumableEndpoint;
      const bucketName = intent.bucketName;

      if (accessToken && resumableEndpoint && bucketName) {
        await new Promise<void>((resolve, reject) => {
          const uploader = new tus.Upload(file, {
            endpoint: resumableEndpoint,
            headers: { authorization: `Bearer ${accessToken}` },
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            chunkSize: 6 * 1024 * 1024,
            retryDelays: [0, 1000, 3000, 5000],
            metadata: {
              bucketName,
              objectName: intent.storagePath,
              contentType: "video/mp4",
              cacheControl: "3600",
            },
            onProgress: (uploaded, total) =>
              setVideoProgress(
                total > 0 ? Math.round((uploaded / total) * 100) : 0
              ),
            onError: reject,
            onSuccess: () => resolve(),
          });
          uploader.start();
        });
      } else {
        if (!intent.token) throw new Error("تعذر الحصول على إذن رفع الفيديو.");
        const { error: uploadError } = await supabase.storage
          .from("product-media")
          .uploadToSignedUrl(intent.storagePath, intent.token, file, {
            contentType: file.type,
          });
        if (uploadError) {
          throw new Error(uploadError.message || "فشل رفع الفيديو.");
        }
      }

      await finalizeUpload(intent.storagePath, "video");
      await notifyMutation();
      setMessage(
        productLifecycle === "published"
          ? "تمت إضافة الفيديو. المنتج عاد لمسودة ويحتاج إرسالًا جديدًا للمراجعة."
          : "تمت إضافة الفيديو بنجاح."
      );
    } catch (videoError) {
      setError(
        videoError instanceof Error ? videoError.message : "فشل رفع الفيديو."
      );
    } finally {
      setVideoProgress(null);
      setWorking(false);
    }
  }

  async function deleteMedia(item: ProductMedia) {
    if (pendingReview || working) return;
    if (!window.confirm("هل أنت متأكد من حذف هذا الملف من المنتج؟")) return;

    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/products/${productId}/media/${item.id}`,
        { method: "DELETE" }
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || "تعذر حذف الملف.");
      }
      await notifyMutation();
      setMessage(
        productLifecycle === "published"
          ? "تم حذف الملف. المنتج عاد لمسودة ويحتاج مراجعة جديدة قبل النشر."
          : "تم حذف الملف بنجاح."
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "تعذر حذف الملف."
      );
    } finally {
      setWorking(false);
    }
  }

  async function moveImage(index: number, direction: -1 | 1) {
    if (pendingReview || working) return;
    const target = index + direction;
    if (target < 0 || target >= images.length) return;

    const reordered = [...images];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/products/${productId}/media/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaIds: reordered.map((item) => item.id) }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || "تعذر ترتيب الصور.");
      }
      await notifyMutation();
      setMessage(
        productLifecycle === "published"
          ? "تم تغيير ترتيب الصور. المنتج عاد لمسودة ويحتاج مراجعة جديدة."
          : "تم تحديث ترتيب الصور. أول صورة هي صورة الغلاف."
      );
    } catch (reorderError) {
      setError(
        reorderError instanceof Error
          ? reorderError.message
          : "تعذر ترتيب الصور."
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 sm:p-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
            صور وفيديو المنتج
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            حتى 8 صور وفيديو MP4 واحد بحد أقصى 60 ثانية. أول صورة هي الغلاف.
          </p>
        </div>
        <span className="text-xs text-[var(--text-muted)]">
          {images.length}/8 صور · {video ? "1/1 فيديو" : "0/1 فيديو"}
        </span>
      </div>

      {productLifecycle === "published" && !pendingReview && (
        <div className="mt-4 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          أي إضافة أو حذف أو إعادة ترتيب للوسائط ستوقف نشر المنتج مؤقتًا وتعيده لمسودة حتى يراجع IRTH النسخة الجديدة.
        </div>
      )}

      {pendingReview && (
        <div className="mt-4 rounded-[var(--radius-md)] border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          الوسائط مقفولة أثناء المراجعة. بعد قرار IRTH تقدر تعدلها مرة أخرى إذا احتاج المنتج تعديل.
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-[var(--radius-md)] bg-green-50 p-4 text-sm text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-copper)] px-5 py-3 text-center text-sm text-[var(--color-copper)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
          إضافة صورة
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={pendingReview || working || images.length >= 8}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = "";
              if (file) void uploadImage(file);
            }}
          />
        </label>
        <label className="cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-copper)] px-5 py-3 text-center text-sm text-[var(--color-copper)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
          إضافة فيديو
          <input
            type="file"
            accept="video/mp4"
            className="sr-only"
            disabled={pendingReview || working || Boolean(video)}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = "";
              if (file) void uploadVideo(file);
            }}
          />
        </label>
      </div>

      {videoProgress !== null && (
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          جاري رفع الفيديو: {videoProgress}%
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-[var(--text-secondary)]">جاري تحميل الوسائط...</p>
      ) : media.length === 0 ? (
        <p className="mt-6 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-5 text-sm text-[var(--text-muted)]">
          لا توجد وسائط لهذا المنتج حتى الآن.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {images.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((item, index) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-soft)]"
                >
                  <div className="relative">
                    <img
                      src={item.signedUrl}
                      alt={`Product image ${index + 1}`}
                      className="h-48 w-full object-cover"
                    />
                    {index === 0 && (
                      <span className="absolute start-2 top-2 rounded-full bg-[var(--color-espresso)] px-3 py-1 text-xs text-[var(--color-ivory)]">
                        الغلاف
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 p-3">
                    <button
                      type="button"
                      disabled={pendingReview || working || index === 0}
                      onClick={() => void moveImage(index, -1)}
                      className="rounded border border-[var(--border-soft)] px-3 py-1.5 text-xs disabled:opacity-40"
                    >
                      السابق
                    </button>
                    <button
                      type="button"
                      disabled={pendingReview || working || index === images.length - 1}
                      onClick={() => void moveImage(index, 1)}
                      className="rounded border border-[var(--border-soft)] px-3 py-1.5 text-xs disabled:opacity-40"
                    >
                      التالي
                    </button>
                    <button
                      type="button"
                      disabled={pendingReview || working}
                      onClick={() => void deleteMedia(item)}
                      className="rounded border border-red-200 px-3 py-1.5 text-xs text-red-700 disabled:opacity-40"
                    >
                      حذف الصورة
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {video && (
            <article className="rounded-[var(--radius-md)] border border-[var(--border-soft)] p-3">
              <video
                src={video.signedUrl}
                controls
                className="max-h-80 w-full rounded-[var(--radius-md)] bg-black"
              />
              <button
                type="button"
                disabled={pendingReview || working}
                onClick={() => void deleteMedia(video)}
                className="mt-3 rounded border border-red-200 px-4 py-2 text-sm text-red-700 disabled:opacity-40"
              >
                حذف الفيديو
              </button>
            </article>
          )}
        </div>
      )}
    </section>
  );
}