import { X } from "lucide-react";

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

export const Button = ({ children, variant = "primary", size = "md", className = "", ...props }) => {
  const base = "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-blue-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    ghost: "text-gray-600 hover:bg-gray-100 focus:ring-gray-500",
  };
  const sizes = { sm: "px-3 py-1.5 text-xs gap-1.5", md: "px-4 py-2 text-sm gap-2", lg: "px-6 py-3 text-base gap-2" };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>;
};

export const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className={`relative bg-white rounded-xl shadow-xl ${wide ? "max-w-4xl" : "max-w-2xl"} w-full max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="text-center py-14 px-4">
    <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-4"><Icon size={24} className="text-gray-400" /></div>
    <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
    <p className="text-sm text-gray-500 mt-1">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);
