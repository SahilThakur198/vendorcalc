import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, TrendingUp, Package, Calendar, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SummaryViewProps {
    onBack: () => void;
}

type Period = 'today' | 'week' | 'month';

interface ItemSummary {
    name: string;
    totalQty: number;
    totalRevenue: number;
    timesAppeared: number; // how many invoices contained this item
}

export function SummaryView({ onBack }: SummaryViewProps) {
    const { history } = useApp();
    const [period, setPeriod] = useState<Period>('today');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday start
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const cutoff: Record<Period, Date> = {
        today: startOfToday,
        week: startOfWeek,
        month: startOfMonth,
    };

    const filteredHistory = useMemo(() =>
        history.filter(h => new Date(h.created_at) >= cutoff[period]),
        [history, period]
    );

    const totalRevenue = useMemo(() =>
        filteredHistory.reduce((sum, h) => sum + h.grand_total, 0),
        [filteredHistory]
    );

    const totalInvoices = filteredHistory.length;

    // Build item-level summary
    const itemSummaries: ItemSummary[] = useMemo(() => {
        const map: Record<string, ItemSummary> = {};
        for (const bill of filteredHistory) {
            for (const item of bill.items) {
                if (!map[item.name]) {
                    map[item.name] = { name: item.name, totalQty: 0, totalRevenue: 0, timesAppeared: 0 };
                }
                map[item.name].totalQty += item.quantity;
                map[item.name].totalRevenue += item.total;
                map[item.name].timesAppeared += 1;
            }
        }
        return Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue);
    }, [filteredHistory]);

    const maxRevenue = itemSummaries[0]?.totalRevenue || 1;

    const periodLabels: Record<Period, string> = {
        today: 'Today',
        week: 'This Week',
        month: 'This Month',
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4 space-y-5 pb-32"
        >
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <h2 className="text-xl font-bold flex-1">Sales Summary</h2>
            </div>

            {/* Period Tabs */}
            <div className="grid grid-cols-3 gap-2">
                {(['today', 'week', 'month'] as Period[]).map(p => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${period === p
                                ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-lg'
                                : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-500'
                            }`}
                    >
                        {periodLabels[p]}
                    </button>
                ))}
            </div>

            {/* Revenue Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={14} className="text-emerald-500" />
                        <div className="text-[9px] uppercase tracking-widest font-black text-stone-400 dark:text-stone-500">Revenue</div>
                    </div>
                    <div className="text-2xl font-black tabular-nums">₹{totalRevenue.toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar size={14} className="text-blue-500" />
                        <div className="text-[9px] uppercase tracking-widest font-black text-stone-400 dark:text-stone-500">Invoices</div>
                    </div>
                    <div className="text-2xl font-black tabular-nums">{totalInvoices}</div>
                </div>
            </div>

            {/* Item Breakdown */}
            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <Package size={14} className="text-stone-400" />
                    <h3 className="text-[10px] uppercase tracking-widest font-black text-stone-400 dark:text-stone-500">
                        Item-wise Breakdown · {periodLabels[period]}
                    </h3>
                </div>

                {itemSummaries.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-stone-300 dark:text-stone-600 mb-2">
                            <TrendingUp size={40} className="mx-auto opacity-40" />
                        </div>
                        <div className="font-bold text-stone-400 dark:text-stone-500">No sales {period === 'today' ? 'today' : period === 'week' ? 'this week' : 'this month'}</div>
                        <div className="text-xs text-stone-300 dark:text-stone-600 mt-1">Generate some bills to see your stats here</div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {itemSummaries.map((item, idx) => (
                            <div
                                key={item.name}
                                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm relative overflow-hidden"
                            >
                                {/* Background progress bar */}
                                <div
                                    className="absolute inset-y-0 left-0 bg-emerald-50 dark:bg-emerald-950/30 transition-all duration-500"
                                    style={{ width: `${(item.totalRevenue / maxRevenue) * 100}%` }}
                                />

                                <div className="relative flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black text-stone-300 dark:text-stone-600 tabular-nums w-5">#{idx + 1}</span>
                                            <span className="font-bold text-sm truncate">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-stone-400 dark:text-stone-500 ml-7">
                                            <span>{item.totalQty} units sold</span>
                                            <span>·</span>
                                            <span>In {item.timesAppeared} {item.timesAppeared === 1 ? 'bill' : 'bills'}</span>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="font-black tabular-nums text-sm">₹{item.totalRevenue.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </motion.div>
    );
}
