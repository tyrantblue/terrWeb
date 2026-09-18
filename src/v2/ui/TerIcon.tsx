import type { CSSProperties } from 'react'

import {
  effectiveIconTemplate,
  iconUrl,
  type TerIconName,
} from '../theme/assets'
import { useTerAssets } from '../theme/assetContext'

export type { TerIconName }

export interface TerIconProps {
  name: TerIconName
  size?: number
  className?: string
  /** Accessible name. Omit for decorative icons. */
  title?: string
}

/**
 * Icon from a referenced icon set (default: pixelarticons, MIT).
 *
 * The remote SVGs paint with `fill="currentColor"`, but an `<img>` cannot
 * inherit `currentColor`, so the file is used as a **CSS mask** and the
 * colour comes from the element's own `background-color`. That keeps one
 * monochrome set tintable to the theme gold without downloading, inlining or
 * recolouring anything.
 */
export default function TerIcon({
  name,
  size = 16,
  className,
  title,
}: TerIconProps) {
  const { assets } = useTerAssets()

  const url = iconUrl(effectiveIconTemplate(assets), name)

  // A template without `{name}` (or an empty custom value) cannot produce a
  // source. Keeping the box and drawing nothing leaves the layout intact
  // instead of masking to a solid square.
  const style: CSSProperties = url
    ? {
        display: 'inline-block',
        width: size,
        height: size,
        flexShrink: 0,
        backgroundColor: 'currentColor',
        WebkitMaskImage: `url("${url}")`,
        maskImage: `url("${url}")`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }
    : {
        display: 'inline-block',
        width: size,
        height: size,
        flexShrink: 0,
      }

  return (
    <span
      className={className}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  )
}
