"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  LayoutDashboard,
  Upload,
  GraduationCap,
  Trophy,
  BookOpen,
  FileText,
  Settings,
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  ChevronRight,
  Filter,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Play,
  Check,
  Download,
  Share2,
  Clock,
  Eye,
  RefreshCw,
  AlertCircle,
  Trash2,
  UserCheck
} from 'lucide-react';

import {
  INITIAL_STUDENTS,
  Student,
  SubjectScores,
  SUBJECT_NAMES,
  addStudentAndReRank,
  calculateGrade,
  sortAndRankStudents
} from '../utils/studentData';
import { supabase } from '../lib/supabase';

export default function Home() {
  // --- UI and Theme State ---
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; time: string; read: boolean }>>([
    { id: '1', text: 'OCR extraction completed for Emily Watson.', time: '5m ago', read: false },
    { id: '2', text: 'Overall class average increased to 74.3%.', time: '1h ago', read: true },
    { id: '3', text: 'Lucas Silva flagged for Chemistry performance.', time: '2h ago', read: true }
  ]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  // --- Core Application State ---
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // --- Upload State ---
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStep, setUploadStep] = useState<number>(0); // 0=idle, 1=uploading, 2=OCR scanning, 3=AI structuring, 4=success
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [ocrLogs, setOcrLogs] = useState<string[]>([]);
  const [ocrPreviewData, setOcrPreviewData] = useState<{
    name: string;
    rollNumber: string;
    className: string;
    scores: SubjectScores;
  }>({
    name: 'Rohan Sen',
    rollNumber: '2026A08',
    className: 'Grade 12-A',
    scores: { mathematics: 88, physics: 82, chemistry: 85, english: 79, computerScience: 94 }
  });

  // --- Rankings Grid State ---
  const [rankSearch, setRankSearch] = useState<string>('');
  const [rankClassFilter, setRankClassFilter] = useState<string>('all');
  const [rankSortColumn, setRankSortColumn] = useState<'rank' | 'name' | 'percentage'>('rank');
  const [rankSortDir, setRankSortDir] = useState<'asc' | 'desc'>('asc');

  // --- Subject Analytics State ---
  const [subjectSelected, setSubjectSelected] = useState<keyof SubjectScores>('mathematics');

  // --- Fetch students from Supabase ---
  const fetchStudents = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*');

      if (error) {
        setDbError(error.message);
        console.error("Error fetching students:", error);
      } else {
        const mapped: Omit<Student, 'rank'>[] = (data || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          rollNumber: row.roll_number,
          className: row.class_name,
          scores: row.scores,
          totalObtained: row.total_obtained,
          maxTotal: row.max_total || 500,
          percentage: row.percentage,
          grade: row.grade,
          status: row.status,
          aiInsights: {
            strongestSubject: row.ai_insights?.strongestSubject || 'Unknown',
            weakestSubject: row.ai_insights?.weakestSubject || 'Unknown',
            improvementSuggestion: row.ai_insights?.improvementSuggestion || 'None',
            trend: row.ai_insights?.trend || 'stable'
          }
        }));

        const ranked = sortAndRankStudents(mapped);
        setStudentsList(ranked);
      }
    } catch (e: any) {
      setDbError(e.message || "An unexpected error occurred connecting to database.");
    } finally {
      setLoading(false);
    }
  };

  // --- Setup initial dataset ---
  useEffect(() => {
    fetchStudents();
  }, []);

  // Sync theme to root element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Helper: Seed/Reset database in Supabase
  const handleResetData = async () => {
    if (confirm('Are you sure you want to seed/reset the database to the 12 original mock records? This will delete all current database records.')) {
      setLoading(true);
      try {
        // Delete all current records
        const { error: deleteError } = await supabase
          .from('students')
          .delete()
          .neq('id', '_invalid_placeholder_id_');

        if (deleteError) {
          alert(`Supabase Delete Error: ${deleteError.message}`);
          console.error(deleteError);
          return;
        }

        // Prep insert rows
        const dbRows = INITIAL_STUDENTS.map(s => ({
          id: s.id,
          name: s.name,
          roll_number: s.rollNumber,
          class_name: s.className,
          scores: s.scores,
          total_obtained: s.totalObtained,
          max_total: s.maxTotal,
          percentage: s.percentage,
          grade: s.grade,
          status: s.status,
          ai_insights: s.aiInsights
        }));

        // Insert mock records
        const { error: insertError } = await supabase
          .from('students')
          .insert(dbRows);

        if (insertError) {
          alert(`Supabase Seed Error: ${insertError.message}. Make sure you ran the SQL schema in your Supabase editor!`);
          console.error(insertError);
        } else {
          await fetchStudents();
          // Notify
          const newNotif = {
            id: Date.now().toString(),
            text: 'Database successfully seeded with 12 mock student records.',
            time: 'Just now',
            read: false
          };
          setNotifications(prev => [newNotif, ...prev]);
        }
      } catch (e: any) {
        alert(`Reset failed: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // --- OCR Progress Simulator ---
  const ocrIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startOcrSimulation = () => {
    if (!uploadFile) return;
    setUploadStep(1);
    setUploadProgress(0);
    setOcrLogs(['Establishing secure channel connection...', 'Uploading source document files...']);

    let progressVal = 0;
    const interval = setInterval(() => {
      progressVal += 10;
      setUploadProgress(progressVal);

      // Phase changes based on progress
      if (progressVal === 30) {
        setUploadStep(2);
        setOcrLogs(prev => [...prev, 'Upload completed. Initiating OCR Vision Engine...', 'Detecting document boundary matrices...', 'Analyzing cell grid lines...']);
      } else if (progressVal === 60) {
        setUploadStep(3);
        setOcrLogs(prev => [...prev, 'Text blocks parsed. Triggering AI Structuring LLM...', 'Identifying entity nodes (Roll Number, Student Name)...', 'Extracting exam scoring tabular rows...', 'Performing cross-validation check sums...']);
      } else if (progressVal === 100) {
        setUploadStep(4);
        clearInterval(interval);
        setOcrLogs(prev => [...prev, 'AI Parsing successful. Entity mapping finished.', 'Result verified. Ready for database submission.']);
        // Push notification
        const newNotif = {
          id: Date.now().toString(),
          text: `OCR extracted result for ${ocrPreviewData.name}. Ready to confirm.`,
          time: 'Just now',
          read: false
        };
        setNotifications(prev => [newNotif, ...prev]);
      }
    }, 600);
  };

  const handleConfirmOcrAdd = async () => {
    setLoading(true);
    
    const totalObtained = 
      ocrPreviewData.scores.mathematics +
      ocrPreviewData.scores.physics +
      ocrPreviewData.scores.chemistry +
      ocrPreviewData.scores.english +
      ocrPreviewData.scores.computerScience;
    
    const maxTotal = 500;
    const percentage = parseFloat(((totalObtained / maxTotal) * 100).toFixed(1));
    const grade = calculateGrade(percentage);
    const hasFailed = Object.values(ocrPreviewData.scores).some(score => score < 40);
    const status = hasFailed ? 'Fail' : 'Pass';

    // Compute AI insights dynamically
    const entries = Object.entries(ocrPreviewData.scores) as [keyof SubjectScores, number][];
    const sortedScores = [...entries].sort((a, b) => b[1] - a[1]);
    const strongest = SUBJECT_NAMES[sortedScores[0][0]];
    const weakest = SUBJECT_NAMES[sortedScores[sortedScores.length - 1][0]];
    
    let suggestion = '';
    if (percentage >= 90) {
      suggestion = `Outstanding potential shown in ${strongest}. Recommended for advanced studies or mentoring peers.`;
    } else if (percentage >= 75) {
      suggestion = `Solid foundation. Focus on bridging the gap in ${weakest} to enter the elite score bracket.`;
    } else if (percentage >= 55) {
      suggestion = `Moderate performance. Increase weekly revision hours in ${weakest} and practice past examination papers.`;
    } else {
      suggestion = `Needs immediate support. Enlist ${ocrPreviewData.name} in remedial classes for ${weakest} and monitor weekly logs.`;
    }

    const aiInsights = {
      strongestSubject: strongest,
      weakestSubject: weakest,
      improvementSuggestion: suggestion,
      trend: percentage >= 80 ? 'improving' : 'stable',
    };

    const newStudentId = 's' + (studentsList.length + 1) + '_' + Date.now();

    const dbRow = {
      id: newStudentId,
      name: ocrPreviewData.name,
      roll_number: ocrPreviewData.rollNumber,
      class_name: ocrPreviewData.className,
      scores: ocrPreviewData.scores,
      total_obtained: totalObtained,
      max_total: maxTotal,
      percentage: percentage,
      grade: grade,
      status: status,
      ai_insights: aiInsights
    };

    try {
      const { error } = await supabase.from('students').insert([dbRow]);
      if (error) {
        alert(`Supabase Error: ${error.message}. Make sure the table exists!`);
        console.error(error);
      } else {
        // Refresh local list
        await fetchStudents();
        
        // Push notification
        const newNotif = {
          id: Date.now().toString(),
          text: `Added ${ocrPreviewData.name} to the database.`,
          time: 'Just now',
          read: false
        };
        setNotifications(prev => [newNotif, ...prev]);
        
        // Reset upload state
        setUploadFile(null);
        setUploadStep(0);
        setUploadProgress(0);
        setOcrLogs([]);
        setActiveTab('rankings');
      }
    } catch (e: any) {
      alert(`Database insertion failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from the database?`)) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('students')
          .delete()
          .eq('id', id);

        if (error) {
          alert(`Supabase Error: ${error.message}`);
          console.error(error);
        } else {
          await fetchStudents();
          // Push notification
          const newNotif = {
            id: Date.now().toString(),
            text: `Removed ${name} from the database.`,
            time: 'Just now',
            read: false
          };
          setNotifications(prev => [newNotif, ...prev]);
        }
      } catch (e: any) {
        alert(`Deletion failed: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // --- Dynamic Dashboard Metrics ---
  const stats = useMemo(() => {
    if (studentsList.length === 0) return { total: 0, avgPct: 0, passPct: 0, highest: 0 };
    const total = studentsList.length;
    const sumPercentages = studentsList.reduce((acc, s) => acc + s.percentage, 0);
    const avgPct = parseFloat((sumPercentages / total).toFixed(1));
    const highest = Math.max(...studentsList.map(s => s.percentage));
    const passCount = studentsList.filter(s => s.status === 'Pass').length;
    const passPct = parseFloat(((passCount / total) * 100).toFixed(1));

    return { total, avgPct, passPct, highest };
  }, [studentsList]);

  // Subject analytical breakdown
  const subjectAverages = useMemo(() => {
    if (studentsList.length === 0) return {} as Record<keyof SubjectScores, { avg: number; min: number; max: number; topperName: string }>;
    const keys: (keyof SubjectScores)[] = ['mathematics', 'physics', 'chemistry', 'english', 'computerScience'];

    const result = {} as Record<keyof SubjectScores, { avg: number; min: number; max: number; topperName: string }>;

    keys.forEach(key => {
      let sum = 0;
      let min = 100;
      let max = 0;
      let topperVal = -1;
      let topperName = '';

      studentsList.forEach(s => {
        const val = s.scores[key];
        sum += val;
        if (val < min) min = val;
        if (val > max) max = val;
        if (val > topperVal) {
          topperVal = val;
          topperName = s.name;
        }
      });

      result[key] = {
        avg: parseFloat((sum / studentsList.length).toFixed(1)),
        min,
        max,
        topperName
      };
    });

    return result;
  }, [studentsList]);

  // Grade groupings
  const gradeDistribution = useMemo(() => {
    const counts = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    studentsList.forEach(s => {
      if (s.grade in counts) {
        counts[s.grade as keyof typeof counts] += 1;
      }
    });
    return counts;
  }, [studentsList]);

  // --- Rankings Filtering & Sorting ---
  const filteredStudents = useMemo(() => {
    let list = [...studentsList];

    // Search filter
    if (rankSearch.trim()) {
      const q = rankSearch.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q));
    }

    // Class filter
    if (rankClassFilter !== 'all') {
      list = list.filter(s => s.className === rankClassFilter);
    }

    // Sorting
    list.sort((a, b) => {
      let valA: any = a[rankSortColumn];
      let valB: any = b[rankSortColumn];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return rankSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return rankSortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [studentsList, rankSearch, rankClassFilter, rankSortColumn, rankSortDir]);

  return (
    <div className="min-h-screen relative grid-bg selection:bg-indigo-500/30 dark:bg-[#070b13] bg-slate-50 transition-colors duration-300">
      
      {/* Background Animated Gradient Meshes */}
      <div className="animated-mesh opacity-80" />

      {/* --- LANDING VIEW --- */}
      {activeTab === 'landing' && (
        <div className="flex flex-col min-h-screen">
          {/* Landing Header */}
          <header className="w-full border-b border-indigo-500/10 dark:border-white/5 py-4 px-6 md:px-12 flex items-center justify-between glass-panel sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 rounded-xl shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-6 h-6 text-white pulse-node" />
              </div>
              <span className="font-bold text-xl md:text-2xl bg-gradient-to-r from-indigo-900 via-indigo-700 to-cyan-600 dark:from-white dark:via-indigo-200 dark:to-cyan-400 bg-clip-text text-transparent tracking-tight">
                ResultIntel.ai
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Light/Dark Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all"
                title="Toggle Theme"
              >
                {darkMode ? <Sun className="w-5 h-5 text-indigo-300" /> : <Moon className="w-5 h-5 text-indigo-900" />}
              </button>

              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-white dark:text-indigo-950 dark:hover:bg-slate-100 text-white transition-all shadow-md hover:scale-[1.02]"
              >
                Go to Dashboard
              </button>
            </div>
          </header>

          {/* Hero Section */}
          <main className="flex-1 max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20 grid md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5" /> Next-Gen AI Academics Analytics
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] dark:text-white text-slate-900">
                Transform Academic Results into{" "}
                <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300 bg-clip-text text-transparent">
                  Actionable Intelligence
                </span>
              </h1>

              <p className="text-base md:text-lg dark:text-slate-400 text-slate-600 leading-relaxed max-w-xl">
                Upload result PDFs or images and instantly generate rankings, subject-wise toppers, performance insights, and visual analytics using our advanced AI-powered OCR.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <button
                  onClick={() => {
                    setActiveTab('upload');
                    // We need layout transition to dashboard shell but target view upload
                  }}
                  className="px-8 py-3.5 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white hover:opacity-95 shadow-lg shadow-indigo-500/20 dark:shadow-indigo-500/10 hover:scale-[1.02] transition-all flex items-center gap-2.5"
                >
                  <Upload className="w-5 h-5" /> Upload Result
                </button>
                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                  }}
                  className="px-8 py-3.5 text-base font-semibold rounded-xl dark:bg-white/5 dark:text-white dark:border-white/10 bg-slate-200/60 text-slate-800 border border-slate-300/50 hover:bg-slate-200 dark:hover:bg-white/10 transition-all hover:scale-[1.02]"
                >
                  Watch Demo
                </button>
              </div>

              {/* Floating micro stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-indigo-500/10 dark:border-white/5">
                <div>
                  <h4 className="text-2xl md:text-3xl font-bold dark:text-white text-slate-900">99.8%</h4>
                  <p className="text-xs dark:text-slate-400 text-slate-500 font-medium mt-1">AI OCR Accuracy</p>
                </div>
                <div>
                  <h4 className="text-2xl md:text-3xl font-bold dark:text-white text-slate-900">&lt; 3s</h4>
                  <p className="text-xs dark:text-slate-400 text-slate-500 font-medium mt-1">Extraction Speed</p>
                </div>
                <div>
                  <h4 className="text-2xl md:text-3xl font-bold dark:text-white text-slate-900">12k+</h4>
                  <p className="text-xs dark:text-slate-400 text-slate-500 font-medium mt-1">Sheets Parsed</p>
                </div>
              </div>
            </div>

            {/* Interactive Preview Mockup Card */}
            <div className="md:col-span-5 relative w-full h-[380px] md:h-[450px]">
              {/* Outer Glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/30 to-cyan-500/20 blur-[60px] rounded-full z-0 pointer-events-none" />

              <div className="absolute inset-0 z-10 glass-panel rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                {/* Mockup Header */}
                <div className="w-full h-11 bg-slate-900/60 dark:bg-black/40 border-b border-white/5 px-4 flex items-center justify-between">
                  <div className="flex gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <span className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-xs dark:text-slate-400 text-slate-400 font-mono">ocr_document_scan.pdf</span>
                  <div className="w-4" />
                </div>

                {/* Mockup Content */}
                <div className="p-6 h-[calc(100%-44px)] flex flex-col justify-between relative dark:bg-[#0c101d] bg-white">
                  
                  {/* OCR Scanning Line Visual */}
                  <div className="ocr-scanner-line" />

                  {/* Document Content Skeleton */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-indigo-500/10 pb-3">
                      <div>
                        <div className="h-5 w-40 bg-slate-300 dark:bg-slate-700 rounded-md skeleton-shimmer" />
                        <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded mt-2 skeleton-shimmer" />
                      </div>
                      <div className="h-8 w-8 rounded bg-cyan-500/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-cyan-400 pulse-node" />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {[1, 2, 3, 4].map(idx => (
                        <div key={idx} className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/50">
                          <div className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] flex items-center justify-center font-bold">{idx}</span>
                            <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded skeleton-shimmer" />
                          </div>
                          <div className="h-4.5 w-12 bg-indigo-500/20 dark:bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-md font-mono text-xs flex items-center justify-center font-bold">
                            9{8 - idx}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Transformed Structuring Visual */}
                  <div className="p-4 rounded-xl border border-emerald-500/20 dark:bg-emerald-950/15 bg-emerald-50/50 flex gap-4 items-center">
                    <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-500">
                      <Check className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-xs dark:text-emerald-400 text-emerald-600 font-bold uppercase tracking-wider">AI Structuring Complete</p>
                      <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5">Parsed 5 subject fields and auto-calculated Rank #1</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Cards */}
              <div className="absolute -bottom-6 -left-8 z-20 glass-card p-4 rounded-xl shadow-xl flex items-center gap-3.5 border border-white/10 max-w-[200px] text-left">
                <div className="p-2 rounded-lg bg-cyan-500/25 text-cyan-500">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] dark:text-slate-400 text-slate-500 uppercase font-bold">Topper Trend</p>
                  <p className="text-sm font-extrabold dark:text-white text-slate-800">Aarav S. (+4.2%)</p>
                </div>
              </div>

              <div className="absolute -top-6 -right-6 z-20 glass-card p-4 rounded-xl shadow-xl flex items-center gap-3.5 border border-white/10 max-w-[200px] text-left">
                <div className="p-2 rounded-lg bg-purple-500/25 text-purple-500">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] dark:text-slate-400 text-slate-500 uppercase font-bold">New Rank Recalculated</p>
                  <p className="text-sm font-extrabold dark:text-white text-slate-800">Emily W. (Rank #2)</p>
                </div>
              </div>
            </div>
          </main>

          {/* Features Section */}
          <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto border-t border-indigo-500/10 dark:border-white/5 w-full">
            <div className="text-center max-w-xl mx-auto space-y-4 mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight dark:text-white text-slate-900">
                Core Engine Capabilities
              </h2>
              <p className="dark:text-slate-400 text-slate-600">
                A premium academic analytics platform equipped with modular features designed for educators and institutions.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: 'OCR Extraction',
                  desc: 'Extract numerical tables, student details, and scoring grids from raw PDFs and images automatically with high precision.',
                  icon: <Upload className="w-6 h-6" />
                },
                {
                  title: 'AI Data Structuring',
                  desc: 'Clean and tokenize messy result files, aligning unformatted scores directly into a relational student database schema.',
                  icon: <Sparkles className="w-6 h-6 animate-pulse" />
                },
                {
                  title: 'Ranking Engine',
                  desc: 'Generate individual and cumulative grade point averages and calculate absolute student ranks instantly.',
                  icon: <Trophy className="w-6 h-6" />
                },
                {
                  title: 'Subject Toppers',
                  desc: 'Identify top scorers on a subject-by-subject basis, highlighting classroom benchmarks automatically.',
                  icon: <GraduationCap className="w-6 h-6" />
                },
                {
                  title: 'Performance Analytics',
                  desc: 'Leverage line grids, bar averages, donut profiles, and performance matrices to isolate student learning trends.',
                  icon: <LayoutDashboard className="w-6 h-6" />
                },
                {
                  title: 'Smart Search',
                  desc: 'Search student score sheets instantly. Filter results by specific classes, scores thresholds, or failing states.',
                  icon: <Search className="w-6 h-6" />
                }
              ].map((feat, i) => (
                <div key={i} className="glass-card p-6 rounded-2xl border border-white/5 text-left relative overflow-hidden group">
                  <div className="p-3 w-fit rounded-xl bg-indigo-500/10 dark:bg-white/5 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 mb-5 group-hover:scale-110 transition-transform">
                    {feat.icon}
                  </div>
                  <h3 className="text-xl font-bold dark:text-white text-slate-900 mb-2">{feat.title}</h3>
                  <p className="text-sm dark:text-slate-400 text-slate-500 leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* How It Works Section */}
          <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto border-t border-indigo-500/10 dark:border-white/5 w-full text-center">
            <div className="max-w-xl mx-auto space-y-4 mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight dark:text-white text-slate-900">
                How It Works
              </h2>
              <p className="dark:text-slate-400 text-slate-600">
                From raw report files to actionable analytics dashboards in four simple automated phases.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              {[
                { step: 'Step 1', title: 'Upload PDF/Image', desc: 'Drag your scan sheet, photo, or grading PDF onto our drop interface.' },
                { step: 'Step 2', title: 'OCR Processing', desc: 'Our machine vision system identifies rows, tables, and numeric characters.' },
                { step: 'Step 3', title: 'AI Data Structuring', desc: 'Large language models process text arrays, cleaning errors and matching subjects.' },
                { step: 'Step 4', title: 'Generate Insights', desc: 'Rankings are re-computed and metrics are injected straight into your charts.' }
              ].map((item, i) => (
                <div key={i} className="relative glass-card p-6 rounded-2xl border border-white/5 text-center flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md mb-4 ring-4 ring-indigo-500/10">
                    {i + 1}
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 mb-1">{item.step}</h4>
                  <h3 className="text-lg font-bold dark:text-white text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-xs dark:text-slate-400 text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Footer */}
          <footer className="w-full border-t border-indigo-500/10 dark:border-white/5 py-8 text-center text-xs dark:text-slate-500 text-slate-500 glass-panel">
            <p>© 2026 ResultIntel.ai. Built with Next.js 16 & Tailwind CSS v4. All rights reserved.</p>
          </footer>
        </div>
      )}

      {/* --- DASHBOARD SHELL --- */}
      {activeTab !== 'landing' && (
        <div className="min-h-screen flex text-left">
          
          {/* Collapsible Sidebar Navigation */}
          <aside className={`glass-panel border-r border-indigo-500/10 dark:border-white/5 transition-all duration-300 flex flex-col justify-between z-40 fixed md:relative h-screen ${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'}`}>
            
            <div className="flex flex-col">
              {/* Sidebar Header */}
              <div className="h-16 border-b border-indigo-500/10 dark:border-white/5 flex items-center justify-between px-4">
                <div className={`flex items-center gap-3 transition-opacity duration-200 ${sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                  <div className="p-2 bg-gradient-to-tr from-indigo-600 to-cyan-500 rounded-lg text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-lg bg-gradient-to-r from-indigo-800 to-cyan-600 dark:from-white dark:to-cyan-400 bg-clip-text text-transparent">ResultIntel</span>
                </div>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>

              {/* Sidebar Menu Items */}
              <nav className="p-3 space-y-1">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
                  { id: 'upload', label: 'Upload Results', icon: <Upload className="w-5 h-5" /> },
                  { id: 'rankings', label: 'Rankings & Students', icon: <Trophy className="w-5 h-5" /> },
                  { id: 'subject-analytics', label: 'Subject Analytics', icon: <BookOpen className="w-5 h-5" /> },
                  { id: 'reports', label: 'Reports', icon: <FileText className="w-5 h-5" /> },
                  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> }
                ].map((item) => {
                  const isActive = activeTab === item.id || (item.id === 'rankings' && activeTab === 'student-detail');
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        if (item.id !== 'rankings') setSelectedStudent(null);
                      }}
                      className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${
                        isActive 
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/15' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="shrink-0">{item.icon}</div>
                      <span className={`transition-opacity duration-200 ${sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                        {item.label}
                      </span>
                      {isActive && !sidebarCollapsed && (
                        <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Sidebar Footer */}
            <div className="p-3 border-t border-indigo-500/10 dark:border-white/5 space-y-3">
              {/* Back to landing */}
              <button
                onClick={() => setActiveTab('landing')}
                className="w-full flex items-center gap-3.5 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all"
              >
                <X className="w-4 h-4" />
                <span className={sidebarCollapsed ? 'hidden' : 'inline'}>Exit App Demo</span>
              </button>

              <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-200/40 dark:bg-white/5 border border-indigo-500/5">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold font-mono">
                  SP
                </div>
                <div className={`overflow-hidden transition-all duration-200 text-left ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                  <p className="text-xs font-bold dark:text-white text-slate-800 truncate">Dr. Sejal Patel</p>
                  <p className="text-[10px] dark:text-slate-400 text-slate-500 font-medium truncate">Administrator</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Workspace */}
          <div className={`flex-1 flex flex-col h-screen overflow-y-auto transition-all ${sidebarCollapsed ? 'pl-[72px] md:pl-0' : 'pl-[260px] md:pl-0'}`}>
            
            {/* Top Workspace Header */}
            <header className="h-16 border-b border-indigo-500/10 dark:border-white/5 px-6 flex items-center justify-between glass-panel sticky top-0 z-30">
              
              {/* Breadcrumb / Title */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider dark:text-slate-400 text-slate-500">
                  Consoles
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm font-bold capitalize dark:text-indigo-400 text-indigo-600">
                  {activeTab === 'student-detail' ? 'Student Profile' : activeTab}
                </span>
              </div>

              {/* Utility Operations */}
              <div className="flex items-center gap-4">
                
                {/* Reset Data Button */}
                <button
                  onClick={handleResetData}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 dark:bg-red-950/10 hover:bg-red-500/10 text-red-500 text-xs font-bold transition-all"
                  title="Reset to original 12 student scores"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reset Database
                </button>

                {/* Light/Dark Toggle */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 transition-all"
                >
                  {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-indigo-950" />}
                </button>

                {/* Notifications Panel */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 transition-all relative"
                  >
                    <Bell className="w-5 h-5" />
                    {notifications.some(n => !n.read) && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-3 w-80 glass-panel rounded-xl shadow-2xl border border-white/10 p-3 z-50 animate-fade-in text-left">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-2">
                        <span className="text-xs font-bold dark:text-white text-slate-800">System Logs</span>
                        <button
                          onClick={() => {
                            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                            setShowNotifications(false);
                          }}
                          className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold hover:underline"
                        >
                          Mark all read
                        </button>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {notifications.map(n => (
                          <div key={n.id} className={`p-2 rounded-lg text-xs transition-colors ${n.read ? 'bg-transparent' : 'bg-indigo-500/10 border-l-2 border-indigo-500'}`}>
                            <p className="dark:text-slate-300 text-slate-700">{n.text}</p>
                            <span className="text-[9px] dark:text-slate-500 text-slate-400 mt-1 block">{n.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* Workspace Body */}
            <main className="p-6 md:p-8 flex-1 space-y-8 max-w-7xl w-full mx-auto">

              {/* Database Error alert block */}
              {dbError && (
                <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-left space-y-4">
                  <div className="flex gap-3 items-center">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <h4 className="font-extrabold text-sm uppercase tracking-wider">Supabase Connection Error</h4>
                  </div>
                  <p className="text-xs dark:text-slate-400 text-slate-600 font-medium">
                    Real-time Supabase database integration is active, but the backend returned an error: <code className="font-mono text-rose-500 bg-rose-500/10 px-1 py-0.5 rounded">{dbError}</code>. 
                    If you haven't initialized the database schema yet, copy the SQL script below and execute it inside the **Supabase SQL Editor** to create the tables and allow public read/write access:
                  </p>
                  <pre className="p-4 bg-slate-950 text-slate-300 text-[10px] rounded-xl font-mono overflow-x-auto select-all max-h-48 border border-white/5 leading-relaxed">
{`CREATE TABLE students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  roll_number TEXT NOT NULL UNIQUE,
  class_name TEXT NOT NULL,
  scores JSONB NOT NULL,
  total_obtained INTEGER NOT NULL,
  max_total INTEGER DEFAULT 500,
  percentage DOUBLE PRECISION NOT NULL,
  grade TEXT NOT NULL,
  status TEXT NOT NULL,
  ai_insights JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select" ON students FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete" ON students FOR DELETE USING (true);
CREATE POLICY "Allow public update" ON students FOR UPDATE USING (true);`}
                  </pre>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleResetData}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow"
                    >
                      Seed Demo Data
                    </button>
                    <button
                      onClick={fetchStudents}
                      className="px-4 py-2 border border-amber-500/20 hover:bg-amber-500/10 text-amber-400 rounded-lg text-xs font-bold transition-all"
                    >
                      Retry Connection
                    </button>
                  </div>
                </div>
              )}

              {/* Loader */}
              {loading && (
                <div className="space-y-6 py-12 text-center flex flex-col items-center justify-center">
                  <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-500 dark:text-indigo-400 animate-spin">
                    <RefreshCw className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-700 dark:text-slate-300 text-base">Fetching Supabase Records...</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Calculating dynamic rankings and aggregates</p>
                  </div>
                </div>
              )}

              {/* Dynamic Empty State for Data-Driven Views */}
              {!loading && ['dashboard', 'rankings', 'subject-analytics', 'reports', 'student-detail'].includes(activeTab) && studentsList.length === 0 && !dbError && (
                <div className="max-w-md mx-auto py-16 text-center space-y-5 animate-fade-in">
                  <div className="w-20 h-20 bg-indigo-500/10 dark:bg-indigo-500/5 border border-indigo-500/20 rounded-full flex items-center justify-center text-indigo-500 mx-auto">
                    <GraduationCap className="w-10 h-10 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold dark:text-white text-slate-800">No Student Records Found</h3>
                    <p className="text-xs dark:text-slate-400 text-slate-500 mt-1.5 leading-relaxed">
                      Your Supabase database is connected but contains 0 students. Navigate to the Upload tab to import result documents or click below to seed your database with 12 initial mock student records.
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" /> Parse Result Document
                    </button>
                    <button
                      onClick={handleResetData}
                      className="px-5 py-2.5 dark:bg-white/5 border border-slate-300 dark:border-white/10 dark:text-white text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10 font-semibold text-xs rounded-xl transition-all"
                    >
                      Seed Database
                    </button>
                  </div>
                </div>
              )}

              {/* --- VIEW: DASHBOARD OVERVIEW --- */}
              {!loading && activeTab === 'dashboard' && studentsList.length > 0 && (
                <div className="space-y-8 animate-fade-in">
                  
                  {/* Dashboard Hero Greeting */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-extrabold dark:text-white text-slate-900 tracking-tight">Academic Analytics Console</h2>
                      <p className="text-sm dark:text-slate-400 text-slate-500 mt-1">AI-extracted database parsing models. Last updated 2 minutes ago.</p>
                    </div>
                    
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-md shadow-indigo-500/10"
                    >
                      <Upload className="w-4 h-4" /> Import Grading Result
                    </button>
                  </div>

                  {/* Overview Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {[
                      { title: 'Total Students', value: stats.total, sub: 'Grade 12 Cohort', icon: <UserCheck className="w-5 h-5 text-indigo-400" /> },
                      { title: 'Average Score', value: `${stats.avgPct}%`, sub: `Class baseline`, icon: <TrendingUp className="w-5 h-5 text-cyan-400" /> },
                      { title: 'Topper Grade', value: `${stats.highest}%`, sub: 'Highest recorded', icon: <Trophy className="w-5 h-5 text-yellow-400" /> },
                      { title: 'Pass Rate', value: `${stats.passPct}%`, sub: 'Target threshold 85%', icon: <Check className="w-5 h-5 text-emerald-400" /> }
                    ].map((card, idx) => (
                      <div key={idx} className="glass-card p-5 rounded-2xl border border-indigo-500/5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{card.title}</span>
                          <div className="p-1.5 rounded-lg bg-indigo-500/10 dark:bg-white/5 border border-indigo-500/10">{card.icon}</div>
                        </div>
                        <div className="mt-3">
                          <span className="text-3xl font-black tracking-tight dark:text-white text-slate-800">{card.value}</span>
                          <span className="text-[10px] block font-semibold dark:text-slate-500 text-slate-500 mt-1">{card.sub}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Analytics Section - Custom SVG Charts */}
                  <div className="grid lg:grid-cols-12 gap-6 md:gap-8">
                    
                    {/* Student Performance Chart (Line Chart) */}
                    <div className="glass-card p-6 rounded-2xl border border-indigo-500/5 lg:col-span-8 flex flex-col justify-between">
                      <div className="flex justify-between items-center border-b border-indigo-500/5 pb-4 mb-4">
                        <div>
                          <h3 className="font-bold dark:text-white text-slate-800 text-base">Student Score Distribution</h3>
                          <p className="text-xs dark:text-slate-500 text-slate-500 mt-0.5">Overall percentage curve across the cohort ranks</p>
                        </div>
                        <div className="flex items-center gap-1 bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-md text-[10px] font-bold">
                          <TrendingUp className="w-3.5 h-3.5" /> Class Curve
                        </div>
                      </div>

                      {/* SVG Line Chart */}
                      <div className="h-[200px] w-full flex items-center justify-center relative">
                        <svg viewBox="0 0 500 200" className="w-full h-full text-indigo-500 overflow-visible">
                          <defs>
                            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                            </linearGradient>
                            <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#3b82f6" />
                              <stop offset="50%" stopColor="#8b5cf6" />
                              <stop offset="100%" stopColor="#06b6d4" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          <line x1="30" y1="20" x2="480" y2="20" stroke="rgba(255,255,255,0.04)" strokeDasharray="3" className="dark:stroke-white/5 stroke-slate-200" />
                          <line x1="30" y1="70" x2="480" y2="70" stroke="rgba(255,255,255,0.04)" strokeDasharray="3" className="dark:stroke-white/5 stroke-slate-200" />
                          <line x1="30" y1="120" x2="480" y2="120" stroke="rgba(255,255,255,0.04)" strokeDasharray="3" className="dark:stroke-white/5 stroke-slate-200" />
                          <line x1="30" y1="170" x2="480" y2="170" stroke="rgba(255,255,255,0.04)" className="dark:stroke-white/5 stroke-slate-200" />

                          {/* Axis labels */}
                          <text x="5" y="24" className="fill-slate-400 text-[9px] font-mono">100%</text>
                          <text x="5" y="74" className="fill-slate-400 text-[9px] font-mono">75%</text>
                          <text x="5" y="124" className="fill-slate-400 text-[9px] font-mono">50%</text>
                          <text x="5" y="174" className="fill-slate-400 text-[9px] font-mono">25%</text>

                          {/* Dynamic Line Path & Area based on current student scores (showing top 8) */}
                          {(() => {
                            const dataCount = Math.min(studentsList.length, 10);
                            if (dataCount === 0) return null;
                            
                            const stepX = 450 / (dataCount - 1);
                            
                            // Map scores: Y range 170 (20%) to 20 (100%)
                            const points = studentsList.slice(0, dataCount).map((s, idx) => {
                              const pct = s.percentage;
                              const x = 30 + idx * stepX;
                              const y = 170 - ((pct - 20) / 80) * 150;
                              return { x, y, name: s.name, val: pct };
                            });

                            const linePathStr = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                            const areaPathStr = `${linePathStr} L ${points[points.length - 1].x} 170 L ${points[0].x} 170 Z`;

                            return (
                              <>
                                {/* Area */}
                                <path d={areaPathStr} fill="url(#lineGrad)" />
                                
                                {/* Line */}
                                <path d={linePathStr} fill="none" stroke="url(#strokeGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

                                {/* Interactive Dots */}
                                {points.map((p, i) => (
                                  <g key={i} className="group/dot cursor-pointer">
                                    <circle cx={p.x} cy={p.y} r="5.5" className="fill-indigo-600 dark:fill-white stroke-indigo-400 dark:stroke-indigo-950 stroke-2 hover:r-7 transition-all duration-200" />
                                    
                                    {/* Embedded Tooltip */}
                                    <foreignObject x={p.x - 50} y={p.y - 45} width="100" height="38" className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none">
                                      <div className="bg-slate-900 border border-white/10 text-[9px] text-white p-1 rounded shadow-lg text-center font-bold">
                                        <p className="truncate">{p.name.split(' ')[0]}</p>
                                        <p className="text-cyan-400 text-[10px]">{p.val}%</p>
                                      </div>
                                    </foreignObject>
                                  </g>
                                ))}

                                {/* Horizontal axis indexes */}
                                {points.map((p, i) => (
                                  <text key={i} x={p.x} y="190" textAnchor="middle" className="fill-slate-500 text-[8px] font-bold">Rank {i+1}</text>
                                ))}
                              </>
                            );
                          })()}
                        </svg>
                      </div>
                    </div>

                    {/* Grade Distribution Chart (Donut progress lists) */}
                    <div className="glass-card p-6 rounded-2xl border border-indigo-500/5 lg:col-span-4 flex flex-col justify-between">
                      <div className="border-b border-indigo-500/5 pb-4 mb-4">
                        <h3 className="font-bold dark:text-white text-slate-800 text-base">Grade Distribution</h3>
                        <p className="text-xs dark:text-slate-500 text-slate-500 mt-0.5">Cohort distribution grouped by grades</p>
                      </div>

                      <div className="space-y-3">
                        {Object.entries(gradeDistribution).map(([grade, count]) => {
                          const total = studentsList.length || 1;
                          const pct = Math.round((count / total) * 100);
                          const barColors: Record<string, string> = {
                            'A+': 'bg-gradient-to-r from-blue-500 to-indigo-600',
                            'A': 'bg-gradient-to-r from-indigo-500 to-purple-500',
                            'B': 'bg-gradient-to-r from-purple-500 to-pink-500',
                            'C': 'bg-gradient-to-r from-cyan-500 to-blue-500',
                            'D': 'bg-gradient-to-r from-amber-500 to-orange-500',
                            'F': 'bg-gradient-to-r from-red-500 to-rose-600'
                          };
                          
                          return (
                            <div key={grade} className="space-y-1 text-left">
                              <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 font-mono">{grade}</span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-500 font-medium">({count} {count === 1 ? 'student' : 'students'})</span>
                                </div>
                                <span>{pct}%</span>
                              </div>
                              <div className="w-full h-2 rounded-full dark:bg-white/5 bg-slate-200 overflow-hidden">
                                <div className={`h-full rounded-full ${barColors[grade] || 'bg-slate-400'}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Subject Comparison Chart (Bar Chart) */}
                    <div className="glass-card p-6 rounded-2xl border border-indigo-500/5 lg:col-span-6 flex flex-col justify-between">
                      <div className="border-b border-indigo-500/5 pb-4 mb-4">
                        <h3 className="font-bold dark:text-white text-slate-800 text-base">Subject Performance Benchmarks</h3>
                        <p className="text-xs dark:text-slate-500 text-slate-500 mt-0.5">Average scores vs subject toppers</p>
                      </div>

                      {/* SVG Bar Chart */}
                      <div className="h-[200px] w-full flex items-center justify-center">
                        <svg viewBox="0 0 400 180" className="w-full h-full overflow-visible">
                          {/* Y lines */}
                          <line x1="40" y1="20" x2="380" y2="20" stroke="rgba(255,255,255,0.03)" className="dark:stroke-white/5 stroke-slate-200" />
                          <line x1="40" y1="80" x2="380" y2="80" stroke="rgba(255,255,255,0.03)" className="dark:stroke-white/5 stroke-slate-200" />
                          <line x1="40" y1="140" x2="380" y2="140" stroke="rgba(255,255,255,0.03)" className="dark:stroke-white/5 stroke-slate-200" />

                          <text x="10" y="24" className="fill-slate-400 text-[8px] font-mono">100</text>
                          <text x="10" y="84" className="fill-slate-400 text-[8px] font-mono">50</text>
                          <text x="10" y="144" className="fill-slate-400 text-[8px] font-mono">0</text>

                          {/* Bars */}
                          {Object.entries(subjectAverages).map(([subjKey, data], idx) => {
                            const barWidth = 24;
                            const spacing = 65;
                            const x = 50 + idx * spacing;
                            
                            // Heights: Y range 140 (0 marks) to 20 (100 marks)
                            const avgY = 140 - (data.avg / 100) * 120;
                            const maxY = 140 - (data.max / 100) * 120;
                            const heightAvg = 140 - avgY;
                            const heightMax = 140 - maxY;

                            return (
                              <g key={subjKey} className="group/bar">
                                {/* Max score bar (translucent back) */}
                                <rect x={x} y={maxY} width={barWidth} height={heightMax} fill="rgba(139, 92, 246, 0.12)" rx="3" className="border border-white/5" />
                                
                                {/* Avg score bar (solid front) */}
                                <rect x={x} y={avgY} width={barWidth} height={heightAvg} fill="url(#barGrad)" rx="3" />
                                
                                {/* Value label text */}
                                <text x={x + 12} y={avgY - 4} textAnchor="middle" className="fill-indigo-600 dark:fill-indigo-400 text-[9px] font-bold font-mono">
                                  {data.avg}%
                                </text>

                                <text x={x + 12} y={maxY - 4} textAnchor="middle" className="fill-slate-400 text-[8px] font-bold font-mono opacity-0 group-hover/bar:opacity-100 transition-opacity">
                                  Max: {data.max}
                                </text>

                                {/* Legend labels under */}
                                <text x={x + 12} y="156" textAnchor="middle" className="fill-slate-400 text-[8px] font-bold">
                                  {subjKey.slice(0, 4).toUpperCase()}
                                </text>
                              </g>
                            );
                          })}

                          <defs>
                            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" />
                              <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>
                    </div>

                    {/* Performance Heatmap (Subject vs Students) */}
                    <div className="glass-card p-6 rounded-2xl border border-indigo-500/5 lg:col-span-6 flex flex-col justify-between">
                      <div className="border-b border-indigo-500/5 pb-4 mb-4">
                        <h3 className="font-bold dark:text-white text-slate-800 text-base">Performance Heatmap</h3>
                        <p className="text-xs dark:text-slate-500 text-slate-500 mt-0.5">Cell grid mapping scores per subject (Ranks 1-6)</p>
                      </div>

                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-white/5">
                              <th className="pb-2 text-left font-bold text-slate-500">Student</th>
                              <th className="pb-2 text-center font-bold text-slate-500">MTH</th>
                              <th className="pb-2 text-center font-bold text-slate-500">PHY</th>
                              <th className="pb-2 text-center font-bold text-slate-500">CHM</th>
                              <th className="pb-2 text-center font-bold text-slate-500">ENG</th>
                              <th className="pb-2 text-center font-bold text-slate-500">CSC</th>
                            </tr>
                          </thead>
                          <tbody>
                            {studentsList.slice(0, 6).map((s) => (
                              <tr key={s.id} className="border-b border-indigo-500/5">
                                <td className="py-2.5 font-bold dark:text-slate-300 text-slate-700 max-w-[90px] truncate">{s.name.split(' ')[0]} {s.name.split(' ')[1]?.slice(0,1)}.</td>
                                {[
                                  s.scores.mathematics,
                                  s.scores.physics,
                                  s.scores.chemistry,
                                  s.scores.english,
                                  s.scores.computerScience
                                ].map((score, sIdx) => {
                                  let cellColor = '';
                                  if (score >= 90) cellColor = 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-500';
                                  else if (score >= 75) cellColor = 'bg-indigo-500/15 border border-indigo-500/25 text-indigo-400';
                                  else if (score >= 50) cellColor = 'bg-amber-500/15 border border-amber-500/25 text-amber-500';
                                  else cellColor = 'bg-red-500/15 border border-red-500/25 text-red-500';
                                  return (
                                    <td key={sIdx} className="py-2 text-center">
                                      <span className={`px-2 py-1 rounded font-bold font-mono text-[10px] inline-block w-8 ${cellColor}`}>
                                        {score}
                                      </span>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* AI Recommendations Panel */}
                  <div className="glass-panel p-6 rounded-2xl border border-indigo-500/15 text-left space-y-4 relative overflow-hidden">
                    {/* Background light gradient */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full" />
                    
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                      <h3 className="font-extrabold text-lg dark:text-white text-slate-800 tracking-tight">AI intelligence Recommendations</h3>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="p-4 rounded-xl dark:bg-white/5 bg-slate-100 border border-indigo-500/5 space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-red-500">
                          <span>Attention Flag</span>
                          <AlertCircle className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-sm dark:text-slate-200 text-slate-700">Chemistry Deficit</h4>
                        <p className="text-xs dark:text-slate-400 text-slate-500 leading-relaxed">
                          Cohort chemistry marks averages lag physics averages by <strong>6.8%</strong>. Flagging Grade 12-A for targeted tutoring on organic chemical equations.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl dark:bg-white/5 bg-slate-100 border border-indigo-500/5 space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-yellow-500">
                          <span>Individual Focus</span>
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-sm dark:text-slate-200 text-slate-700">Lucas Silva Remedial</h4>
                        <p className="text-xs dark:text-slate-400 text-slate-500 leading-relaxed">
                          Mathematics score is critically failing at <strong>35%</strong>. Remedial classes scheduled. Direct mentor assignment is advised.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl dark:bg-white/5 bg-slate-100 border border-indigo-500/5 space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-emerald-500">
                          <span>Opportunity Topper</span>
                          <Trophy className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-sm dark:text-slate-200 text-slate-700">Aarav Sharma Olympiad</h4>
                        <p className="text-xs dark:text-slate-400 text-slate-500 leading-relaxed">
                          Achieved perfect score <strong>100/100</strong> in Computer Science. Recommending application to state computer science programming championships.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* --- VIEW: UPLOAD RESULT --- */}
              {!loading && activeTab === 'upload' && (
                <div className="max-w-2xl mx-auto space-y-8 animate-fade-in text-center py-6">
                  
                  <div className="space-y-2">
                    <h2 className="text-3xl font-extrabold dark:text-white text-slate-900 tracking-tight">AI OCR Extraction Portal</h2>
                    <p className="text-sm dark:text-slate-400 text-slate-500 max-w-md mx-auto">
                      Drag-and-drop report card images or grading PDFs. The system will auto-extract scoring tables, identify headers, and re-compute cohort ranking analytics.
                    </p>
                  </div>

                  {/* Drop/Upload Area */}
                  {uploadStep === 0 ? (
                    <div className="glass-panel p-10 rounded-2xl border-2 border-dashed border-indigo-500/30 hover:border-indigo-500 transition-all cursor-pointer flex flex-col items-center justify-center space-y-4 bg-white/40 dark:bg-black/20">
                      <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-500 dark:text-indigo-400 animate-bounce">
                        <Upload className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="font-bold dark:text-white text-slate-800 text-base">Select report card sheet</p>
                        <p className="text-xs dark:text-slate-400 text-slate-500 mt-1">Accepts PDF, PNG, JPG, JPEG (Max 5MB)</p>
                      </div>
                      <input
                        type="file"
                        id="file-input"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadFile(file);
                            // Pre-generate a mock student name based on file name if uploaded
                            const baseName = file.name.split('.')[0].replace(/[-_]/g, ' ');
                            const finalName = baseName.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
                            setOcrPreviewData(prev => ({
                              ...prev,
                              name: finalName || 'Rohan Sen',
                              rollNumber: `2026A0` + (studentsList.length + 1)
                            }));
                          }
                        }}
                      />
                      <button
                        onClick={() => document.getElementById('file-input')?.click()}
                        className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow"
                      >
                        Browse System Files
                      </button>
                    </div>
                  ) : (
                    /* Processing/Scanning Screen layout */
                    <div className="glass-panel p-8 rounded-2xl border border-indigo-500/10 bg-white/40 dark:bg-black/20 text-left space-y-6 relative overflow-hidden">
                      
                      {/* Scan preview visualization */}
                      {uploadStep === 2 && (
                        <div className="h-2 w-full bg-indigo-500 absolute top-0 left-0 right-0 animate-pulse ocr-scanner-line" />
                      )}

                      <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-indigo-500" />
                          <div>
                            <h4 className="font-bold text-sm dark:text-white text-slate-800 truncate max-w-[200px]">{uploadFile?.name}</h4>
                            <p className="text-[10px] dark:text-slate-500 text-slate-400">{(uploadFile!.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setUploadFile(null);
                            setUploadStep(0);
                            setUploadProgress(0);
                            setOcrLogs([]);
                          }}
                          className="p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-400 hover:text-white"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Processing Log Box */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                          <span>AI Extraction Phase: {uploadStep === 1 ? 'Uploading' : uploadStep === 2 ? 'OCR Scanning' : uploadStep === 3 ? 'Structuring Data' : 'Completed'}</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full dark:bg-white/5 bg-slate-200 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                        </div>

                        {/* Logs */}
                        <div className="p-4 rounded-xl dark:bg-black/40 bg-slate-800 font-mono text-[10px] text-slate-300 space-y-1.5 h-36 overflow-y-auto leading-relaxed border border-white/5">
                          {ocrLogs.map((log, lIdx) => (
                            <p key={lIdx} className="flex gap-2 items-start">
                              <span className="text-indigo-400 font-bold">&gt;</span>
                              <span>{log}</span>
                            </p>
                          ))}
                        </div>
                      </div>

                      {/* Success Results Card Preview */}
                      {uploadStep === 4 && (
                        <div className="p-5 rounded-2xl border border-emerald-500/20 dark:bg-emerald-950/10 bg-emerald-50/50 space-y-4 animate-scale-up">
                          <div className="flex items-center gap-3 text-emerald-500">
                            <Check className="w-5 h-5" />
                            <h4 className="font-bold text-sm uppercase tracking-wider">Review AI Parsed Entity</h4>
                          </div>

                          <div className="grid md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 block mb-1">Student Name</label>
                              <input
                                type="text"
                                className="w-full text-xs font-bold dark:bg-white/5 bg-white border border-slate-300 dark:border-white/10 p-2 rounded-lg dark:text-white"
                                value={ocrPreviewData.name}
                                onChange={(e) => setOcrPreviewData({ ...ocrPreviewData, name: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 block mb-1">Roll Number</label>
                              <input
                                type="text"
                                className="w-full text-xs font-bold dark:bg-white/5 bg-white border border-slate-300 dark:border-white/10 p-2 rounded-lg dark:text-white"
                                value={ocrPreviewData.rollNumber}
                                onChange={(e) => setOcrPreviewData({ ...ocrPreviewData, rollNumber: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 block mb-1">Cohort Class</label>
                              <select
                                className="w-full text-xs font-bold dark:bg-white/5 bg-white border border-slate-300 dark:border-white/10 p-2 rounded-lg dark:text-white"
                                value={ocrPreviewData.className}
                                onChange={(e) => setOcrPreviewData({ ...ocrPreviewData, className: e.target.value })}
                              >
                                <option value="Grade 12-A">Grade 12-A</option>
                                <option value="Grade 12-B">Grade 12-B</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 block">Extracted Subject Scores (Out of 100)</label>
                            <div className="grid grid-cols-5 gap-2">
                              {(Object.entries(ocrPreviewData.scores) as [keyof SubjectScores, number][]).map(([subjKey, score]) => (
                                <div key={subjKey} className="text-center">
                                  <label className="text-[8px] uppercase font-bold text-slate-500">{subjKey.slice(0, 4)}</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    className="w-full text-center text-xs font-bold dark:bg-white/5 bg-white border border-slate-300 dark:border-white/10 p-2 rounded-lg dark:text-white"
                                    value={score}
                                    onChange={(e) => {
                                      const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                      setOcrPreviewData({
                                        ...ocrPreviewData,
                                        scores: {
                                          ...ocrPreviewData.scores,
                                          [subjKey]: val
                                        }
                                      });
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={handleConfirmOcrAdd}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow flex items-center justify-center gap-2"
                          >
                            <Check className="w-4.5 h-4.5" /> Save Record & Re-Evaluate rankings
                          </button>
                        </div>
                      )}

                    </div>
                  )}

                  {/* Pending file triggers */}
                  {uploadFile && uploadStep === 0 && (
                    <div className="glass-panel p-5 rounded-2xl border border-white/5 flex justify-between items-center text-left bg-white/40 dark:bg-black/20">
                      <div className="flex gap-3 items-center">
                        <FileText className="w-8 h-8 text-indigo-500" />
                        <div>
                          <p className="text-sm font-bold dark:text-white text-slate-800">{uploadFile.name}</p>
                          <p className="text-xs dark:text-slate-500 text-slate-400">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        onClick={startOcrSimulation}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md hover:scale-[1.02] transition-all flex gap-2 items-center"
                      >
                        <Play className="w-4 h-4 fill-white" /> Start AI Extraction
                      </button>
                    </div>
                  )}

                </div>
              )}

              {/* --- VIEW: RANKINGS & STUDENTS --- */}
              {!loading && activeTab === 'rankings' && studentsList.length > 0 && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Rankings Header Controls */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-extrabold dark:text-white text-slate-900 tracking-tight">Student Leaderboards</h2>
                      <p className="text-xs dark:text-slate-400 text-slate-500">Complete listing of students ranked by overall percentage performance.</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Search box */}
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                        <input
                          type="text"
                          placeholder="Search student..."
                          className="pl-9 pr-4 py-2.5 text-xs font-semibold rounded-xl dark:bg-white/5 bg-white border border-slate-300 dark:border-white/10 dark:text-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={rankSearch}
                          onChange={(e) => setRankSearch(e.target.value)}
                        />
                      </div>

                      {/* Class filtering selector */}
                      <div className="relative">
                        <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
                        <select
                          className="pl-8 pr-4 py-2.5 text-xs font-bold rounded-xl dark:bg-white/5 bg-white border border-slate-300 dark:border-white/10 dark:text-white text-slate-800 focus:outline-none"
                          value={rankClassFilter}
                          onChange={(e) => setRankClassFilter(e.target.value)}
                        >
                          <option value="all">All Grades</option>
                          <option value="Grade 12-A">Grade 12-A</option>
                          <option value="Grade 12-B">Grade 12-B</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Leaderboard Table Card */}
                  <div className="glass-panel rounded-2xl border border-indigo-500/5 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-slate-200/50 dark:bg-white/5 border-b border-indigo-500/10 dark:border-white/5 text-slate-500 font-bold uppercase tracking-wider">
                            <th className="py-4 px-6 text-center w-16">
                              <button
                                onClick={() => {
                                  setRankSortColumn('rank');
                                  setRankSortDir(rankSortDir === 'asc' ? 'desc' : 'asc');
                                }}
                                className="flex items-center gap-1 mx-auto hover:text-indigo-400"
                              >
                                Rank
                              </button>
                            </th>
                            <th className="py-4 px-6">
                              <button
                                onClick={() => {
                                  setRankSortColumn('name');
                                  setRankSortDir(rankSortDir === 'asc' ? 'desc' : 'asc');
                                }}
                                className="flex items-center gap-1 hover:text-indigo-400"
                              >
                                Student Name
                              </button>
                            </th>
                            <th className="py-4 px-6 text-center">Roll Number</th>
                            <th className="py-4 px-6 text-center">Class</th>
                            <th className="py-4 px-6 text-center">
                              <button
                                onClick={() => {
                                  setRankSortColumn('percentage');
                                  setRankSortDir(rankSortDir === 'asc' ? 'desc' : 'asc');
                                }}
                                className="flex items-center gap-1 mx-auto hover:text-indigo-400"
                              >
                                Percentage
                              </button>
                            </th>
                            <th className="py-4 px-6 text-center">Grade</th>
                            <th className="py-4 px-6 text-center">Status</th>
                            <th className="py-4 px-6 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStudents.map((s) => {
                            // Top 3 specific background stylings
                            let rankColor = '';
                            let badgeStyle = '';
                            if (s.rank === 1) {
                              rankColor = 'text-yellow-500 font-extrabold text-sm';
                              badgeStyle = 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-500 font-black';
                            } else if (s.rank === 2) {
                              rankColor = 'text-slate-400 font-extrabold text-sm';
                              badgeStyle = 'bg-slate-400/15 border border-slate-400/30 text-slate-400 font-bold';
                            } else if (s.rank === 3) {
                              rankColor = 'text-amber-600 font-extrabold text-sm';
                              badgeStyle = 'bg-amber-600/15 border border-amber-600/30 text-amber-600 font-bold';
                            } else {
                              rankColor = 'dark:text-slate-400 text-slate-500 font-semibold';
                              badgeStyle = 'dark:bg-white/5 bg-slate-100 text-slate-600 dark:text-slate-300';
                            }

                            return (
                              <tr key={s.id} className="border-b border-indigo-500/5 hover:bg-slate-200/30 dark:hover:bg-white/5 transition-all">
                                <td className="py-4 px-6 text-center">
                                  <span className={`px-2.5 py-1 rounded-md inline-block text-xs ${badgeStyle}`}>
                                    #{s.rank}
                                  </span>
                                </td>
                                <td className="py-4 px-6 font-bold dark:text-white text-slate-800">
                                  {s.name}
                                </td>
                                <td className="py-4 px-6 text-center font-mono dark:text-slate-400 text-slate-500">
                                  {s.rollNumber}
                                </td>
                                <td className="py-4 px-6 text-center dark:text-slate-400 text-slate-500">
                                  {s.className}
                                </td>
                                <td className="py-4 px-6 text-center font-bold font-mono dark:text-indigo-400 text-indigo-600">
                                  {s.percentage}%
                                </td>
                                <td className="py-4 px-6 text-center font-bold font-mono">
                                  {s.grade}
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.status === 'Pass' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}>
                                    {s.status}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <div className="flex gap-2 justify-center">
                                    <button
                                      onClick={() => {
                                        setSelectedStudent(s);
                                        setActiveTab('student-detail');
                                      }}
                                      className="p-1.5 rounded-lg border border-indigo-500/10 hover:bg-indigo-500/10 text-indigo-500 transition-all"
                                      title="View Student Profile"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                       onClick={() => handleDeleteStudent(s.id, s.name)}
                                       className="p-1.5 rounded-lg border border-red-500/15 hover:bg-red-500/10 text-red-500 transition-all"
                                       title="Delete Record"
                                     >
                                       <Trash2 className="w-4 h-4" />
                                     </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* --- VIEW: STUDENT DETAIL --- */}
              {!loading && activeTab === 'student-detail' && selectedStudent && studentsList.length > 0 && (
                <div className="space-y-8 animate-fade-in text-left">
                  
                  {/* Back button header */}
                  <div className="flex items-center justify-between border-b border-indigo-500/10 pb-4">
                    <button
                      onClick={() => {
                        setSelectedStudent(null);
                        setActiveTab('rankings');
                      }}
                      className="px-4 py-2 rounded-lg border border-indigo-500/10 hover:bg-indigo-500/10 text-indigo-500 text-xs font-bold transition-all"
                    >
                      ← Back to Leaderboards
                    </button>
                    
                    <span className="text-xs font-bold text-slate-500">Student Profile Database</span>
                  </div>

                  {/* Profile Layout */}
                  <div className="grid lg:grid-cols-12 gap-8">
                    
                    {/* Left profile detail card */}
                    <div className="lg:col-span-4 space-y-6">
                      
                      {/* Avatar Card */}
                      <div className="glass-card p-6 rounded-2xl border border-indigo-500/5 text-center flex flex-col items-center">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-1">
                          <div className="w-full h-full rounded-xl bg-slate-900 flex items-center justify-center font-bold text-3xl text-white">
                            {selectedStudent.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                        </div>

                        <h3 className="font-extrabold text-lg dark:text-white text-slate-800 mt-4 tracking-tight">{selectedStudent.name}</h3>
                        <p className="text-xs dark:text-slate-400 text-slate-500 font-mono mt-0.5">Roll: {selectedStudent.rollNumber}</p>
                        
                        <div className="mt-4 flex gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-bold">{selectedStudent.className}</span>
                          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${selectedStudent.status === 'Pass' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {selectedStudent.status}
                          </span>
                        </div>
                      </div>

                      {/* Score metrics */}
                      <div className="glass-card p-5 rounded-2xl border border-indigo-500/5 space-y-4">
                        <h4 className="font-bold text-sm dark:text-white text-slate-800 border-b border-white/5 pb-2">Result Overview</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] dark:text-slate-500 text-slate-500 font-bold uppercase">Cohort Rank</p>
                            <p className="text-xl font-black text-indigo-500">#{selectedStudent.rank}</p>
                          </div>
                          <div>
                            <p className="text-[10px] dark:text-slate-500 text-slate-500 font-bold uppercase">Aggregate</p>
                            <p className="text-xl font-black text-indigo-500">{selectedStudent.percentage}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] dark:text-slate-500 text-slate-500 font-bold uppercase">Obtained Marks</p>
                            <p className="text-lg font-black dark:text-slate-300 text-slate-700">{selectedStudent.totalObtained} / 500</p>
                          </div>
                          <div>
                            <p className="text-[10px] dark:text-slate-500 text-slate-500 font-bold uppercase">Grade Point</p>
                            <p className="text-lg font-black dark:text-slate-300 text-slate-700">{selectedStudent.grade}</p>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Right subject details and SVG Radar chart */}
                    <div className="lg:col-span-8 space-y-6">
                      
                      {/* Detailed Score Table */}
                      <div className="glass-card p-6 rounded-2xl border border-indigo-500/5 space-y-4">
                        <h4 className="font-bold text-sm dark:text-white text-slate-800 border-b border-white/5 pb-2">Subject Performance Matrix</h4>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="border-b border-indigo-500/10 text-slate-400 font-bold">
                                <th className="py-2">Subject</th>
                                <th className="py-2 text-center">Score</th>
                                <th className="py-2 text-center">Pass Threshold</th>
                                <th className="py-2 text-center">Class Average</th>
                                <th className="py-2 text-center">Grade</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(Object.entries(selectedStudent.scores) as [keyof SubjectScores, number][]).map(([subjKey, score]) => {
                                const classAvg = subjectAverages[subjKey as keyof SubjectScores]?.avg || 0;
                                const isFailing = score < 40;
                                return (
                                  <tr key={subjKey} className="border-b border-indigo-500/5">
                                    <td className="py-3 font-bold dark:text-slate-300 text-slate-700">{SUBJECT_NAMES[subjKey as keyof SubjectScores]}</td>
                                    <td className="py-3 text-center font-bold font-mono">
                                      <span className={`px-2 py-0.5 rounded ${isFailing ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'dark:text-indigo-400 text-indigo-600'}`}>{score}</span>
                                    </td>
                                    <td className="py-3 text-center dark:text-slate-500 text-slate-400 font-mono">40</td>
                                    <td className="py-3 text-center dark:text-slate-400 text-slate-500 font-mono">{classAvg}%</td>
                                    <td className="py-3 text-center font-bold font-mono">{calculateGrade(score)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* SVG Radar strengths polygon visualization */}
                      <div className="grid md:grid-cols-2 gap-6">
                        
                        {/* Radar Chart */}
                        <div className="glass-card p-5 rounded-2xl border border-indigo-500/5 flex flex-col items-center justify-between">
                          <h4 className="font-bold text-xs uppercase dark:text-slate-400 text-slate-500 tracking-wider mb-4 text-center">Subject Strength polygon</h4>
                          
                          <div className="h-44 w-44 relative flex items-center justify-center">
                            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                              {/* 5 Points Radar grid: angles 0, 72, 144, 216, 288 deg */}
                              {/* Center 50,50. Radius 40 */}
                              <polygon points="50,10 88,38 74,82 26,82 12,38" fill="none" stroke="rgba(255,255,255,0.04)" className="dark:stroke-white/5 stroke-slate-200" strokeWidth="0.5" />
                              <polygon points="50,25 78.5,46 68,74 32,74 21.5,46" fill="none" stroke="rgba(255,255,255,0.04)" className="dark:stroke-white/5 stroke-slate-200" strokeWidth="0.5" />
                              <polygon points="50,40 69,53 62,66 38,66 31,53" fill="none" stroke="rgba(255,255,255,0.04)" className="dark:stroke-white/5 stroke-slate-200" strokeWidth="0.5" />

                              {/* Rays */}
                              <line x1="50" y1="50" x2="50" y2="10" stroke="rgba(255,255,255,0.04)" className="dark:stroke-white/5 stroke-slate-200" strokeWidth="0.5" />
                              <line x1="50" y1="50" x2="88" y2="38" stroke="rgba(255,255,255,0.04)" className="dark:stroke-white/5 stroke-slate-200" strokeWidth="0.5" />
                              <line x1="50" y1="50" x2="74" y2="82" stroke="rgba(255,255,255,0.04)" className="dark:stroke-white/5 stroke-slate-200" strokeWidth="0.5" />
                              <line x1="50" y1="50" x2="26" y2="82" stroke="rgba(255,255,255,0.04)" className="dark:stroke-white/5 stroke-slate-200" strokeWidth="0.5" />
                              <line x1="50" y1="50" x2="12" y2="38" stroke="rgba(255,255,255,0.04)" className="dark:stroke-white/5 stroke-slate-200" strokeWidth="0.5" />

                              {/* Labels */}
                              <text x="50" y="7" textAnchor="middle" className="fill-slate-400 text-[6px] font-bold uppercase">MTH</text>
                              <text x="91" y="38" textAnchor="start" className="fill-slate-400 text-[6px] font-bold uppercase">PHY</text>
                              <text x="77" y="86" textAnchor="start" className="fill-slate-400 text-[6px] font-bold uppercase">CHM</text>
                              <text x="23" y="86" textAnchor="end" className="fill-slate-400 text-[6px] font-bold uppercase">ENG</text>
                              <text x="9" y="38" textAnchor="end" className="fill-slate-400 text-[6px] font-bold uppercase">CSC</text>

                              {/* Strength Polygon */}
                              {(() => {
                                const m = selectedStudent.scores.mathematics / 100;
                                const p = selectedStudent.scores.physics / 100;
                                const c = selectedStudent.scores.chemistry / 100;
                                const e = selectedStudent.scores.english / 100;
                                const cs = selectedStudent.scores.computerScience / 100;

                                // Coords based on (50,50) + radius*score
                                const p1 = { x: 50, y: 50 - 40 * m };
                                const p2 = { x: 50 + 38 * p, y: 50 - 12 * p };
                                const p3 = { x: 50 + 24 * c, y: 50 + 32 * c };
                                const p4 = { x: 50 - 24 * e, y: 50 + 32 * e };
                                const p5 = { x: 50 - 38 * cs, y: 50 - 12 * cs };

                                const pointsStr = `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y} ${p5.x},${p5.y}`;

                                return (
                                  <>
                                    <polygon points={pointsStr} fill="rgba(99, 102, 241, 0.25)" stroke="#6366f1" strokeWidth="1.5" />
                                    {/* Small circle indicators */}
                                    <circle cx={p1.x} cy={p1.y} r="1.5" className="fill-white" />
                                    <circle cx={p2.x} cy={p2.y} r="1.5" className="fill-white" />
                                    <circle cx={p3.x} cy={p3.y} r="1.5" className="fill-white" />
                                    <circle cx={p4.x} cy={p4.y} r="1.5" className="fill-white" />
                                    <circle cx={p5.x} cy={p5.y} r="1.5" className="fill-white" />
                                  </>
                                );
                              })()}
                            </svg>
                          </div>
                        </div>

                        {/* AI Insights Panel */}
                        <div className="glass-panel p-5 rounded-2xl border border-indigo-500/10 text-left space-y-4 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-indigo-500">
                              <Sparkles className="w-4 h-4" />
                              <h4 className="font-extrabold text-xs uppercase tracking-wider">AI Student Insights</h4>
                            </div>

                            <div className="space-y-2 text-xs">
                              <p className="dark:text-slate-300 text-slate-700">
                                <strong>Dominant Subject:</strong> {selectedStudent.aiInsights.strongestSubject}
                              </p>
                              <p className="dark:text-slate-300 text-slate-700">
                                <strong>Requires Bridging:</strong> {selectedStudent.aiInsights.weakestSubject}
                              </p>
                              <p className="dark:text-slate-400 text-slate-500 leading-relaxed italic">
                                &quot;{selectedStudent.aiInsights.improvementSuggestion}&quot;
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Trend trajectory</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex gap-1 items-center capitalize ${
                              selectedStudent.aiInsights.trend === 'improving' 
                                ? 'bg-emerald-500/10 text-emerald-500' 
                                : selectedStudent.aiInsights.trend === 'stable' 
                                  ? 'bg-blue-500/10 text-blue-500' 
                                  : 'bg-red-500/10 text-red-500'
                            }`}>
                              {selectedStudent.aiInsights.trend === 'improving' && <TrendingUp className="w-3 h-3" />}
                              {selectedStudent.aiInsights.trend === 'declining' && <TrendingDown className="w-3 h-3" />}
                              {selectedStudent.aiInsights.trend}
                            </span>
                          </div>
                        </div>

                      </div>

                    </div>

                  </div>

                </div>
              )}

              {/* --- VIEW: SUBJECT ANALYTICS --- */}
              {!loading && activeTab === 'subject-analytics' && studentsList.length > 0 && (
                <div className="space-y-8 animate-fade-in text-left">
                  
                  {/* Selector Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-500/10 pb-4">
                    <div>
                      <h2 className="text-2xl font-extrabold dark:text-white text-slate-900 tracking-tight">Subject Analytics Console</h2>
                      <p className="text-xs dark:text-slate-400 text-slate-500">Explore granular academic indicators on a subject-by-subject basis.</p>
                    </div>

                    <div className="relative">
                      <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <select
                        className="pl-9 pr-6 py-2.5 text-xs font-bold rounded-xl dark:bg-white/5 bg-white border border-slate-300 dark:border-white/10 dark:text-white text-slate-800 focus:outline-none"
                        value={subjectSelected as string}
                        onChange={(e) => setSubjectSelected(e.target.value as keyof SubjectScores)}
                      >
                        {(Object.entries(SUBJECT_NAMES) as [keyof SubjectScores, string][]).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Subject Overview cards */}
                  {(() => {
                    const data = subjectAverages[subjectSelected];
                    if (!data) return null;
                    
                    // Estimate difficulty index based on class average
                    let difficulty = 'Medium';
                    let diffColor = 'text-blue-400';
                    if (data.avg < 65) {
                      difficulty = 'Hard';
                      diffColor = 'text-red-500';
                    } else if (data.avg > 80) {
                      difficulty = 'Easy';
                      diffColor = 'text-emerald-400';
                    }

                    // Estimate pass rate for this subject (scores >= 40)
                    const totalStudents = studentsList.length || 1;
                    const passes = studentsList.filter(s => s.scores[subjectSelected] >= 40).length;
                    const subjectPassPct = parseFloat(((passes / totalStudents) * 100).toFixed(1));

                    return (
                      <div className="space-y-6">
                        
                        {/* Statistics row */}
                        <div className="grid md:grid-cols-4 gap-6">
                          <div className="glass-card p-5 rounded-2xl border border-white/5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Class Average</span>
                            <span className="text-3xl font-black text-indigo-500 mt-2 block">{data.avg}%</span>
                          </div>
                          <div className="glass-card p-5 rounded-2xl border border-white/5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Difficulty Rating</span>
                            <span className={`text-3xl font-black ${diffColor} mt-2 block`}>{difficulty}</span>
                          </div>
                          <div className="glass-card p-5 rounded-2xl border border-white/5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Subject Topper</span>
                            <span className="text-sm font-extrabold dark:text-white text-slate-800 mt-2 truncate block">{data.topperName}</span>
                            <span className="text-[10px] font-mono dark:text-slate-500 text-slate-400 mt-0.5 block">Scored: {data.max} / 100</span>
                          </div>
                          <div className="glass-card p-5 rounded-2xl border border-white/5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Subject Pass Rate</span>
                            <span className="text-3xl font-black text-emerald-500 mt-2 block">{subjectPassPct}%</span>
                          </div>
                        </div>

                        {/* Subject leaderboard listing (shows student score order) */}
                        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                          <div className="p-4 border-b border-indigo-500/10 dark:border-white/5 flex justify-between items-center">
                            <span className="text-sm font-bold dark:text-white text-slate-800">Subject-wise Leaderboard: {SUBJECT_NAMES[subjectSelected]}</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead>
                                <tr className="bg-slate-200/50 dark:bg-white/5 border-b border-white/5 text-slate-500 font-bold">
                                  <th className="py-3 px-6 text-center w-16">Rank</th>
                                  <th className="py-3 px-6">Student Name</th>
                                  <th className="py-3 px-6 text-center">Class</th>
                                  <th className="py-3 px-6 text-center">Score</th>
                                  <th className="py-3 px-6 text-center">Grade</th>
                                  <th className="py-3 px-6 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[...studentsList]
                                  .sort((a,b) => b.scores[subjectSelected] - a.scores[subjectSelected])
                                  .map((s, idx) => {
                                    const score = s.scores[subjectSelected];
                                    const isFailing = score < 40;
                                    return (
                                      <tr key={s.id} className="border-b border-indigo-500/5 hover:bg-slate-200/30 dark:hover:bg-white/5 transition-all">
                                        <td className="py-3 px-6 text-center font-bold font-mono">#{idx + 1}</td>
                                        <td className="py-3 px-6 font-bold dark:text-white text-slate-800">{s.name}</td>
                                        <td className="py-3 px-6 text-center dark:text-slate-400 text-slate-500">{s.className}</td>
                                        <td className="py-3 px-6 text-center font-bold font-mono dark:text-indigo-400 text-indigo-600">{score} / 100</td>
                                        <td className="py-3 px-6 text-center font-bold font-mono">{calculateGrade(score)}</td>
                                        <td className="py-3 px-6 text-center">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${!isFailing ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {!isFailing ? 'Pass' : 'Fail'}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                      </div>
                    );
                  })()}

                </div>
              )}

              {/* --- VIEW: REPORTS --- */}
              {!loading && activeTab === 'reports' && studentsList.length > 0 && (
                <div className="space-y-6 animate-fade-in text-left">
                  
                  <div>
                    <h2 className="text-2xl font-extrabold dark:text-white text-slate-900 tracking-tight">Academic Report Center</h2>
                    <p className="text-xs dark:text-slate-400 text-slate-500 mt-1">Export, generate, or schedule compilation logs for cohorts and divisions.</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    {[
                      { title: 'Cumulative Rankings Log', format: 'PDF Document (A4)', desc: 'Consolidated listing of students sorted by final overall marks. Includes metadata signatures.', icon: <Trophy className="w-5 h-5 text-indigo-400" /> },
                      { title: 'Subject Performance Matrix', format: 'Excel spreadsheet', desc: 'Cell matrix of individual marks, subject-wise pass margins, standard deviations, and class scores.', icon: <FileText className="w-5 h-5 text-cyan-400" /> },
                      { title: 'Cohort AI Analytics Report', format: 'Interactive Slide Report', desc: 'Visual compilation of score histograms, grade distributions, anomaly alerts, and teaching recommendations.', icon: <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" /> }
                    ].map((rep, rIdx) => (
                      <div key={rIdx} className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col justify-between min-h-[200px]">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="p-2 bg-indigo-500/10 dark:bg-white/5 border border-indigo-500/15 rounded-lg text-indigo-400">{rep.icon}</div>
                            <span className="text-[9px] font-mono dark:bg-white/5 bg-slate-200 border border-slate-300 dark:border-white/10 dark:text-slate-400 text-slate-500 px-2 py-0.5 rounded">
                              {rep.format}
                            </span>
                          </div>
                          <h3 className="font-extrabold text-sm dark:text-white text-slate-800 tracking-tight">{rep.title}</h3>
                          <p className="text-xs dark:text-slate-400 text-slate-500 leading-relaxed">{rep.desc}</p>
                        </div>

                        <div className="mt-5 flex gap-2.5">
                          <button
                            onClick={() => alert(`Starting download for: ${rep.title}`)}
                            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow"
                          >
                            <Download className="w-3.5 h-3.5" /> Download Report
                          </button>
                          <button
                            onClick={() => alert(`Generating share link for: ${rep.title}`)}
                            className="p-2 rounded-lg border border-indigo-500/15 hover:bg-indigo-500/10 text-indigo-500 transition-all"
                            title="Share Link"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              )}

              {/* --- VIEW: SETTINGS --- */}
              {!loading && activeTab === 'settings' && (
                <div className="space-y-6 animate-fade-in text-left max-w-2xl">
                  
                  <div>
                    <h2 className="text-2xl font-extrabold dark:text-white text-slate-900 tracking-tight">System Configuration</h2>
                    <p className="text-xs dark:text-slate-400 text-slate-500 mt-1">Configure backend API ports, extraction parameters, and AI engine defaults.</p>
                  </div>

                  <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-bold text-sm dark:text-white text-slate-800 border-b border-white/5 pb-2">AI OCR Engine</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">OCR Model Core</label>
                          <select className="w-full text-xs font-bold dark:bg-white/5 bg-white border border-slate-300 dark:border-white/10 p-2 rounded-lg dark:text-white text-slate-700">
                            <option>Vision OCR Pro v2.4 (High Accuracy)</option>
                            <option>Vision OCR Lite v1.0 (High Speed)</option>
                            <option>Google Document AI API (Remote Connect)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Structuring LLM Engine</label>
                          <select className="w-full text-xs font-bold dark:bg-white/5 bg-white border border-slate-300 dark:border-white/10 p-2 rounded-lg dark:text-white text-slate-700">
                            <option>Gemini 3.5 Flash (Recommended)</option>
                            <option>Gemini 3.5 Pro (Precision Context)</option>
                            <option>Custom Fine-Tuned LLaMA (Self-Hosted)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold text-sm dark:text-white text-slate-800 border-b border-white/5 pb-2">Cohort Margins</h4>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Pass Score Threshold</label>
                          <input type="number" defaultValue="40" className="w-full text-xs font-bold dark:bg-white/5 bg-white border border-slate-300 dark:border-white/10 p-2 rounded-lg dark:text-white text-slate-700 text-center" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Honors List Cutoff (%)</label>
                          <input type="number" defaultValue="90" className="w-full text-xs font-bold dark:bg-white/5 bg-white border border-slate-300 dark:border-white/10 p-2 rounded-lg dark:text-white text-slate-700 text-center" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Attention Alarm Cutoff (%)</label>
                          <input type="number" defaultValue="50" className="w-full text-xs font-bold dark:bg-white/5 bg-white border border-slate-300 dark:border-white/10 p-2 rounded-lg dark:text-white text-slate-700 text-center" />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => alert('Configuration variables updated and cached locally.')}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all"
                    >
                      Save Configuration
                    </button>
                  </div>

                </div>
              )}

            </main>
          </div>

        </div>
      )}

    </div>
  );
}