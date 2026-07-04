"use client"

import { useState, useEffect } from "react"
import Image, { type ImageProps } from "next/image"
import { cn } from "@/lib/utils"

interface SafeImageProps extends Omit<ImageProps, "src" | "onError"> {
  src: string | null | undefined
  /** Name used to seed the generated fallback avatar. */
  name?: string
  /** Render at intrinsic aspect ratio (full image, no crop). */
  natural?: boolean
}

function fallbackUrl(name?: string): string {
  const initials = (name || "??")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "??"
  const bg = "800020" // maroon
  const color = "FFFFFF"
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bg}&color=${color}&size=256&bold=true`
}

/**
 * A next/image wrapper that gracefully falls back to a generated ui-avatars
 * avatar when the source is missing or fails to load. Centralizes the dignity
 * guarantee: no broken-image icons ever reach the user.
 */
export function SafeImage({ src, name, alt, className, fill, natural, ...rest }: SafeImageProps) {
  const [errored, setErrored] = useState(false)
  const [current, setCurrent] = useState<string | null>(src ?? null)

  useEffect(() => {
    setErrored(false)
    setCurrent(src ?? null)
  }, [src])

  const effective = errored || !current ? fallbackUrl(name) : current

  if (natural) {
    return (
      // Native img preserves each photo's true height (Pinterest-style masonry tiles).
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={effective}
        alt={alt ?? name ?? "profile photo"}
        className={cn("block w-full h-auto", className)}
        onError={() => setErrored(true)}
        loading="lazy"
        decoding="async"
      />
    )
  }

  if (fill) {
    return (
      <Image
        {...rest}
        src={effective}
        alt={alt ?? name ?? "profile photo"}
        fill
        className={cn(className)}
        onError={() => setErrored(true)}
        unoptimized
      />
    )
  }

  return (
    <Image
      {...rest}
      src={effective}
      alt={alt ?? name ?? "profile photo"}
      className={cn(className)}
      onError={() => setErrored(true)}
      unoptimized
    />
  )
}