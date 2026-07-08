import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users2, Clock, Calendar, Brain, PlusCircle, 
  RefreshCw, Flame, UserCheck, CheckCircle2, 
  Sparkles, TrendingUp, BarChart3, PieChart, ShieldAlert,
  ArrowUpRight, HeartHandshake, FileBadge2, Landmark, CheckSquare, Search, BookOpen
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchDashboardData } from '../store/dashboardSlice';
import { createDoctor } from '../store/doctorsSlice';
import { showToast } from '../store/notificationsSlice';
import { CardSkeleton } from '../components/LoadingSkeleton';
import axios from 'axios';

export const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { data, loading, error } = useAppSelector((state) => state.dashboard);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [docSpecialty, setDocSpecialty] = useState('Cardiology');
  const [docHospital, setDocHospital] = useState('');
  const [docPriority, setDocPriority] = useState('Medium');
  const [docStatus, setDocStatus] = useState('Target');
  
  // Resetting button state
  const [seeding, setSeeding] = useState(false);

  // Active chart tooltip state
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);

  useEffect(() => {
    dispatch(fetchDashboardData());
  }, [dispatch]);

  const handleSeedDb = async () => {
    setSeeding(true);
    try {
      await axios.post('/api/db/seed');
      dispatch(showToast('Database reset and seeded successfully!', 'success'));
      dispatch(fetchDashboardData());
    } catch (err) {
      dispatch(showToast('DB seed failed.', 'error'));
    } finally {
      setSeeding(false);
    }
  };

  const handleAddDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName || !docHospital) {
      dispatch(showToast('Please fill out Name and Hospital.', 'warning'));
      return;
    }

    try {
      await dispatch(createDoctor({
        name: docName,
        specialty: docSpecialty,
        hospital: docHospital,
        priority: docPriority,
        status: docStatus,
      })).unwrap();

      dispatch(showToast(`HCP ${docName} added successfully!`, 'success'));
      setIsModalOpen(false);
      setDocName('');
      setDocHospital('');
      dispatch(fetchDashboardData());
    } catch (err: any) {
      dispatch(showToast(err || 'Failed to add doctor.', 'error'));
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 min-h-screen flex flex-col items-center justify-center">
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-6 rounded-2xl max-w-md">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-base font-bold text-red-800 dark:text-red-400 mb-2">Error loading dashboard</h3>
          <p className="text-xs text-red-650 dark:text-red-500 mb-4">{error}</p>
          <button 
            onClick={() => dispatch(fetchDashboardData())}
            className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-500 font-bold text-xs"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Fallbacks for data structures
  const stats = data?.stats || {
    doctors_visited: 0,
    meetings_today: 0,
    pending_followups: 0,
    high_priority_count: 0,
    positive_interactions_count: 0,
    top_product: 'CardioShield',
    high_opportunity_count: 0
  };

  const sentimentDist = data?.sentiment_distribution || { Positive: 0, Neutral: 0, Negative: 0 };
  const productDist = data?.product_distribution || [];
  const hospitalDist = data?.hospital_distribution || [];
  const followupDist = data?.followup_distribution || { Pending: 0, Completed: 0 };
  const monthlyTrend = data?.monthly_trend || [];
  const aiRecommendations = data?.ai_recommendations || [];
  const upcomingFollowups = data?.upcoming_followups || [];
  const recentActivity = data?.recent_activity || [];

  // Greeting helper
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 transition-colors">
      
      {/* Top Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-5">
        <div>
          <span className="text-[10px] bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
            Enterprise CRM Workspace
          </span>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1.5">
            Pharma Executive Console
          </h2>
        </div>
        
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4.5 py-2.5 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/10 hover:shadow-brand-500/25 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New HCP</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSeedDb}
            disabled={seeding}
            className="flex items-center justify-center gap-2 px-4.5 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer"
            title="Reset to sample records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
            <span>{seeding ? 'Syncing...' : 'Reset CRM Data'}</span>
          </motion.button>
        </div>
      </div>

      {/* Grid: Main Section vs AI Copilot Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* Left 3 Columns: Core Analytics, KPI, Insights, Charts */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* KPI Dashboard Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading && !data ? (
              Array.from({ length: 4 }).map((_, idx) => <CardSkeleton key={idx} />)
            ) : (
              <>
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-glass dark:shadow-glassDark hover:-translate-y-0.5 transition-all duration-250 flex flex-col justify-between h-32"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">HCP Contacts</span>
                    <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400">
                      <UserCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100">{stats.doctors_visited}</h3>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 font-medium mt-1">Physician accounts detailed</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-glass dark:shadow-glassDark hover:-translate-y-0.5 transition-all duration-250 flex flex-col justify-between h-32"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Meetings Today</span>
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100">{stats.meetings_today}</h3>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 font-medium mt-1">Visits completed today</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-glass dark:shadow-glassDark hover:-translate-y-0.5 transition-all duration-250 flex flex-col justify-between h-32"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Follow-Up Tasks</span>
                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100">{stats.pending_followups}</h3>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 font-medium mt-1">Pending CRM deliverables</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-glass dark:shadow-glassDark hover:-translate-y-0.5 transition-all duration-250 flex flex-col justify-between h-32"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">High Priority Targets</span>
                    <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                      <Flame className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100">{stats.high_priority_count}</h3>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 font-medium mt-1">HCPs flagged for visit</p>
                  </div>
                </motion.div>
              </>
            )}
          </div>

          {/* AI INSIGHTS WIDGETS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Positive Interactions */}
            <div className="p-4.5 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-650 text-white shadow-lg shadow-brand-500/10 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-brand-200">AI Relationship Index</span>
                <h4 className="text-lg font-black">{stats.positive_interactions_count} Positive Visits</h4>
                <p className="text-[10px] text-brand-100 font-medium">Receptive sentiment feedback</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shrink-0">
                <HeartHandshake className="w-6 h-6" />
              </div>
            </div>

            {/* Top Performing Product */}
            <div className="p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-glass flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">Trending Product</span>
                <h4 className="text-lg font-black text-slate-800 dark:text-slate-100">{stats.top_product}</h4>
                <p className="text-[10px] text-slate-450 dark:text-slate-400 font-medium">Highest representative engagement</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-brand-500 flex items-center justify-center shrink-0">
                <FileBadge2 className="w-6 h-6" />
              </div>
            </div>

            {/* High Opportunity Target HCPs */}
            <div className="p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-glass flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">High Opportunity Targets</span>
                <h4 className="text-lg font-black text-slate-800 dark:text-slate-100">{stats.high_opportunity_count} Doctors</h4>
                <p className="text-[10px] text-slate-450 dark:text-slate-400 font-medium">Critical HCP pipeline assets</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-red-500 flex items-center justify-center shrink-0">
                <Landmark className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* SVG CHARTS GRID MODULE */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
              <TrendingUp className="w-5 h-5 text-brand-500" />
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Prescription & Representative Analytics
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Chart 1: Monthly Interactions (SVG Bar Chart) */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-glass flex flex-col justify-between min-h-80">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350">Monthly Interactions Log</h4>
                  <BarChart3 className="w-4 h-4 text-slate-400" />
                </div>
                
                {/* SVG Drawing area */}
                <div className="flex-1 w-full flex items-end h-40 relative group">
                  <svg className="w-full h-full" viewBox="0 0 240 140">
                    {/* Gridlines */}
                    <line x1="10" y1="20" x2="230" y2="20" stroke="#f1f5f9" strokeWidth="1" className="dark:stroke-slate-800/60" />
                    <line x1="10" y1="60" x2="230" y2="60" stroke="#f1f5f9" strokeWidth="1" className="dark:stroke-slate-800/60" />
                    <line x1="10" y1="100" x2="230" y2="100" stroke="#f1f5f9" strokeWidth="1" className="dark:stroke-slate-800/60" />
                    <line x1="10" y1="120" x2="230" y2="120" stroke="#e2e8f0" strokeWidth="1.5" className="dark:stroke-slate-800" />
                    
                    {/* Columns */}
                    {monthlyTrend.map((item: any, idx: number) => {
                      const maxVal = Math.max(...monthlyTrend.map((d: any) => d.visits)) || 30;
                      const colHeight = (item.visits / maxVal) * 90;
                      const colWidth = 22;
                      const spacing = 36;
                      const x = 20 + idx * spacing;
                      const y = 120 - colHeight;

                      return (
                        <g key={idx}>
                          <defs>
                            <linearGradient id={`barGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#38abf8" />
                              <stop offset="100%" stopColor="#0273c7" />
                            </linearGradient>
                          </defs>
                          <motion.rect
                            initial={{ height: 0, y: 120 }}
                            animate={{ height: colHeight, y: y }}
                            transition={{ duration: 0.6, delay: idx * 0.05 }}
                            x={x}
                            y={y}
                            width={colWidth}
                            height={colHeight}
                            rx={4}
                            fill={`url(#barGrad-${idx})`}
                            className="cursor-pointer hover:opacity-90"
                            onMouseEnter={() => setHoveredBar(idx)}
                            onMouseLeave={() => setHoveredBar(null)}
                          />
                          <text x={x + colWidth / 2} y="135" textAnchor="middle" className="text-[9px] font-bold fill-slate-400">
                            {item.month}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  
                  {/* Absolute Tooltip over hovered bar */}
                  <AnimatePresence>
                    {hoveredBar !== null && monthlyTrend[hoveredBar] && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-slate-950 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg shadow-lg border border-slate-800 z-10 text-center"
                      >
                        <p>{monthlyTrend[hoveredBar].month}: {monthlyTrend[hoveredBar].visits} Visits</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Chart 2: Sentiment Distribution (Data-driven SVG Bar Chart) */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-glass flex flex-col justify-between min-h-80">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350">HCP Sentiment Volume</h4>
                  <PieChart className="w-4 h-4 text-slate-400" />
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center">
                  {/* Data-driven sentiment bar chart */}
                  {(() => {
                    const total = (sentimentDist.Positive + sentimentDist.Neutral + sentimentDist.Negative) || 1;
                    const bars = [
                      { label: 'Positive', value: sentimentDist.Positive, color: '#10b981', bg: '#d1fae5' },
                      { label: 'Neutral',  value: sentimentDist.Neutral,  color: '#94a3b8', bg: '#f1f5f9' },
                      { label: 'Negative', value: sentimentDist.Negative, color: '#ef4444', bg: '#fee2e2' },
                    ];
                    const maxVal = Math.max(...bars.map(b => b.value)) || 1;
                    return (
                      <svg className="w-full h-28" viewBox="0 0 200 110">
                        <defs>
                          {bars.map((b, i) => (
                            <linearGradient key={i} id={`sentGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={b.color} stopOpacity="0.9" />
                              <stop offset="100%" stopColor={b.color} stopOpacity="0.5" />
                            </linearGradient>
                          ))}
                        </defs>
                        {/* Grid lines */}
                        {[25, 50, 75].map(y => (
                          <line key={y} x1="10" y1={y} x2="190" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                        ))}
                        {bars.map((b, i) => {
                          const barH = (b.value / maxVal) * 70;
                          const x = 28 + i * 58;
                          return (
                            <g key={i}>
                              <rect x={x} y={95 - barH} width={38} height={barH} rx={5} fill={`url(#sentGrad-${i})`} />
                              <text x={x + 19} y={108} textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="700">{b.label}</text>
                              <text x={x + 19} y={93 - barH} textAnchor="middle" fontSize="8" fill={b.color} fontWeight="900">{b.value}</text>
                            </g>
                          );
                        })}
                      </svg>
                    );
                  })()}
                  
                  <div className="grid grid-cols-3 gap-2 w-full text-center mt-3 text-[10px] font-bold">
                    <div className="p-1 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/40">
                      Positive: {sentimentDist.Positive}
                    </div>
                    <div className="p-1 rounded bg-slate-50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 border border-slate-200/45">
                      Neutral: {sentimentDist.Neutral}
                    </div>
                    <div className="p-1 rounded bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400 border border-red-100/40">
                      Negative: {sentimentDist.Negative}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart 3: Products Discussed (Data-driven SVG Donut Chart) */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-glass flex flex-col justify-between min-h-80">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350">Product Share Mix</h4>
                  <Sparkles className="w-4 h-4 text-slate-400" />
                </div>
                
                <div className="flex-1 w-full flex items-center justify-center relative">
                  {(() => {
                    const COLORS = ['#38abf8', '#818cf8', '#10b981', '#f59e0b', '#ef4444'];
                    const CIRCUMFERENCE = 2 * Math.PI * 36; // ~226.2
                    const realDist = productDist.filter((p: any) => !['General Discussion','General Product','therapeutic options'].includes(p.name));
                    const totalVisits = realDist.reduce((acc: number, p: any) => acc + p.value, 0) || 1;
                    let offset = 0;
                    return (
                      <>
                        <svg className="w-32 h-32" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="36" fill="transparent" stroke="#f1f5f9" strokeWidth="10" className="dark:stroke-slate-800" />
                          {realDist.slice(0, 5).map((item: any, idx: number) => {
                            const pct = item.value / totalVisits;
                            const dash = pct * CIRCUMFERENCE;
                            const gap = CIRCUMFERENCE - dash;
                            const rot = (offset / totalVisits) * 360 - 90;
                            offset += item.value;
                            return (
                              <circle
                                key={idx}
                                cx="50" cy="50" r="36"
                                fill="transparent"
                                stroke={COLORS[idx % COLORS.length]}
                                strokeWidth="10"
                                strokeDasharray={`${dash} ${gap}`}
                                strokeDashoffset="0"
                                style={{ transformOrigin: '50px 50px', transform: `rotate(${rot}deg)` }}
                              />
                            );
                          })}
                          <text x="50" y="47" textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="700">Total</text>
                          <text x="50" y="58" textAnchor="middle" fontSize="12" fill="#1e293b" fontWeight="900">{totalVisits}</text>
                        </svg>
                        {/* Legend */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 text-[9px] font-bold text-slate-450">
                          {realDist.slice(0, 4).map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                              <span className="truncate max-w-[60px] text-slate-650 dark:text-slate-350">{item.name}</span>
                              <span className="text-slate-400">({item.value})</span>
                            </div>
                          ))}
                          {realDist.length === 0 && <span className="text-slate-400 text-[8px]">No data yet</span>}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Chart 4: Hospital Distribution (Horizontal bars) */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-glass flex flex-col justify-between min-h-80 md:col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350">HCP Hospital Distribution</h4>
                  <Landmark className="w-4 h-4 text-slate-400" />
                </div>
                
                <div className="flex-1 space-y-3.5">
                  {hospitalDist.slice(0, 4).map((item: any, idx: number) => {
                    const total = hospitalDist.reduce((acc: number, cur: any) => acc + cur.value, 0) || 10;
                    const pct = Math.round((item.value / total) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                          <span className="text-slate-400">{item.value} HCPs ({pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-950 overflow-hidden border border-slate-200/10">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: idx * 0.05 }}
                            className={`h-full rounded-full bg-gradient-to-r ${
                              idx === 0 
                                ? 'from-blue-500 to-cyan-400' 
                                : idx === 1 
                                ? 'from-indigo-500 to-purple-400' 
                                : 'from-slate-400 to-slate-300'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart 5: Follow-up Completion Status */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-glass flex flex-col justify-between min-h-80">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350">Task Completion Rate</h4>
                  <CheckSquare className="w-4 h-4 text-slate-400" />
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="3" className="dark:stroke-slate-850" />
                      {/* Completion Segment */}
                      {(() => {
                        const total = (followupDist.Completed + followupDist.Pending) || 1;
                        const pct = (followupDist.Completed / total) * 100;
                        const offset = 100 - pct;
                        return (
                          <circle 
                            cx="18" 
                            cy="18" 
                            r="15.915" 
                            fill="transparent" 
                            stroke="#10b981" 
                            strokeWidth="3" 
                            strokeDasharray={`${pct} ${offset}`} 
                            strokeDashoffset="0" 
                          />
                        );
                      })()}
                    </svg>
                    
                    <div className="text-center">
                      <span className="text-xl font-black text-slate-800 dark:text-slate-100">
                        {Math.round((followupDist.Completed / ((followupDist.Completed + followupDist.Pending) || 1)) * 100)}%
                      </span>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Success Rate</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 text-[9px] font-bold mt-4">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-500">Done: {followupDist.Completed}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      <span className="text-slate-500">Pending: {followupDist.Pending}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right 1 Column: AI COPILOT SIDEBAR PANEL */}
        <div className="space-y-6">
          {/* AI Copilot Card */}
          <div className="rounded-2xl border border-slate-200/50 dark:border-slate-800/60 bg-white dark:bg-slate-900 shadow-glass overflow-hidden">
            <div className="bg-gradient-to-tr from-brand-650 to-brand-500 p-5 text-white flex items-start justify-between relative overflow-hidden">
              {/* Background gradient sphere */}
              <div className="absolute -right-10 -top-10 w-28 h-28 rounded-full bg-white/10 blur-xl"></div>
              
              <div className="space-y-1 relative z-10">
                <span className="text-[9px] font-bold uppercase text-brand-200 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  <span>Agent Copilot Engine</span>
                </span>
                <h3 className="text-base font-extrabold">{getGreeting()}, Rep</h3>
                <p className="text-[10px] text-brand-100 font-medium">Diagnostic suggestions calculated</p>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Recommendations Section */}
              <div className="space-y-3">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">AI Priority Checklist</span>
                
                <div className="space-y-2.5">
                  {loading && !data ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                      <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                    </div>
                  ) : aiRecommendations.length > 0 ? (
                    aiRecommendations.map((rec: any, idx: number) => (
                      <div 
                        key={idx} 
                        onClick={() => {
                          if (rec.doctor_name !== 'System Alert') {
                            navigate('/log', { state: { doctorName: rec.doctor_name }});
                          }
                        }}
                        className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-900/10 hover:border-brand-300 dark:hover:border-brand-900/40 hover:bg-white dark:hover:bg-slate-950/40 transition-all cursor-pointer flex gap-3 group"
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                          rec.type === 'Urgent Visit' 
                            ? 'bg-red-50 dark:bg-red-950/40 text-red-500 border-red-100 dark:border-red-900/20' 
                            : rec.type === 'CRM Tasks'
                            ? 'bg-slate-50 dark:bg-slate-850 text-slate-500 border-slate-200 dark:border-slate-800'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-500 border-amber-100 dark:border-amber-900/20'
                        }`}>
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-brand-600 transition-colors">
                            {rec.doctor_name}
                          </h5>
                          <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5 leading-relaxed">
                            {rec.message}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      No strategic alerts. You are fully up to date!
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-850">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Quick AI Strategist Triggers</span>
                
                <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-bold text-slate-650 dark:text-slate-350">
                  <div 
                    onClick={() => navigate('/doctors')}
                    className="p-3 border border-slate-250/20 rounded-xl bg-slate-50/10 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer transition-all flex flex-col items-center gap-1.5"
                  >
                    <BookOpen className="w-4 h-4 text-brand-500" />
                    <span>Trigger Summary</span>
                  </div>
                  
                  <div 
                    onClick={() => navigate('/doctors')}
                    className="p-3 border border-slate-250/20 rounded-xl bg-slate-50/10 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer transition-all flex flex-col items-center gap-1.5"
                  >
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span>Prepare Meeting</span>
                  </div>

                  <div 
                    onClick={() => navigate('/log', { state: { activeTab: 'ai' } })}
                    className="p-3 border border-slate-250/20 rounded-xl bg-slate-50/10 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer transition-all flex flex-col items-center gap-1.5"
                  >
                    <Brain className="w-4 h-4 text-emerald-500" />
                    <span>Log by Chat</span>
                  </div>

                  <div 
                    onClick={() => setIsModalOpen(true)}
                    className="p-3 border border-slate-250/20 rounded-xl bg-slate-50/10 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer transition-all flex flex-col items-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4 text-indigo-500" />
                    <span>Register HCP</span>
                  </div>
                </div>
              </div>


            </div>
          </div>
          
          {/* Timeline of Followups Due Soon */}
          <div className="rounded-2xl border border-slate-200/50 dark:border-slate-800/60 bg-white dark:bg-slate-900 p-5 shadow-glass">
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-4">
              Impending Deliverables
            </h3>
            
            <div className="space-y-3">
              {loading && !data ? (
                <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
              ) : upcomingFollowups.length > 0 ? (
                upcomingFollowups.slice(0, 3).map((f: any) => (
                  <div key={f.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-900/10 flex gap-2.5 items-start">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-100/40">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">{f.title}</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5">HCP: {f.doctor_name}</p>
                      <div className="flex items-center justify-between mt-1 text-[9px] font-bold text-slate-400">
                        <span>Due: {f.due_date}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase ${
                          f.priority === 'High' ? 'bg-red-55 text-red-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {f.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-slate-400 text-xs">
                  No upcoming due follow-ups.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Add Doctor Overlay Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 glass-card animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 mb-4 tracking-tight">Register Physician Target</h3>
            <form onSubmit={handleAddDoctorSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-550 dark:text-slate-400 mb-1.5">Doctor Full Name</label>
                <input 
                  type="text" 
                  value={docName} 
                  required
                  onChange={(e) => setDocName(e.target.value)} 
                  placeholder="e.g. Dr. Robert Chen"
                  className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-500 dark:text-slate-100 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-550 dark:text-slate-400 mb-1.5">Therapeutic Specialty</label>
                  <select 
                    value={docSpecialty} 
                    onChange={(e) => setDocSpecialty(e.target.value)}
                    className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-500 dark:text-slate-100 font-medium"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Endocrinology">Endocrinology</option>
                    <option value="Pulmonology">Pulmonology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="General Medicine">General Medicine</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-550 dark:text-slate-400 mb-1.5">Priority Classification</label>
                  <select 
                    value={docPriority} 
                    onChange={(e) => setDocPriority(e.target.value)}
                    className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-500 dark:text-slate-100 font-medium"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-550 dark:text-slate-400 mb-1.5">Practice Clinic / Hospital</label>
                <input 
                  type="text" 
                  value={docHospital} 
                  required
                  onChange={(e) => setDocHospital(e.target.value)} 
                  placeholder="e.g. Grace General Hospital"
                  className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-500 dark:text-slate-100 font-medium"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-500 active:scale-98 transition-all cursor-pointer"
                >
                  Register target HCP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
