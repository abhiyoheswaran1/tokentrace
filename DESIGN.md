---
name: TokenTrace CLI
description: Local-first AI CLI token, cost, and session analytics.
colors:
  warm-background: "#fcfaf8"
  ink-foreground: "#14181f"
  card-white: "#ffffff"
  primary-teal: "#147b74"
  secondary-orange: "#f2742c"
  muted-warm: "#efebe6"
  muted-ink: "#646a78"
  accent-yellow: "#fbd041"
  border-warm: "#ded7cf"
  destructive-red: "#d52020"
typography:
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  page: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary-teal}"
    textColor: "{colors.card-white}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
  card-standard:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink-foreground}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input-default:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  badge-secondary:
    backgroundColor: "{colors.muted-warm}"
    textColor: "{colors.muted-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
---

# Design System: TokenTrace CLI

## 1. Overview

**Creative North Star: "The Local Ledger"**

TokenTrace should feel like a well-kept local record of AI CLI activity: factual, compact, legible, and careful about provenance. The design serves investigation, not persuasion. Users should be able to scan totals, trends, parser confidence, source files, and pricing status without fighting decoration or wondering whether an estimate is being presented as fact.

The current system is a restrained product UI with a warm light background, white data surfaces, teal primary actions, orange secondary emphasis, and compact table/card layouts. It should preserve familiar dashboard patterns because consistency is an affordance for developers doing diagnostic work.

It explicitly rejects the anti-references in PRODUCT.md: crypto dashboards, generic SaaS analytics templates, dark observability wallboards, toy CLI demos, growth-marketing funnels, cloud surveillance aesthetics, neon palettes, purple-blue gradients, glassmorphism, inflated hero metrics, vague AI sparkle, and decorative complexity.

**Key Characteristics:**
- Local-first and evidence-forward.
- Compact cards, tables, charts, and filters with clear grouping.
- Warm neutral surfaces with restrained accent use.
- System typography, simple icons, and predictable controls.
- Confidence and uncertainty shown as first-class product states.

## 2. Colors

The palette is warm, restrained, and operational: tinted paper background, crisp white data surfaces, ink text, muted dividers, teal action, orange comparison, yellow selection, and conventional semantic status colors.

### Primary

- **Trace Teal** (#147b74): Primary actions, active affordances, trusted status icons, and the product mark. Use sparingly so it continues to read as an action or important state.

### Secondary

- **Cost Orange** (#f2742c): Secondary chart emphasis and pricing-related comparison. Do not let it compete with primary action color.

### Tertiary

- **Audit Yellow** (#fbd041): Text selection and rare attention states. Keep it behind text or small markers, not as a dominant surface.

### Neutral

- **Warm Background** (#fcfaf8): Page background. It keeps the product light without feeling sterile.
- **Card White** (#ffffff): Data surfaces, forms, tables, and the sidebar. Use on top of Warm Background, not as a full-page wash.
- **Ink Foreground** (#14181f): Primary text and high-confidence data.
- **Muted Warm** (#efebe6): Hover backgrounds, secondary badges, and grouped low-emphasis panels.
- **Muted Ink** (#646a78): Supporting copy, helper labels, and inactive navigation.
- **Warm Border** (#ded7cf): Dividers, table row boundaries, inputs, and cards.
- **Destructive Red** (#d52020): Destructive actions and error states.

### Named Rules

**The Accent Means State Rule.** Teal, orange, and yellow are for action, selection, chart distinction, or status. They are not decoration.

**The Warm Surface Rule.** The page background is warm and low-contrast. Data surfaces can be white, but avoid expanding pure white into the whole screen.

## 3. Typography

**Display Font:** System sans stack with native platform fallbacks.
**Body Font:** System sans stack with native platform fallbacks.
**Label/Mono Font:** System sans for labels; use the browser monospace stack only for file paths, JSON, command output, and raw diagnostic values.

**Character:** Typography is utilitarian and quiet. Hierarchy comes from weight, spacing, and position more than dramatic size changes.

### Hierarchy

- **Display** (not currently used): Avoid large marketing display type in product surfaces.
- **Headline** (600, 1.5rem, 1.25 line-height): Page titles such as Overview, Settings, Diagnostics, and Pricing.
- **Title** (600, 0.875rem, 1.35 line-height): Card titles, panel titles, and compact section headers.
- **Body** (400, 0.875rem, 1.5 line-height): Interface copy, table text, descriptions, form controls, and chart labels. Keep prose near 65-75ch when it becomes explanatory.
- **Label** (500, 0.75rem, 1.25 line-height): Table headers, badges, helper labels, small status details, and filter labels.

### Named Rules

**The Native Tool Rule.** Use the system font stack for product UI. TokenTrace should feel installed and local, not branded for a campaign.

**The Data First Rule.** Numeric values may be larger or heavier, but they must remain attached to labels and confidence context.

## 4. Elevation

TokenTrace is mostly flat. Depth is conveyed by tonal layering, borders, sticky navigation, and table row hover states rather than decorative shadows. Inputs use a subtle small shadow from Tailwind's `shadow-sm`; cards generally stay border-only at rest.

### Shadow Vocabulary

- **Input Low** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): Current input treatment. Use only to make editable controls perceptible on white card surfaces.

### Named Rules

**The Flat By Default Rule.** Surfaces are bordered and tonal, not floated. Add elevation only when a component must separate from overlapping content or express interaction state.

## 5. Components

### Buttons

- **Shape:** Rounded rectangle with medium radius (6px).
- **Primary:** Trace Teal background, white text, 36px height, 12px horizontal padding, 14px system text, medium weight.
- **Hover / Focus:** Hover darkens through opacity. Focus uses a 2px Trace Teal ring through the shared ring token.
- **Secondary / Outline / Ghost:** Secondary uses Cost Orange only for intentional emphasis. Outline uses white/card background with a border. Ghost is reserved for low-commitment navigation or inline utilities.

### Chips

- **Style:** Badges use 6px radius, 12px label text, medium weight, and compact 2px by 8px padding.
- **State:** Secondary badges use Muted Warm and Muted Ink. Success, warning, and destructive badges use conventional green, amber, and red with both color and text labels.

### Cards / Containers

- **Corner Style:** Large radius (8px).
- **Background:** Card White on Warm Background.
- **Shadow Strategy:** Border-only at rest. Avoid nested card stacks.
- **Border:** Warm Border, 1px.
- **Internal Padding:** 16px default. Dense metric blocks can use 12px. Distinct page sections should separate with 24px or more.

### Inputs / Fields

- **Style:** 36px height, 6px radius, white/card background, 1px Warm Border, 12px horizontal padding, 14px text.
- **Focus:** 2px Trace Teal focus ring. Keep focus visible on keyboard navigation.
- **Error / Disabled:** Disabled uses opacity and cursor treatment. Error states should add explicit text, not only red color.

### Navigation

- **Desktop:** Sticky left sidebar, 256px width, Card White background, Warm Border divider, compact icon plus label links. Links use Muted Ink by default and shift to Muted Warm background with Ink text on hover.
- **Mobile:** Horizontal scroll navigation below the mobile header. Items stay compact, bordered, and horizontally scrollable rather than wrapping into tall stacks.
- **Active State:** Future active navigation should use Trace Teal or a muted selected background with clear text contrast. Avoid large colored side stripes.

### Tables

- **Style:** Full-width 14px text, 12px cell padding, 40px header height, Warm Border row dividers, Muted Ink header text, and Muted Warm hover backgrounds.
- **Overflow:** Dense diagnostic tables may scroll horizontally. Preserve file paths and JSON snippets with monospace styling and truncation or wrapping based on the page.

### Charts

- **Style:** Recharts-based charts should use restrained color: Trace Teal for primary token usage and Cost Orange for cost. Chart containers should sit inside standard cards and use clear titles and descriptions.

## 6. Do's and Don'ts

### Do:

- **Do** keep product surfaces compact, structured, and evidence-forward.
- **Do** use Trace Teal (#147b74) for primary actions, active states, and trusted indicators.
- **Do** use Cost Orange (#f2742c) only for secondary emphasis, especially pricing or cost comparison.
- **Do** group related controls with 8-12px gaps and separate major sections with 24-32px gaps.
- **Do** label exact, estimated, unknown, cached, and non-cache values directly.
- **Do** preserve table accessibility, keyboard focus, and visible focus rings.
- **Do** use bordered, flat cards with 8px radius and 16px padding for distinct data surfaces.

### Don't:

- **Don't** make TokenTrace look like a crypto dashboard, generic SaaS analytics template, dark observability wallboard, toy CLI demo, growth-marketing funnel, or cloud surveillance product.
- **Don't** use neon palettes, purple-blue gradients, glassmorphism, inflated hero metrics, vague AI sparkle, or decorative complexity.
- **Don't** rely on color alone for status, confidence, scan health, parser failures, or pricing unknowns.
- **Don't** use colored side-stripe borders greater than 1px on cards, list items, callouts, or alerts.
- **Don't** nest cards inside cards. Use spacing, dividers, typography, and grouped rows instead.
- **Don't** center dense dashboard content by default. Product pages should favor predictable left alignment and clear grids.
- **Don't** hide uncertainty. If data is estimated or unknown, say so near the number.
