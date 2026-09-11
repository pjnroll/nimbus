"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CloudIcon } from "lucide-react"
import { Suspense, useState } from "react"
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

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/"
  return value
}

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      const response = await fetch("/api/auth/login", {
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
            : "Accesso non riuscito"
        toast.error(message)
        return
      }
      resetClientStore()
      router.push(safeNext(searchParams.get("next")))
      router.refresh()
    } catch {
      toast.error("Accesso non riuscito")
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
        <CardTitle className="text-2xl">Accedi</CardTitle>
        <CardDescription>
          La tua scrivania resta sul server, isolata dagli altri account.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Accesso…" : "Entra"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          Non hai un account?{" "}
          <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            Registrati
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
