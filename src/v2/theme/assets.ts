/**
 * Asset registry for the Terraria-style UI.
 *
 * Every pixel of artwork is **referenced at runtime** — none of it is drawn
 * by hand in this repo, and none of it is bundled. Two independent sources:
 *
 *   chrome — the official Terraria site's UI images (panel pieces, the
 *            pixel-grass edge, the wooden title plate, the nav button, the
 *            logo). These are Re-Logic's; the browser fetches them from
 *            terraria.org the same way it would when visiting the site.
 *            Nothing is redistributed here.
 *
 *   icons  — @halfmage/pixelarticons (MIT), served from jsDelivr. Its SVGs
 *            use `fill="currentColor"`, so they are tinted with a CSS mask
 *            instead of being recoloured per file.
 *
 * Caveat worth knowing: terraria.org's filenames are content-hashed
 * (`fade_in.84ea52c8.jpg`), so they break whenever Re-Logic redeploys. Both
 * bases are therefore overridable — point `chromeBase` at a local mirror to
 * stop depending on their site.
 */

/** Canonical icon names used across the v2 UI. */
export type TerIconName =
  | 'dashboard'
  | 'worlds'
  | 'players'
  | 'console'
  | 'operations'
  | 'settings'
  | 'server'
  | 'restart'
  | 'power'
  | 'save'
  | 'sun'
  | 'moon'
  | 'upload'
  | 'download'
  | 'trash'
  | 'refresh'
  | 'lock'
  | 'check'
  | 'cross'
  | 'warning'
  | 'info'
  | 'play'
  | 'heart'
  | 'eye'
  | 'clock'
  | 'search'
  | 'bell'

/** pixelarticons file stems, verified to exist on the CDN. */
export const ICON_STEMS: Record<TerIconName, string> = {
  dashboard: 'blocks-sharp',
  worlds: 'globe',
  players: 'users-sharp',
  console: 'terminal-sharp',
  operations: 'shield-sharp',
  settings: 'settings-2-sharp',
  server: 'server-sharp',
  restart: 'reload-sharp',
  power: 'power',
  save: 'save-sharp',
  sun: 'sun',
  moon: 'moon',
  upload: 'upload-sharp',
  download: 'download-sharp',
  trash: 'trash-sharp',
  refresh: 'refresh-sharp',
  lock: 'lock-sharp',
  check: 'check',
  cross: 'close',
  warning: 'square-alert-sharp',
  info: 'info-box-sharp',
  play: 'play',
  heart: 'heart',
  eye: 'eye',
  clock: 'clock',
  search: 'search',
  bell: 'bell-sharp',
}

export const DEFAULT_CHROME_BASE = 'https://terraria.org/static/media'
/**
 * Pinned to a release, not `@master`: the icons are fetched per render, and
 * a moving branch can change or drop a file with no change on our side.
 * (jsDelivr serves this from cache for a week, so a bump is also a perf
 * decision, not just correctness.)
 */
export const PIXELARTICONS_VERSION = '2.4.1'
export const PIXELARTICONS_TEMPLATE =
  `https://cdn.jsdelivr.net/gh/halfmage/pixelarticons@${PIXELARTICONS_VERSION}/svg/{name}.svg`

/**
 * Chrome slots → official filenames. The hashes are part of the name; they
 * change when Re-Logic redeploys, which is why `chromeBase` is configurable.
 */
export const CHROME_FILES = {
  background: 'background.ea292d81.jpg',
  panelTop: 'fade_in.84ea52c8.jpg',
  panelMiddle: 'middle.12ac987e.jpg',
  panelBottom: 'fade_out_dark.c2374b3f.png',
  grass: 'wall_top_grass.e8d5ebf5.png',
  titlePlate: 'title.eb096681.jpg',
  navItem: 'buy_bar.84cec77d.png',
  divider: 'dividerfancy.182a2424.png',
  separator: 'separator-desktop.97294121.png',
  logo: 'logo.734118ae.png',
} as const

export type ChromeSlot = keyof typeof CHROME_FILES

/** Intrinsic sizes, so the pieces can be laid out without distortion. */
export const CHROME_SIZE: Record<ChromeSlot, { w: number; h: number }> = {
  background: { w: 1920, h: 1016 },
  panelTop: { w: 970, h: 138 },
  panelMiddle: { w: 970, h: 236 },
  panelBottom: { w: 970, h: 106 },
  grass: { w: 970, h: 13 },
  titlePlate: { w: 970, h: 44 },
  navItem: { w: 168, h: 56 },
  divider: { w: 564, h: 59 },
  separator: { w: 970, h: 52 },
  logo: { w: 421, h: 140 },
}

export type ChromeSource = 'official' | 'custom'
export type IconSource = 'pixelarticons' | 'custom'

export interface AssetSettings {
  /**
   * Which source is *selected*. Kept separate from the URL on purpose:
   * deriving it from the value made "custom" mean "the URL is empty", so
   * clicking that option blanked every image and then silently reverted on
   * reload.
   */
  chromeSource: ChromeSource
  /** Base URL serving the files named in `CHROME_FILES`. */
  chromeBase: string
  iconSource: IconSource
  /** Icon URL template; `{name}` is replaced with the mapped stem. */
  iconTemplate: string
}

export const DEFAULT_ASSETS: AssetSettings = {
  chromeSource: 'official',
  chromeBase: DEFAULT_CHROME_BASE,
  iconSource: 'pixelarticons',
  iconTemplate: PIXELARTICONS_TEMPLATE,
}

const CHROME_SOURCES: readonly ChromeSource[] = ['official', 'custom']
const ICON_SOURCES: readonly IconSource[] = ['pixelarticons', 'custom']

const STORAGE_KEY = 'terraria-panel.v2.assets.v2'

function pickSource<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === 'string' &&
    (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

function pickUrl(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

export function loadAssetSettings(): AssetSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return DEFAULT_ASSETS
    }

    const parsed = JSON.parse(raw) as Partial<AssetSettings>

    return {
      chromeSource: pickSource(parsed.chromeSource, CHROME_SOURCES, 'official'),
      chromeBase: pickUrl(parsed.chromeBase, DEFAULT_ASSETS.chromeBase),
      iconSource: pickSource(parsed.iconSource, ICON_SOURCES, 'pixelarticons'),
      iconTemplate: pickUrl(
        parsed.iconTemplate,
        DEFAULT_ASSETS.iconTemplate,
      ),
    }
  } catch {
    return DEFAULT_ASSETS
  }
}

export function saveAssetSettings(settings: AssetSettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Private browsing / quota: the choice just will not persist.
  }
}

/**
 * The URL actually used for a slot. An empty base or an icon template
 * without `{name}` would otherwise turn into a same-origin request for
 * `/background….jpg` (or a `url("")` mask that hides every icon), so both
 * fall back to the default rather than breaking the page.
 */
export function effectiveChromeBase(settings: AssetSettings) {
  if (settings.chromeSource === 'official') {
    return DEFAULT_ASSETS.chromeBase
  }

  return settings.chromeBase.trim() || DEFAULT_ASSETS.chromeBase
}

export function effectiveIconTemplate(settings: AssetSettings) {
  if (settings.iconSource === 'pixelarticons') {
    return DEFAULT_ASSETS.iconTemplate
  }

  return settings.iconTemplate.trim() || DEFAULT_ASSETS.iconTemplate
}

export function chromeUrl(base: string, slot: ChromeSlot) {
  return `${base.replace(/\/+$/, '')}/${CHROME_FILES[slot]}`
}

/** Empty when the template is not usable, so callers can skip drawing. */
export function iconUrl(template: string, name: TerIconName) {
  if (!template.includes('{name}')) {
    return ''
  }

  return template.replace('{name}', ICON_STEMS[name])
}

/** Options offered by the artwork dialog. */
export const CHROME_PRESETS: ReadonlyArray<{
  id: ChromeSource
  label: string
  note: string
}> = [
  {
    id: 'official',
    label: 'terraria.org (official)',
    note: 'Loads the real Terraria panel pieces, pixel grass, title plate, nav button and logo from Re-Logic at runtime. Nothing is bundled. Their filenames are hashed, so a redeploy can break them.',
  },
  {
    id: 'custom',
    label: 'Local mirror / custom base URL',
    note: 'Point at a mirror using the same filenames (e.g. /assets/terraria) to stop depending on their site. The official base stays in use until you apply a URL below.',
  },
]

export const ICON_PRESETS: ReadonlyArray<{
  id: IconSource
  label: string
  note: string
}> = [
  {
    id: 'pixelarticons',
    label: `Pixelarticons (MIT, pinned ${PIXELARTICONS_VERSION})`,
    note: '500+ open-licensed pixel icons from jsDelivr, tinted to the theme gold with a CSS mask.',
  },
  {
    id: 'custom',
    label: 'Custom template',
    note: 'Any URL containing {name}. The name→file mapping lives in src/v2/theme/assets.ts. The default set stays in use until you apply one.',
  },
]
