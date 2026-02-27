/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Settings, History as HistoryIcon, User, Sun, Moon, Calculator, BarChart3,
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'motion/react';

import { AppProvider, useApp } from './context/AppContext';
import { CalculatorView } from './components/CalculatorView';
import { SettingsView } from './components/SettingsView';
import { HistoryView } from './components/HistoryView';
import { BillView } from './components/BillView';
import { DeveloperView } from './components/DeveloperView';
import { SummaryView } from './components/SummaryView';
import type { HistoryItem, View } from './types';

// ─── Inner App (uses context) ─────────────────────────────────────────────────

function InnerApp() {
  const { darkMode, toggleDarkMode, loading, saveBill } = useApp();
  const [view, setView] = useState<View>('calculator');
  const [activeBill, setActiveBill] = useState<HistoryItem | null>(null);
  const [isBillSaved, setIsBillSaved] = useState(false);

  if (loading) {
    return (
      <div className="min-h-dvh bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
        <div className="animate-pulse text-stone-400 dark:text-stone-600 font-medium">
          Loading VendorCalc...
        </div>
      </div>
    );
  }

  const handleShowBill = (partial: Omit<HistoryItem, 'id' | 'invoice_no' | 'created_at'>) => {
    // Create a preview bill (not saved yet)
    const preview: HistoryItem = {
      ...partial,
      invoice_no: '—',       // will be assigned on save
      created_at: new Date().toISOString(),
    };
    setActiveBill(preview);
    setIsBillSaved(false);
    setView('bill');
  };

  const handleSaveBill = async () => {
    if (!activeBill || isBillSaved) return;
    const { id: _id, invoice_no: _inv, created_at: _ca, ...partial } = activeBill;
    const saved = await saveBill(partial);
    setActiveBill(saved);
    setIsBillSaved(true);
  };

  return (
    <div className="min-h-dvh bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans transition-colors duration-300">

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center justify-between transition-colors duration-300">
        <div
          onClick={() => setView('calculator')}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity min-w-0"
        >
          <div className="w-8 h-8 shrink-0 bg-stone-900 dark:bg-stone-100 rounded-lg flex items-center justify-center overflow-hidden">
            <img src="/app_logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-lg font-bold tracking-tight truncate">VendorCalc</h1>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setView('calculator')}
            className={`p-2 rounded-full transition-colors ${view === 'calculator' ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'}`}
            title="Calculator"
          >
            <Calculator size={18} />
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
            title="Invoice History"
          >
            <HistoryIcon size={18} />
          </button>
          <button
            onClick={() => setView('summary')}
            className={`p-2 rounded-full transition-colors ${view === 'summary' ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'}`}
            title="Sales Summary"
          >
            <BarChart3 size={18} />
          </button>
          <button
            onClick={() => setView('settings')}
            className={`p-2 rounded-full transition-colors ${view === 'settings' ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'}`}
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {view === 'calculator' && (
            <CalculatorView
              key="calc"
              onShowBill={handleShowBill}
              onGoToSettings={() => setView('settings')}
            />
          )}

          {view === 'settings' && (
            <SettingsView
              key="settings"
              onBack={() => setView('calculator')}
            />
          )}

          {view === 'developer' && (
            <DeveloperView
              key="developer"
              onBack={() => setView('calculator')}
            />
          )}

          {view === 'history' && (
            <HistoryView
              key="history"
              onViewBill={(bill) => {
                setActiveBill(bill);
                setIsBillSaved(true);
                setView('bill');
              }}
              onBack={() => setView('calculator')}
            />
          )}

          {view === 'bill' && activeBill && (
            <BillView
              key="bill"
              bill={activeBill}
              isSaved={isBillSaved}
              onSave={handleSaveBill}
              onBack={() => setView('calculator')}
            />
          )}

          {view === 'summary' && (
            <SummaryView
              key="summary"
              onBack={() => setView('calculator')}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Toast notifications */}
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: darkMode ? '#1c1917' : '#fff',
            color: darkMode ? '#e7e5e4' : '#1c1917',
            border: darkMode ? '1px solid #292524' : '1px solid #e7e5e4',
            borderRadius: '1rem',
            fontWeight: '600',
            fontSize: '14px',
          },
          duration: 2500,
        }}
      />
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AppProvider>
      <InnerApp />
    </AppProvider>
  );
}
