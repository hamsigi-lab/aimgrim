import { useState } from 'react'
import { createStudyGoal, updateStudyGoal, deleteStudyGoal, type StudyGoal } from '../api'

function monthEnd(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10)
}

/** 순공 기간 누적목표 세우기 — 예: 여름방학 동안 200시간, 하루 3시간.
 *  숫자는 시간 단위(내부 저장은 분). 아이가 직접 조정 가능(압박 완화). */
export function StudyGoalEditor({ childId, today, existing, onClose, onSaved }: {
  childId: string
  today: string
  existing?: StudyGoal
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(existing?.title ?? '여름방학 순공')
  const [targetH, setTargetH] = useState(existing ? Math.round(existing.targetMin / 60) : 200)
  const [dailyH, setDailyH] = useState(existing?.dailyTargetMin ? existing.dailyTargetMin / 60 : 3)
  const [start, setStart] = useState(existing?.startDate ?? today)
  const [end, setEnd] = useState(existing?.endDate ?? monthEnd(today))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    if (targetH < 1) { setErr('목표 시간을 정해요.'); return }
    if (end < start) { setErr('종료일이 시작일보다 빨라요.'); return }
    setBusy(true); setErr(null)
    const input = { title: title.trim() || '순공 목표', targetMin: Math.round(targetH * 60), dailyTargetMin: dailyH > 0 ? Math.round(dailyH * 60) : undefined, startDate: start, endDate: end }
    try {
      if (existing) await updateStudyGoal(existing.id, input)
      else await createStudyGoal({ childId, ...input })
      onSaved(); onClose()
    } catch { setErr('저장에 실패했어요.'); setBusy(false) }
  }
  async function remove() {
    if (!existing) return
    setBusy(true)
    try { await deleteStudyGoal(existing.id); onSaved(); onClose() }
    catch { setErr('삭제에 실패했어요.'); setBusy(false) }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="순공 목표 세우기">
        <div className="grip" />
        <h3>{existing ? '순공 목표 고치기' : '순공 목표 세우기 ⏱'}</h3>
        <div className="form" style={{ marginTop: 10 }}>
          {err && <div className="formerr">{err}</div>}
          <div className="field">
            <label htmlFor="sg-title">목표 이름</label>
            <input id="sg-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 여름방학 순공" maxLength={24} />
          </div>
          <div className="field">
            <label>기간 동안 총 몇 시간?</label>
            <div className="stepper">
              <button type="button" onClick={() => setTargetH((h) => Math.max(1, h - 10))} aria-label="줄이기">−</button>
              <span className="pv">{targetH}시간</span>
              <button type="button" onClick={() => setTargetH((h) => Math.min(2000, h + 10))} aria-label="늘리기">+</button>
            </div>
          </div>
          <div className="field">
            <label>하루 목표 (선택)</label>
            <div className="stepper">
              <button type="button" onClick={() => setDailyH((h) => Math.max(0, Math.round((h - 0.5) * 10) / 10))} aria-label="줄이기">−</button>
              <span className="pv">{dailyH > 0 ? `${dailyH}시간` : '없음'}</span>
              <button type="button" onClick={() => setDailyH((h) => Math.min(16, Math.round((h + 0.5) * 10) / 10))} aria-label="늘리기">+</button>
            </div>
          </div>
          <div className="field">
            <label>기간 (방학처럼 직접 정해요)</label>
            <div className="daterange">
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              <span>~</span>
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <span className="hint">매일 순공하면 이 목표에 자동으로 쌓여요. 언제든 조정할 수 있어요 🙂</span>
          </div>
          <button type="button" className="btn primary block" disabled={busy} onClick={save}>{busy ? '저장 중…' : existing ? '고치기' : '목표 세우기'}</button>
          {existing && <button type="button" className="linkbtn" style={{ color: 'var(--crit)' }} onClick={remove} disabled={busy}>삭제하기</button>}
        </div>
      </div>
    </div>
  )
}
