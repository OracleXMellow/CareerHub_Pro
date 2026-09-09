'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Scaling,
  Scale,
  Sprout,
  Sun,
  Link2,
  CalendarDays,
  Clock,
  FileText,
  Send,
  Briefcase,
  Plus,
  X,
  Upload,
  Loader2,
} from 'lucide-react';

const JOB_TITLE_SUGGESTIONS = [
  'Software Engineer', 'Data Engineer', 'Product Manager', 'UX Designer',
  'Data Scientist', 'DevOps Engineer', 'Frontend Developer', 'Backend Developer',
  'Full Stack Developer', 'Project Manager', 'Business Analyst', 'Marketing Manager',
  'Sales Representative', 'Graphic Designer', 'Content Writer', 'HR Manager',
  'Financial Analyst', 'Operations Manager', 'Customer Success Manager',
  'Quality Assurance Engineer', 'Machine Learning Engineer', 'Cloud Architect',
  'Cybersecurity Analyst', 'Mobile Developer', 'Database Administrator',
  'Technical Writer', 'Scrum Master', 'Systems Administrator', 'Network Engineer',
  'UI Developer', 'Research Scientist', 'Account Manager', 'Supply Chain Manager',
  'Delivery Driver', 'Direct Support Professional', 'Dishwasher', 'Dental Assistant',
  'Driver', 'Dietary Aide', 'Data Analyst', 'Digital Marketing Specialist',
];

interface StepProps {
  onNext: () => void;
  onBack?: () => void;
}

type CareerMotivation = 'strengths' | 'balance' | 'skills' | 'fresh_start';
type JobTimeline = 'right_fit' | 'couple_months' | 'asap';
type HelpArea = 'resume' | 'tracking' | 'openings';

export function OnboardingWizard({ userName }: { userName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [careerMotivation, setCareerMotivation] = useState<CareerMotivation | null>(null);
  const [jobTimeline, setJobTimeline] = useState<JobTimeline | null>(null);
  const [helpArea, setHelpArea] = useState<HelpArea | null>(null);
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [currentTitle, setCurrentTitle] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>;
  const suggestionsRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;

  const filteredSuggestions = currentTitle.length > 0
    ? JOB_TITLE_SUGGESTIONS.filter(t =>
        t.toLowerCase().includes(currentTitle.toLowerCase()) &&
        !jobTitles.includes(t)
      ).slice(0, 6)
    : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addJobTitle = (title: string) => {
    const trimmed = title.trim();
    if (trimmed && !jobTitles.includes(trimmed)) {
      setJobTitles(prev => [...prev, trimmed]);
    }
    setCurrentTitle('');
    setShowSuggestions(false);
  };

  const removeJobTitle = (title: string) => {
    setJobTitles(prev => prev.filter(t => t !== title));
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          careerMotivation,
          jobTimeline,
          helpArea,
          targetJobTitles: jobTitles,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      router.replace('/dashboard');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const totalSteps = 5;
  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-[#f7f7f5] flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-[#0d4f4f] font-display tracking-tight">CareerHub</span>
          <Briefcase className="h-6 w-6 text-[#0d4f4f]" />
        </div>
      </header>

      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-200">
        <div
          className="h-full bg-[#0d4f4f] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          {step === 0 && (
            <StepMotivation
              userName={userName}
              value={careerMotivation}
              onChange={setCareerMotivation}
              onNext={() => setStep(1)}
            />
          )}
          {step === 1 && (
            <StepTimeline
              value={jobTimeline}
              onChange={setJobTimeline}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <StepHelpArea
              value={helpArea}
              onChange={setHelpArea}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <StepJobTitle
              jobTitles={jobTitles}
              currentTitle={currentTitle}
              setCurrentTitle={setCurrentTitle}
              showSuggestions={showSuggestions}
              setShowSuggestions={setShowSuggestions}
              filteredSuggestions={filteredSuggestions}
              inputRef={inputRef}
              suggestionsRef={suggestionsRef}
              addJobTitle={addJobTitle}
              removeJobTitle={removeJobTitle}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <StepGetStarted
              saving={saving}
              onFinish={handleFinish}
              onBack={() => setStep(3)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Step 1: Career Motivation ─── */
function StepMotivation({
  userName, value, onChange, onNext,
}: { userName: string; value: CareerMotivation | null; onChange: (v: CareerMotivation) => void } & StepProps) {
  const options: { id: CareerMotivation; label: string; icon: React.ReactNode }[] = [
    { id: 'strengths', label: 'Work that fits my strengths', icon: <Scaling className="h-5 w-5" /> },
    { id: 'balance', label: 'Better work-life balance', icon: <Scale className="h-5 w-5" /> },
    { id: 'skills', label: 'Develop new skills', icon: <Sprout className="h-5 w-5" /> },
    { id: 'fresh_start', label: 'A fresh start', icon: <Sun className="h-5 w-5" /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-400">
      <div>
        <h1 className="text-2xl font-bold text-[#0d4f4f] mb-2">
          Welcome {userName}!
        </h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          To best help with your search,<br />
          we&apos;d love to learn a little bit about you.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-5">
          What&apos;s driving your career move?
        </h2>
        <div className="space-y-3">
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 transition-all duration-200 text-left ${
                value === opt.id
                  ? 'border-[#0d4f4f] bg-[#e8f4f4] shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  value === opt.id ? 'border-[#0d4f4f]' : 'border-gray-300'
                }`}>
                  {value === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-[#0d4f4f]" />}
                </div>
                <span className="text-gray-800 font-medium">{opt.label}</span>
              </div>
              <span className="text-gray-400">{opt.icon}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!value}
        className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-200 ${
          value
            ? 'bg-[#0d4f4f] hover:bg-[#0a3f3f] shadow-md'
            : 'bg-gray-300 cursor-not-allowed'
        }`}
      >
        Continue
      </button>
    </div>
  );
}

/* ─── Step 2: Job Timeline ─── */
function StepTimeline({
  value, onChange, onNext, onBack,
}: { value: JobTimeline | null; onChange: (v: JobTimeline) => void } & StepProps) {
  const options: { id: JobTimeline; label: string; icon: React.ReactNode }[] = [
    { id: 'right_fit', label: 'Whenever I find the right fit', icon: <Link2 className="h-5 w-5" /> },
    { id: 'couple_months', label: 'In the next couple months', icon: <CalendarDays className="h-5 w-5" /> },
    { id: 'asap', label: 'As soon as possible', icon: <Clock className="h-5 w-5" /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-400">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-5">
          When would you like to start your<br />new job?
        </h2>
        <div className="space-y-3">
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 transition-all duration-200 text-left ${
                value === opt.id
                  ? 'border-[#0d4f4f] bg-[#e8f4f4] shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  value === opt.id ? 'border-[#0d4f4f]' : 'border-gray-300'
                }`}>
                  {value === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-[#0d4f4f]" />}
                </div>
                <span className="text-gray-800 font-medium">{opt.label}</span>
              </div>
              <span className="text-gray-400">{opt.icon}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3.5 rounded-xl font-semibold text-gray-600 border-2 border-gray-200 bg-white hover:bg-gray-50 transition-all"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!value}
          className={`flex-1 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 ${
            value
              ? 'bg-[#0d4f4f] hover:bg-[#0a3f3f] shadow-md'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

/* ─── Step 3: Help Area ─── */
function StepHelpArea({
  value, onChange, onNext, onBack,
}: { value: HelpArea | null; onChange: (v: HelpArea) => void } & StepProps) {
  const options: { id: HelpArea; label: string; icon: React.ReactNode }[] = [
    { id: 'resume', label: 'Improving my resume', icon: <FileText className="h-5 w-5" /> },
    { id: 'tracking', label: 'Tracking my applications', icon: <Send className="h-5 w-5" /> },
    { id: 'openings', label: 'Finding job openings', icon: <Briefcase className="h-5 w-5" /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-400">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-5">
          Where would you like the most help<br />right now?
        </h2>
        <div className="space-y-3">
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 transition-all duration-200 text-left ${
                value === opt.id
                  ? 'border-[#0d4f4f] bg-[#e8f4f4] shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  value === opt.id ? 'border-[#0d4f4f]' : 'border-gray-300'
                }`}>
                  {value === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-[#0d4f4f]" />}
                </div>
                <span className="text-gray-800 font-medium">{opt.label}</span>
              </div>
              <span className="text-gray-400">{opt.icon}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3.5 rounded-xl font-semibold text-gray-600 border-2 border-gray-200 bg-white hover:bg-gray-50 transition-all"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!value}
          className={`flex-1 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 ${
            value
              ? 'bg-[#0d4f4f] hover:bg-[#0a3f3f] shadow-md'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

/* ─── Step 4: Job Title ─── */
function StepJobTitle({
  jobTitles, currentTitle, setCurrentTitle, showSuggestions, setShowSuggestions,
  filteredSuggestions, inputRef, suggestionsRef, addJobTitle, removeJobTitle,
  onNext, onBack,
}: {
  jobTitles: string[];
  currentTitle: string;
  setCurrentTitle: (v: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (v: boolean) => void;
  filteredSuggestions: string[];
  inputRef: React.RefObject<HTMLInputElement>;
  suggestionsRef: React.RefObject<HTMLDivElement>;
  addJobTitle: (t: string) => void;
  removeJobTitle: (t: string) => void;
} & StepProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-400">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-5">
          What job title are you looking for?
        </h2>

        {/* Existing titles */}
        {jobTitles.length > 0 && (
          <div className="space-y-2 mb-4">
            {jobTitles.map(title => (
              <div
                key={title}
                className="flex items-center justify-between px-5 py-3.5 rounded-xl border-2 border-[#0d4f4f] bg-[#e8f4f4]"
              >
                <span className="text-gray-800 font-medium">{title}</span>
                <button
                  onClick={() => removeJobTitle(title)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input with autocomplete */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={currentTitle}
            onChange={e => {
              setCurrentTitle(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => currentTitle.length > 0 && setShowSuggestions(true)}
            onKeyDown={e => {
              if (e.key === 'Enter' && currentTitle.trim()) {
                e.preventDefault();
                addJobTitle(currentTitle);
              }
            }}
            placeholder="Type a job title..."
            className="w-full px-5 py-3.5 rounded-xl border-2 border-[#0d4f4f] bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d4f4f]/20 text-base"
          />

          {/* Suggestions dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-[#0d4f4f] rounded-xl shadow-lg max-h-48 overflow-y-auto z-50"
            >
              {filteredSuggestions.map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => addJobTitle(suggestion)}
                  className="w-full text-left px-5 py-3 text-gray-700 hover:bg-[#e8f4f4] transition-colors first:rounded-t-xl last:rounded-b-xl"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add Another link */}
        {jobTitles.length > 0 && (
          <button
            onClick={() => inputRef.current?.focus()}
            className="flex items-center gap-1.5 mt-3 text-[#0d4f4f] font-medium text-sm hover:underline"
          >
            <Plus className="h-4 w-4" /> Add Another
          </button>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3.5 rounded-xl font-semibold text-gray-600 border-2 border-gray-200 bg-white hover:bg-gray-50 transition-all"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={jobTitles.length === 0}
          className={`flex-1 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 ${
            jobTitles.length > 0
              ? 'bg-[#0d4f4f] hover:bg-[#0a3f3f] shadow-md'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

/* ─── Step 5: Get Started (Resume Upload or Paste) ─── */
function StepGetStarted({
  saving, onFinish, onBack,
}: { saving: boolean; onBack: () => void; onFinish: () => void }) {
  const [tab, setTab] = useState<'file' | 'paste'>('file');
  const [pasteText, setPasteText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const tabs: { id: 'file' | 'paste'; label: string }[] = [
    { id: 'file', label: 'Resume File' },
    { id: 'paste', label: 'Paste Text' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-[#0d4f4f] mb-2">
          Great, let&apos;s get started!
        </h2>
        <p className="text-gray-500 mb-6">
          Upload your background, and we&apos;ll build a resume that showcases your best qualities.
        </p>

        <p className="text-sm font-bold text-gray-900 mb-4">
          How would you like to add your career information?
        </p>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'file' && (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium mb-1">
              {selectedFile ? selectedFile.name : 'Choose a file or drag and drop it here.'}
            </p>
            <p className="text-gray-400 text-sm mb-4">.doc, .docx or .pdf, up to 50 MB.</p>
            <label className="inline-block cursor-pointer">
              <span className="px-5 py-2.5 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all">
                Browse File
              </span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) setSelectedFile(file);
                }}
              />
            </label>
          </div>
        )}

        {tab === 'paste' && (
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder="Paste your resume text here..."
            rows={8}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#0d4f4f] focus:ring-2 focus:ring-[#0d4f4f]/20 resize-none text-sm"
          />
        )}

        {/* Action buttons */}
        <div className="mt-6 space-y-3">
          <button
            onClick={onFinish}
            disabled={saving}
            className="w-full py-3.5 rounded-xl font-semibold text-white bg-[#0d4f4f] hover:bg-[#0a3f3f] shadow-md transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              'Next'
            )}
          </button>
          <button
            onClick={onFinish}
            disabled={saving}
            className="w-full text-gray-500 text-sm font-medium hover:text-gray-700 transition-colors"
          >
            Skip
          </button>
        </div>
      </div>

      <button
        onClick={onBack}
        className="w-full py-3 text-gray-500 font-medium hover:text-gray-700 transition-colors text-sm"
      >
        ← Back
      </button>
    </div>
  );
}
