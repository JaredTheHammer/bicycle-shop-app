import { useState } from "react";
import { QrCode, Printer, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Modal, Button } from "./ui.jsx";

export const QR_PREFIX = "LES://";
export function assetQRValue(type, id) { return `${QR_PREFIX}${type}/${id}`; }

/** Single QR label card for printing or inline display */
export function QRLabel({ value, title, subtitle, size = 128 }) {
  return (
    <div className="inline-flex flex-col items-center p-3 border border-gray-200 rounded-lg bg-white qr-label" style={{ pageBreakInside: "avoid" }}>
      <QRCodeSVG value={value} size={size} level="M" includeMargin={false} />
      <p className="text-xs font-bold text-gray-900 mt-2 text-center leading-tight">{title}</p>
      {subtitle && <p className="text-[10px] text-gray-500 text-center leading-tight">{subtitle}</p>}
      <p className="text-[9px] text-gray-400 font-mono mt-0.5">{value}</p>
    </div>
  );
}

/** Modal with QR code + print/download actions */
export function QRModal({ open, onClose, value, title, subtitle }) {
  const svgRef = useRef(null);

  function handlePrint() {
    const svgEl = svgRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const win = window.open("", "_blank", "width=400,height=500");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>QR Label - ${title}</title>
      <style>body{font-family:system-ui,sans-serif;text-align:center;padding:20px}
      .title{font-size:16px;font-weight:700;margin:12px 0 4px}.sub{font-size:12px;color:#666}
      .code{font-size:10px;color:#999;font-family:monospace;margin-top:4px}
      @media print{body{padding:0}}</style></head>
      <body>${svgData}
      <div class="title">${title}</div>
      ${subtitle ? `<div class="sub">${subtitle}</div>` : ""}
      <div class="code">${value}</div>
      <script>window.print();window.onafterprint=()=>window.close();<\/script>
      </body></html>`);
    win.document.close();
  }

  function handleDownloadSVG() {
    const svgEl = svgRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `qr-${title.replace(/\s+/g, "-").toLowerCase()}.svg`;
    a.click(); URL.revokeObjectURL(url);
  }

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="QR Code Label">
      <div className="flex flex-col items-center gap-4 py-4">
        <div ref={svgRef}>
          <QRCodeSVG value={value} size={200} level="M" includeMargin />
        </div>
        <div className="text-center">
          <p className="font-bold text-gray-900">{title}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          <p className="text-xs text-gray-400 font-mono mt-1">{value}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handlePrint}><Printer size={16} /> Print Label</Button>
          <Button variant="secondary" onClick={handleDownloadSVG}><Download size={16} /> Download SVG</Button>
        </div>
      </div>
    </Modal>
  );
}

/** Bulk QR print page for fleet or tool inventory */
export function BulkQRPrintButton({ items, type, getTitle, getSubtitle }) {
  function handleBulkPrint() {
    const labels = items.map(item => {
      const val = assetQRValue(type, item.id);
      return `<div style="display:inline-block;text-align:center;padding:12px;margin:8px;border:1px solid #ddd;border-radius:8px;page-break-inside:avoid">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(val)}" width="120" height="120" />
        <div style="font-size:11px;font-weight:700;margin-top:6px">${getTitle(item)}</div>
        ${getSubtitle ? `<div style="font-size:9px;color:#666">${getSubtitle(item)}</div>` : ""}
        <div style="font-size:8px;color:#999;font-family:monospace;margin-top:2px">${val}</div>
      </div>`;
    }).join("");
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>QR Labels - ${type}</title>
      <style>body{font-family:system-ui,sans-serif;padding:20px;display:flex;flex-wrap:wrap;justify-content:center}
      @media print{body{padding:0}}</style></head>
      <body>${labels}
      <script>window.onload=()=>{setTimeout(()=>window.print(),500)}<\/script>
      </body></html>`);
    win.document.close();
  }

  return (
    <Button variant="secondary" onClick={handleBulkPrint}>
      <QrCode size={16} /> Print All QR Labels
    </Button>
  );
}

