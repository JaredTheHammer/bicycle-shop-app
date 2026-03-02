import { useState } from "react";
import { MapPin, Plus, Edit2, X, Save, Trash2, Plane, Hotel, Calendar, Users, Bike, Star, ArrowLeft, CheckCircle, Clock, Eye, LayoutDashboard, BookOpen, DollarSign, FileText } from "lucide-react";
import { Card, Button, Modal, Input, TextArea, Select, EmptyState, Badge, StatusBadge, StatCard, useConfirm, useToast } from "../components/ui.jsx";
import { genId, saveDB } from "../lib/db.js";

// ─── Grant's UBI Trip Module ─────────────────────────────────────────
export function TripModule({ db, setDb }) {
  const [tab, setTab] = useState("overview");
  const trip = db.grantTrip;
  const confirm = useConfirm();
  const toast = useToast();

  function updateTrip(updates) {
    const updated = { ...db, grantTrip: { ...db.grantTrip, ...updates } };
    setDb(updated); saveDB(updated);
  }

  function toggleChecklist(id) {
    const item = trip.checklist.find(c => c.id === id);
    const cl = trip.checklist.map(c => c.id === id ? { ...c, done: !c.done } : c);
    updateTrip({ checklist: cl });
    toast.success(item?.done ? "Task unchecked" : "Task completed");
  }

  function addJournal(entry) {
    updateTrip({ journal: [...trip.journal, { id: genId(), date: new Date().toISOString().slice(0, 10), entry }] });
    toast.success("Journal entry added");
  }

  function addExpense(exp) {
    updateTrip({ expenses: [...trip.expenses, { ...exp, id: genId() }] });
    toast.success("Expense added");
  }

  function updateExpense(id, updates) {
    updateTrip({ expenses: trip.expenses.map(e => e.id === id ? { ...e, ...updates } : e) });
  }

  async function deleteExpense(id) {
    const exp = trip.expenses.find(e => e.id === id);
    if (!await confirm(`Delete "${exp?.description || "this expense"}"?`, { title: "Delete expense?", variant: "danger" })) return;
    updateTrip({ expenses: trip.expenses.filter(e => e.id !== id) });
    toast.success("Expense deleted");
  }

  function addChecklistItem(task, dueDate) {
    updateTrip({ checklist: [...trip.checklist, { id: genId(), task, done: false, dueDate }] });
    toast.success("Task added");
  }

  const totalBudget = trip.expenses.reduce((s, e) => s + e.amount, 0);
  const totalPaid = trip.expenses.filter(e => e.paid).reduce((s, e) => s + e.amount, 0);
  const daysUntil = Math.ceil((new Date(trip.travel.departureDate) - new Date()) / (1000 * 60 * 60 * 24));

  const tabs = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "courses", label: "Courses", icon: BookOpen },
    { key: "logistics", label: "Travel & Lodging", icon: Plane },
    { key: "expenses", label: "Budget", icon: DollarSign },
    { key: "checklist", label: "Checklist", icon: CheckCircle },
    { key: "journal", label: "Journal", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Grant's UBI Certification Trip</h1>
        <p className="text-sm text-gray-500 mt-1">{trip.destination}</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            <t.icon size={16} />{t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Clock} label="Days Until Trip" value={daysUntil > 0 ? daysUntil : "Now!"} color="orange" />
            <StatCard icon={BookOpen} label="Courses" value={`${trip.courses.filter(c => c.status === "enrolled").length}/${trip.courses.length}`} sub="enrolled" color="blue" />
            <StatCard icon={DollarSign} label="Total Budget" value={`$${totalBudget.toLocaleString()}`} sub={`$${totalPaid.toLocaleString()} paid`} color="green" />
            <StatCard icon={CheckCircle} label="Prep Tasks" value={`${trip.checklist.filter(c => c.done).length}/${trip.checklist.length}`} color="purple" />
          </div>
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Trip Summary</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[["Purpose", trip.purpose], ["Destination", trip.destination], ["Address", trip.address],
                ["Departure", trip.travel.departureDate], ["Return", trip.travel.returnDate],
                ["Duration", `${Math.ceil((new Date(trip.travel.returnDate) - new Date(trip.travel.departureDate)) / (1000*60*60*24))} days`],
                ["Transport", trip.travel.mode], ["Status", trip.status]].map(([l, v]) => (
                <div key={l} className="flex justify-between border-b border-gray-50 pb-1">
                  <dt className="text-gray-500">{l}</dt><dd className="font-medium text-gray-900">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      )}

      {tab === "courses" && (
        <div className="space-y-4">
          {trip.courses.map((c, i) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">WEEK {i + 1}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mt-1">{c.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{c.startDate} to {c.endDate}</p>
                  <p className="text-sm text-gray-600 mt-1">{c.notes}</p>
                </div>
                <span className="text-lg font-bold text-gray-900">${c.cost.toLocaleString()}</span>
              </div>
            </Card>
          ))}
          <Card className="p-5 bg-blue-50 border-blue-200">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-blue-900">Total Tuition</span>
              <span className="text-xl font-bold text-blue-900">${trip.courses.reduce((s, c) => s + c.cost, 0).toLocaleString()}</span>
            </div>
          </Card>
        </div>
      )}

      {tab === "logistics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Plane size={18} /> Travel</h3>
            <dl className="space-y-2 text-sm">
              {[["Mode", trip.travel.mode], ["Departure", trip.travel.departureDate], ["Return", trip.travel.returnDate],
                ["Flight Info", trip.travel.flightInfo || "N/A"], ["Rental Car", trip.travel.rentalCar || "N/A"]].map(([l, v]) => (
                <div key={l} className="flex justify-between"><dt className="text-gray-500">{l}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
            {trip.travel.notes && <p className="text-sm text-gray-500 mt-3 pt-3 border-t italic">{trip.travel.notes}</p>}
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Hotel size={18} /> Lodging</h3>
            <dl className="space-y-2 text-sm">
              {[["Name", trip.lodging.name], ["Check-in", trip.lodging.checkIn], ["Check-out", trip.lodging.checkOut],
                ["Rate", trip.lodging.costPerNight ? `$${trip.lodging.costPerNight}/night` : "TBD"],
                ["Total", trip.lodging.totalCost ? `$${trip.lodging.totalCost}` : "TBD"],
                ["Confirmation", trip.lodging.confirmationNumber || "Pending"]].map(([l, v]) => (
                <div key={l} className="flex justify-between"><dt className="text-gray-500">{l}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
            {trip.lodging.notes && <p className="text-sm text-gray-500 mt-3 pt-3 border-t italic">{trip.lodging.notes}</p>}
          </Card>
        </div>
      )}

      {tab === "expenses" && <ExpensesTab trip={trip} addExpense={addExpense} updateExpense={updateExpense} deleteExpense={deleteExpense} totalBudget={totalBudget} totalPaid={totalPaid} />}

      {tab === "checklist" && <ChecklistTab trip={trip} toggleChecklist={toggleChecklist} addChecklistItem={addChecklistItem} />}

      {tab === "journal" && <JournalTab trip={trip} addJournal={addJournal} />}
    </div>
  );
}

function ExpensesTab({ trip, addExpense, updateExpense, deleteExpense, totalBudget, totalPaid }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newExp, setNewExp] = useState({ category: "Tuition", description: "", amount: 0, date: "", paid: false, notes: "" });

  const categories = ["Tuition", "Lodging", "Travel", "Meals", "Tools", "Supplies", "Other"];
  const byCategory = categories.map(cat => ({
    category: cat,
    items: trip.expenses.filter(e => e.category === cat),
    total: trip.expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="text-center"><p className="text-2xl font-bold text-gray-900">${totalBudget.toLocaleString()}</p><p className="text-xs text-gray-500">Total Budget</p></div>
          <div className="text-center"><p className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString()}</p><p className="text-xs text-gray-500">Paid</p></div>
          <div className="text-center"><p className="text-2xl font-bold text-orange-600">${(totalBudget - totalPaid).toLocaleString()}</p><p className="text-xs text-gray-500">Remaining</p></div>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add Expense</Button>
      </div>

      {byCategory.map(cat => (
        <Card key={cat.category} className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-gray-900">{cat.category}</h4>
            <span className="font-bold text-gray-700">${cat.total.toLocaleString()}</span>
          </div>
          <div className="space-y-2">
            {cat.items.map(e => (
              <div key={e.id} className="flex items-center justify-between text-sm py-1.5 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <button onClick={() => updateExpense(e.id, { paid: !e.paid })} className={`w-5 h-5 rounded border-2 flex items-center justify-center ${e.paid ? "bg-green-500 border-green-500 text-white" : "border-gray-300"}`}>
                    {e.paid && <CheckCircle size={12} />}
                  </button>
                  <div>
                    <span className={e.paid ? "line-through text-gray-400" : "text-gray-700"}>{e.description}</span>
                    {e.notes && <span className="text-xs text-gray-400 ml-2">({e.notes})</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">${e.amount.toLocaleString()}</span>
                  <button onClick={() => deleteExpense(e.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Expense">
        <div className="space-y-4">
          <Select label="Category" value={newExp.category} onChange={e => setNewExp(x => ({ ...x, category: e.target.value }))} options={categories.map(c => ({ value: c, label: c }))} />
          <Input label="Description" value={newExp.description} onChange={e => setNewExp(x => ({ ...x, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount ($)" type="number" step="0.01" value={newExp.amount} onChange={e => setNewExp(x => ({ ...x, amount: parseFloat(e.target.value) || 0 }))} />
            <Input label="Date" type="date" value={newExp.date} onChange={e => setNewExp(x => ({ ...x, date: e.target.value }))} />
          </div>
          <TextArea label="Notes" value={newExp.notes} onChange={e => setNewExp(x => ({ ...x, notes: e.target.value }))} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => { addExpense(newExp); setShowAdd(false); setNewExp({ category: "Tuition", description: "", amount: 0, date: "", paid: false, notes: "" }); }} disabled={!newExp.description}><Save size={16} /> Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ChecklistTab({ trip, toggleChecklist, addChecklistItem }) {
  const [newTask, setNewTask] = useState("");
  const [newDue, setNewDue] = useState("");
  const done = trip.checklist.filter(c => c.done);
  const todo = trip.checklist.filter(c => !c.done).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex gap-2">
          <input className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Add a task..." value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newTask) { addChecklistItem(newTask, newDue); setNewTask(""); setNewDue(""); } }} />
          <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" value={newDue} onChange={e => setNewDue(e.target.value)} />
          <Button onClick={() => { if (newTask) { addChecklistItem(newTask, newDue); setNewTask(""); setNewDue(""); } }}><Plus size={16} /></Button>
        </div>
      </Card>

      {todo.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold text-gray-900 mb-3">To Do ({todo.length})</h4>
          <div className="space-y-2">
            {todo.map(c => {
              const overdue = c.dueDate && new Date(c.dueDate) < new Date();
              return (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleChecklist(c.id)} className="w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center hover:border-blue-500" />
                    <span className="text-sm text-gray-700">{c.task}</span>
                  </div>
                  {c.dueDate && <span className={`text-xs ${overdue ? "text-red-500 font-medium" : "text-gray-400"}`}>{overdue ? "OVERDUE " : ""}Due {c.dueDate}</span>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {done.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold text-gray-500 mb-3">Completed ({done.length})</h4>
          <div className="space-y-2">
            {done.map(c => (
              <div key={c.id} className="flex items-center gap-3 py-1.5">
                <button onClick={() => toggleChecklist(c.id)} className="w-5 h-5 rounded border-2 bg-green-500 border-green-500 text-white flex items-center justify-center"><CheckCircle size={12} /></button>
                <span className="text-sm text-gray-400 line-through">{c.task}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function JournalTab({ trip, addJournal }) {
  const [entry, setEntry] = useState("");
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" rows={3} placeholder="Write a journal entry..." value={entry} onChange={e => setEntry(e.target.value)} />
        <div className="flex justify-end mt-2">
          <Button onClick={() => { if (entry) { addJournal(entry); setEntry(""); } }} disabled={!entry}><FileText size={16} /> Add Entry</Button>
        </div>
      </Card>
      <div className="space-y-3">
        {[...trip.journal].reverse().map(j => (
          <Card key={j.id} className="p-4">
            <p className="text-xs text-gray-400 mb-1">{j.date}</p>
            <p className="text-sm text-gray-700">{j.entry}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

