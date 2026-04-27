// src/pages/BulkImport.tsx
import { useState, useRef, useCallback } from "react";
import {
  Upload, CheckCircle2, AlertCircle, Trash2,
  ArrowRight, Download, FileSpreadsheet, GraduationCap,
  X, Info,
} from "lucide-react";
import * as Papa from "papaparse";
import * as XLSX from "xlsx";
import { toast, Toaster } from "react-hot-toast";
import { apiPost } from "../utils/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_LIMIT   = 1000;
const PREVIEW_LIMIT = 50;

const TEMPLATE_HEADERS = [
  "Full Name", "Phone Number", "Email", "City", "Course", "Source", "Status",
];
const TEMPLATE_SAMPLE =
  "Anil Kumar,9847000101,anil@test.com,Calicut,MERN Stack,WhatsApp,New";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProcessedRow {
  full_name: string;
  phone: string;
  email: string;
  city: string;
  interested_course: string;
  lead_source: string;
  lead_status: string;
  isValid: boolean;
  errors: string[];
}

interface ImportStats {
  total: number;
  valid: number;
  invalid: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeRow(row: Record<string, any>): ProcessedRow {
  const fullName = String(
    row["Full Name"] || row.full_name || row.Name ||
    row.STUDENT_NAME || row.student_name || ""
  ).trim();

  const phoneRaw = String(row["Phone Number"] || row.phone || row.mobile || "").trim();
  const phone    = phoneRaw.replace(/[^0-9+]/g, "");

  const normalized: ProcessedRow = {
    full_name:         fullName,
    phone,
    email:             String(row.Email            || row.email            || "").trim(),
    city:              String(row.City             || row.city             || "").trim(),
    interested_course: String(row.Course           || row.interested_course || "Inquiry").trim(),
    lead_source:       String(row.Source           || row.lead_source      || "Excel Import").trim(),
    lead_status:       String(row.Status           || "New").trim(),
    isValid: true,
    errors: [],
  };

  if (!normalized.full_name || normalized.full_name.length < 2) {
    normalized.errors.push("Name too short");
  }
  if (!phone || phone.length < 10) {
    normalized.errors.push("Invalid phone");
  }

  normalized.isValid = normalized.errors.length === 0;
  return normalized;
}

function deduplicateByPhone(rows: ProcessedRow[]): ProcessedRow[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    if (!row.phone || row.phone.length < 10) return row;
    if (seen.has(row.phone)) {
      return { ...row, isValid: false, errors: [...row.errors, "Duplicate phone"] };
    }
    seen.add(row.phone);
    return row;
  });
}

function computeStats(rows: ProcessedRow[]): ImportStats {
  const valid = rows.filter((r) => r.isValid).length;
  return { total: rows.length, valid, invalid: rows.length - valid };
}

function downloadTemplate() {
  const csv  = [TEMPLATE_HEADERS.join(","), TEMPLATE_SAMPLE].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: "leads_template.csv" });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success("Template downloaded");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatRow({ label, value, color = "text-gray-900 dark:text-white" }: {
  label: string; value: number; color?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] font-black uppercase text-gray-400">{label}</span>
      <span className={`text-lg font-black ${color}`}>{value}</span>
    </div>
  );
}

function ValidCell({ row }: { row: ProcessedRow }) {
  if (row.errors.includes("Duplicate phone")) {
    return (
      <span className="inline-block text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded text-[9px] font-black uppercase">
        Dup
      </span>
    );
  }
  return row.isValid
    ? <CheckCircle2 className="text-emerald-500 mx-auto" size={15} />
    : <AlertCircle  className="text-red-500 mx-auto"     size={15} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BulkImport() {
  const [fileData,    setFileData]    = useState<ProcessedRow[]>([]);
  const [fileName,    setFileName]    = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [stats,       setStats]       = useState<ImportStats>({ total: 0, valid: 0, invalid: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef   = useRef<HTMLDivElement>(null);

  // ── Processing ─────────────────────────────────────────────────────────────

  const processRawData = useCallback((data: Record<string, any>[]) => {
    if (data.length > BATCH_LIMIT) {
      toast.error(`Limit exceeded: max ${BATCH_LIMIT} rows per batch (found ${data.length})`, { duration: 5000 });
      return;
    }

    const processed  = data.map(normalizeRow);
    const deduped    = deduplicateByPhone(processed);
    const newStats   = computeStats(deduped);

    setFileData(deduped);
    setStats(newStats);

    if (deduped.length > 0) {
      toast.success(`${deduped.length} rows parsed`);
      setTimeout(() => previewRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    }
  }, []);

  // ── File upload ────────────────────────────────────────────────────────────

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const ext     = file.name.split(".").pop()?.toLowerCase();
    const toastId = toast.loading(`Reading ${file.name}…`);

    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processRawData(results.data as Record<string, any>[]);
          toast.dismiss(toastId);
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const wb      = XLSX.read(evt.target?.result, { type: "binary" });
        const ws      = wb.Sheets[wb.SheetNames[0]];
        const raw     = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
        const headers = raw[0] as string[];
        const rows    = (raw.slice(1) as any[][]).map((rowArr) => {
          const row: Record<string, string> = {};
          headers.forEach((h, i) => { row[h] = String(rowArr[i] ?? "").trim(); });
          return row;
        });
        processRawData(rows);
        toast.dismiss(toastId);
      };
      reader.readAsBinaryString(file);
    } else {
      toast.error("Unsupported format — use .csv, .xlsx or .xls");
      toast.dismiss(toastId);
    }

    // Reset so same file can be re-uploaded if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDiscard = () => {
    if (fileData.length === 0) return;
    if (!window.confirm(`Discard all ${fileData.length} rows?`)) return;
    setFileData([]);
    setFileName("");
    setStats({ total: 0, valid: 0, invalid: 0 });
    toast.success("File discarded");
  };

  // ── Import ─────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    const validLeads = fileData.filter((r) => r.isValid);
    if (validLeads.length === 0) {
      toast.error("No valid leads to import");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Checking duplicates…");

    try {
      const payload = validLeads.map(({ full_name, phone, email, city, interested_course, lead_source, lead_status }) => ({
        full_name, phone, email, city, interested_course, lead_source, lead_status,
      }));

      const result = await apiPost("/api/leads/bulk", { leads: payload });

      if (result.duplicates > 0) {
        const proceed = window.confirm(
          `${result.duplicates} lead(s) already exist in CRM.\n\n` +
          `Click OK to skip duplicates and import ${result.inserted} new leads.\n` +
          `Click Cancel to abort.`
        );
        if (!proceed) {
          toast.dismiss(toastId);
          toast("Import cancelled");
          return;
        }
      }

      toast.success(`${result.inserted} lead(s) imported successfully`, { id: toastId, duration: 4000 });
      setFileData([]);
      setFileName("");
      setStats({ total: 0, valid: 0, invalid: 0 });
    } catch (err: any) {
      console.error("Bulk import failed:", err);
      toast.error(`Import failed: ${err?.message ?? "Unknown error"}`, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      <Toaster position="top-right" />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
              <FileSpreadsheet size={16} className="text-white" />
            </span>
            Bulk Import
          </h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">
            Lead Injection Engine
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm transition-all"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Download Template</span>
            <span className="sm:hidden">Template</span>
          </button>

          {fileData.length > 0 && (
            <button
              type="button"
              onClick={handleDiscard}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/20 shadow-sm transition-all"
            >
              <Trash2 size={13} /> Discard
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════
          DROP ZONE (no file loaded)
      ══════════════════════════════ */}
      {fileData.length === 0 && (
        <div ref={previewRef}>
          <label className="block bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl cursor-pointer hover:bg-blue-50/30 dark:hover:bg-blue-900/10 hover:border-blue-300 transition-all group">
            <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl group-hover:scale-105 transition-transform">
                <Upload size={32} className="text-gray-300" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  Drop Excel or CSV here
                </p>
                <p className="text-[11px] text-gray-400 mt-1">Supports .csv, .xlsx, .xls</p>
              </div>
              <ul className="text-[10px] text-gray-400 space-y-1 text-left">
                <li>· Optimised for up to <strong>200 leads</strong> per batch</li>
                <li>· Leads default to <strong>"New"</strong> status</li>
                <li>· Invalid rows are skipped automatically</li>
              </ul>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".csv,.xlsx,.xls"
              onChange={handleUpload}
            />
          </label>
        </div>
      )}

      {/* ══════════════════════════════
          PREVIEW + CONTROLS
      ══════════════════════════════ */}
      {fileData.length > 0 && (
        <div ref={previewRef} className="grid grid-cols-1 lg:grid-cols-4 gap-5">

          {/* ── Preview table ── */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden order-2 lg:order-1">

            {/* Table header bar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  Preview · {stats.total} rows
                </span>
                {fileName && (
                  <span className="text-[9px] font-bold text-gray-400 truncate max-w-[120px] sm:max-w-xs">
                    ({fileName})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleDiscard}
                className="flex items-center gap-1 text-[10px] font-black text-red-500 hover:text-red-700 transition-colors"
                aria-label="Discard file"
              >
                <X size={13} /> Clear
              </button>
            </div>

            {/* Scrollable table */}
            <div className="overflow-x-auto max-h-[55vh]">
              <table className="w-full text-left text-[11px] min-w-[640px]">
                <thead className="bg-white dark:bg-gray-900 sticky top-0 border-b border-gray-100 dark:border-gray-800 z-10">
                  <tr>
                    {["Name", "Phone", "Email", "City", "Course", "Source", "Status", "Valid"].map((h) => (
                      <th key={h} className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {fileData.slice(0, PREVIEW_LIMIT).map((row, idx) => (
                    <tr
                      key={idx}
                      className={
                        row.isValid
                          ? "hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-colors"
                          : "bg-red-50/40 dark:bg-red-900/10 hover:bg-red-50/60 transition-colors"
                      }
                    >
                      <td className="px-4 py-2.5 font-bold text-gray-800 dark:text-gray-200 text-center whitespace-nowrap">
                        {row.full_name || <span className="text-red-400">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 text-center tabular-nums">
                        {row.phone || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-center max-w-[120px] truncate">
                        {row.email || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 text-center">
                        {row.city || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-blue-600 font-black text-center whitespace-nowrap">
                        {row.interested_course}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-center">
                        {row.lead_source}
                      </td>
                      <td className="px-4 py-2.5 font-black text-gray-700 dark:text-gray-300 text-center">
                        {row.lead_status}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <ValidCell row={row} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {fileData.length > PREVIEW_LIMIT && (
              <p className="text-center py-2.5 text-[10px] text-gray-400 font-black uppercase border-t border-gray-50 dark:border-gray-800">
                Showing first {PREVIEW_LIMIT} of {fileData.length} rows
              </p>
            )}
          </div>

          {/* ── Control sidebar ── */}
          <div className="lg:col-span-1 space-y-4 order-1 lg:order-2">

            {/* Stats + import button */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-3">
                Import Summary
              </p>

              <div className="space-y-3">
                <StatRow label="Total Records"   value={stats.total}   />
                <StatRow label="Ready to Sync"   value={stats.valid}   color="text-emerald-600" />
                <StatRow label="With Issues"      value={stats.invalid} color="text-amber-500"   />
              </div>

              {/* Progress bar */}
              {stats.total > 0 && (
                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(stats.valid / stats.total) * 100}%` }}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={stats.valid === 0 || isUploading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  {isUploading ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</>
                  ) : (
                    <>Import <ArrowRight size={13} /></>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDiscard}
                  aria-label="Discard"
                  className="px-3 py-3 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Notes card */}
            <div className="bg-gray-900 dark:bg-gray-800 p-5 rounded-3xl text-white shadow-sm">
              <div className="flex items-center gap-2.5 mb-3">
                <GraduationCap size={16} className="text-blue-400 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest">Notes</span>
              </div>
              <ul className="text-[10px] text-gray-300 space-y-1.5">
                <li>· All leads default to <strong className="text-white">New</strong> status</li>
                <li>· Leads appear latest-first by <strong className="text-white">created_at</strong></li>
                <li>· Duplicate phones are flagged and skipped</li>
                <li>· Invalid rows are never imported</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}