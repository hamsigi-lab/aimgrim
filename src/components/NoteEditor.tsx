import { useState } from 'react'
import { setTaskNote } from '../api'
import type { ScheduleItem } from '../types'

/** 완료 항목에 '오늘 무엇을 했는지' 한 줄 기록 + 소요 시간(선택). 공부 내용 기록. */
export function NoteEditor({ task, childId, date, onClose, onSaved }: {
  task: ScheduleItem
  childId: string
  date: string
  onClose: () => void
  onSaved: () => void
}) {
  const [note, setNote] = useState(task.note ?? '')
  const [minutes, setMinutes] = useState<number>(task.minutes ?? 0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setBusy(true); setErr(null)
    try {
      await setTaskNote(task.id, { childId, date, note: note.trim(), minutes })
      onSaved(); onClose()
    } catch { setErr('저장에 실패했어요.'); setBusy(false) }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="공부 기록">
        <div className="grip" />
        <h3>무엇을 했는지 기록해요 📝</h3>
        <p className="note-sub">{task.title}</p>
        <div className="form" style={{ marginTop: 10 }}>
          {err && <div className="formerr">{err}</div>}
          <div className="field">
            <label htmlFor="n-note">오늘 한 내용 (선택)</label>
            <input id="n-note" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="예: 수학 32~35쪽, 오답노트 정리" maxLength={60} autoFocus />
          </div>
          <div className="field">
            <label htmlFor="n-min">걸린 시간 (분, 선택)</label>
            <div className="stepper">
              <button type="button" onClick={() => setMinutes((m) => Math.max(0, m - 5))} aria-label="줄이기">−</button>
              <span className="pv">{minutes > 0 ? `${minutes}분` : '기록 안 함'}</span>
              <button type="button" onClick={() => setMinutes((m) => Math.min(600, m + 5))} aria-label="늘리기">+</button>
            </div>
          </div>
          <button type="button" className="btn primary block" disabled={busy} onClick={save}>
            {busy ? '저장 중…' : '기록하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
