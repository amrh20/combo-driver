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
  | 'VEHICLE_BREAKDOWN';

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

export interface CompletedDriverOrder {
  id: string;
  date: string;
  occurredAt: string;
  status: HistoryOrderStatus;
  profit: number;
}

export interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  rating: number;
}
