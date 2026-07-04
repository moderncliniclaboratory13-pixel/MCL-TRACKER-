import React, { useState, useEffect, useMemo } from "react";
import { Plus, Search, X, Check, Clock, User, Phone, FileText, AlertTriangle, Loader2 } from "lucide-react";
import { db } from "./firebase";
import { collection, doc, setDoc, onSnapshot, getDoc } from "firebase/firestore";

const STAFF = ["Mahesh", "Rajesh Chib", "Shubham Chib", "Shesh Pal Sethi"];
const TESTS = [
  "Blood Glucose", "Blood Glucose Fasting", "Blood Glucose PP", "HbA1c",
  "CBC", "Hemogram", "HB", "ESR", "Platelet Count", "Blood Group",
  "Uric Acid", "Cholesterol", "TG", "Lipid Profile",
  "SGOT", "SGPT", "LFT", "KFT", "Urea", "Creatinine", "Bilirubin (Total/Direct)",
  "Total Protein", "Albumin", "Calcium", "Sodium/Potassium (Electrolytes)",
  "TSH", "TFT", "Vitamin D", "Vitamin B12", "Iron Studies", "Ferritin",
  "PT/INR", "Widal Test", "Malaria Test", "Dengue Test", "Typhoid Test",
  "HIV", "HBsAg", "HCV",
  "Urine Routine", "Urine Culture", "Urine Microalbumin", "Pregnancy Test (Beta hCG)",
  "Stool Routine",
  "1.1", "1.2", "1.3"
];
const STATUS = ["Pending", "Ready", "Delivered"];

const STATUS_STYLE = {
  Pending: { bg: "#FEF2F2", border: "#FCA5A5", text: "#991B1B", dot: "#EF4444" },
  Ready: { bg: "#FFFBEB", border: "#FCD34D", text: "#92400E", dot: "#F59E0B" },
  Delivered: { bg: "#F0FDF4", border: "#86EFAC", text: "#166534", dot: "#22C55E" },
};

const TEAL = "#0F766E";
const TEAL_DARK = "#0B5A54";

function emptyForm() {
  return {
    name: "", age: "", sex: "", tests: [], status: "Pending",
    deliveredBy: "", collectedBy: "", contact: "", remarks: "",
    sampleDate: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
    deliveredAt: "",
  };
}

function fmtDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + ", " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [formError, setFormError] = useState("");
  const [extraTests, setExtraTests] = useState([]);
  const [extraStaff, setExtraStaff] = useState([]);
  const [addingTest, setAddingTest] = useState(false);
  const [newTestName, setNewTestName] = useState("");
  const [addingStaff, setAddingStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");

  const allTests = [...TESTS, ...extraTests];
  const allStaff = [...STAFF, ...extraStaff];

  // Real-time listener: every staff member's device updates instantly
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, "reports"),
      snap => {
        const items = snap.docs.map(d => d.data());
        items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setRecords(items);
        setLoading(false);
      },
      err => {
        setBanner("Database se connect nahi ho paya. Firebase config check karein (src/firebase.js).");
        setLoading(false);
      }
    );
    loadSettings();
    return () => unsub();
  }, []);

  async function loadSettings() {
    try {
      const t = await getDoc(doc(db, "settings", "extraTests"));
      if (t.exists()) setExtraTests(t.data().items || []);
      const s = await getDoc(doc(db, "settings", "extraStaff"));
      if (s.exists()) setExtraStaff(s.data().items || []);
    } catch (e) { /* no custom settings yet */ }
  }

  async function addCustomTest() {
    const name = newTestName.trim();
    if (!name) return;
    if (allTests.includes(name)) { setNewTestName(""); setAddingTest(false); toggleTest(name); return; }
    const updated = [...extraTests, name];
    setExtraTests(updated);
    toggleTest(name);
    setNewTestName("");
    setAddingTest(false);
    try { await setDoc(doc(db, "settings", "extraTests"), { items: updated }); } catch (e) {}
  }

  async function addCustomStaff() {
    const name = newStaffName.trim();
    if (!name) return;
    if (allStaff.includes(name)) { setNewStaffName(""); setAddingStaff(false); setForm(f => ({ ...f, deliveredBy: name })); return; }
    const updated = [...extraStaff, name];
    setExtraStaff(updated);
    setForm(f => ({ ...f, deliveredBy: name }));
    setNewStaffName("");
    setAddingStaff(false);
    try { await setDoc(doc(db, "settings", "extraStaff"), { items: updated }); } catch (e) {}
  }

  function openNew() {
    setForm(emptyForm());
    setFormError("");
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(rec) {
    setForm({ ...rec });
    setFormError("");
    setEditingId(rec.id);
    setShowForm(true);
  }

  function saveRecord() {
    if (!form.name.trim()) { setFormError("Patient ka naam likhein."); return; }
    const id = editingId || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const payload = { ...form, id, syncStatus: "pending" };
    if (payload.status === "Delivered" && !payload.deliveredAt) {
      payload.deliveredAt = new Date().toISOString();
    }
    if (payload.status !== "Delivered") {
      payload.deliveredAt = "";
    }

    setRecords(prev => {
      const others = prev.filter(r => r.id !== id);
      return [payload, ...others].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    });
    setShowForm(false);
    setFormError("");

    syncRecord(payload);
  }

  async function syncRecord(payload) {
    try {
      await setDoc(doc(db, "reports", payload.id), { ...payload, syncStatus: "synced" });
      setRecords(prev => prev.map(r => r.id === payload.id ? { ...r, syncStatus: "synced" } : r));
    } catch (e) {
      setRecords(prev => prev.map(r => r.id === payload.id ? { ...r, syncStatus: "failed" } : r));
    }
  }

  function toggleTest(t) {
    setForm(f => {
      const has = f.tests.includes(t);
      return { ...f, tests: has ? f.tests.filter(x => x !== t) : [...f.tests, t] };
    });
  }

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filter !== "All" && r.status !== filter) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        if (!r.name.toLowerCase().includes(s) && !(r.contact || "").includes(s)) return false;
      }
      return true;
    });
  }, [records, search, filter]);

  const counts = useMemo(() => {
    const c = { Pending: 0, Ready: 0, Delivered: 0 };
    records.forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
    return c;
  }, [records]);

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFA", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div style={{ background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, padding: "20px 16px 24px", color: "white", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ fontSize: 12, letterSpacing: 1.5, opacity: 0.85, fontWeight: 600 }}>MODERN CLINICAL LABORATORY</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>Report Delivery Tracker</div>
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>R.S. Pura, Jammu</div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {STATUS.map(s => (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? "All" : s)}
              style={{
                flex: 1, background: filter === s ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "8px 6px",
                color: filter === s ? TEAL_DARK : "white", cursor: "pointer", textAlign: "center"
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700 }}>{counts[s]}</div>
              <div style={{ fontSize: 10, fontWeight: 600 }}>{s}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "12px 16px 0", display: "flex", gap: 8 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", background: "white", borderRadius: 10, border: "1px solid #E2E8E7", padding: "8px 12px" }}>
          <Search size={16} color="#94A3A2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Naam ya contact search karein"
            style={{ border: "none", outline: "none", marginLeft: 8, flex: 1, fontSize: 14, background: "transparent" }}
          />
          {search && <X size={16} color="#94A3A2" style={{ cursor: "pointer" }} onClick={() => setSearch("")} />}
        </div>
      </div>

      {banner && (
        <div style={{ margin: "12px 16px 0", background: "#FFFBEB", border: "1px solid #FCD34D", color: "#92400E", padding: "10px 12px", borderRadius: 10, fontSize: 12 }}>
          {banner}
        </div>
      )}

      {filter !== "All" && (
        <div style={{ padding: "8px 16px 0" }}>
          <span style={{ fontSize: 12, background: "#E6F4F2", color: TEAL_DARK, padding: "4px 10px", borderRadius: 20, fontWeight: 600 }}>
            Filter: {filter} <X size={12} style={{ display: "inline", marginLeft: 4, cursor: "pointer" }} onClick={() => setFilter("All")} />
          </span>
        </div>
      )}

      <div style={{ padding: "12px 16px 100px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#64807D" }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
            <div style={{ marginTop: 8, fontSize: 13 }}>Loading...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#94A3A2" }}>
            <FileText size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
            <div style={{ fontSize: 14 }}>Koi record nahi mila</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Neeche + button se naya patient add karein</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(r => {
              const st = STATUS_STYLE[r.status] || STATUS_STYLE.Pending;
              const missingDeliveredBy = r.status === "Delivered" && !r.deliveredBy;
              return (
                <div
                  key={r.id}
                  onClick={() => openEdit(r)}
                  style={{
                    background: "white", borderRadius: 12, padding: 14, cursor: "pointer",
                    borderLeft: `5px solid ${st.dot}`, boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#1E293B" }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: "#64807D", marginTop: 2 }}>
                        {r.age ? `${r.age} yrs` : ""}{r.age && r.sex ? " / " : ""}{r.sex}
                        {r.tests?.length ? ` · ${r.tests.join(", ")}` : ""}
                      </div>
                    </div>
                    <span style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}`, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
                      {r.status}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10, fontSize: 12, color: "#64807D" }}>
                    {r.contact && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Phone size={12} /> {r.contact}</span>}
                    {r.deliveredBy && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><User size={12} /> {r.deliveredBy}</span>}
                    {r.deliveredAt && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {fmtDateTime(r.deliveredAt)}</span>}
                  </div>

                  {missingDeliveredBy && (
                    <div style={{ marginTop: 8, background: "#FFF7ED", color: "#9A3412", border: "1px solid #FDBA74", fontSize: 11, padding: "6px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <AlertTriangle size={12} /> Delivered By naam missing hai
                    </div>
                  )}

                  {r.syncStatus === "pending" && (
                    <div style={{ marginTop: 8, fontSize: 11, color: "#94A3A2", display: "flex", alignItems: "center", gap: 4 }}>
                      <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> Syncing...
                    </div>
                  )}
                  {r.syncStatus === "failed" && (
                    <div
                      onClick={(e) => { e.stopPropagation(); syncRecord(r); }}
                      style={{ marginTop: 8, fontSize: 11, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FCA5A5", padding: "5px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                    >
                      <AlertTriangle size={12} /> Sync fail hua — dobara try karne ke liye tap karein
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={openNew}
        style={{
          position: "fixed", bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28,
          background: TEAL, color: "white", border: "none", boxShadow: "0 4px 14px rgba(15,118,110,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
        }}
      >
        <Plus size={26} />
      </button>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,22,0.5)", display: "flex", alignItems: "flex-end", zIndex: 50 }}>
          <div style={{ background: "white", width: "100%", maxHeight: "90vh", overflowY: "auto", borderRadius: "20px 20px 0 0", padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#1E293B" }}>{editingId ? "Edit Report" : "Naya Patient"}</div>
              <X size={22} color="#64807D" style={{ cursor: "pointer" }} onClick={() => setShowForm(false)} />
            </div>

            <Field label="Patient Name">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Patient ka naam" />
            </Field>

            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Field label="Age">
                  <input value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} style={inputStyle} placeholder="Age" inputMode="numeric" />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Sex">
                  <select value={form.sex} onChange={e => setForm({ ...form, sex: e.target.value })} style={inputStyle}>
                    <option value="">Select</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>
              </div>
            </div>

            <Field label="Test(s)">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {allTests.map(t => {
                  const active = form.tests.includes(t);
                  return (
                    <span
                      key={t}
                      onClick={() => toggleTest(t)}
                      style={{
                        fontSize: 12, padding: "6px 10px", borderRadius: 16, cursor: "pointer",
                        background: active ? TEAL : "#F1F5F4", color: active ? "white" : "#475756",
                        border: `1px solid ${active ? TEAL : "#E2E8E7"}`
                      }}
                    >
                      {t}
                    </span>
                  );
                })}
                <span
                  onClick={() => setAddingTest(true)}
                  style={{ fontSize: 12, padding: "6px 10px", borderRadius: 16, cursor: "pointer", background: "white", color: TEAL, border: `1px dashed ${TEAL}`, fontWeight: 700 }}
                >
                  + Add New
                </span>
              </div>
              {addingTest && (
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <input
                    autoFocus
                    value={newTestName}
                    onChange={e => setNewTestName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addCustomTest(); }}
                    placeholder="Naya test ka naam"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button onClick={addCustomTest} style={{ background: TEAL, color: "white", border: "none", borderRadius: 10, padding: "0 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add</button>
                  <button onClick={() => { setAddingTest(false); setNewTestName(""); }} style={{ background: "#F1F5F4", color: "#475756", border: "none", borderRadius: 10, padding: "0 14px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                </div>
              )}
            </Field>

            <Field label="Sample Collected Date">
              <input type="date" value={form.sampleDate} onChange={e => setForm({ ...form, sampleDate: e.target.value })} style={inputStyle} />
            </Field>

            <Field label="Status">
              <div style={{ display: "flex", gap: 8 }}>
                {STATUS.map(s => {
                  const st = STATUS_STYLE[s];
                  const active = form.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setForm({ ...form, status: s })}
                      style={{
                        flex: 1, padding: "9px 0", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
                        background: active ? st.dot : st.bg, color: active ? "white" : st.text,
                        border: `1px solid ${st.border}`
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </Field>

            {form.status === "Delivered" && (
              <Field label="Delivered / Collected By (Staff)">
                <select
                  value={allStaff.includes(form.deliveredBy) ? form.deliveredBy : ""}
                  onChange={e => {
                    if (e.target.value === "__add_new__") { setAddingStaff(true); return; }
                    setForm({ ...form, deliveredBy: e.target.value });
                  }}
                  style={inputStyle}
                >
                  <option value="">Select staff</option>
                  {allStaff.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="__add_new__">+ Add New Staff</option>
                </select>
                {addingStaff && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <input
                      autoFocus
                      value={newStaffName}
                      onChange={e => setNewStaffName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addCustomStaff(); }}
                      placeholder="Naye staff ka naam"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button onClick={addCustomStaff} style={{ background: TEAL, color: "white", border: "none", borderRadius: 10, padding: "0 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add</button>
                    <button onClick={() => { setAddingStaff(false); setNewStaffName(""); }} style={{ background: "#F1F5F4", color: "#475756", border: "none", borderRadius: 10, padding: "0 14px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  </div>
                )}
              </Field>
            )}

            {form.status === "Delivered" && (
              <Field label="Collected By (Patient/Attendant)">
                <input value={form.collectedBy} onChange={e => setForm({ ...form, collectedBy: e.target.value })} style={inputStyle} placeholder="Self / Attendant naam" />
              </Field>
            )}

            <Field label="Contact No.">
              <input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} style={inputStyle} placeholder="Mobile number" inputMode="tel" />
            </Field>

            <Field label="Remarks">
              <textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} placeholder="Koi note..." />
            </Field>

            {formError && <div style={{ color: "#991B1B", fontSize: 12, marginBottom: 10 }}>{formError}</div>}

            <button
              onClick={saveRecord}
              style={{
                width: "100%", background: TEAL, color: "white", border: "none", borderRadius: 12,
                padding: "13px 0", fontSize: 15, fontWeight: 700, marginTop: 6, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8
              }}
            >
              <Check size={16} />
              {editingId ? "Update Karein" : "Save Karein"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input, select, textarea { font-family: inherit; }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#475756", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #E2E8E7",
  fontSize: 14, outline: "none", background: "#FBFDFC", boxSizing: "border-box"
};
