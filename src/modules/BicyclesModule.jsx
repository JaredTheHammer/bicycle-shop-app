import { useState, useMemo } from "react";
import { Bike, Plus, Edit2, Search, ChevronDown, ChevronRight, X, Save, Filter, ArrowLeft, Star, Trash2, Eye, Mountain, Gauge, QrCode } from "lucide-react";
import { Card, Button, Modal, Input, TextArea, Select, EmptyState, Badge, StatusBadge, StatCard, useConfirm, useToast } from "../components/ui.jsx";
import { QRLabel, QRModal, BulkQRPrintButton, assetQRValue } from "../components/QRWidgets.jsx";
import { computePmStatus, PmStatusBadge } from "../lib/pm-engine.jsx";
import { genId, saveDB } from "../lib/db.js";
import { PERMISSIONS } from "../lib/constants.js";

// ─── Bicycles Module ─────────────────────────────────────────────────
export function BicyclesModule({ db, setDb, perms = PERMISSIONS.owner, currentUser = null }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  const filtered = db.bicycles.filter(b =>
    `${b.make} ${b.model} ${b.nickname} ${b.serial}`.toLowerCase().includes(search.toLowerCase())
  );

  const blankBike = {
    clientId: db.clients[0]?.id || "", nickname: "", make: "", model: "", year: new Date().getFullYear(),
    serial: "", type: "Road", frameMaterial: "Aluminum", frameSize: "", color: "",
    components: { groupset: "", drivetrain: "", frontDerailleur: "", rearDerailleur: "", shifters: "", crankset: "", cassette: "", chain: "", brakes: "", rotors: "", wheels: "", tires: "", handlebars: "", stem: "", seatpost: "", saddle: "" },
    condition: "Good", purchaseDate: "", lastService: "", notes: "",
    status: "active", eVehicle: null
  };

  function saveBike(bike) {
    const updated = { ...db };
    const isNew = !bike.id;
    if (bike.id) {
      updated.bicycles = updated.bicycles.map(b => b.id === bike.id ? bike : b);
    } else {
      updated.bicycles = [...updated.bicycles, { ...bike, id: genId() }];
    }
    setDb(updated); saveDB(updated); setShowForm(false); setEditing(null);
    toast.success(isNew ? "Bicycle added" : "Bicycle updated");
  }

  async function deleteBike(id) {
    const bike = db.bicycles.find(b => b.id === id);
    if (!await confirm(`Delete "${bike?.nickname || bike?.make + ' ' + bike?.model}" and its maintenance records?`, { title: "Delete bicycle?", variant: "danger" })) return;
    const updated = { ...db, bicycles: db.bicycles.filter(b => b.id !== id), maintenance: db.maintenance.filter(m => m.bicycleId !== id) };
    setDb(updated); saveDB(updated); setSelected(null);
    toast.success("Bicycle deleted");
  }

  if (selected) {
    const bike = db.bicycles.find(b => b.id === selected);
    if (!bike) { setSelected(null); return null; }
    const client = db.clients.find(c => c.id === bike.clientId);
    const maint = db.maintenance.filter(m => m.bicycleId === bike.id).sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));
    const pmStatus = computePmStatus(bike, db.workOrders);
    return (
      <div className="space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"><ArrowLeft size={16} /> Back to list</button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{bike.nickname || `${bike.make} ${bike.model}`}</h1>
              <PmStatusBadge pmStatus={pmStatus} />
            </div>
            <p className="text-sm text-gray-500 mt-1">{bike.year} {bike.make} {bike.model} | Owner: {client?.name || "Unassigned"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowQR(true)}><QrCode size={16} /> QR</Button>
            {perms.bicyclesEdit && <Button variant="secondary" onClick={() => { setEditing(bike); setShowForm(true); }}><Edit2 size={16} /> Edit</Button>}
            {perms.deleteRecords && <Button variant="danger" onClick={() => deleteBike(bike.id)}><Trash2 size={16} /></Button>}
          </div>
        </div>
        <QRModal open={showQR} onClose={() => setShowQR(false)} value={assetQRValue("bike", bike.id)} title={bike.nickname || `${bike.make} ${bike.model}`} subtitle={`${bike.type} | ${client?.name || ""} | S/N: ${bike.serial}`} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-5 lg:col-span-1">
            <h3 className="font-semibold text-gray-900 mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              {[["Serial", bike.serial], ["Type", bike.type], ["Frame", bike.frameMaterial], ["Size", bike.frameSize], ["Color", bike.color], ["Condition", bike.condition], ["Status", bike.status ? bike.status.charAt(0).toUpperCase() + bike.status.slice(1) : "Active"], ["Purchased", bike.purchaseDate], ["Last Service", bike.lastService]].map(([l, v]) => (
                <div key={l} className="flex justify-between"><dt className="text-gray-500">{l}</dt><dd className="font-medium text-gray-900 text-right">{v || "---"}</dd></div>
              ))}
            </dl>
            {bike.notes && <p className="text-sm text-gray-500 mt-3 pt-3 border-t border-gray-100 italic">{bike.notes}</p>}
          </Card>

          <Card className="p-5 lg:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-3">Component Specification</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {Object.entries(bike.components).filter(([, v]) => v).map(([key, val]) => (
                <div key={key} className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                  <span className="font-medium text-gray-900 text-right ml-2">{val}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* PM Tracking - Dual Trigger */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Gauge size={18} /> PM Tracking</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Time Interval</p>
              <p className="text-lg font-bold text-gray-900">{bike.pmIntervalDays || DEFAULT_PM_INTERVAL_DAYS}d</p>
              <p className="text-xs text-gray-400">{pmStatus.daysSinceService !== null ? `${pmStatus.daysSinceService}d since last` : "No history"}</p>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Next Time Due</p>
              <p className="text-lg font-bold text-gray-900">{pmStatus.nextDueDate || "---"}</p>
              {pmStatus.nextDueDate && <p className="text-xs text-gray-400">{pmStatus.daysSinceService !== null ? `${(bike.pmIntervalDays || DEFAULT_PM_INTERVAL_DAYS) - pmStatus.daysSinceService}d remaining` : ""}</p>}
            </div>
            <div className="border rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Ride-Days Since PM</p>
              <p className="text-lg font-bold text-gray-900">{pmStatus.rideDaysSinceLastPM} / {bike.pmIntervalRideDays || DEFAULT_PM_INTERVAL_RIDE_DAYS}</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div className={`h-1.5 rounded-full transition-all ${pmStatus.rideDaysUntilDue <= 0 ? "bg-red-500" : pmStatus.rideDaysUntilDue <= PM_RIDE_DAY_YELLOW_THRESHOLD ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${Math.min(100, (pmStatus.rideDaysSinceLastPM / (bike.pmIntervalRideDays || DEFAULT_PM_INTERVAL_RIDE_DAYS)) * 100)}%` }} />
              </div>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Log Ride Day</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <button className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30" disabled={(bike.rideDaysSinceLastPM || 0) <= 0} onClick={() => {
                  const updated = { ...db };
                  updated.bicycles = updated.bicycles.map(b => b.id === bike.id ? { ...b, rideDaysSinceLastPM: Math.max(0, (b.rideDaysSinceLastPM || 0) - 1) } : b);
                  setDb(updated); saveDB(updated);
                }}>-</button>
                <span className="text-xl font-bold text-gray-900 w-8 text-center">{bike.rideDaysSinceLastPM || 0}</span>
                <button className="w-8 h-8 rounded-full border border-blue-300 bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100" onClick={() => {
                  const updated = { ...db };
                  updated.bicycles = updated.bicycles.map(b => b.id === bike.id ? { ...b, rideDaysSinceLastPM: (b.rideDaysSinceLastPM || 0) + 1 } : b);
                  setDb(updated); saveDB(updated);
                }}>+</button>
              </div>
              <p className="text-xs text-gray-400 mt-1">{pmStatus.rideDaysUntilDue > 0 ? `${pmStatus.rideDaysUntilDue} remaining` : "Overdue"}</p>
            </div>
          </div>
        </Card>

        {bike.eVehicle && (
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-3">E-Vehicle Specifications</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {Object.entries(bike.eVehicle).filter(([, v]) => v).map(([key, val]) => (
                <div key={key} className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                  <span className="font-medium text-gray-900 text-right ml-2">{val}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Service History</h3>
          {maint.length === 0 ? <p className="text-sm text-gray-500">No maintenance records for this bike.</p> : (
            <div className="space-y-3">
              {maint.map(m => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.type}</p>
                    <p className="text-xs text-gray-500">{m.scheduledDate} | {m.technician} | ${m.cost}</p>
                    {m.description && <p className="text-xs text-gray-400 mt-0.5">{m.description}</p>}
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title="Edit Bicycle" wide>
          <BikeForm initial={editing || blankBike} clients={db.clients} onSave={saveBike} onCancel={() => { setShowForm(false); setEditing(null); }} />
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Bicycle Catalog</h1><p className="text-sm text-gray-500 mt-1">{db.bicycles.length} bikes in inventory</p></div>
        <div className="flex gap-2">
          <BulkQRPrintButton items={db.bicycles} type="bike" getTitle={b => b.nickname || `${b.make} ${b.model}`} getSubtitle={b => `${b.type} | S/N: ${b.serial}`} />
          {perms.bicyclesEdit && <Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={16} /> Add Bicycle</Button>}
        </div>
      </div>
      <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Search bikes by make, model, nickname, or serial..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="grid gap-4">
        {filtered.map(b => {
          const client = db.clients.find(c => c.id === b.clientId);
          const pm = computePmStatus(b, db.workOrders);
          return (
            <Card key={b.id} className="p-5" onClick={() => setSelected(b.id)}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{b.nickname && <span className="text-blue-600">{b.nickname} - </span>}{b.year} {b.make} {b.model}</h3>
                    <PmStatusBadge pmStatus={pm} size="sm" />
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">S/N: {b.serial} | Owner: {client?.name || "Unassigned"}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge color="blue">{b.type}</Badge>
                    <Badge color="gray">{b.frameMaterial}</Badge>
                    {b.frameSize && <Badge color="gray">{b.frameSize}</Badge>}
                    <StatusBadge status={b.condition} />
                    {b.status && b.status !== "active" && <Badge color={b.status === "stored" ? "yellow" : "red"}>{b.status}</Badge>}
                    {b.eVehicle && <Badge color="green">Electric</Badge>}
                    {b.components.groupset && <Badge color="purple">{b.components.groupset}</Badge>}
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400 mt-1" />
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && <EmptyState icon={Bike} title="No bicycles found" description={search ? "Try a different search" : "Add your first bicycle"} />}
      </div>
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? "Edit Bicycle" : "Add Bicycle"} wide>
        <BikeForm initial={editing || blankBike} clients={db.clients} onSave={saveBike} onCancel={() => { setShowForm(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}

export function BikeForm({ initial, clients, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setComp = (k, v) => setForm(f => ({ ...f, components: { ...f.components, [k]: v } }));
  const types = ["Road", "Mountain", "Hybrid", "Gravel", "Track", "BMX", "Touring", "E-Bike", "E-Dirt Bike", "Cruiser", "Fat Bike", "Cyclocross", "Triathlon", "Tandem", "Folding", "Other"];
  const materials = ["Aluminum", "Carbon", "Steel", "Titanium", "Carbon CC", "Chromoly", "Other"];
  const conditions = ["Excellent", "Good", "Fair", "Poor"];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Select label="Client" value={form.clientId} onChange={e => set("clientId", e.target.value)} options={[{ value: "", label: "-- Select --" }, ...clients.map(c => ({ value: c.id, label: c.name }))]} />
        <Input label="Nickname" value={form.nickname} onChange={e => set("nickname", e.target.value)} placeholder="e.g. The Commuter" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Input label="Make" value={form.make} onChange={e => set("make", e.target.value)} required />
        <Input label="Model" value={form.model} onChange={e => set("model", e.target.value)} required />
        <Input label="Year" type="number" value={form.year} onChange={e => set("year", parseInt(e.target.value))} />
        <Input label="Serial Number" value={form.serial} onChange={e => set("serial", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Select label="Type" value={form.type} onChange={e => set("type", e.target.value)} options={types.map(t => ({ value: t, label: t }))} />
        <Select label="Frame Material" value={form.frameMaterial} onChange={e => set("frameMaterial", e.target.value)} options={materials.map(m => ({ value: m, label: m }))} />
        <Input label="Frame Size" value={form.frameSize} onChange={e => set("frameSize", e.target.value)} placeholder="e.g. 54cm / Large" />
        <Input label="Color" value={form.color} onChange={e => set("color", e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Select label="Condition" value={form.condition} onChange={e => set("condition", e.target.value)} options={conditions.map(c => ({ value: c, label: c }))} />
        <Input label="Purchase Date" type="date" value={form.purchaseDate} onChange={e => set("purchaseDate", e.target.value)} />
        <Input label="Last Service" type="date" value={form.lastService} onChange={e => set("lastService", e.target.value)} />
      </div>

      <div>
        <h4 className="font-semibold text-gray-900 mb-3 text-sm border-b pb-2">Components</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[["groupset","Groupset"],["drivetrain","Drivetrain"],["frontDerailleur","Front Derailleur"],["rearDerailleur","Rear Derailleur"],["shifters","Shifters"],["crankset","Crankset"],["cassette","Cassette"],["chain","Chain"],["brakes","Brakes"],["rotors","Rotors"],["wheels","Wheels"],["tires","Tires"],["handlebars","Handlebars"],["stem","Stem"],["seatpost","Seatpost"],["saddle","Saddle"]].map(([key, label]) => (
            <Input key={key} label={label} value={form.components[key]} onChange={e => setComp(key, e.target.value)} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select label="Status" value={form.status || "active"} onChange={e => set("status", e.target.value)}
          options={[{value: "active", label: "Active"}, {value: "stored", label: "Stored"}, {value: "inactive", label: "Inactive"}]} />
        <div className="flex items-center gap-3 pt-6">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={!!form.bookable} onChange={e => set("bookable", e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-sm font-medium text-gray-700">Available for client booking</span>
          </label>
        </div>
      </div>

      {(form.type === "E-Bike" || form.type === "E-Dirt Bike") && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-3 text-sm border-b pb-2">E-Vehicle Specifications</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Motor Type" value={form.eVehicle?.motorType || ""} onChange={e => set("eVehicle", { ...(form.eVehicle || {}), motorType: e.target.value })} />
            <Input label="Motor Power" value={form.eVehicle?.motorPower || ""} onChange={e => set("eVehicle", { ...(form.eVehicle || {}), motorPower: e.target.value })} />
            <Input label="Battery Type" value={form.eVehicle?.batteryType || ""} onChange={e => set("eVehicle", { ...(form.eVehicle || {}), batteryType: e.target.value })} />
            <Input label="Battery Capacity" value={form.eVehicle?.batteryCapacity || ""} onChange={e => set("eVehicle", { ...(form.eVehicle || {}), batteryCapacity: e.target.value })} />
            <Input label="Charging Time" value={form.eVehicle?.chargingTime || ""} onChange={e => set("eVehicle", { ...(form.eVehicle || {}), chargingTime: e.target.value })} />
            <Input label="Range" value={form.eVehicle?.range || ""} onChange={e => set("eVehicle", { ...(form.eVehicle || {}), range: e.target.value })} />
            <Input label="Transmission" value={form.eVehicle?.transmission || ""} onChange={e => set("eVehicle", { ...(form.eVehicle || {}), transmission: e.target.value })} />
          </div>
        </div>
      )}

      <TextArea label="Notes" value={form.notes} onChange={e => set("notes", e.target.value)} />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.make || !form.model}><Save size={16} /> Save Bicycle</Button>
      </div>
    </div>
  );
}

