import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, CheckCircle2, Phone, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { business } = useAuth();
  const [feedbackText, setFeedbackText] = useState('');
  const [category, setCategory] = useState<'Suggestion' | 'Feature Request' | 'Bug Report' | 'Appreciation'>('Suggestion');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const whatsappNumber = '923364585863'; // Official MBI Inventra WhatsApp / M Bilal Inayat number

  const handleSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      alert('Please write your feedback message first.');
      return;
    }

    const businessName = business?.name || 'MBI Inventra User';
    const message = encodeURIComponent(
      `*MBI Inventra Feedback / Inquiry*\n\n` +
      `*Category:* ${category}\n` +
      `*Business:* ${businessName}\n` +
      `*Message:* ${feedbackText.trim()}`
    );

    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200 select-none cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      
      {/* Modal Container with smooth fade-in and scale-up animation */}
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] h-full text-slate-800 animate-in fade-in zoom-in-95 animate-fade-scale duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="bg-emerald-700 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">Share Feedback via WhatsApp</h2>
              <p className="text-[11px] text-emerald-100">Send direct suggestions or inquiries to M Bilal Inayat</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-emerald-100 hover:text-white hover:bg-emerald-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body with overflow-y-auto and h-full */}
        <form onSubmit={handleSendWhatsApp} className="p-6 space-y-4 overflow-y-auto h-full flex-1">
          
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Feedback Category</label>
            <div className="grid grid-cols-2 gap-2">
              {(['Suggestion', 'Feature Request', 'Bug Report', 'Appreciation'] as const).map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    category === cat
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Your Feedback or Message</label>
            <textarea
              rows={4}
              required
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Type your feedback, feature request, or suggestions here..."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3 text-xs text-slate-600">
            <Phone className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div>
              Connected WhatsApp Number: <strong className="text-slate-900 font-mono">0336-4585863</strong>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-98 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send via WhatsApp</span>
            </button>
          </div>

        </form>

      </div>

    </div>
  );
};

