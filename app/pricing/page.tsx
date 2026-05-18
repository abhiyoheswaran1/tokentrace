import { PricingSettings } from "@/components/pricing-settings";
import { PageHeader } from "@/components/ui/typography";
import { getAnalyticsData } from "@/src/lib/analytics";
import { getPricingRows } from "@/src/lib/pricing";

export const dynamic = "force-dynamic";

export default async function PricingPage({
  searchParams
}: {
  searchParams?: Promise<{ model?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  const data = getAnalyticsData();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Model Rates"
        description="Editable provider model rates used to estimate local AI CLI cost. TokenTrace does not bill or meter usage."
      />
      <PricingSettings
        initialRows={getPricingRows()}
        initialModel={params?.model}
        returnTo={params?.returnTo}
        aliasSuggestions={data.modelAliasSuggestions}
      />
    </div>
  );
}
