import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Save, Share2, Receipt } from 'lucide-react';
import type { HistoryItem } from '../types';

function haptic(ms = 10) { try { navigator?.vibrate?.(ms); } catch { } }

interface BillViewProps {
    bill: HistoryItem;
    isSaved?: boolean;
    onSave?: () => void;
    onBack: () => void;
}

export function BillView({ bill, isSaved, onSave, onBack }: BillViewProps) {
    const [sharing, setSharing] = useState(false);
    const billRef = useRef<HTMLDivElement>(null);

    /** Generate PDF and share via any chat app (WhatsApp, Telegram, etc.) */
    const sharePdf = async () => {
        if (!billRef.current) return;
        haptic(15);
        setSharing(true);
        try {
            const { default: html2canvas } = await import('html2canvas');
            const { default: jsPDF } = await import('jspdf');
            const canvas = await html2canvas(billRef.current, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const w = pdf.internal.pageSize.getWidth();
            const h = (canvas.height * w) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, w, h);

            const blob = pdf.output('blob');
            const file = new File([blob], `${bill.invoice_no || 'invoice'}.pdf`, { type: 'application/pdf' });

            // Use native share sheet (WhatsApp, Telegram, etc.)
            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file], title: `Invoice ${bill.invoice_no}` });
            } else {
                // Fallback: direct download
                pdf.save(`${bill.invoice_no || 'invoice'}.pdf`);
            }
        } catch (err: any) {
            if (err?.name !== 'AbortError') console.error('Share failed:', err);
        } finally {
            setSharing(false);
        }
    };

    const handleSave = () => { haptic(15); onSave?.(); };

    return (
        <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="p-4 pb-32 space-y-4"
        >
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <h2 className="text-xl font-bold flex-1">Invoice</h2>
            </div>

            {/* Bill Card — receipt printer animation */}
            <motion.div
                ref={billRef}
                initial={{ opacity: 0, scaleY: 0.3, originY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-xl overflow-hidden"
            >
                {/* Invoice header */}
                <div className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.3em] font-black opacity-60 mb-1">Invoice</div>
                            <div className="text-2xl font-black">{bill.invoice_no || 'BILL'}</div>
                        </div>
                        <Receipt size={28} className="opacity-30 shrink-0 mt-1" />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                            <div className="text-[9px] uppercase tracking-widest opacity-50 mb-0.5">From</div>
                            <div className="font-bold text-sm">{bill.vendor_name || '—'}</div>
                        </div>
                        {bill.customer_name && (
                            <div>
                                <div className="text-[9px] uppercase tracking-widest opacity-50 mb-0.5">To</div>
                                <div className="font-bold text-sm">{bill.customer_name}</div>
                            </div>
                        )}
                    </div>
                    <div className="mt-2 text-[10px] opacity-50">
                        {new Date(bill.created_at).toLocaleString()}
                    </div>
                </div>

                {/* Items */}
                <div className="px-5 py-4">
                    <div className="grid grid-cols-12 text-[9px] uppercase tracking-widest font-black text-stone-400 dark:text-stone-600 mb-3">
                        <div className="col-span-5">Item</div>
                        <div className="col-span-2 text-center">Qty</div>
                        <div className="col-span-2 text-right">Price</div>
                        <div className="col-span-3 text-right">Total</div>
                    </div>

                    <div className="space-y-2.5">
                        {bill.items.map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.05 }}
                                className="grid grid-cols-12 items-center text-sm"
                            >
                                <div className="col-span-5 font-semibold truncate pr-2">{item.name}</div>
                                <div className="col-span-2 text-center text-stone-500 dark:text-stone-400">{item.quantity}</div>
                                <div className="col-span-2 text-right text-stone-500 dark:text-stone-400 font-mono text-xs">₹{item.price}</div>
                                <div className="col-span-3 text-right font-black tabular-nums">₹{item.total.toLocaleString()}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Total */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-700"
                    >
                        <div className="flex justify-between items-center">
                            <span className="font-black uppercase tracking-wide text-sm">Total</span>
                            <span className="text-2xl font-black tabular-nums">₹{bill.grand_total.toLocaleString()}</span>
                        </div>
                    </motion.div>
                </div>
            </motion.div>

            {/* ── Two action buttons only ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-2 gap-3"
            >
                {/* Share PDF */}
                <button
                    onClick={sharePdf}
                    disabled={sharing}
                    className="bg-[#25D366] text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg disabled:opacity-60"
                >
                    <Share2 size={20} />
                    {sharing ? 'Preparing...' : 'Share PDF'}
                </button>

                {/* Save */}
                {!isSaved && onSave ? (
                    <button
                        onClick={handleSave}
                        className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
                    >
                        <Save size={20} /> Save
                    </button>
                ) : (
                    <div className="bg-stone-100 dark:bg-stone-800 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                        ✓ Saved
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
