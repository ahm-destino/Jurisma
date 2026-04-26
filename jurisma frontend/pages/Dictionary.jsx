import React, { useState, useEffect } from "react";
import { BookA, Search, Loader2, X, RefreshCw } from "lucide-react";
import { Card, Badge } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import api from "../services/api.js";

const ALPHABET = "#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function Dictionary() {
  const [terms, setTerms] = useState([]);
  const [filter, setFilter] = useState("");
  const [selectedLetter, setSelectedLetter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all terms on mount
  useEffect(() => {
    fetchAllTerms();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filter) {
        searchTerms(filter);
      } else {
        fetchAllTerms();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [filter]);

  const fetchAllTerms = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAllDictionaryTerms();
      setTerms(data || []);
    } catch (err) {
      console.error('Error fetching dictionary terms:', err);
      setError("Unable to sync dictionary. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const searchTerms = async (searchTerm) => {
    setSearching(true);
    setError(null);
    try {
      const data = await api.searchDictionary(searchTerm);
      setTerms(data || []);
    } catch (err) {
      console.error('Error searching dictionary:', err);
      setError("Search failed. Offline mode unavailable.");
    } finally {
      setSearching(false);
    }
  };

  const filteredTerms = terms.filter(t => {
    const termValue = (t.term || t.word || "").toString();
    const matchesLetter = selectedLetter === "All" || termValue.toUpperCase().startsWith(selectedLetter);
    return matchesLetter;
  });

  const handleLetterClick = (letter) => {
    setSelectedLetter(letter);
    setFilter("");
  };

  const clearSearch = () => {
    setFilter("");
    setSelectedLetter("All");
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-6 md:py-10 bg-gradient-to-b from-slate-50 to-white rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-jurisma-600"></div>
        <h1 className="text-2xl md:text-4xl font-serif font-bold text-slate-900 flex items-center justify-center">
          <BookA className="mr-3 md:mr-4 text-jurisma-600 size-7 md:size-10" />
          Legal Dictionary
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-3 px-4 font-medium tracking-wide">Standardized definitions of technical legal terms and Latin maxims.</p>

        <div className="max-w-xl mx-auto mt-8 relative px-4">
          <Search className="absolute left-7 md:left-8 top-3.5 text-slate-400 size-4 md:size-5" />
          <input
            className="w-full pl-10 md:pl-12 pr-10 md:pr-12 py-3 md:py-4 rounded-2xl border border-slate-200 shadow-lg focus:ring-2 focus:ring-jurisma-500 focus:outline-none text-sm md:text-lg transition-all"
            placeholder="Search for a term (e.g. Ab Initio)"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          {filter && (
            <button
              onClick={clearSearch}
              className="absolute right-7 md:right-8 top-3.5 md:top-4.5 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 justify-center py-4 border-y border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <button
          onClick={() => handleLetterClick("All")}
          className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-black uppercase tracking-widest transition-all ${selectedLetter === "All"
            ? "bg-slate-900 text-white shadow-lg"
            : "text-slate-600 bg-slate-50 hover:bg-slate-100"
            }`}
        >
          All
        </button>
        {ALPHABET.map(letter => (
          <button
            key={letter}
            onClick={() => handleLetterClick(letter)}
            className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg text-xs md:text-sm font-black transition-all ${selectedLetter === letter
              ? "bg-slate-900 text-white shadow-lg scale-110"
              : "text-slate-600 bg-slate-50 hover:bg-slate-100"
              }`}
          >
            {letter}
          </button>
        ))}
      </div>

      {loading || searching ? (
        <div className="text-center py-20 flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-jurisma-600" />
          <p className="mt-4 text-slate-500 font-medium">
            {searching ? "Consulting defined terms..." : "Indexing dictionary..."}
          </p>
        </div>
      ) : error ? (
        <div className="max-w-md mx-auto py-16 text-center">
          <RefreshCw className="h-12 w-12 mx-auto text-red-400 mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">Connection Issue</h3>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <Button onClick={fetchAllTerms} className="w-full font-bold">Retry Connection</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 pb-12">
          {filteredTerms.length > 0 ? (
            filteredTerms.map((item, idx) => (
              <Card key={item.id || idx} className="p-6 hover:border-jurisma-400 transition-all hover:shadow-xl group border-b-4 border-b-slate-100 hover:border-b-jurisma-500 transform hover:-translate-y-1">
                <h3 className="text-xl font-bold text-slate-900 mb-3 font-serif group-hover:text-jurisma-700">{item.term || item.word}</h3>
                <p className="text-slate-600 leading-relaxed text-sm">{item.definition || item.meaning}</p>
                {item.category && (
                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <Badge variant="blue" className="text-[10px] font-black uppercase tracking-tighter">
                      {item.category}
                    </Badge>
                  </div>
                )}
              </Card>
            ))
          ) : (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-20">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Search className="text-slate-300" size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No definitions found</h3>
              <p className="text-slate-500 text-sm mt-1">Try searching for a different keyword or browse by letter.</p>
              <Button variant="ghost" onClick={clearSearch} className="mt-4 text-jurisma-600 font-bold">Clear All Filters</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
