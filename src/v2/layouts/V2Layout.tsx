import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { useServerStatus } from '../../context/serverStatus'
import { useApiMeta } from '../../context/apiMeta'
import {
  loadAssetSettings,
  resolveAssets,
  saveAssetSettings,
  ORIGINAL_BACKGROUND,
  toCssBackground,
  type AssetSettings,
  type AssetSource,
} from '../theme/assets'
import TerIcon, { type TerIconName } from '../ui/TerIcon'
import { TerAssetsContext } from '../theme/assetContext'
import {
  TerBadge,
  TerButton,
  TerDialog,
  TerInput,
} from '../ui'
import { cx } from '../ui/cx'

/**
 * The official site's own font stack. Injected here rather than imported
 * globally so that visiting the old UI never pulls Google Fonts.
 */
const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&family=Merriweather:wght@300&display=swap'

const NAV: Array<{ to: string; label: string; icon: TerIconName; end?: boolean }> = [
  { to: '/next', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/next/worlds', label: 'Worlds', icon: 'world' },
  { to: '/next/players', label: 'Players', icon: 'players' },
  { to: '/next/console', label: 'Console', icon: 'console' },
  { to: '/next/operations', label: 'Operations', icon: 'shield' },
  { to: '/next/settings', label: 'Settings', icon: 'gear' },
]

function useOfficialFonts() {
  useEffect(() => {
    const id = 'ter-fonts'
    const existing = document.getElementById(id)

    if (existing) {
      return
    }

    const preconnect = document.createElement('link')
    preconnect.rel = 'preconnect'
    preconnect.href = 'https://fonts.gstatic.com'
    preconnect.crossOrigin = 'anonymous'

    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = FONT_HREF

    document.head.append(preconnect, link)

    return () => {
      preconnect.remove()
      link.remove()
    }
  }, [])
}

/**
 * A remote backdrop is just a URL, and CSS reports nothing when it fails to
 * load: the page would quietly lose its artwork and render flat black. The
 * official preset is documented to break whenever Re-Logic redeploys (the
 * filenames are content-hashed), so probe it and fall back to the
 * self-drawn scene instead of silently losing the backdrop.
 */
function useBrokenBackground(value: string) {
  // Records which URL failed rather than a boolean, so switching the source
  // back to a working value clears the state without a synchronous
  // `setState` in the effect body (which cascades renders).
  const [failedValue, setFailedValue] = useState<string | null>(null)

  const candidate = value.trim()

  useEffect(() => {
    if (!/^https?:\/\//i.test(candidate)) {
      return
    }

    const probe = new Image()
    let disposed = false

    probe.onerror = () => {
      if (!disposed) {
        setFailedValue(candidate)
      }
    }

    probe.src = candidate

    return () => {
      disposed = true
      probe.onerror = null
    }
  }, [candidate])

  return failedValue !== null && failedValue === candidate
}

export default function V2Layout() {
  useOfficialFonts()

  const [assets, setAssets] = useState<AssetSettings>(() => loadAssetSettings())
  const [pickerOpen, setPickerOpen] = useState(false)
  const location = useLocation()

  const resolved = useMemo(() => resolveAssets(assets), [assets])

  const update = useCallback((next: AssetSettings) => {
    setAssets(next)
    saveAssetSettings(next)
  }, [])

  // Icons read the chosen artwork source from context: the components that
  // render them are several levels below the shell, and the previous
  // prop-drilling never happened, so the picker silently only changed the
  // backdrop.
  const iconAssets = useMemo(
    () => ({ source: assets.source, iconBase: resolved.iconBase }),
    [assets.source, resolved.iconBase],
  )

  const backgroundFailed = useBrokenBackground(resolved.background)

  const background = backgroundFailed
    ? ORIGINAL_BACKGROUND
    : toCssBackground(resolved.background) || ORIGINAL_BACKGROUND

  const { status, connectivity } = useServerStatus()
  const { meta } = useApiMeta()

  const statusTone = connectivity === 'online'
    ? 'ok'
    : connectivity === 'offline'
      ? 'warn'
      : connectivity === 'unreachable'
        ? 'danger'
        : 'neutral'

  const statusLabel = connectivity === 'online'
    ? 'Server Online'
    : connectivity === 'offline'
      ? 'Server Stopped'
      : connectivity === 'unreachable'
        ? 'API Unreachable'
        : 'Connecting'

  const shell = (
    <div className="ter-theme">
      <div
        className="ter-bg"
        style={{ ['--ter-bg-image' as string]: background }}
      />

      <div className="ter-shell">
        <header className="ter-header">
          <div className="mx-auto flex max-w-[var(--ter-max-w)] flex-col items-center gap-3">
            <NavLink
              to="/next"
              className="flex flex-col items-center no-underline"
            >
              <span className="ter-wordmark">TERRARIA</span>
              <span className="ter-wordmark-sub">Server Panel</span>
            </NavLink>

            <div className="flex w-full items-center justify-center gap-3 px-5">
              <nav className="ter-nav overflow-x-auto" aria-label="Sections">
                {NAV.map((item, index) => (
                  <span key={item.to} className="flex items-center">
                    {index > 0 && <span className="ter-nav-divider" />}
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cx('ter-navitem', isActive && 'ter-navitem-active')
                      }
                    >
                      <TerIcon name={item.icon} size={14} />
                      {item.label}
                    </NavLink>
                  </span>
                ))}
              </nav>

              <button
                type="button"
                className="ter-iconbtn"
                title="Artwork source"
                aria-label="Artwork source"
                onClick={() => setPickerOpen(true)}
              >
                <TerIcon name="eye" size={15} />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[var(--ter-max-w)] flex-1 px-4 pb-14 pt-6">
          {/* A plate, not just a text-shadow: the status strip sits over the
              brightest part of the backdrop. */}
          <div className="ter-plate ter-on-bg mb-5 flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
            <div className="flex items-center gap-3">
              <TerBadge tone={statusTone} icon="heart">
                {statusLabel}
              </TerBadge>
              {status && (
                <span className="ter-small">
                  {status.players.online}/{status.max_players ?? '—'} online
                  {status.version ? ` · ${status.version}` : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="ter-faint">
                {meta ? `API ${meta.api_version}` : 'API —'}
              </span>
              <NavLink to="/" className="ter-button ter-button-ghost no-underline">
                Classic UI
              </NavLink>
            </div>
          </div>

          <Outlet context={{ assets, update }} />
        </main>

        <footer className="relative z-[1] border-t border-[rgb(201_162_39_/_25%)] bg-[rgb(0_0_0_/_80%)] px-4 py-4">
          <div className="ter-faint mx-auto flex max-w-[var(--ter-max-w)] flex-wrap items-center justify-between gap-2">
            <span>
              Terraria-style theme (v2 preview) ·{' '}
              {assets.source === 'original'
                ? 'self-drawn artwork'
                : `artwork: ${assets.source}`}
              {' · '}
              <span className="ter-mono">route {location.pathname}</span>
            </span>
            <span>
              Terraria is developed by Re-Logic. This panel is independent.
            </span>
          </div>
        </footer>
      </div>

      <ArtworkSourceDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        settings={assets}
        onChange={update}
        backgroundFailed={backgroundFailed}
      />
    </div>
  )

  return (
    <TerAssetsContext.Provider value={iconAssets}>
      {shell}
    </TerAssetsContext.Provider>
  )
}

const SOURCE_LABELS: Array<{ id: AssetSource; label: string; note: string }> = [
  {
    id: 'original',
    label: 'Self-drawn (default)',
    note: 'Generated SVG backdrop and the built-in pixel sprite. Nothing external is loaded.',
  },
  {
    id: 'official',
    label: 'terraria.org (runtime)',
    note: "Loads Re-Logic's artwork directly from terraria.org. Nothing is bundled or redistributed, but their filenames are hashed so links can break when they redeploy.",
  },
  {
    id: 'custom',
    label: 'Custom URLs',
    note: 'Point at a local mirror or your own artwork.',
  },
]

function ArtworkSourceDialog({
  open,
  onOpenChange,
  settings,
  onChange,
  backgroundFailed,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: AssetSettings
  onChange: (next: AssetSettings) => void
  /** True when the chosen backdrop URL did not load and the drawn scene is in use. */
  backgroundFailed: boolean
}) {
  return (
    <TerDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Artwork source"
      description="Where the theme gets its backdrop and icons. Changes are stored locally in this browser."
      footer={
        <TerButton variant="ghost" onClick={() => onOpenChange(false)}>
          Close
        </TerButton>
      }
    >
      {backgroundFailed && (
        <div className="ter-panel-inset mt-4 px-3 py-2">
          <span className="ter-small">
            That backdrop URL did not load, so the self-drawn scene is being
            shown instead. The official filenames change whenever terraria.org
            redeploys.
          </span>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {SOURCE_LABELS.map((option) => (
          <label
            key={option.id}
            className={cx(
              'ter-panel-inset flex cursor-pointer gap-3 p-3',
              settings.source === option.id && 'outline outline-1 outline-[var(--ter-gold)]',
            )}
          >
            <input
              type="radio"
              name="asset-source"
              checked={settings.source === option.id}
              onChange={() => onChange({ ...settings, source: option.id })}
              className="mt-1 accent-[#d9b45c]"
            />
            <span>
              <span className="ter-body block font-semibold">
                {option.label}
              </span>
              <span className="ter-faint mt-0.5 block leading-5">
                {option.note}
              </span>
            </span>
          </label>
        ))}
      </div>

      {/* Mounted only for the custom source, so the draft state starts from
          the saved values without an effect syncing them. */}
      {settings.source === 'custom' && (
        <CustomUrlFields settings={settings} onChange={onChange} />
      )}
    </TerDialog>
  )
}

function CustomUrlFields({
  settings,
  onChange,
}: {
  settings: AssetSettings
  onChange: (next: AssetSettings) => void
}) {
  const [draft, setDraft] = useState(settings.custom)

  return (
    <div className="mt-4 space-y-3">
      <TerInput
        id="ter-custom-bg"
        label="Background image URL"
        value={draft.background}
        onChange={(value) =>
          setDraft((current) => ({ ...current, background: value }))
        }
        placeholder="https://…/overworld.jpg"
      />
      <TerInput
        id="ter-custom-icons"
        label="Icon base URL (optional)"
        value={draft.iconBase}
        onChange={(value) =>
          setDraft((current) => ({ ...current, iconBase: value }))
        }
        placeholder="https://…/static/media"
      />
      <div className="flex justify-end">
        <TerButton
          variant="gold"
          icon="check"
          onClick={() => onChange({ ...settings, custom: draft })}
        >
          Use these URLs
        </TerButton>
      </div>
    </div>
  )
}
