import { useState } from 'react'

import {
  TerBadge,
  TerButton,
  TerDialog,
  TerEmpty,
  TerIconButton,
  TerInput,
  TerPanel,
  TerRow,
  TerSectionHeading,
  TerStat,
  TerTabs,
  TerTitlePlate,
} from '../ui'
import TerIcon, { type TerIconName } from '../ui/TerIcon'

type KitTab = 'controls' | 'data' | 'type' | 'icons'

const KIT_TABS: Array<{ id: KitTab; label: string; icon: TerIconName }> = [
  { id: 'controls', label: 'Controls', icon: 'settings' },
  { id: 'data', label: 'Data display', icon: 'dashboard' },
  { id: 'type', label: 'Typography', icon: 'console' },
  { id: 'icons', label: 'Icon set', icon: 'heart' },
]

const ICON_NAMES: TerIconName[] = [
  'dashboard', 'worlds', 'players', 'console', 'operations', 'settings',
  'server', 'restart', 'power', 'save', 'sun', 'moon', 'upload', 'download',
  'trash', 'refresh', 'lock', 'check', 'cross', 'warning', 'info', 'play',
  'heart', 'eye', 'clock', 'search', 'bell',
]

export default function KitchenSink() {
  const [tab, setTab] = useState<KitTab>('controls')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [text, setText] = useState('')

  return (
    <div className="space-y-6">
      <TerSectionHeading
        title="Component kit"
        icon="dashboard"
        description="Every piece of the Terraria-style chrome in one place, so the visual language can be signed off before any real page is ported."
      />

      <TerTabs
        tabs={KIT_TABS}
        active={tab}
        onChange={setTab}
        label="Component groups"
      />

      {tab === 'controls' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <TerPanel mossTop className="p-5">
            <h3 className="ter-h3 mb-4">Buttons</h3>
            <div className="flex flex-wrap gap-2">
              <TerButton>Default</TerButton>
              <TerButton variant="gold" icon="check">Primary</TerButton>
              <TerButton variant="danger" icon="trash">Danger</TerButton>
              <TerButton variant="ghost" icon="refresh">Ghost</TerButton>
              <TerButton loading>Working</TerButton>
              <TerButton disabled icon="lock">Disabled</TerButton>
            </div>

            <h3 className="ter-h3 mt-6 mb-4">Icon buttons</h3>
            <div className="flex flex-wrap gap-2">
              <TerIconButton icon="play" label="Play" />
              <TerIconButton icon="save" label="Save" />
              <TerIconButton icon="refresh" label="Refresh" />
              <TerIconButton icon="trash" label="Delete" variant="danger" />
              <TerIconButton icon="lock" label="Locked" disabled />
            </div>

            <h3 className="ter-h3 mt-6 mb-4">Badges</h3>
            <div className="flex flex-wrap gap-2">
              <TerBadge tone="ok" icon="check">Online</TerBadge>
              <TerBadge tone="warn" icon="warning">Skipped</TerBadge>
              <TerBadge tone="danger" icon="cross">Failed</TerBadge>
              <TerBadge tone="info" icon="clock">Running</TerBadge>
              <TerBadge tone="neutral">Idle</TerBadge>
            </div>
          </TerPanel>

          <TerPanel mossTop className="p-5">
            <h3 className="ter-h3 mb-4">Inputs</h3>
            <div className="space-y-3">
              <TerInput
                id="kit-text"
                label="Server MOTD"
                value={text}
                onChange={setText}
                placeholder="Welcome to the world…"
              />
              <TerInput
                id="kit-disabled"
                label="Locked field"
                value="read-only value"
                onChange={() => {}}
                disabled
              />
            </div>

            <h3 className="ter-h3 mt-6 mb-4">Dialog</h3>
            <TerButton variant="gold" icon="warning" onClick={() => setDialogOpen(true)}>
              Ask first
            </TerButton>
            <p className="ter-faint mt-2">
              Destructive actions confirm before firing.
            </p>
          </TerPanel>

          <TerPanel className="p-5 lg:col-span-2">
            <h3 className="ter-h3 mb-2">Panel variants</h3>
            <p className="ter-small mb-4">
              The mossy band is the signature detail: officials panels wear it on the top edge.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <TerPanel mossTop className="p-0">
                <div className="p-4 pt-6">
                  <div className="ter-body font-semibold">mossTop</div>
                  <div className="ter-faint mt-1">Section panels and stat tiles</div>
                </div>
              </TerPanel>
              <TerPanel mossTop mossBottom className="p-0">
                <div className="p-4 pt-6 pb-6">
                  <div className="ter-body font-semibold">mossTop + mossBottom</div>
                  <div className="ter-faint mt-1">Standalone feature blocks</div>
                </div>
              </TerPanel>
              <TerPanel inset className="p-4">
                <div className="ter-body font-semibold">Inset (no moss)</div>
                <div className="ter-faint mt-1">Status strips, code wells, empty states</div>
              </TerPanel>
            </div>

            <hr className="ter-divider my-5" />

            <div className="flex flex-wrap items-center gap-3">
              <TerTitlePlate icon="operations">Title plate</TerTitlePlate>
              <TerTitlePlate icon="server">Another section</TerTitlePlate>
            </div>
          </TerPanel>
        </div>
      )}

      {tab === 'data' && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TerStat label="Status" value="Online" icon="heart" tone="ok" />
            <TerStat label="Players" value="3 / 255" icon="players" />
            <TerStat label="Version" value="1.4.5.8" icon="server" />
            <TerStat label="World" value="gogogo" icon="worlds" hint="12.4 MB · modified 2h ago" />
          </div>

          <TerPanel mossTop className="p-5">
            <h3 className="ter-h3 mb-4">Rows</h3>
            <div className="space-y-2">
              <TerRow
                icon="players"
                title="C"
                subtitle="113.194.127.204:12811"
                meta={<TerBadge tone="ok">Online</TerBadge>}
                actions={
                  <>
                    <TerIconButton icon="cross" label="Kick C" />
                    <TerIconButton icon="lock" label="Ban C" variant="danger" />
                  </>
                }
              />
              <TerRow
                icon="players"
                title="ユノの犬"
                subtitle="121.33.239.89:52744"
                meta={<TerBadge tone="ok">Online</TerBadge>}
                actions={<TerIconButton icon="cross" label="Kick" />}
              />
              <TerRow
                icon="lock"
                title="123.58.213.20"
                subtitle="Banned by the server console"
                actions={<TerIconButton icon="refresh" label="Unban" />}
              />
            </div>
          </TerPanel>

          <TerPanel className="p-5">
            <h3 className="ter-h3 mb-4">Empty state</h3>
            <TerEmpty
              icon="worlds"
              title="No worlds found."
              hint="Upload a .wld file to get started."
            />
          </TerPanel>
        </div>
      )}

      {tab === 'type' && (
        <TerPanel mossTop className="p-6">
          <div className="space-y-4">
            <div>
              <div className="ter-h1">Heading 1 — 26px</div>
              <div className="ter-faint">Open Sans 500 · #d6ffe4</div>
            </div>
            <div>
              <div className="ter-h2">Heading 2 — 22px</div>
            </div>
            <div>
              <div className="ter-h3">Heading 3 — 18px</div>
            </div>
            <hr className="ter-divider my-4" />
            <p className="ter-body">
              Body text runs at 15px in <span className="ter-gold">#f6ffe3</span>,
              the same pale cream the official site uses. Admin data is dense, so
              the theme keeps the chrome pixel-styled and the reading surfaces clear.
            </p>
            <p className="ter-muted">
              Muted copy for secondary information — descriptions, timestamps,
              helper text. Sized slightly larger to stay legible at low contrast.
            </p>
            <p className="ter-small">
              Small text: table meta, row subtitles, form hints.
            </p>
            <p className="ter-faint">
              Faint text: least important labels.
            </p>
            <p className="ter-serif">
              Merriweather is available for editorial accents, matching the
              official site's serif usage.
            </p>
            <p className="ter-mono">
              08:44:20 [Server] : No players connected.
            </p>
            <p>
              <span className="ter-gold">Gold</span> marks dates and emphasis,{' '}
              <span style={{ color: 'var(--ter-ok)' }}>green</span> healthy state,{' '}
              <span style={{ color: 'var(--ter-warn)' }}>amber</span> warnings,{' '}
              <span style={{ color: 'var(--ter-danger)' }}>red</span> failures.
            </p>
          </div>
        </TerPanel>
      )}

      {tab === 'icons' && (
        <TerPanel mossTop className="p-6">
          <p className="ter-small mb-5">
            {ICON_NAMES.length} self-drawn 12×12 pixel icons. Switch the artwork
            source from the eye button in the header to use official PNGs where a
            mapping exists.
          </p>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-8">
            {ICON_NAMES.map((name) => (
              <div key={name} className="flex flex-col items-center gap-2">
                <span className="ter-icontile">
                  <TerIcon name={name} size={20} />
                </span>
                <span className="ter-faint">{name}</span>
              </div>
            ))}
          </div>
        </TerPanel>
      )}

      <TerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Restart the server?"
        description="Connected players will be disconnected. The world is saved first."
        footer={
          <>
            <TerButton variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </TerButton>
            <TerButton variant="danger" icon="restart" onClick={() => setDialogOpen(false)}>
              Restart
            </TerButton>
          </>
        }
      />
    </div>
  )
}
