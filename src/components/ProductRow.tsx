import { useRef, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { Product } from '../types';

function haptic() { try { navigator?.vibrate?.(8); } catch { } }

interface ProductRowProps {
    product: Product;
    quantity: number;
    onChange: (val: number) => void;
}

export function ProductRow({ product, quantity, onChange }: ProductRowProps) {
    const total = product.price * quantity;
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const startHold = useCallback((delta: number) => {
        timeoutRef.current = setTimeout(() => {
            intervalRef.current = setInterval(() => {
                haptic();
                onChange(Math.max(0, quantity + delta));
            }, 80);
        }, 400);
    }, [quantity, onChange]);

    const stopHold = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
    }, []);

    const handleClick = (delta: number) => {
        haptic();
        onChange(Math.max(0, quantity + delta));
    };

    return (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-3 grid grid-cols-12 gap-2 items-center shadow-sm transition-colors duration-300">
            <div className="col-span-4">
                <div className="font-bold text-sm truncate">{product.name}</div>
            </div>

            <div className="col-span-2 flex flex-col items-center">
                <div className="text-[10px] text-stone-400 dark:text-stone-500 mb-1">Price</div>
                <div className="font-mono text-[11px] sm:text-xs">₹{product.price}</div>
            </div>

            <div className="col-span-3 flex flex-col items-center">
                <div className="text-[10px] text-stone-400 dark:text-stone-500 mb-1">Qty</div>
                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={() => handleClick(1)}
                        onPointerDown={() => startHold(1)}
                        onPointerUp={stopHold}
                        onPointerLeave={stopHold}
                        className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors bg-stone-100 dark:bg-stone-800 rounded-lg shadow-sm active:scale-90 select-none"
                        aria-label="Increase quantity"
                    >
                        <ChevronUp size={16} strokeWidth={3} />
                    </button>

                    <input
                        type="number"
                        inputMode="numeric"
                        value={quantity || ''}
                        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-12 text-center font-black text-sm bg-transparent focus:outline-none border-none p-0 no-spin-buttons"
                        placeholder="0"
                    />

                    <button
                        onClick={() => handleClick(-1)}
                        onPointerDown={() => startHold(-1)}
                        onPointerUp={stopHold}
                        onPointerLeave={stopHold}
                        className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors bg-stone-100 dark:bg-stone-800 rounded-lg shadow-sm active:scale-90 select-none"
                        aria-label="Decrease quantity"
                    >
                        <ChevronDown size={16} strokeWidth={3} />
                    </button>
                </div>
            </div>

            <div className="col-span-3 text-right">
                <div className="text-[10px] text-stone-400 dark:text-stone-500 mb-1">Total</div>
                <div className="font-black text-sm tabular-nums">₹{total.toLocaleString()}</div>
            </div>
        </div>
    );
}
