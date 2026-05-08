import { NextResponse } from "next/server";
import { getPricingRows, upsertPricing } from "@/src/lib/pricing";

export const dynamic = "force-dynamic";

function nullableNumber(value: unknown) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function GET() {
  return NextResponse.json(getPricingRows());
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.providerId || !body.model) {
    return NextResponse.json({ error: "providerId and model are required" }, { status: 400 });
  }

  const id = upsertPricing({
    providerId: String(body.providerId),
    providerName: body.providerName ? String(body.providerName) : undefined,
    model: String(body.model),
    inputTokenPrice: nullableNumber(body.inputTokenPrice),
    outputTokenPrice: nullableNumber(body.outputTokenPrice),
    cachedInputTokenPrice: nullableNumber(body.cachedInputTokenPrice),
    currency: body.currency ? String(body.currency) : "USD"
  });

  return NextResponse.json({ id });
}
