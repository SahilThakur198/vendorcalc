import Dexie, { type Table } from 'dexie';
import type { Product, HistoryItem, AppSettings } from '../types';

export class VendorCalcDB extends Dexie {
    products!: Table<Product>;
    history!: Table<HistoryItem>;
    settings!: Table<AppSettings>;

    constructor() {
        super('VendorCalcDB');
        this.version(1).stores({
            products: '++id, name, category',
            history: '++id, invoice_no, vendor_name, customer_name, created_at',
            settings: 'key',
        });
    }
}

export const db = new VendorCalcDB();

// ─── Migration: localStorage → Dexie ─────────────────────────────────────────

export async function migrateFromLocalStorage() {
    const migrated = localStorage.getItem('vc_migrated');
    if (migrated) return;

    try {
        // Products
        const rawProds = localStorage.getItem('products');
        if (rawProds) {
            const prods = JSON.parse(rawProds) as { id: number; name: string; price: number }[];
            for (const p of prods) {
                await db.products.add({ name: p.name, price: p.price, category: 'General' });
            }
        }

        // History
        const rawHist = localStorage.getItem('history');
        if (rawHist) {
            const hist = JSON.parse(rawHist) as {
                id: number; vendor_name: string;
                items: { name: string; price: number; quantity: number; total: number }[];
                grand_total: number; created_at: string;
            }[];
            for (const h of hist) {
                await db.history.add({
                    invoice_no: `INV-${String(h.id).slice(-3).padStart(3, '0')}`,
                    vendor_name: h.vendor_name,
                    customer_name: '',
                    items: h.items,
                    grand_total: h.grand_total,
                    discount: 0,
                    discount_amount: 0,
                    final_total: h.grand_total,
                    created_at: h.created_at,
                });
            }
        }

        // Vendor name
        const vName = localStorage.getItem('vendorName');
        if (vName) {
            await db.settings.put({ key: 'vendorName', value: vName });
        }

        // Invoice counter — start after migrated history
        const count = JSON.parse(rawHist || '[]').length;
        await db.settings.put({ key: 'invoiceCounter', value: String(count) });

        localStorage.setItem('vc_migrated', '1');
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

// ─── Invoice Number ───────────────────────────────────────────────────────────

export async function getNextInvoiceNo(): Promise<string> {
    const row = await db.settings.get('invoiceCounter');
    const next = (parseInt(row?.value || '0') + 1);
    await db.settings.put({ key: 'invoiceCounter', value: String(next) });
    return `INV-${String(next).padStart(3, '0')}`;
}
