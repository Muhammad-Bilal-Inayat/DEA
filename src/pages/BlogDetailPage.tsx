import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Clock, 
  Calendar, 
  Eye, 
  ThumbsUp, 
  Share2, 
  MapPin, 
  BookOpen, 
  ChevronRight, 
  Sparkles, 
  Tag, 
  Check,
  Globe,
  Sun,
  Moon
} from 'lucide-react';
import { getBlogPostBySlug, getRelatedBlogPosts, incrementBlogViews, likeBlogPost, BlogPost } from '../lib/blogService';

export const BlogDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [likesCount, setLikesCount] = useState<number>(0);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('mbi_landing_theme');
    if (saved) return saved === 'dark' ? 'dark' : 'light';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      if (body) body.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      if (body) body.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    localStorage.setItem('mbi_landing_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  const isDark = theme === 'dark';

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!slug) return;

    const article = getBlogPostBySlug(slug);
    if (article) {
      setPost(article);
      setLikesCount(article.likes || 0);
      incrementBlogViews(article.id);
      setRelatedPosts(getRelatedBlogPosts(article.id, 3));
    } else {
      setPost(null);
    }
  }, [slug]);

  const handleLike = () => {
    if (!post || hasLiked) return;
    const newLikes = likeBlogPost(post.id);
    setLikesCount(newLikes);
    setHasLiked(true);
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (!post) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 space-y-4 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <BookOpen className="w-12 h-12 text-blue-500 animate-bounce" />
        <h2 className="text-xl font-bold">Article Not Found</h2>
        <p className="text-xs text-slate-400">The requested blog post could not be found or may have been updated.</p>
        <button 
          onClick={() => navigate('/blogs')}
          className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition-all cursor-pointer"
        >
          Return to Blog Hub
        </button>
      </div>
    );
  }

  // Helper renderer for Markdown-like text
  const renderFormattedContent = (content: string) => {
    const lines = content.trim().split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('# ')) {
        return <h1 key={idx} className={`text-2xl sm:text-4xl font-black mt-8 mb-4 leading-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>{trimmed.replace('# ', '')}</h1>;
      }
      if (trimmed.startsWith('## ')) {
        return <h2 key={idx} className={`text-xl sm:text-2xl font-black text-blue-500 mt-8 mb-3 pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>{trimmed.replace('## ', '')}</h2>;
      }
      if (trimmed.startsWith('### ')) {
        return <h3 key={idx} className={`text-lg font-bold mt-6 mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{trimmed.replace('### ', '')}</h3>;
      }
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const itemText = trimmed.replace(/^[\*\-]\s+/, '');
        return (
          <li key={idx} className={`ml-4 list-disc text-sm leading-relaxed mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {itemText}
          </li>
        );
      }
      if (trimmed.startsWith('> ')) {
        return (
          <blockquote key={idx} className={`my-6 p-4 rounded-2xl border-l-4 border-blue-500 text-sm italic shadow-inner ${
            isDark ? 'bg-blue-950/30 text-blue-200' : 'bg-blue-50 text-blue-900'
          }`}>
            {trimmed.replace('> ', '')}
          </blockquote>
        );
      }
      if (trimmed.startsWith('---')) {
        return <hr key={idx} className={`my-8 ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />;
      }
      if (trimmed === '') {
        return <div key={idx} className="h-3" />;
      }

      return (
        <p key={idx} className={`text-sm sm:text-base leading-relaxed mb-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {line}
        </p>
      );
    });
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-blue-500 selection:text-white transition-colors duration-200 ${
      isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Header Navigation */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b px-4 sm:px-8 py-3.5 flex items-center justify-between ${
        isDark ? 'bg-[#131d33]/90 border-slate-800' : 'bg-white/95 border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/blogs')}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              isDark 
                ? 'text-slate-300 hover:text-white bg-[#0b0f19] hover:bg-[#1a2744] border-slate-800' 
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-300'
            }`}
          >
            <ArrowLeft className="w-4 h-4 text-blue-500" />
            <span>All Articles</span>
          </button>

          <Link to="/" className="hidden sm:block">
            <img src="/logo.svg" alt="MBI Inventra" className="h-7 w-auto object-contain" />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
              isDark 
                ? 'bg-[#0b0f19] border-slate-800 text-amber-400 hover:bg-[#1a2744]' 
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            aria-label="Toggle Night/Day theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={handleCopyShareLink}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              isDark 
                ? 'bg-[#0b0f19] hover:bg-[#1a2744] text-slate-200 border-slate-800' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5 text-blue-500" />}
            <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
          </button>

          <Link 
            to="/login?register=true"
            className="text-xs font-extrabold px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all"
          >
            Try MBI Inventra
          </Link>
        </div>
      </header>

      {/* Article Hero Header */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-10 space-y-8">
        {/* Breadcrumb */}
        <div className={`flex items-center gap-2 text-xs font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          <Link to="/" className="hover:text-blue-500">Home</Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <Link to="/blogs" className="hover:text-blue-500">Blogs</Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className={`truncate max-w-[200px] sm:max-w-md ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{post.title}</span>
        </div>

        {/* Category Badges & Local SEO Indicator */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20">
            {post.category}
          </span>

          {post.isSargodhaLocal ? (
            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              Sargodha Local Guide
            </span>
          ) : (
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border flex items-center gap-1.5 ${
              isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}>
              <Globe className="w-3.5 h-3.5 text-purple-500" />
              Global SaaS Edition
            </span>
          )}
        </div>

        {/* Article Title */}
        <h1 className={`text-2xl sm:text-4xl font-black tracking-tight leading-snug sm:leading-tight ${
          isDark ? 'text-white' : 'text-slate-950'
        }`}>
          {post.title}
        </h1>

        {/* Author & Reader Metrics Card */}
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDark ? 'bg-[#131d33] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-sm shadow-md">
              {(post?.author || 'A').charAt(0)}
            </div>
            <div>
              <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{post.author}</div>
              <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{post.authorRole}</div>
            </div>
          </div>

          <div className={`flex items-center gap-4 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              {post.publishDate}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              {post.readTimeMinutes} min read
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-emerald-500" />
              {post.views + 1} views
            </span>
          </div>
        </div>

        {/* Cover Image */}
        <div className={`relative rounded-3xl overflow-hidden border max-h-[420px] shadow-xl ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <img 
            src={post.coverImage} 
            alt={post.title} 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Summary Executive Box */}
        <div className={`p-5 rounded-2xl border space-y-2 ${
          isDark 
            ? 'bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border-blue-500/20' 
            : 'bg-blue-50/70 border-blue-200'
        }`}>
          <div className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-500" />
            Executive Summary
          </div>
          <p className={`text-sm leading-relaxed font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            {post.summary}
          </p>
        </div>

        {/* Main Article Content */}
        <article className="prose prose-invert max-w-none pt-4 pb-8">
          {renderFormattedContent(post.content)}
        </article>

        {/* Target Keywords Tags */}
        {post.targetKeywords && post.targetKeywords.length > 0 && (
          <div className={`p-4 rounded-2xl border space-y-2 ${
            isDark ? 'bg-[#131d33] border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <Tag className="w-3.5 h-3.5 text-blue-500" />
              Target Topics & Keywords
            </div>
            <div className="flex flex-wrap gap-2">
              {post.targetKeywords.map((kw, i) => (
                <span key={i} className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                  isDark 
                    ? 'bg-[#0b0f19] text-slate-300 border-slate-700' 
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  #{kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Like & Share Action Bar */}
        <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isDark ? 'bg-[#131d33] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Was this article helpful?</div>
            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Support our research team by liking this guide</div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLike}
              disabled={hasLiked}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                hasLiked 
                  ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/30' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>{hasLiked ? 'Liked!' : 'Like Article'}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-[10px] font-mono">{likesCount}</span>
            </button>

            <button
              onClick={handleCopyShareLink}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4 text-blue-500" />}
              <span>{copiedLink ? 'Copied' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* CTA Card: Try MBI Inventra */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white space-y-4 shadow-2xl relative overflow-hidden">
          <div className="max-w-2xl space-y-2 relative z-10">
            <h3 className="text-2xl font-black">Transform Your Pharmacy Operations with MBI Inventra</h3>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              Experience fast thermal billing, automated FEFO expiry tracking, and instant WhatsApp receipts designed specifically for retail medical stores and wholesale distributors.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 relative z-10 pt-2">
            <Link
              to="/login?register=true"
              className="px-6 py-3 rounded-xl bg-white text-blue-600 font-extrabold text-xs hover:bg-blue-50 transition-all shadow-lg shadow-black/20"
            >
              Start Free Trial Now
            </Link>
            <a
              href="https://wa.me/923281302636?text=Hello!%20I%20read%20your%20blog%20and%20want%20a%20live%20demo%20of%20MBI%20Inventra."
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all shadow-lg"
            >
              WhatsApp Live Demo
            </a>
          </div>
        </div>

        {/* Related Articles Section */}
        {relatedPosts.length > 0 && (
          <div className={`pt-10 space-y-6 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <BookOpen className="w-5 h-5 text-blue-500" />
                <span>Related Guides & Articles</span>
              </h3>
              <Link to="/blogs" className="text-xs font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1">
                View All {20} Articles
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((rel) => (
                <div 
                  key={rel.id}
                  onClick={() => navigate(`/blog/${rel.slug}`)}
                  className={`group rounded-2xl border p-4 space-y-3 cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 hover:border-blue-500/50' 
                      : 'bg-white border-slate-200 hover:border-blue-400 shadow-2xs'
                  }`}
                >
                  <div className="relative h-32 rounded-xl overflow-hidden bg-slate-800">
                    <img src={rel.coverImage} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-blue-500">{rel.category}</span>
                    <h4 className={`text-xs font-bold transition-colors line-clamp-2 ${
                      isDark ? 'text-white group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-600'
                    }`}>
                      {rel.title}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`border-t py-8 px-4 sm:px-8 text-xs transition-colors ${
        isDark ? 'border-slate-800 bg-slate-950 text-slate-500' : 'border-slate-200 bg-white text-slate-500'
      }`}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© 2026 MBI Inventra. Global Enterprise Pharmacy POS & SaaS.</div>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-blue-600">Home</Link>
            <Link to="/blogs" className="text-blue-500 font-bold">Blogs Hub</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
