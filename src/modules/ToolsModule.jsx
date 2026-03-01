import { useState, useMemo } from "react";
import { Wrench, Plus, Edit2, Search, ChevronDown, ChevronRight, X, Save, Trash2, Filter, ArrowLeft, ArrowRightLeft, Building2, History, MapPinned, Check, Eye, QrCode, RotateCcw, MoveRight, AlertTriangle, List } from "lucide-react";
import { Card, Button, Modal, Input, TextArea, Select, EmptyState, Badge, StatusBadge } from "../components/ui.jsx";
import { QRLabel, QRModal, BulkQRPrintButton, assetQRValue } from "../components/QRWidgets.jsx";
import { genId, saveDB } from "../lib/db.js";
import { PERMISSIONS, TOOL_LOCATIONS } from "../lib/constants.js";

export function getToolPropertyLabel(propertyId, clients) {
  if (!propertyId) return "Workshop";
  const client = clients.find(c => c.id === propertyId);
  return client?.name || "Unknown";
}

export function ToolPropertyBadge({ propertyId, clients }) {
  const label = getToolPropertyLabel(propertyId, clients);
  const colorMap = { null: "bg-gray-100 text-gray-700", c1: "bg-blue-100 text-blue-700", c2: "bg-green-100 text-green-700", c3: "bg-purple-100 text-purple-700" };
  return <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${colorMap[propertyId] || colorMap[null]}`}><MapPinned size={10} />{label}</span>;
}

// ─── Tools Module ────────────────────────────────────────────────────
export function ToolsModule({ db, setDb, perms = PERMISSIONS.owner, currentUser = null }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [catFilter, setCatFilter] = useState("All");
  const [locFilter, setLocFilter] = useState("All");
  const [view, setView] = useState("list"); // list | distribution | log
  const [showCheckout, setShowCheckout] = useState(null); // toolId
  const [showHistory, setShowHistory] = useState(null); // toolId

  const categories = ["All", ...new Set(db.tools.map(t => t.category))];
  const filtered = db.tools.filter(t => {
    const matchSearch = `${t.name} ${t.category} ${t.location}`.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "All" || t.category === catFilter;
    const matchLoc = locFilter === "All" || (locFilter === "workshop" ? !t.currentPropertyId : t.currentPropertyId === locFilter);
    return matchSearch && matchCat && matchLoc;
  });

  const blankTool = { name: "", category: "", condition: "Good", quantity: 1, location: "", purchaseDate: "", cost: 0, notes: "", currentPropertyId: null, checkedOutBy: null };

  function saveTool(tool) {
    const updated = { ...db };
    if (tool.id) {
      updated.tools = updated.tools.map(t => t.id === tool.id ? tool : t);
    } else {
      updated.tools = [...updated.tools, { ...tool, id: genId(), currentPropertyId: null, checkedOutBy: null }];
    }
    setDb(updated); saveDB(updated); setShowForm(false); setEditing(null);
  }

  function deleteTool(id) {
    if (!confirm("Delete this tool?")) return;
    const updated = { ...db, tools: db.tools.filter(t => t.id !== id) };
    setDb(updated); saveDB(updated);
  }

  function checkoutTool(toolId, toPropertyId, notes = "", workOrderId = null) {
    const tool = db.tools.find(t => t.id === toolId);
    if (!tool) return;
    const fromPropertyId = tool.currentPropertyId;
    const logEntry = {
      id: genId(), toolId, fromLocation: fromPropertyId, toLocation: toPropertyId,
      movedBy: currentUser?.id || null, workOrderId, notes,
      timestamp: new Date().toISOString(),
    };
    const updated = {
      ...db,
      tools: db.tools.map(t => t.id === toolId ? { ...t, currentPropertyId: toPropertyId, checkedOutBy: currentUser?.id || null } : t),
      toolLocationLog: [...(db.toolLocationLog || []), logEntry],
    };
    setDb(updated); saveDB(updated); setShowCheckout(null);
  }

  function returnTool(toolId, notes = "") {
    checkoutTool(toolId, null, notes || "Returned to workshop");
  }

  const totalValue = db.tools.reduce((s, t) => s + t.cost * t.quantity, 0);

  // End-of-day alert: tools not at workshop
  const toolsOut = db.tools.filter(t => t.currentPropertyId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Tool Inventory</h1><p className="text-sm text-gray-500 mt-1">{db.tools.length} tools{perms.viewWholesaleCost ? ` | $${totalValue.toLocaleString()} total value` : ""}{toolsOut.length > 0 ? ` | ${toolsOut.length} checked out` : ""}</p></div>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {[{ k: "list", icon: List, tip: "List" }, { k: "distribution", icon: MapPinned, tip: "Distribution" }, { k: "log", icon: History, tip: "Activity Log" }].map(v => (
              <button key={v.k} onClick={() => setView(v.k)} title={v.tip} className={`p-2 rounded-md transition-colors ${view === v.k ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}><v.icon size={16} /></button>
            ))}
          </div>
          <BulkQRPrintButton items={db.tools.filter(t => t.cost >= 50)} type="tool" getTitle={t => t.name} getSubtitle={t => `${t.category} | ${t.location}`} />
          {perms.toolsEdit && <Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={16} /> Add Tool</Button>}
        </div>
      </div>

      {/* End-of-day alert banner */}
      {toolsOut.length > 0 && view === "list" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-800">{toolsOut.length} tool{toolsOut.length !== 1 ? "s" : ""} checked out to properties</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {TOOL_LOCATIONS.filter(l => l.id).map(loc => {
                  const count = toolsOut.filter(t => t.currentPropertyId === loc.id).length;
                  if (!count) return null;
                  return <span key={loc.id} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">{loc.label}: {count}</span>;
                })}
              </div>
              <button onClick={() => setView("distribution")} className="text-xs text-amber-700 underline mt-2 hover:text-amber-900">View distribution</button>
            </div>
          </div>
        </div>
      )}

      {view === "list" && (
        <>
          <div className="flex gap-3">
            <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Search tools..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            <select className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white" value={locFilter} onChange={e => setLocFilter(e.target.value)}>
              <option value="All">All Locations</option>
              <option value="workshop">Workshop</option>
              {db.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid gap-3">
            {filtered.map(t => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{t.name}</h3>
                      {t.quantity > 1 && <Badge color="blue">x{t.quantity}</Badge>}
                      <ToolPropertyBadge propertyId={t.currentPropertyId} clients={db.clients} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{t.category} | {t.location}{perms.viewWholesaleCost ? ` | $${t.cost.toFixed(2)} each` : ""}</p>
                    {t.checkedOutBy && <p className="text-xs text-blue-500 mt-0.5">Checked out by: {db.users.find(u => u.id === t.checkedOutBy)?.name || "Unknown"}</p>}
                    {t.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{t.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={t.condition} />
                    {perms.toolsCheckout && (
                      t.currentPropertyId
                        ? <Button variant="ghost" size="sm" onClick={() => returnTool(t.id)} title="Return to Workshop"><RotateCcw size={14} className="text-green-600" /></Button>
                        : <Button variant="ghost" size="sm" onClick={() => setShowCheckout(t.id)} title="Check out to property"><ArrowRightLeft size={14} className="text-blue-600" /></Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setShowHistory(t.id)} title="View history"><History size={14} className="text-gray-500" /></Button>
                    {perms.toolsEdit && <Button variant="ghost" size="sm" onClick={() => { setEditing(t); setShowForm(true); }}><Edit2 size={14} /></Button>}
                    {perms.deleteRecords && <Button variant="ghost" size="sm" onClick={() => deleteTool(t.id)}><Trash2 size={14} className="text-red-500" /></Button>}
                  </div>
                </div>
              </Card>
            ))}
            {filtered.length === 0 && <EmptyState icon={Wrench} title="No tools found" description="Add tools to your inventory" />}
          </div>
        </>
      )}

      {view === "distribution" && <ToolDistributionView db={db} onCheckout={(id) => setShowCheckout(id)} onReturn={(id) => returnTool(id)} perms={perms} />}
      {view === "log" && <ToolLocationLogView db={db} />}

      {/* Checkout Modal */}
      <Modal open={!!showCheckout} onClose={() => setShowCheckout(null)} title="Check Out Tool">
        {showCheckout && <ToolCheckoutForm tool={db.tools.find(t => t.id === showCheckout)} db={db} onCheckout={(toPropertyId, notes, woId) => checkoutTool(showCheckout, toPropertyId, notes, woId)} onCancel={() => setShowCheckout(null)} />}
      </Modal>

      {/* History Modal */}
      <Modal open={!!showHistory} onClose={() => setShowHistory(null)} title="Tool Movement History" wide>
        {showHistory && <ToolHistoryPanel toolId={showHistory} db={db} />}
      </Modal>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? "Edit Tool" : "Add Tool"}>
        <ToolForm initial={editing || blankTool} onSave={saveTool} onCancel={() => { setShowForm(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}

export function ToolCheckoutForm({ tool, db, onCheckout, onCancel }) {
  const [toPropertyId, setToPropertyId] = useState("");
  const [notes, setNotes] = useState("");
  const [woId, setWoId] = useState("");
  const activeWOs = (db.workOrders || []).filter(wo => !["resolved"].includes(wo.status));

  if (!tool) return null;
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Moving <span className="font-semibold">{tool.name}</span> from <span className="font-semibold">{getToolPropertyLabel(tool.currentPropertyId, db.clients)}</span></p>
      <Select label="Destination Property" value={toPropertyId} onChange={e => setToPropertyId(e.target.value)} options={[{ value: "", label: "Select destination..." }, ...db.clients.map(c => ({ value: c.id, label: c.name }))]} />
      <Select label="Link to Work Order (optional)" value={woId} onChange={e => setWoId(e.target.value)} options={[{ value: "", label: "No work order" }, ...activeWOs.map(wo => {
        const bike = db.bicycles.find(b => b.id === wo.bicycleId);
        return { value: wo.id, label: `${wo.id} - ${bike?.nickname || "?"} - ${wo.description.slice(0, 40)}` };
      })]} />
      <TextArea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for checkout..." />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onCheckout(toPropertyId, notes, woId || null)} disabled={!toPropertyId}><ArrowRightLeft size={16} /> Check Out</Button>
      </div>
    </div>
  );
}

export function ToolHistoryPanel({ toolId, db }) {
  const tool = db.tools.find(t => t.id === toolId);
  const log = (db.toolLocationLog || []).filter(e => e.toolId === toolId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (!tool) return null;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="font-semibold text-gray-900">{tool.name}</h3>
        <ToolPropertyBadge propertyId={tool.currentPropertyId} clients={db.clients} />
      </div>
      {log.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No movement history recorded.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {log.map(entry => {
            const user = db.users.find(u => u.id === entry.movedBy);
            const wo = entry.workOrderId ? db.workOrders.find(w => w.id === entry.workOrderId) : null;
            return (
              <div key={entry.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm">
                  <ArrowRightLeft size={14} className="text-blue-500 shrink-0" />
                  <span className="text-gray-600">{getToolPropertyLabel(entry.fromLocation, db.clients)}</span>
                  <MoveRight size={14} className="text-gray-400 shrink-0" />
                  <span className="font-medium text-gray-900">{getToolPropertyLabel(entry.toLocation, db.clients)}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>{new Date(entry.timestamp).toLocaleString()}</span>
                  {user && <span>by {user.name}</span>}
                  {wo && <span className="text-blue-500">WO: {wo.id}</span>}
                </div>
                {entry.notes && <p className="text-xs text-gray-400 mt-1 italic">{entry.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ToolDistributionView({ db, onCheckout, onReturn, perms }) {
  const locations = TOOL_LOCATIONS;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {locations.map(loc => {
          const tools = db.tools.filter(t => loc.id === null ? !t.currentPropertyId : t.currentPropertyId === loc.id);
          const locColors = { null: "border-gray-300 bg-gray-50", c1: "border-blue-300 bg-blue-50", c2: "border-green-300 bg-green-50", c3: "border-purple-300 bg-purple-50" };
          const headerColors = { null: "text-gray-700", c1: "text-blue-700", c2: "text-green-700", c3: "text-purple-700" };
          return (
            <div key={loc.id || "workshop"} className={`border-2 rounded-xl overflow-hidden ${locColors[loc.id]}`}>
              <div className="p-4 flex items-center gap-2">
                <loc.icon size={18} className={headerColors[loc.id]} />
                <h3 className={`font-semibold ${headerColors[loc.id]}`}>{loc.label}</h3>
                <Badge color={loc.color}>{tools.length}</Badge>
              </div>
              <div className="bg-white p-3 space-y-2 max-h-72 overflow-y-auto">
                {tools.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2 text-center">No tools here</p>
                ) : tools.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.category}</p>
                    </div>
                    {perms.toolsCheckout && (
                      loc.id
                        ? <button onClick={() => onReturn(t.id)} className="text-xs text-green-600 hover:text-green-800 px-2 py-1 rounded hover:bg-green-50 shrink-0" title="Return to Workshop"><RotateCcw size={12} /></button>
                        : <button onClick={() => onCheckout(t.id)} className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 shrink-0" title="Check out"><ArrowRightLeft size={12} /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ToolLocationLogView({ db }) {
  const log = (db.toolLocationLog || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Tool Movement Log</h2>
      {log.length === 0 ? (
        <EmptyState icon={History} title="No movements recorded" description="Tool check-in/check-out activity will appear here" />
      ) : (
        <div className="space-y-2">
          {log.slice(0, 50).map(entry => {
            const tool = db.tools.find(t => t.id === entry.toolId);
            const user = db.users.find(u => u.id === entry.movedBy);
            const wo = entry.workOrderId ? db.workOrders.find(w => w.id === entry.workOrderId) : null;
            return (
              <Card key={entry.id} className="p-3">
                <div className="flex items-center gap-3">
                  <ArrowRightLeft size={16} className="text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{tool?.name || entry.toolId}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <span>{getToolPropertyLabel(entry.fromLocation, db.clients)}</span>
                      <MoveRight size={10} className="shrink-0" />
                      <span className="font-medium text-gray-700">{getToolPropertyLabel(entry.toLocation, db.clients)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-400">{new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400 pl-7">
                  {user && <span>by {user.name}</span>}
                  {wo && <span className="text-blue-500">WO: {wo.id}</span>}
                  {entry.notes && <span className="italic">{entry.notes}</span>}
                </div>
              </Card>
            );
          })}
          {log.length > 50 && <p className="text-xs text-gray-400 text-center">Showing 50 of {log.length} entries</p>}
        </div>
      )}
    </div>
  );
}

export function ToolForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="space-y-4">
      <Input label="Tool Name" value={form.name} onChange={e => set("name", e.target.value)} required />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Category" value={form.category} onChange={e => set("category", e.target.value)} placeholder="e.g. Wheels, Brakes, Torque" />
        <Select label="Condition" value={form.condition} onChange={e => set("condition", e.target.value)} options={["Excellent","Good","Fair","Poor"].map(c => ({ value: c, label: c }))} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Input label="Quantity" type="number" min="1" value={form.quantity} onChange={e => set("quantity", parseInt(e.target.value) || 1)} />
        <Input label="Cost ($)" type="number" step="0.01" value={form.cost} onChange={e => set("cost", parseFloat(e.target.value) || 0)} />
        <Input label="Purchase Date" type="date" value={form.purchaseDate} onChange={e => set("purchaseDate", e.target.value)} />
      </div>
      <Input label="Storage Location" value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. Workbench A, Tool Wall" />
      <TextArea label="Notes" value={form.notes} onChange={e => set("notes", e.target.value)} />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name}><Save size={16} /> Save</Button>
      </div>
    </div>
  );
}

