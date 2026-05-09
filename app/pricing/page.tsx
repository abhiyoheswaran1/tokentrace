import { PricingSettings } from "@/components/pricing-settings";
import { PageHeader } from "@/components/ui/typography";
import { getAnalyticsData } from "@/src/lib/analytics";
import { getPricingRows } from "@/src/lib/pricing";

export const dynamic = "force-dynamic";

export default async function PricingPage({
  searchParams
}: {
  searchParams?: Promise<{ model?: string }>;
}) {
  const params = await searchParams;
  const data = getAnalyticsData();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing Configuration"
        description="Configure editable provider and model prices for transparent local cost estimates."
      />
      <PricingSettings
        initialRows={getPricingRows()}
        initialModel={params?.model}
        aliasSuggestions={data.modelAliasSuggestions}
      />
    </div>
  );
}
