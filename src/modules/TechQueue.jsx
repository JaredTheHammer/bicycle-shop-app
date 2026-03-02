import { useState } from "react";
import { ClipboardCheck, Clock, CheckCircle, AlertTriangle, ChevronRight, Wrench, MoveRight, Eye, MapPin, TriangleAlert, Calendar } from "lucide-react";
import { Card, Button, Badge, EmptyState } from "../components/ui.jsx";
import { WO_STATUSES } from "../lib/constants.js";
import { saveDB } from "../lib/db.js";
import { computePmStatus, PmStatusBadge } from "../lib/pm-engine.jsx";
import { checklistStats } from "../lib/checklist.js";

// ─── Tech Queue Dashboard (Phase 2.3) ───────────────────────────────
export function TechQueueDashboard({ db, setDb, currentUser }) {
  const myWOs = db.workOrders.filter(wo => wo.assignedTechId === currentUser.id && wo.status !== "resolved");
  const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
  const sorted = [...myWOs].sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));
  const priorityColors = { urgent: "bg-red-100 text-red-800 border-red-300", high: "bg-orange-100 text-orange-800 border-orange-300", normal: "bg-blue-100 text-blue-800 border-blue-300", low: "bg-gray-100 text-gray-700 border-gray-300" };
  const statusLabels = { new: "New", diagnostics: "Diagnostics", in_progress: "In Progress", waiting_parts: "Waiting Parts", ready: "Ready" };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Queue</h1>
          <p className="text-sm text-gray-500 mt-1">{sorted.length} active work order{sorted.length !== 1 ? "s" : ""} assigned to you</p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle size={48} className="mx-auto text-green-300 mb-3" />
          <p className="text-gray-500 font-medium">All caught up!</p>
          <p className="text-sm text-gray-400 mt-1">No open work orders assigned to you.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(wo => {
            const bike = db.bicycles.find(b => b.id === wo.bicycleId);
            const client = db.clients.find(c => c.id === wo.clientId);
            const pm = bike ? computePmStatus(bike, db.workOrders) : null;
            return (
              <div key={wo.id} className={`bg-white rounded-xl border-l-4 shadow-sm p-4 ${wo.priority === "urgent" ? "border-l-red-500" : wo.priority === "high" ? "border-l-orange-500" : wo.priority === "normal" ? "border-l-blue-500" : "border-l-gray-400"}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{bike?.nickname || "Unknown Bike"}</span>
                      {pm && <PmStatusBadge pmStatus={pm} size="sm" />}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${priorityColors[wo.priority]}`}>{wo.priority}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{wo.description || `${wo.type} - ${wo.category}`}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      {client && <span className="flex items-center gap-1"><MapPin size={12} />{client.name}</span>}
                      <span className="flex items-center gap-1"><Clock size={12} />{statusLabels[wo.status] || wo.status}</span>
                      {wo.scheduledDate && <span className="flex items-center gap-1"><Calendar size={12} />{wo.scheduledDate}</span>}
                    </div>
                    {wo.toolsRequired?.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                        <Wrench size={12} />
                        {wo.toolsRequired.length} tool{wo.toolsRequired.length !== 1 ? "s" : ""} required
                      </div>
                    )}
                    {/* Safety callouts for brake fluid */}
                    {bike?.notes && (bike.notes.includes("MINERAL OIL") || bike.notes.includes("Mineral Oil") || bike.notes.includes("mineral oil")) && (
                      <div className="mt-2 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 flex items-center gap-1">
                        <TriangleAlert size={12} /> MINERAL OIL brake system
                      </div>
                    )}
                    {bike?.notes && (bike.notes.includes("DOT") || bike.notes.includes("dot fluid")) && (
                      <div className="mt-2 px-2 py-1 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800 flex items-center gap-1">
                        <TriangleAlert size={12} /> DOT brake fluid system
                      </div>
                    )}
                    {/* Checklist progress */}
                    {wo.checklist?.length > 0 && (() => {
                      const stats = checklistStats(wo.checklist);
                      return (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${stats.pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{Math.round(stats.pct)}%</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

