import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";

const IMAGE_MAX_SIZE = 8 * 1024 * 1024;
const VIDEO_MAX_SIZE = 50 * 1024 * 1024;

const allowedMimeTypes = {
  "image/jpeg": {
    mediaType: "image",
    extension: "jpg",
  },
  "image/png": {
    mediaType: "image",
    extension: "png",
  },
  "image/webp": {
    mediaType: "image",
    extension: "webp",
  },
  "video/mp4": {
    mediaType: "video",
    extension: "mp4",
  },
} as const;

type AllowedMimeType = keyof typeof allowedMimeTypes;

export async function POST(
  request: Request,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await context.params;

    const body = await request.json();

    const mediaType = body.mediaType as "image" | "video";
    const mimeType = body.mimeType as string;
    const fileSize = Number(body.fileSize);

    if (
      mediaType !== "image" &&
      mediaType !== "video"
    ) {
      return NextResponse.json(
        { error: "Invalid media type" },
        { status: 400 }
      );
    }

    if (!(mimeType in allowedMimeTypes)) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    const mimeConfig =
      allowedMimeTypes[mimeType as AllowedMimeType];

    if (mimeConfig.mediaType !== mediaType) {
      return NextResponse.json(
        { error: "Media type does not match file type" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json(
        { error: "Invalid file size" },
        { status: 400 }
      );
    }

    if (
      mediaType === "image" &&
      fileSize > IMAGE_MAX_SIZE
    ) {
      return NextResponse.json(
        { error: "Image must be 8 MB or smaller" },
        { status: 400 }
      );
    }

    if (
      mediaType === "video" &&
      fileSize > VIDEO_MAX_SIZE
    ) {
      return NextResponse.json(
        { error: "Video must be 50 MB or smaller" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: claimsData,
      error: claimsError,
    } = await supabase.auth.getClaims();

    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const {
      data: artisan,
      error: artisanError,
    } = await supabase
      .from("artisan_profiles")
      .select("id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (artisanError) {
      return NextResponse.json(
        { error: "Could not verify artisan" },
        { status: 500 }
      );
    }

    if (!artisan) {
      return NextResponse.json(
        { error: "Artisan profile not found" },
        { status: 403 }
      );
    }

    const {
      data: product,
      error: productError,
    } = await supabase
      .from("products")
      .select("id, artisan_id")
      .eq("id", productId)
      .eq("artisan_id", artisan.id)
      .maybeSingle();

    if (productError) {
      return NextResponse.json(
        { error: "Could not verify product" },
        { status: 500 }
      );
    }

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const {
      count: mediaCount,
      error: mediaCountError,
    } = await supabase
      .from("product_media")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("product_id", productId)
      .eq("media_type", mediaType);

    if (mediaCountError) {
      return NextResponse.json(
        { error: "Could not check product media" },
        { status: 500 }
      );
    }

    if (
      mediaType === "image" &&
      (mediaCount ?? 0) >= 8
    ) {
      return NextResponse.json(
        { error: "Product already has 8 images" },
        { status: 409 }
      );
    }

    if (
      mediaType === "video" &&
      (mediaCount ?? 0) >= 1
    ) {
      return NextResponse.json(
        { error: "Product already has a video" },
        { status: 409 }
      );
    }

    const fileId = randomUUID();

    const storagePath =
      `${artisan.id}/${product.id}/${fileId}.${mimeConfig.extension}`;

    const {
      data: signedUpload,
      error: signedUploadError,
    } = await supabase.storage
      .from("product-media")
      .createSignedUploadUrl(storagePath);

    if (signedUploadError || !signedUpload) {
      return NextResponse.json(
        { error: "Could not create upload permission" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      storagePath,
      token: signedUpload.token,
      mediaType,
      mimeType,
    });
  } catch (error) {
    console.error("Media upload intent error:", error);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}