import React, { useState, useEffect, useCallback } from "react";
import { Book, FileText, Bookmark, Search, Filter, ChevronRight, Loader2 } from "lucide-react";
import { Card, Badge } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import api from "../services/api.js";

const CATEGORIES = [
  { id: 'statutes', name: 'Statutes & Acts', color: 'bg-blue-100 text-blue-600' },
  { id: 'rules', name: 'Judicial Precedent or Court Judgements', color: 'bg-emerald-100 text-emerald-600' },
  { id: 'journals', name: 'Legal Journals', color: 'bg-purple-100 text-purple-600' },
];

export default function Library() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getLibraryItems(activeCategory, searchTerm);
      setResources(data || []);
    } catch (err) {
      console.error('Error fetching library items:', err);
      setError("Failed to load library resources. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [activeCategory, searchTerm]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-auto">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center">
            <Book className="mr-2 text-jurisma-600" size={24} />
            Legal Library
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">Your comprehensive repository of acts, rules, and forms.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search library..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-jurisma-500 focus:outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(activeCategory === cat.id ? 'all' : cat.id)}
            className={`p-5 rounded-2xl border text-left transition-all ${activeCategory === cat.id
              ? 'border-jurisma-500 bg-jurisma-50 ring-2 ring-jurisma-500/20 shadow-md'
              : 'border-slate-200 bg-white hover:border-jurisma-300 hover:shadow-sm'
              }`}
          >
            <div className={`w-10 h-10 rounded-xl mb-4 flex items-center justify-center ${cat.color}`}>
              <FileText size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-sm leading-tight mb-1">{cat.name}</h3>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">Collection</p>
          </button>
        ))}
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base md:text-lg font-bold text-slate-900">
            {activeCategory === 'all' ? 'Recent Resources' : CATEGORIES.find(c => c.id === activeCategory)?.name}
          </h2>
          {loading && <Loader2 className="animate-spin text-jurisma-600" size={20} />}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between mb-4">
            <p className="text-sm text-red-600">{error}</p>
            <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-100 font-bold" onClick={fetchItems}>Retry</Button>
          </div>
        )}

        <div className="grid gap-3">
          {resources.map(resource => (
            <div key={resource.id} className="group flex items-center justify-between p-3 md:p-4 bg-white border border-slate-200 rounded-lg hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded bg-slate-100 flex-shrink-0 flex items-center justify-center text-slate-500 group-hover:bg-jurisma-100 group-hover:text-jurisma-700 transition-colors">
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-medium text-slate-900 group-hover:text-jurisma-700 transition-colors text-sm md:text-base truncate pr-2">{resource.title}</h4>
                  <div className="flex items-center space-x-2 text-[10px] md:text-xs text-slate-500 mt-1">
                    <Badge variant="blue">{resource.type}</Badge>
                    <span>•</span>
                    <span>{resource.date || 'No Date'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 md:opacity-100 md:group-hover:opacity-100 transition-opacity"><Bookmark size={16} /></Button>
                <ChevronRight className="text-slate-300" size={18} />
              </div>
            </div>
          ))}
          {!loading && resources.length === 0 && (
            <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-100 italic">
              No documents found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
