import {
  useId,
  useMemo,
  useState,
} from 'react'

export interface TrendPoint {
  ts: number
  value: number | null
}

interface TrendChartProps {
  points: TrendPoint[]
  /** Stroke and area colour. */
  color: string
  height?: number
  /** Formats a value for the axis and the tooltip. */
  formatValue: (value: number) => string
  /** Shown when the window holds no samples at all. */
  emptyLabel?: string
  ariaLabel: string
}

/** Vertical padding inside the 0..100 viewBox, in viewBox units. */
const PAD_TOP = 6
const PAD_BOTTOM = 6

const AXIS_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
}

const AXIS_DAY_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}

/**
 * A small dependency-free time-series chart.
 *
 * The x axis is `ts` (epoch seconds) so uneven sampling still lines up in
 * time, and a `null` value **breaks the line** instead of being drawn as
 * zero: a 0% CPU or 0-byte memory reading would be a lie on a host where
 * the API cannot read those values at all.
 *
 * The SVG stretches a 0..100 viewBox with `preserveAspectRatio="none"`,
 * so every stroke uses `vector-effect="non-scaling-stroke"` and any marker
 * is an HTML element positioned in percentages — otherwise the shapes
 * would be stretched with the box.
 */
export default function TrendChart({
  points,
  color,
  height = 128,
  formatValue,
  emptyLabel = 'No samples in this window yet.',
  ariaLabel,
}: TrendChartProps) {
  const gradientId = useId()
  const [hoverIndex, setHoverIndex] =
    useState<number | null>(null)

  const model = useMemo(() => {
    const timestamps = points
      .map((point) => point.ts)
      .filter((ts) => Number.isFinite(ts))

    if (timestamps.length === 0) {
      return null
    }

    const first = Math.min(...timestamps)
    const last = Math.max(...timestamps)
    // A single sample has no span; widen it so the point lands mid-plot
    // instead of dividing by zero.
    const min = first
    const max = last > first ? last : first + 1
    const span = max - min

    const toX = (ts: number) =>
      ((ts - min) / span) * 100

    let maxValue = Number.NEGATIVE_INFINITY
    let numericCount = 0
    let nullCount = 0

    const rawSegments: Array<
      Array<{ x: number; value: number }>
    > = []

    let current: Array<{ x: number; value: number }> = []

    for (const point of points) {
      const value = point.value

      if (
        typeof value !== 'number' ||
        !Number.isFinite(value)
      ) {
        nullCount += 1

        if (current.length > 0) {
          rawSegments.push(current)
          current = []
        }

        continue
      }

      numericCount += 1

      if (value > maxValue) {
        maxValue = value
      }

      current.push({ x: toX(point.ts), value })
    }

    if (current.length > 0) {
      rawSegments.push(current)
    }

    // A series that is entirely zero still needs a usable scale; keeping
    // 1 as the ceiling leaves those points flat on the baseline.
    const yMax = numericCount === 0 || maxValue <= 0
      ? 1
      : maxValue

    const toY = (value: number) => {
      const ratio = Math.min(
        1,
        Math.max(0, value / yMax),
      )

      return (
        100 -
        PAD_BOTTOM -
        ratio * (100 - PAD_TOP - PAD_BOTTOM)
      )
    }

    const segments = rawSegments.map((segment) => {
      const coordinates = segment.map(({ x, value }) => ({
        x,
        y: toY(value),
      }))

      // A lone sample between two gaps gets a short dash so it is still
      // visible, since "M x y" alone paints nothing.
      const placed = coordinates.length === 1
        ? [
            {
              x: Math.max(0, coordinates[0]!.x - 0.4),
              y: coordinates[0]!.y,
            },
            {
              x: Math.min(100, coordinates[0]!.x + 0.4),
              y: coordinates[0]!.y,
            },
          ]
        : coordinates

      const line = placed
        .map(
          (point, index) =>
            `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
        )
        .join(' ')

      const firstPlaced = placed[0]!
      const lastPlaced = placed[placed.length - 1]!
      const baseline = 100 - PAD_BOTTOM

      const area = [
        line,
        `L ${lastPlaced.x.toFixed(2)} ${baseline}`,
        `L ${firstPlaced.x.toFixed(2)} ${baseline}`,
        'Z',
      ].join(' ')

      return { line, area }
    })

    return {
      min,
      max,
      yMax,
      toX,
      toY,
      segments,
      numericCount,
      nullCount,
    }
  }, [points])

  if (model === null) {
    return (
      <EmptyChart
        height={height}
        label={emptyLabel}
      />
    )
  }

  if (model.numericCount === 0) {
    return (
      <EmptyChart
        height={height}
        label="No usable samples: the API reported null for every point in this window (unsupported host or disabled sampling)."
      />
    )
  }

  const {
    min,
    max,
    yMax,
    toX,
    toY,
    segments,
    nullCount,
  } = model

  const spanHours = (max - min) / 3600

  const timeOptions = spanHours > 24
    ? AXIS_DAY_TIME_OPTIONS
    : AXIS_TIME_OPTIONS

  const formatTime = (ts: number) =>
    new Date(ts * 1000).toLocaleString(
      undefined,
      timeOptions,
    )

  const hoverPoint = hoverIndex === null
    ? null
    : points[hoverIndex] ?? null

  const hoverPosition =
    hoverPoint === null
      ? null
      : {
          x: toX(hoverPoint.ts),
          y:
            typeof hoverPoint.value === 'number' &&
            Number.isFinite(hoverPoint.value)
              ? toY(hoverPoint.value)
              : null,
        }

  function handleMouseMove(
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    const rect =
      event.currentTarget.getBoundingClientRect()

    if (rect.width === 0) {
      return
    }

    const fraction = Math.min(
      1,
      Math.max(
        0,
        (event.clientX - rect.left) / rect.width,
      ),
    )

    const targetTs = min + fraction * (max - min)

    let nearest = 0
    let nearestDistance = Number.POSITIVE_INFINITY

    for (let index = 0; index < points.length; index += 1) {
      const distance = Math.abs(
        points[index]!.ts - targetTs,
      )

      if (distance < nearestDistance) {
        nearestDistance = distance
        nearest = index
      }
    }

    setHoverIndex(nearest)
  }

  const middleTs = min + (max - min) / 2

  return (
    <div>
      <div className="flex gap-2">

        {/* Y axis */}
        <div
          className={[
            'flex w-10 shrink-0',
            'flex-col justify-between',
            'py-0.5 text-right',
            'text-[10px] leading-none',
            'text-gray-700',
          ].join(' ')}
          style={{ height }}
        >
          <span>{formatValue(yMax)}</span>
          <span>{formatValue(yMax / 2)}</span>
          <span>{formatValue(0)}</span>
        </div>


        {/* Plot */}
        <div
          className="relative min-w-0 flex-1"
          style={{ height }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >

          <svg
            role="img"
            aria-label={ariaLabel}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
          >

            <defs>
              <linearGradient
                id={gradientId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={color}
                  stopOpacity="0.24"
                />
                <stop
                  offset="100%"
                  stopColor={color}
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>


            {/* Gridlines: top, middle, baseline */}
            {[PAD_TOP, 50, 100 - PAD_BOTTOM].map(
              (y) => (
                <line
                  key={y}
                  x1="0"
                  x2="100"
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                  className="text-white/[0.06]"
                />
              ),
            )}


            {segments.map((segment, index) => (
              <g key={index}>
                <path
                  d={segment.area}
                  fill={`url(#${gradientId})`}
                  stroke="none"
                />

                <path
                  d={segment.line}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}

          </svg>


          {hoverPosition && (
            <div
              className={[
                'pointer-events-none absolute',
                'inset-y-0 w-px',
                'bg-white/20',
              ].join(' ')}
              style={{ left: `${hoverPosition.x}%` }}
            />
          )}


          {hoverPosition && hoverPosition.y !== null && (
            <div
              className={[
                'pointer-events-none absolute',
                'h-1.5 w-1.5',
                '-translate-x-1/2',
                '-translate-y-1/2',
                'rounded-full',
                'ring-2 ring-[#17191c]',
              ].join(' ')}
              style={{
                left: `${hoverPosition.x}%`,
                top: `${hoverPosition.y}%`,
                backgroundColor: color,
              }}
            />
          )}


          {hoverPoint && (
            <div
              className={[
                'pointer-events-none absolute',
                'top-0 z-10',
                'whitespace-nowrap',
                'rounded-md',
                'border border-white/[0.08]',
                'bg-[#101214]/95',
                'px-2 py-1',
                'text-[10px] text-gray-300',
              ].join(' ')}
              style={{
                left: `${hoverPosition?.x ?? 0}%`,
                transform:
                  (hoverPosition?.x ?? 0) < 15
                    ? 'translateX(0)'
                    : (hoverPosition?.x ?? 0) > 85
                      ? 'translateX(-100%)'
                      : 'translateX(-50%)',
              }}
            >
              {formatTime(hoverPoint.ts)}
              {' · '}
              {typeof hoverPoint.value === 'number' &&
              Number.isFinite(hoverPoint.value)
                ? formatValue(hoverPoint.value)
                : 'no data'}
            </div>
          )}

        </div>

      </div>


      {/* X axis */}
      <div
        className={[
          'mt-1 flex justify-between',
          'pl-12 text-[10px]',
          'text-gray-700',
        ].join(' ')}
      >
        <span>{formatTime(min)}</span>
        <span className="hidden sm:inline">
          {formatTime(middleTs)}
        </span>
        <span>{formatTime(max)}</span>
      </div>


      {nullCount > 0 && (
        <div className="mt-1 pl-12 text-[10px] text-amber-400/70">
          {nullCount} of {points.length} samples are null and are
          drawn as gaps, not as zero.
        </div>
      )}
    </div>
  )
}


function EmptyChart({
  height,
  label,
}: {
  height: number
  label: string
}) {
  return (
    <div
      className={[
        'flex items-center justify-center',
        'rounded-lg',
        'border border-dashed border-white/[0.07]',
        'bg-white/[0.012]',
        'px-4 text-center',
        'text-[11px] text-gray-600',
      ].join(' ')}
      style={{ height }}
    >
      {label}
    </div>
  )
}
