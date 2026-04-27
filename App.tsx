import React, { useState, useRef } from 'react';
import { DifficultyLevel, AppState, ImageData } from './types';
import { fetchExplanation, fetchQuiz, fetchMindmap } from './services/geminiService';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { LiveTutor } from './components/LiveTutor';

const initialGenerationState = {
  isLoading: false,
  data: null,
  error: null,
};

const fileToBase64 = (file: File): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      const mimeType = result.split(';')[0].split(':')[1];
      resolve({ base64, mimeType });
    };
    reader.onerror = error => reject(error);
  });
};

const App: React.FC = () => {
  const [doubtInput, setDoubtInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  const [showLiveTutor, setShowLiveTutor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<AppState>({
    doubtText: '',
    difficulty: DifficultyLevel.INTERMEDIATE,
    explanation: initialGenerationState,
    quiz: initialGenerationState,
    mindmap: initialGenerationState,
  });

  const [activeTab, setActiveTab] = useState<'explanation' | 'quiz' | 'mindmap'>('explanation');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please try Chrome.");
      return;
    }

    if (isDictating) {
      setIsDictating(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsDictating(true);
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setDoubtInput((prev) => prev ? prev + ' ' + transcript : transcript);
    };

    recognition.onerror = () => setIsDictating(false);
    recognition.onend = () => setIsDictating(false);

    recognition.start();
  };

  const handleAction = async (actionType: 'explanation' | 'quiz' | 'mindmap') => {
    if (!doubtInput.trim() && !selectedFile) return;

    const currentDoubt = doubtInput.trim();
    const currentDifficulty = state.difficulty;
    const currentTopic = currentDoubt || "General concept from image";
    
    let imageData: ImageData | null = null;
    if (selectedFile) {
        imageData = await fileToBase64(selectedFile);
    }

    setActiveTab(actionType);

    const isNewInput = currentDoubt !== state.doubtText;

    setState(prev => ({
      ...prev,
      doubtText: currentDoubt,
      ...(isNewInput ? {
        explanation: actionType === 'explanation' ? { isLoading: true, data: null, error: null } : initialGenerationState,
        quiz: actionType === 'quiz' ? { isLoading: true, data: null, error: null } : initialGenerationState,
        mindmap: actionType === 'mindmap' ? { isLoading: true, data: null, error: null } : initialGenerationState,
      } : {
        [actionType]: { isLoading: true, data: prev[actionType].data, error: null } 
      })
    }));

    try {
      if (actionType === 'explanation') {
        const data = await fetchExplanation(currentDoubt, imageData, currentDifficulty);
        setState(prev => ({ ...prev, explanation: { isLoading: false, data, error: null } }));
      } else if (actionType === 'quiz') {
        const data = await fetchQuiz(currentTopic, currentDifficulty);
        setState(prev => ({ ...prev, quiz: { isLoading: false, data, error: null } }));
      } else if (actionType === 'mindmap') {
        const data = await fetchMindmap(currentTopic, currentDifficulty);
        setState(prev => ({ ...prev, mindmap: { isLoading: false, data, error: null } }));
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, [actionType]: { isLoading: false, data: null, error: error.message } }));
    }
  };

  const isGeneratingAny = state.explanation.isLoading || state.quiz.isLoading || state.mindmap.isLoading;
  const hasContent = state.explanation.data || state.quiz.data || state.mindmap.data || state.explanation.error || state.quiz.error || state.mindmap.error || isGeneratingAny;

  return (
    <div className="min-h-screen pb-24 font-sans relative">
      
      {showLiveTutor && (
         <LiveTutor 
           onClose={() => setShowLiveTutor(false)} 
           topicContext={doubtInput.trim() || undefined} 
         />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 glass-header">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300">
              L
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              LearnLab <span className="text-theme-blue">AI</span>
            </h1>
          </div>
          <div className="hidden sm:flex items-center space-x-6">
             <button onClick={() => setShowLiveTutor(true)} className="flex items-center text-sm font-bold tracking-wide text-theme-blue hover:text-blue-800 transition-colors">
                 <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                 Voice Assistant
             </button>
             <button className="text-sm font-semibold tracking-wide text-white transition-colors bg-theme-blue px-5 py-2.5 rounded-full shadow hover:bg-blue-700 hover:shadow-md transform hover:-translate-y-0.5">
                 For Students
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 space-y-16">
        
        {/* Hero Section */}
        <section className="text-center space-y-8 max-w-3xl mx-auto relative">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-600 mb-4 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setShowLiveTutor(true)}>
            <span className="flex h-2 w-2 rounded-full bg-theme-blue animate-pulse"></span>
            <span>New: Real-time Voice Tutor! Try it out ➔</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-tight">
            Smart Doubt-Solving <br/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-sky-500 to-blue-600 animate-gradient-x">
              for Schools
            </span>
          </h2>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
            Experience clear, context-aware explanations for any academic challenge. Elevate your understanding with instant, personalized AI tutoring.
          </p>
        </section>

        {/* Input Form Section */}
        <section className="max-w-3xl mx-auto relative z-10">
          <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/10 to-sky-400/10 rounded-[36px] blur-2xl opacity-70"></div>
          
          <div className="relative glass-panel p-8 sm:p-10 rounded-[28px] space-y-10">
            
            {/* Live Assistant Banner */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-5 bg-gradient-to-r from-blue-600 to-sky-500 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
               <div className="flex items-center mb-4 sm:mb-0">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mr-4 backdrop-blur-sm">
                     <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  </div>
                  <div>
                     <h4 className="font-bold text-lg">Talk to your Live Tutor</h4>
                     <p className="text-blue-100 text-sm font-medium">Real-time voice conversations for complex doubts.</p>
                  </div>
               </div>
               <button 
                 onClick={() => setShowLiveTutor(true)}
                 className="px-6 py-3 bg-white text-blue-600 font-bold rounded-xl shadow hover:shadow-lg hover:scale-105 transition-all w-full sm:w-auto text-center"
               >
                 Launch Assistant
               </button>
            </div>

            <div className="flex items-center space-x-4">
                 <div className="h-px bg-slate-200 flex-1"></div>
                 <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">OR USE TEXT</span>
                 <div className="h-px bg-slate-200 flex-1"></div>
            </div>

            {/* 1. Upload Your Doubt */}
            <div className="space-y-5">
              <div className="flex items-center space-x-4">
                 <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 border border-slate-200 text-theme-blue font-bold shadow-sm">1</div>
                 <h3 className="text-xl font-bold text-slate-900 tracking-tight">Describe your doubt</h3>
              </div>
              
              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400/30 to-sky-300/30 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                  <textarea
                    value={doubtInput}
                    onChange={(e) => setDoubtInput(e.target.value)}
                    placeholder="E.g., Explain the steps of cellular respiration..."
                    className="relative w-full h-36 p-5 pb-12 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 leading-relaxed resize-none transition-all shadow-sm"
                    disabled={isGeneratingAny}
                  />
                  
                  {/* Dictation Mic Button */}
                  <div className="absolute bottom-4 right-4 z-10 flex space-x-2">
                     <button
                       type="button"
                       onClick={toggleDictation}
                       disabled={isGeneratingAny}
                       title="Dictate text"
                       className={`p-2.5 rounded-full transition-all shadow-sm border ${
                         isDictating 
                           ? 'bg-red-50 border-red-200 text-red-500 animate-pulse' 
                           : 'bg-white border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50'
                       }`}
                     >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                     </button>
                  </div>
                </div>
                
                {/* Image Upload Area */}
                <div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    disabled={isGeneratingAny}
                  />
                  {!previewUrl ? (
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="group flex flex-col items-center justify-center w-full py-6 px-4 border border-dashed border-slate-300 rounded-2xl bg-slate-50 hover:bg-white hover:border-theme-blue transition-all duration-300"
                      disabled={isGeneratingAny}
                    >
                      <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:text-theme-blue transition-all duration-300 text-slate-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                      </div>
                      <span className="text-sm font-semibold text-slate-500 group-hover:text-theme-blue transition-colors">Attach an image for context (Optional)</span>
                    </button>
                  ) : (
                    <div className="relative inline-block mt-2 group">
                      <div className="absolute inset-0 bg-slate-900/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 backdrop-blur-[2px]">
                         <button 
                            type="button" 
                            onClick={clearFile}
                            className="bg-white text-red-600 rounded-full p-2 hover:bg-red-50 hover:scale-110 transition-all shadow-lg"
                            title="Remove image"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                      </div>
                      <img src={previewUrl} alt="Preview" className="h-32 w-auto rounded-xl border border-slate-200 object-cover shadow-md" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

            {/* 2. Select Difficulty Level */}
            <div className="space-y-5">
              <div className="flex items-center space-x-4">
                 <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 border border-slate-200 text-theme-blue font-bold shadow-sm">2</div>
                 <h3 className="text-xl font-bold text-slate-900 tracking-tight">Select difficulty</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-200">
                {Object.values(DifficultyLevel).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setState(prev => ({ ...prev, difficulty: level as DifficultyLevel }))}
                    disabled={isGeneratingAny}
                    className={`relative py-3 px-2 rounded-xl text-sm font-bold transition-all duration-300 overflow-hidden ${
                      state.difficulty === level
                        ? 'text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
                    }`}
                  >
                    {state.difficulty === level && (
                      <div className="absolute inset-0 bg-theme-blue opacity-100"></div>
                    )}
                    <span className="relative z-10">{level}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

            {/* 3. Choose Learning Action */}
            <div className="space-y-5">
              <div className="flex items-center space-x-4">
                 <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 border border-slate-200 text-theme-blue font-bold shadow-sm">3</div>
                 <h3 className="text-xl font-bold text-slate-900 tracking-tight">Choose your learning tool</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Explanation Button */}
                <button
                  type="button"
                  onClick={() => handleAction('explanation')}
                  disabled={isGeneratingAny || (!doubtInput.trim() && !selectedFile)}
                  className={`relative flex items-center justify-center w-full py-4 px-4 rounded-2xl text-[15px] font-bold transition-all duration-300 overflow-hidden group border ${
                    isGeneratingAny || (!doubtInput.trim() && !selectedFile)
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-theme-blue border-blue-600 text-white shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:bg-blue-700 hover:-translate-y-0.5'
                  }`}
                >
                  {state.explanation.isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <>
                      <svg className={`w-5 h-5 mr-2 ${isGeneratingAny ? 'opacity-50' : 'group-hover:scale-110 transition-transform'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477-4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Explain Concept
                    </>
                  )}
                </button>

                {/* Quiz Button */}
                <button
                  type="button"
                  onClick={() => handleAction('quiz')}
                  disabled={isGeneratingAny || (!doubtInput.trim() && !selectedFile)}
                  className={`relative flex items-center justify-center w-full py-4 px-4 rounded-2xl text-[15px] font-bold transition-all duration-300 overflow-hidden group border ${
                    isGeneratingAny || (!doubtInput.trim() && !selectedFile)
                      ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 hover:-translate-y-0.5 shadow-sm hover:shadow'
                  }`}
                >
                  {state.quiz.isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <>
                      <svg className={`w-5 h-5 mr-2 ${isGeneratingAny ? 'opacity-50' : 'text-indigo-500 group-hover:scale-110 transition-transform'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      Create Quiz
                    </>
                  )}
                </button>

                {/* Mindmap Button */}
                <button
                  type="button"
                  onClick={() => handleAction('mindmap')}
                  disabled={isGeneratingAny || (!doubtInput.trim() && !selectedFile)}
                  className={`relative flex items-center justify-center w-full py-4 px-4 rounded-2xl text-[15px] font-bold transition-all duration-300 overflow-hidden group border ${
                    isGeneratingAny || (!doubtInput.trim() && !selectedFile)
                      ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-sky-300 hover:text-sky-700 hover:bg-sky-50 hover:-translate-y-0.5 shadow-sm hover:shadow'
                  }`}
                >
                  {state.mindmap.isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-sky-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <>
                      <svg className={`w-5 h-5 mr-2 ${isGeneratingAny ? 'opacity-50' : 'text-sky-500 group-hover:scale-110 transition-transform'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Create Mind Map
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* Results Section */}
        {hasContent && (
          <section className="max-w-4xl mx-auto space-y-8 animate-[fadeIn_0.6s_ease-out]">
            
            {/* Elegant Tabs */}
            <div className="flex justify-center">
              <div className="inline-flex p-1.5 bg-slate-50 border border-slate-200 rounded-2xl flex-wrap gap-1 justify-center shadow-sm">
                <button
                  onClick={() => setActiveTab('explanation')}
                  className={`flex items-center px-6 sm:px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                    activeTab === 'explanation' 
                      ? 'bg-white text-theme-blue shadow-sm border border-slate-200' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                   <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                   Explanation
                </button>
                <button
                  onClick={() => setActiveTab('quiz')}
                  className={`flex items-center px-6 sm:px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                    activeTab === 'quiz' 
                      ? 'bg-white text-theme-blue shadow-sm border border-slate-200' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                   <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                   Practice Quiz
                </button>
                <button
                  onClick={() => setActiveTab('mindmap')}
                  className={`flex items-center px-6 sm:px-8 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                    activeTab === 'mindmap' 
                      ? 'bg-white text-theme-blue shadow-sm border border-slate-200' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                   <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                   Mindmap
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="glass-panel p-8 sm:p-12 rounded-[32px] min-h-[400px] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
              
              {activeTab === 'explanation' && (
                <div className="relative z-10">
                  {state.explanation.isLoading ? (
                    <div className="space-y-6 animate-pulse">
                      <div className="h-8 bg-slate-200 rounded-lg w-1/3 mb-8"></div>
                      <div className="space-y-3">
                        <div className="h-4 bg-slate-100 rounded w-full"></div>
                        <div className="h-4 bg-slate-100 rounded w-11/12"></div>
                        <div className="h-4 bg-slate-100 rounded w-full"></div>
                        <div className="h-4 bg-slate-100 rounded w-4/5"></div>
                      </div>
                      <div className="h-40 bg-slate-50 rounded-xl mt-8 border border-slate-100"></div>
                    </div>
                  ) : state.explanation.error ? (
                    <div className="p-6 bg-red-50 text-red-600 border border-red-100 rounded-2xl flex items-start space-x-4">
                      <svg className="w-6 h-6 shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <div>
                        <h4 className="font-semibold text-lg mb-1">Generation Failed</h4>
                        <p className="text-sm opacity-90">{state.explanation.error}</p>
                      </div>
                    </div>
                  ) : state.explanation.data ? (
                    <MarkdownRenderer content={state.explanation.data} />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
                      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477-4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">No Explanation Yet</h3>
                      <p className="text-slate-500 max-w-sm">Click "Explain Concept" above to get a detailed breakdown of your doubt.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'quiz' && (
                <div className="relative z-10">
                  {state.quiz.isLoading ? (
                    <div className="space-y-8 animate-pulse">
                      <div className="h-8 bg-slate-200 rounded-lg w-1/4 mb-6"></div>
                      {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-4">
                          <div className="h-5 bg-slate-100 rounded w-3/4"></div>
                          <div className="pl-6 space-y-3">
                            <div className="h-12 bg-slate-50 rounded-xl w-full border border-slate-100"></div>
                            <div className="h-12 bg-slate-50 rounded-xl w-full border border-slate-100"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : state.quiz.error ? (
                    <div className="p-6 bg-red-50 text-red-600 border border-red-100 rounded-2xl flex items-start space-x-4">
                      <svg className="w-6 h-6 shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <div>
                        <h4 className="font-semibold text-lg mb-1">Quiz Generation Failed</h4>
                        <p className="text-sm opacity-90">{state.quiz.error}</p>
                      </div>
                    </div>
                  ) : state.quiz.data ? (
                     <MarkdownRenderer content={state.quiz.data} />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
                      <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">Ready to Practice?</h3>
                      <p className="text-slate-500 max-w-sm">Click "Create Quiz" above to test your knowledge on this topic.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'mindmap' && (
                <div className="relative z-10">
                  {state.mindmap.isLoading ? (
                    <div className="space-y-6 animate-pulse">
                      <div className="h-8 bg-slate-200 rounded-lg w-1/4 mb-6"></div>
                      <div className="pl-4 space-y-4 border-l-2 border-slate-100">
                         <div className="h-5 bg-slate-100 rounded w-1/2"></div>
                         <div className="pl-6 space-y-3 border-l-2 border-slate-100">
                             <div className="h-4 bg-slate-50 rounded w-2/3"></div>
                             <div className="h-4 bg-slate-50 rounded w-3/4"></div>
                         </div>
                         <div className="h-5 bg-slate-100 rounded w-1/3"></div>
                         <div className="pl-6 space-y-3 border-l-2 border-slate-100">
                             <div className="h-4 bg-slate-50 rounded w-1/2"></div>
                             <div className="h-4 bg-slate-50 rounded w-2/5"></div>
                         </div>
                      </div>
                    </div>
                  ) : state.mindmap.error ? (
                    <div className="p-6 bg-red-50 text-red-600 border border-red-100 rounded-2xl flex items-start space-x-4">
                      <svg className="w-6 h-6 shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <div>
                        <h4 className="font-semibold text-lg mb-1">Mindmap Generation Failed</h4>
                        <p className="text-sm opacity-90">{state.mindmap.error}</p>
                      </div>
                    </div>
                  ) : state.mindmap.data ? (
                     <MarkdownRenderer content={state.mindmap.data} />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
                      <div className="w-16 h-16 rounded-full bg-sky-50 flex items-center justify-center text-sky-500 mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">Visualize It</h3>
                      <p className="text-slate-500 max-w-sm">Click "Create Mind Map" above to get a structured overview of the concepts.</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-32 py-10 border-t border-slate-200 bg-white relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-theme-blue font-bold text-sm border border-blue-100 mb-4">
              L
          </div>
          <p className="text-slate-600 font-medium">Team LearnLab AI: Sneha Singh, Surabhi Pandey, Harshit Srivastav, Priyanshu</p>
          <p className="mt-3 text-xs text-slate-400 font-mono">Powered by Google Gemini API</p>
        </div>
      </footer>
    </div>
  );
};

export default App;