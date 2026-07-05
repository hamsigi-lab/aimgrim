import { useState } from 'react'
import { createTask } from '../api'
import type { Category } from '../types'

interface Preset { title: string; category: Category; points: number; timeLabel?: string }

const GROUPS: { name: string; emoji: string; items: Preset[] }[] = [
  {
    name: '아침 루틴', emoji: '🌅', items: [
      { title: '일어나서 이불 정리하기', category: 'life', points: 5, timeLabel: '아침' },
      { title: '아침 스트레칭', category: 'health', points: 10, timeLabel: '아침' },
      { title: '물 한 잔 마시기', category: 'life', points: 5, timeLabel: '아침' },
    ],
  },
  {
    name: '공부', emoji: '📚', items: [
      { title: '오늘 숙제 하기', category: 'study', points: 20, timeLabel: '오후' },
      { title: '책 20분 읽기', category: 'study', points: 15 },
      { title: '영어 단어 10개 외우기', category: 'study', points: 15 },
    ],
  },
  {
    name: '운동·건강', emoji: '💪', items: [
      { title: '줄넘기 100개', category: 'health', points: 10 },
      { title: '30분 운동하기', category: 'health', points: 15 },
    ],
  },
  {
    name: '생활', emoji: '🌿', items: [
      { title: '책상·방 정리하기', category: 'life', points: 10, timeLabel: '자기 전' },
      { title: '준비물 스스로 챙기기', category: 'life', points: 10, timeLabel: '자기 전' },
      { title: '오늘 감사한 일 떠올리기', category: 'life', points: 10 },
    ],
  },
]

export function TemplatePicker({ childId, onClose, onSaved }: { childId: string; onClose: () => void; onSaved: () => void }) {
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  function toggle(key: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  async function add() {
    const chosen: Preset[] = []
    GROUPS.forEach((g) => g.items.forEach((it, i) => { if (picked.has(`${g.name}-${i}`)) chosen.push(it) }))
    if (chosen.length === 0) return
    setBusy(true)
    try {
      // 순서 유지를 위해 순차 생성
      for (const p of chosen) {
        await createTask({ childId, title: p.title, category: p.category, period: 'day', points: p.points, timeLabel: p.timeLabel })
      }
      onSaved(); onClose()
    } finally { setBusy(false) }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="추천 루틴">
        <div className="grip" />
        <h3>추천 루틴으로 시작하기 🌱</h3>
        <p className="sub">원하는 루틴을 골라 한 번에 담아보세요. 나중에 언제든 고칠 수 있어요.</p>

        {GROUPS.map((g) => (
          <div key={g.name} className="tpl-group">
            <div className="tpl-gh">{g.emoji} {g.name}</div>
            {g.items.map((it, i) => {
              const key = `${g.name}-${i}`
              const on = picked.has(key)
              return (
                <button type="button" key={key} className={`tpl-item${on ? ' on' : ''}`} onClick={() => toggle(key)}>
                  <span className={`tpl-check${on ? ' on' : ''}`} aria-hidden="true">{on ? '✓' : ''}</span>
                  <span className="tpl-title">{it.title}</span>
                  <span className="tpl-pts">+{it.points} ⭐</span>
                </button>
              )
            })}
          </div>
        ))}

        <button type="button" className="btn primary block" style={{ marginTop: 8 }} disabled={picked.size === 0 || busy} onClick={add}>
          {busy ? '담는 중…' : `${picked.size > 0 ? `${picked.size}개 ` : ''}담기`}
        </button>
      </div>
    </div>
  )
}
