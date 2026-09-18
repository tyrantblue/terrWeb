/**
 * Where the v2 chrome sources its artwork.
 *
 * `original` (default) is generated in this repo — SVG textures and a
 * self-drawn icon sprite — so nothing copyrighted is redistributed.
 *
 * `official` points at terraria.org at runtime. Those assets are Re-Logic's
 * and are deliberately NOT committed; the browser fetches them directly,
 * the same way it would when visiting the site. Two caveats worth knowing:
 *
 *   1. their filenames are content-hashed (`background.ea292d81.jpg`), so
 *      they break whenever Re-Logic redeploys — treat this as best-effort;
 *   2. `background-size: cover` needs no CORS, but the icon `<img>`s only
 *      work if their server allows it.
 *
 * `custom` lets the user paste their own URLs (a local mirror works well).
 */

export type AssetSource = 'original' | 'official' | 'custom'

export interface TerrariaAssets {
  /** Page backdrop; falls back to the generated scene when empty. */
  background: string
  /** Base URL used for official-style icon PNGs; empty = self-drawn. */
  iconBase: string
}

const OFFICIAL_BASE = 'https://terraria.org/static/media'

export const ASSET_PRESETS: Record<AssetSource, TerrariaAssets> = {
  original: {
    background: '',
    iconBase: '',
  },
  official: {
    background: `${OFFICIAL_BASE}/background.ea292d81.jpg`,
    iconBase: OFFICIAL_BASE,
  },
  custom: {
    background: '',
    iconBase: '',
  },
}

const STORAGE_KEY = 'terraria-panel.v2.assets'

export interface AssetSettings {
  source: AssetSource
  custom: TerrariaAssets
}

const DEFAULT_SETTINGS: AssetSettings = {
  source: 'original',
  custom: { background: '', iconBase: '' },
}

const SOURCES: readonly AssetSource[] = [
  'original',
  'official',
  'custom',
]

/**
 * `localStorage` is user-writable and survives releases, so the stored
 * source cannot be trusted to be one of the three keys: an unknown value
 * would make `ASSET_PRESETS[source]` resolve to `undefined` and take the
 * whole `/next` tree down on the first render.
 */
function isAssetSource(value: unknown): value is AssetSource {
  return (
    typeof value === 'string' &&
    (SOURCES as readonly string[]).includes(value)
  )
}

export function loadAssetSettings(): AssetSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return DEFAULT_SETTINGS
    }

    const parsed = JSON.parse(raw) as Partial<AssetSettings>

    return {
      source: isAssetSource(parsed.source) ? parsed.source : 'original',
      custom: {
        background:
          typeof parsed.custom?.background === 'string'
            ? parsed.custom.background
            : '',
        iconBase:
          typeof parsed.custom?.iconBase === 'string'
            ? parsed.custom.iconBase
            : '',
      },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveAssetSettings(settings: AssetSettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Private browsing / quota: the toggle just won't persist.
  }
}

export function resolveAssets(settings: AssetSettings): TerrariaAssets {
  if (settings.source === 'custom') {
    return settings.custom
  }

  // Defensive: a caller that bypassed `loadAssetSettings` must not be able
  // to turn this into `undefined.background` at render time.
  return ASSET_PRESETS[settings.source] ?? ASSET_PRESETS.original
}

/**
 * A generated biome backdrop, drawn as SVG so it can ship in-repo.
 *
 * Composition follows the official photograph's structure: washed-out
 * sky, distant hills, a tree line, and a darker ground band — light at
 * the top so headings stay readable, detailed at the bottom.
 */
/**
 * Accept either a raw URL or a ready-made CSS `url(...)` value. A bare URL
 * dropped straight into `background-image` is invalid CSS and resolves to
 * `none`, which is how the official preset silently did nothing.
 */
export function toCssBackground(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return ''
  }

  if (/^url\(/i.test(trimmed)) {
    return trimmed
  }

  return `url("${trimmed.replace(/"/g, '\\"')}")`
}

export const ORIGINAL_BACKGROUND = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7fb6e0"/>
        <stop offset="34%" stop-color="#a8cfe8"/>
        <stop offset="58%" stop-color="#bcd9c0"/>
        <stop offset="100%" stop-color="#6f9a5f"/>
      </linearGradient>
      <linearGradient id="far" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6f92ac"/>
        <stop offset="100%" stop-color="#54748c"/>
      </linearGradient>
      <linearGradient id="mid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#5f8f52"/>
        <stop offset="100%" stop-color="#3f6b39"/>
      </linearGradient>
      <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4c7a3a"/>
        <stop offset="100%" stop-color="#22381c"/>
      </linearGradient>
      <radialGradient id="sun" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
        <stop offset="45%" stop-color="#fdf3c8" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#fdf3c8" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <rect width="1600" height="900" fill="url(#sky)"/>
    <circle cx="1210" cy="132" r="190" fill="url(#sun)"/>
    <circle cx="1210" cy="132" r="48" fill="#fffdf0" opacity="0.92"/>

    <!-- far ridge -->
    <path d="M0 452 L170 366 L320 430 L520 330 L700 424 L880 344 L1080 428 L1290 356 L1460 424 L1600 370 L1600 900 L0 900 Z"
          fill="url(#far)" opacity="0.85"/>

    <!-- Floating islands, a Terraria staple. Drawn with a flat grass cap
         and a faceted rock underside so they read as scenery rather than
         as a stray triangle behind the content. -->
    <g opacity="0.88">
      <g>
        <path d="M262 150 h96 v11 h-96 z" fill="#79a862"/>
        <path d="M262 161 h96 l-22 30 -26 26 -26 -26 -22 -30 z" fill="#4a6b41"/>
        <path d="M262 150 h96 v4 h-96 z" fill="#93c077"/>
        <path d="M296 167 l14 20 -14 14 -14 -14 z" fill="#3c5834" opacity="0.7"/>
      </g>
      <g>
        <path d="M1188 108 h72 v9 h-72 z" fill="#79a862"/>
        <path d="M1188 117 h72 l-17 23 -19 19 -19 -19 -17 -23 z" fill="#4a6b41"/>
        <path d="M1188 108 h72 v3 h-72 z" fill="#93c077"/>
      </g>
      <g>
        <path d="M880 206 h58 v7 h-58 z" fill="#79a862"/>
        <path d="M880 213 h58 l-14 18 -15 15 -15 -15 -14 -18 z" fill="#4a6b41"/>
        <path d="M880 206 h58 v3 h-58 z" fill="#93c077"/>
      </g>
    </g>

    <!-- mid hills -->
    <path d="M0 596 C 220 512, 430 636, 690 566 C 930 502, 1170 626, 1600 552 L1600 900 L0 900 Z"
          fill="url(#mid)"/>

    <!-- tree line on the mid ridge -->
    <g fill="#33552c">
      <rect x="196" y="556" width="11" height="58"/>
      <ellipse cx="201" cy="540" rx="52" ry="40"/>
      <rect x="470" y="580" width="10" height="54"/>
      <ellipse cx="475" cy="566" rx="44" ry="34"/>
      <rect x="1176" y="540" width="12" height="64"/>
      <ellipse cx="1182" cy="522" rx="58" ry="44"/>
      <rect x="1408" y="574" width="10" height="56"/>
      <ellipse cx="1413" cy="558" rx="46" ry="36"/>
    </g>

    <!-- foreground ground -->
    <path d="M0 774 C 300 726, 620 812, 940 766 C 1200 730, 1420 798, 1600 762 L1600 900 L0 900 Z"
          fill="url(#ground)"/>

    <!-- near trees framing the viewport -->
    <g fill="#24401d">
      <rect x="58" y="628" width="18" height="150"/>
      <ellipse cx="67" cy="596" rx="88" ry="70"/>
      <rect x="1500" y="604" width="18" height="174"/>
      <ellipse cx="1509" cy="570" rx="96" ry="76"/>
    </g>
  </svg>`,
)}")`
