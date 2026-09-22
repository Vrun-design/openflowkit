/** Application chrome only. Never serialize these roles as authored document styles. */
export const foundation = {
  brand: '#e95420',
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { control: 8, surface: 12, panel: 16 },
  type: { caption: 11, label: 13, body: 14, title: 18, display: 24 },
  control: { compact: 36, regular: 40, touch: 44, icon: 18 },
  focus: { width: 2, offset: 3 },
  weight: { body: 400, label: 500, emphasis: 600 },
  leading: { compact: 1.25, body: 1.5 },
  layer: {
    canvas: 0,
    toolbar: 10,
    feedback: 20,
    panel: 30,
    /** Selection context bar: above side panels, below menus/popovers. */
    context: 35,
    menu: 40,
    dialog: 50,
    toast: 60,
    tooltip: 70,
  },
  layout: {
    edgeInset: 16,
    /** Clearance from the viewport top for side panels: reserves the top toolbar lane. */
    topLane: 72,
    panelWidth: 320,
    panelMaxWidth: 400,
    contextGap: 12,
  },
  canvas: { handle: 8, pointerTarget: 24, touchTarget: 44, stroke: 1.5, fitPadding: 64 },
  motion: {
    immediate: 0,
    exit: 120,
    feedback: 150,
    navigation: 180,
    /** Camera glides: drill-down and flow playback. */
    camera: 280,
    reveal: 220,
    settle: 240,
    tooltipDelay: 500,
    toastDuration: 5000,
  },
  /** Default curve (emphasized decelerate). Use `curve` for enter/exit/move pairs. */
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  curve: {
    enter: 'cubic-bezier(0, 0, 0.2, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
  /** Floating chrome over the canvas: blur radius and translucency. Opaque fallback in CSS. */
  material: { blur: 16, saturate: 1.4 },
  font: 'Inter, ui-sans-serif, system-ui, sans-serif',
  mono: '"Google Sans Code", ui-monospace, monospace',
} as const;

// Shared sRGB values keep DOM/Pixi feedback identical; neutrals have a warm tint.
// The brand seed is not a normal-text foreground or a white-text button background.
export const lightColors = {
  canvas: '#f7f7f5',
  surface: '#fdfdfb',
  raised: '#efefec',
  text: '#252724',
  secondary: '#535750',
  muted: '#62665f',
  disabled: '#72766e',
  border: '#dedfd9',
  controlBorder: '#858a80',
  accent: '#b63e14',
  accentHover: '#99330f',
  accentSoft: '#fce9df',
  /** Brand seed as the single primary action. 3.1:1 with white: an accepted brand exception for one bold CTA. */
  primary: '#e95420',
  primaryHover: '#d64a1a',
  onPrimary: '#ffffff',
  /** Selected chrome is inverse neutral, never orange; orange is reserved for canvas selection and the CTA. */
  inverse: '#252724',
  onInverse: '#fdfdfb',
  onAccent: '#fdfdfb',
  focus: '#b63e14',
  selection: '#b63e14',
  info: '#275c9b',
  infoSoft: '#e8f0fa',
  success: '#286340',
  successSoft: '#e7f2e9',
  warning: '#805800',
  warningSoft: '#faf0d5',
  danger: '#aa3033',
  dangerSoft: '#fbe9e8',
} as const;
export type ColorRole = keyof typeof lightColors;
export type ThemeColors = Readonly<Record<ColorRole, string>>;
export type Appearance = 'light' | 'dark';
export const darkColors: ThemeColors = {
  canvas: '#191b19',
  surface: '#232622',
  raised: '#2e322c',
  text: '#f1f2ec',
  secondary: '#c1c6ba',
  muted: '#a3ab9c',
  disabled: '#929b8a',
  border: '#41483c',
  controlBorder: '#7f8977',
  accent: '#ffb18e',
  accentHover: '#ffc6ad',
  accentSoft: '#482b20',
  primary: '#e95420',
  primaryHover: '#f26a3a',
  onPrimary: '#ffffff',
  inverse: '#f1f2ec',
  onInverse: '#191b19',
  onAccent: '#301b12',
  focus: '#ffb18e',
  selection: '#ffb18e',
  info: '#a6caff',
  infoSoft: '#20364d',
  success: '#a0d6ae',
  successSoft: '#203c29',
  warning: '#e6c976',
  warningSoft: '#3d341b',
  danger: '#ffb1af',
  dangerSoft: '#492929',
};
export const themes: Readonly<Record<Appearance, ThemeColors>> = {
  light: lightColors,
  dark: darkColors,
};

/** For Pixi adapters; no DOM/computed-style lookup in the render loop. */
export function rendererColor(theme: Appearance, role: ColorRole): number {
  return Number.parseInt(themes[theme][role].slice(1), 16);
}

/** Elevation and glass per theme. Shadows are stronger in dark mode to remain visible. */
export const materials: Readonly<
  Record<
    Appearance,
    Readonly<{
      glass: string;
      glassBorder: string;
      scrim: string;
      shadowRaised: string;
      /** Persistent canvas chrome (toolbars, rails, context bar): tight, low spread. */
      shadowChrome: string;
      /** Transient layers (menus, popovers): lifted. */
      shadowFloating: string;
      shadowOverlay: string;
    }>
  >
> = {
  light: {
    glass: 'rgb(253 253 251 / 0.82)',
    glassBorder: 'rgb(37 39 36 / 0.08)',
    scrim: 'rgb(37 39 36 / 0.32)',
    shadowRaised: '0 1px 2px rgb(37 39 36 / 0.06), 0 1px 1px rgb(37 39 36 / 0.04)',
    shadowChrome: '0 1px 2px rgb(37 39 36 / 0.05), 0 2px 8px rgb(37 39 36 / 0.05)',
    shadowFloating: '0 1px 2px rgb(37 39 36 / 0.05), 0 6px 16px rgb(37 39 36 / 0.07)',
    shadowOverlay: '0 2px 4px rgb(37 39 36 / 0.06), 0 16px 40px rgb(37 39 36 / 0.12)',
  },
  dark: {
    glass: 'rgb(35 38 34 / 0.8)',
    glassBorder: 'rgb(241 242 236 / 0.1)',
    scrim: 'rgb(0 0 0 / 0.5)',
    shadowRaised: '0 1px 2px rgb(0 0 0 / 0.3)',
    shadowChrome: '0 1px 2px rgb(0 0 0 / 0.25), 0 2px 8px rgb(0 0 0 / 0.2)',
    shadowFloating: '0 1px 2px rgb(0 0 0 / 0.25), 0 6px 16px rgb(0 0 0 / 0.3)',
    shadowOverlay: '0 2px 4px rgb(0 0 0 / 0.3), 0 16px 40px rgb(0 0 0 / 0.4)',
  },
};
