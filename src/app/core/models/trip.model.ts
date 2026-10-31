export type TripState =
  | 'IDLE'
  | 'HEADING_TO_HUB'
  | 'HUB_PICKUP'
  | 'HEADING_TO_CUSTOMER'
  | 'COLLECTION'
  | 'ISSUE_REPORTED';

export type DeliveryIssueType =
  | 'CUSTOMER_UNREACHABLE'
  | 'WRONG_GPS'
  | 'CUSTOMER_REFUSED'
  | 'VEHICLE_BREAKDOWN'
  | 'SHOP_PROBLEM'
  | 'OTHER';

export interface DeliveryIssueOption {
  type: DeliveryIssueType;
  label: string;
}

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface HubLocation {
  name: string;
  address: string;
  contactPhone: string;
  pickupWindow: string;
  lat: number;
  lng: number;
}

export interface CustomerDetails {
  name: string;
  phone: string;
  address: string;
  landmark: string;
  lat: number;
  lng: number;
}

export type ShopSubOrderStatus = 'PENDING' | 'PICKED_UP';

export interface ShopSubOrderItem {
  id: string;
  name: string;
  quantity: number;
  /** Unit price in EGP. */
  price: number;
}

export interface ShopSubOrder {
  shopId: string;
  shopName: string;
  itemsCount: number;
  items: ShopSubOrderItem[];
  /** Sum of (quantity × price) for all items in this shop. */
  shopSubtotal: number;
  location: GeoCoordinates;
  status: ShopSubOrderStatus;
}

export interface ActiveDriverOrder {
  id: string;
  date: string;
  hub: HubLocation;
  customer: CustomerDetails;
  /** Number of shops/vendors in this aggregated order. */
  vendorsCount: number;
  itemsCount: number;
  /** Delivery earnings shown on the incoming offer (driver motivator). */
  expectedEarnings: number;
  /** Total trip distance in km. */
  totalDistance: number;
  /** Short hub label for the accept-decision card. */
  pickupHubName: string;
  /** Short customer drop-off area for the accept-decision card. */
  dropoffArea: string;
  /** Cash the driver must collect from the customer. */
  finalCashTotal: number;
  etaMinutes: number;
  subOrders: ShopSubOrder[];
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

/** `COD` is cash on delivery. `CARD` and `WALLET` are paid online. */
export type OrderPaymentMethod = 'COD' | 'CARD' | 'WALLET';

/** `GET /v1/captain/orders/history` row. Money is integer piastres. */
export interface CaptainOrderHistoryItem {
  id: string;
  orderId: string;
  orderNumber: string;
  occurredAt: string;
  status: 'COMPLETED';
  customerName: string;
  /** Shops still on the order. Rejected and cancelled bags are not counted. */
  shopsCount: number;
  paymentMethod: OrderPaymentMethod;
  captainProfit: number;
  customerTotal: number;
  /** Integer piastres of company cash collected on delivery, when applicable. */
  cashCollected?: number;
}

/** `GET /v1/captain/shifts` row. Closed shifts only; `durationMinutes` is authoritative. */
export interface CaptainShift {
  id: string;
  startedAt: string;
  endedAt: string;
  endTime: string;
  durationMinutes: number;
}

export interface CompletedDriverOrder {
  id: string;
  orderNumber: string;
  date: string;
  occurredAt: string;
  status: HistoryOrderStatus;
  customerName: string;
  shopsCount: number;
  paymentMethod: OrderPaymentMethod | null;
  /** Integer piastres from the API. Divide by 100 before showing EGP. */
  captainProfit: number;
  /** Integer piastres. What the customer was charged. */
  customerTotal: number;
  /** Integer piastres of company cash collected on this trip. */
  cashCollected: number;
}

export interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  rating: number;
}
