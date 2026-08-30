import { NextRequest, NextResponse } from "next/server";
import { quoteCart, type CartQuoteInputItem } from "@/lib/cartQuote";
import { applyPromotionsToQuote } from "@/lib/promotionQuote";

function parseItems(body: unknown): CartQuoteInputItem[] | null {
  if (typeof body !== "object" || body === null || !("items" in body)) {
    return null;
  }

  const rawItems = (body as { items?: unknown }).items;

  if (!Array.isArray(rawItems)) {
    return null;
  }

  const items: CartQuoteInputItem[] = [];

  for (const rawItem of rawItems) {
    if (typeof rawItem !== "object" || rawItem === null) {
      return null;
    }

    const slug = "slug" in rawItem ? (rawItem as { slug?: unknown }).slug : null;
    const quantity =
      "quantity" in rawItem ? (rawItem as { quantity?: unknown }).quantity : null;

    if (
      typeof slug !== "string" ||
      slug.trim().length === 0 ||
      typeof quantity !== "number" ||
      !Number.isSafeInteger(quantity) ||
      quantity <= 0
    ) {
      return null;
    }

    items.push({ slug: slug.trim(), quantity });
  }

  return items;
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const items = parseItems(body);

  if (!items) {
    return NextResponse.json(
      { error: "items must contain valid slug and quantity values" },
      { status: 400 }
    );
  }

  try {
    const baseQuote = await quoteCart(items);

    if (!baseQuote) {
      return NextResponse.json(
        { error: "A market must be selected before quoting the cart" },
        { status: 409 }
      );
    }

    const quote = await applyPromotionsToQuote(baseQuote);

    return NextResponse.json({ quote });
  } catch (error) {
    console.error("Unable to quote cart:", error);

    return NextResponse.json(
      { error: "Unable to quote cart" },
      { status: 500 }
    );
  }
}
