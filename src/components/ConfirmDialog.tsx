
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { AlertTriangle } from 'lucide-react'


interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void

  title: string
  description: string

  confirmText?: string
  cancelText?: string

  onConfirm: () => void
  loading?: boolean
}


export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  function handleConfirm() {
    if (loading) {
      return
    }

    onConfirm()
  }


  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={onOpenChange}
    >

      <AlertDialog.Portal>

        {/* Overlay */}
        <AlertDialog.Overlay
          className={[
            'ui-dialog-overlay',
            'data-[state=open]:animate-in',
            'data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0',
            'data-[state=open]:fade-in-0',
          ].join(' ')}
        />


        {/* Dialog */}
        <AlertDialog.Content
          className={[
            'ui-dialog',

            'data-[state=open]:animate-in',
            'data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0',
            'data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95',
            'data-[state=open]:zoom-in-95',
          ].join(' ')}
        >

          {/* Icon + Title */}
          <div className="flex items-start gap-3">

            <div
              className={[
                'flex h-10 w-10',
                'shrink-0',
                'items-center justify-center',
                'rounded-lg',
                'bg-amber-500/10',
                'text-amber-400',
              ].join(' ')}
            >
              <AlertTriangle size={19} />
            </div>


            <div className="min-w-0">

              <AlertDialog.Title
                className={[
                  'text-base font-semibold',
                  'text-gray-100',
                ].join(' ')}
              >
                {title}
              </AlertDialog.Title>


              <AlertDialog.Description
                className={[
                  'mt-1.5',
                  'text-sm leading-6',
                  'text-gray-500',
                ].join(' ')}
              >
                {description}
              </AlertDialog.Description>

            </div>

          </div>


          {/* Actions */}
          <div
            className={[
              'mt-6',
              'flex justify-end gap-2',
            ].join(' ')}
          >

            <AlertDialog.Cancel
              disabled={loading}
              className={[
                'ui-button',
                'ui-button-secondary',
                'outline-none',
              ].join(' ')}
            >
              {cancelText}
            </AlertDialog.Cancel>


            <AlertDialog.Action
              onClick={handleConfirm}
              disabled={loading}
              className={[
                'ui-button',
                'ui-button-primary',
                'outline-none',
              ].join(' ')}
            >

              {loading && (
                <span
                  className={[
                    'h-3.5 w-3.5',
                    'animate-spin',
                    'rounded-full',
                    'border-2',
                    'border-black/20',
                    'border-t-black/60',
                  ].join(' ')}
                />
              )}

              {loading
                ? 'Please wait...'
                : confirmText}

            </AlertDialog.Action>

          </div>

        </AlertDialog.Content>

      </AlertDialog.Portal>

    </AlertDialog.Root>
  )
}

