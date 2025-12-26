
import React, { useState, useRef, useEffect } from 'react';
import { ICONS } from '../constants';
import { askAiAssistant } from '../services/gemini';

interface AiAssistantProps {
  appContext: any;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ appContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!query.trim()) return;
    
    const userMsg = query;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setQuery('');
    setIsTyping(true);

    const aiRes = await askAiAssistant(userMsg, appContext);
    setMessages(prev => [...prev, { role: 'ai', text: aiRes }]);
    setIsTyping(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] no-print">
      {isOpen ? (
        <div className="glass w-80 md:w-96 h-[500px] rounded-[2.5rem] flex flex-col shadow-2xl border border-emerald-500/30 overflow-hidden animate-fade-in mb-4">
          <div className="bg-emerald-600 p-5 flex justify-between items-center">
            <div className="flex items-center gap-3 text-white">
              <ICONS.Sparkles className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Neural Command</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white opacity-60 hover:opacity-100 transition-opacity">✕</button>
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar bg-slate-50/30 dark:bg-black/20">
            {messages.length === 0 && (
              <div className="text-center py-10 opacity-40">
                <ICONS.Sparkles className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
                <p className="text-[9px] font-black uppercase tracking-tighter">Bantuan Neural Siap.<br/>Tanyakan apapun tentang SIF.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-3xl text-[11px] font-semibold leading-relaxed shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-emerald-600 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-white/5'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl rounded-tl-none animate-pulse flex gap-1 items-center border border-slate-100 dark:border-white/5">
                  <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                  <span className="w-1 h-1 bg-emerald-500 rounded-full delay-75"></span>
                  <span className="w-1 h-1 bg-emerald-500 rounded-full delay-150"></span>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-white dark:bg-slate-950/50 border-t border-slate-100 dark:border-white/5 flex gap-2">
            <input 
              type="text" 
              placeholder="Ketik perintah neural..." 
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-slate-100 dark:bg-black/50 border-none rounded-full px-5 py-3 text-xs font-bold"
            />
            <button onClick={handleSend} className="bg-emerald-600 text-white p-3 rounded-full shadow-lg shadow-emerald-500/20 active:scale-90 transition-all">
              <ICONS.ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-emerald-600 w-16 h-16 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-110 active:scale-90 transition-all group"
        >
          <ICONS.Sparkles className="w-7 h-7 text-white group-hover:rotate-12 transition-transform" />
          <div className="absolute inset-0 rounded-full border-4 border-emerald-400/30 animate-ping"></div>
        </button>
      )}
    </div>
  );
};

export default AiAssistant;
