import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, RotateCcw, Package, Tag } from 'lucide-react';
import { ProductRow } from './ProductRow';
import { useApp } from '../context/AppContext';
import type { HistoryItem } from '../types';

interface CalculatorViewProps {
    onShowBill: (bill: Omit<HistoryItem, 'id' | 'invoice_no' | 'created_at'>) => void;
    onGoToSettings: () => void;
}

export function CalculatorView({ onShowBill, onGoToSettings }: CalculatorViewProps) {
    const { products, vendorName } = useApp();
    const [quantities, setQuantities] = useState<Record<number, number>>({});
    const [customerName, setCustomerName] = useState('');

    const handleQtyChange = (id: number, val: number) => {
        setQuantities(prev => ({ ...prev, [id]: Math.max(0, val) }));
    };

    const resetAll = () => {
        setQuantities({});
    };

    const grandTotal = useMemo(() =>
        products.reduce((sum, p) => sum + (p.price * (quantities[p.id!] || 0)), 0),
        [products, quantities]
    );

    const handleShowBill = () => {
        const items = products
            .filter(p => (quantities[p.id!] || 0) > 0)
            .map(p => ({
                name: p.name, price: p.price,
                quantity: quantities[p.id!],
                total: p.price * quantities[p.id!],
            }));

        if (items.length === 0) return;

        if (!vendorName.trim()) {
            onGoToSettings();
            return;
        }

        onShowBill({
            vendor_name: vendorName,
            customer_name: customerName,
            items,
            grand_total: grandTotal,
            discount: 0,
            discount_amount: 0,
            final_total: grandTotal,
        });
    };

    if (products.length === 0) {
        return (
            <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-8 flex flex-col items-center justify-center text-center space-y-6 min-h-[60vh]"
            >
                <div className="relative">
                    <div className="w-24 h-24 bg-stone-100 dark:bg-stone-800 rounded-3xl flex items-center justify-center">
                        <Package size={40} className="text-stone-300 dark:text-stone-600" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-stone-900 dark:bg-stone-100 rounded-xl flex items-center justify-center">
                        <Tag size={14} className="text-white dark:text-stone-900" />
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-black text-stone-900 dark:text-stone-100">No Products Yet</h3>
                    <p className="text-stone-400 dark:text-stone-500 text-sm mt-1">Add your first product to start generating bills</p>
                </div>
                <button
                    onClick={onGoToSettings}
                    className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-8 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 active:scale-95 transition-all shadow-lg"
                >
                    Add Your First Product
                </button>
            </motion.div>
        );
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key="calculator"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 space-y-4 pb-48"
            >
                {/* Customer Name */}
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3 shadow-sm">
                    <div className="text-[10px] text-stone-400 dark:text-stone-500 mb-1 font-bold uppercase tracking-widest px-1">Customer Name</div>
                    <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter customer name..."
                        className="w-full bg-transparent font-bold text-sm px-1 py-1 focus:outline-none placeholder:font-normal placeholder:text-stone-300 dark:placeholder:text-stone-700"
                    />
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-widest font-bold text-stone-400 px-2">
                    <div className="col-span-4">Product</div>
                    <div className="col-span-2 text-center">Price</div>
                    <div className="col-span-3 text-center">Qty</div>
                    <div className="col-span-3 text-right">Total</div>
                </div>

                {/* Products list */}
                <div className="space-y-2">
                    {products.map(product => (
                        <ProductRow
                            key={product.id}
                            product={product}
                            quantity={quantities[product.id!] || 0}
                            onChange={(val) => handleQtyChange(product.id!, val)}
                        />
                    ))}
                </div>
            </motion.div>

            {/* Footer bar */}
            {grandTotal > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)] transition-colors duration-300">
                    <div className="max-w-md mx-auto">
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <div className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Grand Total</div>
                                <div className="text-xl sm:text-2xl font-black tabular-nums">
                                    ₹{grandTotal.toLocaleString()}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={resetAll}
                                    className="p-3 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 active:scale-95 transition-all"
                                    title="Reset all quantities"
                                >
                                    <RotateCcw size={18} />
                                </button>
                                <button
                                    onClick={handleShowBill}
                                    className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-6 sm:px-8 py-3 rounded-2xl font-bold flex items-center gap-2 active:scale-95 transition-all shadow-lg"
                                >
                                    <Save size={18} />
                                    <span className="hidden sm:inline">Show Bill</span>
                                    <span className="sm:hidden">Show</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}
