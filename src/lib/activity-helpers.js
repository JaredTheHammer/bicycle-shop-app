import {
  MoveRight, User, MessageSquare, ClipboardCheck,
  Package, Plus, Edit2, ArrowRightLeft,
} from "lucide-react";

// ─── Activity Log Helpers ─────────────────────────────────────────────

/** Human-friendly relative time string from an ISO timestamp */
export function formatRelativeTime(isoStr) {
  if (!isoStr) return "";
  const diff = Date.now() - new Date(isoStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Returns { Icon, bg, color } for a given activity action type */
export function activityIcon(action) {
  const map = {
    created:          { Icon: Plus,           bg: "bg-blue-100",   color: "text-blue-600" },
    status_change:    { Icon: MoveRight,      bg: "bg-blue-100",   color: "text-blue-600" },
    tech_reassigned:  { Icon: User,           bg: "bg-purple-100", color: "text-purple-600" },
    note_added:       { Icon: MessageSquare,  bg: "bg-green-100",  color: "text-green-600" },
    checklist_update: { Icon: ClipboardCheck, bg: "bg-yellow-100", color: "text-yellow-600" },
    parts_requested:  { Icon: Package,        bg: "bg-orange-100", color: "text-orange-600" },
    edited:           { Icon: Edit2,          bg: "bg-gray-100",   color: "text-gray-500" },
    tools_checkout:   { Icon: ArrowRightLeft, bg: "bg-teal-100",   color: "text-teal-600" },
  };
  return map[action] || map.edited;
}

/** Returns a human-readable verb for an activity action type */
export function activityVerb(action) {
  const verbs = {
    created:          "created work order",
    status_change:    "changed status",
    tech_reassigned:  "reassigned tech",
    note_added:       "added a note",
    checklist_update: "updated checklist",
    parts_requested:  "requested parts",
    edited:           "edited work order",
    tools_checkout:   "checked out tools",
  };
  return verbs[action] || "updated";
}
