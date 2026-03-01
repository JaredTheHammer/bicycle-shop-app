import { useState } from "react";
import { ShoppingCart, Plus, Edit2, X, Save, Trash2, ThumbsUp, ThumbsDown, Truck, Clock, CheckCircle, Eye, Package } from "lucide-react";
import { Card, Button, Modal, Input, TextArea, Select, EmptyState, Badge } from "../components/ui.jsx";
import { genId, saveDB } from "../lib/db.js";
import { PERMISSIONS } from "../lib/constants.js";

// ─── Parts Request & Approval Workflow ───────────────────────────────
const PR_STATUSES = [
  { key: "pending", label: "Pending", color: "yellow" },
  { key: "manager_approved", label: "Manager Approved", color: "blue" },
  { key: "owner_approved", label: "Owner Approved", color: "green" },
  { key: "ordered", label: "Ordered", color: "purple" },
  { key: "received", label: "Received", color: "green" },
  { key: "rejected", label: "Rejected", color: "red" },
];

export function PurchaseRequestPanel({ db, setDb, workOrderId }) {
  // Inline panel rendered inside work order detail view
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPartId, setNewPartId] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [newNotes, setNewNotes] = useState("");

  const requests = (db.purchaseRequests || []).filter(pr => pr.workOrderId === workOrderId);
  const wo = (db.workOrders || []).find(w => w.id === workOrderId);
  const bike = wo ? db.bicycles.find(b => b.id === wo.bicycleId) : null;

  // Filter parts to show compatible ones first
  const allParts = db.parts || [];
  const compatParts = bike ? allParts.filter(p => (p.compatibleBikeIds || []).includes(bike.id)) : allParts;
  const otherParts = bike ? allParts.filter(p => !(p.compatibleBikeIds || []).includes(bike.id)) : [];

  function createRequest() {
    if (!newPartId) return;
    const part = allParts.find(p => p.id === newPartId);
    const pr = {
      id: genId(), workOrderId, partId: newPartId, partName: part?.name || "",
      quantity: parseInt(newQty) || 1,
      requestedBy: "u3", // default to tech
      managerApproved: null, ownerApproved: null,
      status: "pending", shippingEta: null, actualCost: null,
      supplier: part?.supplier || "", notes: newNotes,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    // Check stock and compatibility
    const warnings = [];
    if (part && part.currentStock >= (parseInt(newQty) || 1)) {
      warnings.push(`In stock (${part.currentStock} available). Consider using existing stock.`);
    }
    if (bike && part && !(part.compatibleBikeIds || []).includes(bike.id)) {
      warnings.push(`Part may not be compatible with ${bike.nickname || bike.make}.`);
    }
    if (warnings.length > 0 && !confirm(`Warnings:\n${warnings.join("\n")}\n\nProceed with request?`)) return;

    const updated = { ...db, purchaseRequests: [...(db.purchaseRequests || []), pr] };
    setDb(updated); saveDB(updated);
    setShowAddForm(false); setNewPartId(""); setNewQty(1); setNewNotes("");
  }

  function updatePRStatus(prId, newStatus, approverField, approverId) {
    const now = new Date().toISOString().slice(0, 10);
    const updated = { ...db };
    updated.purchaseRequests = updated.purchaseRequests.map(pr => {
      if (pr.id !== prId) return pr;
      const changes = { ...pr, status: newStatus };
      if (approverField) changes[approverField] = approverId;
      // If received, increment stock
      if (newStatus === "received") {
        const part = (updated.parts || []).find(p => p.id === pr.partId);
        if (part) {
          updated.parts = updated.parts.map(p => p.id === pr.partId ? { ...p, currentStock: p.currentStock + pr.quantity, lastOrdered: now } : p);
        }
      }
      return changes;
    });
    setDb(updated); saveDB(updated);
  }

  function deletePR(prId) {
    if (!confirm("Delete this purchase request?")) return;
    const updated = { ...db, purchaseRequests: (db.purchaseRequests || []).filter(pr => pr.id !== prId) };
    setDb(updated); saveDB(updated);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><ShoppingCart size={14} /> Purchase Requests</h4>
        <Button variant="secondary" size="sm" onClick={() => setShowAddForm(!showAddForm)}><Plus size={14} /> Request Part</Button>
      </div>

      {showAddForm && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="space-y-3">
            <Select label="Part" value={newPartId} onChange={e => setNewPartId(e.target.value)}
              options={[
                { value: "", label: "-- Select Part --" },
                ...(compatParts.length > 0 ? [{ value: "_divider_compat", label: "--- Compatible ---", disabled: true }] : []),
                ...compatParts.map(p => ({ value: p.id, label: `${p.name} (${p.currentStock} in stock) - $${p.unitCost}` })),
                ...(otherParts.length > 0 ? [{ value: "_divider_other", label: "--- Other ---", disabled: true }] : []),
                ...otherParts.map(p => ({ value: p.id, label: `${p.name} (${p.currentStock} in stock) - $${p.unitCost}` })),
              ]} />
            {newPartId && (() => {
              const selectedPart = allParts.find(p => p.id === newPartId);
              const alts = (selectedPart?.alternativePartIds || []).map(aid => allParts.find(p => p.id === aid)).filter(Boolean);
              return alts.length > 0 ? (
                <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded">
                  Alternatives available: {alts.map(a => `${a.name} (${a.currentStock} in stock)`).join(", ")}
                </div>
              ) : null;
            })()}
            <div className="grid grid-cols-2 gap-3">
              <Input label="Quantity" type="number" min="1" value={newQty} onChange={e => setNewQty(e.target.value)} />
              <Input label="Notes" value={newNotes} onChange={e => setNewNotes(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button size="sm" onClick={createRequest} disabled={!newPartId}><ShoppingCart size={14} /> Submit Request</Button>
            </div>
          </div>
        </Card>
      )}

      {requests.length > 0 ? (
        <div className="space-y-2">
          {requests.map(pr => {
            const part = allParts.find(p => p.id === pr.partId);
            const statusDef = PR_STATUSES.find(s => s.key === pr.status) || PR_STATUSES[0];
            return (
              <div key={pr.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{pr.partName || part?.name || pr.partId}</span>
                    <Badge color={statusDef.color}>{statusDef.label}</Badge>
                    <span className="text-gray-500">x{pr.quantity}</span>
                  </div>
                  {pr.notes && <p className="text-xs text-gray-400 mt-0.5">{pr.notes}</p>}
                  {pr.supplier && <p className="text-xs text-gray-400">Supplier: {pr.supplier}</p>}
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  {pr.status === "pending" && (
                    <>
                      <button onClick={() => updatePRStatus(pr.id, "manager_approved", "managerApproved", "u2")} className="p-1 rounded hover:bg-green-100 text-green-600" title="Manager Approve"><ThumbsUp size={14} /></button>
                      <button onClick={() => updatePRStatus(pr.id, "rejected")} className="p-1 rounded hover:bg-red-100 text-red-600" title="Reject"><ThumbsDown size={14} /></button>
                    </>
                  )}
                  {pr.status === "manager_approved" && (
                    <button onClick={() => updatePRStatus(pr.id, "owner_approved", "ownerApproved", "u1")} className="p-1 rounded hover:bg-green-100 text-green-600" title="Owner Approve"><ThumbsUp size={14} /></button>
                  )}
                  {pr.status === "owner_approved" && (
                    <button onClick={() => updatePRStatus(pr.id, "ordered")} className="p-1 rounded hover:bg-purple-100 text-purple-600" title="Mark Ordered"><Truck size={14} /></button>
                  )}
                  {pr.status === "ordered" && (
                    <button onClick={() => updatePRStatus(pr.id, "received")} className="p-1 rounded hover:bg-green-100 text-green-600" title="Mark Received"><Package size={14} /></button>
                  )}
                  <button onClick={() => deletePR(pr.id)} className="p-1 rounded hover:bg-red-100 text-red-400" title="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-3">No purchase requests for this work order</p>
      )}
    </div>
  );
}

