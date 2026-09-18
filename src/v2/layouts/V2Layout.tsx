import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { useServerStatus } from '../../context/serverStatus'
import { useApiMeta } from '../../context/apiMeta'
import {
  CHROME_PRESETS,
  DEFAULT_ASSETS,
  ICON_PRESETS,
  chromeUrl,
  effectiveChromeBase,
  loadAssetSettings,
  saveAssetSettings,
  type AssetSettings,
  type ChromeSlot,
  type ChromeSource,
  type IconSource,
  type TerIconName,
} from '../theme/assets'
import { TerAssetsContext } from '../theme/assetContext'
import TerIcon from '../ui/TerIcon'
import { TerBadge, TerButton, TerDialog, TerInput } from '../ui'
import { cx } from '../ui/cx'

/**
 * The official site's own font stack, injected here rather than imported
 * globally so visiting the classic UI never pulls Google Fonts.
 */
const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&family=Merriweather:wght@300&display=swap'

const NAV: Array<{ to: string; label: string; icon: TerIconName; end?: boolean }> = [
  { to: '/next', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/next/worlds', label: 'Worlds', icon: 'worlds' },
  { to: '/next/players', label: 'Players', icon: 'players' },
  { to: '/next/console', label: 'Console', icon: 'console' },
  { to: '/next/operations', label: 'Operations', icon: 'operations' },
  { to: '/next/settings', label: 'Settings', icon: 'settings' },
]

function useOfficialFonts() {
  useEffect(() => {
    const id = 'ter-fonts'

    if (document.getElementById(id)) {
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

export default function V2Layout() {
  useOfficialFonts()

  const [assets, setAssets] = useState<AssetSettings>(() => loadAssetSettings())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  const location = useLocation()

  // The full header is ~140px tall, which is a lot to keep pinned. Once the
  // page scrolls it shrinks to just the nav bar.
  useEffect(() => {
    function onScroll() {
      setCompact(window.scrollY > 48)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const update = useCallback((next: AssetSettings) => {
    setAssets(next)
    saveAssetSettings(next)
  }, [])

  const contextValue = useMemo(
    () => ({ assets, update }),
    [assets, update],
  )

  // Resolved through the helpers so an empty "custom" value can never turn
  // into a same-origin request for someone else's filenames.
  const chromeBase = effectiveChromeBase(assets)

  // Chrome artwork resolved to CSS custom properties, so the stylesheet can
  // reference runtime-configured URLs without knowing where they live.
  const chromeVars = useMemo(() => {
    const cssUrl = (slot: ChromeSlot) =>
      `url("${chromeUrl(chromeBase, slot)}")`

    return {
      '--ter-background': cssUrl('background'),
      '--ter-panel-top': cssUrl('panelTop'),
      '--ter-panel-middle': cssUrl('panelMiddle'),
      '--ter-panel-bottom': cssUrl('panelBottom'),
      '--ter-grass': cssUrl('grass'),
      '--ter-title-plate': cssUrl('titlePlate'),
      '--ter-nav-item': cssUrl('navItem'),
      '--ter-divider': cssUrl('divider'),
    } as React.CSSProperties
  }, [chromeBase])

  const logoUrl = chromeUrl(chromeBase, 'logo')

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

  return (
    <TerAssetsContext.Provider value={contextValue}>
      <div className="ter-theme" style={chromeVars}>
        <div className="ter-bg" />

        <div className="ter-shell">
          <header className={cx('ter-header', compact && 'ter-header-compact')}>
            <div className="ter-header-inner mx-auto flex max-w-[var(--ter-max-w)] flex-col items-center gap-2">
              <NavLink to="/next" className="ter-brand flex flex-col items-center no-underline">
                <img
                  className="ter-logo"
                  src={logoUrl}
                  alt="Terraria"
                  width={186}
                  height={62}
                />
                <span className="ter-wordmark-sub mt-1">Server Panel</span>
              </NavLink>

              <div className="flex w-full flex-wrap items-center justify-center gap-3">
                <nav className="ter-nav" aria-label="Sections">
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
                        <TerIcon name={item.icon} size={15} />
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
                  <TerIcon name="eye" size={16} />
                </button>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[var(--ter-max-w)] flex-1 px-4 pb-14 pt-6">
            <div className="ter-on-bg mb-5 flex flex-wrap items-center justify-between gap-3">
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

              <div className="flex items-center gap-3">
                <span className="ter-faint">
                  {meta ? `API ${meta.api_version}` : 'API —'}
                </span>
                <NavLink to="/" className="ter-navitem no-underline">
                  Classic UI
                </NavLink>
              </div>
            </div>

            {/* Keyed on the path so each route animates in on navigation. */}
            <div key={location.pathname} className="ter-page-enter">
              <Outlet />
            </div>
          </main>

          <footer className="relative z-[1] border-t border-[rgb(201_162_39_/_25%)] bg-[rgb(0_0_0_/_45%)] px-4 py-4">
            <div className="ter-faint mx-auto flex max-w-[var(--ter-max-w)] flex-wrap items-center justify-between gap-2">
              <span>
                Terraria-style theme (v2 preview) · artwork referenced at runtime
                · <span className="ter-mono">route {location.pathname}</span>
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
        />
      </div>
    </TerAssetsContext.Provider>
  )
}

function ArtworkSourceDialog({
  open,
  onOpenChange,
  settings,
  onChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: AssetSettings
  onChange: (next: AssetSettings) => void
}) {
  const usingOfficial = settings.chromeSource === 'official'
  const usingPixelarticons = settings.iconSource === 'pixelarticons'

  /**
   * Selecting a source never edits the URL: "custom" keeps whatever is in
   * use so the chrome does not vanish while the field is still empty, and
   * the field is seeded with a working value to edit from.
   */
  const pickChrome = (id: ChromeSource) =>
    onChange({
      ...settings,
      chromeSource: id,
      chromeBase: settings.chromeBase.trim() || DEFAULT_ASSETS.chromeBase,
    })

  const pickIcons = (id: IconSource) =>
    onChange({
      ...settings,
      iconSource: id,
      iconTemplate:
        settings.iconTemplate.trim() || DEFAULT_ASSETS.iconTemplate,
    })

  return (
    <TerDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Artwork source"
      description="The theme draws nothing itself — every image is referenced at runtime. Changes are stored locally in this browser."
      footer={
        <>
          <TerButton
            variant="ghost"
            icon="restart"
            onClick={() => onChange(DEFAULT_ASSETS)}
          >
            Reset
          </TerButton>
          <TerButton variant="gold" onClick={() => onOpenChange(false)}>
            Done
          </TerButton>
        </>
      }
    >
      <div className="mt-4 space-y-4">
        <SourceGroup
          title="Panel & backdrop"
          presets={CHROME_PRESETS.map((preset) => ({
            id: preset.id,
            label: preset.label,
            note: preset.note,
            active: settings.chromeSource === preset.id,
            apply: () => pickChrome(preset.id),
          }))}
        />

        {!usingOfficial && (
          <ChromeFields settings={settings} onChange={onChange} />
        )}

        <SourceGroup
          title="Icon set"
          presets={ICON_PRESETS.map((preset) => ({
            id: preset.id,
            label: preset.label,
            note: preset.note,
            active: settings.iconSource === preset.id,
            apply: () => pickIcons(preset.id),
          }))}
        />

        {!usingPixelarticons && (
          <IconFields settings={settings} onChange={onChange} />
        )}
      </div>
    </TerDialog>
  )
}

function SourceGroup({
  title,
  presets,
}: {
  title: string
  presets: Array<{
    id: string
    label: string
    note: string
    active: boolean
    apply: () => void
  }>
}) {
  return (
    <div>
      <div className="ter-small mb-2 font-semibold">{title}</div>
      <div className="space-y-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={preset.apply}
            className={cx(
              'ter-panel-inset block w-full p-3 text-left',
              preset.active && 'outline outline-1 outline-[var(--ter-gold)]',
            )}
          >
            <span className="ter-body block font-semibold">{preset.label}</span>
            <span className="ter-faint mt-0.5 block leading-5">
              {preset.note}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ChromeFields({
  settings,
  onChange,
}: {
  settings: AssetSettings
  onChange: (next: AssetSettings) => void
}) {
  const [draft, setDraft] = useState(settings.chromeBase)

  return (
    <div className="mt-3 flex items-end gap-2">
      <TerInput
        id="ter-chrome-base"
        label="Chrome base URL"
        value={draft}
        onChange={setDraft}
        placeholder="https://…/static/media"
      />
      <TerButton
        variant="gold"
        icon="check"
        onClick={() => onChange({ ...settings, chromeBase: draft })}
      >
        Use
      </TerButton>
    </div>
  )
}

function IconFields({
  settings,
  onChange,
}: {
  settings: AssetSettings
  onChange: (next: AssetSettings) => void
}) {
  const [draft, setDraft] = useState(settings.iconTemplate)

  return (
    <div className="mt-3 flex items-end gap-2">
      <TerInput
        id="ter-icon-template"
        label="Icon URL template ({name})"
        value={draft}
        onChange={setDraft}
        placeholder="https://…/svg/{name}.svg"
      />
      <TerButton
        variant="gold"
        icon="check"
        onClick={() => onChange({ ...settings, iconTemplate: draft })}
      >
        Use
      </TerButton>
    </div>
  )
}
