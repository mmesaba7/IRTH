import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      productId: string;
    }>;
  }
) {
  try {
    const { productId } = await context.params;
    const body = await request.json();

    const mediaIds = body.mediaIds;

    if (
      !Array.isArray(mediaIds) ||
      !mediaIds.every(
        (id) =>
          typeof id === "string" &&
          id.length > 0
      )
    ) {
      return NextResponse.json(
        { error: "Invalid media order" },
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
      error: reorderError,
    } = await supabase.rpc(
      "reorder_product_images",
      {
        p_product_id: productId,
        p_media_ids: mediaIds,
      }
    );

    if (reorderError) {
      console.error("Product image reorder error:", {
        message: reorderError.message,
        code: reorderError.code,
        details: reorderError.details,
        hint: reorderError.hint,
      });

      return NextResponse.json(
        { error: "Could not reorder product images" },
        { status: 400 }
      );
    }

    const {
      data: images,
      error: imagesError,
    } = await supabase
      .from("product_media")
      .select(
        "id, product_id, media_type, storage_path, sort_order"
      )
      .eq("product_id", productId)
      .eq("media_type", "image")
      .order("sort_order", {
        ascending: true,
      });

    if (imagesError) {
      return NextResponse.json(
        { error: "Images reordered but could not reload them" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      images,
      coverMediaId: images?.[0]?.id ?? null,
    });
  } catch (error) {
    console.error(
      "Product image reorder error:",
      error
    );

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}