import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{
      productId: string;
      mediaId: string;
    }>;
  }
) {
  try {
    const { productId, mediaId } = await context.params;

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
      data: media,
      error: mediaError,
    } = await supabase
      .from("product_media")
      .select("id, product_id, storage_path")
      .eq("id", mediaId)
      .eq("product_id", productId)
      .maybeSingle();

    if (mediaError) {
      return NextResponse.json(
        { error: "Could not verify product media" },
        { status: 500 }
      );
    }

    if (!media) {
      return NextResponse.json(
        { error: "Product media not found" },
        { status: 404 }
      );
    }

    const expectedPrefix =
      `${artisan.id}/${product.id}/`;

    if (!media.storage_path.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { error: "Invalid media storage path" },
        { status: 403 }
      );
    }

    const {
      error: deleteRowError,
    } = await supabase
      .from("product_media")
      .delete()
      .eq("id", media.id)
      .eq("product_id", product.id);

    if (deleteRowError) {
      console.error("Product media DB delete error:", {
        message: deleteRowError.message,
        code: deleteRowError.code,
        details: deleteRowError.details,
        hint: deleteRowError.hint,
      });

      return NextResponse.json(
        { error: "Could not delete product media" },
        { status: 500 }
      );
    }

    const {
      error: storageDeleteError,
    } = await supabase.storage
      .from("product-media")
      .remove([media.storage_path]);

    if (storageDeleteError) {
      console.error(
        "Product media Storage cleanup error:",
        storageDeleteError
      );

      return NextResponse.json(
        {
          deleted: true,
          storageCleanup: false,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      deleted: true,
      storageCleanup: true,
    });
  } catch (error) {
    console.error("Product media delete error:", error);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}