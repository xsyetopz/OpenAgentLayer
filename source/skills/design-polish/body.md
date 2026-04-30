# Design Polish

Raise frontend, UI, and UX work above generic AI defaults.

This skill exists for one job: take bland, template-looking output and make it intentional, readable, and product-shaped without drifting into unrelated refactors.

## Use When

- the layout looks like default AI dashboard sludge
- spacing, hierarchy, and typography feel arbitrary
- motion, color, or component choices are flashy but not useful
- frontend code is technically correct but visually weak
- a UI needs polish, not a framework rewrite

## Core Rule

Pick a clear design direction and commit to it.

Do not pile on decorative tricks to fake taste.

## What Good Looks Like

- clear hierarchy before decoration
- predictable layout with strong alignment
- consistent spacing scale
- typography that carries structure, not filler labels
- components that look like they belong to one system
- motion used for state and flow, not attention-seeking
- color used to clarify importance, not to signal “premium AI app”

## Hard No

- floating glass shells as default language
- random gradients, glows, blur haze, or conic gimmicks
- hero-section cosplay inside product surfaces
- metric-card spam as the first layout instinct
- oversized border radii everywhere
- filler copy that explains what the interface already shows
- fake charts, fake activity, fake percentages, fake statuses
- mixed visual languages in one screen
- generic dark SaaS palette with cyan accents unless the product already uses it

## Frontend Discipline

- Preserve the product's existing design system when one exists.
- If there is no strong system, build one small consistent set of rules for spacing, type, color, radius, borders, and motion.
- Prefer editing existing components over adding sidecar one-off variants.
- If a screen has multiple problems, fix structure first, then type, then spacing, then color, then motion.
- Avoid “creative” layout choices that make implementation harder to reason about than the product needs.

## Output Discipline

- Name the design direction in one line.
- Name the main visual problems before editing.
- Make the smallest set of changes that produces a coherent result.
- Keep code production-grade. No demo-only filler, fake data theater, or decorative placeholder sections.
