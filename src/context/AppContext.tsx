import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import toast from 'react-hot-toast';
import {
    collection, doc, setDoc, deleteDoc, getDocs, writeBatch,
} from 'firebase/firestore';
import {
    GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged,
    type User,
} from 'firebase/auth';
import { db as dexieDb, migrateFromLocalStorage, getNextInvoiceNo } from '../lib/db';
import { firestore, auth, isFirebaseConfigured } from '../lib/firebase';
import type { Product, HistoryItem } from '../types';

// ─── Context Shape ────────────────────────────────────────────────────────────

interface AppContextType {
    products: Product[];
    history: HistoryItem[];
    vendorName: string;
    darkMode: boolean;
    loading: boolean;
    user: User | null;
    isSyncing: boolean;
    // Products
    addProduct: (name: string, price: number, category: string) => Promise<void>;
    updateProduct: (id: number, name: string, price: number, category: string) => Promise<void>;
    deleteProduct: (id: number) => Promise<void>;
    // History
    saveBill: (bill: Omit<HistoryItem, 'id' | 'invoice_no' | 'created_at'>) => Promise<HistoryItem>;
    deleteHistoryItem: (id: number) => Promise<void>;
    // Settings
    saveVendorName: (name: string) => Promise<void>;
    toggleDarkMode: () => void;
    // Auth
    signInWithGoogle: () => Promise<void>;
    signOutUser: () => Promise<void>;
    // Data
    exportJSON: () => void;
    importJSON: (file: File) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}

// ─── Firebase Helpers ─────────────────────────────────────────────────────────

async function pushProductToFirestore(uid: string, product: Product) {
    if (!isFirebaseConfigured || !firestore) return;
    await setDoc(
        doc(firestore, 'users', uid, 'products', String(product.id)),
        product
    );
}

async function pushHistoryToFirestore(uid: string, item: HistoryItem) {
    if (!isFirebaseConfigured || !firestore) return;
    await setDoc(
        doc(firestore, 'users', uid, 'history', String(item.id)),
        item
    );
}

async function deleteProductFromFirestore(uid: string, id: number) {
    if (!isFirebaseConfigured || !firestore) return;
    await deleteDoc(doc(firestore, 'users', uid, 'products', String(id)));
}

async function deleteHistoryFromFirestore(uid: string, id: number) {
    if (!isFirebaseConfigured || !firestore) return;
    await deleteDoc(doc(firestore, 'users', uid, 'history', String(id)));
}

async function syncFromFirestore(uid: string) {
    if (!isFirebaseConfigured || !firestore) return;

    // Load products
    const prodSnap = await getDocs(collection(firestore, 'users', uid, 'products'));
    const histSnap = await getDocs(collection(firestore, 'users', uid, 'history'));

    const batch = writeBatch(firestore);
    void batch; // unused but avoids lint warnings

    // Merge: cloud items that don't exist locally → insert
    for (const d of prodSnap.docs) {
        const remote = d.data() as Product;
        if (remote.id === undefined) continue;
        const local = await dexieDb.products.get(remote.id);
        if (!local) {
            await dexieDb.products.put(remote);
        }
    }

    for (const d of histSnap.docs) {
        const remote = d.data() as HistoryItem;
        if (remote.id === undefined) continue;
        const local = await dexieDb.history.get(remote.id);
        if (!local) {
            await dexieDb.history.put(remote);
        }
    }
}

async function pushAllToFirestore(uid: string) {
    if (!isFirebaseConfigured || !firestore) return;
    const products = await dexieDb.products.toArray();
    const history = await dexieDb.history.orderBy('created_at').reverse().toArray();

    for (const p of products) {
        if (p.id !== undefined) await pushProductToFirestore(uid, p);
    }
    for (const h of history) {
        if (h.id !== undefined) await pushHistoryToFirestore(uid, h);
    }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [vendorName, setVendorName] = useState('');
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // Live queries from Dexie
    const products = useLiveQuery(() => dexieDb.products.toArray(), []) ?? [];
    const history = useLiveQuery(
        () => dexieDb.history.orderBy('created_at').reverse().toArray(),
        []
    ) ?? [];

    // Dark mode
    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('darkMode', String(darkMode));
    }, [darkMode]);

    // Init: migrate + load settings
    useEffect(() => {
        (async () => {
            await migrateFromLocalStorage();
            const row = await dexieDb.settings.get('vendorName');
            if (row) setVendorName(row.value);
            setLoading(false);
        })();
    }, []);

    // Firebase Auth listener
    useEffect(() => {
        if (!isFirebaseConfigured || !auth) return;
        const unsub = onAuthStateChanged(auth, async (fbUser) => {
            setUser(fbUser);
            if (fbUser) {
                setIsSyncing(true);
                try {
                    await syncFromFirestore(fbUser.uid);
                    toast.success('Data synced from cloud ☁️');
                } catch {
                    toast.error('Cloud sync failed');
                } finally {
                    setIsSyncing(false);
                }
            }
        });
        return unsub;
    }, []);

    // ─── Products ──────────────────────────────────────────────────────────────

    const addProduct = useCallback(async (name: string, price: number, category: string) => {
        const id = await dexieDb.products.add({ name, price, category });
        const prod = { id: id as number, name, price, category };
        if (user) await pushProductToFirestore(user.uid, prod).catch(console.error);
        toast.success('Product added');
    }, [user]);

    const updateProduct = useCallback(async (id: number, name: string, price: number, category: string) => {
        await dexieDb.products.update(id, { name, price, category });
        if (user) await pushProductToFirestore(user.uid, { id, name, price, category }).catch(console.error);
        toast.success('Product updated');
    }, [user]);

    const deleteProduct = useCallback(async (id: number) => {
        await dexieDb.products.delete(id);
        if (user) await deleteProductFromFirestore(user.uid, id).catch(console.error);
        toast.success('Product deleted');
    }, [user]);

    // ─── History ───────────────────────────────────────────────────────────────

    const saveBill = useCallback(async (
        partialBill: Omit<HistoryItem, 'id' | 'invoice_no' | 'created_at'>
    ): Promise<HistoryItem> => {
        const invoice_no = await getNextInvoiceNo();
        const bill: Omit<HistoryItem, 'id'> = {
            ...partialBill,
            invoice_no,
            created_at: new Date().toISOString(),
        };
        const id = await dexieDb.history.add(bill);
        const saved = { ...bill, id: id as number };
        if (user) await pushHistoryToFirestore(user.uid, saved).catch(console.error);
        toast.success(`Invoice ${invoice_no} saved!`);
        return saved;
    }, [user]);

    const deleteHistoryItem = useCallback(async (id: number) => {
        await dexieDb.history.delete(id);
        if (user) await deleteHistoryFromFirestore(user.uid, id).catch(console.error);
        toast.success('Invoice deleted');
    }, [user]);

    // ─── Settings ─────────────────────────────────────────────────────────────

    const saveVendorName = useCallback(async (name: string) => {
        setVendorName(name);
        await dexieDb.settings.put({ key: 'vendorName', value: name });
        toast.success('Settings saved');
    }, []);

    const toggleDarkMode = useCallback(() => setDarkMode(d => !d), []);

    // ─── Auth ─────────────────────────────────────────────────────────────────

    const signInWithGoogle = useCallback(async () => {
        if (!isFirebaseConfigured || !auth) {
            toast.error('Firebase not configured yet.\nAdd your Firebase config in src/lib/firebase.ts');
            return;
        }
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            setIsSyncing(true);
            await pushAllToFirestore(result.user.uid);
            await syncFromFirestore(result.user.uid);
            toast.success(`Signed in as ${result.user.displayName} ✨`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Sign-in failed';
            toast.error(msg);
        } finally {
            setIsSyncing(false);
        }
    }, []);

    const signOutUser = useCallback(async () => {
        if (!auth) return;
        await fbSignOut(auth);
        setUser(null);
        toast('Signed out');
    }, []);

    // ─── Data Export / Import ─────────────────────────────────────────────────

    const exportJSON = useCallback(() => {
        const data = { products, history, exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vendorcalc-backup-${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Backup exported!');
    }, [products, history]);

    const importJSON = useCallback(async (file: File) => {
        try {
            const text = await file.text();
            const data = JSON.parse(text) as { products: Product[]; history: HistoryItem[] };
            if (!Array.isArray(data.products) || !Array.isArray(data.history)) {
                throw new Error('Invalid backup file format');
            }
            // Clear existing and reimport
            await dexieDb.products.clear();
            await dexieDb.history.clear();
            for (const p of data.products) await dexieDb.products.add({ name: p.name, price: p.price, category: p.category || 'General' });
            for (const h of data.history) {
                const { id: _id, ...rest } = h;
                await dexieDb.history.add(rest);
            }
            toast.success(`Restored ${data.products.length} products & ${data.history.length} invoices`);
        } catch (err) {
            toast.error('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    }, []);

    const value: AppContextType = {
        products, history, vendorName, darkMode, loading, user, isSyncing,
        addProduct, updateProduct, deleteProduct,
        saveBill, deleteHistoryItem,
        saveVendorName, toggleDarkMode,
        signInWithGoogle, signOutUser,
        exportJSON, importJSON,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
