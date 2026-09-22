import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  BookOpen, 
  Clock, 
  Eye, 
  ArrowRight, 
  MapPin, 
  Sparkles, 
  Tag, 
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';
import { getBlogPosts, BlogPost } from '../lib/blogService';

export const BlogListingPage: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Light / Dark Theme State synchronized with localStorage
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
    setPosts(getBlogPosts());
  }, []);

  const categories = [
    { id: 'All', label: 'All Articles', count: posts.length },
    { id: 'Inventory', label: 'Inventory', count: posts.filter(p => p.category === 'Inventory' || p.category === 'Inventory & Batch').length },
    { id: 'Pharmacy Tech', label: 'Pharmacy Tech', count: posts.filter(p => p.category === 'Pharmacy Tech' || p.category === 'POS & Billing').length },
    { id: 'Business Tips', label: 'Business Tips', count: posts.filter(p => p.category === 'Business Tips').length },
    { id: 'FEFO & Expiry', label: 'FEFO & Expiry', count: posts.filter(p => p.category === 'FEFO & Expiry').length },
    { id: 'Sargodha Local', label: 'Sargodha Local Guides', count: posts.filter(p => p.isSargodhaLocal).length, isLocal: true },
    { id: 'Global SaaS', label: 'Global SaaS', count: posts.filter(p => !p.isSargodhaLocal).length },
  ];

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesSearch = 
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.targetKeywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedCategory === 'All') return true;
      if (selectedCategory === 'Sargodha Local') return post.isSargodhaLocal;
      if (selectedCategory === 'Global SaaS') return !post.isSargodhaLocal;
      if (selectedCategory === 'Inventory') return post.category === 'Inventory' || post.category === 'Inventory & Batch';
      if (selectedCategory === 'Pharmacy Tech') return post.category === 'Pharmacy Tech' || post.category === 'POS & Billing';
      return post.category === selectedCategory;
    });
  }, [posts, searchTerm, selectedCategory]);

  const featuredPost = useMemo(() => {
    return posts.find(p => p.featured) || posts[0];
  }, [posts]);

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-blue-500 selection:text-white transition-colors duration-200 ${
      isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Header Navigation */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b px-4 sm:px-8 py-3.5 flex items-center justify-between transition-colors ${
        isDark ? 'bg-[#131d33]/90 border-slate-800/80 shadow-lg shadow-black/20' : 'bg-white/95 border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/logo.svg" alt="MBI Inventra" className="h-7.5 w-auto object-contain transition-transform group-hover:scale-105" />
          </Link>
          <nav className={`hidden md:flex items-center gap-6 text-sm font-bold ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}>
            <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <span className="text-blue-500 font-black border-b-2 border-blue-500 pb-0.5">Blog &amp; Guides</span>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
              isDark 
                ? 'bg-[#0b0f19] border-slate-800 text-amber-400 hover:bg-[#1a2744]' 
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            aria-label="Toggle Night/Day theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <Link 
            to="/login"
            className={`text-xs font-bold px-4 py-2 rounded-xl border transition-all ${
              isDark 
                ? 'bg-[#131d33] hover:bg-[#1a2744] text-slate-200 border-slate-700' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
          >
            Sign In
          </Link>
          <Link 
            to="/login?register=true"
            className="text-xs font-extrabold px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition-all"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Header Section */}
      <section className={`relative overflow-hidden pt-12 pb-16 px-4 sm:px-8 border-b transition-colors ${
        isDark 
          ? 'bg-gradient-to-b from-[#131d33] via-[#0b0f19] to-[#0b0f19] border-slate-800/60' 
          : 'bg-gradient-to-b from-blue-50/80 via-slate-50 to-slate-50 border-slate-200'
      }`}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-64 bg-blue-600/10 blur-3xl pointer-events-none rounded-full" />
        
        <div className="max-w-6xl mx-auto text-center space-y-4 relative z-10">
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
            isDark 
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
              : 'bg-blue-100 border-blue-200 text-blue-700'
          }`}>
            <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
            MBI INVENTRA KNOWLEDGE HUB
          </div>

          <h1 className={`text-3xl sm:text-5xl font-black tracking-tight leading-tight ${
            isDark ? 'text-white' : 'text-slate-950'
          }`}>
            Pharmacy Systems &amp; Healthcare Software Insights
          </h1>

          <p className={`text-sm sm:text-base max-w-3xl mx-auto leading-relaxed ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}>
            In-depth operational guides, medicine inventory best practices, FEFO expiry control strategies, and location-specific retail pharmacy solutions for growth.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto pt-4">
            <div className="relative">
              <Search className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`} />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search topics e.g. Pharmacy POS, Sargodha, FEFO, Medicine Batch Tracking..."
                className={`w-full pl-12 pr-12 py-3.5 rounded-2xl border text-sm transition-all ${
                  isDark 
                    ? 'bg-[#131d33] border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-xl' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 shadow-sm'
                }`}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-white bg-[#0b0f19] px-2 py-1 rounded cursor-pointer border border-slate-800"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-10 space-y-10">
        {/* Category Filter Tabs */}
        <div className={`flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                    : isDark
                      ? 'bg-[#131d33] text-slate-300 border-slate-800 hover:bg-[#1a2744] hover:text-white'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-2xs'
                }`}
              >
                {cat.isLocal ? (
                  <MapPin className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-emerald-500'}`} />
                ) : (
                  <Tag className="w-3.5 h-3.5" />
                )}
                <span>{cat.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  isActive ? 'bg-white/20 text-white' : isDark ? 'bg-[#0b0f19] text-slate-300' : 'bg-slate-100 text-slate-500'
                }`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Featured Banner (If no search term and viewing All) */}
        {!searchTerm && selectedCategory === 'All' && featuredPost && (
          <div className={`relative rounded-3xl overflow-hidden border p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center transition-colors ${
            isDark 
              ? 'border-slate-800 bg-gradient-to-r from-[#131d33] via-[#131d33]/90 to-[#0b0f19] shadow-2xl' 
              : 'border-slate-200 bg-gradient-to-r from-white via-blue-50/40 to-slate-50 shadow-md'
          }`}>
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  Featured Article
                </span>
                {featuredPost.isSargodhaLocal && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Sargodha Local
                  </span>
                )}
              </div>

              <h2 className={`text-2xl sm:text-3xl font-black leading-tight ${
                isDark ? 'text-white' : 'text-slate-950'
              }`}>
                {featuredPost.title}
              </h2>

              <p className={`text-xs sm:text-sm leading-relaxed line-clamp-3 ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}>
                {featuredPost.summary}
              </p>

              <div className={`flex items-center gap-4 text-xs font-semibold pt-2 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <span>By {featuredPost.author}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  {featuredPost.readTimeMinutes} min read
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-purple-500" />
                  {featuredPost.views} views
                </span>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate(`/blog/${featuredPost.slug}`)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition-all shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  Read Full Featured Article
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className={`lg:col-span-5 relative h-64 sm:h-72 rounded-2xl overflow-hidden border shadow-xl ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <img 
                src={featuredPost.coverImage} 
                alt={featuredPost.title}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
              />
              <div className={`absolute inset-0 bg-gradient-to-t opacity-60 ${
                isDark ? 'from-[#0b0f19] via-transparent to-transparent' : 'from-slate-900/40 via-transparent to-transparent'
              }`} />
            </div>
          </div>
        )}

        {/* Articles Grid Header */}
        <div className={`flex items-center justify-between border-b pb-4 ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            <BookOpen className="w-5 h-5 text-blue-500" />
            <span>Showing {filteredPosts.length} Articles</span>
            {selectedCategory !== 'All' && (
              <span className={`text-xs font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                in <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{selectedCategory}</strong>
              </span>
            )}
          </h3>

          <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
            Updated Daily for Pharmacy Professionals
          </div>
        </div>

        {/* Articles Grid */}
        {filteredPosts.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl border space-y-3 ${
            isDark ? 'bg-[#131d33] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <Search className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>No articles found</h4>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Try adjusting your search query or switching category tabs.</p>
            <button 
              onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}
              className="mt-2 text-xs font-bold text-blue-500 hover:text-blue-600 underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <article 
                key={post.id}
                onClick={() => navigate(`/blog/${post.slug}`)}
                className={`group rounded-2xl border overflow-hidden transition-all duration-300 flex flex-col cursor-pointer ${
                  isDark 
                    ? 'bg-[#131d33] hover:bg-[#1a2744] border-slate-800 hover:border-blue-500/50 shadow-sm hover:shadow-xl hover:-translate-y-1' 
                    : 'bg-white hover:bg-blue-50/30 border-slate-200 hover:border-blue-400 shadow-xs hover:shadow-md hover:-translate-y-1'
                }`}
              >
                {/* Cover Image */}
                <div className="relative h-48 overflow-hidden bg-slate-800">
                  <img 
                    src={post.coverImage} 
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19]/90 via-transparent to-transparent opacity-80" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-[#0b0f19]/90 backdrop-blur-md text-blue-400 border border-blue-500/30">
                      {post.category}
                    </span>
                    {post.isSargodhaLocal && (
                      <span className="px-2 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-950/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        Sargodha
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 right-3 text-[10px] font-bold text-slate-300 bg-[#0b0f19]/80 backdrop-blur-md px-2 py-0.5 rounded flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-400" />
                    {post.readTimeMinutes} min
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className={`text-base font-bold transition-colors leading-snug line-clamp-2 ${
                      isDark ? 'text-white group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-600'
                    }`}>
                      {post.title}
                    </h3>

                    <p className={`text-xs leading-relaxed line-clamp-3 ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}>
                      {post.summary}
                    </p>
                  </div>

                  {/* Footer Meta */}
                  <div className={`pt-3 border-t flex items-center justify-between text-[11px] font-semibold ${
                    isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-400'
                  }`}>
                    <span className="truncate max-w-[140px]">{post.author}</span>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {post.views}
                      </span>
                      <span className="flex items-center gap-1 text-blue-500 group-hover:translate-x-0.5 transition-transform font-bold">
                        Read
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`border-t py-10 px-4 sm:px-8 text-xs transition-colors ${
        isDark ? 'border-slate-800 bg-[#131d33] text-slate-400' : 'border-slate-200 bg-white text-slate-500'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="MBI Inventra" className="h-6 w-auto" />
            <span>© 2026 MBI Inventra. Global Enterprise Pharmacy POS &amp; SaaS.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-blue-600">Home</Link>
            <Link to="/blogs" className="text-blue-500 font-bold">Blogs</Link>
            <Link to="/login" className="hover:text-blue-600">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
