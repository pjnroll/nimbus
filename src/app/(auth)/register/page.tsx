"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { CloudIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resetClientStore } from "@/lib/store"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [allowRegister, setAllowRegister] = useState(true)

  useEffect(() => {
    void fetch("/api/auth/config")
      .then((response) => response.json())
      .then((payload: unknown) => {
        if (
          payload &&
          typeof payload === "object" &&
          "allowRegister" in payload
        ) {
          setAllowRegister(Boolean(payload.allowRegister))
        }
      })
      .catch(() => undefined)
  }, [])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Registrazione non riuscita"
        toast.error(message)
        return
      }
      resetClientStore()
      router.push("/")
      router.refresh()
    } catch {
      toast.error("Registrazione non riuscita")
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="mb-2 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
            <CloudIcon className="size-5" />
          </span>
          <p className="font-heading text-lg font-semibold">Nimbus</p>
        </div>
        <CardTitle className="text-2xl">Crea un account</CardTitle>
        <CardDescription>
          Ogni persona ha la propria scrivania. Il primo account recupera i
          dati già salvati su questo server, se ci sono.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {allowRegister ? (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Almeno 8 caratteri.</p>
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Creazione…" : "Crea account"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            La registrazione è disabilitata. Chiedi a chi amministra Nimbus un
            account, oppure accedi se ne hai già uno.
          </p>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          Hai già un account?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Accedi
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
