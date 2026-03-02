import { useState, useMemo, useCallback } from "react";
import {
  Wrench, Plus, Edit2, Search, ChevronDown, ChevronRight, X, Save, Trash2,
  Filter, ArrowLeft, Clock, CheckCircle, AlertTriangle, MoveRight, Star,
  Columns3, List, Eye, CircleAlert, DollarSign, ArrowRightLeft, Check, ClipboardCheck, Package, User
} from "lucide-react";
import { Card, Button, Modal, Input, TextArea, Select, EmptyState, Badge, StatusBadge } from "../components/ui.jsx";
import { ChecklistPanel, ChecklistBadge } from "../components/ChecklistPanel.jsx";
import { computePmStatus, PmStatusBadge } from "../lib/pm-engine.jsx";
import { generateChecklist, checklistStats } from "../lib/checklist.js";
import { genId, saveDB } from "../lib/db.js";
import { WO_STATUSES, WO_PRIORITIES, WO_TYPES, WO_CATEGORIES, PERMISSIONS, DEFAULT_PM_INTERVAL_DAYS, DEFAULT_PM_INTERVAL_RIDE_DAYS } from "../lib/constants.js";


export function WorkOrdersModule({ db, setDb, perms = PERMISSIONS.owner, currentUser = null }) {
  const [view, setView] = useState("kanban"); // kanban | legacy
  const [selectedWO, setSelectedWO] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterProperty, setFilterProperty] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterTech, setFilterTech] = useState("all");
  const [filterBike, setFilterBike] = useState("all");
  const [showResolved, setShowResolved] = useState(false);

  const allWorkOrders = db.workOrders || [];
  // Techs only see their assigned work orders
  const workOrders = (!perms.workOrdersAll && currentUser)
    ? allWorkOrders.filter(wo => wo.assignedTechId === currentUser.id)
    : allWorkOrders;

  const filtered = workOrders.filter(wo => {
    if (filterProperty !== "all" && wo.clientId !== filterProperty) return false;
    if (filterPriority !== "all" && wo.priority !== filterPriority) return false;
    if (filterTech !== "all" && wo.assignedTechId !== filterTech) return false;
    if (filterBike !== "all" && wo.bicycleId !== filterBike) return false;
    return true;
  });

  function saveWO(wo) {
    const updated = { ...db };
    const now = new Date().toISOString().slice(0, 10);
    if (wo.id) {
      updated.workOrders = updated.workOrders.map(x => x.id === wo.id ? { ...wo, updatedAt: now } : x);
    } else {
      const bike = db.bicycles.find(b => b.id === wo.bicycleId);
      const bikeType = bike?.type || "Road";
      if (!wo.checklist || wo.checklist.length === 0) {
        wo.checklist = generateChecklist(bikeType);
      }
      updated.workOrders = [...updated.workOrders, { ...wo, id: genId(), createdAt: now, updatedAt: now }];
    }
    setDb(updated); saveDB(updated); setShowForm(false); setEditing(null);
  }

  function moveWO(woId, newStatus) {
    const now = new Date().toISOString().slice(0, 10);
    const updated = { ...db };
    const wo = updated.workOrders.find(w => w.id === woId);
    updated.workOrders = updated.workOrders.map(w => {
      if (w.id !== woId) return w;
      const changes = { ...w, status: newStatus, updatedAt: now };
      if (newStatus === "in_progress" && !w.startedDate) changes.startedDate = now;
      if (newStatus === "resolved" && !w.completedDate) changes.completedDate = now;
      return changes;
    });
    // When resolving a work order, update the linked bike's PM tracking fields
    if (newStatus === "resolved" && wo) {
      updated.bicycles = updated.bicycles.map(b => {
        if (b.id !== wo.bicycleId) return b;
        const bikeUpdates = { ...b, lastPMDate: now };
        // Reset ride-day counter when a preventative/inspection WO is resolved
        if (wo.type === "preventative" || wo.type === "inspection") {
          bikeUpdates.rideDaysSinceLastPM = 0;
        }
        return bikeUpdates;
      });
    }
    setDb(updated); saveDB(updated);
  }

  function deleteWO(id) {
    if (!confirm("Delete this work order?")) return;
    const updated = { ...db, workOrders: db.workOrders.filter(wo => wo.id !== id) };
    setDb(updated); saveDB(updated);
    if (selectedWO === id) setSelectedWO(null);
  }

  function updateWOChecklist(woId, newChecklist) {
    const updated = { ...db };
    updated.workOrders = updated.workOrders.map(wo => wo.id === woId ? { ...wo, checklist: newChecklist } : wo);
    setDb(updated); saveDB(updated);
  }

  const getBike = (id) => db.bicycles.find(b => b.id === id);
  const getClient = (id) => db.clients.find(c => c.id === id);
  const getUser = (id) => (db.users || []).find(u => u.id === id);

  // ── Detail View ──
  if (selectedWO) {
    const wo = workOrders.find(x => x.id === selectedWO);
    if (!wo) { setSelectedWO(null); return null; }
    const bike = getBike(wo.bicycleId);
    const client = getClient(wo.clientId);
    const tech = getUser(wo.assignedTechId);
    const stats = checklistStats(wo.checklist);
    const statusDef = WO_STATUSES.find(s => s.key === wo.status) || WO_STATUSES[0];
    const priorityDef = WO_PRIORITIES.find(p => p.key === wo.priority) || WO_PRIORITIES[2];
    const currentIdx = WO_STATUSES.findIndex(s => s.key === wo.status);

    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedWO(null)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"><ArrowLeft size={16} /> Back to board</button>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{wo.description || wo.category + " Service"}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {bike ? `${bike.nickname || bike.make + " " + bike.model}` : "Unknown bike"}
              {client ? ` at ${client.name}` : ""} | {wo.scheduledDate || "Unscheduled"}
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Badge color={priorityDef.color}>{priorityDef.label}</Badge>
            <Badge color={statusDef.color}>{statusDef.label}</Badge>
            <Button variant="secondary" size="sm" onClick={() => { setEditing(wo); setShowForm(true); }}><Edit2 size={16} /> Edit</Button>
          </div>
        </div>

        {/* Status progression bar */}
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-500 mb-3">Move to</p>
          <div className="flex gap-2 flex-wrap">
            {WO_STATUSES.map((s, i) => (
              <button key={s.key} onClick={() => moveWO(wo.id, s.key)} disabled={s.key === wo.status}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${s.key === wo.status ? "bg-blue-100 text-blue-800 ring-2 ring-blue-300" : i < currentIdx ? "bg-gray-100 text-gray-500" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}>
                {s.label}
              </button>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-5 lg:col-span-1 space-y-4">
            <h3 className="font-semibold text-gray-900">Details</h3>
            <dl className="space-y-2 text-sm">
              {[
                ["Type", WO_TYPES.find(t => t.value === wo.type)?.label || wo.type],
                ["Category", wo.category],
                ["Priority", priorityDef.label],
                ["Status", statusDef.label],
                ["Assigned To", tech?.name || "Unassigned"],
                ["Location", wo.location || "---"],
                ["Scheduled", wo.scheduledDate || "---"],
                ["Started", wo.startedDate || "---"],
                ["Completed", wo.completedDate || "---"],
                ["Labor Hours", wo.laborHours || "0"],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between"><dt className="text-gray-500">{l}</dt><dd className="font-medium text-gray-900">{v}</dd></div>
              ))}
            </dl>
            {wo.mechanicNotes && <p className="text-sm text-gray-600 pt-3 border-t border-gray-100">{wo.mechanicNotes}</p>}
            {wo.reportedIssue && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-1">Reported Issue</p>
                <p className="text-sm text-gray-700">{wo.reportedIssue}</p>
              </div>
            )}

            {/* Parts requested */}
            {wo.partsRequested?.length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-1.5">Parts Requested</p>
                <div className="flex flex-wrap gap-1">{wo.partsRequested.map((p, i) => <Badge key={i} color="orange">{p.name || p.partId} x{p.quantity}</Badge>)}</div>
              </div>
            )}
            {wo.partsUsed?.length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-1.5">Parts Used</p>
                <div className="flex flex-wrap gap-1">{wo.partsUsed.map((p, i) => <Badge key={i} color="green">{p.name || p.partId} x{p.quantity}</Badge>)}</div>
              </div>
            )}

            {/* Tools required with location-aware checkout */}
            {wo.toolsRequired?.length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-gray-500">Tools Required</p>
                  {perms.toolsCheckout && wo.clientId && wo.status !== "resolved" && (() => {
                    const toolsAtWorkshop = wo.toolsRequired.filter(tid => {
                      const tool = db.tools.find(t => t.id === tid);
                      return tool && tool.currentPropertyId !== wo.clientId;
                    });
                    if (toolsAtWorkshop.length === 0) return null;
                    return (
                      <button onClick={() => {
                        if (!confirm(`Check out ${toolsAtWorkshop.length} tool(s) to ${client?.name || "property"}?`)) return;
                        const now = new Date().toISOString();
                        let updatedTools = [...db.tools];
                        const newLogs = [];
                        toolsAtWorkshop.forEach(tid => {
                          const tool = updatedTools.find(t => t.id === tid);
                          if (!tool) return;
                          newLogs.push({ id: genId(), toolId: tid, fromLocation: tool.currentPropertyId, toLocation: wo.clientId, movedBy: currentUser?.id || null, workOrderId: wo.id, notes: `Checked out for WO: ${wo.type}`, timestamp: now });
                          updatedTools = updatedTools.map(t => t.id === tid ? { ...t, currentPropertyId: wo.clientId, checkedOutBy: currentUser?.id || null } : t);
                        });
                        const upd = { ...db, tools: updatedTools, toolLocationLog: [...(db.toolLocationLog || []), ...newLogs] };
                        setDb(upd); saveDB(upd);
                      }} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                        <ArrowRightLeft size={12} /> Check out to site
                      </button>
                    );
                  })()}
                </div>
                <div className="flex flex-wrap gap-1">{wo.toolsRequired.map(tid => {
                  const tool = db.tools.find(t => t.id === tid);
                  const atSite = tool?.currentPropertyId === wo.clientId;
                  return (
                    <span key={tid} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${atSite ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {atSite && <Check size={10} />}{tool?.name || tid}
                    </span>
                  );
                })}</div>
              </div>
            )}

            {/* Purchase Request Panel */}
            <PurchaseRequestPanel db={db} setDb={setDb} workOrderId={wo.id} />

            {/* Bike info + safety callouts */}
            {bike && (
              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Bike Info</h4>
                <p className="text-sm font-medium text-gray-900">{bike.year > 0 ? bike.year + " " : ""}{bike.make} {bike.model}</p>
                <p className="text-xs text-gray-500">{bike.type} | {bike.components?.groupset || "---"}</p>
                {bike.components?.brakes && <p className="text-xs text-gray-500 mt-1">Brakes: {bike.components.brakes}</p>}
                {bike.eVehicle && <p className="text-xs text-gray-500 mt-1">Motor: {bike.eVehicle.motorType} ({bike.eVehicle.motorPower})</p>}
                {bike.notes?.toLowerCase().includes("mineral oil") && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-medium">MINERAL OIL ONLY for brakes</div>
                )}
                {bike.notes?.includes("DOT") && (
                  <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700 font-medium">DOT brake fluid required</div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-5 lg:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardCheck size={18} /> Inspection Checklist
              {stats.total > 0 && (
                <span className="text-xs font-normal text-gray-400 ml-auto">{bike?.type || "Standard"} template | {stats.total} items</span>
              )}
            </h3>
            <ChecklistPanel
              checklist={wo.checklist || []}
              onChange={(updated) => updateWOChecklist(wo.id, updated)}
              readOnly={wo.status === "resolved"}
            />
          </Card>
        </div>

        <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title="Edit Work Order" wide>
          <WOForm initial={editing} db={db} onSave={saveWO} onCancel={() => { setShowForm(false); setEditing(null); }} />
        </Modal>
      </div>
    );
  }

  // ── Filter Bar ──
  const filterBar = (
    <div className="flex flex-wrap gap-2 items-center">
      <Select value={filterProperty} onChange={e => setFilterProperty(e.target.value)}
        options={[{ value: "all", label: "All Properties" }, ...db.clients.map(c => ({ value: c.id, label: c.name }))]} />
      <Select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
        options={[{ value: "all", label: "All Priorities" }, ...WO_PRIORITIES.map(p => ({ value: p.key, label: p.label }))]} />
      <Select value={filterTech} onChange={e => setFilterTech(e.target.value)}
        options={[{ value: "all", label: "All Techs" }, ...(db.users || []).filter(u => u.role === "manager" || u.role === "tech").map(u => ({ value: u.id, label: u.name }))]} />
      <Select value={filterBike} onChange={e => setFilterBike(e.target.value)}
        options={[{ value: "all", label: "All Bikes" }, ...db.bicycles.map(b => ({ value: b.id, label: b.nickname || b.make + " " + b.model }))]} />
    </div>
  );

  // ── Kanban View ──
  const kanbanView = (
    <div className="space-y-4">
      {filterBar}
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "60vh" }}>
        {WO_STATUSES.filter(s => s.key !== "resolved" || showResolved).map(statusDef => {
          const colOrders = filtered.filter(wo => wo.status === statusDef.key)
            .sort((a, b) => {
              const pOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
              return (pOrder[a.priority] || 2) - (pOrder[b.priority] || 2);
            });
          return (
            <div key={statusDef.key} className="flex-shrink-0 w-64 bg-gray-50 rounded-xl">
              <div className="p-3 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-gray-50 rounded-t-xl z-10">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-700">{statusDef.label}</h3>
                  <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">{colOrders.length}</span>
                </div>
              </div>
              <div className="p-2 space-y-2 min-h-[200px]">
                {colOrders.map(wo => {
                  const bike = getBike(wo.bicycleId);
                  const client = getClient(wo.clientId);
                  const tech = getUser(wo.assignedTechId);
                  const priDef = WO_PRIORITIES.find(p => p.key === wo.priority) || WO_PRIORITIES[2];
                  const clStats = wo.checklist?.length > 0 ? checklistStats(wo.checklist) : null;
                  const currentIdx = WO_STATUSES.findIndex(s => s.key === wo.status);
                  const nextStatus = currentIdx < WO_STATUSES.length - 1 ? WO_STATUSES[currentIdx + 1] : null;

                  return (
                    <div key={wo.id} className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 ${statusDef.bgCard} cursor-pointer hover:shadow-md transition-shadow`} onClick={() => setSelectedWO(wo.id)}>
                      <div className="p-3">
                        {/* Header: bike name + priority */}
                        <div className="flex items-start justify-between gap-1 mb-2">
                          <p className="text-sm font-semibold text-gray-900 leading-snug">{bike?.nickname || "Unknown"}</p>
                          <Badge color={priDef.color}>{priDef.label[0]}</Badge>
                        </div>
                        {/* Type tag */}
                        <span className="inline-block text-[10px] font-medium uppercase tracking-wide text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded mb-2">
                          {WO_TYPES.find(t => t.value === wo.type)?.label || wo.type}
                        </span>
                        {/* Meta lines */}
                        <div className="space-y-0.5">
                          {client && <p className="text-xs text-gray-500">{client.name}</p>}
                          {tech && <p className="text-xs text-gray-500 flex items-center gap-1"><User size={10} className="text-gray-400" />{tech.name}</p>}
                          {wo.scheduledDate && <p className="text-xs text-gray-500 flex items-center gap-1"><Clock size={10} className="text-gray-400" />{wo.scheduledDate}</p>}
                        </div>
                        {/* Checklist progress */}
                        {clStats && clStats.total > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-gray-100">
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${clStats.pct}%` }}></div>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">{Math.round(clStats.pct)}% checked</p>
                          </div>
                        )}
                        {/* Parts indicator */}
                        {wo.partsRequested?.length > 0 && (
                          <div className="flex items-center gap-1 mt-2"><Package size={10} className="text-orange-400" /><span className="text-[10px] text-orange-500 font-medium">{wo.partsRequested.length} part{wo.partsRequested.length > 1 ? "s" : ""} needed</span></div>
                        )}
                        {/* Quick move button */}
                        {nextStatus && (
                          <button onClick={(e) => { e.stopPropagation(); moveWO(wo.id, nextStatus.key); }}
                            className="mt-2.5 w-full flex items-center justify-center gap-1 text-[11px] font-medium text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md py-1.5 border border-transparent hover:border-blue-100 transition-colors" title={`Move to ${nextStatus.label}`}>
                            <MoveRight size={12} /> {nextStatus.label}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {colOrders.length === 0 && <p className="text-xs text-gray-400 text-center py-8">No orders</p>}
              </div>
            </div>
          );
        })}
      </div>
      {!showResolved && (
        <button onClick={() => setShowResolved(true)} className="text-sm text-gray-500 hover:text-gray-700">
          Show resolved ({filtered.filter(wo => wo.status === "resolved").length})
        </button>
      )}
      {showResolved && (
        <button onClick={() => setShowResolved(false)} className="text-sm text-gray-500 hover:text-gray-700">
          Hide resolved
        </button>
      )}
    </div>
  );

  // ── Main Layout with View Toggle ──
  const blankWO = {
    bicycleId: db.bicycles[0]?.id || "", clientId: "", type: "preventative", category: "General",
    status: "new", priority: "normal", assignedTechId: "u2", requestedById: null,
    description: "", reportedIssue: "", mechanicNotes: "", checklist: [],
    partsUsed: [], partsRequested: [], photos: [], laborHours: 0,
    location: "", toolsRequired: [], toolsVerified: false, managerSignoff: null,
    scheduledDate: "", startedDate: null, completedDate: null,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
          <p className="text-sm text-gray-500 mt-1">{workOrders.length} total | {workOrders.filter(wo => wo.status !== "resolved").length} active</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setView("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "kanban" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <Columns3 size={14} /> Board
            </button>
            <button onClick={() => setView("legacy")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "legacy" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <List size={14} /> Legacy
            </button>
          </div>
          <Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={16} /> New Work Order</Button>
        </div>
      </div>

      {view === "kanban" ? kanbanView : <MaintenanceModule db={db} setDb={setDb} />}

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? "Edit Work Order" : "New Work Order"} wide>
        <WOForm initial={editing || blankWO} db={db} onSave={saveWO} onCancel={() => { setShowForm(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}

function WOForm({ initial, db, onSave, onCancel }) {
  const [form, setForm] = useState({ ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectedBike = db.bicycles.find(b => b.id === form.bicycleId);
  const hasChecklist = form.checklist && form.checklist.length > 0;
  const clStats = hasChecklist ? checklistStats(form.checklist) : null;

  // Auto-set clientId when bike changes
  function handleBikeChange(bikeId) {
    const bike = db.bicycles.find(b => b.id === bikeId);
    set("bicycleId", bikeId);
    if (bike) {
      setForm(f => ({ ...f, bicycleId: bikeId, clientId: bike.clientId, location: db.clients.find(c => c.id === bike.clientId)?.name || "" }));
    }
  }

  function handleGenerateChecklist() {
    const bikeType = selectedBike?.type || "Road";
    set("checklist", generateChecklist(bikeType));
  }

  function handleResetChecklist() {
    if (!confirm("Reset all checklist items to pending?")) return;
    handleGenerateChecklist();
  }

  function handleSave() {
    onSave({ ...form });
  }

  return (
    <div className="space-y-4">
      <Select label="Bicycle" value={form.bicycleId} onChange={e => handleBikeChange(e.target.value)}
        options={[{ value: "", label: "-- Select --" }, ...db.bicycles.map(b => {
          const cl = db.clients.find(c => c.id === b.clientId);
          return { value: b.id, label: `${b.nickname ? b.nickname + " - " : ""}${b.make} ${b.model} (${cl?.name || "Unassigned"})` };
        })]} />
      <div className="grid grid-cols-2 gap-4">
        <Select label="Type" value={form.type} onChange={e => set("type", e.target.value)}
          options={WO_TYPES.map(t => ({ value: t.value, label: t.label }))} />
        <Select label="Category" value={form.category} onChange={e => set("category", e.target.value)}
          options={WO_CATEGORIES.map(c => ({ value: c, label: c }))} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Select label="Status" value={form.status} onChange={e => set("status", e.target.value)}
          options={WO_STATUSES.map(s => ({ value: s.key, label: s.label }))} />
        <Select label="Priority" value={form.priority} onChange={e => set("priority", e.target.value)}
          options={WO_PRIORITIES.map(p => ({ value: p.key, label: p.label }))} />
        <Select label="Assigned Tech" value={form.assignedTechId || ""} onChange={e => set("assignedTechId", e.target.value)}
          options={[{ value: "", label: "Unassigned" }, ...(db.users || []).filter(u => u.role === "manager" || u.role === "tech").map(u => ({ value: u.id, label: u.name }))]} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Input label="Scheduled Date" type="date" value={form.scheduledDate || ""} onChange={e => set("scheduledDate", e.target.value)} />
        <Input label="Started Date" type="date" value={form.startedDate || ""} onChange={e => set("startedDate", e.target.value)} />
        <Input label="Labor Hours" type="number" step="0.25" value={form.laborHours || 0} onChange={e => set("laborHours", parseFloat(e.target.value) || 0)} />
      </div>
      <Input label="Location" value={form.location || ""} onChange={e => set("location", e.target.value)} />
      <TextArea label="Description" value={form.description} onChange={e => set("description", e.target.value)} />
      <TextArea label="Mechanic Notes" value={form.mechanicNotes} onChange={e => set("mechanicNotes", e.target.value)} />
      {form.type === "client_request" && <TextArea label="Reported Issue" value={form.reportedIssue || ""} onChange={e => set("reportedIssue", e.target.value)} />}

      {/* Checklist section */}
      <div className="pt-2 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Inspection Checklist</label>
          <div className="flex gap-2">
            {hasChecklist && <Button variant="ghost" size="sm" onClick={handleResetChecklist}>Reset</Button>}
            <Button variant="secondary" size="sm" onClick={handleGenerateChecklist} disabled={!form.bicycleId}>
              <ClipboardCheck size={14} /> {hasChecklist ? "Regenerate" : "Generate"}
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
              Template: {selectedBike?.type || "Standard"} bike. Use the detail view to fill out the checklist.
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-400">{form.bicycleId ? "Click \"Generate\" to create a type-specific checklist." : "Select a bicycle first."}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={!form.bicycleId}><Save size={16} /> Save</Button>
      </div>
    </div>
  );
}

// ─── Auto-Generated PM Work Orders (Phase 3.3) ──────────────────────
// Runs on app load. Scans fleet for bikes where PM is overdue (red) or
// approaching due (yellow) via time or ride-day triggers. Creates a new
// preventative work order if no open preventative WO already exists for
// that bike. Returns the updated db (or the original if nothing changed).

export function autoGeneratePMWorkOrders(db) {
  const today = new Date().toISOString().slice(0, 10);
  let changed = false;
  const updated = { ...db, workOrders: [...db.workOrders] };

  for (const bike of updated.bicycles) {
    // Skip bikes that already have an open (non-resolved) preventative WO
    const hasOpenPM = updated.workOrders.some(wo =>
      wo.bicycleId === bike.id &&
      wo.type === "preventative" &&
      wo.status !== "resolved"
    );
    if (hasOpenPM) continue;

    const pm = computePmStatus(bike, updated.workOrders);

    // Only auto-generate for RED status triggered by time or ride-day overdue
    if (pm.status !== "red") continue;
    if (pm.trigger !== "time" && pm.trigger !== "ride") continue;

    const client = updated.clients?.find(c => c.id === bike.clientId);
    const bikeName = bike.nickname || `${bike.make} ${bike.model}`;
    const triggerDesc = pm.trigger === "time"
      ? `Time-based: ${pm.daysSinceService}d since last service (interval: ${bike.pmIntervalDays || DEFAULT_PM_INTERVAL_DAYS}d)`
      : `Usage-based: ${pm.rideDaysSinceLastPM} ride-days (interval: ${bike.pmIntervalRideDays || DEFAULT_PM_INTERVAL_RIDE_DAYS})`;

    const newWO = {
      id: genId(),
      bicycleId: bike.id,
      clientId: bike.clientId,
      type: "preventative",
      category: "General",
      status: "new",
      priority: "normal",
      assignedTechId: "u2", // Grant (default manager/mechanic)
      requestedById: null,
      description: `Auto-generated PM for ${bikeName}. ${triggerDesc}`,
      reportedIssue: "",
      mechanicNotes: "",
      checklist: generateChecklist(bike.type),
      partsUsed: [],
      partsRequested: [],
      photos: [],
      laborHours: 0,
      location: client?.name || "",
      toolsRequired: [],
      toolsVerified: false,
      managerSignoff: null,
      scheduledDate: today,
      startedDate: null,
      completedDate: null,
      createdAt: today,
      updatedAt: today,
      _autoGenerated: true
    };

    updated.workOrders.push(newWO);
    changed = true;
  }

  return changed ? updated : db;
}

