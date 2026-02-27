/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Settings,
  History as HistoryIcon,
  Trash2,
  Save,
  ChevronLeft,
  Share2,
  Check,
  X,
  Edit2,
  Calculator,
  Sun,
  Moon,
  Copy,
  Database as DbIcon,
  ExternalLink,
  RefreshCw,
  User,
  ChevronUp,
  ChevronDown,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Product {
  id: number;
  name: string;
  price: number;
}

interface HistoryItem {
  id: number;
  vendor_name: string;
  items: { name: string; price: number; quantity: number; total: number }[];
  grand_total: number;
  created_at: string;
}

type View = 'calculator' | 'settings' | 'history' | 'bill' | 'developer';

// ─── localStorage helpers ────────────────────────────────────────────────────

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>('calculator');
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [vendorName, setVendorName] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scriptUrl, setScriptUrl] = useState('');
  const [activeBill, setActiveBill] = useState<HistoryItem | null>(null);
  const [isBillSaved, setIsBillSaved] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true';
    }
    return false;
  });

  // Handle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // Load data from localStorage on mount
  useEffect(() => {
    const prods = lsGet<Product[]>('products', []);
    const name = lsGet<string>('vendorName', '');
    const url = lsGet<string>('scriptUrl', '');
    const hist = lsGet<HistoryItem[]>('history', []);

    setProducts(prods);
    setVendorName(name);
    setScriptUrl(url);
    setHistory(hist);

    const initialQuants: Record<number, number> = {};
    prods.forEach((p: Product) => (initialQuants[p.id] = 0));
    setQuantities(initialQuants);
    setLoading(false);
  }, []);

  const grandTotal = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.price * (quantities[p.id] || 0)), 0);
  }, [products, quantities]);

  const handleQuantityChange = (id: number, val: number) => {
    setQuantities(prev => ({ ...prev, [id]: Math.max(0, val) }));
  };

  const showBill = () => {
    const items = products
      .filter(p => (quantities[p.id] || 0) > 0)
      .map(p => ({
        name: p.name,
        price: p.price,
        quantity: quantities[p.id],
        total: p.price * quantities[p.id]
      }));

    if (items.length === 0) {
      return;
    }

    if (!vendorName.trim()) {
      alert("Please enter a Vendor Name before generating the bill.");
      return;
    }

    const previewBill: HistoryItem = {
      id: Date.now(), // Generate a temporary ID so it renders properly
      vendor_name: vendorName,
      items,
      grand_total: grandTotal,
      created_at: new Date().toISOString()
    };

    setActiveBill(previewBill);
    setIsBillSaved(false);
    setView('bill');
  };

  const saveActiveBill = async () => {
    if (!activeBill || isBillSaved) return;

    // Use current time as the final timestamp and ID
    const finalBill: HistoryItem = {
      ...activeBill,
      id: Date.now(),
      created_at: new Date().toISOString()
    };

    const updatedHistory = [finalBill, ...history];
    setHistory(updatedHistory);
    lsSet('history', updatedHistory);

    setActiveBill(finalBill);
    setIsBillSaved(true); // Mark as saved in the view

    // Reset quantities
    const resetQuants: Record<number, number> = {};
    products.forEach(p => (resetQuants[p.id] = 0));
    setQuantities(resetQuants);

    // Auto-sync bill to Google Sheets if URL is set
    if (scriptUrl) {
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({
            action: 'add_history',
            payload: {
              id: finalBill.id,
              vendorName: finalBill.vendor_name,
              items: finalBill.items,
              grandTotal: finalBill.grand_total,
              created_at: finalBill.created_at
            }
          }),
        });
      } catch (err) {
        console.warn('Auto-sync to Google Sheets failed:', err);
      }
    }
  };

  const deleteHistoryItem = async (id: number) => {
    // Optimistic delete
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    lsSet('history', updated);

    if (scriptUrl) {
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({
            action: 'delete_history',
            payload: { id }
          })
        });
      } catch (err) {
        console.warn('Failed to delete from Google Sheets:', err);
      }
    }
  };

  const addProduct = (name: string, price: number) => {
    const newProd: Product = { id: Date.now(), name, price };
    const updated = [...products, newProd];
    setProducts(updated);
    lsSet('products', updated);
    setQuantities(prev => ({ ...prev, [newProd.id]: 0 }));
  };

  const updateProduct = (id: number, name: string, price: number) => {
    const updated = products.map(p => (p.id === id ? { ...p, name, price } : p));
    setProducts(updated);
    lsSet('products', updated);
  };

  const deleteProduct = (id: number) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    lsSet('products', updated);
  };

  const saveSettings = (newName: string, newUrl: string) => {
    setVendorName(newName);
    setScriptUrl(newUrl);
    lsSet('vendorName', newName);
    lsSet('scriptUrl', newUrl);
    alert('Settings saved successfully!');
  };

  const syncToSheets = async (url: string): Promise<{ success: boolean; error?: string }> => {
    if (!url) return { success: false, error: 'No Script URL provided.' };
    try {
      // Note: if user experiences CORS block here, they may need to turn mode: 'no-cors' on
      // However, no-cors prevents reading the response back. For now, we leave syncToSheets
      // as the only endpoint that actively reads back JSON from Google Apps Script. 
      // Add History and Delete History use no-cors write-and-forget.
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'sync_products',
          payload: { products, vendorName }
        }),
      });
      const result = await resp.json();

      if (result.success) {
        // Handle incoming merged/restored products from cloud
        if (result.products && Array.isArray(result.products)) {
          setProducts(result.products);
          lsSet('products', result.products);

          // Re-init quantities for new products
          const newQuants = { ...quantities };
          result.products.forEach((p: Product) => {
            if (!(p.id in newQuants)) {
              newQuants[p.id] = 0;
            }
          });
          setQuantities(newQuants);
        }

        // Adopt vendor name from cloud if ours is empty or different in a fresh install
        if (result.vendorName && result.vendorName !== 'Unknown Vendor' && result.vendorName !== vendorName) {
          setVendorName(result.vendorName);
          lsSet('vendorName', result.vendorName);
        }

        return { success: true };
      } else {
        return { success: false, error: result.error || 'Unknown sync error' };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-stone-50 dark:bg-stone-950 flex items-center justify-center transition-colors duration-300">
        <div className="animate-pulse text-stone-400 dark:text-stone-600 font-medium">Loading VendorCalc...</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans selection:bg-stone-200 dark:selection:bg-stone-800 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center justify-between transition-colors duration-300">
        <div
          onClick={() => setView('calculator')}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity min-w-0"
        >
          <div className="w-8 h-8 shrink-0 bg-stone-900 dark:bg-stone-100 rounded-lg flex items-center justify-center text-white dark:text-stone-900 transition-colors overflow-hidden">
            <img src="/app_logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-lg font-bold tracking-tight truncate">VendorCalc</h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setView('developer')}
            className={`p-2 rounded-full transition-colors ${view === 'developer' ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'}`}
            title="Developer Info"
          >
            <User size={18} />
          </button>
          <button
            onClick={() => setView('history')}
            className={`p-2 rounded-full transition-colors ${view === 'history' ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'}`}
          >
            <HistoryIcon size={18} />
          </button>
          <button
            onClick={() => setView('settings')}
            className={`p-2 rounded-full transition-colors ${view === 'settings' ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'}`}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto pb-32">
        <AnimatePresence mode="wait">
          {view === 'calculator' && (
            <motion.div
              key="calc"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 space-y-4"
            >
              {products.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="text-stone-400 italic">No products added yet.</div>
                  <button
                    onClick={() => setView('settings')}
                    className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-6 py-2 rounded-full font-medium text-sm"
                  >
                    Add Your First Product
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3 shadow-sm mb-2 transition-colors duration-300">
                    <div className="text-[10px] text-stone-400 dark:text-stone-500 mb-1 font-bold uppercase tracking-widest px-1">Vendor Name (For Invoice)</div>
                    <input
                      type="text"
                      value={vendorName}
                      onChange={(e) => {
                        setVendorName(e.target.value);
                        lsSet('vendorName', e.target.value);
                      }}
                      placeholder="Enter Vendor Name..."
                      className="w-full bg-transparent font-bold text-sm px-1 py-1 focus:outline-none placeholder:font-normal placeholder:text-stone-300 dark:placeholder:text-stone-700"
                    />
                  </div>

                  <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-widest font-bold text-stone-400 px-2 mt-4">
                    <div className="col-span-4">Product</div>
                    <div className="col-span-2 text-center">Price</div>
                    <div className="col-span-3 text-center">Qty</div>
                    <div className="col-span-3 text-right">Total</div>
                  </div>

                  <div className="space-y-2">
                    {products.map(product => (
                      <ProductRow
                        key={product.id}
                        product={product}
                        quantity={quantities[product.id] || 0}
                        onChange={(val) => handleQuantityChange(product.id, val)}
                      />
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {view === 'settings' && (
            <SettingsView
              vendorName={vendorName}
              scriptUrl={scriptUrl}
              products={products}
              onSaveSettings={saveSettings}
              onAddProduct={addProduct}
              onUpdateProduct={updateProduct}
              onDeleteProduct={deleteProduct}
              onBack={() => setView('calculator')}
              onSync={syncToSheets}
            />
          )}

          {view === 'developer' && (
            <DeveloperView onBack={() => setView('calculator')} />
          )}

          {view === 'history' && (
            <HistoryView
              history={history}
              onViewBill={(bill) => {
                setActiveBill(bill);
                setIsBillSaved(true);
                setView('bill');
              }}
              onDeleteBill={deleteHistoryItem}
              onBack={() => setView('calculator')}
            />
          )}

          {view === 'bill' && activeBill && (
            <BillView
              bill={activeBill}
              isSaved={isBillSaved}
              onSave={saveActiveBill}
              onBack={() => setView('calculator')}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Footer / Grand Total Bar */}
      {view === 'calculator' && products.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)] transition-colors duration-300">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest font-bold text-stone-400 dark:text-stone-500 truncate">Grand Total</div>
              <div className="text-xl sm:text-2xl font-black tabular-nums truncate text-stone-900 dark:text-stone-100">Rs. {grandTotal.toLocaleString()}</div>
            </div>
            <button
              onClick={showBill}
              disabled={grandTotal === 0}
              className="shrink-0 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-6 sm:px-8 py-3 rounded-2xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all shadow-lg"
            >
              <Save size={18} />
              <span className="hidden sm:inline">Show Bill</span>
              <span className="sm:hidden">Show</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ProductRow ───────────────────────────────────────────────────────────────

interface ProductRowProps {
  key?: React.Key;
  product: Product;
  quantity: number;
  onChange: (val: number) => void;
}

function ProductRow({ product, quantity, onChange }: ProductRowProps) {
  const total = product.price * quantity;

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3 grid grid-cols-12 gap-2 items-center shadow-sm transition-colors duration-300">
      <div className="col-span-4">
        <div className="font-bold text-sm truncate">{product.name}</div>
      </div>

      <div className="col-span-2 flex flex-col items-center">
        <div className="text-[10px] text-stone-400 dark:text-stone-500 mb-1">Price</div>
        <div className="font-mono text-[11px] sm:text-xs">Rs.{product.price}</div>
      </div>

      <div className="col-span-3 flex flex-col items-center">
        <div className="text-[10px] text-stone-400 dark:text-stone-500 mb-1">Qty</div>
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => onChange(quantity + 1)}
            className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors bg-stone-100 dark:bg-stone-800 rounded-lg shadow-sm active:scale-90"
            aria-label="Increase quantity"
          >
            <ChevronUp size={16} strokeWidth={3} />
          </button>

          <input
            type="number"
            inputMode="numeric"
            value={quantity || ''}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            className="w-12 text-center font-black text-sm bg-transparent focus:outline-none transition-colors border-none p-0 no-spin-buttons"
            placeholder="0"
          />

          <button
            onClick={() => onChange(quantity - 1)}
            className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors bg-stone-100 dark:bg-stone-800 rounded-lg shadow-sm active:scale-90"
            aria-label="Decrease quantity"
          >
            <ChevronDown size={16} strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className="col-span-3 text-right">
        <div className="text-[10px] text-stone-400 dark:text-stone-500 mb-1">Total</div>
        <div className="font-black text-sm tabular-nums">Rs.{total.toLocaleString()}</div>
      </div>
    </div>
  );
}

// ─── SettingsView ─────────────────────────────────────────────────────────────

interface SettingsViewProps {
  vendorName: string;
  scriptUrl: string;
  products: Product[];
  onSaveSettings: (name: string, url: string) => void;
  onAddProduct: (name: string, price: number) => void;
  onUpdateProduct: (id: number, name: string, price: number) => void;
  onDeleteProduct: (id: number) => void;
  onBack: () => void;
  onSync: (url: string) => Promise<{ success: boolean; error?: string }>;
}

function SettingsView({ vendorName, scriptUrl, products, onSaveSettings, onAddProduct, onUpdateProduct, onDeleteProduct, onBack, onSync }: SettingsViewProps) {
  const [name, setName] = useState(vendorName);
  const [url, setUrl] = useState(scriptUrl);
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showSyncSetup, setShowSyncSetup] = useState(!scriptUrl);

  const handleSaveSettings = () => {
    onSaveSettings(name, url);
    if (url) setShowSyncSetup(false);
  };

  const handleSync = async () => {
    if (!url) {
      alert('Please provide a Google Script URL first.');
      return;
    }
    setSyncing(true);
    try {
      const result = await onSync(url);
      if (result.success) {
        alert('Data synced to Google Sheets successfully!');
        setShowSyncSetup(false);
      } else {
        alert('Sync failed: ' + (result.error || 'Unknown error'));
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleAddProduct = () => {
    if (!newProdName.trim()) {
      alert('Please enter a product name.');
      return;
    }
    const price = parseFloat(newProdPrice);
    if (isNaN(price) || price < 0) {
      alert('Please enter a valid price (0 or more).');
      return;
    }
    onAddProduct(newProdName, price);
    setNewProdName('');
    setNewProdPrice('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-4 space-y-8 pb-32"
    >
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-bold">Settings</h2>
      </div>

      {/* Google Sheets Integration */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-stone-400 dark:text-stone-500">Google Sheets Sync</h3>
          {url && !showSyncSetup && (
            <button
              onClick={() => setShowSyncSetup(true)}
              className="text-[10px] font-bold text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 uppercase tracking-wider transition-colors"
            >
              Edit Connection
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm transition-colors duration-300 space-y-4">
          {showSyncSetup ? (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Web App URL</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste your code.gs Web App URL here"
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-2 text-xs focus:outline-none transition-colors"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveSettings}
                  className="flex-1 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Save size={14} />
                  Save URL
                </button>
                <button
                  onClick={handleSync}
                  disabled={syncing || !url}
                  className="flex-1 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 italic">
                Add the provided <b>code.gs</b> to your Google Sheet and paste the deployed Web App URL above to enable cloud sync.
              </p>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <DbIcon size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold">Cloud Sync Active</div>
                  <div className="text-[10px] text-stone-400 dark:text-stone-500 truncate max-w-[200px]">{url}</div>
                </div>
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="w-full sm:w-auto bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Vendor Name */}
      <section className="space-y-3">
        <h3 className="text-[10px] uppercase tracking-widest font-bold text-stone-400 dark:text-stone-500">Vendor Details</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter Vendor Name"
            className="flex-1 min-w-0 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 transition-colors"
          />
          <button
            onClick={handleSaveSettings}
            className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors shrink-0"
          >
            <Save size={16} />
            Save
          </button>
        </div>
      </section>

      {/* Products Management */}
      <section className="space-y-4">
        <h3 className="text-[10px] uppercase tracking-widest font-bold text-stone-400 dark:text-stone-500">Manage Products</h3>

        {/* Add New */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 space-y-3 shadow-sm transition-colors duration-300">
          <div className="text-xs font-bold text-stone-500 dark:text-stone-400">Add New Product</div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={newProdName}
              onChange={(e) => setNewProdName(e.target.value)}
              placeholder="Product Name"
              className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors"
            />
            <input
              type="number"
              inputMode="numeric"
              value={newProdPrice}
              onChange={(e) => setNewProdPrice(e.target.value)}
              placeholder="Price"
              className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors"
            />
          </div>
          <button
            onClick={handleAddProduct}
            className="w-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>

        {/* List */}
        <div className="space-y-2">
          {products.map((p: Product) => (
            <div key={p.id} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3 flex items-center justify-between shadow-sm transition-colors duration-300 overflow-hidden">
              {editingId === p.id ? (
                <div className="flex-1 flex gap-2 mr-2 min-w-0">
                  <input
                    type="text"
                    defaultValue={p.name}
                    id={`edit-name-${p.id}`}
                    className="flex-1 min-w-0 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg px-2 py-1 text-sm transition-colors"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    defaultValue={p.price}
                    id={`edit-price-${p.id}`}
                    className="w-16 sm:w-20 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg px-2 py-1 text-sm transition-colors"
                  />
                  <div className="flex shrink-0">
                    <button
                      onClick={() => {
                        const editedName = (document.getElementById(`edit-name-${p.id}`) as HTMLInputElement).value;
                        const editedPrice = parseFloat((document.getElementById(`edit-price-${p.id}`) as HTMLInputElement).value);
                        onUpdateProduct(p.id, editedName, editedPrice);
                        setEditingId(null);
                      }}
                      className="text-emerald-600 dark:text-emerald-400 p-1"
                    >
                      <Check size={20} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-stone-400 dark:text-stone-500 p-1">
                      <X size={20} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">{p.name}</div>
                    <div className="text-xs text-stone-400 dark:text-stone-500">Rs. {p.price}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingId(p.id)}
                      className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteProduct(p.id)}
                      className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

// ─── HistoryView ──────────────────────────────────────────────────────────────

interface HistoryViewProps {
  history: HistoryItem[];
  onViewBill: (bill: HistoryItem) => void;
  onDeleteBill: (id: number) => void;
  onBack: () => void;
}

const generateBillText = (bill: HistoryItem) => {
  const header = `--- ${bill.vendor_name || 'VENDOR BILL'} ---\n`;
  const date = `Date: ${new Date(bill.created_at).toLocaleString()}\n\n`;
  const itemsHeader = `ITEM            QTY    PRICE    TOTAL\n`;
  const separator = `-------------------------------------\n`;

  const itemsList = bill.items.map(i => {
    const name = i.name.padEnd(15).substring(0, 15);
    const qty = i.quantity.toString().padStart(4);
    const price = i.price.toString().padStart(8);
    const total = i.total.toString().padStart(8);
    return `${name} ${qty} ${price} ${total}`;
  }).join('\n');

  const footer = `\n${separator}GRAND TOTAL: Rs. ${bill.grand_total.toLocaleString()}\n${separator}`;

  return `${header}${date}${itemsHeader}${separator}${itemsList}${footer}`;
};

function DeveloperView({ onBack }: { onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-4 space-y-8 pb-32"
    >
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-bold">Developer</h2>
      </div>

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl transition-colors duration-300 overflow-hidden relative">
        {/* Decorative background elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-stone-900/5 dark:bg-stone-100/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-stone-900/5 dark:bg-stone-100/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-6 sm:space-y-8">
          <div className="relative">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-stone-900 dark:bg-stone-100 flex items-center justify-center text-white dark:text-stone-900 shadow-2xl rotate-3 transition-colors overflow-hidden">
              <img src="/developer_image.jpg" alt="Developer" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg -rotate-12 border-4 border-white dark:border-stone-900">
              <Check size={16} className="sm:size-[20px]" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight">Hi, I'm Sahil</h3>
            <div className="inline-block px-3 py-1 bg-stone-100 dark:bg-stone-800 rounded-full text-[10px] uppercase tracking-widest font-black text-stone-500 dark:text-stone-400">
              Full Stack Developer
            </div>
          </div>

          <p className="text-stone-600 dark:text-stone-300 leading-relaxed text-base sm:text-lg">
            I've crafted <span className="font-bold text-stone-900 dark:text-stone-100">VendorCalc</span> to be the ultimate tool for your business.
            Need a custom app or high-performance website?
          </p>

          <div className="w-full space-y-4 pt-4">
            <a
              href="https://sahilthakur198.github.io/Portfolio/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="group w-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 py-4 sm:py-5 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-3 hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-[0.98]"
            >
              <ExternalLink size={20} />
              Explore My Work
            </a>
          </div>

          <div className="pt-4 flex flex-col items-center gap-2">
            <div className="text-[10px] uppercase tracking-[0.3em] font-black text-stone-300 dark:text-stone-600">
              Crafted with Precision
            </div>
            <div className="flex gap-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-1 h-1 rounded-full bg-stone-200 dark:bg-stone-800" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function HistoryView({ history, onViewBill, onDeleteBill, onBack }: HistoryViewProps) {
  const handleShare = async (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    const text = generateBillText(item);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bill from ${item.vendor_name || 'Vendor'}`,
          text: text,
        });
      } catch (err) {
        console.log('Share failed', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Bill copied to clipboard!');
    }
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    onDeleteBill(id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-4 space-y-6 pb-32"
    >
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-bold">History</h2>
      </div>

      <div className="space-y-3">
        {history.length === 0 ? (
          <div className="text-center py-12 text-stone-400 dark:text-stone-600 italic">No history yet.</div>
        ) : (
          history.map((item: HistoryItem) => (
            <div key={item.id} className="relative group">
              <button
                onClick={() => onViewBill(item)}
                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 text-left shadow-sm hover:border-stone-400 dark:hover:border-stone-600 transition-colors duration-300 pr-20"
              >
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-stone-400 dark:text-stone-500 truncate">
                      {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="font-bold truncate">{item.vendor_name || 'Unnamed Vendor'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-stone-400 dark:text-stone-500">Total</div>
                    <div className="font-black text-sm">Rs.{item.grand_total.toLocaleString()}</div>
                  </div>
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400 truncate">
                  {item.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                </div>
              </button>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={(e) => handleShare(e, item)}
                  className="p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                  title="Quick Share"
                >
                  <Share2 size={18} />
                </button>
                <button
                  onClick={(e) => handleDelete(e, item.id)}
                  className="p-2 text-stone-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title="Delete Invoice"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function BillView({ bill, isSaved, onSave, onBack }: { bill: HistoryItem, isSaved?: boolean, onSave?: () => void, onBack: () => void }) {
  const [copied, setCopied] = useState(false);

  const shareBill = async () => {
    const text = generateBillText(bill);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bill from ${bill.vendor_name || 'Vendor'}`,
          text: text,
        });
      } catch (err) {
        console.log('Share failed', err);
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    const text = generateBillText(bill);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-4 space-y-6 pb-32 relative"
    >
      <div className="flex items-center justify-between gap-2">
        <button onClick={onBack} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors shrink-0">
          <ChevronLeft size={24} />
        </button>
        <div className="flex gap-2 min-w-0">
          <button
            onClick={shareBill}
            className="flex-1 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-3 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 truncate"
          >
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden transition-colors duration-300">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-stone-900 dark:bg-stone-100"></div>

        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black uppercase tracking-tighter truncate px-2">{bill.vendor_name || 'Vendor Bill'}</h2>
          <div className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest">
            {new Date(bill.created_at).toLocaleString()}
          </div>
        </div>

        <div className="border-y border-dashed border-stone-200 dark:border-stone-800 py-4 space-y-3">
          {bill.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{item.name}</div>
                <div className="text-xs text-stone-400 dark:text-stone-500">{item.quantity} x Rs. {item.price}</div>
              </div>
              <div className="font-mono font-bold shrink-0">Rs.{item.total.toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-end pt-2 gap-2">
          <div className="text-sm font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest shrink-0">Grand Total</div>
          <div className="text-2xl sm:text-3xl font-black tabular-nums truncate">Rs.{bill.grand_total.toLocaleString()}</div>
        </div>

        <div className="text-center pt-4">
          <div className="text-[10px] text-stone-300 dark:text-stone-700 font-bold uppercase tracking-[0.2em]">Thank You</div>
        </div>
      </div>

      {/* Conditional Save Button for Previews */}
      {!isSaved && onSave && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] text-center transition-colors duration-300">
          <button
            onClick={onSave}
            className="w-full max-w-md mx-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-black text-lg flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
          >
            <Save size={20} />
            Save Invoice
          </button>
        </div>
      )}
    </motion.div>
  );
}
