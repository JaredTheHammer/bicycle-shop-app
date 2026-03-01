import { DEFAULT_PM_INTERVAL_DAYS, DEFAULT_PM_INTERVAL_RIDE_DAYS, PM_YELLOW_THRESHOLD_DAYS, PM_RIDE_DAY_YELLOW_THRESHOLD } from "./constants.js";

/**
 * Compute the preventative maintenance status for a single bike.
 * Reads from db.workOrders (primary) with fallback compatibility for legacy db.maintenance.
 * Returns {
 *   status: "green"|"yellow"|"red",
 *   reason: string,
 *   trigger: "time"|"ride"|"overdue_scheduled"|"active_repair"|"failed_checklist"|null,
 *   daysSinceService: number|null,
 *   nextDueDate: string|null,
 *   rideDaysSinceLastPM: number,
 *   rideDaysUntilDue: number|null
 * }
 */
export function computePmStatus(bike, records) {
  const bikeRecords = records.filter(r => r.bicycleId === bike.id);
  const pmInterval = bike.pmIntervalDays || DEFAULT_PM_INTERVAL_DAYS;
  const rideInterval = bike.pmIntervalRideDays || DEFAULT_PM_INTERVAL_RIDE_DAYS;
  const rideDaysSinceLastPM = bike.rideDaysSinceLastPM || 0;
  const rideDaysUntilDue = rideInterval - rideDaysSinceLastPM;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Normalize status values: work orders use "resolved"/"new", legacy uses "completed"/"scheduled"
  const isCompleted = (r) => r.status === "resolved" || r.status === "completed";
  const isScheduled = (r) => r.status === "new" || r.status === "scheduled";
  const isActive = (r) => !isCompleted(r) && !isScheduled(r);

  // Check for overdue scheduled/new work orders
  const overdueScheduled = bikeRecords.filter(r =>
    isScheduled(r) && r.scheduledDate && new Date(r.scheduledDate) < today
  );

  // Check for active (in-progress, diagnostics, waiting_parts) work orders
  const activeIssues = bikeRecords.filter(r => isActive(r));

  // Find the most recent completed service date
  const completedRecords = bikeRecords
    .filter(r => isCompleted(r) && (r.completedDate || r.scheduledDate))
    .sort((a, b) => new Date(b.completedDate || b.scheduledDate) - new Date(a.completedDate || a.scheduledDate));

  const lastServiceDate = completedRecords.length > 0
    ? new Date(completedRecords[0].completedDate || completedRecords[0].scheduledDate)
    : null;
  const daysSinceService = lastServiceDate ? Math.floor((today - lastServiceDate) / (1000 * 60 * 60 * 24)) : null;

  // Compute next time-based due date
  const nextDueDate = lastServiceDate
    ? new Date(lastServiceDate.getTime() + pmInterval * 24 * 60 * 60 * 1000)
    : null;
  const daysUntilDue = nextDueDate ? Math.floor((nextDueDate - today) / (1000 * 60 * 60 * 24)) : null;

  // Check for failed checklist items in most recent completed inspection
  const recentWithFails = completedRecords.find(r =>
    r.checklist && r.checklist.some(i => i.status === "fail")
  );

  // Helper to build the return object
  const fmt = (d) => d?.toISOString().slice(0, 10) ?? null;
  const result = (status, reason, trigger) => ({
    status, reason, trigger,
    daysSinceService, nextDueDate: fmt(nextDueDate),
    rideDaysSinceLastPM, rideDaysUntilDue
  });

  // ── RED conditions (checked in priority order, first match wins) ──

  if (overdueScheduled.length > 0) {
    return result("red", `${overdueScheduled.length} overdue service(s)`, "overdue_scheduled");
  }
  if (activeIssues.length > 0) {
    return result("red", "Active repair in progress", "active_repair");
  }
  // Time-based overdue
  if (daysUntilDue !== null && daysUntilDue < 0) {
    return result("red", `PM overdue by ${Math.abs(daysUntilDue)} days (time)`, "time");
  }
  // Ride-day overdue (strictly past interval; at-interval falls to yellow)
  if (rideDaysUntilDue < 0) {
    return result("red", `PM overdue by ${Math.abs(rideDaysUntilDue)} ride-day${Math.abs(rideDaysUntilDue) !== 1 ? "s" : ""}`, "ride");
  }
  if (recentWithFails) {
    return result("red", "Failed checklist items on last inspection", "failed_checklist");
  }

  // ── YELLOW conditions ──

  // Time-based approaching due
  if (daysUntilDue !== null && daysUntilDue <= PM_YELLOW_THRESHOLD_DAYS) {
    return result("yellow", `PM due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""} (time)`, "time");
  }
  // Ride-day approaching due
  if (rideDaysUntilDue <= PM_RIDE_DAY_YELLOW_THRESHOLD) {
    return result("yellow", `PM due in ${rideDaysUntilDue} ride-day${rideDaysUntilDue !== 1 ? "s" : ""}`, "ride");
  }
  if (daysSinceService === null && bikeRecords.length === 0) {
    return result("yellow", "No service history recorded", null);
  }
  if (bike.status === "inactive") {
    return result("yellow", "Bike marked inactive", null);
  }

  // Upcoming scheduled work within threshold
  const upcomingSoon = bikeRecords.filter(r => {
    if (!isScheduled(r) || !r.scheduledDate) return false;
    const sched = new Date(r.scheduledDate);
    const daysUntil = Math.floor((sched - today) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= PM_YELLOW_THRESHOLD_DAYS;
  });
  if (upcomingSoon.length > 0) {
    return result("yellow", `Service scheduled within ${PM_YELLOW_THRESHOLD_DAYS} days`, null);
  }

  // ── GREEN ──
  const greenReason = daysSinceService !== null
    ? `Last serviced ${daysSinceService}d ago | ${rideDaysSinceLastPM}/${rideInterval} ride-days`
    : "Ready";
  return result("green", greenReason, null);
}

/** PM Status badge component (supports dual-trigger display) */
export function PmStatusBadge({ pmStatus, size = "md" }) {
  if (!pmStatus) return null;
  const colorMap = {
    green: { bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" },
    yellow: { bg: "bg-yellow-100", text: "text-yellow-800", dot: "bg-yellow-500" },
    red: { bg: "bg-red-100", text: "text-red-800", dot: "bg-red-500" },
  };
  const c = colorMap[pmStatus.status] || colorMap.green;
  const triggerIcon = pmStatus.trigger === "ride" ? " ⚙" : pmStatus.trigger === "time" ? " ⏱" : "";
  if (size === "sm") {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`} title={pmStatus.reason}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {pmStatus.status.toUpperCase()}{triggerIcon}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`} title={pmStatus.trigger === "ride" ? "Triggered by ride-day usage" : pmStatus.trigger === "time" ? "Triggered by time interval" : pmStatus.reason}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {pmStatus.reason}
    </span>
  );
}
