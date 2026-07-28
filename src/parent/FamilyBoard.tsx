import { Fragment, useEffect, useState } from 'react'
import { getBoard, type BoardChild } from '../api'

const fmtGut = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`

/** 부모용 '가족 나란히' — 사진 속 생활계획표처럼 왼쪽 시간축 + 자녀별 열을 한 화면에. 읽기 전용. */
export function FamilyBoard({ familyId, onOpenChild }: { familyId: string; onOpenChild: (id: string, name: string) => void }) {
  const [children, setChildren] = useState<BoardChild[] | null>(null)
  useEffect(() => { getBoard(familyId).then((r) => setChildren(r.children)).catch(() => setChildren([])) }, [familyId])

  if (children === null) return <p className="empty-hint">불러오는 중…</p>
  if (children.length === 0) return <p className="empty-hint">아직 등록된 자녀가 없어요.</p>

  const times = Array.from(new Set(children.flatMap((c) => c.tasks.filter((t) => t.startMin != null).map((t) => t.startMin!)))).sort((a, b) => a - b)
  const at = (c: BoardChild, m: number) => c.tasks.filter((t) => t.startMin === m)
  const inbox = (c: BoardChild) => c.tasks.filter((t) => t.startMin == null)
  const hasInbox = children.some((c) => inbox(c).length > 0)
  const anyTimed = times.length > 0

  const cell = (c: BoardChild, list: ReturnType<typeof at>) => (
    <div className="fb-cell" key={c.id}>
      {list.map((t) => (
        <div key={t.id} className={`fb-task ${t.category}${t.done ? ' done' : ''}`}>
          <span className="fb-mk" aria-hidden="true">{t.done ? '✔' : '○'}</span> {t.title}
        </div>
      ))}
    </div>
  )

  return (
    <div className="fboard-wrap">
      <div className="fboard" style={{ gridTemplateColumns: `44px repeat(${children.length}, minmax(116px, 1fr))` }}>
        <div className="fb-cell fb-corner" />
        {children.map((c) => (
          <button type="button" key={c.id} className="fb-cell fb-head" onClick={() => onOpenChild(c.id, c.name)}>{c.name}</button>
        ))}

        {times.map((m) => (
          <Fragment key={m}>
            <div className="fb-cell fb-time">{fmtGut(m)}</div>
            {children.map((c) => cell(c, at(c, m)))}
          </Fragment>
        ))}

        {hasInbox && (
          <Fragment>
            <div className="fb-cell fb-time inbox">언제든</div>
            {children.map((c) => cell(c, inbox(c)))}
          </Fragment>
        )}
      </div>
      {!anyTimed && !hasInbox && <p className="empty-hint" style={{ marginTop: 12 }}>오늘 계획이 아직 없어요.</p>}
      {!anyTimed && hasInbox && <p className="empty-hint" style={{ marginTop: 10 }}>시간을 정한 계획이 없어요. 아이 화면의 할일에 시간을 정하면 시간표로 정렬돼요.</p>}
    </div>
  )
}
