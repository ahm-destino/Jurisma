import React, { useState, useEffect } from "react";
import { Search, ChevronRight, Loader2 } from "lucide-react";
import { Card } from "../components/ui/Card.jsx";
import api from "../services/api.js";

// Constitution component using real data from api.js

export default function Constitution() {
  const [chapters, setChapters] = useState([]);
  const [activeChapter, setActiveChapter] = useState(null);
  const [activeChapterData, setActiveChapterData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all chapters on mount
  useEffect(() => {
    fetchChapters();
  }, []);

  // Fetch chapter details when active chapter changes
  useEffect(() => {
    if (activeChapter) {
      fetchChapterDetails(activeChapter);
    }
  }, [activeChapter]);

  const fetchChapters = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getChapters();
      setChapters(data || []);
      if (data && data.length > 0) {
        const firstChapterNum = data[0].chapter_number || data[0].chapterNumber;
        setActiveChapter(firstChapterNum);
      }
    } catch (err) {
      console.error('Error fetching chapters:', err);
      setError("Failed to load constitution. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const fetchChapterDetails = async (chapterNumber) => {
    setLoadingChapter(true);
    try {
      const data = await api.getChapter(chapterNumber);
      setActiveChapterData(data);
    } catch (err) {
      console.error('Error fetching chapter details:', err);
      // Fall back to local data if already fetched
      const localChapter = chapters.find(c => c.chapter_number === chapterNumber);
      setActiveChapterData(localChapter);
    } finally {
      setLoadingChapter(false);
    }
  };

  // Filter chapters based on search term
  const filteredChapters = chapters.filter(chapter =>
    chapter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chapter.sections?.some(sec =>
      sec.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sec.content?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Search within current chapter
  const filteredSections = activeChapterData?.sections?.filter(section =>
    searchTerm === "" ||
    section.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.content?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-8rem)] gap-6">
      {/* Sidebar Table of Contents */}
      <Card className="w-full lg:w-1/3 h-auto lg:h-full flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="font-serif font-bold text-slate-900 mb-2">1999 Constitution</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search sections..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded bg-white focus:ring-1 focus:ring-jurisma-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-jurisma-500" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[300px] lg:max-h-none">
            {filteredChapters.map(chapter => (
              <div key={chapter.id}>
                <button
                  onClick={() => setActiveChapter(chapter.chapter_number || chapter.chapterNumber)}
                  className={`w-full text-left px-3 py-2 rounded text-sm font-medium flex justify-between items-center ${activeChapter === (chapter.chapter_number || chapter.chapterNumber)
                    ? 'bg-jurisma-50 text-jurisma-900'
                    : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <span className="truncate pr-2">{chapter.title || `Chapter ${chapter.chapter_number || chapter.chapterNumber}`}</span>
                  {activeChapter === (chapter.chapter_number || chapter.chapterNumber) && <ChevronRight size={14} className="shrink-0" />}
                </button>
                {activeChapter === (chapter.chapter_number || chapter.chapterNumber) && (
                  <div className="ml-4 mt-1 border-l-2 border-slate-100 pl-2 space-y-1">
                    {(chapter.sections || []).map(sec => (
                      <div
                        key={sec.id || sec.section_number || sec.sectionNumber}
                        className="text-[11px] md:text-xs text-slate-500 py-1.5 cursor-pointer hover:text-jurisma-700 truncate pr-2"
                        onClick={() => setActiveChapter(chapter.chapter_number || chapter.chapterNumber)}
                      >
                        Section {sec.section_number || sec.sectionNumber}: {sec.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Main Content */}
      <Card className="flex-1 h-auto lg:h-full overflow-y-auto p-5 md:p-8 bg-white min-h-[400px]">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loadingChapter ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-jurisma-500" />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8 md:mb-10 pb-6 border-b border-slate-100">
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 leading-tight">
                {activeChapterData?.title || 'Constitution'}
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-2">
                Constitution of the Federal Republic of Nigeria (As Amended)
              </p>
            </div>

            <div className="space-y-6 md:space-y-8 pb-12">
              {filteredSections.map(section => (
                <div key={section.id || section.section_number || section.sectionNumber} className="group">
                  <div className="flex items-baseline mb-2">
                    <span className="text-jurisma-600 font-bold mr-3 text-base md:text-lg shrink-0">§ {section.section_number || section.sectionNumber}</span>
                    <h3 className="font-bold text-slate-900 text-base md:text-lg">{section.title}</h3>
                  </div>
                  <p className="text-sm md:text-base text-slate-700 leading-relaxed pl-6 md:pl-8 border-l-2 border-transparent group-hover:border-slate-200 transition-colors">
                    {section.content || section.text || section.body}
                  </p>
                </div>
              ))}
              {filteredSections.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No sections found matching your search.
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
