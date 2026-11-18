import { secureCookies } from "@/lib/auth/token"

export const DEMO_COOKIE = "nimbus_demo"

export function demoCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secureCookies(),
    path: "/",
    maxAge: 60 * 60 * 24,
  }
}
