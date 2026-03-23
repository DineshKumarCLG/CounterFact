---
description: UX and design system audit — validates accessibility, responsiveness, interaction patterns, and design trend alignment
---

# UX & Design System Audit Workflow

Performs a thorough review of a product's design system and UX specifications.

## Step 1 — Accessibility Audit
1. Check all colour combinations for WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text)
2. Identify any reliance on colour alone for conveying information
3. Check for keyboard navigation specifications
4. Check for screen reader / ARIA support
5. Check for `prefers-reduced-motion` support
6. Search for accessibility requirements in the product's target markets

## Step 2 — Responsive Design Check
7. Verify that all UI components have mobile breakpoint specifications
8. Identify components that are inherently desktop-only (e.g., multi-column layouts, complex data visualisations)
9. Propose mobile-specific alternatives for desktop-only components
10. Check for touch target sizes (minimum 44x44 CSS pixels per WCAG)

## Step 3 — State Coverage
11. For each UI component, verify these states are defined:
    - Default / idle
    - Hover / focus
    - Active / pressed
    - Loading / skeleton
    - Error
    - Empty
    - Disabled
    - Success / complete

## Step 4 — Design Trend Validation
12. Search for the design trends referenced in the PDR (e.g., "brutalism", "monospaced authenticity")
13. Verify these trends are current and relevant to the target audience
14. Identify any trend risks (trends that may age poorly)

## Step 5 — Information Architecture
15. Validate the screen flow for completeness — are there missing screens?
16. Check navigation patterns (breadcrumbs, back buttons, deep linking)
17. Verify onboarding flow exists for first-time users
18. Check for error recovery flows (what does the user do when something fails?)

## Step 6 — Typography & Colour System
19. Validate that the font choices are:
    - Available on Google Fonts or self-hostable
    - Performant (font loading strategy defined)
    - Legible at all specified sizes
20. Check colour system completeness — are there tokens for all possible UI states?
