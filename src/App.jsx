import { useState, useEffect } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ikvvjkvkcqponibjodus.supabase.co";
const SUPABASE_KEY = "sb_publishable_XWo_rIfwPDnuXtdnz11WLQ_kQOSGor4";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


const COURSES = [
  "Product Strategy",
  "Growth Foundations",
  "Mastering Product Analytics",
  "Mastering Retention & Engagement",
  "Monetization & Pricing Strategy",
  "Product Leadership",
  "AI Strategy",
  "Mastering Experimentation",
  "Другой курс",
];

const TEAM = [
  "Mikhail K", "Mikhail P", "Maksim I", "Maksim S", "Egor M", "Alexandra S", "Evgenii B", "Evgenii S", "Giorgi", "Другой"
];

const HOURS = Array.from({ length: 14 }, (_, i) => {
  const h = i + 8;
  return `${h.toString().padStart(2, "0")}:00`;
});

function getWeekDates(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatDate(d) {
  return d.toISOString().split("T")[0];
}

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const colorMap = {
  "Mikhail": "#534AB7", "Akobir": "#0F6E56", "Maksim": "#993C1D",
  "Sergei P.": "#185FA5", "Anna": "#854F0B", "Daniil": "#993556",
  "Elsy": "#3B6D11", "Valentina": "#A32D2D", "George": "#0C447C",
};
function getColor(name) { return colorMap[name] || "#444"; }

const selectStyle = {
  width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e5e5",
  fontSize: 13, background: "#fff", color: "#1a1a1a", outline: "none", boxSizing: "border-box"
};
const inputStyle = {
  width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e5e5",
  fontSize: 13, background: "#fff", color: "#1a1a1a", outline: "none", boxSizing: "border-box"
};
const btnStyle = {
  padding: "9px 14px", borderRadius: 8, border: "none", cursor: "pointer",
  fontSize: 13, fontWeight: 500, transition: "opacity .15s"
};

export default function App() {
  const [bookings, setBookings] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: TEAM[0], course: COURSES[0], duration: 60 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("week");
  const [customName, setCustomName] = useState("");
  const [customCourse, setCustomCourse] = useState("");
  const [error, setError] = useState(null);

  const weekDates = getWeekDates(weekOffset);
  const today = formatDate(new Date());

  useEffect(() => { loadBookings(); }, []);

  async function loadBookings() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from("reforge_bookings").select("*");
    if (error) { setError(error.message); }
    else { setBookings(data || []); }
    setLoading(false);
  }

  function getSlotBooking(date, hour) {
    return bookings.find(b => b.date === date && b.hour === hour) || null;
  }

  function openModal(date, hour) {
    setForm({ name: TEAM[0], course: COURSES[0], duration: 60 });
    setCustomName(""); setCustomCourse("");
    setModal({ date, hour });
  }

  function openInfo(date, hour) {
    const b = getSlotBooking(date, hour);
    if (b) setModal({ date, hour, info: b });
  }

  async function handleBook() {
    if (!modal) return;
    const name = form.name === "Другой" ? customName.trim() : form.name;
    const course = form.course === "Другой курс" ? customCourse.trim() : form.course;
    if (!name || !course) return;

    setSaving(true);
    const slots = Math.ceil(form.duration / 60);
    const hourIdx = HOURS.indexOf(modal.hour);
    const rows = [];
    for (let i = 0; i < slots; i++) {
      if (hourIdx + i < HOURS.length) {
        rows.push({
          date: modal.date, hour: HOURS[hourIdx + i],
          name, course, duration: form.duration, start_hour: modal.hour
        });
      }
    }
    const { error } = await supabase.from("reforge_bookings").insert(rows);
    if (!error) { await loadBookings(); }
    setSaving(false);
    setModal(null);
  }

  async function handleDelete(booking) {
    setSaving(true);
    await supabase.from("reforge_bookings")
      .delete()
      .eq("date", booking.date)
      .eq("start_hour", booking.start_hour)
      .eq("name", booking.name);
    await loadBookings();
    setSaving(false);
    setModal(null);
  }

  function getStats() {
    const seen = new Set();
    const userHours = {}, courseHours = {};
    bookings.forEach(b => {
      const key = `${b.name}__${b.course}__${b.start_hour}__${b.date}`;
      if (seen.has(key)) return;
      seen.add(key);
      userHours[b.name] = (userHours[b.name] || 0) + b.duration / 60;
      courseHours[b.course] = (courseHours[b.course] || 0) + b.duration / 60;
    });
    return { userHours, courseHours };
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "#888", fontSize: 14 }}>
      Загружаем расписание…
    </div>
  );

  if (error) return (
    <div style={{ padding: 24, color: "#991b1b", fontSize: 13 }}>
      Ошибка подключения: {error}
      <button onClick={loadBookings} style={{ marginLeft: 12, ...btnStyle, background: "#f5f5f5", color: "#333" }}>Повторить</button>
    </div>
  );

  const stats = getStats();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#1a1a1a", background: "#fff", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ borderBottom: "1.5px solid #e5e5e5", padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, background: "#1a1a1a", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>R</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Reforge · Бронирование</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 4, background: "#f5f5f5", borderRadius: 8, padding: 3 }}>
          {["week", "stats"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500,
              background: view === v ? "#fff" : "transparent",
              color: view === v ? "#1a1a1a" : "#888",
              boxShadow: view === v ? "0 1px 3px rgba(0,0,0,.1)" : "none",
            }}>
              {v === "week" ? "Календарь" : "Статистика"}
            </button>
          ))}
        </div>
        {saving && <span style={{ fontSize: 11, color: "#999" }}>Сохраняем…</span>}
        <button onClick={loadBookings} style={{ border: "1px solid #e5e5e5", background: "#fff", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12, color: "#666" }}>↻</button>
      </div>

      {view === "week" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: "1px solid #f0f0f0" }}>
            <button onClick={() => setWeekOffset(w => w - 1)} style={{ border: "1px solid #e5e5e5", background: "#fff", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 13 }}>←</button>
            <span style={{ fontWeight: 500, fontSize: 13, minWidth: 200, textAlign: "center" }}>
              {weekDates[0].toLocaleDateString("ru", { day: "numeric", month: "long" })} — {weekDates[6].toLocaleDateString("ru", { day: "numeric", month: "long" })}
            </span>
            <button onClick={() => setWeekOffset(w => w + 1)} style={{ border: "1px solid #e5e5e5", background: "#fff", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 13 }}>→</button>
            <button onClick={() => setWeekOffset(0)} style={{ border: "1px solid #e5e5e5", background: "#fff", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, color: "#666" }}>Сегодня</button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 700, display: "grid", gridTemplateColumns: "52px repeat(7, 1fr)" }}>
              <div style={{ borderBottom: "1px solid #e5e5e5", padding: "8px 0" }} />
              {weekDates.map((d, i) => {
                const isToday = formatDate(d) === today;
                return (
                  <div key={i} style={{ borderBottom: "1px solid #e5e5e5", borderLeft: "1px solid #f0f0f0", padding: "8px 6px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>{DAY_LABELS[i]}</div>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", margin: "0 auto",
                      background: isToday ? "#1a1a1a" : "transparent",
                      color: isToday ? "#fff" : "#1a1a1a",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: isToday ? 600 : 400, fontSize: 13
                    }}>{d.getDate()}</div>
                  </div>
                );
              })}

              {HOURS.map(hour => (
                <>
                  <div key={`h-${hour}`} style={{
                    borderBottom: "1px solid #f5f5f5", padding: "0 6px",
                    display: "flex", alignItems: "flex-start", paddingTop: 6,
                    fontSize: 10, color: "#bbb", height: 48
                  }}>{hour}</div>
                  {weekDates.map((d) => {
                    const dateStr = formatDate(d);
                    const b = getSlotBooking(dateStr, hour);
                    const isStart = b && b.start_hour === hour;
                    const slots = b ? Math.ceil(b.duration / 60) : 1;
                    return (
                      <div key={`${dateStr}-${hour}`} style={{
                        borderBottom: "1px solid #f5f5f5", borderLeft: "1px solid #f0f0f0",
                        height: 48, position: "relative", cursor: "pointer"
                      }} onClick={() => b ? openInfo(dateStr, hour) : openModal(dateStr, hour)}>
                        {!b && (
                          <div style={{ position: "absolute", inset: 2, borderRadius: 4 }}
                            onMouseEnter={e => e.currentTarget.style.background = "#f5f5f5"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"} />
                        )}
                        {b && isStart && (
                          <div style={{
                            position: "absolute", left: 2, right: 2, top: 2,
                            height: slots * 48 - 6, borderRadius: 6,
                            background: getColor(b.name), padding: "4px 6px", zIndex: 2, overflow: "hidden"
                          }}>
                            <div style={{ color: "#fff", fontWeight: 600, fontSize: 11, lineHeight: 1.3 }}>{b.name}</div>
                            <div style={{ color: "rgba(255,255,255,.75)", fontSize: 10, lineHeight: 1.3, marginTop: 1 }}>{b.course}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
          <div style={{ padding: "10px 20px", fontSize: 11, color: "#bbb" }}>
            Нажми на пустой слот чтобы забронировать · Нажми на бронь чтобы посмотреть или удалить
          </div>
        </>
      )}

      {view === "stats" && (
        <div style={{ padding: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>По участникам</div>
              {Object.keys(stats.userHours).length === 0 && <div style={{ color: "#bbb", fontSize: 12 }}>Нет данных</div>}
              {Object.entries(stats.userHours).sort((a, b) => b[1] - a[1]).map(([name, h]) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: getColor(name), flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 12 }}>{name}</div>
                  <div style={{ fontSize: 11, color: "#666" }}>{h}ч</div>
                  <div style={{ width: 80, height: 4, background: "#f0f0f0", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: getColor(name), width: `${Math.min(100, h * 10)}%`, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>По курсам</div>
              {Object.keys(stats.courseHours).length === 0 && <div style={{ color: "#bbb", fontSize: 12 }}>Нет данных</div>}
              {Object.entries(stats.courseHours).sort((a, b) => b[1] - a[1]).map(([course, h]) => (
                <div key={course} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1, fontSize: 12 }}>{course}</div>
                  <div style={{ fontSize: 11, color: "#666" }}>{h}ч</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Book modal */}
      {modal && !modal.info && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 320, boxShadow: "0 8px 40px rgba(0,0,0,.15)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Забронировать слот</div>
            <div style={{ fontSize: 12, color: "#999", marginBottom: 20 }}>
              {new Date(modal.date).toLocaleDateString("ru", { weekday: "long", day: "numeric", month: "long" })}, {modal.hour}
            </div>
            <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 4 }}>Кто занимается</label>
            <select value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={selectStyle}>
              {TEAM.map(t => <option key={t}>{t}</option>)}
            </select>
            {form.name === "Другой" && (
              <input placeholder="Введи имя" value={customName} onChange={e => setCustomName(e.target.value)} style={{ ...inputStyle, marginTop: 6 }} />
            )}
            <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 4, marginTop: 14 }}>Курс</label>
            <select value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))} style={selectStyle}>
              {COURSES.map(c => <option key={c}>{c}</option>)}
            </select>
            {form.course === "Другой курс" && (
              <input placeholder="Название курса" value={customCourse} onChange={e => setCustomCourse(e.target.value)} style={{ ...inputStyle, marginTop: 6 }} />
            )}
            <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 4, marginTop: 14 }}>Длительность</label>
            <select value={form.duration} onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))} style={selectStyle}>
              {[60, 90, 120, 180].map(d => <option key={d} value={d}>{d === 60 ? "1 час" : d === 90 ? "1.5 часа" : d === 120 ? "2 часа" : "3 часа"}</option>)}
            </select>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button onClick={() => setModal(null)} style={{ ...btnStyle, flex: 1, background: "#f5f5f5", color: "#333" }}>Отмена</button>
              <button onClick={handleBook} style={{ ...btnStyle, flex: 2, background: "#1a1a1a", color: "#fff" }}>Забронировать</button>
            </div>
          </div>
        </div>
      )}

      {/* Info modal */}
      {modal && modal.info && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 300, boxShadow: "0 8px 40px rgba(0,0,0,.15)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: getColor(modal.info.name), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>
                {modal.info.name[0]}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{modal.info.name}</div>
                <div style={{ fontSize: 11, color: "#999" }}>
                  {new Date(modal.date).toLocaleDateString("ru", { day: "numeric", month: "long" })}, {modal.info.start_hour} · {modal.info.duration} мин
                </div>
              </div>
            </div>
            <div style={{ background: "#f5f5f5", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#444", marginBottom: 16 }}>
              {modal.info.course}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setModal(null)} style={{ ...btnStyle, flex: 1, background: "#f5f5f5", color: "#333" }}>Закрыть</button>
              <button onClick={() => handleDelete(modal.info)} style={{ ...btnStyle, flex: 1, background: "#fee2e2", color: "#991b1b" }}>Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
