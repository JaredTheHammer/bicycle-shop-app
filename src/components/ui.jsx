import { useState, useEffect, useRef, useCallback, createContext, useContext, forwardRef } from "react";
import { X, AlertTriangle, Trash2, CheckCircle, XCircle, Info } from "lucide-react";

// ─── Badge ──────────────────────────────────────────────────────────
export const Badge = ({ children, color = "blue" }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-800", green: "bg-green-100 text-green-800",
    yellow: "bg-yellow-100 text-yellow-800", red: "bg-red-100 text-red-800",
    purple: "bg-purple-100 text-purple-800", gray: "bg-gray-100 text-gray-700",
    orange: "bg-orange-100 text-orange-800", teal: "bg-teal-100 text-teal-800",
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.blue}`}>{children}</span>;
};

export const StatusBadge = ({ status }) => {
  const map = {
    completed: { color: "green", label: "Completed" }, scheduled: { color: "blue", label: "Scheduled" },
    overdue: { color: "red", label: "Overdue" }, "in-progress": { color: "yellow", label: "In Progress" },
    enrolled: { color: "green", label: "Enrolled" }, planned: { color: "blue", label: "Planned" },
    planning: { color: "yellow", label: "Planning" }, confirmed: { color: "green", label: "Confirmed" },
    excellent: { color: "green", label: "Excellent" }, good: { color: "blue", label: "Good" },
    fair: { color: "yellow", label: "Fair" }, poor: { color: "red", label: "Poor" },
  };
  const s = map[status?.toLowerCase()] || { color: "gray", label: status };
  return <Badge color={s.color}>{s.label}</Badge>;
};

// ─── Card ───────────────────────────────────────────────────────────
export const Card = ({ children, className = "", onClick }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""} ${className}`} onClick={onClick}>{children}</div>
);

export const StatCard = ({ icon: Icon, label, value, sub, color = "blue" }) => {
  const bgMap = { blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600", yellow: "bg-yellow-50 text-yellow-600", red: "bg-red-50 text-red-600", purple: "bg-purple-50 text-purple-600", orange: "bg-orange-50 text-orange-600", teal: "bg-teal-50 text-teal-600" };
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bgMap[color]}`}><Icon size={18} /></div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
        </div>
      </div>
    </Card>
  );
};

// ─── Form Controls ──────────────────────────────────────────────────
export const Input = ({ label, ...props }) => (
  <div>
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" {...props} />
  </div>
);

export const TextArea = ({ label, ...props }) => (
  <div>
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" rows={3} {...props} />
  </div>
);

export const Select = ({ label, options, ...props }) => (
  <div>
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white" {...props}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

export const Button = forwardRef(({ children, variant = "primary", size = "md", className = "", ...props }, ref) => {
  const base = "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-blue-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    ghost: "text-gray-600 hover:bg-gray-100 focus:ring-gray-500",
  };
  const sizes = { sm: "px-3 py-1.5 text-xs gap-1.5", md: "px-4 py-2 text-sm gap-2", lg: "px-6 py-3 text-base gap-2" };
  return <button ref={ref} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>;
});

// ─── Modal (with ESC close + focus trap + mobile viewport) ──────────
export const Modal = ({ open, onClose, title, children, wide }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      // Focus trap: Tab cycles within modal
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handleKey);
    // Auto-focus first focusable element
    requestAnimationFrame(() => {
      const first = dialogRef.current?.querySelector('button, [href], input, select, textarea');
      if (first && first !== document.activeElement) first.focus();
    });
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handleKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" />
      <div ref={dialogRef} className={`relative bg-white shadow-xl ${wide ? "max-w-4xl" : "max-w-2xl"} w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-xl`} onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 rounded-t-xl flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100" aria-label="Close"><X size={20} /></button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
};

// ─── EmptyState ─────────────────────────────────────────────────────
export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="text-center py-14 px-4">
    <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-4"><Icon size={24} className="text-gray-400" /></div>
    <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
    <p className="text-sm text-gray-500 mt-1">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// ─── Confirm Dialog ─────────────────────────────────────────────────
// Replaces browser confirm() with a styled, accessible dialog.
// Usage: const confirm = useConfirm(); await confirm("Delete?", { variant: "danger" });
const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ message, ...opts });
    });
  }, []);

  const handleClose = (result) => {
    setState(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && <ConfirmDialog {...state} onConfirm={() => handleClose(true)} onCancel={() => handleClose(false)} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}

function ConfirmDialog({ message, title, variant = "danger", confirmLabel, cancelLabel, onConfirm, onCancel }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handleKey);
    requestAnimationFrame(() => confirmRef.current?.focus());
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handleKey); document.body.style.overflow = ""; };
  }, [onCancel]);

  const icons = { danger: <Trash2 size={22} className="text-red-600" />, warning: <AlertTriangle size={22} className="text-amber-500" />, info: <Info size={22} className="text-blue-600" /> };
  const iconBgs = { danger: "bg-red-50", warning: "bg-amber-50", info: "bg-blue-50" };
  const btnVariant = variant === "danger" ? "danger" : "primary";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onCancel} role="alertdialog" aria-modal="true" aria-label={title || "Confirmation"}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-white shadow-xl max-w-md w-full rounded-t-xl sm:rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex gap-4">
            <div className={`shrink-0 w-10 h-10 rounded-full ${iconBgs[variant]} flex items-center justify-center`}>
              {icons[variant]}
            </div>
            <div className="flex-1 min-w-0">
              {title && <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>}
              <p className="text-sm text-gray-600 whitespace-pre-line">{message}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
          <Button variant="secondary" size="sm" onClick={onCancel}>{cancelLabel || "Cancel"}</Button>
          <Button ref={confirmRef} variant={btnVariant} size="sm" onClick={onConfirm}>{confirmLabel || (variant === "danger" ? "Delete" : "Confirm")}</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Toast Notifications ────────────────────────────────────────────
// Usage: const toast = useToast(); toast.success("Saved!"); toast.error("Failed");
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const addToast = useCallback((message, type = "success", duration = 3000) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    return id;
  }, []);

  // Stable API ref so consumers don't re-render when toasts change
  const apiRef = useRef(null);
  if (!apiRef.current) {
    apiRef.current = {
      success: (msg, dur) => addToast(msg, "success", dur),
      error: (msg, dur) => addToast(msg, "error", dur ?? 5000),
      info: (msg, dur) => addToast(msg, "info", dur),
      warning: (msg, dur) => addToast(msg, "warning", dur ?? 4000),
    };
  }
  const toastApi = apiRef.current;

  const dismiss = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  return (
    <ToastContext.Provider value={toastApi}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 max-w-sm w-full pointer-events-none" aria-live="polite">
      {toasts.map(t => (
        <Toast key={t.id} {...t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function Toast({ message, type, onDismiss }) {
  const config = {
    success: { icon: <CheckCircle size={18} />, bg: "bg-green-50 border-green-200", text: "text-green-800", iconColor: "text-green-500" },
    error: { icon: <XCircle size={18} />, bg: "bg-red-50 border-red-200", text: "text-red-800", iconColor: "text-red-500" },
    info: { icon: <Info size={18} />, bg: "bg-blue-50 border-blue-200", text: "text-blue-800", iconColor: "text-blue-500" },
    warning: { icon: <AlertTriangle size={18} />, bg: "bg-amber-50 border-amber-200", text: "text-amber-800", iconColor: "text-amber-500" },
  };
  const c = config[type] || config.info;
  return (
    <div className={`pointer-events-auto ${c.bg} border rounded-lg shadow-lg px-4 py-3 flex items-start gap-3 animate-slide-in`}>
      <span className={`shrink-0 mt-0.5 ${c.iconColor}`}>{c.icon}</span>
      <p className={`text-sm font-medium flex-1 ${c.text}`}>{message}</p>
      <button onClick={onDismiss} className={`shrink-0 p-0.5 rounded hover:bg-black/5 ${c.text}`} aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Loading Skeleton ───────────────────────────────────────────────
export const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

export const LoadingSkeleton = () => (
  <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
    {/* Stat cards skeleton */}
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
    {/* Content skeleton */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      <Skeleton className="h-6 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-3">
      <Skeleton className="h-5 w-36" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  </div>
);
