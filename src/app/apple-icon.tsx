import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #5B6CFF 0%, #3A4AD4 100%)",
          borderRadius: 40,
        }}
      >
        <svg
          width="118"
          height="118"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#FFFFFF"
            d="M9.2 20.6c-1.85 0-3.35-1.45-3.35-3.25 0-1.7 1.3-3.1 2.95-3.3.35-2.35 2.4-4.15 4.9-4.15 1.55 0 2.95.7 3.85 1.8.7-.45 1.55-.7 2.45-.7 2.35 0 4.25 1.8 4.4 4.1 1.55.25 2.75 1.55 2.75 3.15 0 1.8-1.5 3.25-3.35 3.25H9.2Z"
          />
          <circle cx="22.2" cy="12.4" r="1.55" fill="#C8D0FF" />
        </svg>
      </div>
    ),
    { ...size },
  )
}
