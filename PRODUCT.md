# Product

## Register

product

## Users

TokenTrace is for developers, AI tooling power users, open source maintainers, and local-first teams who use AI CLI tools such as Claude Code and Codex on their own machines. They use the product while trying to understand where token usage, cost, model selection, sessions, parser confidence, and local ingestion behavior are coming from.

The user context is practical and investigative: a developer has local CLI logs, wants evidence about usage and cost, and needs enough detail to trust the numbers without sending private prompts, file paths, or usage history to a cloud analytics service.

## Product Purpose

TokenTrace scans local AI CLI artifacts, normalizes token usage, estimates missing counts where necessary, prices interactions with editable model pricing, and presents the result in a browser dashboard. It exists to make AI CLI usage observable without adding cloud telemetry, traffic interception, proxying, or account setup.

Success means a user can run the CLI, scan local files, understand token and cost patterns, inspect parser confidence, identify unknown or estimated values, and make better decisions about model use, caching, and project-level spend. The interface should make local processing and data provenance obvious.

## Brand Personality

Quiet, precise, trustworthy.

The product should feel like a serious developer utility: calm enough for repeated use, dense enough for real diagnostics, and transparent about uncertainty. It should not over-sell estimates as facts. The tone is direct, technical, and privacy-respecting.

## Anti-references

TokenTrace should not feel like a crypto dashboard, generic SaaS analytics template, dark observability wallboard, toy CLI demo, growth-marketing funnel, or cloud surveillance product. Avoid neon palettes, purple-blue gradients, glassmorphism, inflated hero metrics, vague AI sparkle, and decorative complexity that weakens trust.

## Design Principles

1. Local proof before spectacle. Show where data came from, how it was interpreted, and what remains uncertain.
2. Separate facts from estimates. Exact, estimated, unknown, cached, and non-cache values must stay visually and semantically distinct.
3. Dense, but not cramped. TokenTrace is an operational tool, so tables, filters, charts, and summaries can be compact when grouping and spacing stay clear.
4. Privacy is a product feature. The UI should consistently reinforce local processing, no telemetry, and raw-content restraint without turning those claims into marketing copy.
5. Favor repairable systems. Parser diagnostics, pricing configuration, and scan health should help users fix bad inputs or incomplete data rather than merely report failure.

## Accessibility & Inclusion

Target WCAG AA for contrast, keyboard navigation, focus visibility, labels, and table semantics. Do not rely on color alone for status or confidence. Respect reduced-motion preferences. Keep touch and click targets usable on mobile, preserve horizontal scrolling for dense tables, and make uncertainty language readable for users who are not pricing or parser specialists.
