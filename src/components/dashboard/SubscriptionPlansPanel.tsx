"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { CreditCard, Loader2, Plus, Star, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  listSubscriptionPlansAction,
  saveSubscriptionPlanAction,
  togglePlanActiveAction,
  setDefaultPlanAction,
} from "@/lib/actions/subscription"
import { useLang } from "@/lib/i18n/LanguageProvider"
import { resolveActionError } from "@/lib/i18n/actionErrors"

interface PlanRow {
  id: number
  name: string
  description: string | null
  amountInr: number
  durationDays: number
  active: boolean
  isDefault: boolean
}

const emptyForm = {
  name: "",
  description: "",
  amountInr: "501",
  durationDays: "365",
  active: true,
  isDefault: false,
}

export function SubscriptionPlansPanel() {
  const { t } = useLang()
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await listSubscriptionPlansAction()
    setLoading(false)
    if (res.success) setPlans(res.plans as PlanRow[])
  }

  useEffect(() => {
    load()
  }, [])

  function startCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function startEdit(plan: PlanRow) {
    setEditingId(plan.id)
    setForm({
      name: plan.name,
      description: plan.description ?? "",
      amountInr: String(plan.amountInr),
      durationDays: String(plan.durationDays),
      active: plan.active,
      isDefault: plan.isDefault,
    })
    setShowForm(true)
  }

  async function save() {
    setSaving(true)
    const res = await saveSubscriptionPlanAction(editingId, {
      name: form.name.trim(),
      description: form.description.trim(),
      amountInr: Number(form.amountInr),
      durationDays: Number(form.durationDays),
      active: form.active,
      isDefault: form.isDefault,
    })
    setSaving(false)
    if (!res.success) {
      toast.error(resolveActionError(res.error, t))
      return
    }
    toast.success(t("sub.planSaved"))
    setShowForm(false)
    load()
  }

  async function toggleActive(plan: PlanRow) {
    const res = await togglePlanActiveAction(plan.id, !plan.active)
    if (!res.success) {
      toast.error(resolveActionError(res.error, t))
      return
    }
    load()
  }

  async function makeDefault(id: number) {
    const res = await setDefaultPlanAction(id)
    if (!res.success) {
      toast.error(resolveActionError(res.error, t))
      return
    }
    toast.success(t("sub.defaultSet"))
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t("admin.loading")}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-xl font-bold text-maroon">{t("sub.adminTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("sub.adminDesc")}</p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" /> {t("sub.addPlan")}
        </Button>
      </div>

      {showForm && (
        <Card className="space-y-4 border-gold-light p-6">
          <h4 className="font-heading font-bold text-maroon">
            {editingId ? t("sub.editPlan") : t("sub.addPlan")}
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("sub.planName")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("sub.amountInr")}</Label>
              <Input
                type="number"
                min={0}
                value={form.amountInr}
                onChange={(e) => setForm({ ...form, amountInr: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("sub.durationDays")}</Label>
              <Input
                type="number"
                min={1}
                value={form.durationDays}
                onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("sub.description")}</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              {t("sub.active")}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              />
              {t("sub.defaultPlan")}
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? t("sub.saving") : t("sub.savePlan")}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              {t("admin.cancel")}
            </Button>
          </div>
        </Card>
      )}

      {plans.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">{t("sub.noPlans")}</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <Card key={plan.id} className={`p-5 ${plan.isDefault ? "border-saffron ring-1 ring-saffron/30" : ""}`}>
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-maroon" />
                    <h4 className="font-heading text-lg font-bold text-maroon">{plan.name}</h4>
                    {plan.isDefault && (
                      <span className="rounded-full bg-saffron/20 px-2 py-0.5 text-[10px] font-bold uppercase text-saffron">
                        {t("sub.defaultPlan")}
                      </span>
                    )}
                  </div>
                  {plan.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    plan.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {plan.active ? t("sub.active") : t("sub.inactive")}
                </span>
              </div>
              <p className="font-heading text-2xl font-bold text-maroon">
                ₹{plan.amountInr}
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}/ {plan.durationDays} {t("sub.days")}
                </span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(plan)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> {t("sub.editPlan")}
                </Button>
                {!plan.isDefault && (
                  <Button size="sm" variant="outline" onClick={() => makeDefault(plan.id)}>
                    <Star className="mr-1 h-3.5 w-3.5" /> {t("sub.makeDefault")}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => toggleActive(plan)}>
                  {plan.active ? t("sub.deactivate") : t("sub.activate")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
