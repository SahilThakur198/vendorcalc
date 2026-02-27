import { motion } from 'motion/react';
import { ChevronLeft, Check, ExternalLink } from 'lucide-react';

interface DeveloperViewProps {
    onBack: () => void;
}

export function DeveloperView({ onBack }: DeveloperViewProps) {
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
