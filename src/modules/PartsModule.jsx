import { useState, useMemo } from "react";
import { Package, Plus, Edit2, Search, X, Save, Trash2, Filter, ArrowLeft, DollarSign, Eye, ShoppingCart, TriangleAlert, MinusCircle, CirclePlus } from "lucide-react";
import { Card, Button, Modal, Input, TextArea, Select, EmptyState, Badge, useConfirm, useToast } from "../components/ui.jsx";
import { genId, saveDB } from "../lib/db.js";
import { PERMISSIONS } from "../lib/constants.js";

// ─── Parts Inventory Module ──────────────────────────────────────────
const PART_CATEGORIES = ["All", "Brakes", "Chains", "Tires", "Wheels", "Drivetrain", "Suspension", "Electronics", "General"];

export function PartsModule({ db, setDb, perms = PERMISSIONS.owner }) {
  const [catFilter, setCatFilter] = useState("All");
  const [searchQ, setSearchQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedBikeFilter, setSelectedBikeFilter] = useState("all");
  const [showLowStock, setShowLowStock] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  const parts = db.parts || [];

  const filtered = parts.filter(p => {
    if (catFilter !== "All" && p.category !== catFilter) return false;
    if (searchQ && !p.name.toLowerCase().includes(searchQ.toLowerCase()) && !p.sku?.toLowerCase().includes(searchQ.toLowerCase())) return false;
    if (selectedBikeFilter !== "all" && !(p.compatibleBikeIds || []).includes(selectedBikeFilter)) return false;
    if (showLowStock && p.currentStock > p.reorderThreshold) return false;
    return true;
  });

  const lowStockCount = parts.filter(p => p.currentStock <= p.reorderThreshold).length;

  function savePart(part) {
    const updated = { ...db };
    const isNew = !part.id;
    if (part.id) {
      updated.parts = updated.parts.map(p => p.id === part.id ? part : p);
    } else {
      updated.parts = [...updated.parts, { ...part, id: genId() }];
    }
    setDb(updated); saveDB(updated); setShowForm(false); setEditing(null);
    toast.success(isNew ? "Part added" : "Part updated");
  }

  async function deletePart(id) {
    const part = (db.parts || []).find(p => p.id === id);
    if (!await confirm(`Delete "${part?.name || "this part"}"?`, { title: "Delete part?", variant: "danger" })) return;
    const updated = { ...db, parts: db.parts.filter(p => p.id !== id) };
    setDb(updated); saveDB(updated);
    toast.success("Part deleted");
  }

  function adjustStock(partId, delta) {
    const updated = { ...db };
    updated.parts = updated.parts.map(p => p.id === partId ? { ...p, currentStock: Math.max(0, p.currentStock + delta) } : p);
    setDb(updated); saveDB(updated);
  }

  const blankPart = { sku: "", name: "", category: "General", unitCost: 0, currentStock: 0, reorderThreshold: 1, supplier: "", compatibleBikeIds: [], compatibleModels: [], alternativePartIds: [], fluidType: null, notes: "", location: "Workshop", lastOrdered: null, leadTimeDays: 14 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parts Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">{parts.length} parts | {lowStockCount > 0 ? <span className="text-red-500 font-medium">{lowStockCount} low stock</span> : "Stock levels OK"}</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={16} /> Add Part</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search parts..." className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48" />
        </div>
        <div className="flex gap-1">
          {PART_CATEGORIES.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${catFilter === c ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}>{c}</button>
          ))}
        </div>
        <Select value={selectedBikeFilter} onChange={e => setSelectedBikeFilter(e.target.value)}
          options={[{ value: "all", label: "All Bikes" }, ...db.bicycles.map(b => ({ value: b.id, label: b.nickname || b.make + " " + b.model }))]} />
        <button onClick={() => setShowLowStock(!showLowStock)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showLowStock ? "bg-red-100 text-red-700" : "text-gray-600 hover:bg-gray-100"}`}>
          <span className="flex items-center gap-1"><TriangleAlert size={12} /> Low Stock</span>
        </button>
      </div>

      {/* Parts Grid */}
      <div className="grid gap-3">
        {filtered.map(part => {
          const isLow = part.currentStock <= part.reorderThreshold;
          const compatBikes = (part.compatibleBikeIds || []).map(bid => db.bicycles.find(b => b.id === bid)).filter(Boolean);
          const altParts = (part.alternativePartIds || []).map(pid => parts.find(p => p.id === pid)).filter(Boolean);
          return (
            <Card key={part.id} className={`p-4 ${isLow ? "ring-1 ring-red-200" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 text-sm">{part.name}</h3>
                    <Badge color={isLow ? "red" : "green"}>{part.currentStock} in stock</Badge>
                    {part.fluidType && <Badge color={part.fluidType === "mineral_oil" ? "red" : "orange"}>{part.fluidType === "mineral_oil" ? "Mineral Oil" : "DOT"}</Badge>}
                  </div>
                  {part.sku && <p className="text-xs text-gray-400 mt-0.5">SKU: {part.sku}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                    <span><Badge color="gray">{part.category}</Badge></span>
                    {perms.partsViewCost && <span>${part.unitCost.toFixed(2)}</span>}
                    {perms.partsViewCost && <span>{part.supplier}</span>}
                    <span>{part.location}</span>
                    {part.leadTimeDays > 0 && <span>{part.leadTimeDays}d lead time</span>}
                  </div>
                  {compatBikes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-[10px] text-gray-400 mr-1">Fits:</span>
                      {compatBikes.map(b => <Badge key={b.id} color="blue">{b.nickname || b.make}</Badge>)}
                    </div>
                  )}
                  {altParts.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-[10px] text-gray-400 mr-1">Alt:</span>
                      {altParts.map(a => <Badge key={a.id} color="purple">{a.name}</Badge>)}
                    </div>
                  )}
                  {part.notes && <p className="text-xs text-gray-400 mt-1 italic">{part.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <button onClick={() => adjustStock(part.id, -1)} disabled={part.currentStock <= 0} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Use 1"><MinusCircle size={16} /></button>
                    <span className="text-lg font-bold text-gray-900 w-8 text-center">{part.currentStock}</span>
                    <button onClick={() => adjustStock(part.id, 1)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Add 1"><CirclePlus size={16} /></button>
                  </div>
                  {isLow && <span className="text-[10px] text-red-500 font-medium">Reorder at {part.reorderThreshold}</span>}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(part); setShowForm(true); }}><Edit2 size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deletePart(part.id)}><Trash2 size={14} className="text-red-500" /></Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && <EmptyState icon={Package} title="No parts found" description={searchQ || catFilter !== "All" ? "Try adjusting your filters" : "Add your first part"} />}
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? "Edit Part" : "Add Part"} wide>
        <PartForm initial={editing || blankPart} bicycles={db.bicycles} parts={parts} onSave={savePart} onCancel={() => { setShowForm(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}

function PartForm({ initial, bicycles, parts, onSave, onCancel }) {
  const [form, setForm] = useState({ ...initial, compatBikeStr: (initial.compatibleBikeIds || []).join(","), altPartStr: (initial.alternativePartIds || []).join(",") });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (submitted) setErrors(e => ({ ...e, [k]: undefined })); };

  function validate() {
    const errs = {};
    if (!form.name?.trim()) errs.name = "Part name is required";
    if (parseFloat(form.unitCost) < 0) errs.unitCost = "Cannot be negative";
    if (parseInt(form.currentStock) < 0) errs.currentStock = "Cannot be negative";
    if (parseInt(form.reorderThreshold) < 0) errs.reorderThreshold = "Cannot be negative";
    return errs;
  }

  function handleSave() {
    setSubmitted(true);
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const { compatBikeStr, altPartStr, ...rest } = form;
    onSave({
      ...rest,
      unitCost: parseFloat(rest.unitCost) || 0,
      currentStock: parseInt(rest.currentStock) || 0,
      reorderThreshold: parseInt(rest.reorderThreshold) || 1,
      leadTimeDays: parseInt(rest.leadTimeDays) || 14,
      compatibleBikeIds: compatBikeStr.split(",").map(s => s.trim()).filter(Boolean),
      alternativePartIds: altPartStr.split(",").map(s => s.trim()).filter(Boolean),
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Part Name" value={form.name} onChange={e => set("name", e.target.value)} required error={errors.name} />
        <Input label="SKU" value={form.sku || ""} onChange={e => set("sku", e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Select label="Category" value={form.category} onChange={e => set("category", e.target.value)}
          options={PART_CATEGORIES.filter(c => c !== "All").map(c => ({ value: c, label: c }))} />
        <Input label="Unit Cost ($)" type="number" step="0.01" value={form.unitCost} onChange={e => set("unitCost", e.target.value)} error={errors.unitCost} />
        <Input label="Supplier" value={form.supplier || ""} onChange={e => set("supplier", e.target.value)} />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <Input label="Current Stock" type="number" value={form.currentStock} onChange={e => set("currentStock", e.target.value)} error={errors.currentStock} />
        <Input label="Reorder Threshold" type="number" value={form.reorderThreshold} onChange={e => set("reorderThreshold", e.target.value)} error={errors.reorderThreshold} />
        <Input label="Lead Time (days)" type="number" value={form.leadTimeDays} onChange={e => set("leadTimeDays", e.target.value)} />
        <Select label="Fluid Type" value={form.fluidType || ""} onChange={e => set("fluidType", e.target.value || null)}
          options={[{ value: "", label: "N/A" }, { value: "mineral_oil", label: "Mineral Oil" }, { value: "dot", label: "DOT" }]} />
      </div>
      <Input label="Location" value={form.location || ""} onChange={e => set("location", e.target.value)} />
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Compatible Bikes</label>
        <div className="flex flex-wrap gap-1.5">
          {bicycles.map(b => {
            const selected = (form.compatBikeStr || "").split(",").map(s => s.trim()).includes(b.id);
            return (
              <button key={b.id} type="button" onClick={() => {
                const ids = (form.compatBikeStr || "").split(",").map(s => s.trim()).filter(Boolean);
                const next = selected ? ids.filter(id => id !== b.id) : [...ids, b.id];
                set("compatBikeStr", next.join(","));
              }} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${selected ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {b.nickname || b.make}
              </button>
            );
          })}
        </div>
      </div>
      <TextArea label="Notes" value={form.notes || ""} onChange={e => set("notes", e.target.value)} />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave}><Save size={16} /> Save</Button>
      </div>
    </div>
  );
}

