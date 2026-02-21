
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MessageSquare, X, Send, Bot, Loader2, Sparkles, AlertCircle, WifiOff } from 'lucide-react';
import { supabase } from '../supabaseClient'; // Import Supabase
import { User } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export const ChatAssistant: React.FC<{ user: User }> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: `سلام ${user.fullName} 👋\nمن دستیار هستم. می‌تونی از من درباره خرابی‌ها، وضعیت تجهیزات یا آمار گزارش‌ها بپرسی.` }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const collectSystemContext = async () => {
    try {
        // 1. Get Recent Work Orders from Supabase
        const { data: woData } = await supabase
            .from('cartable_items')
            .select('*')
            .eq('module', 'WORK_ORDER')
            .order('created_at', { ascending: false })
            .limit(20); // Limit to last 20 for context window efficiency

        const workOrders = (woData || []).map((wo: any) => {
            const d = wo.data || {};
            return {
                code: wo.tracking_code,
                title: wo.title,
                status: d.status || wo.status,
                equipment: d.equipName || 'نامشخص',
                failure: d.failureDesc,
                date: wo.created_at, // Assuming stored as string in your schema for now
                requester: d.requester
            };
        });

        // 2. Get Part Requests
        const { data: prData } = await supabase
            .from('cartable_items')
            .select('*')
            .eq('module', 'PART_REQUEST')
            .limit(10);

        const parts = (prData || []).map((p: any) => {
            const d = p.data || {};
            return {
                part: d.partName,
                qty: d.qty,
                requester: p.description
            };
        });

        // 3. Construct Context String
        const contextData = JSON.stringify({
            currentTime: new Date().toLocaleString('fa-IR'),
            currentUser: user.fullName,
            recentWorkOrders: workOrders,
            activePartsRequests: parts,
        });

        return `
          You are an intelligent assistant for a Factory Maintenance Management System (CMMS).
          Your goal is to help the maintenance manager by analyzing the provided data.
          
          HERE IS THE LIVE DATA FROM THE DATABASE (Supabase):
          ${contextData}

          INSTRUCTIONS:
          1. Answer solely based on the data provided above.
          2. If asked for "Top Failures" or similar, count the occurrences of equipment names in the workOrdersSummary.
          3. Respond in Persian (Farsi).
          4. Be concise and professional.
          5. Use formatting (bullet points, bold text) to make it readable.
          6. If the data is empty, say so.
          7. For "Most frequent failures", calculate the frequency of equipment names in the work orders list and show the top 10.

          When user asks for "کوئری بررسی نشست کاربری" or "کوئری دیتابیس" provide: SELECT id, org_name, session_timeout_minutes AS "مدت_نشست_دقیقه", created_at FROM app_settings ORDER BY created_at LIMIT 1;
        `;
    } catch (error) {
        console.error("Error collecting context:", error);
        return "Error loading system data. Please answer generally.";
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
      if (!apiKey) {
          throw new Error("کلید API گوگل تنظیم نشده است.");
      }

      // Initialize Gemini
      const ai = new GoogleGenAI({ apiKey });
      
      // Prepare Context
      const systemInstruction = await collectSystemContext();

      // Call API
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', 
        contents: [
            { role: 'user', parts: [{ text: systemInstruction + "\n\nUser Question: " + input }] }
        ],
        config: {
            temperature: 0.3, // Lower temperature for more factual answers
        }
      });

      const responseText = response.text || "متاسفم، نتوانستم پاسخی تولید کنم.";

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText
      }]);

    } catch (error: any) {
      console.error("AI Error:", error);
      
      let errorText = `خطا: ${error.message || 'مشکلی در ارتباط با سرور رخ داد.'}`;
      
      // Handle Network/VPN Errors specifically
      if (error.message && error.message.toLowerCase().includes('failed to fetch')) {
          errorText = "🔴 خطا در برقراری ارتباط با سرور هوش مصنوعی.\n\n⚠️ اگر از داخل ایران متصل هستید، لطفاً فیلترشکن (VPN) خود را روشن کنید و مجددا تلاش نمایید.";
      } else if (error.message && (error.message.includes('403') || error.message.includes('400'))) {
          errorText = "⛔ کلید API نامعتبر است یا دسترسی شما محدود شده است.";
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: errorText
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 left-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center gap-2
            ${isOpen ? 'bg-red-500 rotate-90' : 'bg-gradient-to-r from-blue-600 to-purple-600 animate-pulse'} text-white`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-7 h-7" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 left-6 z-50 w-full max-w-sm md:max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-[500px] animate-slideUp">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex items-center gap-3 text-white">
            <div className="bg-white/20 p-2 rounded-full">
                <Sparkles className="w-5 h-5" />
            </div>
            <div>
                <h3 className="font-bold">دستیار هوشمند</h3>
                <p className="text-xs opacity-80">تحلیلگر داده‌های نت</p>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
             {messages.map((msg) => (
                 <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                     <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm
                        ${msg.role === 'user' 
                            ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-br-none border border-gray-100 dark:border-gray-600' 
                            : 'bg-blue-600 text-white rounded-bl-none'}
                     `}>
                         {msg.text}
                     </div>
                 </div>
             ))}
             {isLoading && (
                 <div className="flex justify-end">
                     <div className="bg-blue-600/10 text-blue-600 p-3 rounded-2xl rounded-bl-none flex items-center gap-2 text-xs font-bold">
                         <Loader2 className="w-4 h-4 animate-spin" /> در حال پردازش...
                     </div>
                 </div>
             )}
             <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-white dark:bg-gray-800 border-t dark:border-gray-700 flex gap-2">
            <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="سوال خود را بپرسید..."
                className="flex-1 bg-gray-100 dark:bg-gray-700 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
                <Send className="w-5 h-5" />
            </button>
          </form>

          {/* Footer Warning */}
          <div className="px-4 py-1 bg-gray-50 dark:bg-gray-900 text-[10px] text-center text-gray-400 border-t dark:border-gray-700">
             پاسخ‌ها توسط هوش مصنوعی تولید می‌شوند و ممکن است خطا داشته باشند.
          </div>
        </div>
      )}
    </>
  );
};
