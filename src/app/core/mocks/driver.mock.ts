import {
  ActiveDriverOrder,
  CompletedDriverOrder,
  DeliveryIssueOption,
  DriverProfile,
  LedgerTransaction,
  ShiftSession,
  TRANSACTION_TYPE_LABELS,
} from '../models';
import { formatArabicDate, formatArabicDateTime, relativeIso } from './date-helpers';

export type {
  ActiveDriverOrder,
  CompletedDriverOrder,
  CustomerDetails,
  DeliveryIssueOption,
  DeliveryIssueType,
  DriverProfile,
  DriverWalletState,
  GeoCoordinates,
  HistoryOrderStatus,
  HistoryTimeFilter,
  HubLocation,
  LedgerTransaction,
  SettlementBucket,
  ShiftSession,
  ShiftTimeFilter,
  ShopSubOrder,
  ShopSubOrderStatus,
  Transaction,
  TransactionType,
  TripState,
} from '../models';

export { TRANSACTION_TYPE_LABELS };

export const DELIVERY_ISSUE_OPTIONS: DeliveryIssueOption[] = [
  { type: 'CUSTOMER_UNREACHABLE', label: 'العميل لا يرد / هاتفه مغلق' },
  { type: 'WRONG_GPS', label: 'موقع العميل (GPS) خاطئ' },
  { type: 'CUSTOMER_REFUSED', label: 'العميل يرفض الاستلام' },
  { type: 'VEHICLE_BREAKDOWN', label: 'عطل طارئ في المركبة' },
];

export const driverProfile: DriverProfile = {
  id: 'DRV-1024',
  name: 'أحمد',
  phone: '01000000000',
  vehicle: 'موتوسيكل - أ ب ج 456',
  rating: 4.9,
};

/**
 * Active in-flight order — intentionally excluded from history + ledger seeds
 * to avoid double-counting when completeDelivery() records financial events.
 */
export const activeDriverOrder: ActiveDriverOrder = {
  id: 'CMB-24062',
  date: relativeIso(0, 14, 0),
  hub: {
    name: 'Combo Hub - التجمع',
    address: 'شارع التسعين الشمالي، أمام بوابة 6',
    contactPhone: '01112223334',
    pickupWindow: 'خلال 12 دقيقة',
    lat: 30.0074,
    lng: 31.4913,
  },
  customer: {
    name: 'مريم حسن',
    phone: '01098765432',
    address: 'كمبوند النخيل، عمارة 12، الدور 4، شقة 402',
    landmark: 'بجوار صيدلية العزبي',
    lat: 30.0218,
    lng: 31.4682,
  },
  vendorsCount: 3,
  itemsCount: 12,
  expectedEarnings: 25,
  totalDistance: 7.4,
  pickupHubName: 'هب التجمع - شارع التسعين',
  dropoffArea: 'كمبوند النخيل - التجمع',
  finalCashTotal: 290,
  etaMinutes: 18,
  subOrders: [
    {
      shopId: 'SHOP-01',
      shopName: 'سوق الفواكه - التجمع',
      itemsCount: 5,
      shopSubtotal: 85,
      items: [
        { id: 'ITM-01-1', name: 'طماطم بلدي', quantity: 2, price: 15 },
        { id: 'ITM-01-2', name: 'خيار', quantity: 1, price: 12 },
        { id: 'ITM-01-3', name: 'موز', quantity: 1, price: 18 },
        { id: 'ITM-01-4', name: 'تفاح أحمر', quantity: 1, price: 25 },
      ],
      location: { lat: 30.0089, lng: 31.4881 },
      status: 'PENDING',
    },
    {
      shopId: 'SHOP-02',
      shopName: 'مخبز الربيع',
      itemsCount: 4,
      shopSubtotal: 95,
      items: [
        { id: 'ITM-02-1', name: 'عيش بلدي', quantity: 2, price: 5 },
        { id: 'ITM-02-2', name: 'فينو', quantity: 1, price: 25 },
        { id: 'ITM-02-3', name: 'كرواسون زبدة', quantity: 1, price: 60 },
      ],
      location: { lat: 30.0112, lng: 31.4855 },
      status: 'PENDING',
    },
    {
      shopId: 'SHOP-03',
      shopName: 'بقالة النور',
      itemsCount: 3,
      shopSubtotal: 110,
      items: [
        { id: 'ITM-03-1', name: 'مسحوق غسيل', quantity: 1, price: 55 },
        { id: 'ITM-03-2', name: 'مياه معدنية 1.5 لتر', quantity: 1, price: 15 },
        { id: 'ITM-03-3', name: 'أرز بسمتي', quantity: 1, price: 40 },
      ],
      location: { lat: 30.0056, lng: 31.4938 },
      status: 'PENDING',
    },
  ],
};

const historySeed: Array<{
  id: string;
  daysAgo: number;
  hours: number;
  minutes: number;
  status: CompletedDriverOrder['status'];
  profit: number;
}> = [
  { id: 'CMB-89190', daysAgo: 0, hours: 18, minutes: 10, status: 'COMPLETED', profit: 42 },
  { id: 'CMB-89142', daysAgo: 0, hours: 15, minutes: 35, status: 'COMPLETED', profit: 38 },
  { id: 'CMB-89110', daysAgo: 0, hours: 11, minutes: 20, status: 'CANCELLED', profit: 0 },
  { id: 'CMB-89088', daysAgo: 1, hours: 21, minutes: 15, status: 'COMPLETED', profit: 55 },
  { id: 'CMB-89021', daysAgo: 1, hours: 13, minutes: 25, status: 'COMPLETED', profit: 35 },
  { id: 'CMB-88970', daysAgo: 1, hours: 10, minutes: 5, status: 'CANCELLED', profit: 0 },
  { id: 'CMB-88840', daysAgo: 3, hours: 19, minutes: 45, status: 'COMPLETED', profit: 48 },
  { id: 'CMB-88710', daysAgo: 4, hours: 14, minutes: 10, status: 'COMPLETED', profit: 40 },
  { id: 'CMB-88605', daysAgo: 6, hours: 17, minutes: 30, status: 'CANCELLED', profit: 0 },
  { id: 'CMB-88420', daysAgo: 11, hours: 20, minutes: 55, status: 'COMPLETED', profit: 52 },
  { id: 'CMB-88115', daysAgo: 19, hours: 16, minutes: 40, status: 'COMPLETED', profit: 36 },
  { id: 'CMB-87990', daysAgo: 26, hours: 13, minutes: 15, status: 'COMPLETED', profit: 44 },
  { id: 'CMB-87810', daysAgo: 34, hours: 21, minutes: 30, status: 'COMPLETED', profit: 33 },
];

export const completedDriverOrders: CompletedDriverOrder[] = historySeed.map((entry) => {
  const occurredAt = relativeIso(entry.daysAgo, entry.hours, entry.minutes);
  return {
    id: entry.id,
    date: formatArabicDateTime(occurredAt),
    occurredAt,
    status: entry.status,
    profit: entry.profit,
  };
});

const shiftSeed: Array<{
  id: string;
  daysAgo: number;
  startH: number;
  startM: number;
  endH: number;
  endM: number;
  durationMinutes: number;
}> = [
  { id: 'SHIFT-TODAY-AM', daysAgo: 0, startH: 8, startM: 0, endH: 12, endM: 15, durationMinutes: 255 },
  { id: 'SHIFT-YDAY-PM', daysAgo: 1, startH: 14, startM: 30, endH: 22, endM: 0, durationMinutes: 450 },
  { id: 'SHIFT-YDAY-AM', daysAgo: 1, startH: 7, startM: 45, endH: 11, endM: 30, durationMinutes: 225 },
  { id: 'SHIFT-D3', daysAgo: 3, startH: 10, startM: 0, endH: 18, endM: 20, durationMinutes: 500 },
  { id: 'SHIFT-D6', daysAgo: 6, startH: 9, startM: 15, endH: 15, endM: 45, durationMinutes: 390 },
  { id: 'SHIFT-D19', daysAgo: 19, startH: 11, startM: 0, endH: 19, endM: 30, durationMinutes: 510 },
  { id: 'SHIFT-D34', daysAgo: 34, startH: 8, startM: 30, endH: 14, endM: 0, durationMinutes: 330 },
];

export const mockShiftSessions: ShiftSession[] = shiftSeed.map((entry) => {
  const startTime = relativeIso(entry.daysAgo, entry.startH, entry.startM);
  const endTime = relativeIso(entry.daysAgo, entry.endH, entry.endM);
  return {
    id: entry.id,
    date: formatArabicDate(startTime),
    startTime,
    endTime,
    durationMinutes: entry.durationMinutes,
  };
});

/**
 * Seed ledger — CMB-24062 (active order) is intentionally omitted.
 * Derived balances:
 *   unremittedCash = Σ CASH_COLLECTION − Σ SETTLEMENT(CASH) = 950
 *   earnings       = Σ ORDER_DELIVERY − Σ SETTLEMENT(EARNINGS) = 200
 *   bonus          = Σ BONUS − Σ SETTLEMENT(BONUS) = 50
 *   advances       = Σ ADVANCE − Σ SETTLEMENT(ADVANCE) = 80
 */
export const driverTransactions: LedgerTransaction[] = [
  {
    id: 'TXN-89190-CASH',
    type: 'CASH_COLLECTION',
    amount: 380,
    description: 'تحصيل نقدي من العميل',
    orderId: 'CMB-89190',
    occurredAt: relativeIso(0, 18, 10),
  },
  {
    id: 'TXN-89190-DEL',
    type: 'ORDER_DELIVERY',
    amount: 42,
    description: 'أرباح توصيل — طلب CMB-89190',
    orderId: 'CMB-89190',
    occurredAt: relativeIso(0, 18, 12),
  },
  {
    id: 'TXN-89142-CASH',
    type: 'CASH_COLLECTION',
    amount: 315,
    description: 'تحصيل نقدي من العميل',
    orderId: 'CMB-89142',
    occurredAt: relativeIso(0, 15, 35),
  },
  {
    id: 'TXN-89142-DEL',
    type: 'ORDER_DELIVERY',
    amount: 38,
    description: 'أرباح توصيل — طلب CMB-89142',
    orderId: 'CMB-89142',
    occurredAt: relativeIso(0, 15, 37),
  },
  {
    id: 'TXN-BONUS-TODAY',
    type: 'BONUS',
    amount: 50,
    description: 'بونص أداء — 6 توصيلات قبل الظهر',
    occurredAt: relativeIso(0, 12, 0),
  },
  {
    id: 'TXN-MORNING-CASH',
    type: 'CASH_COLLECTION',
    amount: 255,
    description: 'تحصيل نقدي — توصيلات الصباح',
    occurredAt: relativeIso(0, 8, 45),
  },
  {
    id: 'TXN-89100-DEL',
    type: 'ORDER_DELIVERY',
    amount: 60,
    description: 'أرباح توصيل — طلب CMB-89100',
    orderId: 'CMB-89100',
    occurredAt: relativeIso(0, 10, 15),
  },
  {
    id: 'TXN-89050-DEL',
    type: 'ORDER_DELIVERY',
    amount: 60,
    description: 'أرباح توصيل — طلب CMB-89050',
    orderId: 'CMB-89050',
    occurredAt: relativeIso(0, 11, 5),
  },
  {
    id: 'TXN-ADV-TODAY',
    type: 'ADVANCE',
    amount: 80,
    description: 'سلفة صيانة دراجة',
    occurredAt: relativeIso(0, 9, 30),
  },
  {
    id: 'TXN-89088-CASH',
    type: 'CASH_COLLECTION',
    amount: 520,
    description: 'تحصيل نقدي من العميل',
    orderId: 'CMB-89088',
    occurredAt: relativeIso(1, 21, 15),
  },
  {
    id: 'TXN-89088-DEL',
    type: 'ORDER_DELIVERY',
    amount: 55,
    description: 'أرباح توصيل — طلب CMB-89088',
    orderId: 'CMB-89088',
    occurredAt: relativeIso(1, 21, 17),
  },
  {
    id: 'TXN-89021-CASH',
    type: 'CASH_COLLECTION',
    amount: 255,
    description: 'تحصيل نقدي من العميل',
    orderId: 'CMB-89021',
    occurredAt: relativeIso(1, 13, 25),
  },
  {
    id: 'TXN-89021-DEL',
    type: 'ORDER_DELIVERY',
    amount: 35,
    description: 'أرباح توصيل — طلب CMB-89021',
    orderId: 'CMB-89021',
    occurredAt: relativeIso(1, 13, 27),
  },
  {
    id: 'TXN-SETTLE-PAYOUT-YDAY',
    type: 'SETTLEMENT',
    amount: 90,
    description: 'قبض مستحقات الأمس',
    occurredAt: relativeIso(1, 22, 45),
    settles: 'EARNINGS',
  },
  {
    id: 'TXN-REMIT-YDAY',
    type: 'SETTLEMENT',
    amount: 775,
    description: 'توريد عهدة نقدية للهب',
    occurredAt: relativeIso(1, 22, 30),
    settles: 'CASH',
  },
  {
    id: 'TXN-ADV-D2',
    type: 'ADVANCE',
    amount: 120,
    description: 'سلفة طوارئ',
    occurredAt: relativeIso(2, 10, 15),
  },
  {
    id: 'TXN-SETTLE-ADV-D2',
    type: 'SETTLEMENT',
    amount: 120,
    description: 'تسوية سلفة طوارئ مع المستحقات',
    occurredAt: relativeIso(1, 22, 46),
    settles: 'ADVANCE',
  },
  {
    id: 'TXN-BONUS-D3',
    type: 'BONUS',
    amount: 30,
    description: 'بونص التزام بالمواعيد',
    occurredAt: relativeIso(3, 17, 0),
  },
  {
    id: 'TXN-SETTLE-BONUS-D3',
    type: 'SETTLEMENT',
    amount: 30,
    description: 'قبض بونص ضمن تصفية اليوم',
    occurredAt: relativeIso(1, 22, 47),
    settles: 'BONUS',
  },
  {
    id: 'TXN-88710-DEL',
    type: 'ORDER_DELIVERY',
    amount: 40,
    description: 'أرباح توصيل — طلب CMB-88710',
    orderId: 'CMB-88710',
    occurredAt: relativeIso(3, 11, 40),
  },
  {
    id: 'TXN-88710-CASH',
    type: 'CASH_COLLECTION',
    amount: 410,
    description: 'تحصيل نقدي من العميل',
    orderId: 'CMB-88710',
    occurredAt: relativeIso(3, 11, 38),
  },
  {
    id: 'TXN-88550-DEL',
    type: 'ORDER_DELIVERY',
    amount: 48,
    description: 'أرباح توصيل — طلب CMB-88550',
    orderId: 'CMB-88550',
    occurredAt: relativeIso(15, 16, 20),
  },
  {
    id: 'TXN-88550-CASH',
    type: 'CASH_COLLECTION',
    amount: 275,
    description: 'تحصيل نقدي من العميل',
    orderId: 'CMB-88550',
    occurredAt: relativeIso(15, 16, 18),
  },
  {
    id: 'TXN-SETTLE-EARN-OLD',
    type: 'SETTLEMENT',
    amount: 88,
    description: 'قبض مستحقات سابقة',
    occurredAt: relativeIso(4, 20, 0),
    settles: 'EARNINGS',
  },
  {
    id: 'TXN-REMIT-OLD',
    type: 'SETTLEMENT',
    amount: 685,
    description: 'توريد عهدة نقدية للهب',
    occurredAt: relativeIso(4, 19, 45),
    settles: 'CASH',
  },
];

/**
 * Expected derived wallet snapshot from driverTransactions (for docs / tests).
 * unremittedCash: (380+315+255+520+255+410+275) − (775+685) = 2410 − 1460 = 950
 * earnings: (42+38+60+60+55+35+40+48) − (90+88) = 378 − 178 = 200
 * bonus: 50 + 30 − 30 = 50
 * advances: 80 + 120 − 120 = 80
 */
export const driverWalletState = {
  unremittedCash: 950,
  earnings: 200,
  bonus: 50,
  advances: 80,
} as const;
