import React, { useState, useMemo } from 'react';
import { 
  BarChart2, TrendingUp, TrendingDown, DollarSign, Package, 
  Layers, Filter, Download, Sparkles, PieChart, Info, Search,
  ChevronRight, ArrowUpRight, ArrowDownRight, ShieldAlert, Award,
  CheckCircle2, AlertTriangle, FileSpreadsheet, Eye, X
} from 'lucide-react';
import { Invoice, Medicine } from '../../types';
import { formatCurrency } from '../../lib/utils';
import * as XLSX from 'xlsx';

interface CategoryProfitabilityHeatmapProps {
  invoices: Invoice[];
  medicines: Medicine[];
  startDate: string;
  endDate: string;
  selectedFirm?: string;
}

export interface CategoryMetric {
  category: string;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  marginPct: number;
  totalUnitsSold: number;
  itemCount: number;
  totalStockQty: number;
  stockValuation: number;
  topProduct: string;
  topProductRevenue: number;
  quadrant: 'Star Performer' | 'Cash Cow' | 'Potential Gem' | 'Underperformer';
  marginTier: 'Ultra (≥35%)' | 'High (25-35%)' | 'Moderate (15-25%)' | 'Low (<15%)';
  volumeTier: 'High (>Rs 100k)' | 'Moderate (Rs 25k-100k)' | 'Low (<Rs 25k)';
}

export const CategoryProfitabilityHeatmap: React.FC<CategoryProfitabilityHeatmapProps> = ({
  invoices,
  medicines,
  startDate,
  endDate,
  selectedFirm = 'ALL FIRMS'
}) => {
  const [metricMode, setMetricMode] = useState<'margin' | 'profit' | 'revenue' | 'volume'>('margin');
  const [viewMode, setViewMode] = useState<'heatmap' | 'matrix' | 'quadrant'>('heatmap');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<CategoryMetric | null>(null);

  // Compute aggregated category performance data from Invoices & Medicines
  const categoryData = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Map medicines to quick lookup dict
    const medMap = new Map<string, Medicine>();
    medicines.forEach(m => {
      medMap.set(m.id, m);
      if (m.name) medMap.set(m.name.toLowerCase(), m);
    });

    // Grouping container
    const catMap = new Map<string, {
      totalRevenue: number;
      totalCost: number;
      totalUnitsSold: number;
      itemsInCat: Map<string, { name: string; revenue: number; units: number; profit: number }>;
    }>();

    // Initialize all categories present in medicines catalog
    medicines.forEach(m => {
      const cat = (m.category && m.category.trim()) || 'General Medicine';
      if (!catMap.has(cat)) {
        catMap.set(cat, {
          totalRevenue: 0,
          totalCost: 0,
          totalUnitsSold: 0,
          itemsInCat: new Map()
        });
      }
    });

    // Filter invoices by date & firm
    const filteredInvoices = invoices.filter(inv => {
      if ((inv as any).status === 'Cancelled' || (inv as any).status === 'Draft') return false;
      const invDate = new Date(inv.date);
      if (invDate < start || invDate > end) return false;
      if (selectedFirm !== 'ALL FIRMS' && (inv as any).firmName && (inv as any).firmName !== selectedFirm) return false;
      return true;
    });

    // Process items in filtered invoices
    filteredInvoices.forEach(inv => {
      if (!inv.items || !Array.isArray(inv.items)) return;

      inv.items.forEach(item => {
        // Find matching medicine to resolve category
        const med = medMap.get(item.medicineId || '') || medMap.get((item.name || '').toLowerCase());
        const category = (med?.category && med.category.trim()) || 'General Medicine';

        if (!catMap.has(category)) {
          catMap.set(category, {
            totalRevenue: 0,
            totalCost: 0,
            totalUnitsSold: 0,
            itemsInCat: new Map()
          });
        }

        const catData = catMap.get(category)!;
        const qty = item.quantity || 1;
        const itemRev = item.total || (item.sellingPrice * qty);

        // Determine purchase price basis
        const unitPurchasePrice = (item as any).purchasePrice ?? med?.purchasePrice ?? (item.sellingPrice * 0.75);
        const itemCost = unitPurchasePrice * qty;

        catData.totalRevenue += itemRev;
        catData.totalCost += itemCost;
        catData.totalUnitsSold += qty;

        // Track per-item inside category
        const itemName = item.name || 'Unknown Product';
        const existingItem = catData.itemsInCat.get(itemName) || { name: itemName, revenue: 0, units: 0, profit: 0 };
        existingItem.revenue += itemRev;
        existingItem.units += qty;
        existingItem.profit += (itemRev - itemCost);
        catData.itemsInCat.set(itemName, existingItem);
      });
    });

    // Calculate overall statistics for quadrant threshold
    let totalAllRev = 0;
    catMap.forEach(c => { totalAllRev += c.totalRevenue; });
    const avgCategoryRevenue = catMap.size > 0 ? (totalAllRev / catMap.size) : 50000;

    // Build finalized CategoryMetric list
    const result: CategoryMetric[] = [];

    catMap.forEach((cData, catName) => {
      const grossProfit = cData.totalRevenue - cData.totalCost;
      
      // Calculate Margin %
      let marginPct = cData.totalRevenue > 0 
        ? (grossProfit / cData.totalRevenue) * 100 
        : 0;

      // Fallback margin based on catalog medicines if no sales in period
      if (cData.totalRevenue === 0) {
        const catMeds = medicines.filter(m => (m.category || 'General Medicine') === catName);
        if (catMeds.length > 0) {
          const avgSell = catMeds.reduce((s, m) => s + (m.sellingPrice || 0), 0) / catMeds.length;
          const avgCost = catMeds.reduce((s, m) => s + (m.purchasePrice || 0), 0) / catMeds.length;
          marginPct = avgSell > 0 ? ((avgSell - avgCost) / avgSell) * 100 : 20;
        }
      }

      // Catalog items info
      const catMeds = medicines.filter(m => (m.category || 'General Medicine') === catName);
      const itemCount = catMeds.length;
      const totalStockQty = catMeds.reduce((s, m) => s + (m.quantity || 0), 0);
      const stockValuation = catMeds.reduce((s, m) => s + ((m.quantity || 0) * (m.purchasePrice || 0)), 0);

      // Top product in category
      let topProdName = 'N/A';
      let topProdRev = 0;
      cData.itemsInCat.forEach(i => {
        if (i.revenue > topProdRev) {
          topProdRev = i.revenue;
          topProdName = i.name;
        }
      });
      if (topProdName === 'N/A' && catMeds.length > 0) {
        topProdName = catMeds[0].name;
      }

      // Quadrant Classification
      let quadrant: CategoryMetric['quadrant'] = 'Underperformer';
      const isHighMargin = marginPct >= 22;
      const isHighVolume = cData.totalRevenue >= (avgCategoryRevenue * 0.7) || cData.totalUnitsSold >= 50;

      if (isHighMargin && isHighVolume) quadrant = 'Star Performer';
      else if (!isHighMargin && isHighVolume) quadrant = 'Cash Cow';
      else if (isHighMargin && !isHighVolume) quadrant = 'Potential Gem';
      else quadrant = 'Underperformer';

      // Tiers
      let marginTier: CategoryMetric['marginTier'] = 'Moderate (15-25%)';
      if (marginPct >= 35) marginTier = 'Ultra (≥35%)';
      else if (marginPct >= 25) marginTier = 'High (25-35%)';
      else if (marginPct >= 15) marginTier = 'Moderate (15-25%)';
      else marginTier = 'Low (<15%)';

      let volumeTier: CategoryMetric['volumeTier'] = 'Moderate (Rs 25k-100k)';
      if (cData.totalRevenue >= 100000) volumeTier = 'High (>Rs 100k)';
      else if (cData.totalRevenue >= 25000) volumeTier = 'Moderate (Rs 25k-100k)';
      else volumeTier = 'Low (<Rs 25k)';

      result.push({
        category: catName,
        totalRevenue: cData.totalRevenue,
        totalCost: cData.totalCost,
        grossProfit,
        marginPct,
        totalUnitsSold: cData.totalUnitsSold,
        itemCount,
        totalStockQty,
        stockValuation,
        topProduct: topProdName,
        topProductRevenue: topProdRev,
        quadrant,
        marginTier,
        volumeTier
      });
    });

    // Sort by Total Gross Profit descending
    return result.sort((a, b) => b.grossProfit - a.grossProfit);
  }, [invoices, medicines, startDate, endDate, selectedFirm]);

  // Filtered by search term
  const filteredCategoryData = useMemo(() => {
    if (!searchFilter.trim()) return categoryData;
    const term = searchFilter.toLowerCase();
    return categoryData.filter(c => 
      c.category.toLowerCase().includes(term) ||
      c.topProduct.toLowerCase().includes(term) ||
      c.quadrant.toLowerCase().includes(term)
    );
  }, [categoryData, searchFilter]);

  // Total summary metrics across all categories
  const totals = useMemo(() => {
    const totalRev = categoryData.reduce((s, c) => s + c.totalRevenue, 0);
    const totalProfit = categoryData.reduce((s, c) => s + c.grossProfit, 0);
    const avgMargin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;
    const totalUnits = categoryData.reduce((s, c) => s + c.totalUnitsSold, 0);
    const starsCount = categoryData.filter(c => c.quadrant === 'Star Performer').length;
    const cashCowsCount = categoryData.filter(c => c.quadrant === 'Cash Cow').length;

    return { totalRev, totalProfit, avgMargin, totalUnits, starsCount, cashCowsCount };
  }, [categoryData]);

  // Heatmap color intensity helper based on selected metric
  const getHeatmapColor = (cat: CategoryMetric) => {
    if (metricMode === 'margin') {
      const m = cat.marginPct;
      if (m >= 35) return 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20';
      if (m >= 25) return 'bg-teal-600 text-white border-teal-500 shadow-teal-500/20';
      if (m >= 18) return 'bg-sky-600 text-white border-sky-500';
      if (m >= 10) return 'bg-amber-500 text-white border-amber-400';
      return 'bg-rose-600 text-white border-rose-500';
    }

    if (metricMode === 'profit') {
      const p = cat.grossProfit;
      if (p >= 50000) return 'bg-emerald-700 text-white border-emerald-600';
      if (p >= 20000) return 'bg-emerald-600 text-white border-emerald-500';
      if (p >= 5000) return 'bg-blue-600 text-white border-blue-500';
      if (p > 0) return 'bg-sky-600 text-white border-sky-400';
      return 'bg-slate-700 text-slate-200 border-slate-600';
    }

    if (metricMode === 'revenue') {
      const r = cat.totalRevenue;
      if (r >= 200000) return 'bg-indigo-700 text-white border-indigo-600';
      if (r >= 100000) return 'bg-blue-600 text-white border-blue-500';
      if (r >= 25000) return 'bg-cyan-600 text-white border-cyan-500';
      return 'bg-slate-700 text-slate-200 border-slate-600';
    }

    // Units volume
    const v = cat.totalUnitsSold;
    if (v >= 200) return 'bg-purple-700 text-white border-purple-600';
    if (v >= 80) return 'bg-indigo-600 text-white border-indigo-500';
    if (v >= 20) return 'bg-blue-600 text-white border-blue-500';
    return 'bg-slate-700 text-slate-200 border-slate-600';
  };

  const exportToExcel = () => {
    const data = categoryData.map((c, i) => ({
      Rank: i + 1,
      Category: c.category,
      'Performance Quadrant': c.quadrant,
      'Total Sales Revenue (Rs)': c.totalRevenue,
      'Total Cost (Rs)': c.totalCost,
      'Gross Profit (Rs)': c.grossProfit,
      'Profit Margin (%)': `${c.marginPct.toFixed(2)}%`,
      'Units Sold': c.totalUnitsSold,
      'Catalogue Items': c.itemCount,
      'Stock Valuation (Rs)': c.stockValuation,
      'Top Selling Product': c.topProduct
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Category Profitability');
    XLSX.writeFile(wb, `Medicine_Category_Profitability_Heatmap_${startDate}_to_${endDate}.xlsx`);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* KPI Header Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            <span>Overall Revenue</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
            Rs {totals.totalRev.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 truncate">Across {categoryData.length} Medicine Categories</p>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider">
            <span>Total Gross Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
            Rs {totals.totalProfit.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
            Average Margin: {totals.avgMargin.toFixed(1)}%
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-950/40 p-3.5 rounded-2xl border border-purple-200 dark:border-purple-800/60 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-purple-800 dark:text-purple-300 font-bold uppercase tracking-wider">
            <span>Star Categories</span>
            <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-purple-900 dark:text-purple-200 font-mono">
            {totals.starsCount} Categories
          </div>
          <p className="text-[11px] text-purple-700 dark:text-purple-300">High Margin & High Sales Volume</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-800/60 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-blue-800 dark:text-blue-300 font-bold uppercase tracking-wider">
            <span>Total Units Sold</span>
            <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-900 dark:text-blue-200 font-mono">
            {totals.totalUnits.toLocaleString()} Units
          </div>
          <p className="text-[11px] text-blue-600 dark:text-blue-400">Cash Cows: {totals.cashCowsCount}</p>
        </div>
      </div>

      {/* Heatmap Control & Filtering Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Metric Color Toggle */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Heatmap Intensity Basis:
          </span>
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setMetricMode('margin')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                metricMode === 'margin'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Profit Margin %
            </button>
            <button
              onClick={() => setMetricMode('profit')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                metricMode === 'profit'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Gross Profit ($)
            </button>
            <button
              onClick={() => setMetricMode('revenue')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                metricMode === 'revenue'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sales Volume ($)
            </button>
            <button
              onClick={() => setMetricMode('volume')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                metricMode === 'volume'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Units Sold
            </button>
          </div>
        </div>

        {/* View Layout Toggle & Export */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('heatmap')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                viewMode === 'heatmap' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'
              }`}
            >
              Heatmap Tiles
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                viewMode === 'matrix' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'
              }`}
            >
              2D Margin/Volume Matrix
            </button>
            <button
              onClick={() => setViewMode('quadrant')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                viewMode === 'quadrant' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'
              }`}
            >
              Quadrant Analytics
            </button>
          </div>

          <button
            onClick={exportToExcel}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>

      </div>

      {/* Heatmap Color Scale Legend Bar */}
      <div className="bg-slate-900 text-white p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-300">Heatmap Intensity Scale ({metricMode === 'margin' ? 'Margin %' : 'Value'}):</span>
        </div>
        <div className="flex items-center gap-1.5 font-bold text-[11px] flex-wrap">
          <span className="px-2 py-0.5 rounded bg-emerald-600 text-white">Ultra (≥35% / Top Profit)</span>
          <span className="px-2 py-0.5 rounded bg-teal-600 text-white">High (25% - 35%)</span>
          <span className="px-2 py-0.5 rounded bg-sky-600 text-white">Moderate (15% - 25%)</span>
          <span className="px-2 py-0.5 rounded bg-amber-500 text-white">Low (10% - 15%)</span>
          <span className="px-2 py-0.5 rounded bg-rose-600 text-white">Underperforming (&lt;10%)</span>
        </div>
      </div>

      {/* VIEW MODE 1: INTERACTIVE HEATMAP TILES GRID */}
      {viewMode === 'heatmap' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredCategoryData.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200">
              No categories match the filter or date range.
            </div>
          ) : (
            filteredCategoryData.map((cat) => {
              const colorClass = getHeatmapColor(cat);

              return (
                <div
                  key={cat.category}
                  onClick={() => setSelectedCategoryDetail(cat)}
                  className={`p-4 rounded-2xl border shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-pointer flex flex-col justify-between ${colorClass}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black text-sm tracking-wide line-clamp-1">{cat.category}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-xs border border-white/20 shrink-0">
                        {cat.quadrant}
                      </span>
                    </div>

                    {/* Big Metric Display */}
                    <div className="pt-1">
                      <div className="text-2xl font-black font-mono">
                        {metricMode === 'margin' && `${cat.marginPct.toFixed(1)}%`}
                        {metricMode === 'profit' && `Rs ${cat.grossProfit.toLocaleString()}`}
                        {metricMode === 'revenue' && `Rs ${cat.totalRevenue.toLocaleString()}`}
                        {metricMode === 'volume' && `${cat.totalUnitsSold} Units`}
                      </div>
                      <p className="text-[11px] opacity-85 font-medium">
                        {metricMode === 'margin' ? `Profit: Rs ${cat.grossProfit.toLocaleString()}` : `Margin: ${cat.marginPct.toFixed(1)}%`}
                      </p>
                    </div>
                  </div>

                  {/* Footer Stats inside Tile */}
                  <div className="pt-3 mt-3 border-t border-white/20 flex items-center justify-between text-[11px] opacity-90 font-medium">
                    <div>
                      <span>Sales: <strong>Rs {cat.totalRevenue.toLocaleString()}</strong></span>
                    </div>
                    <div className="flex items-center gap-1 font-bold">
                      <span>{cat.itemCount} Items</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW MODE 2: 2D MARGIN vs SALES VOLUME MATRIX */}
      {viewMode === 'matrix' && (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-600" />
              2D Profit Margin vs Sales Volume Category Distribution Matrix
            </h3>
            <span className="text-xs text-slate-500 font-semibold">Click any category badge to inspect</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* QUADRANT 1: STAR PERFORMERS */}
            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800 pb-2">
                <span className="font-black text-xs text-emerald-900 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" />
                  🌟 Star Performers (High Margin & High Volume)
                </span>
                <span className="text-xs font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                  {categoryData.filter(c => c.quadrant === 'Star Performer').length}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                Top revenue generators with strong profit margins. Prioritize stock availability & premium shelf location.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {categoryData.filter(c => c.quadrant === 'Star Performer').map(cat => (
                  <button
                    key={cat.category}
                    onClick={() => setSelectedCategoryDetail(cat)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer"
                  >
                    <span>{cat.category}</span>
                    <span className="font-mono text-[10px] bg-emerald-800 px-1.5 py-0.2 rounded">
                      {cat.marginPct.toFixed(1)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* QUADRANT 2: CASH COWS */}
            <div className="bg-blue-50/60 dark:bg-blue-950/30 border-2 border-blue-300 dark:border-blue-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-blue-200 dark:border-blue-800 pb-2">
                <span className="font-black text-xs text-blue-900 dark:text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  ⚡ Cash Cows (High Volume, Lower Margin)
                </span>
                <span className="text-xs font-mono font-bold bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full">
                  {categoryData.filter(c => c.quadrant === 'Cash Cow').length}
                </span>
              </div>
              <p className="text-[11px] text-blue-800 dark:text-blue-300">
                High turnover categories generating bulk cashflow. Consider bulk distributor discounts to optimize purchase price.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {categoryData.filter(c => c.quadrant === 'Cash Cow').map(cat => (
                  <button
                    key={cat.category}
                    onClick={() => setSelectedCategoryDetail(cat)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer"
                  >
                    <span>{cat.category}</span>
                    <span className="font-mono text-[10px] bg-blue-800 px-1.5 py-0.2 rounded">
                      Rs {cat.totalRevenue.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* QUADRANT 3: POTENTIAL GEMS */}
            <div className="bg-purple-50/60 dark:bg-purple-950/30 border-2 border-purple-300 dark:border-purple-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-purple-200 dark:border-purple-800 pb-2">
                <span className="font-black text-xs text-purple-900 dark:text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  💎 Potential Gems (High Margin, Lower Volume)
                </span>
                <span className="text-xs font-mono font-bold bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full">
                  {categoryData.filter(c => c.quadrant === 'Potential Gem').length}
                </span>
              </div>
              <p className="text-[11px] text-purple-800 dark:text-purple-300">
                High profitability per sale, but lower sales velocity. Promote to doctors / patients to boost volume.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {categoryData.filter(c => c.quadrant === 'Potential Gem').map(cat => (
                  <button
                    key={cat.category}
                    onClick={() => setSelectedCategoryDetail(cat)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer"
                  >
                    <span>{cat.category}</span>
                    <span className="font-mono text-[10px] bg-purple-800 px-1.5 py-0.2 rounded">
                      {cat.marginPct.toFixed(1)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* QUADRANT 4: UNDERPERFORMERS */}
            <div className="bg-amber-50/60 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-800 pb-2">
                <span className="font-black text-xs text-amber-900 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  ⚠️ Low Velocity / Underperformers
                </span>
                <span className="text-xs font-mono font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                  {categoryData.filter(c => c.quadrant === 'Underperformer').length}
                </span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Low margin & low sales volume. Audit stock holding cost or re-negotiate supplier pricing.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {categoryData.filter(c => c.quadrant === 'Underperformer').map(cat => (
                  <button
                    key={cat.category}
                    onClick={() => setSelectedCategoryDetail(cat)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer"
                  >
                    <span>{cat.category}</span>
                    <span className="font-mono text-[10px] bg-amber-800 px-1.5 py-0.2 rounded">
                      {cat.marginPct.toFixed(1)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* VIEW MODE 3: QUADRANT & RANKING TABLE */}
      {viewMode === 'quadrant' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Category Profitability Ranking & Performance Ledger
            </h3>
            <span className="text-xs text-slate-500 font-semibold">
              Total Categories Analyzed: {categoryData.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3.5 text-center">RANK</th>
                  <th className="py-3 px-3.5">CATEGORY NAME</th>
                  <th className="py-3 px-3.5">PERFORMANCE QUADRANT</th>
                  <th className="py-3 px-3.5 text-right">TOTAL REVENUE</th>
                  <th className="py-3 px-3.5 text-right">GROSS PROFIT</th>
                  <th className="py-3 px-3.5 text-right">MARGIN %</th>
                  <th className="py-3 px-3.5 text-right">UNITS SOLD</th>
                  <th className="py-3 px-3.5 text-right">STOCK VALUATION</th>
                  <th className="py-3 px-3.5">TOP PRODUCT</th>
                  <th className="py-3 px-3.5 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium text-slate-700 dark:text-slate-200">
                {filteredCategoryData.map((cat, idx) => (
                  <tr 
                    key={cat.category}
                    onClick={() => setSelectedCategoryDetail(cat)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-500">
                      #{idx + 1}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-white">
                      {cat.category}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        cat.quadrant === 'Star Performer'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : cat.quadrant === 'Cash Cow'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : cat.quadrant === 'Potential Gem'
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {cat.quadrant}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      Rs {cat.totalRevenue.toLocaleString()}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Rs {cat.grossProfit.toLocaleString()}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <span className={`font-mono font-black px-2 py-0.5 rounded ${
                        cat.marginPct >= 25 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {cat.marginPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-slate-800 dark:text-slate-200">
                      {cat.totalUnitsSold}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-slate-500">
                      Rs {cat.stockValuation.toLocaleString()}
                    </td>
                    <td className="py-3 px-3.5 font-medium text-slate-600 dark:text-slate-300">
                      {cat.topProduct}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedCategoryDetail(cat); }}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAILED CATEGORY DRILLDOWN MODAL */}
      {selectedCategoryDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {selectedCategoryDetail.quadrant}
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  Category: {selectedCategoryDetail.category}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCategoryDetail(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              
              {/* Financial Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Sales Revenue</span>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                    Rs {selectedCategoryDetail.totalRevenue.toLocaleString()}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Cost Price</span>
                  <span className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">
                    Rs {selectedCategoryDetail.totalCost.toLocaleString()}
                  </span>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">Gross Profit</span>
                  <span className="text-base font-black text-emerald-700 dark:text-emerald-300 font-mono">
                    Rs {selectedCategoryDetail.grossProfit.toLocaleString()}
                  </span>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">Profit Margin %</span>
                  <span className="text-base font-black text-emerald-700 dark:text-emerald-300 font-mono">
                    {selectedCategoryDetail.marginPct.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Inventory & Catalogue info */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-purple-600" />
                  Catalogue & Inventory Holdings
                </h4>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <span className="text-slate-400 text-[10px] block">Catalogue Items</span>
                    <strong className="text-sm font-bold text-slate-900 dark:text-white">{selectedCategoryDetail.itemCount} Medicines</strong>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <span className="text-slate-400 text-[10px] block">In-Stock Quantity</span>
                    <strong className="text-sm font-bold text-slate-900 dark:text-white">{selectedCategoryDetail.totalStockQty} Units</strong>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <span className="text-slate-400 text-[10px] block">Stock Valuation</span>
                    <strong className="text-sm font-bold text-slate-900 dark:text-white">Rs {selectedCategoryDetail.stockValuation.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedCategoryDetail(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Close Inspection
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
