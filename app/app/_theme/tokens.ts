/**
 * besayfe Design System — Token Layer
 *
 * Single source of truth for all visual decisions.
 * Every hardcoded hex in the codebase should resolve to one of these tokens.
 *
 * Layer order (innermost → outermost):
 *   Primitive → Semantic → Component
 *
 * Primitives: raw values, never used directly in components.
 * Semantic:   named by purpose ("what it does"), references a primitive.
 * Component:  specific overrides per component type (rarely needed).
 */

// ─── Primitive Palette ───────────────────────────────────────────────────────

export const palette = {
  // Brand greens
  green50:  '#E3EEE6',  // light fill / hover tint
  green100: '#C7DEC9',
  green400: '#73AC84',  // Accent Green — primary brand colour
  green600: '#5C6D62',  // hover / pressed state for primary interactive
  green900: '#1F2A22',  // near-black with green tint — used in dark mode surfaces

  // Neutrals
  white:    '#FFFFFF',
  gray50:   '#F7F8F7',  // page background (slightly warm-green tint, not cold gray)
  gray100:  '#ECEEED',  // dividers, separators
  gray200:  '#D5D8D6',  // borders
  gray300:  '#B0B5B2',  // disabled text, placeholder
  gray500:  '#6B7280',  // secondary text (was #6B6B6B — 4.6:1 ✓ WCAG AA)
  gray700:  '#374151',  // primary text (warmer than pure black — less harsh)
  gray900:  '#111827',  // headings, maximum contrast text
  black:    '#000000',

  // Risk — semantic colours for allergen severity
  // These are the ONLY colours in the app that carry safety meaning.
  // They must never be reused for decorative purposes.
  dangerRed:    '#B42318',  // "Contains" — immediate risk. Contrast on white: 5.94:1 ✓ WCAG AA
  dangerRedBg:  '#FEF3F2',  // "Contains" section background tint
  dangerRedBorder: '#FECDCA', // "Contains" border

  warningAmber:    '#92400E',  // "May Contain" — cross-contamination. 7.0:1 on white ✓ WCAG AA
  warningAmberMid: '#D97706',  // icon/bullet for may-contain (4.53:1 on white ✓ WCAG AA)
  warningAmberBg:  '#FFFBEB',  // "May Contain" section background tint
  warningAmberBorder: '#FDE68A',

  safeBg:    '#ECFDF5',  // "No allergens" state background
  safeBorder:'#A7F3D0',

  unknownBg:    '#FFFBEB', // "Data not available" — reuses amber scale
  unknownBorder:'#FDE68A',
} as const;

// ─── Semantic Tokens — Light Mode ────────────────────────────────────────────

export const light = {
  // Surfaces
  background:        palette.gray50,
  surface:           palette.white,
  surfaceElevated:   palette.white,
  surfaceSubtle:     palette.green50,

  // Borders
  borderDefault:     palette.gray100,
  borderStrong:      palette.gray200,

  // Text
  textPrimary:       palette.gray900,
  textSecondary:     palette.gray500,
  textTertiary:      palette.gray300,
  textInverse:       palette.white,
  textOnBrand:       palette.white,   // text on green backgrounds

  // Brand interactive
  brandPrimary:      palette.green400,
  brandHover:        palette.green600,
  brandSubtle:       palette.green50,  // chip/badge fill
  brandSubtleText:   palette.green600, // text on green chip fill

  // Navigation
  navActive:         palette.green400,
  navInactive:       palette.gray300,
  headerBg:          palette.white,
  headerText:        palette.gray900,

  // Risk — allergen severity (DO NOT REPURPOSE)
  riskHighFill:      palette.dangerRedBg,
  riskHighBorder:    palette.dangerRedBorder,
  riskHighText:      palette.dangerRed,
  riskHighAccent:    palette.dangerRed,     // icon, dot, chip bg

  riskMedFill:       palette.warningAmberBg,
  riskMedBorder:     palette.warningAmberBorder,
  riskMedText:       palette.warningAmber,
  riskMedAccent:     palette.warningAmberMid,

  riskSafeFill:      palette.safeBg,
  riskSafeBorder:    palette.safeBorder,
  riskSafeText:      palette.green600,
  riskSafeAccent:    palette.green400,

  riskUnknownFill:   palette.unknownBg,
  riskUnknownBorder: palette.unknownBorder,
  riskUnknownText:   palette.warningAmber,
  riskUnknownAccent: palette.warningAmberMid,

  // States
  pressedOverlay:    'rgba(0,0,0,0.04)',
  ripple:            'rgba(0,0,0,0.06)',

  // Status bar
  statusBar: 'dark' as const,
} as const;

export const dark = {
  // Surfaces
  background:        '#0F1710',         // near-black with green warmth
  surface:           '#1C2B1F',         // card surface
  surfaceElevated:   '#243529',
  surfaceSubtle:     palette.green900,

  // Borders
  borderDefault:     '#2D3F30',
  borderStrong:      '#3D5442',

  // Text
  textPrimary:       '#F0F7F1',
  textSecondary:     '#9AB09E',
  textTertiary:      '#5C7A61',
  textInverse:       palette.gray900,
  textOnBrand:       palette.white,

  // Brand interactive
  brandPrimary:      palette.green400,   // green reads well on dark surfaces
  brandHover:        '#8FC49F',          // lighter green for dark hover
  brandSubtle:       '#253B29',
  brandSubtleText:   '#8FC49F',

  // Navigation
  navActive:         palette.green400,
  navInactive:       '#4D6651',
  headerBg:          '#1C2B1F',
  headerText:        '#F0F7F1',

  // Risk — same semantic meaning, adjusted for dark surfaces
  riskHighFill:      '#3B1513',
  riskHighBorder:    '#7B2020',
  riskHighText:      '#FCA5A5',
  riskHighAccent:    '#EF4444',

  riskMedFill:       '#3B2D0F',
  riskMedBorder:     '#92400E',
  riskMedText:       '#FCD34D',
  riskMedAccent:     '#F59E0B',

  riskSafeFill:      '#0F2B1B',
  riskSafeBorder:    '#166534',
  riskSafeText:      '#6EE7B7',
  riskSafeAccent:    '#34D399',

  riskUnknownFill:   '#3B2D0F',
  riskUnknownBorder: '#92400E',
  riskUnknownText:   '#FCD34D',
  riskUnknownAccent: '#F59E0B',

  // States
  pressedOverlay:    'rgba(255,255,255,0.06)',
  ripple:            'rgba(255,255,255,0.08)',

  statusBar: 'light' as const,
} as const;

export type Theme = typeof light;

// ─── Typography Scale ─────────────────────────────────────────────────────────
// System fonts only — SF Pro on iOS, Roboto on Android.
// Weights map directly to what the OS ships; avoid 800/900 on Android.

export const typography = {
  // Page-level headings (Home "besayfe" large title)
  h1: {
    fontSize: 34,        // iOS large title canonical size
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 41,
  },
  // Section titles within screens (dish name on detail)
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  // Card titles (restaurant name, dish name in list)
  h3: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
    lineHeight: 22,
  },
  // List section labels (category headers)
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    lineHeight: 16,
    textTransform: 'uppercase' as const,
  },
  // Body text (ingredients, detail descriptions)
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 22,
  },
  // Secondary body (Portuguese allergen name, metadata)
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 18,
  },
  // Allergen names — need prominence on the detail screen
  allergenName: {
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 20,
  },
  // Chip / badge text
  chip: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
    lineHeight: 16,
  },
  // Count labels (dish count, "+3" overflow)
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0,
    lineHeight: 16,
  },
} as const;

// ─── Spacing Scale (4px base) ─────────────────────────────────────────────────

export const space = {
  px:   1,
  xs:   4,
  sm:   8,
  md:  12,
  base:16,
  lg:  20,
  xl:  24,
  '2xl':32,
  '3xl':48,
} as const;

// ─── Radius Scale ─────────────────────────────────────────────────────────────

export const radius = {
  sm:   4,    // chips / badges
  md:   8,    // small interactive elements
  lg:  12,    // cards (standard)
  xl:  16,    // hero card / dialog
  full:9999,  // pill / avatar
} as const;

// ─── Elevation / Shadow (iOS-style, cross-platform) ──────────────────────────

export const shadow = {
  none: {},
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,   // Android
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,   // Android
  },
} as const;
