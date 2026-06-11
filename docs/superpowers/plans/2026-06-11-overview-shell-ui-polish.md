# Overview Shell UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the TokenTrace app shell and Overview dashboard so the first product surface feels clearer, more evidence-forward, and easier to scan.

**Architecture:** Keep the existing Next.js routes, shared UI primitives, and Overview data flow. The shell change stays inside `components/sidebar.tsx`; Overview polish stays in `app/page.tsx` and `components/overview/summary-cards.tsx`; product assessment work adds a standalone doc.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4 utility classes, Vitest source/render tests, ProjScan.

---

## File Structure

- Modify `components/sidebar.tsx`: define sectioned navigation, render desktop sections, keep mobile command menu route list intact, refine active classes.
- Modify `tests/navigation-active-state.test.tsx`: cover grouped desktop navigation and active state.
- Modify `tests/sidebar-version.test.tsx`: cover the quieter metadata footer and grouped navigation labels.
- Modify `app/page.tsx`: add named Overview section wrappers and tighter rhythm classes.
- Modify `components/overview/summary-cards.tsx`: add compact evidence-action treatment and clearer confidence group labels.
- Modify `tests/overview-layout-order.test.ts`: cover Overview wrappers and evidence labels.
- Modify `tests/metric-card-divider-alignment.test.ts`: cover the refined Cost & Sessions split-card structure.
- Add `docs/CHATGPT_APP_FEASIBILITY.md`: document whether TokenTrace can, could, and should ship as a ChatGPT app.
- Modify `CHANGELOG.md`: record the UI polish and feasibility note under `Unreleased`.

## Task 1: App Shell Grouping

**Files:**
- Modify: `components/sidebar.tsx`
- Test: `tests/navigation-active-state.test.tsx`
- Test: `tests/sidebar-version.test.tsx`

- [ ] **Step 1: Write the failing navigation grouping tests**

Add expectations that desktop navigation renders grouped sections and keeps active route semantics:

```tsx
it("groups desktop navigation into task areas without changing route URLs", () => {
  currentPath = "/repair";
  const html = renderToStaticMarkup(<Sidebar appVersion="0.10.0" />);
  const text = html.replace(/<[^>]*>/g, "");

  expect(text).toContain("Analyze");
  expect(text).toContain("Investigate");
  expect(text).toContain("Maintain");
  expect(text).toContain("Reference");
  expect(html).toContain('aria-label="Analyze navigation"');
  expect(html).toContain('aria-label="Investigate navigation"');
  expect(html).toContain('href="/repair"');
  expect(html).toContain('aria-current="page"');
  expect(html).toContain("bg-muted");
  expect(html).toContain("text-primary");
});
```

Update the sidebar version test to expect grouped labels and a quieter metadata footer:

```tsx
expect(text).toContain("Analyze");
expect(text).toContain("Investigate");
expect(text).toContain("Maintain");
expect(text).toContain("Reference");
expect(text).toContain("Local processing");
expect(text).toContain("v0.4.0");
expect(html).toContain('aria-label="Analyze navigation"');
expect(html).toContain('aria-label="Reference navigation"');
```

- [ ] **Step 2: Run tests to verify the failure**

Run:

```bash
npm test -- tests/navigation-active-state.test.tsx tests/sidebar-version.test.tsx
```

Expected: FAIL because grouped labels and section aria-labels do not exist yet.

- [ ] **Step 3: Implement shell grouping**

In `components/sidebar.tsx`, replace the single desktop `primaryNavItems.map` block with a sectioned model:

```tsx
const navSections = [
  {
    label: "Analyze",
    items: [overviewNavItem, tools, models, projects]
  },
  {
    label: "Investigate",
    items: [sessions, insights, query, repair]
  },
  {
    label: "Maintain",
    items: [pricing, diagnostics, discovery, parsers, rawData, settings]
  }
];
```

Keep `primaryNavItems` as a flattened list derived from `navSections` so mobile shortcuts and route URLs do not change. Render each desktop section with a small uppercase label, a section-specific `aria-label`, and the existing `NavLink`.

Refine active desktop link classes from `bg-primary/10 font-medium text-primary` to a quieter selected surface such as `bg-muted font-medium text-primary shadow-xs ring-1 ring-border/60`. Keep mobile active classes compact and unchanged except where labels need wrapping protection.

Move the guide link into a `Reference` nav section with `aria-label="Reference navigation"`. Keep the footer credit link unchanged.

- [ ] **Step 4: Run tests to verify the shell task passes**

Run:

```bash
npm test -- tests/navigation-active-state.test.tsx tests/sidebar-version.test.tsx
```

Expected: PASS.

## Task 2: Overview Rhythm And Evidence Surfaces

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/overview/summary-cards.tsx`
- Test: `tests/overview-layout-order.test.ts`
- Test: `tests/metric-card-divider-alignment.test.ts`

- [ ] **Step 1: Write the failing Overview polish tests**

Add source expectations for named wrappers and clearer evidence labels:

```ts
it("uses named Overview workbench sections for scan rhythm", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");

  expect(source).toContain("overview-workbench");
  expect(source).toContain("overview-primary-section");
  expect(source).toContain("overview-summary-grid");
  expect(source).toContain("overview-repair-section");
});

it("labels local evidence actions and accounting states near summary numbers", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components/overview/summary-cards.tsx"), "utf8");

  expect(source).toContain("Local evidence");
  expect(source).toContain("Exact");
  expect(source).toContain("Estimated");
  expect(source).toContain("Unknown");
  expect(source).toContain("Fresh / non-cache");
  expect(source).toContain("Cache read/write");
});
```

Extend `tests/metric-card-divider-alignment.test.ts`:

```ts
expect(source).toContain("cost-sessions-metric-pane");
expect(source).toContain("Local evidence");
expect(source).toContain("Exact");
expect(source).toContain("Estimated");
expect(source).toContain("Unknown");
```

- [ ] **Step 2: Run tests to verify the failure**

Run:

```bash
npm test -- tests/overview-layout-order.test.ts tests/metric-card-divider-alignment.test.ts
```

Expected: FAIL because the named wrappers and local evidence labels do not exist yet.

- [ ] **Step 3: Implement Overview wrappers**

In `app/page.tsx`, add classes without changing data flow:

```tsx
return (
  <div className="overview-primary-section space-y-7">
    ...
    <div className="overview-summary-grid grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      ...
    </div>
    ...
  </div>
);
```

Set the root page wrapper to:

```tsx
<div className="overview-workbench space-y-7">
```

Set the repair section wrapper to:

```tsx
<div className="overview-repair-section space-y-7">
```

- [ ] **Step 4: Implement summary evidence polish**

In `components/overview/summary-cards.tsx`, add small helpers:

```tsx
function EvidenceAction({ href, label, muted = false }: { href: string; label: string; muted?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex w-fit items-center gap-1.5 text-xs font-medium underline-offset-4 hover:underline", muted ? "text-muted-foreground hover:text-foreground" : "text-primary")}>
      <span>{label}</span>
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}
```

Use `Local evidence` as the action group label in both summary cards. Update detail labels to use `Exact`, `Estimated`, `Unknown`, `Fresh / non-cache`, and `Cache read/write` where those values appear. Keep text labels next to numbers so color is not the only signal.

Add `cost-sessions-metric-pane` to the cost/session pane section class so tests can pin the split-card structure.

- [ ] **Step 5: Run tests to verify the Overview task passes**

Run:

```bash
npm test -- tests/overview-layout-order.test.ts tests/metric-card-divider-alignment.test.ts tests/responsive-polish.test.ts
```

Expected: PASS.

## Task 3: ChatGPT App Feasibility Note

**Files:**
- Add: `docs/CHATGPT_APP_FEASIBILITY.md`

- [ ] **Step 1: Write the feasibility document**

Create a concise note with these sections:

```md
# ChatGPT App Feasibility

## Recommendation

Do not pursue a public ChatGPT app release yet. Build a private developer-mode prototype only if we can keep TokenTrace local-first and avoid uploading raw prompts, local paths, or full usage history.

## Can

TokenTrace can technically become a ChatGPT app because ChatGPT apps use an MCP server plus optional embedded UI components, and TokenTrace already has MCP-oriented discovery and tool concepts.

## Could

The safest prototype would expose a read-only, redacted evidence-pack workflow: the local TokenTrace CLI produces a user-selected export, and the ChatGPT app explains the export without scanning the user's machine.

## Should

Public release should wait. A hosted ChatGPT app needs HTTPS reachability, review, metadata, privacy boundaries, and likely authentication or storage decisions. Those requirements conflict with the current local-first promise unless the app is limited to explicit user-provided artifacts.

## Sources

- OpenAI Apps SDK overview: https://developers.openai.com/apps-sdk
- Build your MCP server: https://developers.openai.com/apps-sdk/build/mcp-server
- Connect from ChatGPT: https://developers.openai.com/apps-sdk/deploy/connect-chatgpt
- Submit and maintain your app: https://developers.openai.com/apps-sdk/deploy/submission
- Security and privacy: https://developers.openai.com/apps-sdk/guides/security-privacy
```

- [ ] **Step 2: Inspect the document**

Run:

```bash
sed -n '1,220p' docs/CHATGPT_APP_FEASIBILITY.md
```

Expected: the document contains `Can`, `Could`, `Should`, and source links.

## Task 4: Changelog

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update the Unreleased section**

Add under `### Changed`:

```md
- **Overview and shell UI polish.** The dashboard shell now groups navigation by task area, and the Overview summary surface makes local evidence, cached/non-cache token states, and exact/estimated/unknown cost distinctions easier to scan.
- **ChatGPT app feasibility documented.** Added a recommendation to prototype only a private, redacted evidence-pack ChatGPT app workflow until public distribution can preserve TokenTrace's local-first privacy boundary.
```

- [ ] **Step 2: Inspect the changelog entry**

Run:

```bash
sed -n '1,60p' CHANGELOG.md
```

Expected: both bullets appear under `Unreleased`.

## Task 5: Full Verification

**Files:**
- Verify all files modified in Tasks 1 through 4.

- [ ] **Step 1: Run targeted tests**

Run:

```bash
npm test -- tests/navigation-active-state.test.tsx tests/sidebar-version.test.tsx tests/overview-layout-order.test.ts tests/metric-card-divider-alignment.test.ts tests/responsive-polish.test.ts tests/layout-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full project verification**

Run:

```bash
npm run verify
```

Expected: PASS for Vitest, `tsc --noEmit`, and ESLint.

- [ ] **Step 3: Run ProjScan doctor**

Run:

```bash
npm run projscan:doctor
```

Expected: command exits 0. Investigate any new UI-related issue before completion.

- [ ] **Step 4: Run visual smoke**

Run:

```bash
npm run visual:smoke
```

Expected: command exits 0 and does not report browser issue badges or layout failures.

- [ ] **Step 5: Review final diff**

Run:

```bash
git diff --stat
git diff -- components/sidebar.tsx app/page.tsx components/overview/summary-cards.tsx CHANGELOG.md docs/CHATGPT_APP_FEASIBILITY.md
```

Expected: the diff matches this plan and does not include version bumps, lockfile churn, release tags, or unrelated refactors.

## Self-Review

- Spec coverage: Tasks 1 and 2 cover shell grouping, Overview rhythm, state distinctions, mobile preservation, and evidence labels. Task 3 covers the added ChatGPT app feasibility request. Task 4 covers the changelog requirement. Task 5 covers verification.
- Placeholder scan: no unresolved placeholder markers.
- Type consistency: all test names, files, and component names match existing project files.
