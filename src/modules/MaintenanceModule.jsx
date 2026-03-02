import { useState, useMemo } from "react";
import { Wrench, Plus, Edit2, Search, ChevronDown, X, Save, Trash2, Filter, ArrowLeft, Clock, Eye, Calendar, ChevronRight, CheckCircle, ClipboardCheck } from "lucide-react";
import { Card, Button, Modal, Input, TextArea, Select, EmptyState, Badge, StatusBadge, useConfirm, useToast } from "../components/ui.jsx";
import { genId, saveDB } from "../lib/db.js";

// ─── Maintenance Module ──────────────────────────────────────────────
export function MaintenanceModule({ db, setDb }) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedMaint, setSelectedMaint] = useState(null);
  const confirm = useConfirm();
  const toast = useToast();

  const filtered = db.maintenance.filter(m => statusFilter === "All" || m.status === statusFilter.toLowerCase())
    .sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));

  const blankMaint = { bicycleId: db.bicycles[0]?.id || "", type: "", status: "scheduled", scheduledDate: "", completedDate: "", technician: "Grant", cost: 0, description: "", parts: [], notes: "", checklist: [] };

  function saveMaint(m) {
    const updated = { ...db };
    if (m.id) {
      updated.maintenance = updated.maintenance.map(x => x.id === m.id ? m : x);
    } else {
      // Auto-generate checklist for new records based on bike type
      const bike = db.bicycles.find(b => b.id === m.bicycleId);
      const bikeType = bike?.type || "Road";
      if (!m.checklist || m.checklist.length === 0) {
        m.checklist = generateChecklist(bikeType);
      }
      updated.maintenance = [...updated.maintenance, { ...m, id: genId() }];
    }
    setDb(updated); saveDB(updated); setShowForm(false); setEditing(null);
    toast.success(m.id ? "Maintenance record updated" : "Maintenance record created");
  }

  async function deleteMaint(id) {
    if (!await confirm("Delete this maintenance record? This cannot be undone.", { title: "Delete record?", variant: "danger" })) return;
    const updated = { ...db, maintenance: db.maintenance.filter(m => m.id !== id) };
    setDb(updated); saveDB(updated);
    if (selectedMaint === id) setSelectedMaint(null);
    toast.success("Maintenance record deleted");
  }

  function completeMaint(id) {
    const updated = { ...db };
    updated.maintenance = updated.maintenance.map(m => m.id === id ? { ...m, status: "completed", completedDate: new Date().toISOString().slice(0, 10) } : m);
    setDb(updated); saveDB(updated);
  }

  function updateChecklist(maintId, newChecklist) {
    const updated = { ...db };
    updated.maintenance = updated.maintenance.map(m => m.id === maintId ? { ...m, checklist: newChecklist } : m);
    setDb(updated); saveDB(updated);
  }

  // ── Detail View ──
  if (selectedMaint) {
    const m = db.maintenance.find(x => x.id === selectedMaint);
    if (!m) { setSelectedMaint(null); return null; }
    const bike = db.bicycles.find(b => b.id === m.bicycleId);
    const client = bike ? db.clients.find(c => c.id === bike.clientId) : null;
    const stats = checklistStats(m.checklist);

    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedMaint(null)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"><ArrowLeft size={16} /> Back to list</button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{m.type}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {bike ? `${bike.nickname || bike.make + " " + bike.model}` : "Unknown bike"}
              {client ? ` at ${client.name}` : ""} | {m.scheduledDate}
            </p>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={m.status} />
            {m.status === "scheduled" && (
              <Button variant="primary" size="sm" onClick={() => completeMaint(m.id)}>
                <CheckCircle size={16} /> Mark Complete
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => { setEditing(m); setShowForm(true); }}><Edit2 size={16} /> Edit</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-5 lg:col-span-1">
            <h3 className="font-semibold text-gray-900 mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              {[
                ["Service Type", m.type],
                ["Status", m.status],
                ["Technician", m.technician],
                ["Scheduled", m.scheduledDate],
                ["Completed", m.completedDate || "---"],
                ["Cost", `$${m.cost}`],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between"><dt className="text-gray-500">{l}</dt><dd className="font-medium text-gray-900">{v}</dd></div>
              ))}
            </dl>
            {m.description && <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100">{m.description}</p>}
            {m.parts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-1.5">Parts</p>
                <div className="flex flex-wrap gap-1">{m.parts.map((p, i) => <Badge key={i} color="gray">{p}</Badge>)}</div>
              </div>
            )}
            {m.notes && <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100 italic">{m.notes}</p>}

            {bike && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Bike Info</h4>
                <p className="text-sm font-medium text-gray-900">{bike.year} {bike.make} {bike.model}</p>
                <p className="text-xs text-gray-500">{bike.type} | {bike.components?.groupset || "---"}</p>
                {bike.components?.brakes && (
                  <p className="text-xs text-gray-500 mt-1">Brakes: {bike.components.brakes}</p>
                )}
                {bike.eVehicle && (
                  <p className="text-xs text-gray-500 mt-1">Motor: {bike.eVehicle.motorType} ({bike.eVehicle.motorPower})</p>
                )}
                {/* Critical safety callouts */}
                {bike.notes?.includes("mineral oil") && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-medium">
                    MINERAL OIL ONLY for brakes
                  </div>
                )}
                {bike.notes?.includes("DOT") && (
                  <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700 font-medium">
                    DOT brake fluid required
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-5 lg:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardCheck size={18} /> Inspection Checklist
              {stats.total > 0 && (
                <span className="text-xs font-normal text-gray-400 ml-auto">
                  {bike?.type || "Standard"} template | {stats.total} items
                </span>
              )}
            </h3>
            <ChecklistPanel
              checklist={m.checklist || []}
              onChange={(updated) => updateChecklist(m.id, updated)}
              readOnly={m.status === "completed"}
            />
          </Card>
        </div>

        <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title="Edit Maintenance" wide>
          <MaintForm initial={editing || blankMaint} bicycles={db.bicycles} clients={db.clients} onSave={saveMaint} onCancel={() => { setShowForm(false); setEditing(null); }} />
        </Modal>
      </div>
    );
  }

  // ── List View ──
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Maintenance</h1><p className="text-sm text-gray-500 mt-1">{db.maintenance.length} total records</p></div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={16} /> Schedule Service</Button>
      </div>
      <div className="flex gap-2">
        {["All", "Scheduled", "Completed"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}>{s}</button>
        ))}
      </div>
      <div className="grid gap-3">
        {filtered.map(m => {
          const bike = db.bicycles.find(b => b.id === m.bicycleId);
          const client = bike ? db.clients.find(c => c.id === bike.clientId) : null;
          return (
            <Card key={m.id} className="p-5" onClick={() => setSelectedMaint(m.id)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{m.type}</h3>
                    <StatusBadge status={m.status} />
                    <ChecklistBadge checklist={m.checklist} />
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{bike ? `${bike.nickname || bike.make + " " + bike.model}` : "Unknown bike"}{client ? ` - ${client.name}` : ""}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Scheduled: {m.scheduledDate} | Tech: {m.technician} | ${m.cost}</p>
                  {m.description && <p className="text-sm text-gray-600 mt-1">{m.description}</p>}
                  {m.parts.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{m.parts.map((p, i) => <Badge key={i} color="gray">{p}</Badge>)}</div>}
                  {m.notes && <p className="text-xs text-gray-400 mt-1 italic">{m.notes}</p>}
                </div>
                <div className="flex gap-1 ml-4" onClick={e => e.stopPropagation()}>
                  {m.status === "scheduled" && <Button variant="ghost" size="sm" onClick={() => completeMaint(m.id)} title="Mark complete"><CheckCircle size={16} className="text-green-500" /></Button>}
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(m); setShowForm(true); }}><Edit2 size={14} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMaint(m.id)}><Trash2 size={14} className="text-red-500" /></Button>
                  <ChevronRight size={20} className="text-gray-400 mt-1" />
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && <EmptyState icon={Calendar} title="No maintenance records" description="Schedule your first service" />}
      </div>
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? "Edit Maintenance" : "Schedule Service"} wide>
        <MaintForm initial={editing || blankMaint} bicycles={db.bicycles} clients={db.clients} onSave={saveMaint} onCancel={() => { setShowForm(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}

export function MaintForm({ initial, bicycles, clients, onSave, onCancel }) {
  const confirm = useConfirm();
  const [form, setForm] = useState({ ...initial, partsStr: (initial.parts || []).join(", ") });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const types = ["Tune-Up", "Chain Replacement", "Brake Service", "Wheel Truing", "Suspension Service", "Drivetrain Overhaul", "Bearing Service", "Cable Replacement", "Tire Replacement", "Full Overhaul", "Safety Inspection", "Fitting", "Custom Build", "Other"];

  const selectedBike = bicycles.find(b => b.id === form.bicycleId);
  const hasChecklist = form.checklist && form.checklist.length > 0;
  const clStats = hasChecklist ? checklistStats(form.checklist) : null;

  function handleSave() {
    const { partsStr, ...rest } = form;
    onSave({ ...rest, parts: partsStr.split(",").map(p => p.trim()).filter(Boolean) });
  }

  function handleGenerateChecklist() {
    const bikeType = selectedBike?.type || "Road";
    set("checklist", generateChecklist(bikeType));
  }

  async function handleResetChecklist() {
    if (!await confirm("Reset all checklist items to pending? This will clear any existing progress.", { title: "Reset checklist?", variant: "warning", confirmLabel: "Reset" })) return;
    const bikeType = selectedBike?.type || "Road";
    set("checklist", generateChecklist(bikeType));
  }

  return (
    <div className="space-y-4">
      <Select label="Bicycle" value={form.bicycleId} onChange={e => set("bicycleId", e.target.value)}
        options={[{ value: "", label: "-- Select --" }, ...bicycles.map(b => {
          const cl = clients.find(c => c.id === b.clientId);
          return { value: b.id, label: `${b.nickname ? b.nickname + " - " : ""}${b.make} ${b.model} (${cl?.name || "Unassigned"})` };
        })]} />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Service Type" value={form.type} onChange={e => set("type", e.target.value)} options={[{ value: "", label: "-- Select --" }, ...types.map(t => ({ value: t, label: t }))]} />
        <Select label="Status" value={form.status} onChange={e => set("status", e.target.value)} options={[{ value: "scheduled", label: "Scheduled" }, { value: "in-progress", label: "In Progress" }, { value: "completed", label: "Completed" }]} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Input label="Scheduled Date" type="date" value={form.scheduledDate} onChange={e => set("scheduledDate", e.target.value)} />
        <Input label="Completed Date" type="date" value={form.completedDate || ""} onChange={e => set("completedDate", e.target.value)} />
        <Input label="Cost ($)" type="number" step="0.01" value={form.cost} onChange={e => set("cost", parseFloat(e.target.value) || 0)} />
      </div>
      <Input label="Technician" value={form.technician} onChange={e => set("technician", e.target.value)} />
      <TextArea label="Description" value={form.description} onChange={e => set("description", e.target.value)} />
      <Input label="Parts (comma-separated)" value={form.partsStr} onChange={e => set("partsStr", e.target.value)} placeholder="e.g. Chain, Brake pads, Cable" />
      <TextArea label="Notes" value={form.notes} onChange={e => set("notes", e.target.value)} />

      {/* Checklist section */}
      <div className="pt-2 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Inspection Checklist</label>
          <div className="flex gap-2">
            {hasChecklist && (
              <Button variant="ghost" size="sm" onClick={handleResetChecklist}>
                Reset Checklist
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleGenerateChecklist} disabled={!form.bicycleId}>
              <ClipboardCheck size={14} /> {hasChecklist ? "Regenerate" : "Generate"} Checklist
            </Button>
          </div>
        </div>
        {hasChecklist ? (
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-700">{clStats.total} items</span>
              <span className="text-green-600">{clStats.pass} pass</span>
              {clStats.fail > 0 && <span className="text-red-600">{clStats.fail} fail</span>}
              <span className="text-gray-400">{clStats.na} N/A</span>
              <span className="text-gray-500">{clStats.pending} pending</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Template: {selectedBike?.type || "Standard"} bike.
              {selectedBike?.type === "Mountain" || selectedBike?.type === "E-Bike" ? " Includes suspension section." : ""}
              {selectedBike?.type === "E-Bike" || selectedBike?.type === "E-Dirt Bike" ? " Includes e-vehicle systems section." : ""}
              {" "}Use the detail view to fill out the checklist.
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            {form.bicycleId ? "Click \"Generate Checklist\" to create an inspection checklist tailored to this bike type." : "Select a bicycle first to generate a type-specific checklist."}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={!form.bicycleId || !form.type}><Save size={16} /> Save</Button>
      </div>
    </div>
  );
}

