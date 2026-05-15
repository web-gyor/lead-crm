import React, { useState, useEffect } from "react";
import { X, Zap, Clock, Save, Loader2, MessageSquare, Smartphone, Mail } from "lucide-react";
import { apiGet, apiPost, apiPut } from "../../utils/api";
import { toast } from "react-hot-toast";

interface AddRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type: 'whatsapp' | 'sms' | 'email';
  editingRule?: any;
}

const AddRuleModal = ({ isOpen, onClose, onSuccess, type, editingRule }: AddRuleModalProps) => {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    trigger_status: "New",
    delay_value: 0,
    delay_unit: "minutes",
    template_id: "",
    is_active: true
  });

  const statusOptions = ["New", "Contacted", "Interested", "Follow-up", "Converted", "Lost", "DND"];
  const delayUnits = ["minutes", "hours", "days"];

  // Logic to load templates and handle editing state
  useEffect(() => {
    if (isOpen) {
      const fetchTemplates = async () => {
        try {
          const res = await apiGet(`/api/communication-templates?type=${type}`);
          setTemplates(res?.data || []);
        } catch (err) {
          toast.error("Failed to load templates");
        }
      };
      fetchTemplates();

      if (editingRule) {
        setFormData({
          name: editingRule.name,
          trigger_status: editingRule.trigger_status,
          delay_value: editingRule.delay_value,
          delay_unit: editingRule.delay_unit,
          template_id: editingRule.template_id,
          is_active: !!editingRule.is_active
        });
      } else {
        // Reset to defaults for a new rule
        setFormData({ 
          name: "", 
          trigger_status: "New", 
          delay_value: 0, 
          delay_unit: "minutes", 
          template_id: "", 
          is_active: true 
        });
      }
    }
  }, [isOpen, type, editingRule]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Please provide a rule name");
      return;
    }
    if (!formData.template_id) {
      toast.error("Please select a template");
      return;
    }

    setLoading(true);
    try {
      const payload = { ...formData, type };
      if (editingRule) {
        await apiPut(`/api/automation-rules/${editingRule.id}`, payload);
        toast.success("Rule updated successfully");
      } else {
        await apiPost("/api/automation-rules", payload);
        toast.success("AI Automation Rule Activated");
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error("Database sync failed. Check server connection.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const iconColor = type === 'whatsapp' ? 'text-emerald-500 bg-emerald-50' : type === 'sms' ? 'text-amber-500 bg-amber-50' : 'text-purple-500 bg-purple-50';
  const Icon = type === 'whatsapp' ? MessageSquare : type === 'sms' ? Smartphone : Mail;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50/30 dark:bg-gray-800/20">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm ${iconColor}`}>
              <Icon size={22} />
            </div>
            <div>
              <h2 className="text-[13px] font-black text-gray-900 dark:text-white uppercase tracking-tight">
                {editingRule ? 'Modify' : 'Setup'} {type} AI Rule
              </h2>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">WebGyor Engine v1.0</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all active:scale-90 text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-7 space-y-6">
          {/* Rule Name */}
          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase ml-1 mb-2.5 tracking-widest">Rule Identifier</label>
            <input 
              className="w-full px-5 py-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-gray-400/50"
              placeholder="e.g., Immediate Welcome WhatsApp"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Status Trigger */}
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase ml-1 mb-2.5 tracking-widest flex items-center gap-1.5">
                <Zap size={11} className="text-blue-500" /> On Status
              </label>
              <select 
                className="w-full px-4 py-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-black uppercase outline-none focus:border-blue-500/50 cursor-pointer"
                value={formData.trigger_status}
                onChange={e => setFormData({...formData, trigger_status: e.target.value})}
              >
                {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* Delay Configuration */}
            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase ml-1 mb-2.5 tracking-widest flex items-center gap-1.5">
                <Clock size={11} className="text-amber-500" /> Wait Period
              </label>
              <div className="flex gap-2">
                <input 
                  type="number"
                  min="0"
                  className="w-16 px-2 py-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-black text-center outline-none"
                  value={formData.delay_value}
                  onChange={e => setFormData({...formData, delay_value: Math.max(0, parseInt(e.target.value) || 0)})}
                />
                <select 
                  className="flex-1 px-3 py-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl text-[9px] font-black uppercase outline-none cursor-pointer"
                  value={formData.delay_unit}
                  onChange={e => setFormData({...formData, delay_unit: e.target.value})}
                >
                  {delayUnits.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase ml-1 mb-2.5 tracking-widest">Linked Template</label>
            <select 
              className="w-full px-5 py-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold outline-none focus:border-blue-500/50 cursor-pointer"
              value={formData.template_id}
              onChange={e => setFormData({...formData, template_id: e.target.value})}
            >
              <option value="">-- Choose {type} content --</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.title} [{t.category || 'General'}]</option>
              ))}
            </select>
            {templates.length === 0 && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/50">
                <p className="text-[9px] text-amber-700 dark:text-amber-400 font-bold uppercase leading-relaxed">
                  No {type} templates found. Please create one in Settings {">"} Communication Library.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-7 bg-gray-50/30 dark:bg-gray-800/20 border-t border-gray-50 dark:border-gray-800 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full md:w-auto px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] text-[11px] font-black uppercase flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {editingRule ? 'Update AI Rule' : 'Activate AI Rule'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddRuleModal;