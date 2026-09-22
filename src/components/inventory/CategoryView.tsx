import React, { useState } from 'react';
import { 
  Folder, Plus, Search, Package, ArrowRight, Layers, Tag, 
  TrendingUp, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import { Medicine } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface CategoryViewProps {
  medicines: Medicine[];
  onSelectCategory: (categoryName: string) => void;
  onAddMedicineInCategory: (categoryName: string) => void;
}

export const CategoryView: React.FC<CategoryViewProps> = ({
  medicines,
  onSelectCategory,
  onAddMedicineInCategory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  // Default Categories list
  const defaultCategories = [
    'Surgical Items',
    'Syringes',
    'IV Infusions',
    'Diagnostic Devices',
    'General Medicines',
    'Antibiotics',
    'Bandages & Dressing',
    'Hospital Disposables',
  ];

  // Group medicines by category
  const categoriesMap: Record<string, Medicine[]> = {};
  
  // Seed predefined and custom categories
  const allCategoryNames = Array.from(
    new Set([
      ...defaultCategories,
      ...customCategories,
      ...medicines.map((m) => m.category || 'General Medicines'),
    ])
  );

  allCategoryNames.forEach((cat) => {
    categoriesMap[cat] = [];
  });

  medicines.forEach((med) => {
    const cat = med.category || 'General Medicines';
    if (!categoriesMap[cat]) {
      categoriesMap[cat] = [];
    }
    categoriesMap[cat].push(med);
  });

  const filteredCategories = allCategoryNames.filter((cat) =>
    cat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    if (!allCategoryNames.includes(newCatName.trim())) {
      setCustomCategories((prev) => [...prev, newCatName.trim()]);
    }
    setShowAddCategoryModal(false);
    setNewCatName('');
  };

  const totalAllItems = medicines.length;
  const totalAllStockValue = medicines.reduce(
    (sum, m) => sum + (m.quantity > 0 ? m.quantity * m.purchasePrice : 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Top Header & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Item Categories</h2>
            <p className="text-xs text-slate-500">
              {allCategoryNames.length} Categories • Total Stock Value: {formatCurrency(totalAllStockValue)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setShowAddCategoryModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredCategories.map((catName) => {
          const itemsInCat = categoriesMap[catName] || [];
          const totalQty = itemsInCat.reduce((sum, item) => sum + item.quantity, 0);
          const catStockValue = itemsInCat.reduce(
            (sum, item) => sum + (item.quantity > 0 ? item.quantity * item.purchasePrice : 0),
            0
          );

          return (
            <div
              key={catName}
              className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition p-4 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      <Folder className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                        {catName}
                      </h3>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {itemsInCat.length} Products
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                      totalQty > 0
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {totalQty} in stock
                  </span>
                </div>

                {/* Items preview preview pills */}
                {itemsInCat.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {itemsInCat.slice(0, 3).map((item) => (
                      <span
                        key={item.id}
                        className="text-[10.5px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium truncate max-w-[130px]"
                      >
                        {item.name}
                      </span>
                    ))}
                    {itemsInCat.length > 3 && (
                      <span className="text-[10px] text-slate-400 font-semibold px-1 py-0.5">
                        +{itemsInCat.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[11px] text-slate-500">
                  Value: <span className="font-bold text-slate-900">{formatCurrency(catStockValue)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onAddMedicineInCategory(catName)}
                    title={`Add product in ${catName}`}
                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onSelectCategory(catName)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                  >
                    View Items
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Add New Category</h3>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anesthesia Supplies"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
