"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { config } from "@/lib/config"
import { CreditCard, Zap, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BalanceInfo {
  source: "access_code" | "purchased" | "none"
  balance: string
  access_code: string | null
  issued_by: string | null
}

interface UsageRecord {
  id: string
  operation_type: string
  credits_used: string
  session_run_id: string | null
  created_at: string
}

interface UsageHistoryResponse {
  records: UsageRecord[]
  total: number
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function formatCredits(val: string | number) {
  return parseFloat(String(val)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function operationLabel(op: string) {
  return op
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function SubscriberBillingPage() {
  const { token } = useAuth()
  const [balance, setBalance] = useState<BalanceInfo | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [balanceError, setBalanceError] = useState<string | null>(null)

  const [records, setRecords] = useState<UsageRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [usageLoading, setUsageLoading] = useState(true)
  const [usageError, setUsageError] = useState<string | null>(null)

  const LIMIT = 20

  const fetchBalance = useCallback(async () => {
    if (!token) return
    setBalanceLoading(true)
    setBalanceError(null)
    try {
      const res = await fetch(config.getApiUrl(config.api.billing.balance), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`Failed to load balance (${res.status})`)
      setBalance(await res.json())
    } catch (err) {
      setBalanceError(err instanceof Error ? err.message : "Failed to load balance")
    } finally {
      setBalanceLoading(false)
    }
  }, [token])

  const fetchUsage = useCallback(async (p: number) => {
    if (!token) return
    setUsageLoading(true)
    setUsageError(null)
    try {
      const url = config.getApiUrl(`${config.api.billing.usage}?page=${p}&limit=${LIMIT}`)
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(`Failed to load usage (${res.status})`)
      const data: UsageHistoryResponse = await res.json()
      setRecords(data.records)
      setTotal(data.total)
      setTotalPages(data.pagination.totalPages)
    } catch (err) {
      setUsageError(err instanceof Error ? err.message : "Failed to load usage history")
    } finally {
      setUsageLoading(false)
    }
  }, [token])

  useEffect(() => { fetchBalance() }, [fetchBalance])
  useEffect(() => { fetchUsage(page) }, [fetchUsage, page])

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero — balance */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing &amp; Credits</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your credit balance and session usage history.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <CreditCard className="h-7 w-7 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">Available Credits</p>
          {balanceLoading ? (
            <div className="mt-1 h-8 w-32 animate-pulse rounded bg-muted" />
          ) : balanceError ? (
            <p className="mt-1 text-sm text-red-500">{balanceError}</p>
          ) : (
            <>
              <p className="text-3xl font-bold text-foreground">
                {formatCredits(balance?.balance ?? "0")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                Source:{" "}
                <span className="font-medium text-foreground">
                  {balance?.source === "access_code"
                    ? `Access Code${balance.access_code ? ` (${balance.access_code})` : ""}`
                    : balance?.source === "purchased"
                    ? "Purchased"
                    : "No balance"}
                </span>
              </p>
            </>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchBalance} disabled={balanceLoading}>
          Refresh
        </Button>
      </div>

      {/* Usage history */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Usage History
          </h2>
          {total > 0 && (
            <span className="text-xs text-muted-foreground">{total} total records</span>
          )}
        </div>

        {usageLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : usageError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {usageError}
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-14 text-center">
            <Zap className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No usage records yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Credits are consumed when you run AI sessions.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Operation</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Session Run</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Credits Used</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((r) => (
                    <tr key={r.id} className="bg-card hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {operationLabel(r.operation_type)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {r.session_run_id ? r.session_run_id.slice(0, 8) + "…" : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-red-500 font-medium">
                        -{formatCredits(r.credits_used)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                        {formatDate(r.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
