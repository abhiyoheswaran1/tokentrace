import { PricingSettings } from "@/components/pricing-settings";
import { PageHeader } from "@/components/ui/typography";
import { getPricingRows } from "@/src/lib/pricing";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing Configuration"
        description="Configure editable provider and model prices for transparent local cost estimates."
      />
      <PricingSettings initialRows={getPricingRows()} />
    </div>
  );
}
