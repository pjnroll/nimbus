"use client"

import { useRef } from "react"
import { toast } from "sonner"
import { DownloadIcon, MoreVerticalIcon, RotateCcwIcon, UploadIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { parseImportedStore, useNimbus } from "@/lib/store"

export function DataMenu() {
  const { store, replaceStore, resetToSeed } = useNimbus()
  const inputRef = useRef<HTMLInputElement>(null)

  function exportJson() {
    try {
      const blob = new Blob([JSON.stringify(store, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `nimbus-backup-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      toast.success("Backup scaricato")
    } catch {
      toast.error("Non riesco a esportare il file. Riprova.")
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      const text = await file.text()
      const next = parseImportedStore(text)
      replaceStore(next)
      toast.success("Backup importato")
    } catch {
      toast.error("File non valido. Serve un JSON esportato da Nimbus.")
    } finally {
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(event) => onFile(event.target.files?.[0])}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" className="text-sidebar-foreground" />}
        >
          <MoreVerticalIcon />
          <span className="sr-only">Backup e dati</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top">
          <DropdownMenuItem onClick={exportJson}>
            <DownloadIcon />
            Esporta JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => inputRef.current?.click()}>
            <UploadIcon />
            Importa JSON
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              resetToSeed()
              toast.message("Ripristinati i dati di esempio")
            }}
          >
            <RotateCcwIcon />
            Ripristina esempio
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
