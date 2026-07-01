export type TripState =
  | 'IDLE'
  | 'HEADING_TO_HUB'
  | 'HEADING_TO_CUSTOMER'
  | 'COLLECTION'
  | 'ISSUE_REPORTED';

export type DeliveryIssueType =
  | 'CUSTOMER_UNREACHABLE'
  | 'WRONG_GPS'
  | 'CUSTOMER_REFUSED'
  | 'VEHICLE_BREAKDOWN';

export interface DeliveryIssueOption {
  type: DeliveryIssueType;
  label: string;
}

export const DELIVERY_ISSUE_OPTIONS: DeliveryIssueOption[] = [
  { type: 'CUSTOMER_UNREACHABLE', label: 'العميل لا يرد / هاتفه مغلق' },
  { type: 'WRONG_GPS', label: 'موقع العميل (GPS) خاطئ' },
  { type: 'CUSTOMER_REFUSED', label: 'العميل يرفض الاستلام' },
  { type: 'VEHICLE_BREAKDOWN', label: 'عطل طارئ في المركبة' },
];

export type TransactionType =
  | 'ORDER_DELIVERY'
  | 'CASH_COLLECTION'
  | 'ADVANCE'
  | 'BONUS'
  | 'SETTLEMENT';

export interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  rating: number;
}

export interface HubLocation {
  name: string;
  address: string;
  contactPhone: string;
  pickupWindow: string;
}

export interface CustomerDetails {
  name: string;
  phone: string;
  address: string;
  landmark: string;
}

export interface ActiveDriverOrder {
  id: string;
  date: string;
  hub: HubLocation;
  customer: CustomerDetails;
  vendorsCount: number;
  itemsCount: number;
  bagsCount: number;
  cashToCollect: number;
  deliveryFee: number;
  distanceKm: number;
  etaMinutes: number;
}

export type HistoryOrderStatus = 'COMPLETED' | 'CANCELLED';

export type HistoryTimeFilter = 'today' | 'week' | 'month' | 'all';

export type ShiftTimeFilter = HistoryTimeFilter;

export interface ShiftSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
}

export interface CompletedDriverOrder {
  id: string;
  date: string;
  occurredAt: string;
  status: HistoryOrderStatus;
  profit: number;
}

export interface DriverWalletState {
  unremittedCash: number;
  earnings: number;
  bonus: number;
  advances: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  orderId?: string;
  occurredAt: string;
}

export const driverProfile: DriverProfile = {
  id: 'DRV-1024',
  name: 'أحمد السائق',
  phone: '01000000000',
  vehicle: 'موتوسيكل - أ ب ج 456',
  rating: 4.9
};

export const activeDriverOrder: ActiveDriverOrder = {
  id: 'CMB-24062',
  date: '2026-07-01',
  hub: {
    name: 'Combo Hub - التجمع',
    address: 'شارع التسعين الشمالي، أمام بوابة 6',
    contactPhone: '01112223334',
    pickupWindow: 'خلال 12 دقيقة'
  },
  customer: {
    name: 'مريم حسن',
    phone: '01098765432',
    address: 'كمبوند النخيل، عمارة 12، الدور 4، شقة 402',
    landmark: 'بجوار صيدلية العزبي'
  },
  vendorsCount: 3,
  itemsCount: 12,
  bagsCount: 6,
  cashToCollect: 290,
  deliveryFee: 45,
  distanceKm: 7.4,
  etaMinutes: 18
};

export const completedDriverOrders: CompletedDriverOrder[] = [
  {
    id: 'CMB-89190',
    date: '01 يوليو 2026، 06:10 م',
    occurredAt: '2026-07-01T18:10:00',
    status: 'COMPLETED',
    profit: 42
  },
  {
    id: 'CMB-89142',
    date: '01 يوليو 2026، 03:35 م',
    occurredAt: '2026-07-01T15:35:00',
    status: 'COMPLETED',
    profit: 38
  },
  {
    id: 'CMB-89110',
    date: '01 يوليو 2026، 11:20 ص',
    occurredAt: '2026-07-01T11:20:00',
    status: 'CANCELLED',
    profit: 0
  },
  {
    id: 'CMB-89088',
    date: '30 يونيو 2026، 09:15 م',
    occurredAt: '2026-06-30T21:15:00',
    status: 'COMPLETED',
    profit: 55
  },
  {
    id: 'CMB-89021',
    date: '30 يونيو 2026، 01:25 م',
    occurredAt: '2026-06-30T13:25:00',
    status: 'COMPLETED',
    profit: 35
  },
  {
    id: 'CMB-88970',
    date: '30 يونيو 2026، 10:05 ص',
    occurredAt: '2026-06-30T10:05:00',
    status: 'CANCELLED',
    profit: 0
  },
  {
    id: 'CMB-88840',
    date: '28 يونيو 2026، 07:45 م',
    occurredAt: '2026-06-28T19:45:00',
    status: 'COMPLETED',
    profit: 48
  },
  {
    id: 'CMB-88710',
    date: '27 يونيو 2026، 02:10 م',
    occurredAt: '2026-06-27T14:10:00',
    status: 'COMPLETED',
    profit: 40
  },
  {
    id: 'CMB-88605',
    date: '25 يونيو 2026، 05:30 م',
    occurredAt: '2026-06-25T17:30:00',
    status: 'CANCELLED',
    profit: 0
  },
  {
    id: 'CMB-88420',
    date: '20 يونيو 2026، 08:55 م',
    occurredAt: '2026-06-20T20:55:00',
    status: 'COMPLETED',
    profit: 52
  },
  {
    id: 'CMB-88115',
    date: '12 يونيو 2026، 04:40 م',
    occurredAt: '2026-06-12T16:40:00',
    status: 'COMPLETED',
    profit: 36
  },
  {
    id: 'CMB-87990',
    date: '05 يونيو 2026، 01:15 م',
    occurredAt: '2026-06-05T13:15:00',
    status: 'COMPLETED',
    profit: 44
  },
  {
    id: 'CMB-87810',
    date: '28 مايو 2026، 09:30 م',
    occurredAt: '2026-05-28T21:30:00',
    status: 'COMPLETED',
    profit: 33
  }
];

export const mockShiftSessions: ShiftSession[] = [
  {
    id: 'SHIFT-0701-AM',
    date: '01 يوليو 2026',
    startTime: '2026-07-01T08:00:00',
    endTime: '2026-07-01T12:15:00',
    durationMinutes: 255
  },
  {
    id: 'SHIFT-0630-PM',
    date: '30 يونيو 2026',
    startTime: '2026-06-30T14:30:00',
    endTime: '2026-06-30T22:00:00',
    durationMinutes: 450
  },
  {
    id: 'SHIFT-0630-AM',
    date: '30 يونيو 2026',
    startTime: '2026-06-30T07:45:00',
    endTime: '2026-06-30T11:30:00',
    durationMinutes: 225
  },
  {
    id: 'SHIFT-0628',
    date: '28 يونيو 2026',
    startTime: '2026-06-28T10:00:00',
    endTime: '2026-06-28T18:20:00',
    durationMinutes: 500
  },
  {
    id: 'SHIFT-0625',
    date: '25 يونيو 2026',
    startTime: '2026-06-25T09:15:00',
    endTime: '2026-06-25T15:45:00',
    durationMinutes: 390
  },
  {
    id: 'SHIFT-0612',
    date: '12 يونيو 2026',
    startTime: '2026-06-12T11:00:00',
    endTime: '2026-06-12T19:30:00',
    durationMinutes: 510
  },
  {
    id: 'SHIFT-0528',
    date: '28 مايو 2026',
    startTime: '2026-05-28T08:30:00',
    endTime: '2026-05-28T14:00:00',
    durationMinutes: 330
  }
];

/** Daily settlement snapshot — earnings (245) + bonus (50) − advances (80) = net 215 */
export const driverWalletState: DriverWalletState = {
  unremittedCash: 1240,
  earnings: 245,
  bonus: 50,
  advances: 80
};

/** @deprecated Use driverWalletState */
export const walletSummary = {
  cashOnHand: driverWalletState.unremittedCash,
  earnings: driverWalletState.earnings
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  ORDER_DELIVERY: 'أرباح توصيل',
  CASH_COLLECTION: 'تحصيل نقدي',
  ADVANCE: 'سلفة',
  BONUS: 'بونص',
  SETTLEMENT: 'تصفية / قبض'
};

export const driverTransactions: Transaction[] = [
  {
    id: 'TXN-24062-CASH',
    type: 'CASH_COLLECTION',
    amount: 290,
    description: 'تحصيل نقدي من العميل',
    orderId: 'CMB-24062',
    occurredAt: '2026-07-01T14:20:00'
  },
  {
    id: 'TXN-24062-DEL',
    type: 'ORDER_DELIVERY',
    amount: 45,
    description: 'أرباح توصيل — طلب CMB-24062',
    orderId: 'CMB-24062',
    occurredAt: '2026-07-01T14:22:00'
  },
  {
    id: 'TXN-89190-CASH',
    type: 'CASH_COLLECTION',
    amount: 380,
    description: 'تحصيل نقدي من العميل',
    orderId: 'CMB-89190',
    occurredAt: '2026-07-01T18:10:00'
  },
  {
    id: 'TXN-89190-DEL',
    type: 'ORDER_DELIVERY',
    amount: 42,
    description: 'أرباح توصيل — طلب CMB-89190',
    orderId: 'CMB-89190',
    occurredAt: '2026-07-01T18:12:00'
  },
  {
    id: 'TXN-89142-CASH',
    type: 'CASH_COLLECTION',
    amount: 315,
    description: 'تحصيل نقدي من العميل',
    orderId: 'CMB-89142',
    occurredAt: '2026-07-01T15:35:00'
  },
  {
    id: 'TXN-89142-DEL',
    type: 'ORDER_DELIVERY',
    amount: 38,
    description: 'أرباح توصيل — طلب CMB-89142',
    orderId: 'CMB-89142',
    occurredAt: '2026-07-01T15:37:00'
  },
  {
    id: 'TXN-BONUS-0701',
    type: 'BONUS',
    amount: 50,
    description: 'بونص أداء — 6 توصيلات قبل الظهر',
    occurredAt: '2026-07-01T12:00:00'
  },
  {
    id: 'TXN-MORNING-CASH',
    type: 'CASH_COLLECTION',
    amount: 255,
    description: 'تحصيل نقدي — توصيلات الصباح',
    occurredAt: '2026-07-01T08:45:00'
  },
  {
    id: 'TXN-89100-DEL',
    type: 'ORDER_DELIVERY',
    amount: 60,
    description: 'أرباح توصيل — طلب CMB-89100',
    orderId: 'CMB-89100',
    occurredAt: '2026-07-01T10:15:00'
  },
  {
    id: 'TXN-89050-DEL',
    type: 'ORDER_DELIVERY',
    amount: 60,
    description: 'أرباح توصيل — طلب CMB-89050',
    orderId: 'CMB-89050',
    occurredAt: '2026-07-01T11:05:00'
  },
  {
    id: 'TXN-ADV-0701',
    type: 'ADVANCE',
    amount: 80,
    description: 'سلفة صيانة دراجة',
    occurredAt: '2026-07-01T09:30:00'
  },
  {
    id: 'TXN-89088-CASH',
    type: 'CASH_COLLECTION',
    amount: 520,
    description: 'تحصيل نقدي من العميل',
    orderId: 'CMB-89088',
    occurredAt: '2026-06-30T21:15:00'
  },
  {
    id: 'TXN-89088-DEL',
    type: 'ORDER_DELIVERY',
    amount: 55,
    description: 'أرباح توصيل — طلب CMB-89088',
    orderId: 'CMB-89088',
    occurredAt: '2026-06-30T21:17:00'
  },
  {
    id: 'TXN-89021-CASH',
    type: 'CASH_COLLECTION',
    amount: 255,
    description: 'تحصيل نقدي من العميل',
    orderId: 'CMB-89021',
    occurredAt: '2026-06-30T13:25:00'
  },
  {
    id: 'TXN-89021-DEL',
    type: 'ORDER_DELIVERY',
    amount: 35,
    description: 'أرباح توصيل — طلب CMB-89021',
    orderId: 'CMB-89021',
    occurredAt: '2026-06-30T13:27:00'
  },
  {
    id: 'TXN-SETTLE-0630',
    type: 'SETTLEMENT',
    amount: 148,
    description: 'قبض مستحقات يوم 30 يونيو',
    occurredAt: '2026-06-30T22:45:00'
  },
  {
    id: 'TXN-REMIT-0630',
    type: 'SETTLEMENT',
    amount: 920,
    description: 'توريد عهدة نقدية للهب',
    occurredAt: '2026-06-30T22:30:00'
  },
  {
    id: 'TXN-ADV-0629',
    type: 'ADVANCE',
    amount: 120,
    description: 'سلفة طوارئ',
    occurredAt: '2026-06-29T10:15:00'
  },
  {
    id: 'TXN-BONUS-0628',
    type: 'BONUS',
    amount: 30,
    description: 'بونص التزام بالمواعيد',
    occurredAt: '2026-06-28T17:00:00'
  },
  {
    id: 'TXN-88710-DEL',
    type: 'ORDER_DELIVERY',
    amount: 40,
    description: 'أرباح توصيل — طلب CMB-88710',
    orderId: 'CMB-88710',
    occurredAt: '2026-06-28T11:40:00'
  },
  {
    id: 'TXN-88710-CASH',
    type: 'CASH_COLLECTION',
    amount: 410,
    description: 'تحصيل نقدي من العميل',
    orderId: 'CMB-88710',
    occurredAt: '2026-06-28T11:38:00'
  },
  {
    id: 'TXN-88550-DEL',
    type: 'ORDER_DELIVERY',
    amount: 48,
    description: 'أرباح توصيل — طلب CMB-88550',
    orderId: 'CMB-88550',
    occurredAt: '2026-06-15T16:20:00'
  },
  {
    id: 'TXN-88550-CASH',
    type: 'CASH_COLLECTION',
    amount: 275,
    description: 'تحصيل نقدي من العميل',
    orderId: 'CMB-88550',
    occurredAt: '2026-06-15T16:18:00'
  }
];
