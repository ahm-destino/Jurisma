import React, { useState, useRef, useEffect } from "react";
import {
  Search, Users, Sparkles, Shield,
  Scale, ArrowRight, Globe,
  ChevronRight, Command, Zap,
  MessageSquare, BookOpen, Activity, Check,
  Cpu, FileText, Lock, ChevronDown, ChevronUp,
  Star, Quote, GraduationCap, UserCheck, HelpCircle,
  FileCode, BrainCircuit, ScanSearch, MessagesSquare,
  MessageCircle, X, Send, Loader2, Bot
} from "lucide-react";
import Button from "../components/ui/Button.jsx";
import { generateLegalContent } from "../services/geminiService.js";

// --- Visual Components ---

const BackgroundEffects = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-0 left-1/4 w-72 md:w-96 h-72 md:h-96 bg-jurisma-accent/10 dark:bg-jurisma-accent/5 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[60px] md:blur-[80px] opacity-70 animate-blob"></div>
    <div className="absolute top-0 right-1/4 w-72 md:w-96 h-72 md:h-96 bg-blue-200/20 dark:bg-jurisma-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[60px] md:blur-[80px] opacity-70 animate-blob animation-delay-2000"></div>
    <div className="absolute -bottom-32 left-1/3 w-72 md:w-96 h-72 md:h-96 bg-purple-200/20 dark:bg-indigo-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[60px] md:blur-[80px] opacity-70 animate-blob animation-delay-4000"></div>
    <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:30px_30px] md:bg-[size:40px_40px]"></div>
  </div>
);

const Badge = ({ text, icon: Icon }) => (
  <div className="inline-flex items-center space-x-2 bg-white/80 dark:bg-jurisma-800/80 border border-indigo-100 dark:border-jurisma-500/30 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-jurisma-accent shadow-sm backdrop-blur-md animate-fade-in mb-8">
    {Icon && <Icon size={12} className="text-jurisma-accent animate-pulse" />}
    <span className="tracking-wide uppercase">{text}</span>
  </div>
);

const SectionTitle = ({ title, subtitle, align = "center" }) => (
  <div className={`mb-16 max-w-3xl ${align === "center" ? "mx-auto text-center" : ""} px-4 relative z-10`}>
    <h2 className="text-3xl md:text-5xl font-sans font-bold mb-6 text-slate-900 dark:text-jurisma-50 tracking-tight leading-tight">
      {title}
    </h2>
    <p className="text-lg text-slate-600 dark:text-jurisma-100/70 leading-relaxed font-light">
      {subtitle}
    </p>
  </div>
);

const BentoCard = ({ children, className = "", title, icon: Icon, delay = 0, onClick }) => (
  <div
    onClick={onClick}
    className={`
      relative group overflow-hidden rounded-3xl p-8 transition-all duration-500
      bg-white dark:bg-jurisma-800 border border-indigo-50 dark:border-jurisma-500/30
      hover:shadow-xl hover:shadow-indigo-500/5 dark:hover:bg-jurisma-800/80 dark:hover:border-jurisma-accent/30
      ${className} ${onClick ? 'cursor-pointer' : ''}
    `}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 dark:bg-jurisma-accent/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 dark:group-hover:bg-jurisma-accent/10 transition-colors"></div>

    <div className="relative z-10 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        {Icon && (
          <div className="w-12 h-12 rounded-2xl bg-indigo-50/50 dark:bg-jurisma-900 border border-indigo-100 dark:border-jurisma-500/30 flex items-center justify-center text-indigo-900 dark:text-jurisma-50 group-hover:text-jurisma-accent group-hover:scale-110 transition-all duration-300">
            <Icon size={22} strokeWidth={1.5} />
          </div>
        )}
        {title && <h3 className="text-xs font-bold text-slate-500 dark:text-jurisma-100/50 uppercase tracking-widest">{title}</h3>}
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  </div>
);

// --- Chat Widget Component ---

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 'welcome', role: 'model', text: 'Welcome to Jurisma. I am your AI legal assistant. How can I help you navigate the law today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [hasOpened, setHasOpened] = useState(false);

  // Auto-open effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasOpened) {
        setIsOpen(true);
        setHasOpened(true);
      }
    }, 4000); // 4 seconds delay
    return () => clearTimeout(timer);
  }, [hasOpened]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const text = await generateLegalContent(userMsg.text);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: text
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I'm having trouble connecting right now. Please try again later."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 ${isOpen
          ? 'bg-red-500 rotate-90'
          : 'bg-jurisma-900 dark:bg-jurisma-accent text-white dark:text-jurisma-900 animate-bounce'
          }`}
      >
        {isOpen ? <X size={24} className="text-white" /> : <Sparkles size={24} />}
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-24 right-4 sm:right-6 w-[calc(100%-32px)] sm:w-[400px] h-[calc(100%-120px)] sm:h-[500px] max-h-[600px] bg-white dark:bg-jurisma-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-jurisma-500/30 flex flex-col z-40 transition-all duration-500 origin-bottom-right ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-50 opacity-0 translate-y-10 pointer-events-none'
          }`}
      >
        {/* Header */}
        <div className="p-4 bg-jurisma-900 dark:bg-jurisma-900 rounded-t-2xl flex items-center space-x-3 border-b border-white/10">
          <div className="w-8 h-8 rounded-full bg-jurisma-accent flex items-center justify-center text-jurisma-900">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Jurisma Assistant</h3>
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-jurisma-100 text-xs">Online</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-jurisma-800/50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                  ? 'bg-jurisma-900 text-white rounded-br-none'
                  : 'bg-white dark:bg-jurisma-700 text-slate-700 dark:text-jurisma-100 border border-slate-200 dark:border-jurisma-500/30 rounded-bl-none shadow-sm'
                  }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-jurisma-700 p-3 rounded-2xl rounded-bl-none border border-slate-200 dark:border-jurisma-500/30 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-jurisma-accent" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-white dark:bg-jurisma-800 border-t border-slate-100 dark:border-jurisma-500/30 rounded-b-2xl">
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-jurisma-900 border border-slate-200 dark:border-jurisma-500/30 rounded-xl px-3 py-2">
            <input
              type="text"
              placeholder="Ask a legal question..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-900 dark:text-jurisma-50 placeholder:text-slate-400"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-1.5 bg-jurisma-accent text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// --- Sections ---

const Hero = ({ onCta, onViewChange }) => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-20 overflow-hidden bg-transparent transition-colors duration-500">

      {/* (Background effects handled by main component) */}

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 flex flex-col items-center text-center overflow-hidden">
        <div className="mb-6 md:mb-10">
          <Badge text="Jurisma is Live" icon={Activity} />
        </div>

        <h1 className="w-full text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-sans font-bold text-slate-900 dark:text-jurisma-50 tracking-tighter mb-6 md:mb-8 leading-[1.2] md:leading-[0.95] animate-fade-in max-w-4xl mx-auto">
          Legal <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-500 dark:from-jurisma-50 dark:to-jurisma-100/50">Intelligence</span> <br className="sm:hidden" /> <span className="text-jurisma-accent">Reimagined.</span>
        </h1>

        <p className="text-base md:text-xl text-slate-500 dark:text-jurisma-100/70 max-w-2xl mx-auto mb-10 md:mb-12 font-normal leading-relaxed animate-fade-in px-2" style={{ animationDelay: '100ms' }}>
          The operating system for modern justice. Verify professionals, analyze precedents, and leverage AI in one unified interface.
        </p>

        {/* Command Bar Search */}
        <div className="relative w-full max-w-2xl mx-auto group animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="absolute -inset-1 bg-gradient-to-r from-jurisma-accent/20 to-jurisma-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
          <div
            onClick={() => onViewChange('lawyers')}
            className="relative flex items-center bg-white dark:bg-jurisma-800 border border-slate-200 dark:border-jurisma-500/30 rounded-2xl p-2 pr-2 shadow-xl shadow-slate-200/50 dark:shadow-none cursor-pointer backdrop-blur-xl"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-50 dark:bg-jurisma-900 text-slate-500 dark:text-jurisma-100">
              <Search size={20} />
            </div>
            <div className="flex-1 px-3 md:px-4 text-left min-w-0">
              <div className="text-[10px] font-bold text-slate-400 dark:text-jurisma-100/40 uppercase tracking-wider mb-0.5">Global Search</div>
              <div className="text-slate-900 dark:text-jurisma-50 font-medium truncate text-sm md:text-base">Find lawyers, practice areas, or case law...</div>
            </div>
            <div className="hidden md:flex items-center gap-3 px-4">
              <span className="px-2 py-1 rounded bg-slate-100 dark:bg-jurisma-900 text-[10px] font-bold text-slate-500 dark:text-jurisma-100/50 font-mono border border-slate-200 dark:border-jurisma-500/30">⌘ K</span>
            </div>
            <Button className="ml-2 rounded-xl px-4 md:px-6 h-10 md:h-12 shadow-lg shadow-jurisma-accent/20 text-xs md:text-sm" variant="secondary">
              Explore
            </Button>
          </div>
        </div>

        {/* Floating Feature Pills */}
        <div className="mt-16 flex flex-wrap justify-center gap-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
          {['Supreme Court Judgement', 'AI Analysis', 'Community Hub'].map((item, i) => (
            <div key={i} className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white dark:bg-jurisma-800 border border-slate-200 dark:border-jurisma-500/30 shadow-sm text-slate-600 dark:text-jurisma-100 text-xs font-semibold hover:border-jurisma-accent/50 transition-colors cursor-default">
              <Shield size={12} className="text-jurisma-accent" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Section 2: Features of Jurisma
const FeatureSection = ({ onViewChange }) => {
  return (
    <section className="py-32 px-4 relative transition-colors duration-500 bg-transparent z-10">
      <div className="max-w-7xl mx-auto">
        <SectionTitle
          title="Features of Jurisma"
          subtitle="Explore seamless access to Jurisma's artificial intelligence built for you"
        />

        {/* Bento Grid: 4 Items */}
        {/* Desktop: 4 columns. Mobile: 1 column. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">

          {/* 1. Jurisma AI (Main Feature) - Top Left 2x2 */}
          <BentoCard
            className="sm:col-span-2 md:row-span-2 bg-gradient-to-br from-indigo-50/50 to-white dark:from-jurisma-800 dark:to-jurisma-900 px-6 py-8 md:p-8"
            title="Jurisma AI"
            icon={BrainCircuit}
          >
            <div className="flex flex-col h-full justify-between">
              <div>
                <h4 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-jurisma-50 mb-3 md:mb-4">Personalized Advice</h4>
                <p className="text-slate-600 dark:text-jurisma-100/70 text-sm md:text-base leading-relaxed max-w-md">
                  Give you personalized legal advice on every area of law instantly, tailored to your specific needs.
                </p>
              </div>

              <div className="mt-6 md:mt-8 relative h-40 md:h-48 w-full overflow-hidden rounded-2xl bg-white dark:bg-jurisma-900 border border-indigo-100 dark:border-jurisma-500/30 shadow-inner">
                {/* Simulated Chat UI */}
                <div className="p-4 space-y-3">
                  <div className="flex justify-end"><div className="bg-jurisma-900 text-white dark:bg-jurisma-700 text-[10px] md:text-xs px-3 py-2 rounded-lg rounded-br-none max-w-[80%]">Is this clause valid in Lagos?</div></div>
                  <div className="flex justify-start"><div className="bg-indigo-50 dark:bg-jurisma-800 text-slate-700 dark:text-jurisma-100 text-[10px] md:text-xs px-3 py-2 rounded-lg rounded-bl-none max-w-[90%] border border-indigo-100 dark:border-jurisma-500/20">Based on the Lagos State Tenancy Law 2011...</div></div>
                </div>
              </div>
            </div>
          </BentoCard>

          {/* 2. Document Generator - Top Right 2x1 */}
          <BentoCard
            className="sm:col-span-2 md:row-span-1 px-6 py-8 md:p-8"
            title="Document Generator"
            icon={FileCode}
          >
            <div className="flex flex-col justify-center h-full">
              <h4 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-jurisma-50 mb-2">Instant Drafting</h4>
              <p className="text-slate-600 dark:text-jurisma-100/70 text-xs md:text-sm">
                Draft and generate any legal document of your choice instantly and effortlessly, anytime you need.
              </p>
            </div>
          </BentoCard>

          {/* 3. Analyzer - Bottom Left (of the right block) 1x1 */}
          <BentoCard
            className="sm:col-span-1 md:row-span-1 px-6 py-8 md:p-8"
            title="Analyzer"
            icon={ScanSearch}
          >
            <div className="flex flex-col justify-end h-full">
              <h4 className="text-base md:text-lg font-bold text-slate-900 dark:text-jurisma-50 mb-2">Deep Scan</h4>
              <p className="text-[10px] md:text-xs text-slate-600 dark:text-jurisma-100/70">
                Upload any legal document — our AI will analyze, explain, and advise you instantly based on the document.
              </p>
            </div>
          </BentoCard>

          {/* 4. Summarizer - Bottom Right 1x1 */}
          <BentoCard
            className="sm:col-span-1 md:row-span-1 px-6 py-8 md:p-8"
            title="Summarizer"
            icon={FileText}
          >
            <div className="flex flex-col justify-end h-full">
              <h4 className="text-base md:text-lg font-bold text-slate-900 dark:text-jurisma-50 mb-2">Quick Briefs</h4>
              <p className="text-[10px] md:text-xs text-slate-600 dark:text-jurisma-100/70">
                Summarize your documents for you faster, making it convenient to access them on the go.
              </p>
            </div>
          </BentoCard>

        </div>
      </div>
    </section>
  );
};

// Section 3: Benefits (Kept for continuity, but updated look)
const BenefitSection = () => {
  const roles = [
    {
      title: "Individual Clarity",
      desc: "Access a transparent marketplace of verified legal talent. Find the right counsel, fast.",
      icon: UserCheck
    },
    {
      title: "Academic Excellence",
      desc: "Bridge the gap between academic theory and practice. Access notes, mentorship, and peers.",
      icon: GraduationCap
    },
    {
      title: "Professional Velocity",
      desc: "Manage your practice, expand your visibility, and leverage AI to work smarter, not harder.",
      icon: Scale
    }
  ];

  return (
    <section className="py-24 bg-indigo-50/30 dark:bg-jurisma-800/50 relative z-10 border-t border-indigo-50 dark:border-jurisma-500/10">
      <div className="max-w-7xl mx-auto px-4">
        <SectionTitle
          title="Precision & Performance"
          subtitle="Engineered for every practitioner in the legal process."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
          {roles.map((role, i) => (
            <div key={i} className="flex flex-col items-center text-center p-8 rounded-2xl bg-white dark:bg-jurisma-900 border border-indigo-50 dark:border-jurisma-500/20 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-jurisma-800 border border-indigo-100 dark:border-jurisma-500/30 flex items-center justify-center text-slate-900 dark:text-jurisma-50 mb-6 shadow-inner">
                <role.icon size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-jurisma-50 mb-3">{role.title}</h3>
              <p className="text-slate-500 dark:text-jurisma-100/70 leading-relaxed max-w-xs">
                {role.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Section 4: Testimonials
const TestimonialSection = () => {
  return (
    <section className="py-24 bg-white dark:bg-jurisma-900 relative z-10 border-t border-indigo-50 dark:border-jurisma-500/10">
      <div className="max-w-7xl mx-auto px-4">
        <SectionTitle
          title="What Our Users Say"
          subtitle="Trusted by legal professionals and individuals across the country."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-8 rounded-2xl bg-indigo-50/30 dark:bg-jurisma-800 border border-indigo-100 dark:border-jurisma-500/20 relative">
              <Quote className="absolute top-6 right-6 text-indigo-200 dark:text-jurisma-700" size={40} />
              <div className="flex text-amber-500 mb-4">
                {[...Array(5)].map((_, j) => <Star key={j} size={14} fill="currentColor" />)}
              </div>
              <p className="text-slate-700 dark:text-jurisma-100/80 mb-6 italic relative z-10 text-sm leading-relaxed">
                "Jurisma has completely transformed how I handle preliminary research. The document generator alone saves me hours every week."
              </p>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-200 dark:bg-jurisma-700 rounded-full flex items-center justify-center text-xs font-bold text-indigo-800 dark:text-jurisma-100">
                  JD
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-jurisma-50">John Doe</div>
                  <div className="text-xs text-slate-500 dark:text-jurisma-500">Senior Associate</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Section 5: FAQ
const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    { q: "Is Jurisma AI free to use?", a: "We offer a generous free tier for individuals and students. Professionals can upgrade for advanced features." },
    { q: "How accurate is the legal advice?", a: "Our AI is trained on verified legal statutes and precedents, but it is a tool to assist, not replace, professional legal counsel." },
    { q: "Is my document data secure?", a: "Yes, we use enterprise-grade encryption for all uploaded documents and generated content." },
    { q: "Can I use the Document Generator for any contract?", a: "We support a wide range of common legal documents including NDAs, employment contracts, and tenancy agreements." }
  ];

  return (
    <section className="py-24 bg-indigo-50/20 dark:bg-jurisma-800 relative z-10 border-t border-indigo-50 dark:border-jurisma-500/10 transition-colors">
      <div className="max-w-3xl mx-auto px-4">
        <SectionTitle title="Frequently Asked Questions" subtitle="Everything you need to know about the platform." />

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white dark:bg-jurisma-900 rounded-xl border border-indigo-100 dark:border-jurisma-500/30 overflow-hidden shadow-sm">
              <button
                className="w-full flex justify-between items-center p-5 text-left focus:outline-none hover:bg-indigo-50/50 dark:hover:bg-jurisma-800 transition-colors"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className={`font-medium text-slate-900 dark:text-jurisma-50 ${openIndex === i ? 'text-indigo-600 dark:text-jurisma-accent' : ''}`}>
                  {faq.q}
                </span>
                {openIndex === i ? <ChevronUp size={20} className="text-indigo-500" /> : <ChevronDown size={20} className="text-slate-400" />}
              </button>
              {openIndex === i && (
                <div className="px-5 pb-5 text-slate-600 dark:text-jurisma-100/70 leading-relaxed text-sm animate-fade-in border-t border-indigo-50 dark:border-jurisma-500/10 pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Section 6: CTA (Distinct Hierarchy)
const CTA = ({ onCta }) => (
  <section className="py-24 bg-white dark:bg-black text-center px-4 relative overflow-hidden transition-colors duration-500 border-t border-indigo-100 dark:border-jurisma-500/30 border-b dark:border-b-0 z-20">
    <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] pointer-events-none"></div>
    {/* Dark Mode Gradient to separate clearly from footer */}
    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white dark:to-jurisma-950 opacity-50 pointer-events-none"></div>

    <div className="relative z-10 max-w-3xl mx-auto">
      <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 md:mb-8 tracking-tight">Ready to upgrade?</h2>
      <p className="text-lg md:text-xl text-slate-500 dark:text-jurisma-100/70 mb-8 md:mb-10 font-light">
        Join the ecosystem defining the future of legal intelligence.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Button onClick={onCta} className="h-14 px-8 text-lg shadow-xl shadow-jurisma-accent/20" variant="secondary">
          Initialize Account
        </Button>
        <Button variant="outline" className="h-14 px-8 text-lg border-slate-300 dark:border-jurisma-500/30 hover:bg-indigo-50 dark:hover:bg-jurisma-800 text-slate-900 dark:text-jurisma-50">
          Contact Sales
        </Button>
      </div>
    </div>
  </section>
);

// Footer (Preserved)
const Footer = ({ onViewChange }) => (
  <footer className="bg-white dark:bg-black py-16 border-t border-slate-200 dark:border-white/10 text-sm transition-colors duration-500 relative z-20">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row justify-between gap-12 mb-16">
        <div className="max-w-xs">
          <div className="flex items-center space-x-2 mb-6">
            <Scale className="h-6 w-6 text-slate-900 dark:text-jurisma-50" />
            <span className="text-xl font-bold text-slate-900 dark:text-jurisma-50 tracking-tight">JURISMA</span>
          </div>
          <p className="text-slate-500 dark:text-jurisma-100/40 leading-relaxed">
            Building the digital infrastructure for Nigeria's legal system. Secure, efficient, and accessible.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-16">
          <div>
            <h4 className="text-slate-900 dark:text-jurisma-50 font-bold mb-6">Platform</h4>
            <ul className="space-y-4 text-slate-500 dark:text-jurisma-100/60">
              <li><button onClick={() => onViewChange('lawyers')} className="hover:text-jurisma-accent transition-colors">Directory</button></li>
              <li><button onClick={() => onViewChange('community')} className="hover:text-jurisma-accent transition-colors">Community</button></li>
              <li><button className="hover:text-jurisma-accent transition-colors">AI Engine</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-slate-900 dark:text-jurisma-50 font-bold mb-6">Company</h4>
            <ul className="space-y-4 text-slate-500 dark:text-jurisma-100/60">
              <li><button className="hover:text-jurisma-accent transition-colors">About</button></li>
              <li><button className="hover:text-jurisma-accent transition-colors">Contact</button></li>
              <li><button className="hover:text-jurisma-accent transition-colors">Privacy</button></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-slate-100 dark:border-jurisma-500/30 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400 dark:text-jurisma-100/30">
        <div>© 2026 Jurisma Inc. All rights reserved.</div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          System Operational
        </div>
      </div>
    </div>
  </footer>
);

export default function Landing({ onCta, onViewChange }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-jurisma-900 font-sans text-slate-900 dark:text-jurisma-50 selection:bg-jurisma-accent selection:text-white transition-colors duration-500 relative">
      <BackgroundEffects />
      <Hero onCta={onCta} onViewChange={onViewChange} />
      <FeatureSection onViewChange={onViewChange} />
      <BenefitSection />
      <TestimonialSection />
      <FAQSection />
      <CTA onCta={onCta} />
      <Footer onViewChange={onViewChange} />
      <ChatWidget />
    </div>
  );
}