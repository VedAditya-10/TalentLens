---
name: Aura Recruit OS
colors:
  surface: '#0A0A0A'
  surface-dim: '#1c110b'
  surface-bright: '#45362f'
  surface-container-lowest: '#160c06'
  surface-container-low: '#251913'
  surface-container: '#291d16'
  surface-container-high: '#352720'
  surface-container-highest: '#40322a'
  on-surface: '#f6ded3'
  on-surface-variant: '#e0c0b1'
  inverse-surface: '#f6ded3'
  inverse-on-surface: '#3c2d26'
  outline: '#a78b7d'
  outline-variant: '#584237'
  surface-tint: '#ffb690'
  primary: '#ffb690'
  on-primary: '#552100'
  primary-container: '#f97316'
  on-primary-container: '#582200'
  inverse-primary: '#9d4300'
  secondary: '#c6c6cf'
  on-secondary: '#2f3037'
  secondary-container: '#45464e'
  on-secondary-container: '#b4b4bd'
  tertiary: '#93ccff'
  on-tertiary: '#003351'
  tertiary-container: '#00a2f4'
  on-tertiary-container: '#003554'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbca'
  primary-fixed-dim: '#ffb690'
  on-primary-fixed: '#341100'
  on-primary-fixed-variant: '#783200'
  secondary-fixed: '#e2e1eb'
  secondary-fixed-dim: '#c6c6cf'
  on-secondary-fixed: '#1a1b22'
  on-secondary-fixed-variant: '#45464e'
  tertiary-fixed: '#cde5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d32'
  on-tertiary-fixed-variant: '#004b74'
  background: '#1c110b'
  on-background: '#f6ded3'
  surface-variant: '#40322a'
  surface-elevated: '#111111'
  surface-highlight: '#18181B'
  border-subtle: '#27272A'
  on-surface-muted: '#e0c0b1'
typography:
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '800'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-xs:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 12px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  gutter: 12px
  sidebar-width: 240px
  inspector-width: 320px
---

## Brand & Style
Aura Recruit OS is a high-performance talent acquisition platform designed for elite recruiters and headhunters. The brand personality is **Technical, Authoritative, and Obsidian**. It leverages a "Command Center" aesthetic that prioritizes information density and precision over empty whitespace.

The design style is a hybrid of **Minimalism and High-Contrast Dark Mode**, featuring deep blacks, sharp accents of safety orange, and subtle borders. It evokes the feeling of a premium developer tool—focused, efficient, and sophisticated—where the recruiter is the "operator" of a complex data engine.

## Colors
The palette is centered on an **Obsidian Foundation** with a high-energy **Fidelity Orange** accent. 

- **Primary (#f97316):** Used sparingly for interactive states, key rankings, and brand presence. It acts as a "signal" in the dark environment.
- **Surface Strategy:** We use a monochromatic stack of deep grays and blacks. `#0A0A0A` serves as the base, while `#111111` and `#18181B` are used to define distinct functional zones like sidebars and active rows.
- **Semantic Colors:** Statuses use muted versions of standard tones (e.g., orange-tinted backgrounds for "Top Candidate") to maintain the moody, sophisticated aesthetic without introducing a chaotic rainbow of colors.

## Typography
The system uses **Inter** exclusively to lean into its utilitarian and legible characteristics. 

- **Contrast through Weight:** We achieve hierarchy through weight (Black 900 for brand, Bold 700 for names) and case (Uppercase for headers and labels) rather than significant size shifts.
- **Data Density:** Body and label sizes are intentionally small (10px–13px) to maximize the amount of information visible on a single screen without sacrificing legibility.
- **Tracking:** Wider letter spacing is applied to uppercase labels to improve scanability in data-heavy tables.

## Layout & Spacing
The layout uses a **Tri-Pane Architecture**:
1. **Side Navigation:** Fixed-width (240px) collapsed or persistent panel for system-level routing.
2. **Main Workspace:** A fluid center area containing the primary data table and filters.
3. **Detail Inspector:** A fixed-width (320px) right-aligned drawer for deep-dive analysis.

The system follows a **4px base grid**. Table cells use `12px` (md) padding for high density, while containers use `24px` (xl) margins to provide structural breathing room. The layout is optimized for desktop widescreen usage where horizontal space is abundant.

## Elevation & Depth
Depth is created through **Tonal Layering and Borders** rather than traditional shadows.

- **Layering:** The background is the darkest layer (#0A). UI panels (Sidebar, Inspector) are slightly lighter (#11). Content highlights or active states are the lightest (#18).
- **Subtle Borders:** All panels and components are separated by 1px solid borders in `#27272A`. This "Ghost Border" technique ensures sharp definition in dark mode.
- **Interaction Glow:** A subtle, low-opacity orange outer glow (`rgba(249, 115, 22, 0.15)`) is used exclusively for the #1 ranked candidate to denote special status.

## Shapes
The shape language is **Structured and Geometric**. 

- **Standard Elements:** Most containers, input fields, and chips use a `2px` (Soft) radius to maintain a professional, slightly technical edge.
- **Status Pills:** Smaller tags and status indicators use a `4px` radius to distinguish them from structural elements.
- **Avatars:** User profiles use a `4px` soft square or `Full` circle depending on context, though the primary candidate view prefers a soft square for a more "profile card" feel.

## Components
- **Data Tables:** Sticky headers with a `1px` border-bottom. Active rows are marked with a `2px` left border in `primary`. Hover states transition background color to `#111111`.
- **Filter Chips:** Small, rectangular buttons with a dark background and subtle border. They include an chevron icon to indicate a dropdown menu.
- **Primary Buttons:** High-contrast containers with `primary-container` backgrounds and dark text. Square or slightly rounded.
- **Action Bar:** A floating, pill-shaped persistent bar at the bottom of the screen for multi-select actions, featuring a distinct border and heavy shadow to indicate it is on the highest Z-index.
- **Visual Meters:** Simple 1px or 4px tall bars for "Match Breakdown" scores, using `primary` for the filled state and `surface-highlight` for the track.
- **Inputs:** Minimalist styles with `surface-container-lowest` background and `outline-variant` borders that glow `primary` on focus.