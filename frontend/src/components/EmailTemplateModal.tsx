import React, { useState, useEffect } from "react";
import { X, Plus, Edit3, Trash2, Mail, Loader2, Save, ArrowLeft, AlertCircle } from "lucide-react";
import axios from "axios";
import { parseTemplate } from "../utils/templateHelper";
import { toast } from "react-hot-toast";

const EmailTemplateModal = ({ isOpen, onClose, inputCls }: any) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState<any>({
    title: "", subject: "", category: "General", message: "", is_active: true
  });

  const categories = ["General", "Enquiry", "Counseling", "Admission", "Documentation", "Visa Update", "Campaign"];
  const variables = ["name", "course", "company", "date", "assigned_user"];

  const fetchTemplates = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/communication-templates?type=email`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setTemplates(res.data.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (isOpen) fetchTemplates(); }, [isOpen]);

  const handleEdit = (template: any) => {
    setEditingId(template.id);
    setFormData({
      title: template.title,
      subject: template.subject || "", // Load existing subject
      category: template.category || "General",
      message: template.message,
      is_active: template.is_active === 1 || template.is_active === true
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await axios.delete(`${import.meta.env.VITE_API_URL}/api/communication-templates/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success("Template deleted");
        setShowDeleteConfirm(null);
        fetchTemplates();
        if (editingId === id) {
          setIsFormOpen(false);
          setEditingId(null);
        }
      }
    } catch (err) {
      toast.error("Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.message || !formData.subject) {
        toast.error("Title, Subject and Message are required");
        return;
    }
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const method = editingId ? "put" : "post";
      const url = `${import.meta.env.VITE_API_URL}/api/communication-templates${editingId ? `/${editingId}` : ""}`;
      
      const res = await axios[method](url, { ...formData, type: 'email' }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setIsFormOpen(false);
        setEditingId(null);
        setFormData({ title: "", subject: "", category: "General", message: "", is_active: true });
        fetchTemplates();
        toast.success(editingId ? "Email updated" : "Email saved");
      }
    } catch (err) { 
      toast.error("Operation failed"); 
    } finally { 
      setLoading(false); 
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm leading-none">
      <div className="relative bg-white dark:bg-gray-900 w-full max-w-5xl h-[80vh] rounded-[1.5rem] shadow-2xl overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/20">
          <div>
            <h2 className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-tighter">Email Manager</h2>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Template Library</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-y-auto p-6 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            {!isFormOpen ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center text-purple-600"><Plus size={24} /></div>
                <h3 className="text-[11px] font-black uppercase text-gray-800 dark:text-white">New Email Template</h3>
                <button onClick={() => setIsFormOpen(true)} className="px-8 py-3 bg-purple-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg hover:bg-purple-700 transition-all">Get Started</button>
              </div>
            ) : (
              <div className="space-y-5 animate-in slide-in-from-left-4 duration-300">
                <button onClick={() => { setIsFormOpen(false); setEditingId(null); setFormData({ title: "", subject: "", category: "General", message: "", is_active: true }); }} className="flex items-center gap-2 text-[9px] font-black text-purple-600 uppercase hover:translate-x-1 transition-transform">
                  <ArrowLeft size={12}/> Back to Library
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[8px] font-black text-gray-400 uppercase ml-1 mb-2">Internal Template Name</label>
                    <input className={`${inputCls} py-2 text-xs`} placeholder="e.g. Welcome Email" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[8px] font-black text-gray-400 uppercase ml-1 mb-2">Category</label>
                    <select className={`${inputCls} py-2 text-xs`} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[8px] font-black text-gray-400 uppercase ml-1 mb-2">Email Subject Line</label>
                  <input className={`${inputCls} py-2 text-xs font-bold`} placeholder="The subject the student will see..." value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
                </div>

                <div className="space-y-1">
                  <label className="block text-[8px] font-black text-gray-400 uppercase ml-1 mb-2">Email Body Content</label>
                  <textarea className={`${inputCls} min-h-[180px] py-3 text-[13px] leading-relaxed`} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <p className="text-[8px] font-black text-gray-400 uppercase ml-1">Dynamic Variables (Click to Add)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {variables.map(v => (
                      <button 
                        key={v} 
                        type="button" 
                        onClick={() => setFormData(p => ({...p, message: (p.message || "") + ` {{${v}}}`}))} 
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-purple-600 hover:text-white rounded-lg text-[8px] font-black transition-all border border-gray-200 dark:border-gray-700 uppercase"
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button onClick={handleSave} disabled={loading} className="px-10 py-3 bg-purple-600 text-white rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-purple-700 transition-all shadow-xl shadow-purple-500/20">
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    {editingId ? "Update Template" : "Create Template"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: Preview & Library */}
          <div className="w-80 flex flex-col bg-gray-50/50 dark:bg-gray-800/40 overflow-hidden leading-none">
            
            {/* Live Preview Section */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-sm">
                  <Mail size={10} />
                </div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-tight">Email Preview</p>
              </div>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-md border border-purple-100 dark:border-purple-900/30 space-y-2">
                <div className="border-b border-gray-50 pb-2 mb-2">
                  <p className="text-[7px] font-black text-gray-400 uppercase">Subject:</p>
                  <p className="text-[10px] font-black text-gray-900 dark:text-white">
                    {parseTemplate(formData.subject || "No Subject", { name: "Anand", course: "Fullstack" })}
                  </p>
                </div>
                <p className="text-[10px] text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium h-24 overflow-y-auto custom-scrollbar">
                  {parseTemplate(formData.message || "Email body preview...", { name: "Anand", course: "Fullstack", company: "WebGyor" })}
                </p>
              </div>
            </div>
            
            {/* Templates List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest sticky top-0 bg-gray-50/90 dark:bg-gray-800 py-2">Library ({templates.length})</p>
              {templates.map(t => (
                <div key={t.id} className={`group relative p-3 rounded-xl border transition-all ${editingId === t.id ? 'border-purple-500 bg-purple-50/30 ring-1 ring-purple-500' : 'border-gray-100 bg-white dark:bg-gray-900 dark:border-gray-800'}`}>
                  
                  {showDeleteConfirm === t.id ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-1 animate-in fade-in zoom-in-95">
                      <p className="text-[8px] font-black text-red-500 uppercase">Confirm Delete?</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleDelete(t.id)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-[7px] font-black uppercase">Yes</button>
                        <button onClick={() => setShowDeleteConfirm(null)} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[7px] font-black uppercase">No</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-1">
                        <div className="leading-tight pr-8">
                          <p className="text-[9px] font-black uppercase text-gray-900 dark:text-white truncate">{t.title}</p>
                          <p className="text-[7px] font-bold text-gray-400 uppercase tracking-tight">{t.category}</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleEdit(t)} className="p-1 text-gray-400 hover:text-purple-600 transition-colors">
                            <Edit3 size={12}/>
                          </button>
                          <button onClick={() => setShowDeleteConfirm(t.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={12}/>
                          </button>
                        </div>
                      </div>
                      <p className="text-[8px] text-gray-500 line-clamp-1 italic mt-1 leading-none">Sub: {t.subject || "No Subject"}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplateModal;