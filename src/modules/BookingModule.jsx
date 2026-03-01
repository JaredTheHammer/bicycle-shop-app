import { useState, useMemo, useEffect } from "react";
import { CalendarCheck, Plus, Edit2, Search, X, Save, Trash2, ArrowLeft, ChevronRight, ChevronDown, Clock, CheckCircle, Bike, Users, Eye, Calendar, Mountain, Zap, MapPin } from "lucide-react";
import { Card, Button, Modal, Input, TextArea, Select, EmptyState, Badge } from "../components/ui.jsx";
import { genId, saveDB } from "../lib/db.js";
import { computePmStatus, PmStatusBadge } from "../lib/pm-engine.jsx";

// ─── Fleet Bike Booking (Phase 4.3) ──────────────────────────────────
const BOOKING_STATUSES = {
  pending: { label: "Pending", color: "bg-blue-100 text-blue-800" },
  confirmed: { label: "Confirmed", color: "bg-purple-100 text-purple-800" },
  active: { label: "Checked Out", color: "bg-orange-100 text-orange-800" },
  returned: { label: "Returned", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-700" },
};
const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"];
const PEDAL_PREFS = ["flat", "clipless", "either"];
const DURATION_PRESETS = [
  { label: "1 day", days: 1 }, { label: "2 days", days: 2 },
  { label: "3 days", days: 3 }, { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 }, { label: "Custom", days: 0 },
];

const BIKE_TYPE_ICONS = {
  "Road": { icon: Bike, color: "text-blue-600 bg-blue-50" },
  "Gravel": { icon: Bike, color: "text-amber-600 bg-amber-50" },
  "Touring": { icon: Bike, color: "text-teal-600 bg-teal-50" },
  "Mountain": { icon: Mountain, color: "text-green-600 bg-green-50" },
  "E-Bike": { icon: Zap, color: "text-yellow-600 bg-yellow-50" },
  "E-Dirt Bike": { icon: Zap, color: "text-orange-600 bg-orange-50" },
  "Hybrid": { icon: Bike, color: "text-purple-600 bg-purple-50" },
  "Cruiser": { icon: Bike, color: "text-pink-600 bg-pink-50" },
  "BMX": { icon: Bike, color: "text-red-600 bg-red-50" },
  "Fat Bike": { icon: Bike, color: "text-indigo-600 bg-indigo-50" },
};

export function BookingStatusBadge({ status }) {
  const s = BOOKING_STATUSES[status] || BOOKING_STATUSES.pending;
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>;
}

export function BookingWizard({ db, setDb, currentUser, onBack, preselectedClientId }) {
  const isStaff = currentUser.role === "owner" || currentUser.role === "manager";
  const totalSteps = isStaff ? 6 : 5;
  const [step, setStep] = useState(isStaff ? 0 : 1);
  const [selectedClientId, setSelectedClientId] = useState(preselectedClientId || (isStaff ? "" : (currentUser.properties?.[0] || "")));
  const [selectedBikeId, setSelectedBikeId] = useState("");
  const [riderProfile, setRiderProfile] = useState({ name: currentUser.name || "", height: "", weight: "", experience: "intermediate" });
  const [accessories, setAccessories] = useState({ helmet: false, pedalPreference: "flat", otherGear: "" });
  const [checkoutDate, setCheckoutDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [durationPreset, setDurationPreset] = useState("Custom");
  const [stagingLocation, setStagingLocation] = useState("");
  const [notes, setNotes] = useState("");

  const today = new Date().toISOString().split("T")[0];

  // Available bikes: bookable, at selected client property, not RED PM, not already checked out
  const availableBikes = useMemo(() => {
    if (!selectedClientId) return [];
    return db.bicycles.filter(b => {
      if (!b.bookable || b.status !== "active") return false;
      if (b.clientId !== selectedClientId) return false;
      const pm = computePmStatus(b, db.workOrders);
      if (pm.status === "red") return false;
      // Exclude bikes with active bookings (confirmed or active status)
      const hasActiveBooking = db.bookings?.some(bk => bk.bicycleId === b.id && (bk.status === "confirmed" || bk.status === "active"));
      if (hasActiveBooking) return false;
      return true;
    });
  }, [db, selectedClientId]);

  const selectedBike = db.bicycles.find(b => b.id === selectedBikeId);
  const clientName = db.clients.find(c => c.id === selectedClientId)?.name || "";

  // Duration preset handler
  const handleDurationChange = (preset) => {
    setDurationPreset(preset);
    const p = DURATION_PRESETS.find(d => d.label === preset);
    if (p && p.days > 0 && checkoutDate) {
      const d = new Date(checkoutDate);
      d.setDate(d.getDate() + p.days);
      setReturnDate(d.toISOString().split("T")[0]);
    }
  };

  // Auto-update return date when checkout changes (if preset is not Custom)
  useEffect(() => {
    const p = DURATION_PRESETS.find(d => d.label === durationPreset);
    if (p && p.days > 0 && checkoutDate) {
      const d = new Date(checkoutDate);
      d.setDate(d.getDate() + p.days);
      setReturnDate(d.toISOString().split("T")[0]);
    }
  }, [checkoutDate, durationPreset]);

  // Auto-set staging location from client property
  useEffect(() => {
    if (selectedClientId && !stagingLocation) {
      const client = db.clients.find(c => c.id === selectedClientId);
      if (client) setStagingLocation(client.name);
    }
  }, [selectedClientId]);

  const handleSubmit = () => {
    const bookingId = genId();
    const newBooking = {
      id: bookingId, bicycleId: selectedBikeId, clientId: selectedClientId,
      requestedById: currentUser.id,
      riderProfile: { ...riderProfile },
      accessories: { ...accessories },
      checkoutDate, returnDate, status: "pending",
      workOrderId: null, stagingLocation, notes,
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    };

    // Auto-generate Prep & Deliver work order
    const woId = genId();
    const bike = db.bicycles.find(b => b.id === selectedBikeId);
    const newWO = {
      id: woId, bicycleId: selectedBikeId, clientId: selectedClientId,
      type: "preventative", category: "General", status: "new", priority: "normal",
      assignedTechId: db.users.find(u => u.role === "tech")?.id || "u2",
      description: `Prep & Deliver: ${bike?.nickname || "Bike"} for ${riderProfile.name}\nCheckout: ${checkoutDate} | Return: ${returnDate}\nRider: ${riderProfile.height}, ${riderProfile.weight}, ${riderProfile.experience}\nPedals: ${accessories.pedalPreference} | Helmet: ${accessories.helmet ? "Yes" : "No"}\nStaging: ${stagingLocation}`,
      checklist: [],
      scheduledDate: checkoutDate,
      createdAt: new Date().toISOString().split("T")[0],
      _autoGenerated: true, _bookingId: bookingId,
    };

    newBooking.workOrderId = woId;
    newBooking.status = "confirmed";

    const updated = {
      ...db,
      bookings: [...(db.bookings || []), newBooking],
      workOrders: [...db.workOrders, newWO],
    };
    saveDB(updated);
    setDb(updated);
    onBack();
  };

  const canProceed = () => {
    if (step === 0 && isStaff) return !!selectedClientId;
    if (step === 1) return !!selectedBikeId;
    if (step === 2) return riderProfile.name.trim() !== "";
    if (step === 3) return true;
    if (step === 4) return checkoutDate && returnDate && returnDate >= checkoutDate;
    return true;
  };

  const stepLabels = isStaff
    ? ["Client", "Bike", "Rider", "Accessories", "Dates", "Review"]
    : ["Bike", "Rider", "Accessories", "Dates", "Review"];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Book a Bike</h1>
          <p className="text-sm text-gray-500">Step {step + 1 - (isStaff ? 0 : 0)} of {totalSteps}</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex gap-1 mb-6">
        {stepLabels.map((label, i) => {
          const stepIdx = isStaff ? i : i + 1;
          return (
            <div key={i} className="flex-1 text-center">
              <div className={`h-1.5 rounded-full mb-1 ${stepIdx <= step ? "bg-blue-500" : "bg-gray-200"}`} />
              <span className={`text-xs ${stepIdx === step ? "text-blue-700 font-medium" : "text-gray-400"}`}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Step 0: Select Client (staff only) */}
      {step === 0 && isStaff && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Client Property</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {db.clients.map(client => (
              <button key={client.id} onClick={() => { setSelectedClientId(client.id); setSelectedBikeId(""); }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${selectedClientId === client.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                <div className="font-semibold text-gray-900">{client.name}</div>
                <div className="text-sm text-gray-500 mt-1">{client.contact || ""}</div>
                <div className="text-xs text-gray-400 mt-1">{db.bicycles.filter(b => b.clientId === client.id && b.bookable).length} bookable bikes</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Select Bike */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select a Bike {clientName && `at ${clientName}`}</h2>
          {availableBikes.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <Bike size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No bookable bikes available</p>
              <p className="text-sm text-gray-400 mt-1">Bikes must be marked as "Available for client booking" in the Bicycles module.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableBikes.map(bike => {
                const pm = computePmStatus(bike, db.workOrders);
                const typeInfo = BIKE_TYPE_ICONS[bike.type] || BIKE_TYPE_ICONS["Road"];
                const TypeIcon = typeInfo.icon;
                return (
                  <button key={bike.id} onClick={() => setSelectedBikeId(bike.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${selectedBikeId === bike.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${typeInfo.color}`}>
                        <TypeIcon size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">{bike.nickname}</div>
                        <div className="text-sm text-gray-500">{bike.type} {bike.make && `- ${bike.make}`} {bike.model || ""}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <PmStatusBadge pmStatus={pm} size="sm" />
                          {bike.frameSize && <span className="text-xs text-gray-400">{bike.frameSize}</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Rider Profile */}
      {step === 2 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Rider Profile</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <Input label="Rider Name" value={riderProfile.name} onChange={e => setRiderProfile(p => ({ ...p, name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Height" value={riderProfile.height} onChange={e => setRiderProfile(p => ({ ...p, height: e.target.value }))} placeholder="e.g. 5'10&quot; or 178cm" />
              <Input label="Weight" value={riderProfile.weight} onChange={e => setRiderProfile(p => ({ ...p, weight: e.target.value }))} placeholder="e.g. 170 lbs or 77kg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
              <div className="grid grid-cols-3 gap-3">
                {EXPERIENCE_LEVELS.map(level => (
                  <button key={level} onClick={() => setRiderProfile(p => ({ ...p, experience: level }))}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${riderProfile.experience === level ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <div className="text-sm font-medium capitalize">{level}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Accessories */}
      {step === 3 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Accessories & Gear</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
              <div>
                <div className="font-medium text-gray-900">Helmet needed</div>
                <div className="text-sm text-gray-500">Include a helmet with the bike</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={accessories.helmet} onChange={e => setAccessories(a => ({ ...a, helmet: e.target.checked }))} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pedal Preference</label>
              <div className="grid grid-cols-3 gap-3">
                {PEDAL_PREFS.map(pref => (
                  <button key={pref} onClick={() => setAccessories(a => ({ ...a, pedalPreference: pref }))}
                    className={`p-3 rounded-xl border-2 text-center transition-all capitalize ${accessories.pedalPreference === pref ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <div className="text-sm font-medium">{pref}</div>
                  </button>
                ))}
              </div>
            </div>
            <TextArea label="Other Gear Notes" value={accessories.otherGear} onChange={e => setAccessories(a => ({ ...a, otherGear: e.target.value }))} placeholder="Any special gear requests..." />
          </div>
        </div>
      )}

      {/* Step 4: Date Selection */}
      {step === 4 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Dates</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <Input label="Checkout Date" type="date" value={checkoutDate} min={today}
              onChange={e => setCheckoutDate(e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {DURATION_PRESETS.map(preset => (
                  <button key={preset.label} onClick={() => handleDurationChange(preset.label)}
                    className={`px-3 py-2 rounded-lg border text-sm transition-all ${durationPreset === preset.label ? "border-blue-500 bg-blue-50 text-blue-700 font-medium" : "border-gray-200 hover:border-gray-300 text-gray-600"}`}>
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <Input label="Return Date" type="date" value={returnDate} min={checkoutDate || today}
              onChange={e => { setReturnDate(e.target.value); setDurationPreset("Custom"); }} />
            {checkoutDate && returnDate && returnDate < checkoutDate && (
              <p className="text-sm text-red-600">Return date must be on or after checkout date.</p>
            )}
          </div>
        </div>
      )}

      {/* Step 5: Review & Confirm */}
      {step === (isStaff ? 5 : 5) && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Review & Confirm</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            {selectedBike && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {(() => { const ti = BIKE_TYPE_ICONS[selectedBike.type] || BIKE_TYPE_ICONS["Road"]; const TI = ti.icon; return <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ti.color}`}><TI size={20} /></div>; })()}
                <div>
                  <div className="font-semibold text-gray-900">{selectedBike.nickname}</div>
                  <div className="text-sm text-gray-500">{selectedBike.type} {selectedBike.make && `- ${selectedBike.make}`} {selectedBike.model || ""}</div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Rider:</span> <span className="font-medium">{riderProfile.name}</span></div>
              <div><span className="text-gray-500">Experience:</span> <span className="font-medium capitalize">{riderProfile.experience}</span></div>
              {riderProfile.height && <div><span className="text-gray-500">Height:</span> <span className="font-medium">{riderProfile.height}</span></div>}
              {riderProfile.weight && <div><span className="text-gray-500">Weight:</span> <span className="font-medium">{riderProfile.weight}</span></div>}
              <div><span className="text-gray-500">Helmet:</span> <span className="font-medium">{accessories.helmet ? "Yes" : "No"}</span></div>
              <div><span className="text-gray-500">Pedals:</span> <span className="font-medium capitalize">{accessories.pedalPreference}</span></div>
              <div><span className="text-gray-500">Checkout:</span> <span className="font-medium">{checkoutDate}</span></div>
              <div><span className="text-gray-500">Return:</span> <span className="font-medium">{returnDate}</span></div>
            </div>
            {accessories.otherGear && <div className="text-sm"><span className="text-gray-500">Other gear:</span> {accessories.otherGear}</div>}
            <div className="pt-2 space-y-3">
              <Input label="Staging / Delivery Location" value={stagingLocation} onChange={e => setStagingLocation(e.target.value)} placeholder="Where to stage the bike" />
              <TextArea label="Additional Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special instructions..." />
            </div>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center gap-3 mt-6">
        {step > (isStaff ? 0 : 1) && (
          <button onClick={() => setStep(step - 1)} className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            Back
          </button>
        )}
        {step < (isStaff ? 5 : 5) ? (
          <button onClick={() => setStep(step + 1)} disabled={!canProceed()}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">
            Continue
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={!canProceed()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:bg-gray-300">
            <CalendarCheck size={16} /> Confirm Booking
          </button>
        )}
      </div>
    </div>
  );
}

export function BikeBookingModule({ db, setDb, perms, currentUser }) {
  const [showWizard, setShowWizard] = useState(false);
  const [filter, setFilter] = useState("all");
  const bookings = db.bookings || [];

  const filteredBookings = filter === "all" ? bookings : bookings.filter(b => b.status === filter);

  const updateBookingStatus = (bookingId, newStatus) => {
    const updated = {
      ...db,
      bookings: db.bookings.map(b => b.id === bookingId ? { ...b, status: newStatus, updatedAt: new Date().toISOString().split("T")[0] } : b),
    };
    saveDB(updated);
    setDb(updated);
  };

  if (showWizard) {
    return <BookingWizard db={db} setDb={setDb} currentUser={currentUser} onBack={() => setShowWizard(false)} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-sm text-gray-500">{bookings.length} total booking{bookings.length !== 1 ? "s" : ""}</p>
        </div>
        {perms.bookingsManage && (
          <button onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
            <Plus size={18} /> New Booking
          </button>
        )}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[{ key: "all", label: "All" }, ...Object.entries(BOOKING_STATUSES).map(([k, v]) => ({ key: k, label: v.label }))].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f.key ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {f.label} {f.key === "all" ? `(${bookings.length})` : `(${bookings.filter(b => b.status === f.key).length})`}
          </button>
        ))}
      </div>

      {filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <CalendarCheck size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No bookings {filter !== "all" ? `with status "${BOOKING_STATUSES[filter]?.label}"` : "yet"}</p>
          <p className="text-sm text-gray-400 mt-1">Create a new booking to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).map(booking => {
            const bike = db.bicycles.find(b => b.id === booking.bicycleId);
            const client = db.clients.find(c => c.id === booking.clientId);
            return (
              <div key={booking.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{bike?.nickname || "Unknown Bike"}</span>
                      <BookingStatusBadge status={booking.status} />
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {booking.riderProfile?.name} {client && `at ${client.name}`}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Calendar size={12} />{booking.checkoutDate} to {booking.returnDate}</span>
                      {booking.stagingLocation && <span className="flex items-center gap-1"><MapPin size={12} />{booking.stagingLocation}</span>}
                    </div>
                  </div>
                  {perms.bookingsManage && (
                    <div className="flex gap-1 ml-3">
                      {booking.status === "pending" && (
                        <button onClick={() => updateBookingStatus(booking.id, "confirmed")} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100" title="Confirm">Confirm</button>
                      )}
                      {booking.status === "confirmed" && (
                        <button onClick={() => updateBookingStatus(booking.id, "active")} className="text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100" title="Check Out">Check Out</button>
                      )}
                      {booking.status === "active" && (
                        <button onClick={() => updateBookingStatus(booking.id, "returned")} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-lg hover:bg-green-100" title="Return">Returned</button>
                      )}
                      {(booking.status === "pending" || booking.status === "confirmed") && (
                        <button onClick={() => updateBookingStatus(booking.id, "cancelled")} className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100" title="Cancel">Cancel</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

