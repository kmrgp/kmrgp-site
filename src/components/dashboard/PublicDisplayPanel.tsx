"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Eye,
  EyeOff,
  Star,
  StarOff,
  Sprout,
  Users,
  LayoutGrid,
  Loader2,
  Search,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  listAllMembersAction,
  setProfilePublicDisplayAction,
  hideAllSeedProfilesAction,
  getPublicDisplayStatsAction,
} from "@/lib/actions/admin"
import { useLang } from "@/lib/i18n/LanguageProvider"
import { resolveActionError } from "@/lib/i18n/actionErrors"
import type { PublicProfile, PublicDisplayStats } from "@/types"

type FilterMode = "all" | "public" | "hidden" | "seed" | "real"

export function PublicDisplayPanel() {
  const { t } = useLang()
  const [members, setMembers] = useState<PublicProfile[]>([])
  const [stats, setStats] = useState<PublicDisplayStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<FilterMode>("all")
  const [busyId, setBusyId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    const [mRes, sRes] = await Promise.all([listAllMembersAction(), getPublicDisplayStatsAction()])
    setLoading(false)
    if (mRes.success) setMembers(mRes.members as PublicProfile[])
    if (sRes.success && sRes.stats) setStats(sRes.stats as PublicDisplayStats)
  }

  useEffect(() => {
    load()
  }, [])

  const approved = useMemo(
    () => members.filter((m) => m.approvalStatus === "APPROVED"),
    [members]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return approved.filter((p) => {
      if (filter === "public" && !p.visible) return false
      if (filter === "hidden" && p.visible) return false
      if (filter === "seed" && !p.isSeed) return false
      if (filter === "real" && p.isSeed) return false
      if (!q) return true
      return (
        (p.username?.toLowerCase().includes(q) ?? false) ||
        (p.phone?.toLowerCase().includes(q) ?? false) ||
        (p.district?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [approved, filter, query])

  async function toggleVisible(userId: number, visible: boolean) {
    setBusyId(userId)
    const res = await setProfilePublicDisplayAction(userId, { visible })
    setBusyId(null)
    if (!res.success) {
      toast.error(resolveActionError(res.error, t))
      return
    }
    toast.success(visible ? t("admin.nowPublic") : t("admin.nowHidden"))
    load()
  }

  async function toggleFeatured(userId: number, featured: boolean) {
    setBusyId(userId)
    const res = await setProfilePublicDisplayAction(userId, { featured })
    setBusyId(null)
    if (!res.success) {
      toast.error(resolveActionError(res.error, t))
      return
    }
    toast.success(featured ? t("admin.nowFeatured") : t("admin.unfeatured"))
    load()
  }

  async function hideAllSeed() {
    if (!confirm(t("admin.hideSeedConfirm"))) return
    const res = await hideAllSeedProfilesAction()
    if (!res.success) {
      toast.error(resolveActionError(res.error, t))
      return
    }
    toast.success(t("admin.hideSeedDone", { n: res.count ?? 0 }))
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t("admin.loading")}
      </div>
    )
  }

  const canSuggestHideSeed = (stats?.publicReal ?? 0) >= 3 && (stats?.publicSeed ?? 0) > 0

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          <MiniStat icon={LayoutGrid} label={t("admin.publicTotal")} value={stats.publicTotal} />
          <MiniStat icon={Users} label={t("admin.publicReal")} value={stats.publicReal} />
          <MiniStat icon={Sprout} label={t("admin.publicSeed")} value={stats.publicSeed} />
          <MiniStat icon={Star} label={t("admin.featuredCount")} value={stats.featuredCount} />
        </div>
      )}

      {canSuggestHideSeed && (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">{t("admin.hideSeedHint", { n: stats?.publicReal ?? 0 })}</p>
          <Button className="mt-3" variant="outline" size="sm" onClick={hideAllSeed}>
            <EyeOff className="mr-2 h-4 w-4" /> {t("admin.hideAllSeed")}
          </Button>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "public", "hidden", "real", "seed"] as FilterMode[]).map((mode) => (
          <Button
            key={mode}
            size="sm"
            variant={filter === mode ? "default" : "outline"}
            onClick={() => setFilter(mode)}
          >
            {t(`admin.filter.${mode}` as "admin.filter.all")}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("admin.searchMembers")}
            className="pl-9"
          />
        </div>
        {query && (
          <Button variant="outline" size="sm" onClick={() => setQuery("")}>
            <RotateCcw className="mr-1 h-4 w-4" /> {t("profiles.reset")}
          </Button>
        )}
        {(stats?.publicSeed ?? 0) > 0 && !canSuggestHideSeed && (
          <Button variant="outline" size="sm" onClick={hideAllSeed}>
            <EyeOff className="mr-1 h-4 w-4" /> {t("admin.hideAllSeed")}
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">{t("admin.noPublicProfiles")}</Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-cream/50">
                <TableHead>{t("admin.name")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("admin.location")}</TableHead>
                <TableHead>{t("admin.publicCol")}</TableHead>
                <TableHead>{t("admin.featuredCol")}</TableHead>
                <TableHead className="text-right">{t("admin.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.userId}>
                  <TableCell className="font-semibold text-maroon">
                    <div className="flex items-center gap-2">
                      {p.username}
                      {p.isSeed && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                          {t("admin.seedBadge")}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {p.district}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                        p.visible ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {p.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {p.visible ? t("admin.onPublic") : t("admin.offPublic")}
                    </span>
                  </TableCell>
                  <TableCell>
                    {p.featured ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-saffron">
                        <Star className="h-3.5 w-3.5 fill-saffron" /> {t("admin.featuredYes")}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === p.userId}
                        onClick={() => toggleVisible(p.userId, !p.visible)}
                      >
                        {p.visible ? (
                          <><EyeOff className="mr-1 h-3.5 w-3.5" /> {t("admin.hidePublic")}</>
                        ) : (
                          <><Eye className="mr-1 h-3.5 w-3.5" /> {t("admin.showPublic")}</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant={p.featured ? "secondary" : "outline"}
                        disabled={busyId === p.userId || !p.visible}
                        title={!p.visible ? t("admin.featureRequiresPublic") : undefined}
                        onClick={() => toggleFeatured(p.userId, !p.featured)}
                      >
                        {p.featured ? (
                          <><StarOff className="mr-1 h-3.5 w-3.5" /> {t("admin.unfeature")}</>
                        ) : (
                          <><Star className="mr-1 h-3.5 w-3.5" /> {t("admin.feature")}</>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: number
}) {
  return (
    <Card className="flex items-center gap-3 border p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-dark">
        <Icon className="h-4 w-4 text-maroon" />
      </div>
      <div>
        <div className="font-heading text-xl font-bold leading-none text-maroon">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </Card>
  )
}
