import { useState } from 'react'
import api from '../api'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const COLORS = ['#3b82f6','#ef4444','#22c55e','#f59e0b','#8b5cf6','#ec4899','#14b8a6']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

interface CalendarEvent {
  _id?: string
  date: string
  title: string
  type: string
  color?: string
}

interface Props {
  events: CalendarEvent[]
  courseId: string
  onEventChange: () => void
}

export default function Calendar({ events, courseId, onEventChange }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [showModal, setShowModal] = useState(false)
  const [modalDate, setModalDate] = useState('')
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formType, setFormType] = useState('other')
  const [formColor, setFormColor] = useState(COLORS[0])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  const openAdd = (dateStr: string) => {
    setModalDate(dateStr)
    setEditEvent(null)
    setFormTitle('')
    setFormType('other')
    setFormColor(COLORS[0])
    setShowModal(true)
  }

  const openEdit = (e: CalendarEvent) => {
    setModalDate(e.date)
    setEditEvent(e)
    setFormTitle(e.title)
    setFormType(e.type)
    setFormColor(e.color || COLORS[0])
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formTitle.trim()) return
    try {
      if (editEvent?._id) {
        await api.put(`/courses/${courseId}/events/${editEvent._id}`, {
          title: formTitle, type: formType, color: formColor,
        })
      } else {
        await api.post(`/courses/${courseId}/events`, {
          date: modalDate, title: formTitle, type: formType, color: formColor,
        })
      }
      setShowModal(false)
      onEventChange()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async () => {
    if (!editEvent?._id) return
    try {
      await api.delete(`/courses/${courseId}/events/${editEvent._id}`)
      setShowModal(false)
      onEventChange()
    } catch (err) {
      console.error(err)
    }
  }

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.date === dateStr)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={prevMonth} style={navBtn}>&larr;</button>
        <h3 style={{ margin: 0 }}>{MONTHS[month]} {year}</h3>
        <button onClick={nextMonth} style={navBtn}>&rarr;</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 13, padding: 6, background: '#f1f5f9' }}>{d}</div>
        ))}
        {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayEvents = getEventsForDay(day)
          const isToday = dateStr === todayStr
          return (
            <div
              key={day}
              onClick={() => openAdd(dateStr)}
              style={{
                minHeight: 80, border: '1px solid #e2e8f0', borderRadius: 4, padding: 4,
                background: isToday ? '#eff6ff' : '#fff', cursor: 'pointer', position: 'relative',
              }}
            >
              <span style={{
                fontSize: 12, fontWeight: isToday ? 'bold' : 'normal',
                color: isToday ? '#fff' : '#1e293b',
                display: 'inline-block', width: 22, height: 22, lineHeight: '22px',
                textAlign: 'center', borderRadius: '50%',
                background: isToday ? '#2563eb' : 'transparent',
              }}>{day}</span>
              {dayEvents.slice(0, 3).map((ev, ei) => (
                <div
                  key={ei}
                  onClick={(e) => { e.stopPropagation(); openEdit(ev) }}
                  style={{
                    fontSize: 10, padding: '1px 4px', borderRadius: 3, marginTop: 2,
                    background: ev.color || COLORS[0], color: '#fff',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                  title={ev.title}
                >{ev.title}</div>
              ))}
              {dayEvents.length > 3 && (
                <div style={{ fontSize: 10, color: '#888', textAlign: 'right' }}>+{dayEvents.length - 3}</div>
              )}
            </div>
          )
        })}
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 400, maxWidth: '90%' }}>
            <h3 style={{ margin: 0 }}>{editEvent ? 'Edit Event' : `Add Event for ${modalDate}`}</h3>
            <input placeholder="Event title" value={formTitle} onChange={e => setFormTitle(e.target.value)} style={modalInput} autoFocus />
            <select value={formType} onChange={e => setFormType(e.target.value)} style={modalInput}>
              <option value="exam">Exam</option>
              <option value="quiz">Quiz</option>
              <option value="assignment">Assignment</option>
              <option value="project">Project</option>
              <option value="other">Other</option>
            </select>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Color:</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setFormColor(c)} style={{
                    width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: formColor === c ? '3px solid #1e293b' : '3px solid transparent',
                  }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {editEvent && <button onClick={handleDelete} style={{ ...btn, background: '#ef4444' }}>Delete</button>}
              <button onClick={() => setShowModal(false)} style={{ ...btn, background: '#94a3b8' }}>Cancel</button>
              <button onClick={handleSave} style={{ ...btn, background: '#3b82f6' }}>{editEvent ? 'Save' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const navBtn: React.CSSProperties = { padding: '4px 12px', border: '1px solid #ddd', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 16 }
const modalInput: React.CSSProperties = { display: 'block', width: '100%', margin: '12px 0', padding: 10, fontSize: 14, borderRadius: 6, border: '1px solid #d1d5db' }
const btn: React.CSSProperties = { padding: '8px 16px', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }
