import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Sparkles, HelpCircle, Flame, ServerCrash, 
  HelpCircle as HelpIcon, PlayCircle, Minimize2, ArrowRight, MessageSquareCode
} from 'lucide-react';
import { Message } from '../types';

interface AIMaintenanceProps {
  onLoadSuggestedUrl: (name: string, url: string) => Promise<void>;
}

export const AIMaintenance: React.FC<AIMaintenanceProps> = ({ onLoadSuggestedUrl }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: "Hello! I am your AI IPTV stream guide and diagnostics engineer. \n\nI can help you:\n1. 🔍 **Find working, free, and legal M3U playlists** (like sports, international news, documentaries).\n2. 🛠️ **Troubleshoot buffering**, black screens, and CORS restriction errors.\n3. 💡 Explain how digital streaming, HLS protocol, and M3U tags work.\n\nType a question or select a quick action chip below to get started!"
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest bubble
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Handle standard user prompt submission
  const handleSubmit = async (textToSend?: string) => {
    const prompt = (textToSend || inputMessage).trim();
    if (!prompt) return;

    if (!textToSend) {
      setInputMessage('');
    }

    const newUserMessage: Message = { role: 'user', text: prompt };
    setMessages(prev => [...prev, newUserMessage]);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, newUserMessage].map(msg => ({
            role: msg.role === 'model' ? 'model' : 'user',
            text: msg.text
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Gemini server route error. Verify that GEMINI_API_KEY is configured.');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'model', text: data.text }]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev, 
        { 
          role: 'model', 
          text: `😞 **Oops! I had trouble reaching the AI brain.**\n\n*Error details:* ${err.message || 'Network error'}\n\nPlease check your server secrets settings to ensure a valid **GEMINI_API_KEY** is configured, or try reloading again in a moment.`
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Quick prompt triggers
  const promptSuggestions = [
    {
      label: "🌐 Find Public M3U Playlists",
      prompt: "Give me some working, free, and legal open-source IPTV M3U playlist URLs for global news, sports, or documentaries. Provide full ready-to-copy HTTPS HTTPS .m3u URLs.",
    },
    {
      label: "🇧🇩 Get Bangla TV Lists",
      prompt: "Suggest safe and working HLS/M3U8 streaming links for Bangladeshi news or general entertainment channels, or open-source Github projects maintaining them.",
    },
    {
      label: "⚡ Fix Buffering / CORS Policy",
      prompt: "Why are some M3U8 streams loading forever or failing with CORS policy blocks on the player? Explain clearly and give absolute steps to troubleshoot them.",
    }
  ];

  // Dynamically parses and displays M3U URLs from AI output for direct browser loading!
  // This is a feature of extreme craftsmanship: if Gemini lists an .m3u or .m3u8 link, the player offers a "LOAD DIRECTLY" button!
  const renderMessageContent = (msg: Message) => {
    const text = msg.text;
    
    // Simple regex to locate HTTP or HTTPS links ending in .m3u or .m3u8 or simply linking to playlist files
    const m3uRegex = /(https?:\/\/[^\s"'`]+(\.m3u8?|\/playlist\.m3u[^\s]*))/gi;
    const links = Array.from(text.matchAll(m3uRegex));

    return (
      <div className="space-y-3.5 leading-relaxed text-xs">
        {/* Render text with simple bold/list parsing */}
        <div className="whitespace-pre-wrap break-words prose prose-invert max-w-none text-slate-300">
          {text}
        </div>

        {/* Present easy load buttons for found playlists in AI output */}
        {links.length > 0 && msg.role === 'model' && (
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2 mt-2">
            <p className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1">
              <PlayCircle className="w-3.5 h-3.5 text-amber-500" /> Channels Found in AI Output:
            </p>
            <div className="flex flex-col gap-1.5">
              {Array.from(new Set(links.map(m => m[0]))).map((url, i) => {
                // Shorten URL for button title
                const urlObj = new URL(url);
                const title = `Load M3U Feed (${urlObj.hostname})`;
                
                return (
                  <button
                    key={i}
                    onClick={() => onLoadSuggestedUrl(`AI Feed ${i + 1}`, url)}
                    className="flex items-center justify-between px-2.5 py-1.5 bg-slate-900 hover:bg-amber-500/10 text-slate-350 hover:text-amber-400 rounded-lg text-left border border-slate-800 hover:border-amber-500/30 transition-all font-semibold active:scale-98"
                  >
                    <span className="truncate max-w-[240px] text-[10.5px] font-mono">{url}</span>
                    <span className="flex items-center gap-1 shrink-0 text-[10px] text-amber-500 hover:underline">
                      Load now <ArrowRight className="w-3 h-3" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-xl h-[610px] overflow-hidden"
      id="ai-intelligence-assistant-panel"
    >
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-amber-600/30 to-slate-900 border-b border-slate-800 p-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
            <Sparkles className="w-4 h-4 fill-current animate-pulse" />
          </div>
          <div>
            <h3 className="text-slate-100 font-bold text-sm tracking-tight flex items-center gap-1.5">
              fa TV AI Assistant
            </h3>
            <p className="text-[10px] text-[#A78BFA] uppercase font-mono tracking-wider font-bold">
              AI Live Stream Assistant
            </p>
          </div>
        </div>
        <span className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800 font-mono">
          Powered by Gemini
        </span>
      </div>

      {/* Quick Prompt Suggestion Row */}
      <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/20 shrink-0">
        <p className="text-[10px] font-mono text-slate-500 mb-1.5 uppercase font-bold tracking-wider">Quick Actions / Queries:</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {promptSuggestions.map((suggestion, idx) => (
            <button
              key={idx}
              disabled={isGenerating}
              onClick={() => handleSubmit(suggestion.prompt)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 hover:border-amber-500/25 border border-slate-800 text-[11px] font-medium text-slate-300 rounded-lg shrink-0 transition-colors active:scale-95"
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message logs scrolling list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/40">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div 
              key={index}
              className={`flex items-start ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {/* Fallback avatar */}
              {!isUser && (
                <div className="w-6.5 h-6.5 rounded-md bg-amber-500 flex items-center justify-center text-slate-950 text-[10px] font-bold shrink-0 mr-2.5 mt-0.5">
                  AI
                </div>
              )}
              
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                isUser 
                  ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none' 
                  : 'bg-slate-900 border border-slate-850 rounded-tl-none'
              }`}>
                {renderMessageContent(msg)}
              </div>

              {isUser && (
                <div className="w-6.5 h-6.5 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-450 text-[9px] shrink-0 ml-2.5 mt-0.5 font-mono">
                  YOU
                </div>
              )}
            </div>
          );
        })}

        {/* Loading generation block */}
        {isGenerating && (
          <div className="flex items-start justify-start">
            <div className="w-6.5 h-6.5 rounded-md bg-amber-500 flex items-center justify-center text-slate-950 text-[10px] font-bold shrink-0 mr-2.5 mt-0.5 animate-pulse">
              AI
            </div>
            <div className="bg-slate-900 border border-slate-850 px-4 py-3 rounded-2xl rounded-tl-none flex items-center space-x-2">
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Message Send Form */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="p-3 bg-slate-900 border-t border-slate-800 shrink-0 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputMessage}
          disabled={isGenerating}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={isGenerating ? "Gemini is analyzing streams..." : "Ask AI to find channels, fix CORS, troubleshoot streams..."}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-amber-500 transition-colors"
        />
        <button
          type="submit"
          disabled={isGenerating || !inputMessage.trim()}
          className="p-3 bg-amber-500 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 rounded-xl hover:scale-103 active:scale-97 cursor-pointer transition-transform shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
