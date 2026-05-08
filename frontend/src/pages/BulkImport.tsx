import { useState, useRef, useCallback } from "react";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ArrowRight,
  Download,
  FileSpreadsheet,
  Zap,
} from "lucide-react";

import * as Papa from "papaparse";
import * as XLSX from "xlsx";
import { toast, Toaster } from "react-hot-toast";
import { apiPost } from "../utils/api";

// ─── Constants ────────────────────────────────────────────────────────────────
const BATCH_LIMIT = 1000;
const PREVIEW_LIMIT = 50;

const TEMPLATE_HEADERS = [
  "Full Name", "Phone Number", "Email", "City", "Course", "Country", "Source",
];
const TEMPLATE_SAMPLE =
  "Anil Kumar,9847000101,anil@test.com,Calicut,MERN Stack,UK,WhatsApp";
  const REQUIRED_COLS = ["full_name", "phone", "country", "interested_course"];

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProcessedRow {
  full_name: string;
  phone: string;
  email: string;
  city: string;
  interested_course: string;
  country: string; // Added for Study Abroad Engine
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
  const phone = phoneRaw.replace(/[^0-9+]/g, "");

  const normalized: ProcessedRow = {
    full_name: fullName,
    phone,
    email: String(row.Email || row.email || "").trim(),
    city: String(row.City || row.city || "").trim(),
    interested_course: String(row.Course || row.interested_course || "Inquiry").trim(),
    country: String(row.Country || row.country || "India").trim(), // Defaulting to India
    lead_source: String(row.Source || row.lead_source || "Excel Import").trim(),
    lead_status: "New",
    isValid: true,
    errors: [],
  };

  if (!normalized.full_name || normalized.full_name.length < 2) normalized.errors.push("Name too short");
  if (!phone || phone.length < 10) normalized.errors.push("Invalid phone");

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
  const csv = [TEMPLATE_HEADERS.join(","), TEMPLATE_SAMPLE].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: "leads_template.csv" });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success("Template downloaded");
}

function StatRow({ label, value, color = "text-gray-900 dark:text-white" }: { label: string; value: number; color?: string; }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] font-black uppercase text-gray-400">{label}</span>
      <span className={`text-lg font-black ${color}`}>{value}</span>
    </div>
  );
}

function ValidCell({ row }: { row: ProcessedRow }) {
  if (row.errors.includes("Duplicate phone")) {
    return <span className="inline-block text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded text-[9px] font-black uppercase">Dup</span>;
  }
  return row.isValid ? <CheckCircle2 className="text-emerald-500 mx-auto" size={15} /> : <AlertCircle className="text-red-500 mx-auto" size={15} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BulkImport() {
  const [fileData, setFileData] = useState<ProcessedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [autoDistribute, setAutoDistribute] = useState(true);
  const [stats, setStats] = useState<ImportStats>({ total: 0, valid: 0, invalid: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const processRawData = useCallback((data: Record<string, any>[]) => {
    if (data.length > BATCH_LIMIT) {
      toast.error(`Limit exceeded: max ${BATCH_LIMIT} rows per batch`, { duration: 5000 });
      return;
    }
    const processed = data.map(normalizeRow);
    const deduped = deduplicateByPhone(processed);
    const newStats = computeStats(deduped);
    setFileData(deduped);
    setStats(newStats);
    if (deduped.length > 0) {
      toast.success(`${deduped.length} rows parsed`);
      setTimeout(() => previewRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    }
  }, []);

const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setFileName(file.name);
  const ext = file.name.split(".").pop()?.toLowerCase();
  const toastId = toast.loading(`Analyzing ${file.name}...`);

  // Helper to validate columns and prevent system crash
  const validateAndProcess = (data: Record<string, any>[]) => {
    if (data.length === 0) {
      toast.error("The selected file is empty", { id: toastId });
      return;
    }

    const headers = Object.keys(data[0]);
    const missing = REQUIRED_COLS.filter(col => !headers.includes(col));

    if (missing.length > 0) {
      toast.error(`Import Blocked: Missing columns [${missing.join(", ")}]`, { 
        id: toastId, 
        duration: 5000 
      });
      setFileName("");
      return;
    }

    processRawData(data); // Only proceed if headers are perfect
    toast.success("File verified. Ready to import.", { id: toastId });
  };

  if (ext === "csv") {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        validateAndProcess(results.data as Record<string, any>[]);
      }
    });
  } else if (ext === "xlsx" || ext === "xls") {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
      
      const headers = (raw[0] as string[]).map(h => String(h).trim());
      const rows = (raw.slice(1) as any[][]).map((rowArr) => {
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = String(rowArr[i] ?? "").trim(); });
        return row;
      });

      validateAndProcess(rows);
    };
    reader.readAsBinaryString(file);
  } else {
    toast.error("Unsupported format", { id: toastId });
  }

  if (fileInputRef.current) fileInputRef.current.value = "";
};

  const handleImport = async () => {
  const validLeads = fileData.filter((r) => r.isValid);
  if (validLeads.length === 0) return toast.error("No valid leads found in file");

  setIsUploading(true);
  const toastId = toast.loading(autoDistribute ? "Engine firing... Assigning leads" : "Injecting leads to database...");

  try {
    const payload = validLeads.map(({ full_name, phone, email, city, interested_course, country, lead_source, lead_status }) => ({
      full_name, phone, email, city, interested_course, country, lead_source, lead_status,
    }));

    // Path must match your backend router registration
    const result = await apiPost("/api/leads/bulk", { 
      leads: payload, 
      autoDistribute: autoDistribute 
    });

    const inserted = result?.inserted || 0;
    const assigned = result?.assigned || 0;
    const duplicates = result?.duplicates || 0;
    const unassignedCount = inserted - assigned;

    // 1. Alert about Duplicates
    if (duplicates > 0) {
      toast(`${duplicates} duplicates found and skipped`, { icon: '⚠️' });
    }

    // 2. Build Intelligent Success Message
    let successMsg = "";
    if (autoDistribute) {
      successMsg = `Imported: ${inserted} | Assigned: ${assigned}`;
      
      if (unassignedCount > 0) {
        // ALERT: This is where we catch the Label Mismatch
        successMsg += ` | Unassigned: ${unassignedCount}`;
        toast.error(`${unassignedCount} leads had no matching counselor rules.`, { 
          duration: 7000, 
          icon: 'ℹ️' 
        });
      }
    } else {
      successMsg = `Successfully imported ${inserted} unassigned leads.`;
    }

    toast.success(successMsg, { id: toastId, duration: 6000 });

    // Reset UI State
    setFileData([]);
    setFileName("");
    setStats({ total: 0, valid: 0, invalid: 0 });

  } catch (err: any) {
    console.error("Import Error:", err);
    toast.error(err?.message || "Import failed - Check server logs", { id: toastId });
  } finally {
    setIsUploading(false);
  }
};
  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
              <FileSpreadsheet size={16} className="text-white" />
            </span>
            Bulk Import
          </h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Lead Injection Engine</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 shadow-sm transition-all">
            <Download size={13} /> <span className="hidden sm:inline">Download Template</span>
          </button>
          {fileData.length > 0 && (
            <button type="button" onClick={() => { if(window.confirm("Discard?")) { setFileData([]); setFileName(""); setStats({ total: 0, valid: 0, invalid: 0 }); }}} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border border-red-200 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all">
              <Trash2 size={13} /> Discard
            </button>
          )}
        </div>
      </div>

      {/* Main UI */}
      {fileData.length === 0 ? (
        <label className="block bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl cursor-pointer hover:bg-blue-50/30 transition-all group py-16 text-center">
          <Upload size={32} className="mx-auto text-gray-300 mb-3 group-hover:scale-105 transition-transform" />
          <p className="text-sm font-black uppercase tracking-widest text-gray-500">Drop CSV or Excel</p>
          <input ref={fileInputRef} type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleUpload} />
        </label>
      ) : (
        <div ref={previewRef} className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden order-2 lg:order-1">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Preview · {stats.total} rows</span>
            </div>
            <div className="overflow-x-auto max-h-[55vh]">
              <table className="w-full text-left text-[11px] min-w-[700px]">
                <thead className="bg-white dark:bg-gray-900 sticky top-0 border-b border-gray-100 dark:border-gray-800">
                  <tr>{["Name", "Phone", "Email", "Course", "Country", "Valid"].map(h => <th key={h} className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {fileData.slice(0, PREVIEW_LIMIT).map((row, idx) => (
                    <tr key={idx} className={row.isValid ? "hover:bg-blue-50/20 transition-colors" : "bg-red-50/40"}>
                      <td className="px-4 py-2.5 font-bold text-gray-800 dark:text-gray-200 text-center">{row.full_name}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 text-center">{row.phone}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-center truncate max-w-[120px]">{row.email}</td>
                      <td className="px-4 py-2.5 text-blue-600 font-black text-center">{row.interested_course}</td>
                      <td className="px-4 py-2.5 text-emerald-600 font-black text-center">{row.country}</td>
                      <td className="px-4 py-2.5 text-center"><ValidCell row={row} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-4 order-1 lg:order-2">
            {/* Auto Distribute Toggle */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600"><Zap size={14} fill="currentColor" /></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Auto Distribute</span>
                </div>
                <button onClick={() => setAutoDistribute(!autoDistribute)} className={`w-10 h-5 rounded-full relative transition-all ${autoDistribute ? 'bg-blue-600 shadow-md shadow-blue-600/20' : 'bg-gray-200 dark:bg-gray-800'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${autoDistribute ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <p className="text-[9px] text-gray-400 font-medium leading-tight">Run distribution engine on import.</p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-3">Import Summary</p>
              <div className="space-y-3">
                <StatRow label="Total Records" value={stats.total} />
                <StatRow label="Valid Leads" value={stats.valid} color="text-emerald-600" />
                <StatRow label="With Issues" value={stats.invalid} color="text-amber-500" />
              </div>
              <button onClick={handleImport} disabled={stats.valid === 0 || isUploading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all">
                {isUploading ? <><Loader /> Processing...</> : <>Import Leads <ArrowRight size={13} /></>}
              </button>
            </div>
            
            <div className="bg-gray-900 p-5 rounded-3xl text-white shadow-sm space-y-3">
              ShieldCheck 
              <ul className="text-[9px] text-gray-400 space-y-1.5">
                <li>· High priority on <strong className="text-white">Nation Matches</strong></li>
                <li>· Secondary priority on <strong className="text-white">Course Matches</strong></li>
                <li>· Defaulting to <strong className="text-white">Round Robin</strong> fallback</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Loader() { return <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />; }
