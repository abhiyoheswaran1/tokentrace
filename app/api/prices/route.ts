import { NextResponse } from "next/server";
import { readJsonObject } from "@/src/lib/api-json";
import { getPricingRows, upsertPricing } from "@/src/lib/pricing";

export const dynamic = "force-dynamic";

function requiredText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullablePrice(value: unknown, field: string) {
  if (value == null) return { ok: true as const, value: null };
  if (typeof value === "string" && value.trim() === "") return { ok: true as const, value: null };
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return { ok: false as const, error: `${field} must be a non-negative number or empty` };
  }
  return { ok: true as const, value: number };
}

export async function GET() {
  return NextResponse.json(getPricingRows());
}

export async function POST(request: Request) {
  const parsed = await readJsonObject(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const body = parsed.body;
  const providerId = requiredText(body.providerId);
  const model = requiredText(body.model);
  if (!providerId || !model) {
    return NextResponse.json({ error: "providerId and model are required" }, { status: 400 });
  }
  const inputTokenPrice = nullablePrice(body.inputTokenPrice, "inputTokenPrice");
  const outputTokenPrice = nullablePrice(body.outputTokenPrice, "outputTokenPrice");
  const cachedInputTokenPrice = nullablePrice(body.cachedInputTokenPrice, "cachedInputTokenPrice");
  const cacheWriteTokenPrice = nullablePrice(body.cacheWriteTokenPrice, "cacheWriteTokenPrice");
  if (!inputTokenPrice.ok) return NextResponse.json({ error: inputTokenPrice.error }, { status: 400 });
  if (!outputTokenPrice.ok) return NextResponse.json({ error: outputTokenPrice.error }, { status: 400 });
  if (!cachedInputTokenPrice.ok) return NextResponse.json({ error: cachedInputTokenPrice.error }, { status: 400 });
  if (!cacheWriteTokenPrice.ok) return NextResponse.json({ error: cacheWriteTokenPrice.error }, { status: 400 });

  const id = upsertPricing({
    providerId,
    providerName: requiredText(body.providerName) || undefined,
    model,
    inputTokenPrice: inputTokenPrice.value,
    outputTokenPrice: outputTokenPrice.value,
    cachedInputTokenPrice: cachedInputTokenPrice.value,
    cacheWriteTokenPrice: cacheWriteTokenPrice.value,
    currency: requiredText(body.currency) || "USD"
  });

  return NextResponse.json({ id, costsRecalculated: true });
}
