export type TransactionType =
  | 'ORDER_DELIVERY'
  | 'CASH_COLLECTION'
  | 'ADVANCE'
  | 'BONUS'
  | 'SETTLEMENT';

/** Which wallet bucket a SETTLEMENT transaction closes. */
export type SettlementBucket = 'CASH' | 'EARNINGS' | 'BONUS' | 'ADVANCE';

export interface LedgerTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  orderId?: string;
  occurredAt: string;
  /** Present on SETTLEMENT rows that zero a specific balance bucket. */
  settles?: SettlementBucket;
}

/** @deprecated Prefer LedgerTransaction — kept for gradual migration. */
export type Transaction = LedgerTransaction;

/** Warning threshold for unremitted company cash, in EGP. */
export const CASH_IN_HAND_WARNING_EGP = 150;

/** Hard stop: captain cannot go online above this unremitted cash, in EGP. */
export const CASH_IN_HAND_LIMIT_EGP = 200;

export const CASH_IN_HAND_LIMIT_MESSAGE =
  'تخطيت الحد الأقصى للعهدة (200 ج.م). برجاء توريد الكاش للعمليات لاستلام طلبات جديدة.';

export const CASH_IN_HAND_WARNING_MESSAGE =
  'اقتربت من الحد الأقصى للعهدة (200 ج.م). برجاء توريد الكاش قريبًا حتى لا يتوقف استلام الطلبات.';

/** Ops confirmation state for a cash remittance. */
export type CashSettlementStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

/**
 * `POST /captain/wallet/settle` and `GET /captain/wallet/history`.
 * Amount is EGP after dividing API piastres by 100.
 */
export interface CashSettlement {
  id: string;
  amount: number;
  occurredAt: string;
  status: CashSettlementStatus;
}

/** Raw settlement row from the API. Amount is integer piastres. */
export interface SettlementTransaction {
  id: string;
  captainId?: string;
  amount: number;
  status: CashSettlementStatus;
  createdAt: string;
}

/** `GET /v1/captain/wallet`. Every amount is integer piastres. */
export interface CaptainWallet {
  companyCashBalance: number;
  /** Same number as `companyCashBalance`. */
  unremittedCash: number;
  earnings: number;
  bonus: number;
  advances: number;
  pendingSettlement: SettlementTransaction | null;
}

/** Wallet balances in EGP, after dividing API piastres by 100. */
export interface DriverWalletState {
  unremittedCash: number;
  earnings: number;
  bonus: number;
  advances: number;
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  ORDER_DELIVERY: 'أرباح توصيل',
  CASH_COLLECTION: 'تحصيل نقدي',
  ADVANCE: 'سلفة',
  BONUS: 'بونص',
  SETTLEMENT: 'تصفية / قبض',
};
