import { useState, useMemo } from "react";
import { Droplets, Plus, Edit2, Search, X, Save, Trash2, Filter, ArrowLeft, Eye, TriangleAlert, MinusCircle, CirclePlus } from "lucide-react";
import { Card, Button, Modal, Input, TextArea, Select, EmptyState, Badge, useConfirm, useToast } from "../components/ui.jsx";
import { genId, saveDB } from "../lib/db.js";
import { PERMISSIONS } from "../lib/constants.js";

// ─── Supplies Inventory Module ───────────────────────────────────────
const SUPPLY_CATEGORIES = ["All", "Brake Fluid", "Cleaning", "Lubricants", "Tires", "Suspension", "Assembly", "Cockpit", "Electronics"];

export function SuppliesModule({ db, setDb, perms = PERMISSIONS.owner }) {
  const [catFilter, setCatFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const confirm = useConfirm();
  const toast = useToast();

  const supplies = db.supplies || [];
  const filtered = supplies.filter(s => catFilter === "All" || s.category === catFilter);
  const lowStockCount = supplies.filter(s => s.currentStock <= s.reorderThreshold).length;

  function saveSupply(supply) {
    const updated = { ...db };
    const isNew = !supply.id;
    if (supply.id) {
      updated.supplies = updated.supplies.map(s => s.id === supply.id ? supply : s);
    } else {
      updated.supplies = [...updated.supplies, { ...supply, id: genId() }];
    }
    setDb(updated); saveDB(updated); setShowForm(false); setEditing(null);
    toast.success(isNew ? "Supply added" : "Supply updated");
  }

  async function deleteSupply(id) {
    const supply = (db.supplies || []).find(s => s.id === id);
    if (!await confirm(`Delete "${supply?.name || "this supply"}"?`, { title: "Delete supply?", variant: "danger" })) return;
    const updated = { ...db, supplies: db.supplies.filter(s => s.id !== id) };
    setDb(updated); saveDB(updated);
    toast.success("Supply deleted");
  }

  function adjustStock(supplyId, delta) {
    const updated = { ...db };
    updated.supplies = updated.supplies.map(s => s.id === supplyId ? { ...s, currentStock: Math.max(0, s.currentStock + delta) } : s);
    setDb(updated); saveDB(updated);
  }

  const blankSupply = { name: "", category: "Cleaning", currentStock: 0, unit: "units", reorderThreshold: 1, unitCost: 0, compatibleWith: "", safetyNote: "", location: "Workshop", notes: "" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplies</h1>
          <p className="text-sm text-gray-500 mt-1">{supplies.length} items | {lowStockCount > 0 ? <span className="text-red-500 font-medium">{lowStockCount} low stock</span> : "Stock levels OK"}</p>
        </div>
        {perms.suppliesEdit && <Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={16} /> Add Supply</Button>}
      </div>

      <div className="flex gap-1 flex-wrap">
        {SUPPLY_CATEGORIES.map(c => (
          <button key={c} onClick={() => setCatFilter(c)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${catFilter === c ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}>{c}</button>
        ))}
      </div>

      <div className="grid gap-3">
        {filtered.map(supply => {
          const isLow = supply.currentStock <= supply.reorderThreshold;
          return (
            <Card key={supply.id} className={`p-4 ${isLow ? "ring-1 ring-red-200" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 text-sm">{supply.name}</h3>
                    <Badge color={isLow ? "red" : "green"}>{supply.currentStock} {supply.unit}</Badge>
                    <Badge color="gray">{supply.category}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                    {supply.unitCost > 0 && <span>${supply.unitCost.toFixed(2)}/{supply.unit}</span>}
                    <span>{supply.location}</span>
                    {supply.compatibleWith && <span>For: {supply.compatibleWith}</span>}
                  </div>
                  {supply.safetyNote && (
                    <div className={`mt-2 p-2 rounded text-xs font-medium ${supply.safetyNote.includes("MINERAL OIL") ? "bg-red-50 border border-red-200 text-red-700" : supply.safetyNote.includes("DOT") ? "bg-orange-50 border border-orange-200 text-orange-700" : "bg-yellow-50 border border-yellow-200 text-yellow-700"}`}>
                      <TriangleAlert size={12} className="inline mr-1" />{supply.safetyNote}
                    </div>
                  )}
                  {supply.notes && <p className="text-xs text-gray-400 mt-1 italic">{supply.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <button onClick={() => adjustStock(supply.id, -1)} disabled={supply.currentStock <= 0} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-30"><MinusCircle size={16} /></button>
                    <span className="text-lg font-bold text-gray-900 w-8 text-center">{supply.currentStock}</span>
                    <button onClick={() => adjustStock(supply.id, 1)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"><CirclePlus size={16} /></button>
                  </div>
                  {isLow && <span className="text-[10px] text-red-500 font-medium">Reorder at {supply.reorderThreshold}</span>}
                  {perms.suppliesEdit && <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(supply); setShowForm(true); }}><Edit2 size={14} /></Button>
                    {perms.deleteRecords && <Button variant="ghost" size="sm" onClick={() => deleteSupply(supply.id)}><Trash2 size={14} className="text-red-500" /></Button>}
                  </div>}
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && <EmptyState icon={Droplets} title="No supplies found" description="Add your first supply item" />}
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? "Edit Supply" : "Add Supply"} wide>
        <SupplyForm initial={editing || blankSupply} onSave={saveSupply} onCancel={() => { setShowForm(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}

function SupplyForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function handleSave() {
    onSave({ ...form, unitCost: parseFloat(form.unitCost) || 0, currentStock: parseInt(form.currentStock) || 0, reorderThreshold: parseInt(form.reorderThreshold) || 1 });
  }

  return (
    <div className="space-y-4">
      <Input label="Name" value={form.name} onChange={e => set("name", e.target.value)} />
      <div className="grid grid-cols-3 gap-4">
        <Select label="Category" value={form.category} onChange={e => set("category", e.target.value)}
          options={SUPPLY_CATEGORIES.filter(c => c !== "All").map(c => ({ value: c, label: c }))} />
        <Input label="Unit" value={form.unit} onChange={e => set("unit", e.target.value)} placeholder="e.g. bottles, cans" />
        <Input label="Unit Cost ($)" type="number" step="0.01" value={form.unitCost} onChange={e => set("unitCost", e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Input label="Current Stock" type="number" value={form.currentStock} onChange={e => set("currentStock", e.target.value)} />
        <Input label="Reorder Threshold" type="number" value={form.reorderThreshold} onChange={e => set("reorderThreshold", e.target.value)} />
        <Input label="Location" value={form.location || ""} onChange={e => set("location", e.target.value)} />
      </div>
      <Input label="Compatible With" value={form.compatibleWith || ""} onChange={e => set("compatibleWith", e.target.value)} placeholder="e.g. Shimano, Magura, All" />
      <Input label="Safety Note" value={form.safetyNote || ""} onChange={e => set("safetyNote", e.target.value)} placeholder="e.g. MINERAL OIL - Do NOT mix with DOT" />
      <TextArea label="Notes" value={form.notes || ""} onChange={e => set("notes", e.target.value)} />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={!form.name}><Save size={16} /> Save</Button>
      </div>
    </div>
  );
}

