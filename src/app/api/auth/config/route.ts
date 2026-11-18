import { NextResponse } from "next/server"
import { googleCredentials } from "@/lib/auth/google"
import { canRegister } from "@/lib/auth/users"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({
    allowRegister: await canRegister(),
    google: Boolean(googleCredentials()),
  })
}
