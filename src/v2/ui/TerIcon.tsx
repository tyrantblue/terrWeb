import { useState } from 'react'

import { useTerAssets } from '../theme/assetContext'
import type { AssetSource } from '../theme/assets'

/**
 * Self-drawn 12x12 pixel icons.
 *
 * Written as character grids rather than path data so they stay editable
 * by hand and obviously "pixel art" (hard edges, no antialiasing).
 *
 *   .  transparent      #  ink / outline
 *   +  gold (primary)   -  gold highlight
 *   =  green            o  white
 */
const ICONS = {
  grid: [
    '............',
    '.++++..++++.',
    '.+--+..+--+.',
    '.++++..++++.',
    '.++++..++++.',
    '............',
    '.++++..++++.',
    '.+--+..+--+.',
    '.++++..++++.',
    '.++++..++++.',
    '............',
    '............',
  ],
  world: [
    '...######...',
    '..#++++++#..',
    '.#++==++++#.',
    '.#+====+++#.',
    '#++==++++++#',
    '#++++++++++#',
    '#+++====+++#',
    '#++=====+++#',
    '.#++++++==#.',
    '.#++++++++#.',
    '..#++++++#..',
    '...######...',
  ],
  players: [
    '............',
    '...##..##...',
    '..#++##++#..',
    '..#++##++#..',
    '...##..##...',
    '............',
    '..####.####.',
    '.#++++#++++#',
    '.#+--+#+--+#',
    '.#++++#++++#',
    '..####.####.',
    '............',
  ],
  console: [
    '############',
    '#++++++++++#',
    '############',
    '#..........#',
    '#.+##......#',
    '#...#+.....#',
    '#.+##......#',
    '#..........#',
    '#.++..+++..#',
    '#..........#',
    '############',
    '............',
  ],
  shield: [
    '...######...',
    '..#++++++#..',
    '.#++++++++#.',
    '.#+++==+++#.',
    '.#+++==+++#.',
    '.#++++++++#.',
    '.#++++++++#.',
    '..#++++++#..',
    '..#++++++#..',
    '...#++++#...',
    '....#++#....',
    '.....##.....',
  ],
  gear: [
    '....####....',
    '..#.#++#.#..',
    '.##++++++##.',
    '.#++++++++#.',
    '#++#++++#++#',
    '#++#++++#++#',
    '#++#++++#++#',
    '#++#++++#++#',
    '.#++++++++#.',
    '.##++++++##.',
    '..#.#++#.#..',
    '....####....',
  ],
  server: [
    '............',
    '..########..',
    '..#------#..',
    '..#-o+o+-#..',
    '..########..',
    '..########..',
    '..#------#..',
    '..#-o+o+-#..',
    '..########..',
    '............',
    '............',
    '............',
  ],
  restart: [
    '....####....',
    '..#++++++#..',
    '.#++####++#.',
    '.#+#....#+#.',
    '#++#........',
    '#++#........',
    '#++#........',
    '#++#.....#+.',
    '.#+#....#++#',
    '.#++####++#.',
    '..#++++++#..',
    '....####....',
  ],
  save: [
    '############',
    '#++++++++++#',
    '#+#++++++#+#',
    '#+#+----+#+#',
    '#+#+----+#+#',
    '#+#+----+#+#',
    '#+#++++++#+#',
    '#++++++++++#',
    '#++######++#',
    '#++#++++#++#',
    '#++#++++#++#',
    '############',
  ],
  sun: [
    '.....++.....',
    '..#..++..#..',
    '...++++++...',
    '..+++--+++..',
    '.+++----+++.',
    '+++------+++',
    '+++------+++',
    '.+++----+++.',
    '..+++--+++..',
    '...++++++...',
    '..#..++..#..',
    '.....++.....',
  ],
  moon: [
    '....####....',
    '..##++++##..',
    '.#++####++#.',
    '#++##...##+#',
    '#++#......+#',
    '#++#.......#',
    '#++#.......#',
    '#++#......+#',
    '#++##...##+#',
    '.#++####++#.',
    '..##++++##..',
    '....####....',
  ],
  upload: [
    '.....++.....',
    '....+##+....',
    '...+####+...',
    '..+######+..',
    '.++++##++++.',
    '....+##+....',
    '....+##+....',
    '....+##+....',
    '............',
    '.#........#.',
    '.#++++++++#.',
    '.##########.',
  ],
  trash: [
    '....####....',
    '..##########',
    '...#......#.',
    '..##########',
    '..#+#+#+#+#.',
    '..#+#+#+#+#.',
    '..#+#+#+#+#.',
    '..#+#+#+#+#.',
    '..#+#+#+#+#.',
    '..#+#+#+#+#.',
    '..##########',
    '............',
  ],
  refresh: [
    '...######...',
    '..#++++++#..',
    '.#++####++#.',
    '.#+#....#+#.',
    '#++#......#.',
    '#++#........',
    '........#++#',
    '......#++#+.',
    '.#....#+#...',
    '.#++####++#.',
    '..#++++++#..',
    '...######...',
  ],
  lock: [
    '....####....',
    '...#++++#...',
    '..#+#..#+#..',
    '..#+#..#+#..',
    '.##########.',
    '.#++++++++#.',
    '.#++#++#++#.',
    '.#++#++#++#.',
    '.#++++++++#.',
    '.#++++++++#.',
    '.##########.',
    '............',
  ],
  check: [
    '............',
    '..........=.',
    '.........==.',
    '........==..',
    '.=.....==...',
    '.==...==....',
    '..==.==.....',
    '...===......',
    '....=.......',
    '............',
    '............',
    '............',
  ],
  cross: [
    '............',
    '.##......##.',
    '.###....###.',
    '..###..###..',
    '...######...',
    '....####....',
    '....####....',
    '...######...',
    '..###..###..',
    '.###....###.',
    '.##......##.',
    '............',
  ],
  warning: [
    '.....++.....',
    '....+##+....',
    '....+##+....',
    '...+####+...',
    '...+####+...',
    '..+##++##+..',
    '..+##++##+..',
    '.+########+.',
    '.+###++###+.',
    '+###+##+###+',
    '+##++++++##+',
    '############',
  ],
  play: [
    '............',
    '..##........',
    '..####......',
    '..######....',
    '..########..',
    '..##########',
    '..##########',
    '..########..',
    '..######....',
    '..####......',
    '..##........',
    '............',
  ],
  heart: [
    '............',
    '..##....##..',
    '.#++#..#++#.',
    '#++++##++++#',
    '#++++++++++#',
    '#++++++++++#',
    '.#++++++++#.',
    '..#++++++#..',
    '...#++++#...',
    '....#++#....',
    '.....##.....',
    '............',
  ],
  eye: [
    '............',
    '............',
    '...######...',
    '..#++++++#..',
    '.#++####++#.',
    '#++##++##++#',
    '#++##++##++#',
    '.#++####++#.',
    '..#++++++#..',
    '...######...',
    '............',
    '............',
  ],
  clock: [
    '...######...',
    '..#++++++#..',
    '.#+++##+++#.',
    '#++++##++++#',
    '#++++##++++#',
    '#++++####++#',
    '#++++++++++#',
    '#++++++++++#',
    '.#++++++++#.',
    '..#++++++#..',
    '...######...',
    '............',
  ],
  search: [
    '...####.....',
    '..#++++#....',
    '.#+#++#+#...',
    '.#+#++#+#...',
    '.#+#++#+#...',
    '..#++++#....',
    '...####+....',
    '.......+#...',
    '........+#..',
    '.........#+.',
    '..........+#',
    '........... ',
  ],
} as const

export type TerIconName = keyof typeof ICONS

const PALETTE: Record<string, string> = {
  '#': '#2a1c10',
  '+': '#d9b45c',
  '-': '#f6e3a8',
  '=': '#7cb342',
  o: '#f6ffe3',
}

/**
 * Official icon PNGs, keyed by the icon they can stand in for. Only the
 * controls Re-Logic actually ships artwork for are mapped; everything else
 * falls back to the self-drawn sprite.
 */
const OFFICIAL_ICONS: Partial<Record<TerIconName, string>> = {
  eye: 'PasswordVisibility/show_password.png',
}

function cellAt(
  grid: readonly string[],
  x: number,
  y: number,
): string | null {
  const row = grid[y]

  if (!row) {
    return null
  }

  const ch = row[x]

  return ch && ch !== ' ' ? ch : null
}

export interface TerIconProps {
  name: TerIconName
  size?: number
  className?: string
  /**
   * Icon artwork source. Defaults to the artwork source chosen in the
   * shell, so the picker reaches icons rendered deep inside components;
   * pass it explicitly to override for a single icon.
   */
  source?: AssetSource
  iconBase?: string
  title?: string
}

export default function TerIcon({
  name,
  size = 16,
  className,
  source,
  iconBase,
  title,
}: TerIconProps) {
  const inherited = useTerAssets()
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  const activeSource = source ?? inherited.source
  const activeBase = iconBase ?? inherited.iconBase

  const grid = ICONS[name]

  // Cache-busting is not needed; these are static assets.
  const officialPath =
    activeSource === 'official' && activeBase
      ? OFFICIAL_ICONS[name]
      : undefined

  const officialSrc = officialPath
    ? `${activeBase.replace(/\/$/, '')}/${officialPath}`
    : null

  // A remote icon that 404s would render as a broken-image box, so fall back
  // to the sprite for that one icon rather than losing it.
  if (officialSrc !== null && failedSrc !== officialSrc) {
    return (
      <img
        src={officialSrc}
        onError={() => setFailedSrc(officialSrc)}
        width={size}
        height={size}
        alt={title ?? ''}
        title={title}
        className={className}
        style={{ imageRendering: 'pixelated' }}
      />
    )
  }

  const rects: React.ReactElement[] = []

  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[y].length; x += 1) {
      const ch = cellAt(grid, x, y)

      if (!ch || ch === '.') {
        continue
      }

      rects.push(
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={1}
          height={1}
          fill={PALETTE[ch] ?? PALETTE['+']}
        />,
      )
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      className={className}
      shapeRendering="crispEdges"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ flexShrink: 0 }}
    >
      {rects}
    </svg>
  )
}
