import type { WorldMetadata } from '../api/world'

/**
 * Display helpers for the `.wld` header the API reports (capability
 * `world.metadata`). Unknown values are passed through untouched: the
 * backend can report `difficulty: "unknown(7)"` for a mode it does not
 * know yet, and showing it beats hiding the field.
 */
const SIZE_TIER_LABELS: Record<string, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
}

const DIFFICULTY_LABELS: Record<string, string> = {
  classic: 'Classic',
  expert: 'Expert',
  master: 'Master',
  journey: 'Journey',
}

export function formatSizeTier(
  tier: string | null | undefined,
) {
  if (typeof tier !== 'string' || tier === '') {
    return null
  }

  return SIZE_TIER_LABELS[tier] ?? tier
}

export function formatDifficulty(
  difficulty: string | null | undefined,
) {
  if (
    typeof difficulty !== 'string' ||
    difficulty === ''
  ) {
    return null
  }

  return DIFFICULTY_LABELS[difficulty] ?? difficulty
}

/**
 * `created_at` is ISO-8601 UTC; render it in the operator's timezone.
 * An unparseable value counts as missing rather than being shown raw.
 */
export function formatCreatedAt(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {},
) {
  if (typeof value !== 'string' || value === '') {
    return null
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toLocaleString(
    undefined,
    options,
  )
}

export function formatDimensions(
  metadata: WorldMetadata | null | undefined,
) {
  if (metadata === null || metadata === undefined) {
    return null
  }

  const { width, height } = metadata

  if (
    typeof width !== 'number' ||
    typeof height !== 'number'
  ) {
    return null
  }

  return `${width} × ${height}`
}
