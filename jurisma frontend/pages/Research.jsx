import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2, Send, CheckCircle, Award } from "lucide-react";
import { Card, Badge } from "../components/ui/Card.jsx";
import { generateLegalContent } from "../services/geminiService.js";

export default function Research() {
  const [messages, setMessages] = useState([
    { id: 'welcome', role: 'model', text: 'Hello. I am Jurisma AI. I can assist you with case law research, document drafting, and procedural questions. How can I help you today?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const text = await generateLegalContent(userMsg.text);
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: text,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I am unable to connect to the legal knowledge base at this moment. Please check your API configuration.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 md:gap-8 h-full">
      <div className="flex-1 min-w-0">
        <Card className="h-[500px] md:h-[600px] flex flex-col shadow-lg border-amber-100">
          <div className="p-3 md:p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-sm shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-sm truncate">Assistant</h3>
                <p className="text-[10px] text-slate-500 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 shrink-0"></span>
                  <span className="truncate">Gemini Pro Connected</span>
                </p>
              </div>
            </div>
            <Badge variant="amber">Pro</Badge>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-slate-50/50" ref={scrollRef}>
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3 md:p-4 shadow-sm ${m.role === 'user'
                  ? 'bg-slate-900 text-white rounded-br-none'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                  }`}>
                  <div className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap">{m.text}</div>
                  <div className={`text-[9px] md:text-[10px] mt-2 ${m.role === 'user' ? 'text-slate-400' : 'text-slate-400'}`}>
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-3 md:p-4 shadow-sm flex items-center space-x-2">
                  <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin text-amber-600" />
                  <span className="text-xs md:text-sm text-slate-500">Analyzing legal data...</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 md:p-4 bg-white border-t border-slate-100 rounded-b-xl">
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500 transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask your legal question..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-xs md:text-sm py-2.5 md:py-3 px-2 text-slate-900 placeholder:text-slate-400"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </Card>
      </div>
      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center">
            <Award className="w-5 h-5 text-amber-500 mr-2" />
            Jurisma Pro Tips
          </h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-emerald-500 mr-2 mt-0.5 shrink-0" />
              Upload PDFs for direct summarization.
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-emerald-500 mr-2 mt-0.5 shrink-0" />
              Ask for case precedents by jurisdiction.
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-emerald-500 mr-2 mt-0.5 shrink-0" />
              Draft documents with specific risk parameters.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
