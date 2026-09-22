import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Eye, 
  ThumbsUp, 
  Upload, 
  Image as ImageIcon, 
  MapPin, 
  Globe, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles, 
  X, 
  Tag, 
  Calendar, 
  Clock, 
  ExternalLink,
  Star,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  List,
  Quote,
  Code,
  Link as LinkIcon,
  Table as TableIcon,
  FileText,
  BarChart2
} from 'lucide-react';
import { 
  getBlogPosts, 
  saveBlogPost, 
  deleteBlogPost, 
  resetBlogsToDefault, 
  BlogPost 
} from '../../lib/blogService';

export const BlogCmsManagementPanel: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'likes'>('date');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [activeEditorTab, setActiveEditorTab] = useState<'write' | 'preview'>('write');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const refreshPosts = () => {
    setPosts(getBlogPosts());
  };

  useEffect(() => {
    refreshPosts();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenAddModal = () => {
    setEditingPost({
      title: '',
      summary: '',
      content: '',
      category: 'Pharmacy Tech',
      isSargodhaLocal: false,
      targetKeywords: ['Pharmacy Management Software'],
      author: 'MBI Editorial Team',
      authorRole: 'Systems Consultant',
      readTimeMinutes: 5,
      coverImage: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=1200&q=80',
      featured: false,
      views: 0,
      likes: 0
    });
    setImagePreview('https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=1200&q=80');
    setActiveEditorTab('write');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (post: BlogPost) => {
    setEditingPost({ ...post });
    setImagePreview(post.coverImage || '');
    setActiveEditorTab('write');
    setIsModalOpen(true);
  };

  const handleDeletePost = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete article: "${title}"?`)) {
      deleteBlogPost(id);
      refreshPosts();
      showToast(`Article "${title}" deleted.`);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all blogs back to default SEO articles?')) {
      resetBlogsToDefault();
      refreshPosts();
      showToast('Default SEO blog articles restored.');
    }
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('File size exceeds 3MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setEditingPost(prev => ({ ...prev, coverImage: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper to insert Markdown snippet into textarea at selection or end
  const insertMarkdown = (syntax: string, placeholder: string = '') => {
    if (!editingPost) return;
    const current = editingPost.content || '';
    const newContent = current ? `${current}\n\n${syntax} ${placeholder}` : `${syntax} ${placeholder}`;
    setEditingPost({ ...editingPost, content: newContent });
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost?.title || !editingPost?.content) {
      alert('Please fill in both Article Title and Article Content.');
      return;
    }

    const saved = saveBlogPost(editingPost);
    setIsModalOpen(false);
    refreshPosts();
    showToast(`Article "${saved.title}" saved successfully.`);
  };

  const filteredPosts = posts.filter(p => {
    const matchesSearch = 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (selectedFilter === 'Sargodha Local') return p.isSargodhaLocal;
    if (selectedFilter === 'Global SaaS') return !p.isSargodhaLocal;
    if (selectedFilter === 'Featured') return p.featured;
    if (selectedFilter !== 'All' && p.category !== selectedFilter) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'views') return (b.views || 0) - (a.views || 0);
    if (sortBy === 'likes') return (b.likes || 0) - (a.likes || 0);
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  // Simple Markdown renderer preview
  const renderPreviewContent = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const t = line.trim();
      if (t.startsWith('# ')) return <h1 key={idx} className="text-xl font-black text-white mt-4 mb-2">{t.replace('# ', '')}</h1>;
      if (t.startsWith('## ')) return <h2 key={idx} className="text-lg font-bold text-blue-400 mt-3 mb-1.5">{t.replace('## ', '')}</h2>;
      if (t.startsWith('### ')) return <h3 key={idx} className="text-sm font-bold text-slate-200 mt-2 mb-1">{t.replace('### ', '')}</h3>;
      if (t.startsWith('* ') || t.startsWith('- ')) return <li key={idx} className="ml-4 list-disc text-xs text-slate-300">{t.replace(/^[\*\-]\s+/, '')}</li>;
      if (t.startsWith('> ')) return <blockquote key={idx} className="my-2 p-2 border-l-2 border-blue-500 bg-blue-950/30 text-xs italic text-blue-200">{t.replace('> ', '')}</blockquote>;
      if (t.startsWith('```')) return <pre key={idx} className="p-2 rounded bg-slate-950 text-[11px] font-mono text-emerald-400 my-2">{t.replace(/```/g, '')}</pre>;
      if (!t) return <div key={idx} className="h-2" />;
      return <p key={idx} className="text-xs text-slate-300 mb-2 leading-relaxed">{line}</p>;
    });
  };

  const totalViews = posts.reduce((acc, p) => acc + (p.views || 0), 0);
  const totalLikes = posts.reduce((acc, p) => acc + (p.likes || 0), 0);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <BookOpen className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-white">Blog CMS & Article Editor</h2>
          </div>
          <p className="text-xs text-slate-400">
            Publish markdown articles with category tagging, featured showcases, and view/engagement trackers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Article</span>
          </button>
        </div>
      </div>

      {/* Performance Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase">Published Articles</div>
            <div className="text-2xl font-black text-white font-mono">{posts.length} Posts</div>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase">Total Article Views</div>
            <div className="text-2xl font-black text-emerald-400 font-mono">{totalViews.toLocaleString()} Views</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase">Total Engagements</div>
            <div className="text-2xl font-black text-pink-400 font-mono">{totalLikes.toLocaleString()} Likes</div>
          </div>
          <div className="p-3 rounded-xl bg-pink-500/10 text-pink-400">
            <ThumbsUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Sort Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search articles by title or keyword..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['All', 'Featured', 'Inventory', 'Pharmacy Tech', 'Business Tips', 'POS & Billing', 'FEFO & Expiry', 'Sargodha Local', 'Global SaaS'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedFilter === cat
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold text-slate-400">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none"
          >
            <option value="date">Newest Date</option>
            <option value="views">Most Views</option>
            <option value="likes">Most Likes</option>
          </select>
        </div>
      </div>

      {/* Articles Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Article</th>
                <th className="p-4">Category & Scope</th>
                <th className="p-4">Performance Counters</th>
                <th className="p-4">Author</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPosts.map((post) => (
                <tr key={post.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-4 max-w-sm space-y-1">
                    <div className="flex items-center gap-2">
                      {post.featured && (
                        <span className="p-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30" title="Featured Article">
                          <Star className="w-3 h-3 fill-amber-400" />
                        </span>
                      )}
                      <a
                        href={`/blogs/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-black text-white hover:text-blue-400 text-sm line-clamp-1 flex items-center gap-1"
                      >
                        <span>{post.title}</span>
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </a>
                    </div>
                    <p className="text-slate-400 text-[11px] line-clamp-1">{post.summary}</p>
                  </td>

                  <td className="p-4 space-y-1">
                    <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold text-[11px]">
                      {post.category}
                    </span>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {post.isSargodhaLocal ? '📍 Sargodha Local SEO' : '🌐 Global SaaS'}
                    </div>
                  </td>

                  <td className="p-4 font-mono space-y-1">
                    <div className="flex items-center gap-3 text-emerald-400 font-bold">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {(post.views || 0).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1 text-pink-400">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        {post.likes || 0}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">{post.readTimeMinutes} min read</div>
                  </td>

                  <td className="p-4">
                    <div className="font-bold text-slate-200">{post.author}</div>
                    <div className="text-[10px] text-slate-500">{post.authorRole}</div>
                  </td>

                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEditModal(post)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-blue-600/20 text-slate-300 hover:text-blue-400 border border-slate-700 transition cursor-pointer"
                      title="Edit article"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePost(post.id, post.title)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 border border-slate-700 transition cursor-pointer"
                      title="Delete article"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && editingPost && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 space-y-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-white">
                  {editingPost.id ? 'Edit Article' : 'Create Article'}
                </h3>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Article Title *</label>
                <input
                  type="text"
                  required
                  value={editingPost.title || ''}
                  onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                  placeholder="e.g. Best Pharmacy Management Software in Sargodha"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 text-sm font-bold"
                />
              </div>

              {/* Category, Scope & Featured Checkbox */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Category Tag</label>
                  <select
                    value={editingPost.category || 'Pharmacy Tech'}
                    onChange={(e) => setEditingPost({ ...editingPost, category: e.target.value as any })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Inventory">Inventory</option>
                    <option value="Pharmacy Tech">Pharmacy Tech</option>
                    <option value="Business Tips">Business Tips</option>
                    <option value="POS & Billing">POS & Billing</option>
                    <option value="FEFO & Expiry">FEFO & Expiry</option>
                    <option value="Sargodha Local">Sargodha Local</option>
                    <option value="Global SaaS">Global SaaS</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Locality / SEO Scope</label>
                  <select
                    value={editingPost.isSargodhaLocal ? 'Sargodha' : 'Global'}
                    onChange={(e) => setEditingPost({
                      ...editingPost,
                      isSargodhaLocal: e.target.value === 'Sargodha',
                      category: e.target.value === 'Sargodha' ? 'Sargodha Local' : editingPost.category
                    })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Global">Global / International SaaS</option>
                    <option value="Sargodha">Sargodha Local SEO</option>
                  </select>
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold flex items-center gap-2 cursor-pointer hover:bg-amber-500/20 transition">
                    <input
                      type="checkbox"
                      checked={!!editingPost.featured}
                      onChange={(e) => setEditingPost({ ...editingPost, featured: e.target.checked })}
                      className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 w-4 h-4"
                    />
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>Promote as Featured Hero</span>
                  </label>
                </div>
              </div>

              {/* Author, Read Time & Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Author Name</label>
                  <input
                    type="text"
                    value={editingPost.author || ''}
                    onChange={(e) => setEditingPost({ ...editingPost, author: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Read Time (Mins)</label>
                  <input
                    type="number"
                    value={editingPost.readTimeMinutes || 5}
                    onChange={(e) => setEditingPost({ ...editingPost, readTimeMinutes: parseInt(e.target.value, 10) || 5 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Views Count</label>
                  <input
                    type="number"
                    value={editingPost.views || 0}
                    onChange={(e) => setEditingPost({ ...editingPost, views: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Likes Count</label>
                  <input
                    type="number"
                    value={editingPost.likes || 0}
                    onChange={(e) => setEditingPost({ ...editingPost, likes: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-pink-400 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Executive Summary */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Executive Summary / Excerpt</label>
                <textarea
                  rows={2}
                  value={editingPost.summary || ''}
                  onChange={(e) => setEditingPost({ ...editingPost, summary: e.target.value })}
                  placeholder="Short excerpt for cards..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              {/* Article Content with Markdown Formatting Toolbar & Live Preview Tab */}
              <div className="space-y-2 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <label className="text-slate-300 font-bold flex items-center gap-2">
                    <span>Article Content</span>
                    <span className="text-[10px] text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded">Markdown Enabled</span>
                  </label>

                  {/* Write vs Preview Tabs */}
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveEditorTab('write')}
                      className={`px-3 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                        activeEditorTab === 'write' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Write Markdown
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveEditorTab('preview')}
                      className={`px-3 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                        activeEditorTab === 'preview' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Live Preview
                    </button>
                  </div>
                </div>

                {activeEditorTab === 'write' ? (
                  <div className="space-y-2">
                    {/* Markdown Toolbar */}
                    <div className="flex flex-wrap items-center gap-1 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
                      <button
                        type="button"
                        onClick={() => insertMarkdown('# ', 'Heading 1')}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
                        title="Heading 1"
                      >
                        <Heading1 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('## ', 'Heading 2')}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
                        title="Heading 2"
                      >
                        <Heading2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('### ', 'Heading 3')}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
                        title="Heading 3"
                      >
                        <Heading3 className="w-3.5 h-3.5" />
                      </button>

                      <div className="h-4 w-px bg-slate-800 mx-1" />

                      <button
                        type="button"
                        onClick={() => insertMarkdown('* ', 'Bullet item')}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
                        title="Bullet List"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('> ', 'Quote block')}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
                        title="Quote Block"
                      >
                        <Quote className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdown('```\n', 'Code block\n```')}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
                        title="Code Block"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <textarea
                      rows={10}
                      required
                      value={editingPost.content || ''}
                      onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                      placeholder="Write article headings (# Heading), bullet points (* item), code blocks (```) and body text..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-blue-500 leading-relaxed"
                    />
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 max-h-80 overflow-y-auto space-y-2">
                    {editingPost.content ? (
                      renderPreviewContent(editingPost.content)
                    ) : (
                      <div className="text-slate-500 italic text-center py-6">No content written yet</div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Controls */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold shadow-lg shadow-blue-600/30"
                >
                  Save & Publish Article
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
