"use client"

import { useSearchParams } from "next/navigation"
import { CloudIcon, CompassIcon } from "lucide-react"
import { Suspense, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { safeNextPath } from "@/lib/auth/next-path"
import { googleOAuthOriginError } from "@/lib/auth/oauth-origin"

const LOGIN_ERRORS: Record<string, string> = {
  denied: "Accesso Google annullato.",
  closed:
    "La registrazione è disabilitata. Accedi con un account Google già presente.",
  oauth: "Accesso Google non riuscito.",
  config:
    "Accesso Google non configurato. Imposta GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.",
  origin:
    "Google non accetta il login da un IP o da HTTP, tranne localhost. Apri Nimbus su http://127.0.0.1:43123 su questa macchina, oppure da un nome HTTPS registrato nel client OAuth (con NIMBUS_APP_URL).",
}

function GoogleMark() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function LoginCard() {
  const searchParams = useSearchParams()
  const [allowRegister, setAllowRegister] = useState(true)
  const [originBlocked, setOriginBlocked] = useState(false)
  const next = safeNextPath(searchParams.get("next"))
  const href =
    next === "/"
      ? "/api/auth/google"
      : `/api/auth/google?next=${encodeURIComponent(next)}`

  useEffect(() => {
    setOriginBlocked(googleOAuthOriginError(window.location.origin))
  }, [])

  useEffect(() => {
    const code = searchParams.get("error")
    if (code && LOGIN_ERRORS[code]) {
      toast.error(LOGIN_ERRORS[code])
    }
  }, [searchParams])

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

  return (
    <Card className="w-full max-w-md bg-card shadow-md ring-0">
      <CardHeader className="gap-3">
        <div className="mb-1 flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <CloudIcon className="size-6" />
          </span>
          <p className="font-heading text-2xl font-semibold tracking-tight">
            Nimbus
          </p>
        </div>
        <CardTitle className="font-heading text-xl tracking-tight">
          Accedi
        </CardTitle>
        <CardDescription>
          Benvenuto. Accedi con Google per continuare.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {originBlocked ? (
          <p className="text-sm text-muted-foreground">{LOGIN_ERRORS.origin}</p>
        ) : (
          <Button
            nativeButton={false}
            render={<a href={href} />}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <GoogleMark />
            Continua con Google
          </Button>
        )}
        {allowRegister ? null : (
          <p className="text-sm text-muted-foreground">
            I nuovi account non sono accettati. Accedi con un Google già
            registrato.
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          oppure
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="grid gap-1.5">
          <Button
            nativeButton={false}
            render={<a href="/api/demo" />}
            variant="secondary"
            className="w-full"
            size="lg"
          >
            <CompassIcon />
            Esplora Nimbus
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Dati di esempio, sola lettura. Nessun account richiesto.
          </p>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          <a href="/privacy" className="underline underline-offset-4">
            Privacy
          </a>
        </p>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginCard />
    </Suspense>
  )
}
