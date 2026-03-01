import { useState } from "react";
import { MessageSquarePlus, ArrowLeft, Send, Camera, X, Save, Bike, AlertTriangle, ShieldCheck, Cog, CircleDot, Activity, Layers, Zap, Wrench, CheckCircle, FileText, CircleAlert, ChevronRight } from "lucide-react";
import { Card, Button, Input, TextArea, Select } from "../components/ui.jsx";
import { genId, saveDB } from "../lib/db.js";
import { computePmStatus, PmStatusBadge } from "../lib/pm-engine.jsx";

// ─── Client Issue Reporting (Phase 4.2) ──────────────────────────────
const CLIENT_ISSUE_CATEGORIES = [
  { key: "Brakes", icon: ShieldCheck, color: "text-red-600 bg-red-50 border-red-200" },
  { key: "Drivetrain", icon: Cog, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { key: "Tires/Wheels", icon: CircleDot, color: "text-orange-600 bg-orange-50 border-orange-200" },
  { key: "Suspension", icon: Activity, color: "text-purple-600 bg-purple-50 border-purple-200" },
  { key: "Frame", icon: Layers, color: "text-gray-600 bg-gray-50 border-gray-200" },
  { key: "Electrical", icon: Zap, color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  { key: "Other", icon: Wrench, color: "text-green-600 bg-green-50 border-green-200" },
];

const CLIENT_URGENCY_LEVELS = [
  { key: "low", label: "Routine", description: "Fix when convenient", priority: "low", color: "border-gray-300 bg-gray-50 text-gray-700" },
  { key: "normal", label: "Needs Attention Soon", description: "Within a few days", priority: "normal", color: "border-blue-300 bg-blue-50 text-blue-700" },
  { key: "urgent", label: "Urgent / Unsafe", description: "Bike may be unsafe to ride", priority: "urgent", color: "border-red-300 bg-red-50 text-red-700" },
];

export function ClientIssueForm({ db, setDb, currentUser, onBack }) {
  const propertyIds = currentUser.properties || [];
  const myBikes = db.bicycles.filter(b => propertyIds.includes(b.clientId));
  const [step, setStep] = useState(1); // 1=bike, 2=category, 3=details, 4=confirm
  const [bikeId, setBikeId] = useState(null);
  const [category, setCategory] = useState(null);
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [submitted, setSubmitted] = useState(false);

  const selectedBike = myBikes.find(b => b.id === bikeId);
  const selectedCategory = CLIENT_ISSUE_CATEGORIES.find(c => c.key === category);
  const selectedUrgency = CLIENT_URGENCY_LEVELS.find(u => u.key === urgency);

  const handleSubmit = () => {
    const client = db.clients.find(c => propertyIds.includes(c.id));
    const bike = db.bicycles.find(b => b.id === bikeId);
    const woId = genId();
    const newWO = {
      id: woId,
      bicycleId: bikeId,
      clientId: bike?.clientId || propertyIds[0],
      type: "client_request",
      category: category || "General",
      status: "new",
      priority: selectedUrgency?.priority || "normal",
      assignedTechId: null, // Manager will assign
      requestedById: currentUser.id,
      description: `Client request: ${category || "General"} issue on ${bike?.nickname || "bike"}`,
      reportedIssue: description,
      mechanicNotes: "",
      checklist: bike ? generateChecklist(bike.type) : [],
      partsUsed: [],
      partsRequested: [],
      photos: [],
      laborHours: 0,
      location: client?.name || "",
      toolsRequired: [],
      toolsVerified: false,
      managerSignoff: null,
      scheduledDate: null,
      startedDate: null,
      completedDate: null,
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    };
    const updated = { ...db, workOrders: [...db.workOrders, newWO] };
    setDb(updated);
    saveDB(updated);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Issue Reported</h2>
        <p className="text-gray-600 mb-1">Your service request for <span className="font-semibold">{selectedBike?.nickname}</span> has been submitted.</p>
        <p className="text-sm text-gray-500 mb-6">Our team will review it and get back to you.</p>
        <button onClick={onBack}
          className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report an Issue</h1>
          <p className="text-sm text-gray-500">Step {step} of 4</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5 mb-8">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-blue-600" : "bg-gray-200"}`} />
        ))}
      </div>

      {/* Step 1: Select Bike */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Which bike has an issue?</h2>
          <p className="text-sm text-gray-500 mb-4">Select the bicycle that needs attention.</p>
          <div className="space-y-3">
            {myBikes.map(bike => {
              const pm = computePmStatus(bike, db.workOrders);
              return (
                <button key={bike.id} onClick={() => { setBikeId(bike.id); setStep(2); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${bikeId === bike.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"}`}>
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <Bike size={24} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{bike.nickname}</span>
                      <PmStatusBadge pmStatus={pm} size="sm" />
                    </div>
                    <p className="text-sm text-gray-500">{bike.type} {bike.make && `- ${bike.make}`}</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-400 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Issue Category */}
      {step === 2 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">What type of issue?</h2>
          <p className="text-sm text-gray-500 mb-4">Select the category that best describes the problem.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CLIENT_ISSUE_CATEGORIES.map(cat => (
              <button key={cat.key} onClick={() => { setCategory(cat.key); setStep(3); }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${category === cat.key ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${cat.color}`}>
                  <cat.icon size={22} />
                </div>
                <span className="text-sm font-medium text-gray-700">{cat.key}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(1)} className="mt-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      )}

      {/* Step 3: Description & Urgency */}
      {step === 3 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Describe the issue</h2>
          <p className="text-sm text-gray-500 mb-4">Tell us what you noticed. Be as specific as possible.</p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">What's happening?</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={4} placeholder="e.g., Strange noise when braking, chain slipping under load, flat tire..."
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">How urgent is this?</label>
              <div className="space-y-2">
                {CLIENT_URGENCY_LEVELS.map(u => (
                  <button key={u.key} onClick={() => setUrgency(u.key)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${urgency === u.key ? `${u.color} border-2` : "border-gray-200 hover:border-gray-300"}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${urgency === u.key ? "border-current" : "border-gray-300"}`}>
                      {urgency === u.key && <div className="w-2 h-2 rounded-full bg-current" />}
                    </div>
                    <div>
                      <span className="font-medium text-sm">{u.label}</span>
                      <span className="text-xs text-gray-500 ml-2">{u.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button onClick={() => setStep(2)} className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              Back
            </button>
            <button onClick={() => setStep(4)} disabled={!description.trim()}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Review & Submit
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Confirm */}
      {step === 4 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Review your report</h2>

          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            <div className="p-4 flex items-center gap-3">
              <Bike size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Bicycle</p>
                <p className="font-medium text-gray-900">{selectedBike?.nickname} <span className="text-sm text-gray-500 font-normal">({selectedBike?.type})</span></p>
              </div>
            </div>
            <div className="p-4 flex items-center gap-3">
              {selectedCategory && <selectedCategory.icon size={18} className="text-gray-400" />}
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="font-medium text-gray-900">{category}</p>
              </div>
            </div>
            <div className="p-4 flex items-center gap-3">
              <FileText size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm text-gray-700">{description}</p>
              </div>
            </div>
            <div className="p-4 flex items-center gap-3">
              <CircleAlert size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Urgency</p>
                <p className="font-medium text-gray-900">{selectedUrgency?.label}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button onClick={() => setStep(3)} className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              Back
            </button>
            <button onClick={handleSubmit}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
              <Send size={16} /> Submit Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

