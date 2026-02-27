import { useState } from 'react';
import { motion } from 'motion/react';
import {
    ChevronLeft, Save, Plus, Edit2, Trash2, Check, X,
    LogIn, LogOut, Cloud, CloudOff,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isFirebaseConfigured } from '../lib/firebase';

interface SettingsViewProps {
    onBack: () => void;
}

export function SettingsView({ onBack }: SettingsViewProps) {
    const {
        vendorName, products,
        saveVendorName, addProduct, updateProduct, deleteProduct,
        user, signInWithGoogle, signOutUser, isSyncing,
    } = useApp();

    const [name, setName] = useState(vendorName);
    const [newProdName, setNewProdName] = useState('');
    const [newProdPrice, setNewProdPrice] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);

    const handleSave = () => saveVendorName(name);

    const handleAdd = async () => {
        if (!newProdName.trim()) return;
        const price = parseFloat(newProdPrice);
        if (isNaN(price) || price < 0) return;
        await addProduct(newProdName.trim(), price, 'General');
        setNewProdName('');
        setNewProdPrice('');
    };

    const handleUpdate = async (id: number) => {
        const nameEl = document.getElementById(`edit-name-${id}`) as HTMLInputElement;
        const priceEl = document.getElementById(`edit-price-${id}`) as HTMLInputElement;
        if (!nameEl || !priceEl) return;
        await updateProduct(id, nameEl.value, parseFloat(priceEl.value), 'General');
        setEditingId(null);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4 space-y-8 pb-32"
        >
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <h2 className="text-xl font-bold">Settings</h2>
            </div>

            {/* Vendor / Business Name */}
            <section className="space-y-3">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-stone-400 dark:text-stone-500">Vendor Name (shown on invoices)</h3>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your business name"
                        className="flex-1 min-w-0 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10"
                    />
                    <button
                        onClick={handleSave}
                        className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 shrink-0"
                    >
                        <Save size={16} /> Save
                    </button>
                </div>
            </section>

            {/* Google Sign-In for backup */}
            <section className="space-y-3">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-stone-400 dark:text-stone-500">Account</h3>
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 space-y-3 shadow-sm">
                    {!isFirebaseConfigured ? (
                        <div className="flex items-center gap-3">
                            <CloudOff size={18} className="text-stone-300 dark:text-stone-600 shrink-0" />
                            <div>
                                <div className="text-sm font-bold text-stone-500">Backup not available</div>
                                <div className="text-xs text-stone-400">Firebase not configured</div>
                            </div>
                        </div>
                    ) : user ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <img src={user.photoURL || ''} alt="" className="w-9 h-9 rounded-full border-2 border-stone-200 dark:border-stone-700" />
                                <div className="min-w-0">
                                    <div className="text-sm font-bold truncate">{user.displayName}</div>
                                    <div className="text-xs text-stone-400 truncate flex items-center gap-1">
                                        <Cloud size={10} className={isSyncing ? 'animate-pulse text-blue-400' : 'text-emerald-400'} />
                                        {isSyncing ? 'Syncing...' : 'Data backed up ✓'}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={signOutUser}
                                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                            >
                                <LogOut size={14} /> Sign Out
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="text-xs text-stone-400 dark:text-stone-500">Sign in to backup your data to the cloud. Your bills and products will be safe even if you uninstall the app.</div>
                            <button
                                onClick={signInWithGoogle}
                                className="w-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors active:scale-95"
                            >
                                <LogIn size={16} /> Sign in with Google
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Products */}
            <section className="space-y-4">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-stone-400 dark:text-stone-500">Manage Products</h3>

                {/* Add new */}
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 space-y-3 shadow-sm">
                    <div className="text-xs font-bold text-stone-500 dark:text-stone-400">Add New Product</div>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="text"
                            value={newProdName}
                            onChange={(e) => setNewProdName(e.target.value)}
                            placeholder="Product Name"
                            className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-sm focus:outline-none"
                        />
                        <input
                            type="number"
                            inputMode="numeric"
                            value={newProdPrice}
                            onChange={(e) => setNewProdPrice(e.target.value)}
                            placeholder="Price ₹"
                            className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-sm focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        className="w-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> Add Product
                    </button>
                </div>

                {/* Product list */}
                {products.length === 0 ? (
                    <div className="text-center py-8 text-stone-400 dark:text-stone-600 text-sm italic">No products yet. Add one above.</div>
                ) : (
                    <div className="space-y-2">
                        {products.map((p) => (
                            <div key={p.id} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3 flex items-center justify-between shadow-sm">
                                {editingId === p.id ? (
                                    <div className="flex-1 flex gap-2 mr-2 min-w-0">
                                        <input type="text" defaultValue={p.name} id={`edit-name-${p.id}`} className="flex-1 min-w-0 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 text-sm" />
                                        <input type="number" inputMode="numeric" defaultValue={p.price} id={`edit-price-${p.id}`} className="w-20 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 text-sm" />
                                        <div className="flex gap-1 shrink-0">
                                            <button onClick={() => handleUpdate(p.id!)} className="text-emerald-600 dark:text-emerald-400 p-1"><Check size={20} /></button>
                                            <button onClick={() => setEditingId(null)} className="text-stone-400 p-1"><X size={20} /></button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="min-w-0">
                                            <div className="font-bold text-sm truncate">{p.name}</div>
                                            <div className="text-xs text-stone-400 dark:text-stone-500">₹{p.price}</div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button onClick={() => setEditingId(p.id!)} className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"><Edit2 size={16} /></button>
                                            <button onClick={() => deleteProduct(p.id!)} className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </motion.div>
    );
}
