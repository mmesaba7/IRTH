import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanText, isSameOriginMutation, isUuid, jsonNoStore } from "@/lib/serverApi";

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return jsonNoStore({ error: "Cross-origin wholesale requests are not allowed." }, 403);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid wholesale request." }, 400);
  }

  const sourceType = body.sourceType === "product" ? "product" : body.sourceType === "general" ? "general" : null;
  const productId = body.productId === null || body.productId === undefined || body.productId === "" ? null : isUuid(body.productId) ? body.productId : undefined;
  const craftId = body.craftId === null || body.craftId === undefined || body.craftId === "" ? null : isUuid(body.craftId) ? body.craftId : undefined;
  const requesterName = cleanText(body.requesterName, 2, 160);
  const companyName = body.companyName === null || body.companyName === undefined || body.companyName === "" ? null : cleanText(body.companyName, 1, 200);
  const countryName = cleanText(body.countryName, 2, 120);
  const contactDetails = cleanText(body.contactDetails, 3, 500);
  const requestedProductOrCraft = cleanText(body.requestedProductOrCraft, 2, 500);
  const destination = body.destination === null || body.destination === undefined || body.destination === "" ? null : cleanText(body.destination, 1, 500);
  const notes = body.notes === null || body.notes === undefined || body.notes === "" ? null : cleanText(body.notes, 1, 4000);
  const quantity = typeof body.quantity === "number" && Number.isInteger(body.quantity) && body.quantity > 0 ? body.quantity : null;

  if (!sourceType || productId === undefined || craftId === undefined || !requesterName || !countryName || !contactDetails || !requestedProductOrCraft || !quantity || (body.companyName && !companyName) || (body.destination && !destination) || (body.notes && !notes)) {
    return jsonNoStore({ error: "Please complete the wholesale request with valid details." }, 422);
  }
  if (sourceType === "product" && !productId) {
    return jsonNoStore({ error: "A product is required for this wholesale request." }, 422);
  }

  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("create_wholesale_request", {
      p_source_type: sourceType,
      p_product_id: productId,
      p_craft_id: craftId,
      p_customer_user_id: authData.user?.id ?? null,
      p_requester_name: requesterName,
      p_company_name: companyName,
      p_country_name: countryName,
      p_contact_details: contactDetails,
      p_requested_product_or_craft: requestedProductOrCraft,
      p_quantity: quantity,
      p_destination: destination,
      p_notes: notes,
    });
    if (error) {
      return jsonNoStore({ error: "Unable to submit wholesale request." }, 500);
    }
    return jsonNoStore({ requestId: data, status: "received" }, 201);
  } catch {
    return jsonNoStore({ error: "Wholesale service is unavailable." }, 503);
  }
}
