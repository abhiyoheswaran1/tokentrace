import { BookOpen, ExternalLink } from "lucide-react";
import { guideNav, PRODUCT_WEBSITE_URL } from "@/app/guide/guide-content";

export function GuideNavSidebar() {
  return (
    <aside className="h-fit rounded-lg border bg-card p-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:self-start">
      <div className="flex items-center gap-2 px-2 py-1 text-sm font-semibold">
        <BookOpen className="h-4 w-4 text-primary" />
        Guide sections
      </div>
      <nav aria-label="Guide sections" className="mt-2 space-y-1">
        {guideNav.map(([href, label, detail]) => (
          <a
            key={href}
            href={href}
            className="block rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <span className="block font-medium text-foreground">{label}</span>
            <span className="mt-1 block text-xs leading-5">{detail}</span>
          </a>
        ))}
      </nav>
      <div className="mt-3 border-t px-2 pt-3 text-xs leading-5 text-muted-foreground">
        <p>
          TokenTrace is local-first. Rate refreshes fetch public model-rate data; usage logs and prompts are not sent with that request.
        </p>
        <a
          href={PRODUCT_WEBSITE_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
        >
          Product website
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </aside>
  );
}
