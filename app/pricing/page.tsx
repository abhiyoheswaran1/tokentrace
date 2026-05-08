import { PricingSettings } from "@/components/pricing-settings";
import { getPricingRows } from "@/src/lib/pricing";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Pricing Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Configure editable provider and model prices for transparent local cost estimates.
        </p>
      </div>
      <PricingSettings initialRows={getPricingRows()} />
    </div>
  );
}
