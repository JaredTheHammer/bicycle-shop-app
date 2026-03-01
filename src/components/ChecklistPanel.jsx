import { useState } from "react";
import { CheckCircle, CircleDot, CircleX, MinusCircle, ChevronDown, ChevronRight } from "lucide-react";
import { CHECKLIST_CATEGORIES } from "../lib/constants.js";
import { checklistStats } from "../lib/checklist.js";

// ─── Checklist Panel Component ───────────────────────────────────────
export function ChecklistPanel({ checklist, onChange, readOnly = false }) {
  const [expandedCats, setExpandedCats] = useState({});

  if (!checklist || checklist.length === 0) {
    return <p className="text-sm text-gray-500 italic">No checklist attached to this record.</p>;
  }

  const stats = checklistStats(checklist);

  // Group items by category, ordered by CHECKLIST_CATEGORIES.order
  const grouped = Object.entries(CHECKLIST_CATEGORIES)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([catKey, catDef]) => ({
      key: catKey,
      ...catDef,
      items: checklist.filter(i => i.category === catKey),
    }))
    .filter(g => g.items.length > 0);

  const toggleCat = (key) => setExpandedCats(prev => ({ ...prev, [key]: !prev[key] }));

  const statusIcon = (status) => {
    switch (status) {
      case "pass": return <CheckCircle size={16} className="text-green-500" />;
      case "fail": return <CircleX size={16} className="text-red-500" />;
      case "na": return <MinusCircle size={16} className="text-gray-400" />;
      default: return <CircleDot size={16} className="text-gray-300" />;
    }
  };

  const cycleStatus = (itemId) => {
    if (readOnly) return;
    const order = ["pending", "pass", "fail", "na"];
    const updated = checklist.map(item => {
      if (item.id !== itemId) return item;
      const idx = order.indexOf(item.status);
      return { ...item, status: order[(idx + 1) % order.length] };
    });
    onChange(updated);
  };

  const setItemNote = (itemId, notes) => {
    if (readOnly) return;
    onChange(checklist.map(item => item.id === itemId ? { ...item, notes } : item));
  };

  const catStats = (items) => {
    const p = items.filter(i => i.status === "pass").length;
    const f = items.filter(i => i.status === "fail").length;
    const n = items.filter(i => i.status === "na").length;
    const pend = items.filter(i => i.status === "pending").length;
    return { p, f, n, pend, total: items.length };
  };

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-1.5">
          <ClipboardCheck size={18} className="text-blue-600" />
          <span className="text-sm font-semibold text-gray-900">M-Check</span>
        </div>
        <div className="flex-1">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${stats.fail > 0 ? "bg-red-500" : stats.pct === 100 ? "bg-green-500" : "bg-blue-500"}`}
              style={{ width: `${Math.max(stats.pct, stats.total > 0 && stats.pending < stats.total ? 2 : 0)}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium shrink-0">
          <span className="text-green-600">{stats.pass} pass</span>
          {stats.fail > 0 && <span className="text-red-600">{stats.fail} fail</span>}
          <span className="text-gray-400">{stats.na} N/A</span>
          {stats.pending > 0 && <span className="text-gray-500">{stats.pending} pending</span>}
        </div>
      </div>

      {/* Category sections */}
      {grouped.map(cat => {
        const cs = catStats(cat.items);
        const isExpanded = expandedCats[cat.key] !== false; // default expanded
        return (
          <div key={cat.key} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleCat(cat.key)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                <span className="text-sm font-semibold text-gray-900">{cat.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {cs.f > 0 && <Badge color="red">{cs.f} fail</Badge>}
                {cs.pend > 0 && <Badge color="gray">{cs.pend} pending</Badge>}
                {cs.pend === 0 && cs.f === 0 && <Badge color="green">Complete</Badge>}
                <span className="text-xs text-gray-400">{cs.p + cs.n}/{cs.total}</span>
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-gray-200 divide-y divide-gray-100">
                {cat.items.map(item => (
                  <div key={item.id} className="px-4 py-2.5 flex items-start gap-3 bg-white">
                    <button
                      onClick={() => cycleStatus(item.id)}
                      className={`mt-0.5 shrink-0 ${readOnly ? "" : "cursor-pointer hover:opacity-70"}`}
                      title={readOnly ? item.status : `Click to cycle: ${item.status} -> next`}
                      disabled={readOnly}
                    >
                      {statusIcon(item.status)}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${item.status === "na" ? "text-gray-400 line-through" : item.status === "fail" ? "text-red-700 font-medium" : "text-gray-700"}`}>
                        {item.label}
                      </p>
                      {(item.notes || !readOnly) && (
                        readOnly ? (
                          item.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{item.notes}</p>
                        ) : (
                          <input
                            className="mt-1 w-full text-xs px-2 py-1 border border-gray-200 rounded text-gray-600 focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="Notes..."
                            value={item.notes}
                            onChange={e => setItemNote(item.id, e.target.value)}
                          />
                        )
                      )}
                    </div>
                    <span className={`text-xs font-medium shrink-0 mt-0.5 px-1.5 py-0.5 rounded ${
                      item.status === "pass" ? "bg-green-50 text-green-700" :
                      item.status === "fail" ? "bg-red-50 text-red-700" :
                      item.status === "na" ? "bg-gray-50 text-gray-500" :
                      "bg-gray-50 text-gray-400"
                    }`}>
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-4 px-2 text-xs text-gray-400">
        <span>Click status icons to cycle:</span>
        <span className="flex items-center gap-1"><CircleDot size={12} /> Pending</span>
        <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> Pass</span>
        <span className="flex items-center gap-1"><CircleX size={12} className="text-red-500" /> Fail</span>
        <span className="flex items-center gap-1"><MinusCircle size={12} className="text-gray-400" /> N/A</span>
      </div>
    </div>
  );
}

/** Small inline badge showing checklist completion at a glance */
export function ChecklistBadge({ checklist }) {
  if (!checklist || checklist.length === 0) return null;
  const stats = checklistStats(checklist);
  if (stats.pending === stats.total) return <Badge color="gray">Checklist: Not started</Badge>;
  if (stats.fail > 0) return <Badge color="red">Checklist: {stats.fail} fail</Badge>;
  if (stats.pending === 0) return <Badge color="green">Checklist: {stats.pct}% pass</Badge>;
  return <Badge color="yellow">Checklist: {stats.pct}% ({stats.pending} pending)</Badge>;
}

