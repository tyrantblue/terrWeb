
import {
  useEffect,
  useState,
  type ChangeEvent,
} from 'react'

import {
  ArrowRightLeft,
  Check,
  FileArchive,
  Globe,
  RefreshCw,
  Upload,
} from 'lucide-react'

import {
  getWorlds,
  switchWorld,
  uploadWorld,
  type World,
} from '../api/world'

import ConfirmDialog from '../components/ConfirmDialog'


export default function Worlds() {
  const [worlds, setWorlds] =
    useState<World[]>([])

  const [loading, setLoading] =
    useState(true)

  const [uploading, setUploading] =
    useState(false)

  const [switching, setSwitching] =
    useState<string | null>(null)

  const [message, setMessage] =
    useState('')

  const [confirmWorld, setConfirmWorld] =
    useState<World | null>(null)


  async function loadWorlds() {
    try {
      setLoading(true)
      setMessage('')

      const data =
        await getWorlds()

      setWorlds(data.worlds)

    } catch (error) {
      console.error(error)

      setMessage(
        'Failed to load worlds',
      )

    } finally {
      setLoading(false)
    }
  }


  async function handleUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0]

    if (!file) {
      return
    }

    if (
      !file.name
        .toLowerCase()
        .endsWith('.wld')
    ) {
      setMessage(
        'Only .wld files are allowed',
      )

      event.target.value = ''

      return
    }

    try {
      setUploading(true)

      setMessage(
        'Uploading world...',
      )

      await uploadWorld(file)

      setMessage(
        `Uploaded ${file.name}`,
      )

      await loadWorlds()

    } catch (error) {
      console.error(error)

      setMessage(
        'Failed to upload world',
      )

    } finally {
      setUploading(false)

      event.target.value = ''
    }
  }


  function handleSwitchRequest(
    world: World,
  ) {
    if (
      switching !== null ||
      world.active
    ) {
      return
    }

    setConfirmWorld(world)
  }


  async function handleConfirmSwitch() {
    if (!confirmWorld) {
      return
    }

    const file =
      confirmWorld.file

    try {
      setSwitching(file)

      setMessage(
        'Switching world...',
      )

      await switchWorld(file)

      setMessage(
        `Switched to ${file}`,
      )

      setConfirmWorld(null)

      await loadWorlds()

    } catch (error) {
      console.error(error)

      setMessage(
        'Failed to switch world',
      )

    } finally {
      setSwitching(null)
    }
  }


  function handleDialogChange(
    open: boolean,
  ) {
    if (
      !open &&
      switching === null
    ) {
      setConfirmWorld(null)
    }
  }


  useEffect(() => {
    loadWorlds()
  }, [])


  const activeWorld =
    worlds.find(
      (world) => world.active,
    )

  const otherWorlds =
    worlds.filter(
      (world) => !world.active,
    )


  return (
    <div className="space-y-6">

      {/* Header */}
      <div
        className={[
          'flex flex-col gap-4',
          'sm:flex-row',
          'sm:items-center',
          'sm:justify-between',
        ].join(' ')}
      >

        <div>

          <div className="flex items-center gap-3">

            <div
              className={[
                'flex h-10 w-10',
                'items-center justify-center',
                'rounded-lg',
                'bg-emerald-500/10',
                'text-emerald-400',
              ].join(' ')}
            >
              <Globe size={20} />
            </div>

            <div>

              <h2
                className={[
                  'text-2xl font-semibold',
                  'tracking-tight',
                ].join(' ')}
              >
                Worlds
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Manage Terraria worlds
              </p>

            </div>

          </div>

        </div>


        <div className="flex items-center gap-2">

          {/* Upload */}
          <label
            className={[
              'flex items-center gap-2',
              'rounded-lg',
              'border border-emerald-500/10',
              'bg-emerald-500/[0.06]',
              'px-3.5 py-2',
              'text-sm font-medium',
              'text-emerald-400',
              'transition',
              'hover:border-emerald-500/20',
              'hover:bg-emerald-500/10',

              uploading
                ? [
                    'cursor-not-allowed',
                    'opacity-50',
                  ].join(' ')
                : 'cursor-pointer',
            ].join(' ')}
          >

            <Upload size={16} />

            {uploading
              ? 'Uploading...'
              : 'Upload World'}

            <input
              type="file"
              accept=".wld"
              className="hidden"
              disabled={uploading}
              onChange={handleUpload}
            />

          </label>


          {/* Refresh */}
          <button
            onClick={loadWorlds}
            disabled={
              loading ||
              uploading ||
              switching !== null
            }
            className={[
              'flex items-center gap-2',
              'rounded-lg',
              'border border-white/[0.07]',
              'bg-white/[0.025]',
              'px-3.5 py-2',
              'text-sm text-gray-400',
              'transition',
              'hover:bg-white/[0.05]',
              'hover:text-gray-200',
              'disabled:cursor-not-allowed',
              'disabled:opacity-40',
            ].join(' ')}
          >

            <RefreshCw
              size={16}
              className={
                loading
                  ? 'animate-spin'
                  : ''
              }
            />

            Refresh

          </button>

        </div>

      </div>


      {/* Status message */}
      {message && (
        <div
          className={[
            'flex items-center',
            'rounded-lg',
            'border border-white/[0.07]',
            'bg-white/[0.025]',
            'px-4 py-3',
            'text-sm text-gray-500',
          ].join(' ')}
        >
          {message}
        </div>
      )}


      {/* Loading */}
      {loading ? (

        <div
          className={[
            'rounded-xl',
            'border border-white/[0.07]',
            'bg-[#17191c]',
            'p-10',
            'text-center',
            'text-sm text-gray-600',
          ].join(' ')}
        >
          Loading worlds...
        </div>

      ) : worlds.length === 0 ? (

        /* Empty */
        <div
          className={[
            'rounded-xl',
            'border border-white/[0.07]',
            'bg-[#17191c]',
            'p-10',
          ].join(' ')}
        >

          <div
            className={[
              'flex flex-col',
              'items-center',
              'justify-center',
              'text-center',
            ].join(' ')}
          >

            <div
              className={[
                'mb-4 flex h-12 w-12',
                'items-center justify-center',
                'rounded-xl',
                'bg-white/[0.035]',
                'text-gray-600',
              ].join(' ')}
            >
              <Globe size={22} />
            </div>

            <div className="text-sm text-gray-400">
              No worlds found.
            </div>

            <div className="mt-1 text-xs text-gray-700">
              Upload a .wld file to get started.
            </div>

          </div>

        </div>

      ) : (

        <div className="space-y-6">

          {/* Active world */}
          {activeWorld && (
            <section>

              <div
                className={[
                  'mb-2.5',
                  'flex items-center gap-2',
                ].join(' ')}
              >

                <span
                  className={[
                    'h-1.5 w-1.5',
                    'rounded-full',
                    'bg-emerald-400',
                  ].join(' ')}
                />

                <span
                  className={[
                    'text-xs font-medium',
                    'uppercase tracking-wide',
                    'text-gray-600',
                  ].join(' ')}
                >
                  Current World
                </span>

              </div>


              <WorldCard
                world={activeWorld}
                switching={switching}
                onSwitch={handleSwitchRequest}
              />

            </section>
          )}


          {/* Other worlds */}
          {otherWorlds.length > 0 && (
            <section>

              <div
                className={[
                  'mb-2.5',
                  'flex items-center',
                  'justify-between',
                ].join(' ')}
              >

                <span
                  className={[
                    'text-xs font-medium',
                    'uppercase tracking-wide',
                    'text-gray-600',
                  ].join(' ')}
                >
                  Other Worlds
                </span>

                <span className="text-xs text-gray-700">
                  {otherWorlds.length}
                </span>

              </div>


              <div className="grid gap-4 md:grid-cols-2">

                {otherWorlds.map(
                  (world) => (
                    <WorldCard
                      key={world.file}
                      world={world}
                      switching={switching}
                      onSwitch={handleSwitchRequest}
                    />
                  ),
                )}

              </div>

            </section>
          )}

        </div>

      )}


      {/* Confirm switch dialog */}
      <ConfirmDialog
        open={confirmWorld !== null}
        onOpenChange={handleDialogChange}
        title="Switch World"
        description={
          confirmWorld
            ? `Switch to "${confirmWorld.file}"? The current world will be saved and the Terraria server will restart.`
            : ''
        }
        confirmText="Switch"
        cancelText="Cancel"
        onConfirm={handleConfirmSwitch}
        loading={switching !== null}
      />

    </div>
  )
}


/* ------------------------------ */
/* World Card                      */
/* ------------------------------ */

function WorldCard({
  world,
  switching,
  onSwitch,
}: {
  world: World
  switching: string | null
  onSwitch: (
    world: World,
  ) => void
}) {
  const isActive =
    world.active

  return (
    <div
      className={[
        'rounded-xl',
        'border',
        'bg-[#17191c]',
        'p-5',
        'transition-all duration-150',

        isActive
          ? [
              'border-emerald-500/20',
              'shadow-lg',
              'shadow-emerald-950/10',
            ].join(' ')
          : [
              'border-white/[0.07]',
              'hover:border-white/[0.10]',
            ].join(' '),
      ].join(' ')}
    >

      {/* Header */}
      <div
        className={[
          'flex flex-col gap-4',
          'sm:flex-row',
          'sm:items-start',
          'sm:justify-between',
        ].join(' ')}
      >

        <div className="flex items-center gap-3">

          <div
            className={[
              'flex h-10 w-10',
              'shrink-0',
              'items-center justify-center',
              'rounded-lg',

              isActive
                ? [
                    'bg-emerald-500/10',
                    'text-emerald-400',
                  ].join(' ')
                : [
                    'bg-white/[0.035]',
                    'text-gray-500',
                  ].join(' '),
            ].join(' ')}
          >
            <Globe size={19} />
          </div>


          <div className="min-w-0">

            <div className="flex items-center gap-2">

              <h3
                className={[
                  'truncate',
                  'font-medium',
                  isActive
                    ? 'text-gray-100'
                    : 'text-gray-300',
                ].join(' ')}
              >
                {world.name}
              </h3>

              {isActive && (
                <span
                  className={[
                    'inline-flex shrink-0',
                    'items-center gap-1',
                    'rounded-full',
                    'bg-emerald-500/10',
                    'px-2 py-0.5',
                    'text-[11px] font-medium',
                    'text-emerald-400',
                  ].join(' ')}
                >
                  <Check size={11} />
                  Active
                </span>
              )}

            </div>


            <p
              className={[
                'mt-1 truncate',
                'font-mono text-xs',
                'text-gray-600',
              ].join(' ')}
              title={world.file}
            >
              {world.file}
            </p>

          </div>

        </div>


        <div
          className={[
            'flex shrink-0',
            'items-center gap-1.5',
            'self-start',
            'rounded-md',
            'bg-white/[0.03]',
            'px-2 py-1',
            'text-[11px]',
            'text-gray-600',
          ].join(' ')}
        >
          <FileArchive size={12} />
          WLD
        </div>

      </div>


      {/* Information */}
      <div
        className={[
          'mt-5',
          'grid grid-cols-2',
          'divide-x divide-white/[0.05]',
          'rounded-lg',
          'border border-white/[0.05]',
          'bg-white/[0.015]',
        ].join(' ')}
      >

        <div className="px-3.5 py-3">

          <div
            className={[
              'text-[11px]',
              'uppercase tracking-wide',
              'text-gray-700',
            ].join(' ')}
          >
            Size
          </div>

          <div className="mt-1 text-sm text-gray-400">
            {formatSize(world.size)}
          </div>

        </div>


        <div className="min-w-0 px-3.5 py-3">

          <div
            className={[
              'text-[11px]',
              'uppercase tracking-wide',
              'text-gray-700',
            ].join(' ')}
          >
            Modified
          </div>

          <div
            className={[
              'mt-1 truncate',
              'text-sm text-gray-400',
            ].join(' ')}
            title={formatDate(world.modified_at)}
          >
            {formatDate(world.modified_at)}
          </div>

        </div>

      </div>


      {/* Action */}
      <button
        onClick={() =>
          onSwitch(world)
        }
        disabled={
          isActive ||
          switching !== null
        }
        className={[
          'mt-4 flex w-full',
          'items-center justify-center',
          'gap-2 rounded-lg',
          'px-4 py-2.5',
          'text-sm font-medium',
          'transition-all duration-150',

          isActive
            ? [
                'cursor-default',
                'bg-white/[0.035]',
                'text-gray-600',
              ].join(' ')
            : [
                'border border-emerald-500/10',
                'bg-emerald-500/[0.05]',
                'text-emerald-400',
                'hover:border-emerald-500/20',
                'hover:bg-emerald-500/10',
              ].join(' '),

          switching !== null &&
          !isActive
            ? [
                'cursor-not-allowed',
                'opacity-40',
              ].join(' ')
            : '',
        ].join(' ')}
      >

        {switching === world.file ? (

          <span
            className={[
              'h-4 w-4',
              'animate-spin',
              'rounded-full',
              'border-2 border-emerald-400/20',
              'border-t-emerald-400',
            ].join(' ')}
          />

        ) : isActive ? (

          <Check size={16} />

        ) : (

          <ArrowRightLeft size={16} />

        )}


        {isActive
          ? 'Current World'
          : switching === world.file
            ? 'Switching...'
            : 'Switch to this world'}

      </button>

    </div>
  )
}


/* ------------------------------ */
/* File size                       */
/* ------------------------------ */

function formatSize(
  bytes: number,
) {
  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(2)} MB`
}


/* ------------------------------ */
/* Date                            */
/* ------------------------------ */

function formatDate(
  value: number,
) {
  return new Date(value * 1000).toLocaleString()
}
