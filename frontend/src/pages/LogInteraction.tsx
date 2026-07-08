import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Send, FileText, Brain, 
  RefreshCw, CheckCircle2, Mail, Sparkles,
  ShieldCheck, Columns, Check, Clipboard, Clock
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchDoctors } from '../store/doctorsSlice';
import { fetchProducts, logInteraction, fetchInteractions } from '../store/interactionsSlice';
import { addManualMessage, clearChat, setLastExtraction } from '../store/chatSlice';
import { showToast } from '../store/notificationsSlice';
import { fetchDashboardData } from '../store/dashboardSlice';
import axios from 'axios';

export const LogInteraction: React.FC = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const doctors = useAppSelector((state) => state.doctors.list);
  const products = useAppSelector((state) => state.interactions.products);
  const { messages, lastExtraction } = useAppSelector((state) => state.chat);
  
  // Check if routed with doctorName
  const stateVal = location.state as { doctorName?: string };
  
  // ==========================================
  // LEFT PANEL: STRUCTURED FORM STATE
  // ==========================================
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | ''>('');
  const [hospital, setHospital] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [interactionType, setInteractionType] = useState('In-Person');
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [meetingNotes, setMeetingNotes] = useState('');
  
  // Add Follow-up form controls
  const [followUpDate, setFollowUpDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [followUpTitle, setFollowUpTitle] = useState('');
  
  const [savingForm, setSavingForm] = useState(false);

  // ==========================================
  // RIGHT PANEL: AI CHAT & VISUALIZER STATE
  // ==========================================
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const lastProcessedExtractionRef = useRef<any>(null);
  
  // Custom step-by-step loading animation state
  const [simulatedLoading, setSimulatedLoading] = useState(false);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(-1);
  const [pendingResponse, setPendingResponse] = useState<any>(null);

  // Extracted entities editor
  const [editExtracted, setEditExtracted] = useState({
    doctor_name: '',
    product_name: '',
    sentiment: 'Neutral',
    summary: '',
    notes: '',
    follow_up_days: 14,
    follow_up_date: '',
    follow_up_title: '',
    educational_material: '',
    email_draft_subject: '',
    email_draft_body: '',
    confidence_score: 0.95,
    hospital: '',
    specialty: '',
    priority: 'Medium'
  });

  // Load resources
  useEffect(() => {
    dispatch(fetchDoctors());
    dispatch(fetchProducts());
  }, [dispatch]);

  // Handle route redirect from dashboard recommendations
  useEffect(() => {
    if (stateVal?.doctorName && doctors.length > 0) {
      const match = doctors.find(d => d.name.toLowerCase().includes(stateVal.doctorName!.toLowerCase()));
      if (match) {
        setSelectedDoctorId(match.id);
        setHospital(match.hospital);
        setSpecialty(match.specialty);
      }
    }
  }, [stateVal, doctors]);

  // Handle doctor select to auto fill practicing address/specialty
  const handleDoctorChange = (id: number | '') => {
    setSelectedDoctorId(id);
    if (id !== '') {
      const doc = doctors.find(d => d.id === id);
      if (doc) {
        setHospital(doc.hospital);
        setSpecialty(doc.specialty);
      }
    } else {
      setHospital('');
      setSpecialty('');
    }
  };

  // Scroll chat window to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, simulatedLoading]);

  // Workflow Pipeline Steps Label Helper
  const pipelineSteps = [
    { label: 'Intent Detection', desc: 'Classifying request path' },
    { label: 'Entity Extraction', desc: 'Pulling doctor, product, dates' },
    { label: 'Tool Selection', desc: 'Preparing backend commands' },
    { label: 'LangGraph Processing', desc: 'Orchestrating logic steps' },
    { label: 'Database Commit', desc: 'Committing CRM changes to SQL' },
    { label: 'AI Summary Generation', desc: 'Synthesizing response card' }
  ];

  // Core steps timer logic for loading animations
  useEffect(() => {
    let interval: any;
    if (simulatedLoading) {
      interval = setInterval(() => {
        setActiveWorkflowStep((prev) => {
          if (prev >= 5) {
            if (pendingResponse) {
              clearInterval(interval);
              setTimeout(() => {
                setActiveWorkflowStep(6); // Set to Completed (step index 6)
                setTimeout(() => {
                  setSimulatedLoading(false);
                  
                  // Add message to chat list
                  dispatch(addManualMessage({
                    id: Math.random().toString(36).substring(2, 9),
                    sender: 'assistant',
                    text: pendingResponse.text,
                    timestamp: new Date().toISOString(),
                    intent: pendingResponse.intent,
                    data: pendingResponse.data,
                    confidence_score: pendingResponse.confidence_score,
                    steps: pendingResponse.steps
                  }));

                  // Update extraction status
                  if (pendingResponse.success && pendingResponse.data) {
                    dispatch(setLastExtraction({
                      intent: pendingResponse.intent,
                      ...pendingResponse.data
                    }));
                    dispatch(fetchDoctors()); // Refresh doctors list for new profiles
                    dispatch(fetchInteractions()); // Refresh interactions list
                  }
                  
                  setPendingResponse(null);
                }, 800);
              }, 400);
              return 5;
            }
            return 5; // Stay on final step until API returns
          }
          return prev + 1;
        });
      }, 450);
    }
    return () => clearInterval(interval);
  }, [simulatedLoading, pendingResponse, dispatch]);

  // Sync extracted metadata from backend state & Autofill form automatically
  useEffect(() => {
    if (lastExtraction) {
      let doc = lastExtraction.doctor?.name || lastExtraction.doctor_name || lastExtraction.interaction?.doctor_name || '';
      let prod = lastExtraction.interaction?.product_name || lastExtraction.product_name || '';
      let sentiment = lastExtraction.interaction?.sentiment || lastExtraction.sentiment || 'Neutral';
      let summary = lastExtraction.interaction?.summary || lastExtraction.summary || '';
      let notes = lastExtraction.interaction?.notes || lastExtraction.notes || '';
      let fDays = lastExtraction.follow_up_days || 14;
      let fDate = lastExtraction.follow_up_date || '';
      let fTitle = lastExtraction.follow_up?.title || lastExtraction.follow_up_title || '';
      let material = lastExtraction.follow_up?.educational_material || lastExtraction.educational_material || '';
      let emailSub = lastExtraction.subject || '';
      let emailBody = lastExtraction.body || '';
      let conf = lastExtraction.confidence_score || 0.95;

      setEditExtracted({
        doctor_name: doc,
        product_name: prod,
        sentiment: sentiment,
        summary: summary || lastExtraction.summary || 'Visit logged by AI copilot',
        notes: notes || lastExtraction.notes || '',
        follow_up_days: fDays,
        follow_up_date: fDate,
        follow_up_title: fTitle || (prod ? `Provide clinical study on ${prod}` : 'Follow up meeting'),
        educational_material: material,
        email_draft_subject: emailSub,
        email_draft_body: emailBody,
        confidence_score: conf,
        hospital: lastExtraction.hospital || '',
        specialty: lastExtraction.specialty || '',
        priority: lastExtraction.priority || 'Medium'
      });

      // ==========================================
      // AUTOMATICALLY POPULATE THE CRM FORM
      // ==========================================
      if (doc && doctors.length > 0) {
        const cleanDocName = doc.replace(/^(dr\.?\s*)/i, '').trim().toLowerCase();
        const matchedDoc = doctors.find(d => {
          const cleanDName = d.name.replace(/^(dr\.?\s*)/i, '').trim().toLowerCase();
          return cleanDName.includes(cleanDocName) || cleanDocName.includes(cleanDName);
        });
        if (matchedDoc) {
          setSelectedDoctorId(matchedDoc.id);
          setHospital(matchedDoc.hospital);
          setSpecialty(matchedDoc.specialty);
        }
      }

      if (prod && products.length > 0) {
        const matchedProd = products.find(p => p.name.toLowerCase().includes(prod.toLowerCase()));
        if (matchedProd) {
          setSelectedProductId(matchedProd.id);
        }
      }

      if (notes || summary) {
        setMeetingNotes(notes || summary);
      }

      if (lastExtraction.meeting_date) {
        setMeetingDate(lastExtraction.meeting_date);
      }

      if (lastExtraction.channel) {
        const chan = lastExtraction.channel;
        if (['In-Person', 'Virtual', 'Phone', 'Email'].includes(chan)) {
          setInteractionType(chan);
        }
      }

      if (fDate) {
        setFollowUpDate(fDate);
      } else if (fDays) {
        const calculatedDate = new Date(Date.now() + Number(fDays) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        setFollowUpDate(calculatedDate);
      }

      if (fTitle) {
        setFollowUpTitle(fTitle);
      }
      
      // Prevent repeated/duplicated alerts using a ref comparison guard
      if (lastProcessedExtractionRef.current !== lastExtraction) {
        lastProcessedExtractionRef.current = lastExtraction;
        if (lastExtraction.intent === 'log_interaction') {
          dispatch(showToast('✅ AI completed all tasks successfully.', 'success'));
        } else {
          dispatch(showToast('✅ CRM form updated successfully.', 'success'));
        }
      }
    }
  }, [lastExtraction, doctors, products, dispatch]);

  // Handle Structured Form Save
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      dispatch(showToast('Please select a doctor.', 'warning'));
      return;
    }
    
    setSavingForm(true);
    try {
      await dispatch(logInteraction({
        user_id: 1,
        doctor_id: Number(selectedDoctorId),
        product_id: selectedProductId ? Number(selectedProductId) : undefined,
        date: meetingDate,
        interaction_type: interactionType,
        notes: meetingNotes,
        summary: meetingNotes ? (meetingNotes.substring(0, 120) + '...') : 'Structured meeting logged.',
        sentiment: 'Neutral',
        next_action: followUpTitle || 'Routine follow-up',
        follow_up_date: followUpDate,
        follow_up_title: followUpTitle
      })).unwrap();

      dispatch(showToast('✅ Interaction logged successfully.', 'success'));
      dispatch(fetchDashboardData());
      
      // Reset form fields
      setSelectedProductId('');
      setMeetingNotes('');
      setFollowUpTitle('');
    } catch (err: any) {
      dispatch(showToast(err || 'Failed to log interaction.', 'error'));
    } finally {
      setSavingForm(false);
    }
  };

  // Submit chat query to backend with step animations
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatInput('');

    // Append User Message in UI
    dispatch(addManualMessage({
      id: Math.random().toString(36).substring(2, 9),
      sender: 'user',
      text: userMsg,
      timestamp: new Date().toISOString()
    }));

    const historyList = messages.map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text
    }));

    // Trigger sequential loading animations
    setSimulatedLoading(true);
    setActiveWorkflowStep(0);
    setPendingResponse(null);

    try {
      const response = await axios.post('/api/chat', {
        message: userMsg,
        user_id: 1,
        history: historyList
      });
      
      setPendingResponse(response.data);
    } catch (err: any) {
      dispatch(showToast('AI Agent analysis failed.', 'error'));
      setSimulatedLoading(false);
      setActiveWorkflowStep(-1);
      
      dispatch(addManualMessage({
        id: Math.random().toString(36).substring(2, 9),
        sender: 'assistant',
        text: `⚠️ **Error:** Failed to communicate with AI agent. ${err.response?.data?.detail || ''}`,
        timestamp: new Date().toISOString()
      }));
    }
  };

  const getInitials = (name: string) => {
    const clean = name.replace(/^(dr\.?\s*)/i, '').trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase();
  };

  // ==========================================
  // CUSTOM RENDER CARD COMPONENTS
  // ==========================================

  const renderLogInteractionCard = (data: any, confidence: number) => {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-glass space-y-4 max-w-md w-full"
      >
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold text-xs border border-indigo-100 dark:border-indigo-900/30">
              {getInitials(data.doctor_name || 'Dr. Doctor')}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-[9px] bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/20 flex items-center gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>Logged</span>
                </span>
                {data.priority && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    data.priority === 'High' 
                      ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 border border-rose-100 dark:border-rose-900/20'
                      : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 border border-amber-100 dark:border-amber-900/20'
                  }`}>
                    {data.priority} Priority
                  </span>
                )}
              </div>
              <h4 className="text-xs font-black text-slate-850 dark:text-slate-100 mt-1">{data.doctor_name}</h4>
              <p className="text-[10px] text-slate-450 font-medium">{data.hospital}</p>
            </div>
          </div>

          {data.sentiment && (
            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border ${
              data.sentiment === 'Positive'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : data.sentiment === 'Negative'
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                : 'bg-slate-500/10 text-slate-650 dark:text-slate-450 border-slate-500/20'
            }`}>
              {data.sentiment} Sentiment
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-[10px] font-bold text-slate-650 dark:text-slate-350">
          <div>
            <p className="text-[8px] uppercase tracking-wider text-slate-400">Product Discussed</p>
            <p className="text-slate-800 dark:text-slate-200 mt-0.5">{data.product_name || 'General'}</p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wider text-slate-400">Follow-Up Date</p>
            <p className="text-slate-800 dark:text-slate-200 mt-0.5">
              {data.follow_up_date ? `${data.follow_up_date} (${data.follow_up_days}d)` : `${data.follow_up_days} Days`}
            </p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wider text-slate-400">Specialty Area</p>
            <p className="text-slate-800 dark:text-slate-200 mt-0.5">{data.specialty}</p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wider text-slate-400">Samples Given</p>
            <p className="text-slate-800 dark:text-slate-200 mt-0.5">{data.samples_distributed || '0'}</p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
          <p className="text-[8px] uppercase tracking-wider text-slate-400 font-bold mb-1">AI Executive Brief</p>
          <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{data.summary}</p>
        </div>

        {data.ai_recommendations && data.ai_recommendations.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[8px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              <span>AI Next Best Recommendations</span>
            </p>
            <ul className="space-y-1 pl-0.5 text-left">
              {data.ai_recommendations.map((rec: string, idx: number) => (
                <li key={idx} className="text-[10px] text-slate-650 dark:text-slate-350 font-semibold flex items-start gap-1.5 list-none">
                  <span className="text-indigo-500 font-black mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[8px] font-bold text-slate-400">
            <span>AI EXTRACTION CONFIDENCE</span>
            <span>{Math.round(confidence * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-950 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full"
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
        </div>

        <div className="text-[10px] text-center text-slate-400 dark:text-slate-500 font-bold pt-2 border-t border-slate-100 dark:border-slate-850">
          Interaction saved successfully.
        </div>
      </motion.div>
    );
  };

  const renderEditInteractionCard = (data: any) => {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-glass space-y-3 max-w-sm w-full"
      >
        <div className="flex items-center gap-2 text-indigo-650 dark:text-indigo-400">
          <RefreshCw className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
          <h4 className="text-xs font-black">🔄 Record Modification Complete</h4>
        </div>
        <p className="text-[11px] text-slate-650 dark:text-slate-350 font-medium">
          Successfully updated CRM logs for doctor **{data.doctor_name}** at {data.hospital}.
        </p>
        <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850 text-[10px] font-medium space-y-1 text-slate-600 dark:text-slate-300">
          <div className="flex justify-between"><span className="text-slate-400">Target HCP:</span><span className="font-bold">{data.doctor_name}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Product:</span><span className="font-bold">{data.product_name}</span></div>
          {data.summary && <div className="border-t border-slate-200/20 pt-1 mt-1 text-[10px] text-slate-500 dark:text-slate-450 italic">"{data.summary}"</div>}
        </div>
      </motion.div>
    );
  };

  const renderSearchHistoryCard = (data: any) => {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-glass space-y-3 max-w-md w-full"
      >
        <div className="flex items-center justify-between border-b border-slate-150/10 pb-2">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <Clock className="w-4 h-4" />
            <h4 className="text-xs font-black">🔍 Historical Interaction Log</h4>
          </div>
          <span className="text-[9px] font-bold bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100/10 px-2 py-0.5 rounded-full">
            {data.doctor_name}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 font-medium">Practicing clinic: **{data.hospital}** | Specialty: **{data.specialty}**</p>
        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 text-left">
          <div className="relative pl-3.5 border-l-2 border-slate-200 dark:border-slate-800 space-y-3">
            <div className="relative">
              <span className="absolute -left-[19.5px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-505 border border-white dark:border-slate-900" />
              <p className="text-[9px] font-extrabold text-slate-450">TODAY</p>
              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{data.product_name}: {data.summary}</p>
            </div>
            <div className="relative opacity-60">
              <span className="absolute -left-[19.5px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400 border border-white dark:border-slate-900" />
              <p className="text-[9px] font-extrabold text-slate-400">14 DAYS AGO</p>
              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{data.product_name}: Follow up audit regarding trials reception.</p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderSummaryCard = (data: any) => {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-glass space-y-3 max-w-md w-full"
      >
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 border-b border-slate-150/10 pb-2">
          <FileText className="w-4 h-4" />
          <h4 className="text-xs font-black">📋 Physician Relationship Summary</h4>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-slate-650 dark:text-slate-350">
          <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-850">
            <span className="block text-[8px] uppercase text-slate-400 font-bold">Total Meetings</span>
            <span className="text-sm font-black text-slate-850 dark:text-slate-100">3</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-850">
            <span className="block text-[8px] uppercase text-slate-400 font-bold">Sentiment Trend</span>
            <span className="text-xs font-black text-emerald-500">{data.sentiment}</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-850">
            <span className="block text-[8px] uppercase text-slate-400 font-bold">Primary Brand</span>
            <span className="text-[10px] font-black text-indigo-500 truncate">{data.product_name || 'General'}</span>
          </div>
        </div>
        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-350 leading-relaxed bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-xl text-left">
          **Relationship Outlook:** Dr. {data.doctor_name.replace('Dr. ', '')} practices in {data.hospital} and shows active, high receptivity to clinical safety trial briefings.
        </p>
      </motion.div>
    );
  };

  const renderNextBestActionCard = (data: any) => {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-glass space-y-3.5 max-w-sm w-full"
      >
        <div className="flex items-center gap-1.5 text-indigo-650 dark:text-indigo-400 border-b border-slate-150/10 pb-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <h4 className="text-xs font-black">💡 Strategic Next Steps Recommendation</h4>
        </div>
        <div className="space-y-1 text-left">
          <span className="text-[8px] text-slate-400 uppercase font-black">TARGET PHYSICIAN</span>
          <p className="text-xs font-black text-slate-800 dark:text-slate-100">{data.doctor_name}</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 text-[10px] font-bold">
          <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
            <span className="block text-[8px] uppercase text-slate-400 mb-0.5">TIMING</span>
            <span className="text-slate-850 dark:text-slate-200">Revisit in {data.follow_up_days} Days</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
            <span className="block text-[8px] uppercase text-slate-400 mb-0.5">DETAIL TARGET</span>
            <span className="text-slate-850 dark:text-slate-200 font-extrabold">{data.product_name}</span>
          </div>
        </div>
        <div className="space-y-2 text-left">
          <span className="text-[8px] text-slate-400 uppercase font-black">RECOMMENDED ENGAGEMENT ACTION ITEMS</span>
          <div className="space-y-1.5">
            {data.ai_recommendations?.map((point: string, idx: number) => (
              <div key={idx} className="flex gap-2 items-start text-[10px] font-semibold text-slate-650 dark:text-slate-350">
                <span className="text-indigo-500 font-black">•</span>
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderEmailDraftCard = (data: any) => {
    const handleCopy = () => {
      const fullText = `Subject: ${data.email_draft_subject || 'CRM Revisit follow-up'}\n\nDear ${data.doctor_name},\n\nIt was a pleasure meeting with you at ${data.hospital}. As discussed, I am sharing details on ${data.product_name}.\n\nBest regards,\nBioPharma Solutions Team`;
      navigator.clipboard.writeText(fullText);
      dispatch(showToast('✅ Email draft copied to clipboard.', 'success'));
    };

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-glass space-y-3 max-w-md w-full"
      >
        <div className="flex items-center justify-between border-b border-slate-150/10 pb-2">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
            <Mail className="w-4 h-4" />
            <h4 className="text-xs font-black">✉️ Generated Follow-Up Email Draft</h4>
          </div>
          <button 
            onClick={handleCopy}
            className="flex items-center gap-1 text-[9px] font-black bg-indigo-500 text-white px-2 py-0.5 rounded-full hover:bg-indigo-600 transition-all cursor-pointer border-none"
          >
            <Clipboard className="w-2.5 h-2.5" />
            <span>Copy Draft</span>
          </button>
        </div>
        <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850 space-y-2 text-[11px] font-semibold text-slate-700 dark:text-slate-350 text-left">
          <div>
            <span className="text-slate-400 font-bold block text-[9px] uppercase">Subject Line</span>
            <p className="text-slate-850 dark:text-slate-200 mt-0.5 font-bold">
              {data.email_draft_subject || `Follow-up on our clinical discussion regarding ${data.product_name}`}
            </p>
          </div>
          <div className="border-t border-slate-200/10 pt-2 mt-2 font-medium leading-relaxed whitespace-pre-wrap">
            {data.email_draft_body || `Dear ${data.doctor_name},\n\nThank you for taking the time to discuss the therapeutic benefits of ${data.product_name} today at ${data.hospital}.\n\nAs promised, I will follow up with safety dossiers next week.\n\nBest regards,\nBioPharma Solutions Team`}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-6 h-[calc(100vh-4rem)] flex flex-col gap-5 overflow-hidden bg-slate-50 dark:bg-slate-950">
      
      {/* Title Header */}
      <div className="flex justify-between items-center shrink-0 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
        <div className="flex items-center gap-2">
          <Columns className="w-5 h-5 text-brand-500" />
          <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Visits & Interactions Ingest</h3>
        </div>
        
        <div className="text-[10px] text-slate-450 font-bold bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 px-3 py-1 rounded-full shadow-sm">
          Dual Ingestion Engine: Standard Form + AI Copilot
        </div>
      </div>

      {/* Main Container - 50-50 Split Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
        
        {/* ========================================================
            LEFT COLUMN: STRUCTURED CRM FORM
            ======================================================== */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 shadow-glass flex flex-col overflow-y-auto">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100 dark:border-slate-850">
            <FileText className="w-5 h-5 text-brand-500" />
            <div>
              <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Structured CRM Record</h4>
              <p className="text-[10px] text-slate-455">Log visits using standardized data entry fields</p>
            </div>
          </div>

          <form onSubmit={handleSaveForm} className="space-y-4 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="md:col-span-1">
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Target HCP</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => handleDoctorChange(e.target.value ? Number(e.target.value) : '')}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-500 font-semibold text-slate-700 dark:text-slate-200"
                >
                  <option value="">-- Choose HCP --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Practice Location</label>
                <input
                  type="text"
                  disabled
                  value={hospital}
                  placeholder="Practicing clinic location"
                  className="w-full text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-500 font-medium font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Specialty</label>
                <input
                  type="text"
                  disabled
                  value={specialty}
                  placeholder="Specialty details"
                  className="w-full text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-500 font-medium font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Meeting Date</label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-500 font-semibold text-slate-700 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Channel (Channel)</label>
                <select
                  value={interactionType}
                  onChange={(e) => setInteractionType(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-255 dark:border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-500 font-semibold text-slate-700 dark:text-slate-200"
                >
                  <option value="In-Person">In-Person Visit</option>
                  <option value="Virtual">Virtual Session</option>
                  <option value="Phone">Telephone Check-in</option>
                  <option value="Email">Email Communication</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Product Detailed</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-500 font-semibold text-slate-700 dark:text-slate-200"
                >
                  <option value="">-- No Product / General --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.therapeutic_class})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Added Follow-up Form Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Follow-up Date</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-500 font-semibold text-slate-700 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Follow-up Task / Objective</label>
                <input
                  type="text"
                  value={followUpTitle}
                  onChange={(e) => setFollowUpTitle(e.target.value)}
                  placeholder="e.g. Share clinical trials, drop samples"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-500 font-semibold text-slate-700 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="text-left">
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Representative Log Notes</label>
              <textarea
                rows={4}
                value={meetingNotes}
                onChange={(e) => setMeetingNotes(e.target.value)}
                placeholder="Log physician questions, trial concerns, sample volumes distributed..."
                className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-500 dark:text-slate-100 font-medium resize-none"
              />
            </div>

            <div className="text-left">
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Attachments & Clinical Studies</label>
              <div className="border border-dashed border-slate-250 dark:border-slate-850 rounded-xl p-5 text-center text-slate-400 hover:border-brand-400 transition-all cursor-pointer bg-slate-50/10">
                <span className="text-[10px] font-bold">📎 Drop medical charts, brochures, or clinical PDF resources</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-850 flex justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={savingForm}
                className="px-5 py-2.5 bg-brand-650 text-white rounded-xl text-xs font-bold hover:bg-brand-550 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer border-none"
              >
                {savingForm && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Log to Database</span>
              </motion.button>
            </div>
          </form>
        </div>

        {/* ========================================================
            RIGHT COLUMN: CONVERSATIONAL AI (CHATGPT / LANGGRAPH)
            ======================================================== */}
        <div className="flex flex-col gap-4 overflow-hidden">
          
          <div className="flex-1 flex gap-4 overflow-hidden">
            
            {/* ChatGPT Dialogue Window */}
            <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden shadow-glass flex flex-col">
              <div className="h-11 border-b border-slate-100 dark:border-slate-850 px-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-indigo-500" />
                  <span>AI CRM Analyst Copilot</span>
                </span>
                <button
                  onClick={() => dispatch(clearChat())}
                  className="text-[10px] text-red-500 hover:text-red-400 font-bold border-none bg-transparent cursor-pointer"
                >
                  Reset Chat
                </button>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((m) => {
                  const isUser = m.sender === 'user';
                  
                  // Render structured response cards for assistant logs
                  if (!isUser && m.intent && m.data) {
                    return (
                      <div key={m.id} className="flex justify-start w-full">
                        {m.intent === 'log_interaction' && renderLogInteractionCard(m.data, m.confidence_score || 0.95)}
                        {m.intent === 'edit_interaction' && renderEditInteractionCard(m.data)}
                        {m.intent === 'search_history' && renderSearchHistoryCard(m.data)}
                        {m.intent === 'generate_summary' && renderSummaryCard(m.data)}
                        {m.intent === 'next_best_action' && renderNextBestActionCard(m.data)}
                        {m.intent === 'email_draft' && renderEmailDraftCard(m.data)}
                      </div>
                    );
                  }

                  return (
                    <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-sm ${
                        isUser 
                          ? 'bg-brand-600 text-white rounded-br-none font-semibold font-bold' 
                          : 'bg-slate-100 dark:bg-slate-850 text-slate-800 dark:text-slate-150 rounded-bl-none font-medium border border-slate-200/10 dark:border-slate-700/15'
                      }`}>
                        <p className="whitespace-pre-line leading-relaxed text-left">{m.text}</p>
                      </div>
                    </div>
                  );
                })}

                {/* Animated Steps Loader Component */}
                {simulatedLoading && (
                  <div className="flex justify-start w-full">
                    <div className="bg-slate-100 dark:bg-slate-850 border border-slate-200/10 dark:border-slate-700/15 rounded-2xl rounded-bl-none p-4 w-full max-w-sm shadow-sm space-y-3 font-semibold text-xs text-slate-750 dark:text-slate-200 text-left">
                      <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 border-b border-slate-200/30 dark:border-slate-800/40 pb-2">
                        <Brain className="w-4 h-4 animate-pulse text-indigo-500" />
                        <span className="font-extrabold">🧠 AI Understanding Conversation</span>
                      </div>
                      <div className="space-y-2">
                        {pipelineSteps.map((step, idx) => {
                          const isCompleted = activeWorkflowStep > idx;
                          const isActive = activeWorkflowStep === idx;
                          return (
                            <div key={idx} className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-2">
                                {isCompleted ? (
                                  <span className="text-emerald-500 font-bold">✓</span>
                                ) : isActive ? (
                                  <span className="inline-block w-2 h-2 rounded-full bg-brand-500 animate-ping" />
                                ) : (
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-350 dark:bg-slate-700" />
                                )}
                                <span className={isCompleted ? 'text-emerald-500' : isActive ? 'text-brand-500 font-bold' : 'text-slate-450'}>
                                  {step.label}
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                                {isCompleted ? 'Done' : isActive ? 'Processing...' : 'Waiting'}
                              </span>
                            </div>
                          );
                        })}
                        {/* Completed Status Check */}
                        <div className="flex items-center justify-between text-[11px] border-t border-slate-200/25 dark:border-slate-800/35 pt-1.5 mt-1.5">
                          <div className="flex items-center gap-2">
                            {activeWorkflowStep === 6 ? (
                              <span className="text-emerald-500 font-bold">✓</span>
                            ) : (
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-350 dark:bg-slate-700" />
                            )}
                            <span className={activeWorkflowStep === 6 ? 'text-emerald-500 font-bold' : 'text-slate-450'}>
                              Completed
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                            {activeWorkflowStep === 6 ? 'Done' : 'Waiting'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Chat Message Input */}
              <form onSubmit={handleSendChat} className="p-3 border-t border-slate-100 dark:border-slate-850 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  disabled={simulatedLoading}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Speak naturally (e.g. 'I met Dr. Anil Kumar today. We discussed CardioShield...')"
                  className="flex-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-250/50 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-500 dark:text-slate-100 disabled:opacity-50 font-medium"
                />
                <button
                  type="submit"
                  disabled={simulatedLoading || !chatInput.trim()}
                  className="p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-500 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center cursor-pointer border-none"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* AI Parsed Card Entities Panel */}
          {lastExtraction && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 shadow-glass shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4 text-left"
            >
              {/* Left Segment: Entity resolution checkmarks & Confidence */}
              <div className="space-y-3 border-r border-slate-150/10 dark:border-slate-800/50 pr-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Extraction Resolution</span>
                  
                  {/* Confidence Index Score */}
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-150/20 text-[9px] font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Confidence: {Math.round(editExtracted.confidence_score * 100)}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-655 dark:text-slate-350">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>HCP Resolved</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Hospital Resolved</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Product: {editExtracted.product_name || 'General'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Sentiment: {editExtracted.sentiment}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Follow-Up Registered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Talking Strategy Drafted</span>
                  </div>
                </div>
                
                {/* Confidence Bar Meter */}
                <div className="space-y-1">
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-950 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${editExtracted.confidence_score >= 0.9 ? 'bg-emerald-500' : 'bg-brand-500'}`} 
                      style={{ width: `${editExtracted.confidence_score * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Right Segment: Commit status and verification */}
              <div className="flex flex-col justify-between gap-3">
                <div className="grid grid-cols-2 gap-3 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                  <div>
                    <label className="block text-[8px] font-extrabold uppercase text-slate-400 mb-0.5">Doctor Target</label>
                    <input
                      type="text"
                      value={editExtracted.doctor_name}
                      onChange={(e) => setEditExtracted({ ...editExtracted, doctor_name: e.target.value })}
                      className="w-full bg-slate-55 dark:bg-slate-950 border border-slate-200 p-1.5 rounded text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-extrabold uppercase text-slate-400 mb-0.5">Strategic Action</label>
                    <input
                      type="text"
                      value={editExtracted.follow_up_title}
                      onChange={(e) => setEditExtracted({ ...editExtracted, follow_up_title: e.target.value })}
                      className="w-full bg-slate-55 dark:bg-slate-950 border border-slate-200 p-1.5 rounded text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-xs font-black">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Automatically Saved to CRM Database</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </div>

      </div>
    </div>
  );
};
