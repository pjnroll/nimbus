"use client"

import { PaperclipIcon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  MAX_ATTACHMENT_BYTES,
  attachmentDownloadPath,
  formatFileSize,
} from "@/lib/attachments"
import type { ActivityAttachment } from "@/lib/types"

export function ActivityAttachmentLinks({
  activityId,
  attachments,
}: {
  activityId: string
  attachments: ActivityAttachment[]
}) {
  if (attachments.length === 0) return null
  return (
    <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
      {attachments.map((attachment) => (
        <li key={attachment.id}>
          <a
            href={attachmentDownloadPath(activityId, attachment.id)}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            <PaperclipIcon className="size-3" />
            {attachment.name}
          </a>
        </li>
      ))}
    </ul>
  )
}

export function ActivityAttachmentsField({
  activityId,
  attachments,
  pendingFiles,
  onPendingFiles,
  onUpload,
  onRemove,
  disabled,
}: {
  activityId?: string
  attachments: ActivityAttachment[]
  pendingFiles: File[]
  onPendingFiles: (files: File[]) => void
  onUpload?: (files: File[]) => Promise<void>
  onRemove?: (attachmentId: string) => Promise<void>
  disabled?: boolean
}) {
  async function onPick(list: FileList | null) {
    if (!list || list.length === 0) return
    const files = [...list]
    const tooBig = files.find((file) => file.size > MAX_ATTACHMENT_BYTES)
    if (tooBig) {
      toast.error(`“${tooBig.name}” supera i 20 MB`)
      return
    }
    if (onUpload && activityId) {
      try {
        await onUpload(files)
        toast.success(files.length === 1 ? "File allegato" : "File allegati")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Non riesco a caricare il file",
        )
      }
      return
    }
    onPendingFiles([...pendingFiles, ...files])
  }

  return (
    <div className="grid gap-2">
      <Input
        id="act-files"
        type="file"
        multiple
        disabled={disabled}
        onChange={(event) => {
          void onPick(event.target.files)
          event.target.value = ""
        }}
      />
      <p className="text-xs text-muted-foreground">Fino a 20 MB per file.</p>
      {attachments.length > 0 || pendingFiles.length > 0 ? (
        <ul className="grid gap-1.5">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center gap-2 text-sm"
            >
              {activityId ? (
                <a
                  href={attachmentDownloadPath(activityId, attachment.id)}
                  className="min-w-0 flex-1 truncate font-medium text-primary hover:underline"
                >
                  {attachment.name}
                </a>
              ) : (
                <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatFileSize(attachment.size)}
              </span>
              {onRemove && activityId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground"
                  disabled={disabled}
                  onClick={() => {
                    void onRemove(attachment.id).catch(() => {
                      toast.error("Non riesco a eliminare l’allegato")
                    })
                  }}
                >
                  <XIcon />
                  <span className="sr-only">Rimuovi {attachment.name}</span>
                </Button>
              ) : null}
            </li>
          ))}
          {pendingFiles.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground"
                disabled={disabled}
                onClick={() =>
                  onPendingFiles(pendingFiles.filter((_, i) => i !== index))
                }
              >
                <XIcon />
                <span className="sr-only">Rimuovi {file.name}</span>
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
