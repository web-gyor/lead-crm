import React, { useState, useEffect } from "react";
import { X, Plus, Edit3, Trash2, Loader2, Save, ArrowLeft, MessageSquare } from "lucide-react";
import axios from "axios";
import { parseTemplate } from "../utils/templateHelper";
import { toast } from "react-hot-toast";

const SMSTemplateModal = ({ isOpen, onClose, inputCls }: any) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<any>({ 
    title: "", 
    category: "General", 
    message: "", 
    is_active: true 
  });

  const variables = ["name", "phone", "course", "company", "date"];
  const categories = ["General", "Follow-up", "Reminder",  "Alert", "Campaign"];

  const fetchTemplates = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/communication-templates?type=sms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setTemplates(res.data.data);
    } catch (err) { console.error("Fetch error", err); }
  };

  useEffect(() => { if (isOpen) fetchTemplates(); }, [isOpen]);

  const handleEdit = (template: any) => {
    setEditingId(template.id);
    setFormData({
      title: template.title,
      category: template.category,
      message: template.message,
      is_active: template.is_active === 1 || template.is_active === true
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/communication-templates/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("SMS Template removed");
      setShowDeleteConfirm(null);
      fetchTemplates();
      if (editingId === id) {
        setIsFormOpen(false);
        setEditingId(null);
      }
    } catch (err) { toast.error("Delete failed"); } 
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.message) {
      toast.error("Title and Message are required");
      return;
    }
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const method = editingId ? "put" : "post";
      const url = `${import.meta.env.VITE_API_URL}/api/communication-templates${editingId ? `/${editingId}` : ""}`;
      
      const res = await axios[method](url, { ...formData, type: 'sms' }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setIsFormOpen(false);
        setEditingId(null);
        setFormData({ title: "", category: "General", message: "", is_active: true });
        fetchTemplates();
        toast.success(editingId ? "SMS Template updated" : "SMS Template saved");
      }
    } catch (err) { 
      toast.error("Save failed"); 
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
            <h2 className="text-[12px] font-black text-gray-900 dark:text-white uppercase tracking-tighter">SMS Manager</h2>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Configuration Library</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Editor Side */}
          <div className="flex-1 overflow-y-auto p-6 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            {!isFormOpen ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600"><Plus size={24} /></div>
                <h3 className="text-[11px] font-black uppercase text-gray-800 dark:text-white">New SMS Workflow</h3>
                <button onClick={() => setIsFormOpen(true)} className="px-8 py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg hover:bg-blue-700 transition-all">Get Started</button>
              </div>
            ) : (
              <div className="space-y-5 animate-in slide-in-from-left-4 duration-300">
                <button onClick={() => { setIsFormOpen(false); setEditingId(null); setFormData({ title: "", category: "General", message: "", is_active: true }); }} className="flex items-center gap-2 text-[9px] font-black text-blue-600 uppercase hover:translate-x-1 transition-transform mb-2">
                  <ArrowLeft size={12}/> Back to Library
                </button>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[8px] font-black text-gray-400 uppercase ml-1 mb-2">Internal Template Label</label>
                    <input className={`${inputCls} py-2.5 text-xs`} placeholder="e.g. Follow-up SMS" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-gray-400 uppercase ml-1 mb-2">Category</label>
                    <select className={`${inputCls} py-2.5 text-xs`} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] font-black text-gray-400 uppercase ml-1 mb-2">SMS Message Content</label>
                  <textarea className={`${inputCls} min-h-[160px] py-3 text-[13px] leading-relaxed`} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
                </div>

                <div className="space-y-3">
                  <p className="block text-[8px] font-black text-gray-400 uppercase ml-1 mb-2">Dynamic Tags (Click to Add)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {variables.map(v => (
                      <button 
                        key={v} 
                        type="button" 
                        onClick={() => setFormData(p => ({...p, message: (p.message || "") + ` {{${v}}}`}))} 
                        className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-blue-600 hover:text-white rounded-lg text-[8px] font-black transition-all border border-gray-200 dark:border-gray-700 uppercase"
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button onClick={handleSave} disabled={loading} className="px-12 py-3.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20">
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    {editingId ? "Update Workflow" : "Create Workflow"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Preview & Library */}
          <div className="w-80 flex flex-col bg-gray-50/50 dark:bg-gray-800/40 overflow-hidden leading-none border-l border-gray-100 dark:border-gray-800">
            {/* Mobile Preview Section */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-sm">
                  <MessageSquare size={10} />
                </div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-tight">Mobile Display</p>
              </div>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-md border border-blue-100 dark:border-blue-900/30">
                <p className="text-[10px] text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium h-24 overflow-y-auto custom-scrollbar">
                  {parseTemplate(formData.message || "Message preview...", { name: "Anand", course: "Fullstack", company: "WebGyor" })}
                </p>
              </div>
            </div>
            
            {/* Library Section with In-Card Delete */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest sticky top-0 bg-gray-50/90 dark:bg-gray-800 py-2">Saved Records ({templates.length})</p>
              {templates.map(t => (
                <div key={t.id} className={`group relative p-3 rounded-xl border transition-all ${editingId === t.id ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500' : 'border-gray-100 bg-white dark:bg-gray-900 dark:border-gray-800'}`}>
                  
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
                          <button onClick={() => handleEdit(t)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                            <Edit3 size={12}/>
                          </button>
                          <button onClick={() => setShowDeleteConfirm(t.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={12}/>
                          </button>
                        </div>
                      </div>
                      <p className="text-[8px] text-gray-500 line-clamp-1 italic mt-1 leading-none">"{t.message}"</p>
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

export default SMSTemplateModal;