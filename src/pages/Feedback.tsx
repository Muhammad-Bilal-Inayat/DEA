import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Send, CheckCircle2, Phone, Sparkles, 
  Star, Lightbulb, Bug, Heart, HelpCircle, ArrowLeft, AlertCircle,
  Clock, ShieldCheck, XCircle, Globe
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  getUserFeedbacks, 
  submitUserFeedbackRecord, 
  approveUserFeedback, 
  rejectUserFeedback,
  UserFeedbackRecord 
} from '../lib/siteCmsService';

export const Feedback: React.FC = () => {
  const { business, activeRole } = useAuth();
  const navigate = useNavigate();
  
  const [feedbackText, setFeedbackText] = useState('');
  const [senderName, setSenderName] = useState(business?.name || '');
  const [senderEmail, setSenderEmail] = useState('');
  const [category, setCategory] = useState<'Suggestion' | 'Feature Request' | 'Bug Report' | 'Appreciation' | 'Support'>('Feature Request');
  const [rating, setRating] = useState<number>(5);
  
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [feedbacksList, setFeedbacksList] = useState<UserFeedbackRecord[]>(() => getUserFeedbacks());
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const whatsappNumber = '923364585863'; // M Bilal Inayat official WhatsApp

  useEffect(() => {
    const handleFeedbackChange = () => {
      setFeedbacksList(getUserFeedbacks());
    };
    window.addEventListener('mbi-feedback-updated', handleFeedbackChange);
    return () => {
      window.removeEventListener('mbi-feedback-updated', handleFeedbackChange);
    };
  }, []);

  const refreshList = () => {
    setFeedbacksList(getUserFeedbacks());
  };

  const quickTemplates = [
    "Please add automatic SMS/WhatsApp customer invoice notifications.",
    "Would love to see a barcode scanner shortcut on the main POS billing screen.",
    "The expiry batch alert notification is extremely helpful! Great job.",
    "Can we add multi-currency support for international wholesale?",
    "Need custom thermal receipt footer with NTN number & return policy."
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Client-side form validation
    if (!feedbackText.trim()) {
      setValidationError('Please enter your detailed feedback or message.');
      return;
    }
    if (feedbackText.trim().length < 10) {
      setValidationError('Feedback message is too short. Please provide at least 10 characters.');
      return;
    }
    if (!senderName.trim()) {
      setValidationError('Please enter your name or pharmacy business name.');
      return;
    }

    const businessName = senderName.trim();

    // 1. Submit record to site feedback queue for live sync approval
    submitUserFeedbackRecord({
      senderName: businessName,
      pharmacyName: business?.name || businessName,
      city: 'Pakistan',
      emailOrPhone: senderEmail,
      category,
      rating,
      message: feedbackText.trim(),
    });

    // 2. Format WhatsApp message
    const message = encodeURIComponent(
      `*MBI Inventra Feedback / Support Inquiry*\n\n` +
      `*Category:* ${category}\n` +
      `*Rating:* ${rating} / 5 Stars\n` +
      `*Business/Name:* ${businessName}\n` +
      (senderEmail ? `*Contact Email/Phone:* ${senderEmail}\n` : '') +
      `*Message:* ${feedbackText.trim()}`
    );

    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
    setSubmitted(true);
    refreshList();
  };

  const handleApprove = (id: string) => {
    const ok = approveUserFeedback(id);
    if (ok) {
      setActionSuccessMsg('Feedback approved! It is now live on the website Testimonials carousel.');
      setTimeout(() => setActionSuccessMsg(null), 4000);
      refreshList();
    }
  };

  const handleReject = (id: string) => {
    rejectUserFeedback(id);
    refreshList();
  };


  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-16 font-sans overflow-y-auto h-full">
      
      {/* Top Header & Breadcrumb Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Share Feedback & Requests</span>
            </h1>
            <p className="text-xs text-slate-500">Send direct suggestions, feature requests, or technical support inquiries</p>
          </div>
        </div>

        <button
          onClick={() => {
            window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hello M Bilal Inayat, I need support regarding MBI Inventra.')}`, '_blank');
          }}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>WhatsApp Hotline</span>
        </button>
      </div>

      {/* Main Feedback Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-8">
        
        {/* Intro */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>We Value Your Voice & Suggestions</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Help Us Improve MBI Inventra
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Share feature requests, suggestions, or bug reports with instant WhatsApp verification and confirmation.
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-10 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">Feedback Captured & Sent Successfully!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Thank you, <strong className="text-slate-800">{senderName}</strong>! Your {category.toLowerCase()} has been validated and sent via WhatsApp to M Bilal Inayat (0336-4585863).
              </p>
            </div>
            
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  setSubmitted(false);
                  setFeedbackText('');
                  setValidationError(null);
                }}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-sm transition-colors cursor-pointer w-full sm:w-auto"
              >
                Send Another Feedback
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-colors cursor-pointer w-full sm:w-auto"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {validationError && (
              <div className="bg-rose-50 border border-rose-300 text-rose-900 p-4 rounded-2xl flex items-center gap-3 text-xs font-medium animate-in slide-in-from-top">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Category Selector */}
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
                Select Feedback Category *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'Feature Request', label: '💡 Feature Request' },
                  { id: 'Suggestion', label: '💬 Suggestion' },
                  { id: 'Bug Report', label: '🐛 Bug Report' },
                  { id: 'Appreciation', label: '❤️ Appreciation' },
                  { id: 'Support', label: '🛠️ Support Inquiry' },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setCategory(item.id as any)}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      category === item.id
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs ring-1 ring-emerald-500/20'
                        : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Name & Contact Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                  Your Name / Pharmacy Store *
                </label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Al-Madina Medical Store"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                  Contact Email or Phone (Optional)
                </label>
                <input
                  type="text"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="e.g. 0300-1234567 or email@domain.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Star Rating */}
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
                Overall Software Rating
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      rating >= star
                        ? 'bg-amber-50 border-amber-300 text-amber-500 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-300'
                    }`}
                  >
                    <Star className={`w-5 h-5 ${rating >= star ? 'fill-current' : ''}`} />
                  </button>
                ))}
                <span className="text-xs font-bold text-slate-700 ml-2">({rating} / 5 Stars)</span>
              </div>
            </div>

            {/* Quick Inspiration Templates */}
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">Quick Inspiration Templates (Click to insert):</label>
              <div className="flex flex-wrap gap-1.5">
                {quickTemplates.map((tmpl, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setFeedbackText(tmpl)}
                    className="text-[11px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    {tmpl}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Text Area */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  Detailed Feedback / Message *
                </label>
                <span className={`text-[11px] font-mono ${feedbackText.length < 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {feedbackText.length} chars {feedbackText.length < 10 ? '(min 10)' : '✓'}
                </span>
              </div>
              <textarea
                rows={4}
                required
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Describe your feature request, suggestion, or issue in detail (at least 10 characters)..."
                className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>Direct WhatsApp Developer: <strong className="text-slate-900 font-mono">0336-4585863</strong></span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-colors cursor-pointer w-full sm:w-auto text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-transform active:scale-98 cursor-pointer w-full sm:w-auto"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit via WhatsApp</span>
                </button>
              </div>
            </div>

          </form>
        )}
      </div>

      {/* Submitted Feedbacks & Live Website Testimonials Sync Queue */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Submitted Feedbacks & Live Site Sync</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                  {feedbacksList.length} Items
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Approved feedbacks automatically sync to the public website testimonials section.
              </p>
            </div>
          </div>

          {actionSuccessMsg && (
            <div className="px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}
        </div>

        {feedbacksList.length === 0 ? (
          <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <Clock className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-600">No user feedback submissions yet</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Submit your feedback or feature request using the form above to see it here and sync with the live website!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {feedbacksList.map((fb) => (
              <div 
                key={fb.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">{fb.senderName}</span>
                    <span className="text-[11px] text-slate-500">• {fb.category}</span>
                    <div className="flex items-center text-amber-400">
                      {[...Array(fb.rating)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400" />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {fb.status === 'pending' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Pending Review</span>
                      </span>
                    )}
                    {fb.status === 'approved' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Approved & Live on Website</span>
                      </span>
                    )}
                    {fb.status === 'rejected' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        <span>Archived</span>
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(fb.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
                  "{fb.message}"
                </p>

                {/* Approval Control Bar for Admin */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-[10.5px] text-slate-400">
                    {fb.pharmacyName ? `Pharmacy: ${fb.pharmacyName}` : ''} {fb.emailOrPhone ? `(${fb.emailOrPhone})` : ''}
                  </span>

                  <div className="flex items-center gap-2">
                    {fb.status !== 'approved' && (
                      <button
                        onClick={() => handleApprove(fb.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Approve & Sync Live to Site</span>
                      </button>
                    )}
                    {fb.status === 'pending' && (
                      <button
                        onClick={() => handleReject(fb.id)}
                        className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Developer Card Info */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-base font-bold">Official Technical Support</h3>
          <p className="text-xs text-slate-300">
            Our support and technical team is available on WhatsApp for instant assistance, pharmacy customizations, and feature rollouts.
          </p>
        </div>
        <button
          onClick={() => {
            const whatsappNum = '923364585863';
            window.open(`https://wa.me/${whatsappNum}?text=${encodeURIComponent('Hello Technical Support, I need assistance regarding MBI Inventra.')}`, '_blank');
          }}
          className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-md transition-transform active:scale-98 flex items-center gap-2 cursor-pointer flex-shrink-0"
        >
          <Phone className="w-4 h-4" />
          <span>WhatsApp 0336-4585863</span>
        </button>
      </div>

    </div>
  );
};
