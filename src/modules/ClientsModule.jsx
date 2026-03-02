import { useState } from "react";
import { Users, Plus, Edit2, Search, ChevronRight, X, Save, Trash2, Eye } from "lucide-react";
import { Card, Button, Modal, Input, TextArea, Select, EmptyState, Badge } from "../components/ui.jsx";
import { genId, saveDB } from "../lib/db.js";
import { PERMISSIONS } from "../lib/constants.js";

// ─── Clients Module ──────────────────────────────────────────────────
export function ClientsModule({ db, setDb, perms = PERMISSIONS.owner }) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const filtered = db.clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));

  const blankClient = { name: "", email: "", phone: "", address: "", notes: "", createdAt: new Date().toISOString().slice(0, 10) };

  function saveClient(client) {
    const updated = { ...db };
    if (client.id) {
      updated.clients = updated.clients.map(c => c.id === client.id ? client : c);
    } else {
      updated.clients = [...updated.clients, { ...client, id: genId() }];
    }
    setDb(updated); saveDB(updated); setShowForm(false); setEditing(null);
  }

  function deleteClient(id) {
    if (!confirm("Delete this client and unlink their bicycles?")) return;
    const updated = { ...db, clients: db.clients.filter(c => c.id !== id) };
    setDb(updated); saveDB(updated);
  }

  const bikeCountForClient = (cid) => db.bicycles.filter(b => b.clientId === cid).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Clients</h1><p className="text-sm text-gray-500 mt-1">{db.clients.length} total clients</p></div>
        {perms.clientsEdit && <Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={16} /> Add Client</Button>}
      </div>
      <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="grid gap-4">
        {filtered.map(c => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{c.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{c.email} {c.phone && `| ${c.phone}`}</p>
                {c.address && <p className="text-sm text-gray-500">{c.address}</p>}
                {c.notes && <p className="text-sm text-gray-400 mt-1 italic">{c.notes}</p>}
                <div className="flex gap-2 mt-2">{(() => { const n = bikeCountForClient(c.id); return <Badge color="blue">{n} bike{n !== 1 ? "s" : ""}</Badge>; })()}<Badge color="gray">Since {c.createdAt ? new Date(c.createdAt + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}</Badge></div>
              </div>
              {perms.clientsEdit && <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditing(c); setShowForm(true); }}><Edit2 size={14} /></Button>
                {perms.deleteRecords && <Button variant="ghost" size="sm" onClick={() => deleteClient(c.id)}><Trash2 size={14} className="text-red-500" /></Button>}
              </div>}
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <EmptyState icon={Users} title="No clients found" description={search ? "Try a different search" : "Add your first client"} />}
      </div>
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? "Edit Client" : "Add Client"}>
        <ClientForm initial={editing || blankClient} onSave={saveClient} onCancel={() => { setShowForm(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}

export function ClientForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="space-y-4">
      <Input label="Name" value={form.name} onChange={e => set("name", e.target.value)} required />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Email" type="email" value={form.email} onChange={e => set("email", e.target.value)} />
        <Input label="Phone" value={form.phone} onChange={e => set("phone", e.target.value)} />
      </div>
      <Input label="Address" value={form.address} onChange={e => set("address", e.target.value)} />
      <TextArea label="Notes" value={form.notes} onChange={e => set("notes", e.target.value)} />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name}><Save size={16} /> Save</Button>
      </div>
    </div>
  );
}

