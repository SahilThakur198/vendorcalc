// ─── Shared Types ────────────────────────────────────────────────────────────

export interface Product {
    id?: number;       // auto-assigned by Dexie
    name: string;
    price: number;
    category: string;  // NEW
}

export interface BillItem {
    name: string;
    price: number;
    quantity: number;
    total: number;
}

export interface HistoryItem {
    id?: number;            // auto-assigned by Dexie
    invoice_no: string;     // NEW e.g. "INV-001"
    vendor_name: string;
    customer_name: string;  // NEW
    items: BillItem[];
    grand_total: number;
    discount: number;       // NEW – percentage (0-100)
    discount_amount: number;// NEW – calculated amount
    final_total: number;    // NEW – grand_total - discount_amount
    created_at: string;
}

export interface AppSettings {
    key: string;
    value: string;
}

export type View = 'calculator' | 'settings' | 'history' | 'bill' | 'developer' | 'summary';
