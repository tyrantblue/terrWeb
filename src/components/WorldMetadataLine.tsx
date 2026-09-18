import type { WorldMetadata } from '../api/world'
import {
  formatCreatedAt,
  formatDimensions,
  formatDifficulty,
  formatSizeTier,
} from '../utils/worldMetadata'

/**
 * One line describing a world's size tier, difficulty and creation date.
 *
 * `null` means the API could not read the `.wld` header (old, damaged or
 * truncated file) and renders as "unknown" — those files stay listed and
 * fully actionable. `undefined` means the field is not part of this
 * backend's payload at all (API 1.x, or a response from before the
 * handshake landed), so nothing is rendered rather than claiming the file
 * is unreadable.
 */
export default function WorldMetadataLine({
  metadata,
  className = '',
}: {
  metadata: WorldMetadata | null | undefined
  className?: string
}) {
  if (metadata === undefined) {
    return null
  }

  if (metadata === null) {
    return (
      <div
        className={[
          'text-[11px] text-gray-700',
          className,
        ].join(' ')}
        title="The API could not read this .wld header. Old (pre-1.3.5.3), damaged or truncated files have no readable metadata."
      >
        Unknown world format
      </div>
    )
  }

  const tier = formatSizeTier(metadata.size_tier)
  const difficulty = formatDifficulty(
    metadata.difficulty,
  )
  const created = formatCreatedAt(
    metadata.created_at,
    { dateStyle: 'medium' },
  )
  const createdFull = formatCreatedAt(
    metadata.created_at,
  )
  const dimensions = formatDimensions(metadata)

  const parts: Array<{
    key: string
    text: string
    title?: string
  }> = []

  if (tier !== null) {
    parts.push({ key: 'tier', text: tier })
  }

  if (difficulty !== null) {
    parts.push({ key: 'difficulty', text: difficulty })
  }

  if (created !== null) {
    parts.push({
      key: 'created',
      text: `Created ${created}`,
      title: createdFull ?? undefined,
    })
  }

  // A header with nothing recognisable in it keeps the "unknown" wording
  // instead of rendering an empty line.
  if (parts.length === 0) {
    return (
      <div
        className={[
          'text-[11px] text-gray-700',
          className,
        ].join(' ')}
        title={
          dimensions
            ? `World header recognized (${dimensions}), but it carries no size tier, difficulty or creation date.`
            : undefined
        }
      >
        Unknown world format
      </div>
    )
  }

  const tooltip = [
    dimensions,
    typeof metadata.format_version === 'number'
      ? `format ${metadata.format_version}`
      : null,
    createdFull,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ')

  return (
    <div
      className={[
        'flex flex-wrap items-center',
        'gap-x-1.5 gap-y-0.5',
        'text-[11px] text-gray-600',
        className,
      ].join(' ')}
      title={tooltip || undefined}
    >
      {parts.map((part, index) => (
        <span
          key={part.key}
          className="flex items-center gap-1.5"
          title={part.title}
        >
          {index > 0 && (
            <span className="text-gray-700">·</span>
          )}

          {part.text}
        </span>
      ))}
    </div>
  )
}
