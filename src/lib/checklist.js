import { CHECKLIST_CATEGORIES, CHECKLIST_ITEMS_BASE } from "./constants.js";

/**
 * Generate a checklist instance for a specific bike type.
 * Filters out categories that don't apply (e.g., no suspension items for road bikes).
 * Each item gets status: "pending" | "pass" | "fail" | "na" and notes: ""
 */
export function generateChecklist(bikeType) {
  const applicableCategories = Object.entries(CHECKLIST_CATEGORIES)
    .filter(([, cat]) => !cat.bikeTypes || cat.bikeTypes.includes(bikeType))
    .map(([key]) => key);

  return CHECKLIST_ITEMS_BASE
    .filter(item => applicableCategories.includes(item.category))
    .map(item => ({
      id: item.id,
      category: item.category,
      label: item.label,
      status: "pending",  // pending | pass | fail | na
      notes: "",
    }));
}

/** Compute checklist summary stats */
export function checklistStats(checklist) {
  if (!checklist || checklist.length === 0) return { total: 0, pass: 0, fail: 0, na: 0, pending: 0, pct: 0 };
  const pass = checklist.filter(i => i.status === "pass").length;
  const fail = checklist.filter(i => i.status === "fail").length;
  const na = checklist.filter(i => i.status === "na").length;
  const pending = checklist.filter(i => i.status === "pending").length;
  const actionable = checklist.length - na;
  const pct = actionable > 0 ? Math.round((pass / actionable) * 100) : 100;
  return { total: checklist.length, pass, fail, na, pending, pct };
}
