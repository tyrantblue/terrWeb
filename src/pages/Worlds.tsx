
import {
  useEffect,
  useState,
  type ChangeEvent,
} from 'react'

import * as AlertDialog from '@radix-ui/react-alert-dialog'

import {
  Activity,
  ArrowRightLeft,
  Check,
  DatabaseBackup,
  FileArchive,
  Globe,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react'

import {
  backupWorld,
  deleteWorld,
  getWorlds,
  switchWorld,
  uploadWorldWithProgress,
  waitForOperation,
  type World,
} from '../api/world'

import ConfirmDialog from '../components/ConfirmDialog'

type UploadStatus =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'success'
  | 'error'

interface UploadState {
  status: UploadStatus
  fileName: string
  fileSize: number
  loaded: number
  total: number
  percent: number
  startedAt: number | null
  finishedAt: number | null
}

const initialUploadState: UploadState = {
  status: 'idle',
  fileName: '',
  fileSize: 0,
  loaded: 0,
  total: 0,
  percent: 0,
  startedAt: null,
  finishedAt: null,
}


export default function Worlds() {
  const [worlds, setWorlds] =
    useState<World[]>([])

  const [loading, setLoading] =
    useState(true)

  const [uploading, setUploading] =
    useState(false)

  const [uploadDialogOpen, setUploadDialogOpen] =
    useState(false)

  const [uploadState, setUploadState] =
    useState<UploadState>(
      initialUploadState,
    )

  const [switching, setSwitching] =
    useState<string | null>(null)

  const [switchProgress, setSwitchProgress] =
    useState(0)

  const [message, setMessage] =
    useState('')

  const [confirmWorld, setConfirmWorld] =
    useState<World | null>(null)

  const [deleteTarget, setDeleteTarget] =
    useState<World | null>(null)

  const [worldAction, setWorldAction] =
    useState<string | null>(null)


  async function loadWorlds(
    clearMessage = true,
  ) {
    try {
      setLoading(true)
      if (clearMessage) {
        setMessage('')
      }

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
      setUploadDialogOpen(true)

      setUploadState({
        status: 'uploading',
        fileName: file.name,
        fileSize: file.size,
        loaded: 0,
        total: file.size,
        percent: 0,
        startedAt: Date.now(),
        finishedAt: null,
      })

      setMessage(
        'Uploading world...',
      )

      await uploadWorldWithProgress(
        file,
        (progress) => {
          setUploadState(
            (current) => ({
              ...current,
              status:
                progress.percent >= 100
                  ? 'processing'
                  : 'uploading',
              loaded: progress.loaded,
              total: progress.total,
              percent: progress.percent,
            }),
          )
        },
      )

      setUploadState(
        (current) => ({
          ...current,
          status: 'success',
          loaded:
            current.total || file.size,
          total:
            current.total || file.size,
          percent: 100,
          finishedAt: Date.now(),
        }),
      )

      setMessage(
        `Uploaded ${file.name}`,
      )

      await loadWorlds(false)

    } catch (error) {
      console.error(error)

      setUploadState(
        (current) => ({
          ...current,
          status: 'error',
          finishedAt: Date.now(),
        }),
      )

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
      setSwitchProgress(0)

      setMessage(
        'Switching world...',
      )

      const operation = await switchWorld(file)

      await waitForOperation(
        operation.operation_id,
        (current) => {
          setSwitchProgress(
            current.progress ?? 0,
          )

          if (current.message) {
            setMessage(current.message)
          }
        },
      )

      setMessage(
        `Switched to ${file}`,
      )

      setConfirmWorld(null)

      await loadWorlds(false)

    } catch (error) {
      console.error(error)

      setMessage(
        'Failed to switch world',
      )

    } finally {
      setSwitching(null)
      setSwitchProgress(0)
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


  async function handleBackup(world: World) {
    try {
      setWorldAction(`backup:${world.file}`)
      setMessage(`Backing up ${world.file}...`)
      const operation = await backupWorld(world.file)

      await waitForOperation(
        operation.operation_id,
        (current) => {
          setMessage(
            current.message ??
              `Backing up ${world.file}... ${current.progress ?? 0}%`,
          )
        },
      )

      setMessage(`Backup created for ${world.file}.`)
    } catch (error) {
      console.error(error)
      setMessage(
        error instanceof Error
          ? error.message
          : 'Failed to back up world.',
      )
    } finally {
      setWorldAction(null)
    }
  }


  async function handleDelete() {
    if (!deleteTarget) return

    try {
      setWorldAction(`delete:${deleteTarget.file}`)
      await deleteWorld(deleteTarget.file)
      setMessage(`Deleted ${deleteTarget.file}.`)
      setDeleteTarget(null)
      await loadWorlds(false)
    } catch (error) {
      console.error(error)
      setMessage(
        error instanceof Error
          ? error.message
          : 'Failed to delete world.',
      )
    } finally {
      setWorldAction(null)
    }
  }


  useEffect(() => {
    const initialLoad = window.setTimeout(
      loadWorlds,
      0,
    )

    return () => {
      window.clearTimeout(initialLoad)
    }
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
              'ui-button',
              'ui-button-accent',

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

          {/* Upload progress */}
          <button
            onClick={() =>
              setUploadDialogOpen(true)
            }
            disabled={
              uploadState.status === 'idle'
            }
            title="View upload progress"
            className={[
              'ui-icon-button',
            ].join(' ')}
          >
            <Activity
              size={16}
              className={
                uploading
                  ? 'animate-pulse text-emerald-400'
                  : ''
              }
            />
          </button>


          {/* Refresh */}
          <button
            onClick={() => void loadWorlds()}
            disabled={
              loading ||
              uploading ||
              switching !== null
            }
            className={[
              'ui-button',
              'ui-button-secondary',
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
                switchProgress={switchProgress}
                action={worldAction}
                onSwitch={handleSwitchRequest}
                onBackup={handleBackup}
                onDelete={setDeleteTarget}
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


              <div className="ui-scroll-region grid gap-4 pr-1 md:grid-cols-2">

                {otherWorlds.map(
                  (world) => (
                    <WorldCard
                      key={world.file}
                      world={world}
                      switching={switching}
                      switchProgress={switchProgress}
                      action={worldAction}
                      onSwitch={handleSwitchRequest}
                      onBackup={handleBackup}
                      onDelete={setDeleteTarget}
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

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && worldAction === null) {
            setDeleteTarget(null)
          }
        }}
        title="Delete world"
        description={
          deleteTarget
            ? `Permanently delete ${deleteTarget.file}? This cannot be undone. Create a backup first if you may need it later.`
            : ''
        }
        confirmText="Delete"
        onConfirm={handleDelete}
        loading={
          worldAction?.startsWith('delete:') ?? false
        }
      />


      {/* Upload progress dialog */}
      <UploadProgressDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        upload={uploadState}
      />

    </div>
  )
}


/* ------------------------------ */
/* Upload Progress Dialog          */
/* ------------------------------ */

function UploadProgressDialog({
  open,
  onOpenChange,
  upload,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  upload: UploadState
}) {
  const statusText =
    getUploadStatusText(upload.status)

  const detailText =
    upload.status === 'idle'
      ? 'No upload has started yet.'
      : upload.status === 'processing'
        ? 'Upload received. Waiting for the server to finish saving the world.'
        : upload.status === 'success'
          ? 'Upload completed successfully.'
          : upload.status === 'error'
            ? 'Upload failed. Try uploading the world again.'
            : 'Uploading world file to the server.'

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={onOpenChange}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay
          className={[
            'ui-dialog-overlay',
            'data-[state=open]:animate-in',
            'data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0',
            'data-[state=open]:fade-in-0',
          ].join(' ')}
        />

        <AlertDialog.Content
          className={[
            'fixed left-1/2 top-1/2',
            'z-50',
            'w-[calc(100%-2rem)]',
            'max-w-md',
            '-translate-x-1/2',
            '-translate-y-1/2',
          'ui-dialog',
            'data-[state=open]:animate-in',
            'data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0',
            'data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95',
            'data-[state=open]:zoom-in-95',
          ].join(' ')}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={[
                  'flex h-10 w-10',
                  'shrink-0',
                  'items-center justify-center',
                  'rounded-lg',
                  upload.status === 'error'
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-emerald-500/10 text-emerald-400',
                ].join(' ')}
              >
                <Activity
                  size={19}
                  className={
                    upload.status === 'uploading' ||
                    upload.status === 'processing'
                      ? 'animate-pulse'
                      : ''
                  }
                />
              </div>

              <div className="min-w-0">
                <AlertDialog.Title
                  className={[
                    'text-base font-semibold',
                    'text-gray-100',
                  ].join(' ')}
                >
                  Upload Progress
                </AlertDialog.Title>

                <AlertDialog.Description
                  className={[
                    'mt-1.5',
                    'text-sm leading-6',
                    'text-gray-500',
                  ].join(' ')}
                >
                  {detailText}
                </AlertDialog.Description>
              </div>
            </div>

            <AlertDialog.Cancel
              className={[
                'flex h-8 w-8',
                'shrink-0',
                'items-center justify-center',
                'rounded-lg',
                'text-gray-500',
                'transition',
                'hover:bg-white/[0.05]',
                'hover:text-gray-200',
                'outline-none',
              ].join(' ')}
            >
              <X size={16} />
            </AlertDialog.Cancel>
          </div>

          <div
            className={[
              'mt-5',
              'rounded-lg',
              'border border-white/[0.07]',
              'bg-white/[0.02]',
              'p-4',
            ].join(' ')}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-gray-300">
                  {upload.fileName || 'No file selected'}
                </div>

                <div className="mt-1 text-xs text-gray-600">
                  {upload.fileSize
                    ? formatSize(upload.fileSize)
                    : 'Waiting for upload'}
                </div>
              </div>

              <div
                className={[
                  'shrink-0',
                  'rounded-md',
                  'bg-white/[0.035]',
                  'px-2 py-1',
                  'text-xs font-medium',
                  upload.status === 'error'
                    ? 'text-red-400'
                    : upload.status === 'success'
                      ? 'text-emerald-400'
                      : 'text-gray-400',
                ].join(' ')}
              >
                {statusText}
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-gray-600">
                  {formatSize(upload.loaded)}
                  {' / '}
                  {formatSize(upload.total)}
                </span>

                <span className="font-medium text-gray-300">
                  {upload.percent}%
                </span>
              </div>

              <div
                className={[
                  'h-2 overflow-hidden',
                  'rounded-full',
                  'bg-white/[0.06]',
                ].join(' ')}
              >
                <div
                  className={[
                    'h-full rounded-full',
                    'transition-all duration-300',
                    upload.status === 'error'
                      ? 'bg-red-400'
                      : 'bg-emerald-400',
                  ].join(' ')}
                  style={{
                    width: `${upload.percent}%`,
                  }}
                />
              </div>
            </div>

            {(upload.startedAt ||
              upload.finishedAt) && (
              <div
                className={[
                  'mt-4 grid grid-cols-2',
                  'divide-x divide-white/[0.05]',
                  'rounded-lg',
                  'border border-white/[0.05]',
                  'bg-white/[0.015]',
                ].join(' ')}
              >
                <div className="px-3 py-2.5">
                  <div className="text-[11px] uppercase tracking-wide text-gray-700">
                    Started
                  </div>

                  <div className="mt-1 truncate text-xs text-gray-500">
                    {upload.startedAt
                      ? formatTime(upload.startedAt)
                      : '-'}
                  </div>
                </div>

                <div className="px-3 py-2.5">
                  <div className="text-[11px] uppercase tracking-wide text-gray-700">
                    Finished
                  </div>

                  <div className="mt-1 truncate text-xs text-gray-500">
                    {upload.finishedAt
                      ? formatTime(upload.finishedAt)
                      : '-'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}


/* ------------------------------ */
/* World Card                      */
/* ------------------------------ */

function WorldCard({
  world,
  switching,
  switchProgress,
  action,
  onSwitch,
  onBackup,
  onDelete,
}: {
  world: World
  switching: string | null
  switchProgress: number
  action: string | null
  onSwitch: (
    world: World,
  ) => void
  onBackup: (world: World) => void
  onDelete: (world: World) => void
}) {
  const isActive =
    world.active

  return (
    <div
      className={[
        'ui-panel',
        'ui-panel-hover',
        'p-5',

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


      <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
      <button
        onClick={() =>
          onSwitch(world)
        }
        disabled={
          isActive ||
          switching !== null
        }
        className={[
          'ui-button',
          'w-full',

          isActive
            ? [
                'cursor-default',
                'bg-white/[0.035]',
                'text-gray-600',
              ].join(' ')
            : [
                'ui-button-accent',
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
            ? `Switching... ${switchProgress}%`
            : 'Switch to this world'}

      </button>

      <button
        type="button"
        onClick={() => onBackup(world)}
        disabled={
          switching !== null || action !== null
        }
        className="ui-icon-button"
        title={`Back up ${world.file}`}
      >
        <DatabaseBackup
          size={16}
          className={
            action === `backup:${world.file}`
              ? 'animate-pulse'
              : ''
          }
        />
      </button>

      <button
        type="button"
        onClick={() => onDelete(world)}
        disabled={
          isActive ||
          switching !== null ||
          action !== null
        }
        className="ui-icon-button text-red-400"
        title={
          isActive
            ? 'The active world cannot be deleted'
            : `Delete ${world.file}`
        }
      >
        <Trash2 size={16} />
      </button>
      </div>

    </div>
  )
}


/* ------------------------------ */
/* File size                       */
/* ------------------------------ */

function getUploadStatusText(
  status: UploadStatus,
) {
  switch (status) {
    case 'uploading':
      return 'Uploading'
    case 'processing':
      return 'Processing'
    case 'success':
      return 'Complete'
    case 'error':
      return 'Failed'
    default:
      return 'Idle'
  }
}


function formatSize(
  bytes: number,
) {
  if (bytes <= 0) {
    return '0 KB'
  }

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


function formatTime(
  value: number,
) {
  return new Date(value).toLocaleTimeString()
}
