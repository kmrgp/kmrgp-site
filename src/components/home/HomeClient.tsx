"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ShieldCheck, Users, Lock, Search, Landmark, Sparkles, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SafeImage } from "@/components/ui/safe-image"
import { PhotoLightbox } from "@/components/ui/PhotoLightbox"
import { useCountUp } from "@/lib/hooks/useCountUp"
import { useLang } from "@/lib/i18n/LanguageProvider"
import type { PublicProfile } from "@/types"

interface HomeClientProps {
  featured: PublicProfile[]
}

const STATS = [
  { target: 8500, suffix: "+", key: "home.stat.profiles" as const },
  { target: 1200, suffix: "+", key: "home.stat.unions" as const },
  { target: 10000, suffix: "+", key: "home.stat.families" as const },
  { target: 15, suffix: "+", key: "home.stat.years" as const },
]

const VALUES = [
  { icon: "⚔", hi: "वीरता", key: "home.values.veerta" as const },
  { icon: "🙏", hi: "सम्मान", key: "home.values.samman" as const },
  { icon: "🤝", hi: "विश्वास", key: "home.values.vishwas" as const },
  { icon: "🏛", hi: "परंपरा", key: "home.values.parampara" as const },
]

export function HomeClient({ featured }: HomeClientProps) {
  const { t } = useLang()
  const [lightbox, setLightbox] = useState<{ src: string; name?: string } | null>(null)

  const openLightbox = (src: string | null | undefined, name?: string) => {
    if (!src) return
    setLightbox({ src, name })
  }

  return (
    <main className="pt-[76px]">
      {/* Hero */}
      <section className="relative flex min-h-[min(92vh,820px)] items-center justify-center overflow-hidden px-4 py-20 sm:px-6 sm:py-24">
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/ram_sita_vivah.png')" }}
          aria-hidden
        />
        <div className="hero-overlay absolute inset-0" aria-hidden />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-maroon-deep/90 to-transparent"
          aria-hidden
        />

        <div className="relative z-10 mx-auto w-full max-w-4xl text-center text-white">
          <h1 className="hero-headline type-display mb-5 text-white sm:mb-6">
            {t("home.title")}
          </h1>
          <p className="hero-subtitle type-body-lg mx-auto mb-8 max-w-2xl text-white/90">
            {t("home.subtitle")}
          </p>

          <div className="mb-9 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <span className="hero-trust-pill">
              <ShieldCheck className="h-3.5 w-3.5 text-gold-bright" />
              {t("home.gotraVerified")}
            </span>
            <span className="hero-trust-pill">
              <Users className="h-3.5 w-3.5 text-gold-bright" />
              {t("home.elderApproved")}
            </span>
            <span className="hero-trust-pill">
              <Lock className="h-3.5 w-3.5 text-gold-bright" />
              {t("home.private")}
            </span>
          </div>

          <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Button asChild size="lg" className="shadow-saffron">
              <Link href="/profiles">
                <Search className="h-5 w-5" />
                {t("home.browseProfiles")}
              </Link>
            </Button>
            <Button
              variant="gold"
              asChild
              size="lg"
              className="border-gold-bright/80 text-gold-bright hover:border-gold-bright hover:bg-gold-bright/15 hover:text-white"
            >
              <Link href="#legacy">
                <Landmark className="h-5 w-5" />
                {t("home.exploreLegacy")}
              </Link>
            </Button>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:mt-14 sm:gap-4 md:grid-cols-4">
            {STATS.map((s, i) => (
              <StatBox
                key={s.key}
                target={s.target}
                suffix={s.suffix}
                label={t(s.key)}
                delayMs={i * 90}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="animate-fade-up bg-cream-dark py-14" style={{ animationDelay: "80ms" }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-6 md:grid-cols-5">
            <Step num="01" title={t("home.step1.title")} desc={t("home.step1.desc")} />
            <div className="hidden text-center text-2xl text-gold md:block"><ArrowRight className="mx-auto h-6 w-6" /></div>
            <Step num="02" title={t("home.step2.title")} desc={t("home.step2.desc")} />
            <div className="hidden text-center text-2xl text-gold md:block"><ArrowRight className="mx-auto h-6 w-6" /></div>
            <Step num="03" title={t("home.step3.title")} desc={t("home.step3.desc")} />
          </div>
        </div>
      </section>

      {/* Legacy */}
      <section id="legacy" className="bg-maroon py-20 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-6 md:flex-row">
          <div className="flex-1">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-gold bg-white/5">
              <Landmark className="h-8 w-8 text-gold" />
            </div>
            <h2 className="type-h2 mb-4 text-white">{t("home.legacyTitle")}</h2>
            <p className="type-body-lg text-cream-dark">{t("home.legacyDesc")}</p>
            <div className="my-6 flex items-center justify-center gap-4 text-gold">
              <span className="h-px w-20 bg-gradient-to-r from-transparent to-gold" />
              <span>❋</span>
              <span className="h-px w-20 bg-gradient-to-l from-transparent to-gold" />
            </div>
          </div>
          <div className="flex-1">
            <Image src="/images/maharana_pratap.png" alt="Maharana Pratap" width={500} height={400} className="rounded-2xl border-4 border-gold shadow-2xl" />
          </div>
        </div>
      </section>

      {/* Featured profiles */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <div className="type-eyebrow mb-3 inline-flex items-center gap-2">
              <span className="h-px w-6 bg-saffron" /> {t("home.featuredTag")}
              <span className="h-px w-6 bg-saffron" />
            </div>
            <h2 className="type-h2">{t("home.featuredTitle")}</h2>
            <p className="type-body-sm mx-auto mt-3 max-w-xl text-muted-foreground">{t("home.featuredSub")}</p>
          </div>

          <div className="columns-1 gap-6 md:columns-3 [column-gap:1.5rem]">
            {featured.map((profile) => (
              <Card key={profile.userId} className="hover-lift mb-6 inline-block w-full break-inside-avoid overflow-hidden">
                <button
                  type="button"
                  onClick={() => openLightbox(profile.imageUrl, profile.username ?? undefined)}
                  className={`relative block w-full bg-cream-dark ${profile.imageUrl ? "cursor-zoom-in" : "cursor-default"}`}
                  aria-label={`View photo of ${profile.username}`}
                  disabled={!profile.imageUrl}
                >
                  <SafeImage
                    src={profile.imageUrl}
                    name={profile.username ?? undefined}
                    alt={profile.username ?? ""}
                    natural
                    sizes="33vw"
                  />
                  <div className="absolute left-3 top-3 rounded-full bg-saffron px-3 py-1 text-xs font-bold text-white">{profile.type}</div>
                  <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-maroon px-3 py-1 text-xs font-bold text-white">
                    <ShieldCheck className="h-3 w-3" /> {t("modal.verified")}
                  </div>
                </button>
                <CardContent className="p-5">
                  <h3 className="type-h3 mb-2">{profile.username}</h3>
                  <p className="type-body-sm mb-1 text-muted-foreground">{profile.age} yrs • {profile.height}</p>
                  <p className="type-body-sm mb-1"><span className="font-semibold text-maroon">{t("modal.gotraSelf")}:</span> {profile.gotraSelf}</p>
                  <p className="type-body-sm mb-4"><span className="font-semibold text-maroon">{t("card.education")}:</span> {profile.education}</p>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/profiles">{t("home.viewDetails")}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gradient-to-br from-saffron to-maroon py-16 text-white">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="type-h2 mb-10 text-white">{t("home.valuesTitle")}</h2>
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
            {VALUES.map((v) => (
              <div key={v.key} className="hover-lift rounded-2xl border border-white/30 bg-white/10 p-6 backdrop-blur-sm">
                <div className="type-h2 mb-2 text-gold">{v.hi}</div>
                <div className="type-body-sm text-cream-dark">{t(v.key)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-cream py-20">
        <div className="mx-auto max-w-4xl rounded-3xl border-4 border-double border-maroon bg-white p-10 text-center shadow-lg">
          <h2 className="type-h2 mb-4">{t("home.ctaTitle")}</h2>
          <p className="type-body mb-8 text-muted-foreground">{t("home.ctaSub")}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/profiles"><Search className="h-5 w-5" /> {t("home.browseNow")}</Link>
            </Button>
            <Button variant="gold" size="lg" asChild>
              <Link href="/signup"><Sparkles className="h-5 w-5" /> {t("home.createFree")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <PhotoLightbox
        open={!!lightbox}
        onOpenChange={(o) => !o && setLightbox(null)}
        src={lightbox?.src}
        name={lightbox?.name}
      />
    </main>
  )
}

function StatBox({
  target,
  suffix,
  label,
  delayMs = 0,
}: {
  target: number
  suffix: string
  label: string
  delayMs?: number
}) {
  const { value, ref } = useCountUp(target)
  return (
    <div
      className="hero-stat-card animate-stat-pop press-scale"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div ref={ref} className="type-stat">
        {value.toLocaleString("en-IN")}
        {suffix}
      </div>
      <div className="type-stat-label mt-1">{label}</div>
    </div>
  )
}

function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="hover-lift rounded-2xl border border-gold-light bg-white p-6 shadow-sm">
      <div className="type-h2 mb-3 text-saffron">{num}</div>
      <h3 className="type-h3 mb-2">{title}</h3>
      <p className="type-body-sm text-muted-foreground">{desc}</p>
    </div>
  )
}