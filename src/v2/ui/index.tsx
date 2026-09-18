import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from 'react'

import { cx } from './cx'
import TerIcon, { type TerIconName } from './TerIcon'

/* ====================================================================
   Panel
   ==================================================================== */

export interface TerPanelProps {
  children: ReactNode
  /** Pixel-grass band on the top edge — the signature official detail. */
  mossTop?: boolean
  mossBottom?: boolean
  /** Draws a small hanging vine from the top band. */
  inset?: boolean
  className?: string
  as?: 'section' | 'div' | 'article'
}

export function TerPanel({
  children,
  mossTop = false,
  mossBottom = false,
  inset = false,
  className,
  as: Tag = 'section',
}: TerPanelProps) {
  return (
    <Tag
      className={cx(
        inset ? 'ter-panel-inset' : 'ter-panel',
        mossTop && 'ter-moss-top',
        mossBottom && 'ter-moss-bottom',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

/* ====================================================================
   Title plate
   ==================================================================== */

export function TerTitlePlate({
  icon,
  children,
  className,
}: {
  icon?: TerIconName
  children: ReactNode
  className?: string
}) {
  return (
    <span className={cx('ter-titleplate', className)}>
      {icon && <TerIcon name={icon} size={14} />}
      <span className="ter-h3">{children}</span>
    </span>
  )
}

/* ====================================================================
   Section heading with ornate divider
   ==================================================================== */

export function TerSectionHeading({
  title,
  description,
  icon,
  actions,
}: {
  title: string
  description?: string
  icon?: TerIconName
  actions?: ReactNode
}) {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TerTitlePlate icon={icon}>{title}</TerTitlePlate>
        {actions}
      </div>
      {description && (
        <p className="ter-small mt-2">{description}</p>
      )}
      <hr className="ter-divider mt-3" />
    </div>
  )
}

/* ====================================================================
   Buttons
   ==================================================================== */

export interface TerButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'default' | 'gold' | 'danger' | 'ghost'
  icon?: TerIconName
  type?: 'button' | 'submit'
  title?: string
  className?: string
}

export function TerButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'default',
  icon,
  type = 'button',
  title,
  className,
}: TerButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={cx(
        'ter-button',
        variant === 'gold' && 'ter-button-gold',
        variant === 'danger' && 'ter-button-danger',
        variant === 'ghost' && 'ter-button-ghost',
        className,
      )}
    >
      {loading ? (
        <Spinner />
      ) : (
        icon && <TerIcon name={icon} size={14} />
      )}
      {children}
    </button>
  )
}

export function TerIconButton({
  icon,
  label,
  onClick,
  disabled = false,
  variant = 'default',
  className,
}: {
  icon: TerIconName
  /** Also used as the accessible name — these buttons carry no text. */
  label: string
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'danger'
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cx(
        'ter-iconbtn',
        variant === 'danger' && 'ter-button-danger',
        className,
      )}
    >
      <TerIcon name={icon} size={15} />
    </button>
  )
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 12,
        height: 12,
        borderRadius: 999,
        border: '2px solid rgba(0,0,0,.25)',
        borderTopColor: 'rgba(0,0,0,.65)',
        animation: 'ter-spin .7s linear infinite',
      }}
    />
  )
}

/* ====================================================================
   Badge
   ==================================================================== */

export type TerTone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral'

/**
 * The tone is an internal token; showing it verbatim put words like
 * "neutral" and "ok" on screen next to the value they describe.
 */
const TONE_LABELS: Record<TerTone, string> = {
  ok: 'OK',
  warn: 'Warning',
  danger: 'Fault',
  info: 'Info',
  neutral: 'Pending',
}

export function TerBadge({
  children,
  tone = 'neutral',
  icon,
}: {
  children: ReactNode
  tone?: TerTone
  icon?: TerIconName
}) {
  return (
    <span className={cx('ter-badge', `ter-badge-${tone}`)}>
      {icon && <TerIcon name={icon} size={12} />}
      {children}
    </span>
  )
}

/* ====================================================================
   Input
   ==================================================================== */

export function TerInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  label,
  id,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  disabled?: boolean
  label?: string
  id?: string
}) {
  // A label with no `id` to point at leaves the two unassociated: clicking
  // the label does nothing and the field has no accessible name.
  const generatedId = useId()
  const inputId = id ?? generatedId

  const input = (
    <input
      id={inputId}
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="ter-input"
    />
  )

  if (!label) {
    return input
  }

  return (
    <label htmlFor={inputId} className="block">
      <span className="ter-small mb-1.5 block">{label}</span>
      {input}
    </label>
  )
}
/* ====================================================================
   Stat tile
   ==================================================================== */

export function TerStat({
  label,
  value,
  icon,
  tone,
  hint,
}: {
  label: string
  value: string
  icon?: TerIconName
  tone?: TerTone
  hint?: string
}) {
  return (
    <div className={cx('ter-stat', 'ter-moss-top')}>
      <div className="flex items-center justify-between gap-3">
        <span className="ter-small">{label}</span>
        {icon && (
          <span className="ter-icontile" style={{ width: 28, height: 28 }}>
            <TerIcon name={icon} size={14} />
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="ter-stat-value">{value}</span>
        {tone && <TerBadge tone={tone}>{TONE_LABELS[tone]}</TerBadge>}
      </div>
      {hint && <div className="ter-faint mt-1">{hint}</div>}
    </div>
  )
}

/* ====================================================================
   Tabs
   ==================================================================== */

/**
 * A group of toggle buttons. Deliberately NOT the ARIA tabs pattern: there
 * are no `tabpanel`s, no `aria-controls` and no roving tabindex, and
 * announcing a tab widget that does not respond to arrow keys is worse
 * than announcing a group of pressed buttons.
 */
export function TerTabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: Array<{ id: T; label: string; icon?: TerIconName }>
  active: T
  onChange: (id: T) => void
  label?: string
}) {
  return (
    <div className="ter-tabs" role="group" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-pressed={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cx(
            'ter-tab',
            active === tab.id && 'ter-tab-active',
          )}
        >
          <span className="inline-flex items-center gap-2">
            {tab.icon && <TerIcon name={tab.icon} size={13} />}
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  )
}

/* ====================================================================
   Row
   ==================================================================== */

export function TerRow({
  icon,
  title,
  subtitle,
  meta,
  actions,
}: {
  icon?: TerIconName
  title: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="ter-row">
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <span className="ter-icontile">
            <TerIcon name={icon} size={16} />
          </span>
        )}
        <div className="min-w-0">
          <div className="ter-body truncate font-semibold">{title}</div>
          {subtitle && <div className="ter-faint mt-0.5">{subtitle}</div>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {meta}
        {actions}
      </div>
    </div>
  )
}

/* ====================================================================
   Empty state
   ==================================================================== */

export function TerEmpty({
  icon,
  title,
  hint,
}: {
  icon?: TerIconName
  title: string
  hint?: string
}) {
  return (
    <div className="ter-panel-inset flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon && <TerIcon name={icon} size={22} />}
      <div className="ter-body">{title}</div>
      {hint && <div className="ter-faint">{hint}</div>}
    </div>
  )
}

/* ====================================================================
   Dialog

   Hand-rolled: this project depends on Radix's alert-dialog only, so the
   modal contract (`aria-modal`) has to be honoured here. That means moving
   focus in on open, restoring it on close, and keeping Tab inside — an
   `aria-modal="true"` that still lets the keyboard wander into the page
   behind it is a promise the markup cannot keep.
   ==================================================================== */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function TerDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  // Kept in a ref so an inline `onOpenChange` cannot re-run the effect
  // below and yank focus back to the dialog on every parent render.
  const onOpenChangeRef = useRef(onOpenChange)

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  }, [onOpenChange])

  useEffect(() => {
    if (!open) {
      return
    }

    const node = dialogRef.current
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    node?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onOpenChangeRef.current(false)
        return
      }

      if (event.key !== 'Tab' || node === null) {
        return
      }

      const items = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE),
      )

      if (items.length === 0) {
        event.preventDefault()
        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      const current = document.activeElement

      if (event.shiftKey && (current === first || current === node)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && current === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previous?.focus()
    }
  }, [open])

  if (!open) {
    return null
  }

  return (
    <>
      <div
        className="ter-overlay"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className="ter-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <div className="ter-h2" id={titleId}>{title}</div>
        {description && (
          <p className="ter-small mt-2" id={descriptionId}>
            {description}
          </p>
        )}
        {children}
        {footer && (
          <div className="mt-5 flex justify-end gap-2">{footer}</div>
        )}
      </div>
    </>
  )
}
