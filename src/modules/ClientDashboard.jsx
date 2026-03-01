import { useState } from "react";
import { Home, Bike, Calendar, MessageSquarePlus, CheckCircle, Clock, AlertTriangle, ChevronRight, Eye, Activity, CalendarCheck, MapPin, CircleAlert } from "lucide-react";
import { Card, Button, Badge, EmptyState, StatCard } from "../components/ui.jsx";
import { computePmStatus, PmStatusBadge } from "../lib/pm-engine.jsx";
import { BookingStatusBadge } from "./BookingModule.jsx";

// ─── Client Dashboard (Phase 4.1) ────────────────────────────────────
export function ClientDashboard({ db, currentUser, onReportIssue, onBookBike }) {
  // Get the client's property IDs
  const propertyIds = currentUser.properties || [];
  const properties = db.clients.filter(c => propertyIds.includes(c.id));
  // Get bikes at the client's properties
  const myBikes = db.bicycles.filter(b => propertyIds.includes(b.clientId));
  // Get work orders for those bikes (client sees their property's tickets)
  const myWOs = db.workOrders.filter(wo => propertyIds.includes(wo.clientId));
  const activeWOs = myWOs.filter(wo => wo.status !== "resolved");
  const recentResolved = myWOs.filter(wo => wo.status === "resolved").sort((a, b) => (b.completedDate || "").localeCompare(a.completedDate || "")).slice(0, 5);
  const statusLabels = { new: "Submitted", diagnostics: "Being Diagnosed", in_progress: "In Progress", waiting_parts: "Waiting on Parts", ready: "Ready for Pickup", resolved: "Completed" };
  const statusColors = { new: "bg-blue-100 text-blue-800", diagnostics: "bg-purple-100 text-purple-800", in_progress: "bg-yellow-100 text-yellow-800", waiting_parts: "bg-orange-100 text-orange-800", ready: "bg-green-100 text-green-800", resolved: "bg-gray-100 text-gray-700" };
  const priorityColors = { urgent: "text-red-600", high: "text-orange-600", normal: "text-blue-600", low: "text-gray-500" };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {properties.map(p => p.name).join(" & ")}</h1>
          <p className="text-sm text-gray-500 mt-1">{myBikes.length} bicycle{myBikes.length !== 1 ? "s" : ""} at your propert{properties.length > 1 ? "ies" : "y"}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onBookBike}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors shadow-sm">
            <CalendarCheck size={18} /> Book a Bike
          </button>
          <button onClick={onReportIssue}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
            <MessageSquarePlus size={18} /> Report an Issue
          </button>
        </div>
      </div>

      {/* Active Tickets */}
      {activeWOs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Activity size={18} className="text-blue-600" /> Active Service Tickets
            <span className="text-sm font-normal text-gray-500">({activeWOs.length})</span>
          </h2>
          <div className="space-y-3">
            {activeWOs.sort((a, b) => {
              const po = { urgent: 0, high: 1, normal: 2, low: 3 };
              return (po[a.priority] ?? 2) - (po[b.priority] ?? 2);
            }).map(wo => {
              const bike = db.bicycles.find(b => b.id === wo.bicycleId);
              return (
                <div key={wo.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{bike?.nickname || "Unknown Bike"}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[wo.status] || "bg-gray-100 text-gray-700"}`}>
                          {statusLabels[wo.status] || wo.status}
                        </span>
                        {wo.priority === "urgent" && <span className="text-xs text-red-600 font-semibold flex items-center gap-0.5"><CircleAlert size={12} /> Urgent</span>}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{wo.reportedIssue || wo.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Calendar size={12} />Submitted {wo.createdAt}</span>
                        {wo.type === "client_request" && <span className="flex items-center gap-1"><MessageSquarePlus size={12} />Your request</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* My Bookings */}
      {(() => {
        const myBookings = (db.bookings || []).filter(b => b.clientId && propertyIds.includes(b.clientId) && b.status !== "cancelled" && b.status !== "returned");
        if (myBookings.length === 0) return null;
        return (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CalendarCheck size={18} className="text-green-600" /> My Bookings
              <span className="text-sm font-normal text-gray-500">({myBookings.length})</span>
            </h2>
            <div className="space-y-3">
              {myBookings.map(booking => {
                const bike = db.bicycles.find(b => b.id === booking.bicycleId);
                return (
                  <div key={booking.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{bike?.nickname || "Bike"}</span>
                          <BookingStatusBadge status={booking.status} />
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Rider: {booking.riderProfile?.name || "N/A"}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Calendar size={12} />{booking.checkoutDate} to {booking.returnDate}</span>
                          {booking.stagingLocation && <span className="flex items-center gap-1"><MapPin size={12} />{booking.stagingLocation}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Your Bikes */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Bike size={18} className="text-blue-600" /> Your Bicycles
        </h2>
        {myBikes.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
            <Bike size={40} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No bicycles assigned to your property.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myBikes.map(bike => {
              const pm = computePmStatus(bike, db.workOrders);
              const bikeWOs = activeWOs.filter(wo => wo.bicycleId === bike.id);
              return (
                <div key={bike.id} className={`bg-white rounded-xl border-l-4 shadow-sm p-4 ${pm.status === "green" ? "border-l-green-500" : pm.status === "yellow" ? "border-l-yellow-500" : "border-l-red-500"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{bike.nickname}</span>
                        <PmStatusBadge pmStatus={pm} size="sm" />
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{bike.type} {bike.make && `- ${bike.make}`} {bike.model && bike.model}</p>
                      <div className="text-xs text-gray-400 mt-1">
                        {bike.lastPMDate ? `Last serviced: ${bike.lastPMDate}` : "No service history"}
                      </div>
                    </div>
                    <div className="text-right">
                      {bikeWOs.length > 0 ? (
                        <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                          {bikeWOs.length} active ticket{bikeWOs.length !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={12} /> Available</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recently Completed */}
      {recentResolved.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle size={18} className="text-green-600" /> Recently Completed
          </h2>
          <div className="space-y-2">
            {recentResolved.map(wo => {
              const bike = db.bicycles.find(b => b.id === wo.bicycleId);
              return (
                <div key={wo.id} className="bg-white rounded-lg border border-gray-100 p-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">{bike?.nickname || "Unknown"}</span>
                    <span className="text-xs text-gray-400 ml-2">{wo.description}</span>
                  </div>
                  <span className="text-xs text-gray-500">{wo.completedDate}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No active tickets empty state */}
      {activeWOs.length === 0 && (
        <div className="text-center py-8 bg-white rounded-xl border border-gray-200 mb-8">
          <CheckCircle size={40} className="mx-auto text-green-300 mb-2" />
          <p className="text-gray-500 font-medium">No active service tickets</p>
          <p className="text-sm text-gray-400 mt-1">All your bikes are in good shape. Report an issue if something comes up.</p>
        </div>
      )}
    </div>
  );
}

