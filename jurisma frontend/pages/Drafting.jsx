import React, { useState } from "react";
import { PenTool, FileText, ChevronRight, Check, Loader2, Sparkles, Layout, Search, Grid, Plus, Users, Download, Copy, RefreshCw } from "lucide-react";
import { Card, Input } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { generateLegalContent } from "../services/geminiService.js";

// Helper icons
const Briefcase = (props) => <FileText {...props} />;
const Home = (props) => <Layout {...props} />;

const CATEGORIES = [
  { id: 'all', name: 'All Templates', icon: Grid },
  { id: 'business', name: 'Business', icon: Briefcase },
  { id: 'property', name: 'Property', icon: Home },
  { id: 'employment', name: 'Employment', icon: Users },
];

const TEMPLATES = [
  { id: 'nda', name: 'Non-Disclosure Agreement', desc: 'Protect your trade secrets and confidential data.', category: 'business', color: 'blue' },
  { id: 'sla', name: 'Service Level Agreement', desc: 'Define service expectations and deliverables clearly.', category: 'business', color: 'indigo' },
  { id: 'lease', name: 'Residential Lease', desc: 'Solid tenancy agreement for residential properties.', category: 'property', color: 'emerald' },
  { id: 'employment', name: 'Employment Offer', desc: 'Standard professional offer for formal roles.', category: 'employment', color: 'purple' },
  { id: 'contract', name: 'Consultancy Agreement', desc: 'Define terms for independent contractors.', category: 'business', color: 'amber' },
  { id: 'will', name: 'Simple Will', desc: 'Basic testament for personal estate planning.', category: 'property', color: 'rose' }
];

export default function Drafting() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isDone, setIsDone] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedDoc, setGeneratedDoc] = useState("");
  const [error, setError] = useState(null);

  const filteredTemplates = TEMPLATES.filter(t => activeCategory === 'all' || t.category === activeCategory);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const prompt = selectedTemplate.isCustom
        ? customPrompt
        : `Draft a legal ${selectedTemplate.name} document for ${selectedTemplate.desc}. Include standard clauses for its category: ${selectedTemplate.category}.`;

      const content = await generateLegalContent(prompt);
      setGeneratedDoc(content);
      setIsDone(true);
    } catch (err) {
      console.error('Generation failed:', err);
      setError("AI Draftsman is offline. Please check your connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setSelectedTemplate(null);
    setIsDone(false);
    setCustomPrompt("");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mr-3">
              <PenTool className="text-amber-600" size={24} />
            </div>
            Smart Drafting
          </h1>
          <p className="text-slate-500 text-sm mt-1">Professional templates meets AI-powered precision.</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input placeholder="Search templates..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm outline-none" />
          </div>
          <Button icon={Sparkles} variant="secondary" className="shadow-lg shadow-amber-500/10">AI Mode</Button>
        </div>
      </div>

      {!selectedTemplate ? (
        <div className="space-y-8">
          {/* Quick Actions / Custom Prompt */}
          <div className="bg-gradient-to-br from-jurisma-900 to-slate-900 p-6 md:p-8 rounded-2xl text-white">
            <div className="max-w-2xl">
              <h2 className="text-xl font-bold mb-2 flex items-center">
                <Sparkles className="mr-2 text-amber-400" size={20} />
                Craft something unique
              </h2>
              <p className="text-slate-300 text-sm mb-6">Describe the document you want to create and our AI will draft it for you instantly.</p>
              <div className="relative group">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. A co-founder agreement for a tech startup in Lagos with 50/50 split and 4 year vesting..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl p-4 pr-12 text-sm focus:ring-2 focus:ring-amber-500 outline-none min-h-[100px] resize-none placeholder:text-white/30"
                />
                <button
                  onClick={() => customPrompt && setSelectedTemplate({ name: 'Custom AI Draft', isCustom: true })}
                  className="absolute bottom-4 right-4 p-2 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${activeCategory === cat.id ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300'
                  }`}
              >
                <cat.icon size={16} />
                {cat.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t)}
                className="group flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-amber-500 hover:shadow-xl transition-all text-left"
              >
                <div className={`h-24 bg-${t.color}-50 flex items-center justify-center group-hover:bg-${t.color}-100 transition-colors`}>
                  <div className={`w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-${t.color}-600`}>
                    <FileText size={24} />
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-slate-900 mb-2 group-hover:text-amber-600 transition-colors uppercase text-xs tracking-wider">{t.name}</h3>
                  <p className="text-slate-500 text-sm line-clamp-2">{t.desc}</p>
                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center text-xs font-bold text-slate-400 group-hover:text-amber-600">
                    USE TEMPLATE <ChevronRight size={14} className="ml-1" />
                  </div>
                </div>
              </button>
            ))}
            <button className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 hover:border-amber-500 hover:bg-amber-50/50 transition-all text-slate-400 hover:text-amber-600 min-h-[250px]">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                <Plus size={24} />
              </div>
              <p className="font-bold text-sm">Blank Document</p>
            </button>
          </div>
        </div>
      ) : isDone ? (
        <Card className="p-0 overflow-hidden shadow-2xl border-slate-200">
          <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                <Check size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Draft Completed</h2>
                <p className="text-sm text-slate-500">Your professional {selectedTemplate.name} is ready for review.</p>
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button variant="outline" icon={Copy} className="flex-1 md:flex-none">Copy Text</Button>
              <Button variant="primary" icon={Download} className="flex-1 md:flex-none">Download PDF</Button>
            </div>
          </div>

          <div className="p-6 md:p-10 max-h-[600px] overflow-y-auto bg-white font-serif leading-relaxed text-slate-800">
            <div className="max-w-3xl mx-auto whitespace-pre-wrap text-sm md:text-base selection:bg-amber-100">
              {generatedDoc}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
            <button onClick={reset} className="flex items-center gap-2 text-sm font-bold text-jurisma-600 hover:text-jurisma-900 px-4 py-2 rounded-lg transition-colors">
              <RefreshCw size={16} />
              Draft New Document
            </button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <PenTool size={20} className="text-amber-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedTemplate.isCustom ? 'AI Custom Draft' : `Drafting: ${selectedTemplate.name}`}</h2>
                </div>
                <button onClick={reset} className="text-sm text-slate-400 hover:text-slate-900 transition-colors">Cancel</button>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {error}
                </div>
              )}

              {selectedTemplate.isCustom ? (
                <div className="space-y-6">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 italic text-sm text-slate-600">
                    "{customPrompt}"
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Primary Party" placeholder="Full name/Company" className="focus:ring-amber-500" />
                    <Input label="Secondary Party" placeholder="Full name/Company" className="focus:ring-amber-500" />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Input label="Party A Name (Disclosing)" placeholder="e.g. Acme Corp" />
                    <Input label="Party B Name (Recipient)" placeholder="e.g. John Doe" />
                    <Input label="Effective Date" type="date" />
                    <Input label="Jurisdiction" placeholder="e.g. Lagos State" />
                  </div>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                <Button onClick={handleGenerate} disabled={isGenerating} className="h-12 px-10 font-bold bg-slate-900 hover:bg-black text-white shadow-xl shadow-slate-200">
                  {isGenerating ? (
                    <div className="flex items-center">
                      <Loader2 className="mr-2 animate-spin" size={18} /> Consulting AI Draftsman...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Sparkles className="mr-2" size={18} />
                      Generate Professional Draft
                    </div>
                  )}
                </Button>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 bg-amber-50/50 border-amber-100">
              <h3 className="font-bold text-slate-900 mb-3 flex items-center">
                <Sparkles size={16} className="mr-2 text-amber-600" />
                AI Enhancements
              </h3>
              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>Enforcing Lagos State Tenancy Law compliance automatically.</span>
                </li>
                <li className="flex gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>Optimizing dispute resolution clauses for faster arbitration.</span>
                </li>
              </ul>
            </Card>
            <Card className="p-6">
              <h3 className="font-bold text-slate-900 mb-4 text-sm">Preview</h3>
              <div className="space-y-3">
                <div className="h-4 bg-slate-100 rounded w-full animate-pulse"></div>
                <div className="h-4 bg-slate-100 rounded w-5/6 animate-pulse"></div>
                <div className="h-4 bg-slate-100 rounded w-4/6 animate-pulse"></div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}