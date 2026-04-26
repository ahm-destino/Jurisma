import React, { useState, useEffect, useCallback } from "react";
import { Search, BookOpen, ChevronRight, Download, Scale, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { Card, Badge } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import api from "../services/api.js";

const FILTERS = [
  { id: 'supreme', name: 'Supreme Court' },
  { id: 'appeal', name: 'Court of Appeal' },
  { id: 'high', name: 'High Court' },
  { id: 'others', name: 'Others' },
];

export default function LawReports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getLawReports(page, 20, activeFilter, searchTerm);
      setReports(result.reports || []);
    } catch (err) {
      console.error('Error fetching law reports:', err);
      setError("Failed to load law reports. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, activeFilter, searchTerm]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-auto">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center">
            <Scale className="mr-2 text-jurisma-600 size-6 md:size-8" />
            Law Reports
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">Search through judgements from Nigerian Superior Courts.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search judgements..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-jurisma-500 focus:outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {FILTERS.map(filter => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(activeFilter === filter.id ? 'all' : filter.id)}
            className={`p-3 md:p-4 rounded-xl border text-left transition-all ${activeFilter === filter.id
              ? 'border-jurisma-500 bg-jurisma-50 ring-1 ring-jurisma-500'
              : 'border-slate-200 bg-white hover:border-jurisma-300 shadow-sm'
              }`}
          >
            <h3 className="font-bold text-slate-900 text-xs md:text-sm truncate">{filter.name}</h3>
            <p className="text-[10px] md:text-xs text-slate-500">Legal Records</p>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-base md:text-lg font-bold text-slate-900">
            {searchTerm ? `Search Results for "${searchTerm}"` : 'Recent Judgements'}
          </h2>
          {loading && <Loader2 className="animate-spin text-jurisma-600" size={20} />}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between">
            <p className="text-sm text-red-600">{error}</p>
            <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-100 font-bold" onClick={fetchReports}>Retry</Button>
          </div>
        )}

        <div className="grid gap-3 md:gap-4">
          {reports.map(report => (
            <Card key={report.id} className="p-4 md:p-6 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="blue" className="text-[10px] px-2 py-0.5">{report.court}</Badge>
                    <span className="text-[10px] md:text-xs text-slate-400">{report.date ? new Date(report.date).getFullYear() : 'N/A'}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm md:text-base group-hover:text-jurisma-700 transition-colors line-clamp-2 leading-tight">{report.title}</h3>
                  <p className="text-xs md:text-sm text-slate-500 mt-2 font-mono bg-slate-50 inline-block px-1.5 py-0.5 rounded border border-slate-100">{report.citation}</p>
                </div>
                <div className="flex md:flex-col items-center md:items-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-50">
                  <Button variant="ghost" className="hidden md:flex h-9 text-xs md:text-sm group-hover:text-jurisma-600">
                    View Judgement <ChevronRight size={16} className="ml-1" />
                  </Button>
                  <ArrowRight className="md:hidden text-slate-300 group-hover:text-jurisma-500" size={20} />
                </div>
              </div>
            </Card>
          ))}
          {!loading && reports.length === 0 && (
            <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-100 italic">
              No judgements found matching your criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
