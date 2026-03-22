/**
 * 轮询周期内的临时状态。
 *
 * currentDraft: 用于 SKU 输入阶段的短期草稿
 * currentProcessingComplaint: 用于最终 success / failed 回写时保留 sku
 *
 * 其中 currentProcessingComplaint 会同步到 sessionStorage，
 * 避免页面切换或 content script 重载后丢失当前处理中的投诉标识。
 */
export type ComplaintDraft = {
  id: number
  sku: string
  createdAt: number
}

const PROCESSING_COMPLAINT_SKU_KEY = 'ozon_auto_processing_complaint_sku'
const STOP_STATS_KEY = 'ozon_auto_stop_stats'

type ComplaintStopCategory = 'completed' | 'interrupted'

export type ComplaintStopStats = {
  completed: number
  interrupted: number
  lastReason: string | null
  updatedAt: number | null
}

const DEFAULT_STOP_STATS: ComplaintStopStats = {
  completed: 0,
  interrupted: 0,
  lastReason: null,
  updatedAt: null
}

function readPersistedProcessingComplaint() {
  const sku = sessionStorage.getItem(PROCESSING_COMPLAINT_SKU_KEY)
  return sku ? { sku } : null
}

function readPersistedStopStats(): ComplaintStopStats {
  const raw = sessionStorage.getItem(STOP_STATS_KEY)
  if (!raw) return { ...DEFAULT_STOP_STATS }

  try {
    const parsed = JSON.parse(raw) as Partial<ComplaintStopStats>
    return {
      completed: typeof parsed.completed === 'number' ? parsed.completed : 0,
      interrupted: typeof parsed.interrupted === 'number' ? parsed.interrupted : 0,
      lastReason: typeof parsed.lastReason === 'string' ? parsed.lastReason : null,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : null
    }
  } catch {
    return { ...DEFAULT_STOP_STATS }
  }
}

export const complaintTickState: {
  currentDraft: ComplaintDraft | null
  currentProcessingComplaint: { sku: string } | null
  stopStats: ComplaintStopStats
} = {
  currentDraft: null,
  currentProcessingComplaint: readPersistedProcessingComplaint(),
  stopStats: readPersistedStopStats()
}

export function setCurrentProcessingComplaint(sku: string | null) {
  complaintTickState.currentProcessingComplaint = sku ? { sku } : null
  if (sku) {
    sessionStorage.setItem(PROCESSING_COMPLAINT_SKU_KEY, sku)
    return
  }
  sessionStorage.removeItem(PROCESSING_COMPLAINT_SKU_KEY)
}

export function recordComplaintStopEvent(
  category: ComplaintStopCategory,
  reason: string
): ComplaintStopStats {
  const next: ComplaintStopStats = {
    ...complaintTickState.stopStats,
    completed:
      category === 'completed'
        ? complaintTickState.stopStats.completed + 1
        : complaintTickState.stopStats.completed,
    interrupted:
      category === 'interrupted'
        ? complaintTickState.stopStats.interrupted + 1
        : complaintTickState.stopStats.interrupted,
    lastReason: reason,
    updatedAt: Date.now()
  }

  complaintTickState.stopStats = next
  sessionStorage.setItem(STOP_STATS_KEY, JSON.stringify(next))
  return next
}

export function resetComplaintStopStats() {
  complaintTickState.stopStats = { ...DEFAULT_STOP_STATS }
  sessionStorage.removeItem(STOP_STATS_KEY)
}

/**
 * 在新会话开启、流程中断或任务完成后重置轮询缓存。
 */
export function resetComplaintDraftState() {
  complaintTickState.currentDraft = null
  setCurrentProcessingComplaint(null)
}
