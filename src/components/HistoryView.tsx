import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Share2, Trash2, Search, ArrowUpDown, Clock, Receipt } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { HistoryItem } from '../types';

interface HistoryViewProps {
    onViewBill: (bill: HistoryItem) => void;
    onBack: () => void;
}

function generateBillText(bill: HistoryItem): string {
    const header = `=== ${bill.vendor_name || 'VENDOR BILL'} ===\n`;
    const inv = `Invoice: ${bill.invoice_no || 'N/A'}\n`;
    const cust = bill.customer_name ? `Customer: ${bill.customer_name}\n` : '';
    const date = `Date: ${new Date(bill.created_at).toLocaleString()}\n\n`;
    const cols = `ITEM            QTY    PRICE    TOTAL\n`;
    const sep = `--------------------------------------\n`;
    const items = bill.items.map(i => {
        const n = i.name.padEnd(15).substring(0, 15);
        const q = i.quantity.toString().padStart(4);
        const p = i.price.toString().padStart(8);
        const t = i.total.toString().padStart(8);
        return `${n} ${q} ${p} ${t}`;
    }).join('\n');

    let footer = `\n${sep}SUBTOTAL: ₹${bill.grand_total.toLocaleString()}\n`;
    if (bill.discount > 0) {
        footer += `DISCOUNT (${bill.discount}%): -₹${bill.discount_amount.toLocaleString()}\n`;
        footer += `TOTAL: ₹${bill.final_total.toLocaleString()}\n`;
    }
    footer += sep;

    return header + inv + cust + date + cols + sep + items + footer;
}

export function HistoryView({ onViewBill, onBack }: HistoryViewProps) {
    const { history, deleteHistoryItem } = useApp();
    const [search, setSearch] = useState('');
    const [sortMode, setSortMode] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

    // Swipe state
    const touchStartX = useRef<number>(0);
    const [swipedId, setSwipedId] = useState<number | null>(null);

    const handleShare = async (e: React.MouseEvent, item: HistoryItem) => {
        e.stopPropagation();
        const text = generateBillText(item);
        if (navigator.share) {
            await navigator.share({ title: `Bill – ${item.invoice_no}`, text }).catch(() => { });
        } else {
            navigator.clipboard.writeText(text);
        }
    };

    const handleDelete = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        deleteHistoryItem(id);
        setSwipedId(null);
    };

    const cycleSortMode = () => {
        const modes: typeof sortMode[] = ['date-desc', 'date-asc', 'amount-desc', 'amount-asc'];
        const idx = modes.indexOf(sortMode);
        setSortMode(modes[(idx + 1) % modes.length]);
    };

    const sortLabel: Record<typeof sortMode, string> = {
        'date-desc': 'Newest First',
        'date-asc': 'Oldest First',
        'amount-desc': 'Highest Amount',
        'amount-asc': 'Lowest Amount',
    };

    const filtered = history
        .filter(h => {
            const q = search.toLowerCase();
            return !q || h.vendor_name?.toLowerCase().includes(q) || h.customer_name?.toLowerCase().includes(q) || h.invoice_no?.toLowerCase().includes(q);
        })
        .sort((a, b) => {
            if (sortMode === 'date-desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (sortMode === 'date-asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            if (sortMode === 'amount-desc') return b.final_total - a.final_total;
            return a.final_total - b.final_total;
        });

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4 space-y-4 pb-32"
        >
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <h2 className="text-xl font-bold flex-1">History</h2>
                <button
                    onClick={cycleSortMode}
                    className="flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 py-1 px-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    title="Change sort order"
                >
                    <ArrowUpDown size={14} />
                    <span className="hidden sm:inline">{sortLabel[sortMode]}</span>
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by customer, vendor, or invoice..."
                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 transition-colors"
                />
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center space-y-4 py-16">
                    <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 rounded-3xl flex items-center justify-center">
                        <Clock size={32} className="text-stone-300 dark:text-stone-600" />
                    </div>
                    <div>
                        <div className="font-black text-stone-700 dark:text-stone-200">
                            {search ? 'No results found' : 'No invoices yet'}
                        </div>
                        <div className="text-sm text-stone-400 dark:text-stone-500 mt-1">
                            {search ? 'Try a different search term' : 'Your saved invoices will appear here'}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((item) => (
                        <div
                            key={item.id}
                            className="relative overflow-hidden rounded-2xl"
                            onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
                            onTouchEnd={e => {
                                const dx = touchStartX.current - e.changedTouches[0].clientX;
                                if (dx > 70) setSwipedId(item.id!);
                                else if (dx < -30) setSwipedId(null);
                            }}
                        >
                            <button
                                onClick={() => onViewBill(item)}
                                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 text-left shadow-sm hover:border-stone-400 dark:hover:border-stone-600 transition-all pr-20"
                                style={{ transform: swipedId === item.id ? 'translateX(-70px)' : 'translateX(0)', transition: 'transform 0.2s ease' }}
                            >
                                <div className="flex justify-between items-start mb-1 gap-2">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <Receipt size={11} className="text-stone-300 dark:text-stone-600 shrink-0" />
                                            <div className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">{item.invoice_no}</div>
                                        </div>
                                        <div className="font-bold truncate">{item.customer_name || item.vendor_name || 'Unnamed'}</div>
                                        {item.customer_name && (
                                            <div className="text-xs text-stone-400 dark:text-stone-500 truncate">{item.vendor_name}</div>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-[10px] uppercase tracking-widest font-bold text-stone-400 dark:text-stone-500">
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </div>
                                        <div className="font-black text-sm">₹{item.final_total.toLocaleString()}</div>
                                    </div>
                                </div>
                                <div className="text-xs text-stone-500 dark:text-stone-400 truncate">
                                    {item.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}
                                </div>
                            </button>

                            {/* Action buttons (always visible on right) */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1"
                                style={{ transform: swipedId === item.id ? 'translateX(-70px)' : 'translateX(0)', transition: 'transform 0.2s ease' }}
                            >
                                <button onClick={e => handleShare(e, item)} className="p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors" title="Share">
                                    <Share2 size={18} />
                                </button>
                                <button onClick={e => handleDelete(e, item.id!)} className="p-2 text-stone-400 hover:text-red-500 transition-colors" title="Delete">
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            {/* Swipe-reveal delete button */}
                            {swipedId === item.id && (
                                <button
                                    onClick={e => handleDelete(e, item.id!)}
                                    className="absolute right-0 top-0 bottom-0 w-16 bg-red-500 rounded-r-2xl flex items-center justify-center text-white font-bold text-xs"
                                >
                                    <Trash2 size={20} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}

export { generateBillText };
