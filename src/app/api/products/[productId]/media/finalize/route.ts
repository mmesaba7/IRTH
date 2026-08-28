import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMp4Duration } from "@/lib/media/get-mp4-duration";

const IMAGE_MAX_SIZE = 8 * 1024 * 1024;
const VIDEO_MAX_SIZE = 50 * 1024 * 1024;
const VIDEO_MAX_DURATION_SECONDS = 60;

const allowedImageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function POST(
  request: Request,
  context: { params: Promise<{ productId: string }> }
) {
  let storagePath: string | null = null;

  try {
    const { productId } = await context.params;
    const body = await request.json();

    storagePath = body.storagePath;
    const mediaType = body.mediaType;

    if (
      typeof storagePath !== "string" ||
      storagePath.length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid storage path" },
        { status: 400 }
      );
    }

    if (
      mediaType !== "image" &&
      mediaType !== "video"
    ) {
      return NextResponse.json(
        { error: "Invalid media type" },
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

    const expectedPrefix =
      `${artisan.id}/${product.id}/`;

    if (!storagePath.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { error: "Storage path does not belong to this product" },
        { status: 403 }
      );
    }

    const {
      data: fileInfo,
      error: fileInfoError,
    } = await supabase.storage
      .from("product-media")
      .info(storagePath);

    if (fileInfoError || !fileInfo) {
      return NextResponse.json(
        { error: "Uploaded file not found" },
        { status: 404 }
      );
    }

    const fileSize = Number(fileInfo.size);
    const mimeType = fileInfo.contentType;

    if (
      !Number.isFinite(fileSize) ||
      fileSize <= 0
    ) {
      await supabase.storage
        .from("product-media")
        .remove([storagePath]);

      return NextResponse.json(
        { error: "Invalid uploaded file size" },
        { status: 400 }
      );
    }

    if (mediaType === "image") {
      if (fileSize > IMAGE_MAX_SIZE) {
        await supabase.storage
          .from("product-media")
          .remove([storagePath]);

        return NextResponse.json(
          { error: "Image must be 8 MB or smaller" },
          { status: 400 }
        );
      }

      if (
        !mimeType ||
        !allowedImageMimeTypes.includes(mimeType)
      ) {
        await supabase.storage
          .from("product-media")
          .remove([storagePath]);

        return NextResponse.json(
          { error: "Unsupported image type" },
          { status: 400 }
        );
      }

      const {
        count: imageCount,
        error: imageCountError,
      } = await supabase
        .from("product_media")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("product_id", productId)
        .eq("media_type", "image");

      if (imageCountError) {
        return NextResponse.json(
          { error: "Could not check image count" },
          { status: 500 }
        );
      }

      if ((imageCount ?? 0) >= 8) {
        await supabase.storage
          .from("product-media")
          .remove([storagePath]);

        return NextResponse.json(
          { error: "Product already has 8 images" },
          { status: 409 }
        );
      }

      const {
        data: lastImage,
        error: lastImageError,
      } = await supabase
        .from("product_media")
        .select("sort_order")
        .eq("product_id", productId)
        .eq("media_type", "image")
        .order("sort_order", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (lastImageError) {
        return NextResponse.json(
          { error: "Could not determine image order" },
          { status: 500 }
        );
      }

      const nextSortOrder =
        lastImage?.sort_order != null
          ? lastImage.sort_order + 1
          : 0;

      const {
        data: media,
        error: insertError,
      } = await supabase
        .from("product_media")
        .insert({
          product_id: productId,
          media_type: "image",
          storage_path: storagePath,
          sort_order: nextSortOrder,
        })
        .select(
          "id, product_id, media_type, storage_path, sort_order"
        )
        .single();

      if (insertError) {
        await supabase.storage
          .from("product-media")
          .remove([storagePath]);

        console.error("Product media insert error:", {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        });

        return NextResponse.json(
          { error: "Could not finalize product media" },
          { status: 500 }
        );
      }

      return NextResponse.json({ media });
    }

    if (fileSize > VIDEO_MAX_SIZE) {
      await supabase.storage
        .from("product-media")
        .remove([storagePath]);

      return NextResponse.json(
        { error: "Video must be 50 MB or smaller" },
        { status: 400 }
      );
    }

    if (mimeType !== "video/mp4") {
      await supabase.storage
        .from("product-media")
        .remove([storagePath]);

      return NextResponse.json(
        { error: "Video must be MP4" },
        { status: 400 }
      );
    }

    const {
      count: videoCount,
      error: videoCountError,
    } = await supabase
      .from("product_media")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("product_id", productId)
      .eq("media_type", "video");

    if (videoCountError) {
      return NextResponse.json(
        { error: "Could not check video count" },
        { status: 500 }
      );
    }

    if ((videoCount ?? 0) >= 1) {
      await supabase.storage
        .from("product-media")
        .remove([storagePath]);

      return NextResponse.json(
        { error: "Product already has a video" },
        { status: 409 }
      );
    }

    const {
      data: videoBlob,
      error: downloadError,
    } = await supabase.storage
      .from("product-media")
      .download(storagePath);

    if (downloadError || !videoBlob) {
      return NextResponse.json(
        { error: "Could not read uploaded video" },
        { status: 500 }
      );
    }

    const videoBuffer = await videoBlob.arrayBuffer();

    let durationSeconds: number;

    try {
      durationSeconds =
        await getMp4Duration(videoBuffer);
    } catch (error) {
      await supabase.storage
        .from("product-media")
        .remove([storagePath]);

      console.error("MP4 validation error:", error);

      return NextResponse.json(
        { error: "Invalid MP4 video" },
        { status: 400 }
      );
    }

    if (
      durationSeconds >
      VIDEO_MAX_DURATION_SECONDS
    ) {
      await supabase.storage
        .from("product-media")
        .remove([storagePath]);

      return NextResponse.json(
        {
          error:
            "Video must be 60 seconds or shorter",
        },
        { status: 400 }
      );
    }

    const {
      data: media,
      error: insertError,
    } = await supabase
      .from("product_media")
      .insert({
        product_id: productId,
        media_type: "video",
        storage_path: storagePath,
        sort_order: null,
      })
      .select(
        "id, product_id, media_type, storage_path, sort_order"
      )
      .single();

    if (insertError) {
      await supabase.storage
        .from("product-media")
        .remove([storagePath]);

      console.error("Product video insert error:", {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      });

      return NextResponse.json(
        { error: "Could not finalize product media" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      media,
      durationSeconds,
    });
  } catch (error) {
    console.error("Media finalize error:", error);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}