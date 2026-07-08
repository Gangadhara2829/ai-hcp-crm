import React, { useEffect, useState } from 'react';
import { 
  Users2, Search, Filter, ShieldAlert, Calendar, 
  Brain, FileText, Mail, ChevronRight, CheckSquare, 
  MapPin, Phone, RefreshCw, Flame, UserPlus, Sparkles,
  TrendingUp, Activity, CheckSquare2, FileCheck, ClipboardList, AlertCircle
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchDoctors } from '../store/doctorsSlice';
import { fetchInteractions } from '../store/interactionsSlice';
import { showToast } from '../store/notificationsSlice';
import { TableSkeleton } from '../components/LoadingSkeleton';
import axios from 'axios';

export const Doctors: React.FC = () => {
  const dispatch = useAppDispatch();
  const doctors = useAppSelector((state) => state.doctors.list);
  const loading = useAppSelector((state) => state.doctors.loading);
  const interactions = useAppSelector((state) => state.interactions.list);

  // Selected doctor detail panel
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // AI Tool Results caches
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  const [aiNba, setAiNba] = useState<any | null>(null);
  const [aiNbaLoading, setAiNbaLoading] = useState(false);

  const [emailDraft, setEmailDraft] = useState<{subject: string; body: string} | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // Fetch doctors & interactions
  useEffect(() => {
    dispatch(fetchDoctors());
    dispatch(fetchInteractions());
  }, [dispatch]);

  // Reset caches on selected doctor switch
  useEffect(() => {
    setAiSummary(null);
    setAiNba(null);
    setEmailDraft(null);
    
    // Auto trigger AI strategy tools on select for premium UX!
    if (selectedDoctorId) {
      triggerInitialAISummary(selectedDoctorId);
    }
  }, [selectedDoctorId]);

  const activeDoc = doctors.find(d => d.id === selectedDoctorId);
  const docInteractions = interactions
    .filter(i => i.doctor_id === selectedDoctorId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id);

  // Calculate sentiment metrics for selected doc
  const posCount = docInteractions.filter(i => i.sentiment === 'Positive').length;

  // Dynamic trigger for summary
  const triggerInitialAISummary = async (docId: number) => {
    const doc = doctors.find(d => d.id === docId);
    if (!doc) return;
    
    // Do not trigger if there are no interactions!
    const docInteractions = interactions.filter(i => i.doctor_id === docId);
    if (docInteractions.length === 0) {
      return;
    }
    
    setAiSummaryLoading(true);
    setAiNbaLoading(true);
    try {
      // 1. Run Generate Summary NLU tool
      const summaryResp = await axios.post('/api/chat', {
        message: `summarize history for ${doc.name}`
      });
      if (summaryResp.data.success && summaryResp.data.data?.summary) {
        setAiSummary(summaryResp.data.data.summary);
      }
      
      // 2. Run Next Best Action tool
      const nbaResp = await axios.post('/api/chat', {
        message: `what is the next best action for ${doc.name}`
      });
      if (nbaResp.data.success && nbaResp.data.data) {
        setAiNba(nbaResp.data.data);
      }
    } catch (err) {
      console.log('Pre-loading AI strategies failed, falling back.');
    } finally {
      setAiSummaryLoading(false);
      setAiNbaLoading(false);
    }
  };

  // Trigger LangGraph Summary Tool
  const handleGenerateSummary = async () => {
    if (!activeDoc) return;
    setAiSummaryLoading(true);
    try {
      const response = await axios.post('/api/chat', {
        message: `summarize history for ${activeDoc.name}`
      });
      if (response.data.success && response.data.data?.summary) {
        setAiSummary(response.data.data.summary);
        dispatch(showToast('✅ AI summary generated.', 'success'));
      } else {
        setAiSummary("No history records found or summary failed.");
      }
    } catch (err) {
      dispatch(showToast('Could not compile history summary.', 'error'));
    } finally {
      setAiSummaryLoading(false);
    }
  };

  // Trigger LangGraph Next Best Action Tool
  const handleGenerateNBA = async () => {
    if (!activeDoc) return;
    setAiNbaLoading(true);
    try {
      const response = await axios.post('/api/chat', {
        message: `what is the next best action for ${activeDoc.name}`
      });
      if (response.data.success && response.data.data) {
        setAiNba(response.data.data);
        dispatch(showToast('✅ Next best actions generated.', 'success'));
      }
    } catch (err) {
      dispatch(showToast('Could not fetch strategic recommendations.', 'error'));
    } finally {
      setAiNbaLoading(false);
    }
  };

  // Trigger LangGraph Email Draft Tool
  const handleGenerateEmail = async () => {
    if (!activeDoc) return;
    setEmailLoading(true);
    try {
      const response = await axios.post('/api/chat', {
        message: `draft follow up email for ${activeDoc.name}`
      });
      if (response.data.success && response.data.data) {
        setEmailDraft({
          subject: response.data.data.subject || 'Follow-up discussion',
          body: response.data.data.body || 'Email body text here.'
        });
        dispatch(showToast('✅ Follow-up email ready.', 'success'));
      }
    } catch (err) {
      dispatch(showToast('Could not generate email draft.', 'error'));
    } finally {
      setEmailLoading(false);
    }
  };

  // Filtered lists
  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.hospital.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = specialtyFilter === '' || doc.specialty === specialtyFilter;
    const matchesPriority = priorityFilter === '' || doc.priority === priorityFilter;
    return matchesSearch && matchesSpecialty && matchesPriority;
  });

  return (
    <div className="p-6 h-[calc(100vh-4rem)] flex gap-6 overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
      
      {/* LEFT COLUMN: HCP DIRECTORY TABLE */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden shadow-glass">
        
        {/* Filters headers */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-850 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Users2 className="w-5 h-5 text-brand-500" />
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">HCP Target Accounts Directory</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search HCP Name, Hospital Location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-[11px] font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-brand-500 text-slate-700 dark:text-slate-200"
              />
            </div>
            
            {/* Specialty filter */}
            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="text-[11px] font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl focus:outline-none focus:border-brand-500 text-slate-700 dark:text-slate-200"
            >
              <option value="">All Specialties</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Neurology">Neurology</option>
              <option value="Endocrinology">Endocrinology</option>
              <option value="Pulmonology">Pulmonology</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="General Medicine">General Medicine</option>
            </select>

            {/* Priority filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-[11px] font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl focus:outline-none focus:border-brand-500 text-slate-700 dark:text-slate-200"
            >
              <option value="">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
        </div>

        {/* Directory Table Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6"><TableSkeleton /></div>
          ) : filteredDoctors.length > 0 ? (
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 text-[10px] uppercase font-extrabold text-slate-400">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Specialty</th>
                  <th className="px-6 py-4">Hospital Location</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4 text-center">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                {filteredDoctors.map((doc) => (
                  <tr 
                    key={doc.id} 
                    className={`hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer transition-colors ${
                      selectedDoctorId === doc.id ? 'bg-brand-50/20 dark:bg-brand-950/10' : ''
                    }`}
                    onClick={() => setSelectedDoctorId(doc.id)}
                  >
                    <td className="px-6 py-4 text-slate-800 dark:text-slate-100 font-extrabold">
                      {doc.name}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {doc.specialty}
                    </td>
                    <td className="px-6 py-4 text-slate-500 truncate max-w-[200px]">
                      {doc.hospital}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                        doc.priority === 'High' 
                          ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' 
                          : doc.priority === 'Medium'
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-850 dark:text-slate-400'
                      }`}>
                        {doc.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ChevronRight className="w-4 h-4 mx-auto text-slate-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-400 font-medium">
              No target doctors found matching filters.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: ENTERPRISE HCP DETAILED PROFILE PANEL */}
      <div className="w-[500px] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden flex flex-col shadow-glass">
        {activeDoc ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* HCP Profile Header Info */}
            <div className="border-b border-slate-100 dark:border-slate-850 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">{activeDoc.name}</h3>
                  <p className="text-xs text-brand-650 font-bold dark:text-brand-400">{activeDoc.specialty} Specialist</p>
                </div>
                <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-350 px-2.5 py-0.5 rounded-full font-bold uppercase">
                  Status: {activeDoc.status}
                </span>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{activeDoc.hospital}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{activeDoc.email || 'No email registered'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{activeDoc.phone || 'No phone registered'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-400" />
                  <span>Total Visits: {docInteractions.length}</span>
                </div>
              </div>
            </div>

            {docInteractions.length > 0 ? (
              <>
                {/* AI STRATEGIC AGENT DIAGNOSTICS */}
                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-brand-500" />
                    <span>AI Copilot Diagnostics</span>
                  </span>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={handleGenerateSummary}
                      disabled={aiSummaryLoading}
                      className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50/20 hover:bg-slate-150/40 dark:hover:bg-slate-850/60 text-center transition-all disabled:opacity-50 text-[10px] font-bold text-slate-650 dark:text-slate-300 cursor-pointer"
                    >
                      {aiSummaryLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4 text-brand-500" />}
                      <span>Generate Summary</span>
                    </button>

                    <button
                      onClick={handleGenerateNBA}
                      disabled={aiNbaLoading}
                      className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50/20 hover:bg-slate-150/40 dark:hover:bg-slate-850/60 text-center transition-all disabled:opacity-50 text-[10px] font-bold text-slate-650 dark:text-slate-300 cursor-pointer"
                    >
                      {aiNbaLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4 text-amber-500" />}
                      <span>Next Actions</span>
                    </button>

                    <button
                      onClick={handleGenerateEmail}
                      disabled={emailLoading}
                      className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50/20 hover:bg-slate-150/40 dark:hover:bg-slate-850/60 text-center transition-all disabled:opacity-50 text-[10px] font-bold text-slate-650 dark:text-slate-300 cursor-pointer"
                    >
                      {emailLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4 text-emerald-500" />}
                      <span>Draft Follow-Up</span>
                    </button>
                  </div>
                </div>

                {/* AI COMPILATION SUMMARY BOX */}
                {aiSummary && (
                  <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-950/15 space-y-2">
                    <h5 className="text-[10px] font-extrabold text-brand-600 dark:text-brand-400 uppercase tracking-wide flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Historical Summary Profile</span>
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line font-medium">
                      {aiSummary}
                    </p>
                  </div>
                )}

                {/* AI STRATEGY NEXT BEST ACTION */}
                {aiNba && (
                  <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-950/15 space-y-3">
                    <h5 className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" />
                      <span>AI Next Best Action Strategy</span>
                    </h5>
                    <div className="text-xs space-y-2 text-slate-650 dark:text-slate-300 font-semibold">
                      <p className="flex items-center gap-1.5">
                        <span>🗓️</span>
                        <span>**Visit Frequency:** Schedule follow-up visit in **{aiNba.recommended_timing_days || 14}** days.</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span>💊</span>
                        <span>**Product Focus:** Focus detailing on **{aiNba.recommended_product || 'General Product'}**.</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span>📚</span>
                        <span>**Clinical Material:** Deliver **{aiNba.educational_material || 'Trial Reports'}**.</span>
                      </p>
                      {aiNba.talking_points && (
                        <div className="mt-2.5 space-y-1.5 bg-white/70 dark:bg-slate-950/50 p-3 rounded-xl border border-amber-100/30 dark:border-slate-805">
                          <span className="font-extrabold text-[9px] text-slate-450 uppercase tracking-wider block">Talking Points for Representative</span>
                          {aiNba.talking_points.map((tp: string, idx: number) => (
                            <p key={idx} className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">- {tp}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* EMAIL DRAFT DRAWER BOX */}
                {emailDraft && (
                  <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/15 space-y-2">
                    <h5 className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        <span>Follow-Up Email Draft</span>
                      </span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(emailDraft.body);
                          dispatch(showToast('✅ Email draft copied to clipboard.', 'success'));
                        }}
                        className="text-[9px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-slate-655 font-bold hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                      >
                        Copy Draft
                      </button>
                    </h5>
                    <div className="bg-white/70 dark:bg-slate-950 p-3 rounded-xl text-xs space-y-2 text-slate-650 dark:text-slate-400 border border-emerald-100/30 dark:border-slate-850 font-medium">
                      <p className="font-bold text-[10px] text-slate-750 dark:text-slate-350">Subject: {emailDraft.subject}</p>
                      <p className="whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto">{emailDraft.body}</p>
                    </div>
                  </div>
                )}

                {/* AI RELATIONSHIP & CONVERSION INSIGHTS */}
                <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/20 dark:bg-indigo-950/10 space-y-3">
                  <h5 className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    <span>AI Relationship & Conversion Insights</span>
                  </h5>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="bg-white/80 dark:bg-slate-950/50 p-2.5 rounded-xl border border-indigo-50/40 dark:border-slate-800">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Relationship Score</span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                        {Math.min(100, Math.max(10, 30 + (docInteractions.filter(i => i.sentiment === 'Positive').length * 25) - (docInteractions.filter(i => i.sentiment === 'Negative').length * 30)))}%
                      </span>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-950/50 p-2.5 rounded-xl border border-indigo-50/40 dark:border-slate-800">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Opportunity Score</span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                        {activeDoc.priority === 'High' ? '92%' : activeDoc.priority === 'Medium' ? '74%' : '48%'}
                      </span>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-950/50 p-2.5 rounded-xl border border-indigo-50/40 dark:border-slate-800">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Doctor Interest</span>
                      <span className="text-sm font-black text-slate-850 dark:text-slate-205">
                        {docInteractions.filter(i => i.sentiment === 'Positive').length > 0 ? 'High' : 'Moderate'}
                      </span>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-950/50 p-2.5 rounded-xl border border-indigo-50/40 dark:border-slate-800">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Follow-up Risk</span>
                      <span className="text-sm font-black text-slate-850 dark:text-slate-205">
                        {docInteractions.some(i => i.sentiment === 'Negative') ? 'High Risk' : 'Low Risk'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SENTIMENT TREND TRACKER SECTION */}
                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">HCP Relationship Sentiment Trend</span>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl flex items-center justify-around">
                    {docInteractions.slice(0, 5).reverse().map((item) => (
                      <div key={item.id} className="flex flex-col items-center gap-1">
                        <span className="text-[9px] font-bold text-slate-400">{item.date.split('-').slice(1).join('/')}</span>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${
                          item.sentiment === 'Positive' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500' 
                            : item.sentiment === 'Negative'
                            ? 'bg-red-50 dark:bg-red-950/20 text-red-500'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-505'
                        }`} title={`Sentiment: ${item.sentiment}`}>
                          {item.sentiment === 'Positive' ? '😊' : item.sentiment === 'Negative' ? '😞' : '😐'}
                        </div>
                        <span className="text-[8px] font-extrabold text-slate-400">{item.product_name || 'Check'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* HCP VISITS TIMELINE */}
                <div className="space-y-3.5">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Visitation History Logs ({docInteractions.length})</span>
                  <div className="space-y-4 pl-3 border-l border-slate-200 dark:border-slate-800">
                    {docInteractions.map((item) => (
                      <div key={item.id} className="relative space-y-2.5 bg-slate-50/20 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-150/10 dark:border-slate-850 shadow-sm">
                        {/* Timeline node marker */}
                        <span className="absolute -left-[18.5px] top-5.5 w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-white dark:border-slate-900"></span>
                        
                        <div className="flex items-center justify-between border-b border-slate-100/50 dark:border-slate-800/40 pb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{item.date}</span>
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                            item.sentiment === 'Positive' 
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                              : item.sentiment === 'Negative'
                              ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400'
                              : 'bg-slate-100 text-slate-550 dark:bg-slate-800 dark:text-slate-450'
                          }`}>
                            {item.sentiment} Sentiment
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          <div>
                            <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider">Hospital Location</span>
                            <span className="text-slate-700 dark:text-slate-300">{activeDoc.hospital}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider">Visit Channel</span>
                            <span className="text-slate-700 dark:text-slate-300">{item.interaction_type}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider">Product Detailed</span>
                            <span className="text-brand-655 dark:text-brand-400 font-extrabold">{item.product_name || 'General Product'}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider">Follow-Up Action</span>
                            <span className="text-slate-700 dark:text-slate-300 truncate block" title={item.next_action || 'Routine check-in'}>
                              {item.next_action || 'Routine check-in'}
                            </span>
                          </div>
                        </div>

                        <div className="border-t border-slate-100/50 dark:border-slate-800/40 pt-2 text-[10px]">
                          <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider">Physician Feedback & Outcome Summary</span>
                          <p className="text-slate-650 dark:text-slate-300 font-medium leading-relaxed mt-0.5 font-semibold">
                            {item.summary || item.notes || 'No detailed meeting notes recorded.'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* Case 1: Total Visits == 0 Empty State Card */
              <div className="p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-950/10 space-y-6 flex flex-col items-center justify-center py-10">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shadow-sm">
                  📭
                </div>
                <div className="text-center space-y-2">
                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">No interaction history available.</h4>
                  <p className="text-xs text-slate-450 max-w-xs leading-relaxed">
                    Log your first interaction to unlock:
                  </p>
                </div>
                
                <div className="w-full bg-white/70 dark:bg-slate-950 p-4.5 rounded-xl space-y-3 border border-slate-200/40 dark:border-slate-800/80 shadow-glass">
                  <ul className="text-xs text-slate-650 dark:text-slate-350 space-y-2.5 font-medium pl-1">
                    <li className="flex items-center gap-2">
                      <span className="text-brand-500">•</span>
                      <span>AI Summary</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-brand-500">•</span>
                      <span>Relationship Timeline</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-brand-500">•</span>
                      <span>Next Best Action</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-brand-500">•</span>
                      <span>Clinical Recommendations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-brand-500">•</span>
                      <span>AI Insights</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-2.5">
            <Users2 className="w-12 h-12 text-slate-350 dark:text-slate-855" />
            <h4 className="font-extrabold text-xs text-slate-500">No Physician Profile Selected</h4>
            <p className="text-[10px] text-slate-450 max-w-[240px] leading-relaxed">
              Select an account from the left directory list to view clinical summaries, strategize visit priorities, and draft templates.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
