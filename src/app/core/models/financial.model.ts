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
