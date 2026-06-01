import React, { useState, useRef, useCallback } from "react";
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
import { apiPost } from "../../utils/api";

// 🎯 SWAPPED: Wiped direct react-hot-toast out for your centralized hook framework engine
import { useToast } from "../../hooks/useToast";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const BATCH_LIMIT = 1000;
const PREVIEW_LIMIT = 50;

const TEMPLATE_HEADERS = [
  "Full Name", "Phone Number", "Email", "City", "Course", "Country", "Source",
];
const TEMPLATE_SAMPLE =
  "Anil Kumar,9847000101,anil@test.com,Calicut,MERN Stack,UK,WhatsApp";
const REQUIRED_COLS = ["full_name", "phone", "country", "interested_course"];

const HEADER_MAP = {
  "full name": "full_name",
  "name": "full_name",
  "phone number": "phone",
  "phone": "phone",
  "phone nu": "phone",
  "email": "email",
  "city": "city",
  "course": "interested_course",
  "interested course": "interested_course",
  "country": "country",
  "source": "source"
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function normalizeRow(row) {
  const fullName = String(
    row["Full Name"] || row.full_name || row.Name ||
    row.STUDENT_NAME || row.student_name || ""
  ).trim();

  const phoneRaw = String(row["Phone Number"] || row.phone || row.mobile || "").trim();
  const phone = phoneRaw.replace(/[^0-9+]/g, "");

  const normalized = {
    full_name: fullName,
    phone,
    email: String(row.Email || row.email || "").trim(),
    city: String(row.City || row.city || "").trim(),
    interested_course: String(row.Course || row.interested_course || "Inquiry").trim(),
    country: String(row.Country || row.country || "India").trim(),
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

function deduplicateByPhone(rows) {
  const seen = new Set();
  return rows.map((row) => {
    if (!row.phone || row.phone.length < 10) return row;
    if (seen.has(row.phone)) {
      return { ...row, isValid: false, errors: [...row.errors, "Duplicate phone"] };
    }
    seen.add(row.phone);
    return row;
  });
}

function computeStats(rows) {
  const valid = rows.filter((r) => r.isValid).length;
  return { total: rows.length, valid, invalid: rows.length - valid };
}

function StatRow({ label, value, color = "text-slate-900 dark:text-white" }) {
  return (
    <div className="flex justify-between items-center text-xs font-semibold">
      <span className="text-[10px] font-bold uppercase text-slate-400">{label}</span>
      <span className={`text-sm font-black ${color}`}>{value}</span>
    </div>
  );
}

// ─── INTEGRATED SUB-COMPONENT EXPORT ──────────────────────────────────────────
export default function BulkImport({ onImportSuccess, isEmbedded = true }) {
  // 🎯 CONNECT HOOK PRIVILEGES
  const { addToast } = useToast();

  const [fileData, setFileData] = useState([]);
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [autoDistribute, setAutoDistribute] = useState(true);
  const [stats, setStats] = useState({ total: 0, valid: 0, invalid: 0 });

  const fileInputRef = useRef(null);
  const previewRef = useRef(null);

  const downloadTemplate = () => {
    const csv = [TEMPLATE_HEADERS.join(","), TEMPLATE_SAMPLE].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: "leads_template.csv" });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast("Sample import structure template downloaded successfully", "success");
  };

  const processRawData = useCallback((data) => {
    if (data.length > BATCH_LIMIT) {
      addToast(`Upload boundary overflow: Max baseline set at ${BATCH_LIMIT} rows per operation`, "error");
      return;
    }
    const processed = data.map(normalizeRow);
    const deduped = deduplicateByPhone(processed);
    const newStats = computeStats(deduped);
    setFileData(deduped);
    setStats(newStats);
    if (deduped.length > 0) {
      addToast(`Parsed ${deduped.length} record coordinates successfully. Run review panel verification checks.`, "success");
      setTimeout(() => previewRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    }
  }, [addToast]);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();
    addToast(`Analyzing document parameters for ${file.name}...`, "info");

    const validateAndProcess = (rawData) => {
      if (rawData.length === 0) {
        addToast("The selected sheet document data registry is empty", "error");
        setFileName("");
        return;
      }

      const processedData = rawData.map(row => {
        const normalizedRow = {};
        Object.keys(row).forEach(key => {
          const cleanKey = key.trim().toLowerCase();
          const mappedKey = HEADER_MAP[cleanKey];
          
          if (mappedKey) {
            normalizedRow[mappedKey] = row[key];
          } else {
            normalizedRow[cleanKey.replace(/\s+/g, '_')] = row[key];
          }
        });
        return normalizedRow;
      });

      const headers = Object.keys(processedData[0]);
      const missing = REQUIRED_COLS.filter(col => !headers.includes(col));

      if (missing.length > 0) {
        addToast(`Import Aborted: Missing structural schema keys [${missing.join(", ")}]`, "error");
        setFileName("");
        return;
      }

      processRawData(processedData);
    };

    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          validateAndProcess(results.data);
        }
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        const rows = XLSX.utils.sheet_to_json(sheet);
        validateAndProcess(rows);
      };
      reader.readAsBinaryString(file);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = async () => {
    const validLeads = fileData.filter((r) => r.isValid);
    if (validLeads.length === 0) return addToast("No valid lead tracking shapes found to process", "error");

    setIsUploading(true);
    addToast(autoDistribute ? "Distribution loops firing... Mapping row attributions" : "Committing data sheets to system index registry...", "info");

    try {
      const payload = validLeads.map((l) => ({
        full_name: l.full_name,
        phone: l.phone,
        email: l.email,
        city: l.city,
        interested_course: l.interested_course,
        country: l.country,
        lead_source: l.lead_source,
        lead_status: l.lead_status,
      }));

      // 🎯 FIXED EXPLICIT PATH: Remapped to point straight to your dedicated '/api/leads/bulk-import' pipeline route
      const result = await apiPost("/api/leads/bulk-import", { 
        leads: payload, 
        autoDistribute: autoDistribute 
      });

      const inserted = result?.inserted || 0;
      const assigned = result?.assigned || 0;
      const duplicates = result?.duplicates || 0;
      const unassignedCount = inserted - assigned;

      if (duplicates > 0) {
        addToast(`Skipped ${duplicates} redundant match duplicates found during parsing`, "info");
      }

      let successMsg = "";
      if (autoDistribute) {
        successMsg = `Successfully integrated ${inserted} entries · Allocation rules mapped ${assigned} profiles cleanly.`;
        
        if (unassignedCount > 0) {
          addToast(`${unassignedCount} records had no active counselor rule matches. Added as unassigned pipeline leads.`, "info");
        }
      } else {
        successMsg = `Successfully loaded ${inserted} unassigned tracking profiles into general bucket workspace.`;
      }

      addToast(successMsg, "success");

      if (onImportSuccess) {
        onImportSuccess(stats);
      }

      setFileData([]);
      setFileName("");
      setStats({ total: 0, valid: 0, invalid: 0 });

    } catch (err) {
      console.error("Import Error Failure:", err);
      addToast(err?.message || "Bulk ledger integration transaction failed", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const renderValidCell = (row) => {
    if (row.errors.includes("Duplicate phone")) {
      return <span className="inline-block text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">Dup</span>;
    }
    return row.isValid ? <CheckCircle2 className="text-emerald-500 mx-auto" size={15} /> : <AlertCircle className="text-rose-500 mx-auto" size={15} />;
  };

  return (
    <div className="w-full space-y-5">
      {/* 🎯 REMOVED stand-alone `<Toaster/>` element node to maintain unified overlay tracking layout styles */}

      {/* ─── TITLE & ROW BUTTON CONTROLS BLOCK ─── */}
      {!isEmbedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 select-none">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
                <FileSpreadsheet size={16} className="text-white" />
              </span>
              Bulk Import Center
            </h1>
            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1">Lead Injection Engine</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition-all cursor-pointer">
              <Download size={13} /> <span>Download Template</span>
            </button>
            {fileData.length > 0 && (
              <button type="button" onClick={() => { if(window.confirm("Discard?")) { setFileData([]); setFileName(""); setStats({ total: 0, valid: 0, invalid: 0 }); }}} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer">
                <Trash2 size={13} /> Discard
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── QUICK HEADER DOWNLOAD TOOLBAR ─── */}
      {isEmbedded && fileData.length === 0 && (
        <div className="flex justify-end mb-1 select-none">
          <button type="button" onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200/40 dark:border-slate-700/60 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
            <Download size={12} /> <span>Download Sample Template</span>
          </button>
        </div>
      )}

      {/* ─── FILE DROPZONE MATRIX AREA ─── */}
      {fileData.length === 0 ? (
        <label className="block bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl cursor-pointer hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition-all group py-16 text-center select-none">
          <Upload size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-3 group-hover:scale-105 transition-transform" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Drop CSV or Excel File</p>
          <input ref={fileInputRef} type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleUpload} />
        </label>
      ) : (
        <div className="grid grid-cols-1 grid-row-track lg:grid-cols-4 gap-5" ref={previewRef}>
          
          {/* ─── DATA PREVIEW MATRIX TRACK ─── */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden order-2 lg:order-1">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 select-none">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Previewing Loop · {stats.total} Rows found</span>
              <button type="button" onClick={() => { setFileData([]); setFileName(""); setStats({ total: 0, valid: 0, invalid: 0 }); }} className="text-[10px] font-bold text-rose-500 uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer">
                <Trash2 size={11} /> Clear File
              </button>
            </div>
            <div className="overflow-x-auto max-h-[50vh]">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-white dark:bg-slate-900 sticky top-0 border-b border-slate-100 dark:border-slate-800 z-10 select-none">
                  <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {["Name", "Phone", "Email", "Course", "Country", "Valid"].map(h => (
                      <th key={h} className="px-4 py-3 text-center">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-600 dark:text-slate-300">
                  {fileData.slice(0, PREVIEW_LIMIT).map((row, idx) => (
                    <tr key={idx} className={row.isValid ? "hover:bg-blue-50/10 dark:hover:bg-blue-950/10 transition-colors" : "bg-rose-50/30 dark:bg-rose-950/10"}>
                      <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 text-center truncate max-w-[140px]">{row.full_name}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 text-center font-mono">{row.phone}</td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-center truncate max-w-[120px]">{row.email || "—"}</td>
                      <td className="px-4 py-2.5 text-blue-600 dark:text-blue-400 font-bold text-center truncate max-w-[120px]">{row.interested_course}</td>
                      <td className="px-4 py-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-center truncate max-w-[100px]">{row.country}</td>
                      <td className="px-4 py-2.5 text-center">{renderValidCell(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── SIDEBAR MANAGEMENT ACTIONS ─── */}
          <div className="lg:col-span-1 space-y-4 order-1 lg:order-2 select-none">
            
            {/* Distribution Controls */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-amber-600 dark:text-amber-400">
                    <Zap size={14} fill="currentColor" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">Auto Distribute</span>
                </div>
                <button type="button" onClick={() => setAutoDistribute(!autoDistribute)} className={`w-10 h-5 rounded-full relative transition-all cursor-pointer ${autoDistribute ? 'bg-blue-600 shadow-sm' : 'bg-slate-200 dark:bg-slate-800'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${autoDistribute ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <p className="text-[9px] text-slate-400 font-medium leading-tight">Process assignment metrics automatically on record injection matching active rules parameters.</p>
            </div>

            {/* Ingestion Metric Summaries */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-3">File Metrics</p>
              <div className="space-y-3">
                <StatRow label="Total Rows Parsed" value={stats.total} />
                <StatRow label="Valid Records" value={stats.valid} color="text-emerald-600 dark:text-emerald-400" />
                <StatRow label="Validation Warnings" value={stats.invalid} color="text-amber-500" />
              </div>
              <button type="button" onClick={handleImport} disabled={stats.valid === 0 || isUploading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-600/10 flex items-center justify-center gap-2 transition-all cursor-pointer">
                {isUploading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ArrowRight size={13} />}
                <span>Inject Valid Records</span>
              </button>
            </div>
            
            {/* System Rule Card Informer */}
            <div className="bg-slate-900 dark:bg-slate-950 p-5 rounded-3xl text-white shadow-sm space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assignment Core Priorities</div>
              <ul className="text-[9px] text-slate-400 space-y-1.5 font-medium leading-relaxed">
                <li>· Target <strong className="text-white">Country Match</strong> conditions process first.</li>
                <li>· Secondary track falls back to <strong className="text-white">Course Specialty Match</strong> options.</li>
                <li>· Unmatched categories route through generic <strong className="text-white">Round Robin</strong> lines.</li>
              </ul>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}