import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Trash2, Wheat, Hammer, Package, LayoutGrid, AlertTriangle, DollarSign, Receipt, Pencil, FileText, Activity, Settings, Download, Upload, ShieldCheck } from "lucide-react";

// ---------- design tokens ----------
const COLORS = {
  bg: "#F4F8F4",
  panel: "#FFFFFF",
  panelAlt: "#EAF4EC",
  ink: "#17351F",
  inkSoft: "#607067",
  moss: "#138A43",
  mossDark: "#086B32",
  mustard: "#D8A31A",
  rust: "#C0392B",
  hairline: "#D9E7DC",
};

const FONT_HEAD = "'Inter', 'IBM Plex Sans', sans-serif";
const FONT_BODY = "'IBM Plex Sans', sans-serif";

function useGoogleFonts() {
  useEffect(() => {
    const id = "farm-ledger-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

// ---------- storage helpers ----------
const KEYS = {
  inventory: "farm-ledger:inventory",
  labor: "farm-ledger:labor",
  feed: "farm-ledger:feed",
  income: "farm-ledger:income",
  expenses: "farm-ledger:expenses",
};

function loadList(key) {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveList(key, list) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(list));
    }
  } catch (e) {
    console.error("save failed", key, e);
  }
}

const uid = () => Math.random().toString(36).slice(2, 10);
const money = (n) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(isFinite(n) ? n : 0);
const todayISO = () => new Date().toISOString().slice(0, 10);

// ---------- shared UI bits ----------
function LedgerButton({ children, onClick, variant = "primary", type = "button", style }) {
  const bg = variant === "primary" ? COLORS.moss : variant === "danger" ? "transparent" : COLORS.panelAlt;
  const color = variant === "primary" ? "#FBF7EE" : variant === "danger" ? COLORS.rust : COLORS.ink;
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        background: bg,
        color,
        border: variant === "danger" ? "none" : `1px solid ${variant === "primary" ? COLORS.mossDark : COLORS.hairline}`,
        borderRadius: 10,
        padding: "8px 14px",
        fontFamily: FONT_BODY,
        fontWeight: 600,
        fontSize: 13.5,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        transition: "opacity 120ms ease",
        ...style,
      }}
      onMouseDown={(e) => (e.currentTarget.style.opacity = "0.75")}
      onMouseUp={(e) => (e.currentTarget.style.opacity = "1")}
    >
      {children}
    </button>
  );
}

function Field({ label, children, width }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, width: width || "auto", flex: width ? "none" : 1 }}>
      <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: COLORS.inkSoft, fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  fontFamily: FONT_BODY,
  fontSize: 14,
  color: COLORS.ink,
  background: COLORS.panel,
  border: `1px solid ${COLORS.hairline}`,
  borderRadius: 10,
  padding: "7px 9px",
  outline: "none",
};

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 2, borderBottom: `2px solid ${COLORS.mossDark}`, marginBottom: 24 }}>
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              fontFamily: FONT_HEAD,
              fontWeight: 700,
              fontSize: 14.5,
              padding: "10px 18px",
              background: isActive ? COLORS.mossDark : "transparent",
              color: isActive ? "#FBF7EE" : COLORS.inkSoft,
              border: "none",
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginBottom: -2,
            }}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function Panel({ title, action, children }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.hairline}`, borderRadius: 4 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 18px",
          borderBottom: `1px solid ${COLORS.hairline}`,
        }}
      >
        <h2 style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 700, color: COLORS.ink, margin: 0 }}>{title}</h2>
        {action}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

function LedgerTable({ columns, rows, onDelete, onEdit, emptyText }) {
  if (!rows.length) {
    return (
      <div style={{ padding: "28px 4px", textAlign: "center", color: COLORS.inkSoft, fontFamily: FONT_BODY, fontSize: 14 }}>
        {emptyText}
      </div>
    );
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_BODY, fontSize: 13.5 }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  textAlign: c.align || "left",
                  padding: "6px 10px",
                  color: COLORS.inkSoft,
                  fontWeight: 600,
                  fontSize: 11.5,
                  borderBottom: `1px solid ${COLORS.hairline}`,
                }}
              >
                {c.label}
              </th>
            ))}
            <th style={{ width: 36 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} style={{ borderBottom: `1px solid ${COLORS.hairline}` }}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  style={{
                    padding: "9px 10px",
                    textAlign: c.align || "left",
                    color: c.warn && c.warn(row) ? COLORS.rust : COLORS.ink,
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: c.warn && c.warn(row) ? 600 : 400,
                  }}
                >
                  {c.render ? c.render(row) : row[c.key]}
                  {c.warn && c.warn(row) && <AlertTriangle size={12} style={{ marginLeft: 5, verticalAlign: -1 }} />}
                </td>
              ))}
              <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                {onEdit && <button onClick={() => onEdit(row)} title="Edit entry" style={{ background:"none",border:"none",cursor:"pointer",color:COLORS.mossDark,padding:4 }}><Pencil size={14}/></button>}
                {onDelete && <button onClick={() => onDelete(row.id)} title="Remove entry" style={{ background:"none",border:"none",cursor:"pointer",color:COLORS.inkSoft,padding:4 }}><Trash2 size={14}/></button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Inventory tab ----------
const INVENTORY_CATEGORIES = ["Livestock", "Feed & Grain", "Equipment", "Seed & Crop", "Supplies", "Other"];

function InventoryTab({ items, setItems }) {
  const [form, setForm] = useState({ name: "", category: "Feed & Grain", quantity: "", unit: "", threshold: "" });

  const add = () => {
    if (!form.name.trim() || form.quantity === "") return;
    const item = {
      id: uid(),
      name: form.name.trim(),
      category: form.category,
      quantity: parseFloat(form.quantity) || 0,
      unit: form.unit.trim() || "units",
      threshold: form.threshold === "" ? null : parseFloat(form.threshold),
    };
    setItems((prev) => [item, ...prev]);
    setForm({ name: "", category: form.category, quantity: "", unit: form.unit, threshold: "" });
  };

  const remove = (id) => setItems((prev) => prev.filter((i) => i.id !== id));

  const lowStock = items.filter((i) => i.threshold != null && i.quantity <= i.threshold);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {lowStock.length > 0 && (
        <div
          style={{
            background: "#FFF2EF",
            border: `1px solid ${COLORS.rust}`,
            borderRadius: 14,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: FONT_BODY,
            fontSize: 13.5,
            color: COLORS.rust,
          }}
        >
          <AlertTriangle size={16} />
          {lowStock.length} item{lowStock.length > 1 ? "s" : ""} at or below reorder threshold: {lowStock.map((i) => i.name).join(", ")}
        </div>
      )}
      <Panel title="Add stock item">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <Field label="Item name">
            <input style={{ ...inputStyle, width: 180 }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Layer feed" />
          </Field>
          <Field label="Category" width={150}>
            <select style={{ ...inputStyle, width: 150 }} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {INVENTORY_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Quantity" width={100}>
            <input type="number" style={{ ...inputStyle, width: 100 }} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" />
          </Field>
          <Field label="Unit" width={100}>
            <input style={{ ...inputStyle, width: 100 }} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="bags, head..." />
          </Field>
          <Field label="Reorder at" width={100}>
            <input type="number" style={{ ...inputStyle, width: 100 }} value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} placeholder="optional" />
          </Field>
          <LedgerButton onClick={add}><Plus size={14} /> Add item</LedgerButton>
        </div>
      </Panel>
      <Panel title={`Current stock (${items.length})`}>
        <LedgerTable
          emptyText="No stock recorded yet. Add your first item above."
          onDelete={remove}
          columns={[
            { key: "name", label: "Item" },
            { key: "category", label: "Category" },
            { key: "quantity", label: "Quantity", align: "right", warn: (r) => r.threshold != null && r.quantity <= r.threshold, render: (r) => `${r.quantity} ${r.unit}` },
            { key: "threshold", label: "Reorder at", align: "right", render: (r) => (r.threshold == null ? "—" : `${r.threshold} ${r.unit}`) },
          ]}
          rows={items}
        />
      </Panel>
    </div>
  );
}

// ---------- Labor tab ----------
function LaborTab({ entries, setEntries, batches }) {
  const [form, setForm] = useState({ date: todayISO(), enterprise: "General Farm", batchId: "", worker: "", task: "", hours: "", rate: "" });

  const add = () => {
    const hours = parseFloat(form.hours) || 0;
    const rate = parseFloat(form.rate) || 0;
    if (!form.task.trim() || hours <= 0) return;
    const entry = { id: uid(), date: form.date, enterprise: form.enterprise, batchId: form.batchId || "", worker: form.worker.trim() || "Unassigned", task: form.task.trim(), hours, rate, cost: hours * rate };
    setEntries((prev) => [entry, ...prev]);
    setForm({ date: form.date, enterprise: form.enterprise, batchId: form.batchId, worker: form.worker, task: "", hours: "", rate: form.rate });
  };
  const remove = (id) => setEntries((prev) => prev.filter((e) => e.id !== id));
  const totalCost = entries.reduce((s, e) => s + e.cost, 0);
  const totalHours = entries.reduce((s, e) => s + e.hours, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Panel title="Log work">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <Field label="Date" width={140}>
            <input type="date" style={{ ...inputStyle, width: 140 }} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Enterprise" width={150}><select style={{ ...inputStyle, width: 150 }} value={form.enterprise} onChange={(e) => setForm({ ...form, enterprise: e.target.value })}>{ENTERPRISES.map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="Production cycle" width={190}><select style={{ ...inputStyle, width: 190 }} value={form.batchId} onChange={(e) => { const id=e.target.value; const b=batches.find(x=>x.id===id); setForm({ ...form, batchId:id, enterprise:b ? b.enterprise : form.enterprise }); }}><option value="">Unassigned / whole farm</option>{batches.map((b)=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
          <Field label="Worker" width={140}>
            <input style={{ ...inputStyle, width: 140 }} value={form.worker} onChange={(e) => setForm({ ...form, worker: e.target.value })} placeholder="Name" />
          </Field>
          <Field label="Task">
            <input style={{ ...inputStyle, width: 180 }} value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })} placeholder="e.g. Fence repair, north field" />
          </Field>
          <Field label="Hours" width={90}>
            <input type="number" style={{ ...inputStyle, width: 90 }} value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} placeholder="0" />
          </Field>
          <Field label="Rate / hr" width={100}>
            <input type="number" style={{ ...inputStyle, width: 100 }} value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="0.00" />
          </Field>
          <LedgerButton onClick={add}><Plus size={14} /> Add entry</LedgerButton>
        </div>
      </Panel>
      <Panel
        title={`Work log (${entries.length})`}
        action={
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: COLORS.inkSoft }}>
            {totalHours.toFixed(1)} hrs · <strong style={{ color: COLORS.ink }}>{money(totalCost)}</strong>
          </span>
        }
      >
        <LedgerTable
          emptyText="No work logged yet. Add your first entry above."
          onDelete={remove}
          columns={[
            { key: "date", label: "Date" },
            { key: "enterprise", label: "Enterprise", render: (r) => r.enterprise || "General Farm" },
            { key: "batchId", label: "Cycle", render: (r) => batches.find((b)=>b.id===r.batchId)?.name || "—" },
            { key: "worker", label: "Worker" },
            { key: "task", label: "Task" },
            { key: "hours", label: "Hours", align: "right" },
            { key: "rate", label: "Rate", align: "right", render: (r) => money(r.rate) },
            { key: "cost", label: "Cost", align: "right", render: (r) => money(r.cost) },
          ]}
          rows={entries}
        />
      </Panel>
    </div>
  );
}

// ---------- Feed tab ----------
function FeedTab({ entries, setEntries, batches }) {
  const [form, setForm] = useState({ date: todayISO(), enterprise: "General Farm", batchId: "", feedType: "", quantity: "", unit: "bags", costPerUnit: "" });

  const add = () => {
    const quantity = parseFloat(form.quantity) || 0;
    const costPerUnit = parseFloat(form.costPerUnit) || 0;
    if (!form.feedType.trim() || quantity <= 0) return;
    const entry = {
      id: uid(),
      date: form.date,
      enterprise: form.enterprise,
      batchId: form.batchId || "",
      feedType: form.feedType.trim(),
      quantity,
      unit: form.unit.trim() || "units",
      costPerUnit,
      cost: quantity * costPerUnit,
    };
    setEntries((prev) => [entry, ...prev]);
    setForm({ date: form.date, enterprise: form.enterprise, batchId: form.batchId, feedType: "", quantity: "", unit: form.unit, costPerUnit: form.costPerUnit });
  };
  const remove = (id) => setEntries((prev) => prev.filter((e) => e.id !== id));
  const totalCost = entries.reduce((s, e) => s + e.cost, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Panel title="Log feed purchase">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <Field label="Date" width={140}>
            <input type="date" style={{ ...inputStyle, width: 140 }} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Enterprise" width={150}><select style={{ ...inputStyle, width: 150 }} value={form.enterprise} onChange={(e) => setForm({ ...form, enterprise: e.target.value })}>{ENTERPRISES.map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="Production cycle" width={190}><select style={{ ...inputStyle, width: 190 }} value={form.batchId} onChange={(e) => { const id=e.target.value; const b=batches.find(x=>x.id===id); setForm({ ...form, batchId:id, enterprise:b ? b.enterprise : form.enterprise }); }}><option value="">Unassigned / whole farm</option>{batches.map((b)=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
          <Field label="Feed type">
            <input style={{ ...inputStyle, width: 180 }} value={form.feedType} onChange={(e) => setForm({ ...form, feedType: e.target.value })} placeholder="e.g. Alfalfa hay" />
          </Field>
          <Field label="Quantity" width={100}>
            <input type="number" style={{ ...inputStyle, width: 100 }} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" />
          </Field>
          <Field label="Unit" width={90}>
            <input style={{ ...inputStyle, width: 90 }} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="bags, tons..." />
          </Field>
          <Field label="Cost / unit" width={100}>
            <input type="number" style={{ ...inputStyle, width: 100 }} value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} placeholder="0.00" />
          </Field>
          <LedgerButton onClick={add}><Plus size={14} /> Add entry</LedgerButton>
        </div>
      </Panel>
      <Panel
        title={`Feed expenses (${entries.length})`}
        action={<span style={{ fontFamily: FONT_BODY, fontSize: 13, color: COLORS.inkSoft }}>Total: <strong style={{ color: COLORS.ink }}>{money(totalCost)}</strong></span>}
      >
        <LedgerTable
          emptyText="No feed purchases logged yet. Add your first entry above."
          onDelete={remove}
          columns={[
            { key: "date", label: "Date" },
            { key: "enterprise", label: "Enterprise", render: (r) => r.enterprise || "General Farm" },
            { key: "batchId", label: "Cycle", render: (r) => batches.find((b)=>b.id===r.batchId)?.name || "—" },
            { key: "feedType", label: "Feed type" },
            { key: "quantity", label: "Quantity", align: "right", render: (r) => `${r.quantity} ${r.unit}` },
            { key: "costPerUnit", label: "Cost / unit", align: "right", render: (r) => money(r.costPerUnit) },
            { key: "cost", label: "Total", align: "right", render: (r) => money(r.cost) },
          ]}
          rows={entries}
        />
      </Panel>
    </div>
  );
}


// ---------- Other expenses tab ----------
const EXPENSE_CATEGORIES = [
  "Livestock/Birds/Fish Purchase",
  "Medication & Vaccines",
  "Transport & Logistics",
  "Fuel",
  "Electricity/Energy",
  "Water",
  "Repairs & Maintenance",
  "Equipment",
  "Farm Supplies",
  "Veterinary/Professional Services",
  "Rent/Lease",
  "Packaging",
  "Marketing",
  "Miscellaneous",
];
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "POS/Card", "Credit", "Other"];

const ENTERPRISES = ["General Farm", "Broilers", "Layers", "Catfish", "Piggery", "Crops", "Other"];

function ExpensesTab({ expenses, setExpenses, laborTotal, feedTotal, batches }) {
  const blank = { date: todayISO(), enterprise: "General Farm", batchId: "", category: EXPENSE_CATEGORIES[0], description: "", quantity: "", amount: "", paymentMethod: "Cash", notes: "" };
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);

  const save = () => {
    const amount = parseFloat(form.amount) || 0;
    if (!form.description.trim() || amount <= 0) return;
    const record = {
      id: editingId || uid(), date: form.date, enterprise: form.enterprise, batchId: form.batchId || "", category: form.category,
      description: form.description.trim(), quantity: form.quantity === "" ? null : parseFloat(form.quantity) || 0,
      amount, paymentMethod: form.paymentMethod, notes: form.notes.trim(),
    };
    setExpenses((prev) => editingId ? prev.map((e) => e.id === editingId ? record : e) : [record, ...prev]);
    setEditingId(null);
    setForm({ ...blank, date: form.date, enterprise: form.enterprise, batchId: form.batchId, category: form.category, paymentMethod: form.paymentMethod });
  };
  const edit = (e) => {
    setEditingId(e.id);
    setForm({ date: e.date, enterprise: e.enterprise || "General Farm", batchId: e.batchId || "", category: e.category, description: e.description, quantity: e.quantity == null ? "" : String(e.quantity), amount: String(e.amount), paymentMethod: e.paymentMethod || "Cash", notes: e.notes || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const remove = (id) => { if (window.confirm("Delete this expense record?")) setExpenses((prev) => prev.filter((e) => e.id !== id)); };
  const otherTotal = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const grandTotal = laborTotal + feedTotal + otherTotal;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <StatCard label="Feed costs" value={money(feedTotal)} sub="From Feed module" />
        <StatCard label="Labour costs" value={money(laborTotal)} sub="From Labour module" />
        <StatCard label="Other expenses" value={money(otherTotal)} sub={`${expenses.length} record${expenses.length === 1 ? "" : "s"}`} />
        <StatCard label="Total expenses" value={money(grandTotal)} sub="No double-counting" />
      </div>
      <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.hairline}`, borderRadius: 12, padding: "10px 14px", fontFamily: FONT_BODY, fontSize: 12.5, color: COLORS.inkSoft }}>
        Feed and labour are recorded in their own modules and are included automatically. Use this page for all other farm expenses so costs are not counted twice.
      </div>
      <Panel title={editingId ? "Edit farm expense" : "Add farm expense"}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <Field label="Date" width={140}><input type="date" style={{ ...inputStyle, width: 140 }} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Enterprise" width={150}><select style={{ ...inputStyle, width: 150 }} value={form.enterprise} onChange={(e) => setForm({ ...form, enterprise: e.target.value })}>{ENTERPRISES.map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="Production cycle" width={190}><select style={{ ...inputStyle, width: 190 }} value={form.batchId} onChange={(e) => { const id=e.target.value; const b=batches.find(x=>x.id===id); setForm({ ...form, batchId:id, enterprise:b ? b.enterprise : form.enterprise }); }}><option value="">Unassigned / whole farm</option>{batches.map((b)=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
          <Field label="Category" width={210}><select style={{ ...inputStyle, width: 210 }} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Description"><input style={{ ...inputStyle, width: 210 }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Vaccines for broilers" /></Field>
          <Field label="Quantity (optional)" width={120}><input type="number" style={{ ...inputStyle, width: 120 }} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" /></Field>
          <Field label="Amount (₦)" width={130}><input type="number" style={{ ...inputStyle, width: 130 }} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" /></Field>
          <Field label="Payment" width={150}><select style={{ ...inputStyle, width: 150 }} value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</select></Field>
          <Field label="Notes"><input style={{ ...inputStyle, width: 200 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" /></Field>
          <LedgerButton onClick={save}>{editingId ? <Pencil size={14} /> : <Plus size={14} />} {editingId ? "Update" : "Add expense"}</LedgerButton>
          {editingId && <LedgerButton variant="secondary" onClick={() => { setEditingId(null); setForm(blank); }}>Cancel</LedgerButton>}
        </div>
      </Panel>
      <Panel title={`Expense history (${expenses.length})`} action={<span style={{ fontFamily: FONT_BODY, fontSize: 13, color: COLORS.inkSoft }}>Other expenses: <strong style={{ color: COLORS.ink }}>{money(otherTotal)}</strong></span>}>
        {!expenses.length ? <div style={{ padding: "24px 4px", textAlign: "center", color: COLORS.inkSoft, fontFamily: FONT_BODY }}>No other farm expenses recorded yet.</div> :
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_BODY, fontSize: 13 }}>
          <thead><tr>{["Date","Enterprise","Cycle","Category","Description","Payment","Amount",""].map((h) => <th key={h} style={{ textAlign: h === "Amount" ? "right" : "left", padding: "7px 9px", color: COLORS.inkSoft, borderBottom: `1px solid ${COLORS.hairline}` }}>{h}</th>)}</tr></thead>
          <tbody>{expenses.map((e) => <tr key={e.id} style={{ borderBottom: `1px solid ${COLORS.hairline}` }}>
            <td style={{ padding: "9px" }}>{e.date}</td><td style={{ padding: "9px" }}>{e.enterprise || "General Farm"}</td><td style={{ padding: "9px" }}>{batches.find((b)=>b.id===e.batchId)?.name || "—"}</td><td style={{ padding: "9px" }}>{e.category}</td><td style={{ padding: "9px" }}>{e.description}{e.notes ? <div style={{ fontSize: 11, color: COLORS.inkSoft }}>{e.notes}</div> : null}</td><td style={{ padding: "9px" }}>{e.paymentMethod || "—"}</td><td style={{ padding: "9px", textAlign: "right", fontWeight: 600 }}>{money(e.amount)}</td>
            <td style={{ padding: "9px", whiteSpace: "nowrap" }}><button onClick={() => edit(e)} title="Edit" style={{ border: 0, background: "none", color: COLORS.mossDark, padding: 5 }}><Pencil size={14}/></button><button onClick={() => remove(e.id)} title="Delete" style={{ border: 0, background: "none", color: COLORS.rust, padding: 5 }}><Trash2 size={14}/></button></td>
          </tr>)}</tbody>
        </table></div>}
      </Panel>
    </div>
  );
}

// ---------- Finance (income) tab ----------
const INCOME_CATEGORIES = ["Crop sales", "Livestock sales", "Dairy/Eggs", "Government/Subsidy", "Other"];

function FinanceTab({ income, setIncome, laborTotal, feedTotal, otherExpenseTotal, batches }) {
  const blank={date:todayISO(),enterprise:"General Farm",batchId:"",category:"Crop sales",description:"",quantity:"",unit:"units",unitPrice:"",amount:""};
  const [form,setForm]=useState(blank);
  const [editingId,setEditingId]=useState(null);
  const [audit,setAudit]=useState(()=>{try{return JSON.parse(localStorage.getItem("farm-ledger-audit-v1")||"[]")}catch{return []}});
  useEffect(()=>{localStorage.setItem("farm-ledger-audit-v1",JSON.stringify(audit))},[audit]);

  const calculated=(Number(form.quantity)||0)*(Number(form.unitPrice)||0);
  const effectiveAmount=calculated>0?calculated:(Number(form.amount)||0);
  const clearance=()=>window.prompt("Admin clearance required. Enter PAPI Farm Ledger admin PIN:")===(localStorage.getItem("farm-ledger-admin-pin")||"2468");

  const save=()=>{
    if(!form.description.trim()||effectiveAmount<=0)return;
    const entry={id:editingId||uid(),date:form.date,enterprise:form.enterprise,batchId:form.batchId||"",category:form.category,description:form.description.trim(),quantity:Number(form.quantity)||0,unit:form.unit||"units",unitPrice:Number(form.unitPrice)||0,amount:effectiveAmount};
    if(editingId){
      const old=income.find(x=>x.id===editingId);
      setIncome(prev=>prev.map(x=>x.id===editingId?entry:x));
      setAudit(prev=>[{id:uid(),time:new Date().toISOString(),action:"EDIT SALE",recordId:editingId,before:old,after:entry},...prev]);
    } else setIncome(prev=>[entry,...prev]);
    setEditingId(null); setForm({...blank,date:form.date,enterprise:form.enterprise,batchId:form.batchId,category:form.category});
  };
  const edit=(r)=>{
    if(!clearance()){alert("Clearance denied.");return;}
    setEditingId(r.id); setForm({...blank,...r,quantity:r.quantity||"",unit:r.unit||"units",unitPrice:r.unitPrice||"",amount:r.amount||""});
    window.scrollTo({top:0,behavior:"smooth"});
  };
  const remove=(id)=>{
    if(!clearance()){alert("Clearance denied.");return;}
    const old=income.find(x=>x.id===id);
    if(!window.confirm("Delete this sales record? The action will be recorded in the audit trail."))return;
    setIncome(prev=>prev.filter(x=>x.id!==id));
    setAudit(prev=>[{id:uid(),time:new Date().toISOString(),action:"DELETE SALE",recordId:id,before:old},...prev]);
  };
  const incomeTotal=income.reduce((a,e)=>a+(Number(e.amount)||0),0);
  const expenseTotal=laborTotal+feedTotal+otherExpenseTotal, netProfit=incomeTotal-expenseTotal;
  return <div style={{display:"flex",flexDirection:"column",gap:18}}>
    <div style={{display:"flex",gap:14,flexWrap:"wrap"}}><StatCard label="Income" value={money(incomeTotal)} sub={`${income.length} sales logged`}/><StatCard label="Expenses" value={money(expenseTotal)} sub="Feed + labour + other"/><StatCard label="Net profit" value={money(netProfit)} sub={netProfit>=0?"In the black":"Running at a loss"}/></div>
    <Panel title={editingId?"Edit sale — clearance granted":"Log income"}>
      {editingId&&<div style={{padding:10,borderRadius:10,background:COLORS.panelAlt,marginBottom:10,fontSize:12,color:COLORS.ink}}>Authorized edit mode. Saving will update reports and batch profitability and create an audit entry.</div>}
      <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
        <Field label="Date" width={140}><input type="date" style={{...inputStyle,width:140}} value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></Field>
        <Field label="Enterprise" width={150}><select style={{...inputStyle,width:150}} value={form.enterprise} onChange={e=>setForm({...form,enterprise:e.target.value})}>{ENTERPRISES.map(x=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Production cycle" width={190}><select style={{...inputStyle,width:190}} value={form.batchId} onChange={e=>{const id=e.target.value,b=batches.find(x=>x.id===id);setForm({...form,batchId:id,enterprise:b?b.enterprise:form.enterprise})}}><option value="">Unassigned / whole farm</option>{batches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        <Field label="Category" width={160}><select style={{...inputStyle,width:160}} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{INCOME_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></Field>
        <Field label="Description"><input style={{...inputStyle,width:200}} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="e.g. Broiler sales"/></Field>
        <Field label="Quantity" width={100}><input type="number" min="0" style={{...inputStyle,width:100}} value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} placeholder="0"/></Field>
        <Field label="Unit" width={100}><input style={{...inputStyle,width:100}} value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} placeholder="birds/kg"/></Field>
        <Field label="Price / unit" width={120}><input type="number" min="0" style={{...inputStyle,width:120}} value={form.unitPrice} onChange={e=>setForm({...form,unitPrice:e.target.value})} placeholder="0"/></Field>
        <Field label="Total amount" width={130}><input type="number" style={{...inputStyle,width:130,background:calculated>0?COLORS.panelAlt:"white"}} value={calculated>0?calculated:form.amount} onChange={e=>setForm({...form,amount:e.target.value})} readOnly={calculated>0} placeholder="0"/></Field>
        <LedgerButton onClick={save}>{editingId?<><Pencil size={14}/> Save changes</>:<><Plus size={14}/> Add entry</>}</LedgerButton>
        {editingId&&<LedgerButton variant="secondary" onClick={()=>{setEditingId(null);setForm(blank)}}>Cancel</LedgerButton>}
      </div>
    </Panel>
    <Panel title={`Income log (${income.length})`} action={<span style={{fontSize:13,color:COLORS.inkSoft}}>Total: <strong>{money(incomeTotal)}</strong></span>}>
      <LedgerTable emptyText="No income logged yet." onDelete={remove} onEdit={edit} columns={[
        {key:"date",label:"Date"},{key:"enterprise",label:"Enterprise",render:r=>r.enterprise||"General Farm"},{key:"batchId",label:"Cycle",render:r=>batches.find(b=>b.id===r.batchId)?.name||"—"},{key:"category",label:"Category"},{key:"description",label:"Description"},{key:"quantity",label:"Qty",render:r=>r.quantity?`${r.quantity} ${r.unit||""}`:"—"},{key:"unitPrice",label:"Price/unit",align:"right",render:r=>r.unitPrice?money(r.unitPrice):"—"},{key:"amount",label:"Amount",align:"right",render:r=>money(r.amount)}
      ]} rows={income}/>
    </Panel>
    <Panel title={`Sales audit trail (${audit.length})`}>
      <div style={{display:"grid",gap:7}}>{audit.slice(0,50).map(a=><div key={a.id} style={{fontSize:12,borderBottom:`1px solid ${COLORS.hairline}`,padding:"7px 0"}}><b>{a.action}</b> · {new Date(a.time).toLocaleString()} · Record {a.recordId}</div>)}{!audit.length&&<div style={{fontSize:12,color:COLORS.inkSoft}}>No authorized sales edits or deletions yet.</div>}</div>
    </Panel>
  </div>;
}

// ---------- Summary tab ----------
function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.hairline}`, borderRadius: 14, padding: "16px 18px", flex: 1, minWidth: 160 }}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 600, color: COLORS.inkSoft, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 26, fontWeight: 700, color: COLORS.ink }}>{value}</div>
      {sub && <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: COLORS.inkSoft, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function SummaryTab({ items, labor, feed, income, expenses }) {
  const [enterpriseFilter, setEnterpriseFilter] = useState("All Farm");
  const laborTotal = labor.reduce((s, e) => s + e.cost, 0);
  const feedTotal = feed.reduce((s, e) => s + e.cost, 0);
  const incomeTotal = income.reduce((s, e) => s + e.amount, 0);
  const otherExpenseTotal = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalExpenses = laborTotal + feedTotal + otherExpenseTotal;
  const netProfit = incomeTotal - totalExpenses;
  const lowStock = items.filter((i) => i.threshold != null && i.quantity <= i.threshold);

  const expenseByCategory = useMemo(() => {
    const map = { Feed: feedTotal, Labour: laborTotal };
    expenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + (Number(e.amount) || 0); });
    return Object.entries(map).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]);
  }, [expenses, feedTotal, laborTotal]);

  const byCategory = useMemo(() => {
    const map = {};
    items.forEach((i) => { map[i.category] = (map[i.category] || 0) + 1; });
    return Object.entries(map);
  }, [items]);

  const enterprisePL = useMemo(() => {
    const names = new Set(["General Farm"]);
    [...labor, ...feed, ...income, ...expenses].forEach((r) => names.add(r.enterprise || "General Farm"));
    return Array.from(names).map((enterprise) => {
      const sales = income.filter((r) => (r.enterprise || "General Farm") === enterprise).reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const feedCost = feed.filter((r) => (r.enterprise || "General Farm") === enterprise).reduce((s, r) => s + (Number(r.cost) || 0), 0);
      const labourCost = labor.filter((r) => (r.enterprise || "General Farm") === enterprise).reduce((s, r) => s + (Number(r.cost) || 0), 0);
      const other = expenses.filter((r) => (r.enterprise || "General Farm") === enterprise).reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const costs = feedCost + labourCost + other;
      return { enterprise, sales, feedCost, labourCost, other, costs, net: sales - costs };
    }).filter((r) => r.sales || r.costs || r.enterprise === "General Farm");
  }, [labor, feed, income, expenses]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <StatCard label="Total sales" value={money(incomeTotal)} sub={`${income.length} sale${income.length === 1 ? "" : "s"} logged`} />
        <StatCard label="Total expenses" value={money(totalExpenses)} sub={`Feed ${money(feedTotal)} · Labour ${money(laborTotal)} · Other ${money(otherExpenseTotal)}`} />
        <StatCard label={netProfit >= 0 ? "Net profit" : "Net loss"} value={money(Math.abs(netProfit))} sub={netProfit >= 0 ? "Sales exceed expenses" : "Expenses exceed sales"} />
        <StatCard label="Inventory" value={items.length} sub="Stock items tracked" />
        <StatCard label="Low stock" value={lowStock.length} sub={lowStock.length ? "Items need reordering" : "All above threshold"} />
      </div>
      <Panel title="Profit / loss by enterprise">
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: COLORS.inkSoft, marginBottom: 7 }}>View enterprise</div>
          <select style={{ ...inputStyle, width: "100%", maxWidth: 280 }} value={enterpriseFilter} onChange={(e) => setEnterpriseFilter(e.target.value)}>
            <option>All Farm</option>
            {ENTERPRISES.map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {enterprisePL.filter((r) => enterpriseFilter === "All Farm" || r.enterprise === enterpriseFilter).map((r) => (
            <div key={r.enterprise} style={{ border: `1px solid ${COLORS.hairline}`, borderRadius: 16, background: COLORS.panel, padding: 15 }}>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 17, fontWeight: 800, color: COLORS.ink, marginBottom: 12 }}>{r.enterprise}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                {[["Sales", r.sales], ["Feed", r.feedCost], ["Labour", r.labourCost], ["Other expenses", r.other], ["Total cost", r.costs]].map(([label, value]) => (
                  <div key={label} style={{ background: COLORS.bg, borderRadius: 12, padding: "10px 11px" }}>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: COLORS.inkSoft, marginBottom: 3 }}>{label}</div>
                    <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 800, color: COLORS.ink }}>{money(value)}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, borderRadius: 13, padding: "12px 13px", background: r.net >= 0 ? COLORS.panelAlt : "#FFF3F1", border: `1px solid ${r.net >= 0 ? COLORS.hairline : "#F2C8C1"}` }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 700, color: COLORS.inkSoft }}>{r.net >= 0 ? "Net profit" : "Net loss"}</div>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 21, fontWeight: 900, color: r.net >= 0 ? COLORS.mossDark : COLORS.rust, marginTop: 2 }}>{money(Math.abs(r.net))}</div>
              </div>
            </div>
          ))}
          {enterprisePL.filter((r) => enterpriseFilter === "All Farm" || r.enterprise === enterpriseFilter).length === 0 && (
            <div style={{ fontFamily: FONT_BODY, color: COLORS.inkSoft, padding: "10px 0" }}>No records have been assigned to this enterprise yet.</div>
          )}
        </div>
        <div style={{ marginTop: 11, fontFamily: FONT_BODY, fontSize: 11.5, color: COLORS.inkSoft }}>Existing records created before Stage 3 are treated as General Farm. New Feed, Labour, Expense and Sales records can be assigned to an enterprise.</div>
      </Panel>
      <Panel title="Expense breakdown by category">
        {expenseByCategory.length === 0 ? (
          <div style={{ padding: "20px 4px", textAlign: "center", color: COLORS.inkSoft, fontFamily: FONT_BODY, fontSize: 14 }}>No expenses recorded yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {expenseByCategory.map(([cat, value]) => { const pct = totalExpenses ? Math.round((value / totalExpenses) * 100) : 0; return (
              <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 170, fontFamily: FONT_BODY, fontSize: 12.5, color: COLORS.ink }}>{cat}</div>
                <div style={{ flex: 1, height: 9, background: COLORS.panelAlt, borderRadius: 14, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: COLORS.moss }} /></div>
                <div style={{ minWidth: 90, textAlign: "right", fontFamily: FONT_BODY, fontSize: 12, color: COLORS.inkSoft }}>{money(value)} · {pct}%</div>
              </div>
            );})}
          </div>
        )}
      </Panel>
      <Panel title="Inventory by category">
        {byCategory.length === 0 ? (
          <div style={{ padding: "20px 4px", textAlign: "center", color: COLORS.inkSoft, fontFamily: FONT_BODY, fontSize: 14 }}>
            Nothing in inventory yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {byCategory.map(([cat, count]) => {
              const pct = Math.round((count / items.length) * 100);
              return (
                <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 130, fontFamily: FONT_BODY, fontSize: 13, color: COLORS.ink }}>{cat}</div>
                  <div style={{ flex: 1, height: 8, background: COLORS.panelAlt, borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: COLORS.moss }} />
                  </div>
                  <div style={{ width: 30, textAlign: "right", fontFamily: FONT_BODY, fontSize: 12.5, color: COLORS.inkSoft }}>{count}</div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

// ---------- root ----------


// ---------- Production cycles — Stage 8 ----------
function BatchesTab({ batches, setBatches, labor, feed, income, expenses }) {
  const [name,setName]=useState("");
  const [enterprise,setEnterprise]=useState("Broilers");
  const [startDate,setStartDate]=useState(new Date().toISOString().slice(0,10));
  const [openingStock,setOpeningStock]=useState("");
  const [closingId,setClosingId]=useState(null);
  const [closeForm,setCloseForm]=useState({endDate:new Date().toISOString().slice(0,10),finalStock:"",mortality:"",quantitySold:""});

  const addBatch=()=>{
    if(!name.trim()) return;
    setBatches(prev=>[{id:`batch-${Date.now()}`,name:name.trim(),enterprise,startDate,status:"Active",openingStock:Number(openingStock)||0},...prev]);
    setName(""); setOpeningStock("");
  };

  const calc=(b)=>{
    const f=r=>r.batchId===b.id;
    const sales=income.filter(f).reduce((a,r)=>a+(Number(r.amount)||0),0);
    const feedCost=feed.filter(f).reduce((a,r)=>a+(Number(r.cost)||0),0);
    const labourCost=labor.filter(f).reduce((a,r)=>a+(Number(r.cost)||0),0);
    const other=expenses.filter(f).reduce((a,r)=>a+(Number(r.amount)||0),0);
    const total=feedCost+labourCost+other;
    return {sales,feedCost,labourCost,other,total,net:sales-total};
  };

  const closeBatch=(b)=>{
    const finalStock=Number(closeForm.finalStock)||0;
    const mortality=Number(closeForm.mortality)||0;
    const quantitySold=Number(closeForm.quantitySold)||0;
    setBatches(prev=>prev.map(x=>x.id===b.id?{...x,status:"Completed",endDate:closeForm.endDate,finalStock,mortality,quantitySold}:x));
    setClosingId(null);
    setCloseForm({endDate:new Date().toISOString().slice(0,10),finalStock:"",mortality:"",quantitySold:""});
  };

  const reopen=(id)=>setBatches(prev=>prev.map(x=>x.id===id?{...x,status:"Active"}:x));

  return <div>
    <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8}}>
      <Package size={28} color={COLORS.moss}/>
      <h2 style={{margin:0,fontFamily:FONT_HEAD,fontSize:28,color:COLORS.ink}}>Production cycles</h2>
    </div>
    <p style={{fontFamily:FONT_BODY,color:COLORS.inkSoft,lineHeight:1.5,margin:"0 0 18px"}}>
      Create batches, allocate transactions, close completed cycles and review their profitability.
    </p>

    <Panel title="Create production cycle">
      <div style={{display:"grid",gap:10}}>
        <label style={{fontFamily:FONT_BODY,fontWeight:700,color:COLORS.inkSoft}}>Cycle / batch name
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Broilers Sep 2026" style={{...inputStyle,width:"100%",marginTop:6}}/>
        </label>
        <label style={{fontFamily:FONT_BODY,fontWeight:700,color:COLORS.inkSoft}}>Enterprise
          <select value={enterprise} onChange={e=>setEnterprise(e.target.value)} style={{...inputStyle,width:"100%",marginTop:6}}>
            {ENTERPRISES.filter(x=>x!=="General Farm").map(x=><option key={x}>{x}</option>)}
          </select>
        </label>
        <label style={{fontFamily:FONT_BODY,fontWeight:700,color:COLORS.inkSoft}}>Start date
          <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={{...inputStyle,width:"100%",marginTop:6}}/>
        </label>
        <label style={{fontFamily:FONT_BODY,fontWeight:700,color:COLORS.inkSoft}}>Opening stock
          <input type="number" min="0" value={openingStock} onChange={e=>setOpeningStock(e.target.value)} placeholder="optional" style={{...inputStyle,width:"100%",marginTop:6}}/>
        </label>
        <button onClick={addBatch} style={{border:"none",borderRadius:12,padding:"12px 16px",background:COLORS.moss,color:"white",fontFamily:FONT_BODY,fontWeight:800}}>+ Add production cycle</button>
      </div>
    </Panel>

    <Panel title={`Production cycles (${batches.length})`}>
      <div style={{display:"grid",gap:12}}>
        {batches.map(b=>{
          const t=calc(b);
          const sold=Number(b.quantitySold)||0;
          const opening=Number(b.openingStock)||0;
          const mortality=Number(b.mortality)||0;
          const finalStock=Number(b.finalStock)||0;
          const costPerUnit=sold>0?t.total/sold:0;
          const revenuePerUnit=sold>0?t.sales/sold:0;
          const margin=t.sales>0?(t.net/t.sales)*100:0;
          const mortalityRate=opening>0?(mortality/opening)*100:0;
          return <div key={b.id} style={{border:`1px solid ${COLORS.hairline}`,borderRadius:16,padding:15}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
              <div>
                <div style={{fontFamily:FONT_HEAD,fontSize:17,fontWeight:900,color:COLORS.ink}}>{b.name}</div>
                <div style={{fontFamily:FONT_BODY,fontSize:11.5,color:COLORS.inkSoft,marginTop:3}}>
                  {b.enterprise} · {b.startDate}{b.endDate?` to ${b.endDate}`:""} · <b>{b.status}</b>{opening?` · Opening stock ${opening}`:""}
                </div>
              </div>
              <button onClick={()=>setBatches(prev=>prev.filter(x=>x.id!==b.id))} style={{border:"none",background:"transparent",color:COLORS.rust}}><Trash2 size={17}/></button>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
              {[["Sales",t.sales],["Feed",t.feedCost],["Labour",t.labourCost],["Other",t.other],["Total cost",t.total]].map(([l,v])=><div key={l} style={{background:COLORS.bg,borderRadius:11,padding:10}}>
                <div style={{fontFamily:FONT_BODY,fontSize:10.5,color:COLORS.inkSoft}}>{l}</div>
                <div style={{fontFamily:FONT_HEAD,fontWeight:800,color:COLORS.ink}}>{money(v)}</div>
              </div>)}
            </div>

            <div style={{marginTop:9,borderRadius:12,padding:11,background:t.net>=0?COLORS.panelAlt:"#FFF3F1"}}>
              <div style={{fontFamily:FONT_BODY,fontSize:11,fontWeight:700,color:COLORS.inkSoft}}>{t.net>=0?"Net profit":"Net loss"}</div>
              <div style={{fontFamily:FONT_HEAD,fontSize:19,fontWeight:900,color:t.net>=0?COLORS.mossDark:COLORS.rust}}>{money(Math.abs(t.net))}</div>
            </div>

            {b.status==="Completed" && <div style={{marginTop:12}}>
              <div style={{fontFamily:FONT_HEAD,fontWeight:900,color:COLORS.ink,marginBottom:8}}>Final performance</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[
                  ["Opening stock",opening.toLocaleString()],
                  ["Quantity sold",sold.toLocaleString()],
                  ["Mortality / losses",mortality.toLocaleString()],
                  ["Final stock",finalStock.toLocaleString()],
                  ["Mortality rate",`${mortalityRate.toFixed(1)}%`],
                  ["Cost / sold unit",money(costPerUnit)],
                  ["Revenue / sold unit",money(revenuePerUnit)],
                  ["Profit margin",`${margin.toFixed(1)}%`]
                ].map(([l,v])=><div key={l} style={{background:COLORS.bg,borderRadius:11,padding:10}}>
                  <div style={{fontFamily:FONT_BODY,fontSize:10.5,color:COLORS.inkSoft}}>{l}</div>
                  <div style={{fontFamily:FONT_HEAD,fontWeight:800,color:COLORS.ink}}>{v}</div>
                </div>)}
              </div>
              <button onClick={()=>reopen(b.id)} style={{marginTop:10,border:`1px solid ${COLORS.moss}`,borderRadius:11,padding:"9px 12px",background:"white",color:COLORS.mossDark,fontFamily:FONT_BODY,fontWeight:800}}>Reopen cycle</button>
            </div>}

            {b.status!=="Completed" && closingId!==b.id && <button onClick={()=>setClosingId(b.id)} style={{marginTop:12,width:"100%",border:"none",borderRadius:11,padding:"11px 12px",background:COLORS.mossDark,color:"white",fontFamily:FONT_BODY,fontWeight:800}}>Close production cycle</button>}

            {closingId===b.id && <div style={{marginTop:12,borderTop:`1px solid ${COLORS.hairline}`,paddingTop:12,display:"grid",gap:9}}>
              <div style={{fontFamily:FONT_HEAD,fontWeight:900,color:COLORS.ink}}>Close cycle</div>
              <label style={{fontFamily:FONT_BODY,fontWeight:700,color:COLORS.inkSoft}}>End date
                <input type="date" value={closeForm.endDate} onChange={e=>setCloseForm({...closeForm,endDate:e.target.value})} style={{...inputStyle,width:"100%",marginTop:5}}/>
              </label>
              <label style={{fontFamily:FONT_BODY,fontWeight:700,color:COLORS.inkSoft}}>Quantity sold
                <input type="number" min="0" value={closeForm.quantitySold} onChange={e=>setCloseForm({...closeForm,quantitySold:e.target.value})} style={{...inputStyle,width:"100%",marginTop:5}}/>
              </label>
              <label style={{fontFamily:FONT_BODY,fontWeight:700,color:COLORS.inkSoft}}>Mortality / losses
                <input type="number" min="0" value={closeForm.mortality} onChange={e=>setCloseForm({...closeForm,mortality:e.target.value})} style={{...inputStyle,width:"100%",marginTop:5}}/>
              </label>
              <label style={{fontFamily:FONT_BODY,fontWeight:700,color:COLORS.inkSoft}}>Final stock remaining
                <input type="number" min="0" value={closeForm.finalStock} onChange={e=>setCloseForm({...closeForm,finalStock:e.target.value})} style={{...inputStyle,width:"100%",marginTop:5}}/>
              </label>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>closeBatch(b)} style={{flex:1,border:"none",borderRadius:11,padding:"10px",background:COLORS.moss,color:"white",fontFamily:FONT_BODY,fontWeight:800}}>Complete cycle</button>
                <button onClick={()=>setClosingId(null)} style={{border:`1px solid ${COLORS.hairline}`,borderRadius:11,padding:"10px 14px",background:"white",fontFamily:FONT_BODY,fontWeight:800,color:COLORS.inkSoft}}>Cancel</button>
              </div>
            </div>}
          </div>
        })}
        {!batches.length&&<div style={{fontFamily:FONT_BODY,color:COLORS.inkSoft}}>No production cycles yet.</div>}
      </div>
    </Panel>
  </div>;
}

// ---------- Reports tab — Stage 5 clean fix ----------
function ReportsTab({ labor, feed, income, expenses }) {
  const [enterprise, setEnterprise] = useState("All Farm");
  const [period, setPeriod] = useState("All Time");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const matches = (r) => {
    const ent = r.enterprise || "General Farm";
    if (enterprise !== "All Farm" && ent !== enterprise) return false;
    if (!r.date) return true;
    const d = new Date(r.date + "T00:00:00"), now = new Date();
    if (period === "This Month" && (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth())) return false;
    if (period === "This Year" && d.getFullYear() !== now.getFullYear()) return false;
    if (period === "Custom" && ((fromDate && r.date < fromDate) || (toDate && r.date > toDate))) return false;
    return true;
  };
  const sales = income.filter(matches).reduce((s,r)=>s+(Number(r.amount)||0),0);
  const feedCost = feed.filter(matches).reduce((s,r)=>s+(Number(r.cost)||0),0);
  const labourCost = labor.filter(matches).reduce((s,r)=>s+(Number(r.cost)||0),0);
  const other = expenses.filter(matches).reduce((s,r)=>s+(Number(r.amount)||0),0);
  const total = feedCost + labourCost + other, net = sales - total;
  const tx = [
    ...income.filter(matches).map(r=>({date:r.date,type:"Sale",desc:r.description||r.category,enterprise:r.enterprise||"General Farm",amount:Number(r.amount)||0})),
    ...feed.filter(matches).map(r=>({date:r.date,type:"Feed",desc:r.feedType||"Feed",enterprise:r.enterprise||"General Farm",amount:-(Number(r.cost)||0)})),
    ...labor.filter(matches).map(r=>({date:r.date,type:"Labour",desc:r.task||r.worker||"Labour",enterprise:r.enterprise||"General Farm",amount:-(Number(r.cost)||0)})),
    ...expenses.filter(matches).map(r=>({date:r.date,type:"Expense",desc:r.description||r.category,enterprise:r.enterprise||"General Farm",amount:-(Number(r.amount)||0)}))
  ].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  return <div>
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
        <FileText size={20} color={COLORS.mossDark} />
        <h2 style={{ fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 800, color: COLORS.ink, margin: 0 }}>Reports</h2>
      </div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: COLORS.inkSoft }}>Filter records by period and enterprise, review transactions, and print or save a financial report.</div>
    </div>
    <Panel title="Report filters"><div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"end"}}>
      <Field label="Period" width={160}><select style={{...inputStyle,width:160}} value={period} onChange={e=>setPeriod(e.target.value)}>{["All Time","This Month","This Year","Custom"].map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Enterprise" width={170}><select style={{...inputStyle,width:170}} value={enterprise} onChange={e=>setEnterprise(e.target.value)}><option>All Farm</option>{ENTERPRISES.map(x=><option key={x}>{x}</option>)}</select></Field>
      {period === "Custom" && <><Field label="From" width={145}><input type="date" style={{...inputStyle,width:145}} value={fromDate} onChange={e=>setFromDate(e.target.value)}/></Field><Field label="To" width={145}><input type="date" style={{...inputStyle,width:145}} value={toDate} onChange={e=>setToDate(e.target.value)}/></Field></>}
      <LedgerButton onClick={()=>window.print()}><FileText size={15}/> Print / Save PDF</LedgerButton>
    </div></Panel>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:10,marginBottom:14}}>
      <StatCard label="Sales" value={money(sales)} sub={enterprise} icon={DollarSign}/><StatCard label="Feed" value={money(feedCost)} sub="Selected period" icon={Wheat}/><StatCard label="Labour" value={money(labourCost)} sub="Selected period" icon={Hammer}/><StatCard label="Other expenses" value={money(other)} sub="Selected period" icon={Receipt}/><StatCard label="Total expenses" value={money(total)} sub="All costs" icon={Receipt}/><StatCard label={net>=0?"Net profit":"Net loss"} value={money(Math.abs(net))} sub="Sales − expenses" icon={DollarSign}/>
    </div>
    <Panel title={`Transaction history · ${tx.length}`}><div style={{display:"grid",gap:4}}>{tx.map((r,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"82px 1fr auto",gap:8,padding:"9px 0",borderBottom:`1px solid ${COLORS.hairline}`}}><div style={{fontSize:11,color:COLORS.inkSoft}}>{r.date}</div><div><div style={{fontSize:12,fontWeight:800}}>{r.type} · {r.desc}</div><div style={{fontSize:11,color:COLORS.inkSoft}}>{r.enterprise}</div></div><div style={{fontWeight:800,color:r.amount>=0?COLORS.mossDark:COLORS.rust}}>{r.amount>=0?"+":"−"}{money(Math.abs(r.amount))}</div></div>)}{!tx.length&&<div style={{color:COLORS.inkSoft,padding:10}}>No transactions match these filters.</div>}</div></Panel>
  </div>;
}


// ---------- Farm operations & performance — Stage 9 ----------
function OperationsTab({ operations, setOperations, batches }) {
  const [kind,setKind]=useState("Mortality");
  const [date,setDate]=useState(todayISO());
  const [enterprise,setEnterprise]=useState("Broilers");
  const [batchId,setBatchId]=useState("");
  const [quantity,setQuantity]=useState("");
  const [unit,setUnit]=useState("birds");
  const [note,setNote]=useState("");

  const activeBatches=batches.filter(b=>b.status==="Active" && (enterprise==="General Farm" || b.enterprise===enterprise));
  useEffect(()=>{ if(batchId && !activeBatches.some(b=>b.id===batchId)) setBatchId(""); },[enterprise,batches]);

  const addRecord=()=>{
    const q=Number(quantity);
    if(!date || !kind || !Number.isFinite(q) || q<=0) return alert("Enter a valid quantity greater than zero.");

    if(kind==="Mortality"){
      if(!batchId){
        return alert("Select the production cycle affected by this mortality.");
      }

      const selectedBatch=batches.find(b=>b.id===batchId);
      if(!selectedBatch){
        return alert("The selected production cycle could not be found.");
      }

      const opening=Number(selectedBatch.openingStock)||0;

      const previousDeaths=operations
        .filter(x=>x.batchId===batchId && x.kind==="Mortality")
        .reduce((sum,x)=>sum+(Number(x.quantity)||0),0);

      const liveStock=Math.max(0,opening-previousDeaths);

      if(q>liveStock){
        return alert(
          `Mortality cannot exceed the remaining live stock (${liveStock.toLocaleString()}).`
        );
      }
    }

    setOperations(prev=>[{id:`op-${Date.now()}`,kind,date,enterprise,batchId,quantity:q,unit:unit.trim()||"units",note:note.trim()},...prev]);
    setQuantity(""); setNote("");
  };
  const mortality=operations.filter(x=>x.kind==="Mortality").reduce((s,x)=>s+(Number(x.quantity)||0),0);
  const production=operations.filter(x=>x.kind==="Production").reduce((s,x)=>s+(Number(x.quantity)||0),0);
  const adjustments=operations.filter(x=>x.kind==="Stock adjustment").length;
  const batchRows=batches.map(b=>{
    const ops=operations.filter(x=>x.batchId===b.id);
    const deaths=ops.filter(x=>x.kind==="Mortality").reduce((s,x)=>s+(Number(x.quantity)||0),0);
    const output=ops.filter(x=>x.kind==="Production").reduce((s,x)=>s+(Number(x.quantity)||0),0);
    const opening=Number(b.openingStock)||0;
    const rate=opening>0 ? deaths/opening*100 : null;
    const liveStock=Math.max(0,opening-deaths);
    return {...b,deaths,output,rate,liveStock};
  });

  return <div>
    <div style={{marginBottom:18}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}><Activity size={22} color={COLORS.mossDark}/><h2 style={{margin:0,fontFamily:FONT_HEAD,fontSize:28,color:COLORS.ink}}>Farm operations</h2></div>
      <div style={{fontFamily:FONT_BODY,fontSize:13,color:COLORS.inkSoft}}>Record mortality, farm output and stock adjustments, then monitor production-cycle performance.</div>
    </div>
    <Panel title="Add operational record"><div style={{display:"grid",gap:10}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:10}}>
        <Field label="Record type"><select style={inputStyle} value={kind} onChange={e=>setKind(e.target.value)}><option>Mortality</option><option>Production</option><option>Stock adjustment</option></select></Field>
        <Field label="Date"><input type="date" style={inputStyle} value={date} onChange={e=>setDate(e.target.value)}/></Field>
        <Field label="Enterprise"><select style={inputStyle} value={enterprise} onChange={e=>setEnterprise(e.target.value)}>{ENTERPRISES.map(x=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Production cycle"><select style={inputStyle} value={batchId} onChange={e=>setBatchId(e.target.value)}><option value="">Unassigned / whole farm</option>{activeBatches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        <Field label="Quantity"><input type="number" min="0" step="any" inputMode="decimal" style={inputStyle} value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="0"/></Field>
        <Field label="Unit"><input style={inputStyle} value={unit} onChange={e=>setUnit(e.target.value)} placeholder="birds, eggs, kg..."/></Field>
      </div>
      <Field label="Reason / note"><input style={inputStyle} value={note} onChange={e=>setNote(e.target.value)} placeholder={kind==="Mortality"?"e.g. suspected heat stress":kind==="Production"?"e.g. eggs collected / fish harvested":"e.g. physical count correction"}/></Field>
      <div><LedgerButton onClick={addRecord}><Plus size={16}/> Add operational record</LedgerButton></div>
    </div></Panel>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:10,marginBottom:14}}>
      <StatCard label="Mortality logged" value={mortality.toLocaleString()} sub="All recorded units"/>
      <StatCard label="Production logged" value={production.toLocaleString()} sub="All recorded units"/>
      <StatCard label="Stock adjustments" value={adjustments.toLocaleString()} sub="Adjustment records"/>
      <StatCard label="Operational records" value={operations.length.toLocaleString()} sub="Total entries"/>
    </div>
    <Panel title="Batch performance indicators"><div style={{display:"grid",gap:8}}>
      {batchRows.map(b=><div key={b.id} style={{border:`1px solid ${COLORS.hairline}`,borderRadius:12,padding:12}}>
        <div style={{fontFamily:FONT_HEAD,fontWeight:800,color:COLORS.ink}}>{b.name}</div><div style={{fontSize:11.5,color:COLORS.inkSoft,marginBottom:8}}>{b.enterprise} · {b.status}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8}}>
          <div><div style={{fontSize:10.5,color:COLORS.inkSoft}}>Mortality</div><b>{b.deaths.toLocaleString()}</b></div>
          <div><div style={{fontSize:10.5,color:COLORS.inkSoft}}>Mortality rate</div><b>{b.rate===null?"—":`${b.rate.toFixed(1)}%`}</b></div>
          <div><div style={{fontSize:10.5,color:COLORS.inkSoft}}>Live stock</div><b>{b.liveStock.toLocaleString()}</b></div>
                  <div><div style={{fontSize:10.5,color:COLORS.inkSoft}}>Output logged</div><b>{b.output.toLocaleString()}</b></div>
        </div>
      </div>)}
      {!batchRows.length&&<div style={{color:COLORS.inkSoft,padding:8}}>Create a production cycle in Batches to see cycle performance here.</div>}
    </div></Panel>
    <Panel title={`Operational history (${operations.length})`}><div style={{display:"grid",gap:4}}>
      {operations.map(r=>{const b=batches.find(x=>x.id===r.batchId);return <div key={r.id} style={{display:"grid",gridTemplateColumns:"78px 1fr auto",gap:8,padding:"10px 0",borderBottom:`1px solid ${COLORS.hairline}`}}><div style={{fontSize:11,color:COLORS.inkSoft}}>{r.date}</div><div><div style={{fontSize:12,fontWeight:800}}>{r.kind} · {r.quantity} {r.unit}</div><div style={{fontSize:11,color:COLORS.inkSoft}}>{r.enterprise}{b?` · ${b.name}`:""}{r.note?` · ${r.note}`:""}</div></div><button onClick={()=>setOperations(prev=>prev.filter(x=>x.id!==r.id))} style={{border:"none",background:"transparent",color:COLORS.rust}}><Trash2 size={17}/></button></div>})}
      {!operations.length&&<div style={{color:COLORS.inkSoft,padding:8}}>No operational records yet.</div>}
    </div></Panel>
  </div>;
}


function DataManagementTab({items,setItems,labor,setLabor,feed,setFeed,income,setIncome,expenses,setExpenses,batches,setBatches,operations,setOperations}) {
  const [message,setMessage]=useState("");
  const readStoredList=(key,fallback)=>{
    try{const raw=localStorage.getItem(key); if(raw===null)return fallback; const parsed=JSON.parse(raw); return Array.isArray(parsed)?parsed:fallback;}catch{return fallback;}
  };
  const allData=()=>({
    app:"PAPI Farm Ledger",version:10,exportedAt:new Date().toISOString(),
    inventory:readStoredList(KEYS.inventory,items),
    labor:readStoredList(KEYS.labor,labor),
    feed:readStoredList(KEYS.feed,feed),
    income:readStoredList(KEYS.income,income),
    expenses:readStoredList(KEYS.expenses,expenses),
    batches:readStoredList("farm-ledger-batches-v1",batches),
    operations:readStoredList("farm-ledger-operations-v1",operations)
  });
  const downloadBackup=()=>{
    let url;
    try{
      const data=allData();
      const counts=Object.fromEntries(["inventory","labor","feed","income","expenses","batches","operations"].map(k=>[k,data[k].length]));
      const total=Object.values(counts).reduce((sum,n)=>sum+n,0);
      if(!total){setMessage("Backup blocked: no records were found in storage. No file was created.");return;}
      const blob=new Blob([JSON.stringify({...data,recordCounts:counts,totalRecords:total},null,2)],{type:"application/json"});
      url=URL.createObjectURL(blob);
      const a=document.createElement("a"); a.href=url; a.download=`papi-farm-ledger-backup-${todayISO()}.json`;
      a.style.display="none"; document.body.appendChild(a); a.click(); a.remove();
      setMessage(`Backup prepared: ${total} records (${Object.entries(counts).map(([k,n])=>`${k} ${n}`).join("; ")}). Check Downloads before relying on it.`);
      setTimeout(()=>{if(url)URL.revokeObjectURL(url);},60000);
    }catch(e){if(url)URL.revokeObjectURL(url);setMessage(`Backup failed: ${e?.message||"unknown error"}. No success was reported.`);}
  };
  const restoreBackup=(e)=>{
    const file=e.target.files&&e.target.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const d=JSON.parse(String(reader.result||"{}"));
        if(!d || typeof d!=="object" || d.app!=="PAPI Farm Ledger") throw new Error("invalid");
        const categories=["inventory","labor","feed","income","expenses","batches","operations"];
        if(!categories.some(k=>Array.isArray(d[k]))) throw new Error("invalid");
        const missing=categories.filter(k=>!Array.isArray(d[k]));
        if(missing.length && !window.confirm(`This backup is missing ${missing.join(", ")}. Those categories will be left unchanged. Continue?`)){e.target.value="";return;}
        if(!window.confirm("Restore this backup? Only categories present in the file will replace current records.")){e.target.value="";return;}
        if(Array.isArray(d.inventory))setItems(d.inventory);
        if(Array.isArray(d.labor))setLabor(d.labor);
        if(Array.isArray(d.feed))setFeed(d.feed);
        if(Array.isArray(d.income))setIncome(d.income);
        if(Array.isArray(d.expenses))setExpenses(d.expenses);
        if(Array.isArray(d.batches))setBatches(d.batches);
        if(Array.isArray(d.operations))setOperations(d.operations);
        setMessage("Restore completed for categories present in the backup. Verify record counts before continuing.");
      }catch(err){setMessage("This file is not a valid PAPI Farm Ledger backup.");}
      e.target.value="";
    };
    reader.readAsText(file);
  };
  const clearAll=()=>{
    if(!window.confirm("Delete ALL PAPI Farm Ledger records from this device? Make a backup first. This cannot be undone."))return;
    if(!window.confirm("Final confirmation: permanently clear all records?"))return;
    setItems([]);setLabor([]);setFeed([]);setIncome([]);setExpenses([]);setBatches([]);setOperations([]);
    setMessage("All PAPI Farm Ledger records on this device have been cleared.");
  };
  const count=items.length+labor.length+feed.length+income.length+expenses.length+batches.length+operations.length;
  return <div style={{display:"grid",gap:16}}>
    <div><h2 style={{fontFamily:FONT_HEAD,color:COLORS.ink,margin:"4px 0 4px",fontSize:25}}>Data & backup</h2>
    <div style={{fontFamily:FONT_BODY,color:COLORS.inkSoft,fontSize:13}}>Protect your farm records before launch. Export a backup regularly and restore it when moving to another browser or device.</div></div>
    <Panel title="Backup your records"><div style={{display:"grid",gap:12}}>
      <div style={{padding:14,borderRadius:14,background:COLORS.panelAlt}}><div style={{fontWeight:800,color:COLORS.ink}}>Records currently tracked</div><div style={{fontSize:28,fontWeight:800,color:COLORS.mossDark}}>{count}</div><div style={{fontSize:12,color:COLORS.inkSoft}}>Across inventory, labour, feed, expenses, sales, batches and operations.</div></div>
      <LedgerButton onClick={downloadBackup}><Download size={17}/> Export full backup</LedgerButton>
      <div style={{fontSize:12,color:COLORS.inkSoft}}>The backup is a JSON file containing your PAPI Farm Ledger records. Keep it somewhere safe.</div>
    </div></Panel>
    <Panel title="Restore a backup"><div style={{display:"grid",gap:10}}>
      <label style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,background:COLORS.moss,color:"white",padding:"12px 16px",borderRadius:12,fontWeight:800,cursor:"pointer"}}>
        <Upload size={17}/> Choose backup file
        <input type="file" accept=".json,application/json" onChange={restoreBackup} style={{display:"none"}}/>
      </label>
      <div style={{fontSize:12,color:COLORS.inkSoft}}>Restoring replaces the records currently stored by this Farm Ledger on this device.</div>
    </div></Panel>
    <Panel title="Data protection"><div style={{display:"grid",gap:10}}><div style={{padding:12,borderRadius:12,background:COLORS.bg}}><b>Admin clearance PIN</b><div style={{fontSize:12,color:COLORS.inkSoft,margin:"4px 0 8px"}}>Default PIN is 2468 until you change it. Use this PIN to authorize protected sales edits and deletions.</div><button onClick={()=>{const current=window.prompt("Enter current admin PIN:");if(current!==(localStorage.getItem("farm-ledger-admin-pin")||"2468")){alert("Incorrect PIN.");return;}const next=window.prompt("Enter new 4–8 digit PIN:");if(!/^\d{4,8}$/.test(next||"")){alert("PIN must be 4–8 digits.");return;}localStorage.setItem("farm-ledger-admin-pin",next);alert("Admin PIN changed.");}} style={{padding:"9px 12px",borderRadius:10,border:`1px solid ${COLORS.moss}`,background:"white",color:COLORS.mossDark,fontWeight:800}}>Change admin PIN</button></div>
      <div style={{display:"flex",gap:10,alignItems:"flex-start"}}><ShieldCheck size={22} color={COLORS.moss}/><div><b>Local-device storage</b><div style={{fontSize:12,color:COLORS.inkSoft}}>Your current version stores records in this browser/device. Clearing browser storage can remove them, so keep backups.</div></div></div>
      <button onClick={clearAll} style={{marginTop:8,padding:"12px 16px",borderRadius:12,border:`1px solid ${COLORS.rust}`,background:"white",color:COLORS.rust,fontWeight:800}}>Delete all local records</button>
    </div></Panel>
    <Panel title="Launch readiness"><div style={{display:"grid",gap:8,fontSize:13,color:COLORS.ink}}>
      <div>✓ Inventory and stock records</div><div>✓ Labour and feed costing</div><div>✓ Expenses and sales</div><div>✓ Profit/loss and reports</div><div>✓ Enterprise and batch profitability</div><div>✓ Farm operations and mortality tracking</div><div>✓ Backup and restore</div>
      <div style={{marginTop:6,fontSize:12,color:COLORS.inkSoft}}>Stage 10 completes the current single-device Farm Ledger build. Cloud accounts and multi-device synchronization would be a separate deployment phase.</div>
    </div></Panel>
    {message&&<div style={{padding:12,borderRadius:12,background:COLORS.panelAlt,color:COLORS.ink,fontWeight:700}}>{message}</div>}
  </div>;
}

export default function FarmLedger() {
  const [batches,setBatches]=useState(()=>{try{return JSON.parse(localStorage.getItem("farm-ledger-batches-v1")||"[]")}catch{return []}});
  const [operations,setOperations]=useState(()=>{try{return JSON.parse(localStorage.getItem("farm-ledger-operations-v1")||"[]")}catch{return []}});
  useEffect(()=>{localStorage.setItem("farm-ledger-batches-v1",JSON.stringify(batches))},[batches]);
  useEffect(()=>{localStorage.setItem("farm-ledger-operations-v1",JSON.stringify(operations))},[operations]);
  useGoogleFonts();
  const [tab, setTab] = useState("summary");
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState([]);
  const [labor, setLabor] = useState([]);
  const [feed, setFeed] = useState([]);
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    const i = loadList(KEYS.inventory);
    const l = loadList(KEYS.labor);
    const f = loadList(KEYS.feed);
    const inc = loadList(KEYS.income);
    const exp = loadList(KEYS.expenses);
    setItems(i);
    setLabor(l);
    setFeed(f);
    setIncome(inc);
    setExpenses(exp);
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) saveList(KEYS.inventory, items); }, [items, loaded]);
  useEffect(() => { if (loaded) saveList(KEYS.labor, labor); }, [labor, loaded]);
  useEffect(() => { if (loaded) saveList(KEYS.feed, feed); }, [feed, loaded]);
  useEffect(() => { if (loaded) saveList(KEYS.income, income); }, [income, loaded]);
  useEffect(() => { if (loaded) saveList(KEYS.expenses, expenses); }, [expenses, loaded]);

  const laborTotal = labor.reduce((s, e) => s + e.cost, 0);
  const feedTotal = feed.reduce((s, e) => s + e.cost, 0);
  const otherExpenseTotal = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const tabs = [
    { key: "summary", label: "Dashboard", icon: LayoutGrid },
    { key: "inventory", label: "Inventory", icon: Package },
    { key: "labor", label: "Labour", icon: Hammer },
    { key: "feed", label: "Feed", icon: Wheat },
    { key: "expenses", label: "Expenses", icon: Receipt },
    { key: "finance", label: "Sales", icon: DollarSign },
    { key: "reports", label: "Reports", icon: FileText },
    { key: "batches", label: "Batches", icon: Package },
    { key: "operations", label: "Operations", icon: Activity },
    { key: "settings", label: "Data", icon: Settings }];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, padding: "0 0 32px" }}>
      <div style={{ background: `linear-gradient(135deg, ${COLORS.mossDark}, ${COLORS.moss})`, color: "white", padding: "20px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "white", color: COLORS.mossDark, display: "grid", placeItems: "center", fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 17, boxShadow: "0 8px 22px rgba(0,0,0,.12)" }}>PAPI</div>
          <div>
            <div style={{ fontFamily: FONT_HEAD, fontWeight: 800, fontSize: 22 }}>PAPI Farm Ledger</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, opacity: .9 }}>Simple records for your farm</div>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "22px 16px" }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: COLORS.moss, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".08em" }}>Farmer records & accounting</div>
          <h1 style={{ fontFamily: FONT_HEAD, fontSize: 28, fontWeight: 800, color: COLORS.ink, margin: 0 }}>PAPI Farm Ledger</h1>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: COLORS.inkSoft, marginTop: 5 }}>Track stock, labour, feed, expenses, sales and profit by enterprise. Records are saved automatically on this device.</div>
        </div>
        {!loaded ? (
          <div style={{ fontFamily: FONT_BODY, color: COLORS.inkSoft, padding: 20 }}>Loading your records…</div>
        ) : (
          <>
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}><div style={{ minWidth: 760 }}><TabBar tabs={tabs} active={tab} onChange={setTab} /></div></div>
            {tab === "inventory" && <InventoryTab items={items} setItems={setItems} />}
            {tab === "labor" && <LaborTab entries={labor} setEntries={setLabor} batches={batches} />}
            {tab === "feed" && <FeedTab entries={feed} setEntries={setFeed} batches={batches} />}
            {tab === "expenses" && <ExpensesTab expenses={expenses} setExpenses={setExpenses} laborTotal={laborTotal} feedTotal={feedTotal} batches={batches} />}
            {tab === "finance" && <FinanceTab income={income} setIncome={setIncome} laborTotal={laborTotal} feedTotal={feedTotal} otherExpenseTotal={otherExpenseTotal} batches={batches} />}
            {tab === "reports" && <ReportsTab labor={labor} feed={feed} income={income} expenses={expenses} />}
        {tab === "batches" && <BatchesTab batches={batches} setBatches={setBatches} labor={labor} feed={feed} income={income} expenses={expenses} />}
            {tab === "operations" && <OperationsTab operations={operations} setOperations={setOperations} batches={batches} />}
            {tab === "settings" && <DataManagementTab items={items} setItems={setItems} labor={labor} setLabor={setLabor} feed={feed} setFeed={setFeed} income={income} setIncome={setIncome} expenses={expenses} setExpenses={setExpenses} batches={batches} setBatches={setBatches} operations={operations} setOperations={setOperations} />}
            {tab === "summary" && <SummaryTab items={items} labor={labor} feed={feed} income={income} expenses={expenses} />}
          </>
        )}
      </div>
    </div>
  );
}
