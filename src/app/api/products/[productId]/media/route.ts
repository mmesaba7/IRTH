import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_EXPIRES_IN = 60 * 10;

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      productId: string;
    }>;
  }
) {
  try {
    const { productId } = await context.params;
    const supabase = await createClient();

    const {
      data: product,
      error: productError,
    } = await supabase
      .from("products")
      .select("id, lifecycle_status")
      .eq("id", productId)
      .maybeSingle();

    if (productError) {
      return NextResponse.json(
        { error: "Could not load product" },
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
      data: media,
      error: mediaError,
    } = await supabase
      .from("product_media")
      .select(
        "id, product_id, media_type, storage_path, sort_order"
      )
      .eq("product_id", productId);

    if (mediaError) {
      return NextResponse.json(
        { error: "Could not load product media" },
        { status: 500 }
      );
    }

    const orderedMedia = [...(media ?? [])].sort(
      (a, b) => {
        if (
          a.media_type === "image" &&
          b.media_type === "video"
        ) {
          return -1;
        }

        if (
          a.media_type === "video" &&
          b.media_type === "image"
        ) {
          return 1;
        }

        if (
          a.media_type === "image" &&
          b.media_type === "image"
        ) {
          return (
            (a.sort_order ?? 0) -
            (b.sort_order ?? 0)
          );
        }

        return 0;
      }
    );

    const mediaWithUrls = await Promise.all(
      orderedMedia.map(async (item) => {
        const {
          data: signedData,
          error: signedError,
        } = await supabase.storage
          .from("product-media")
          .createSignedUrl(
            item.storage_path,
            SIGNED_URL_EXPIRES_IN
          );

        if (signedError || !signedData?.signedUrl) {
          throw new Error(
            `Could not sign media ${item.id}`
          );
        }

        return {
          ...item,
          signedUrl: signedData.signedUrl,
        };
      })
    );

    const firstImage = mediaWithUrls.find(
      (item) => item.media_type === "image"
    );

    return NextResponse.json({
      media: mediaWithUrls,
      coverMediaId: firstImage?.id ?? null,
      expiresIn: SIGNED_URL_EXPIRES_IN,
    });
  } catch (error) {
    console.error(
      "Product media signed URL error:",
      error
    );

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}