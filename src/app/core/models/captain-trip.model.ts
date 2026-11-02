import { DeliveryIssueType } from './trip.model';

/** Integer piastres. Divide by 100 to show EGP. */
export type Piastres = number;

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type AssignmentMode = 'COLLECT_ONLY' | 'DELIVER_ONLY' | 'COLLECT_AND_DELIVER';

export type TaskStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export type StopKind = 'VENDOR' | 'HUB' | 'CUSTOMER';

export type StopStatus = 'PENDING' | 'ARRIVED' | 'DONE' | 'SKIPPED';

/** The server decides the flow for this trip. Do not derive it from the login role. */
export interface TaskFlags {
  mode: AssignmentMode;
  labelAr: string;
  requiresCollection: boolean;
  requiresHubStop: boolean;
  requiresDelivery: boolean;
  collectsCash: boolean;
  isRoleOverride: boolean;
}

export interface StopShopItem {
  id: string;
  name: string;
  unitPrice: Piastres;
  quantity: number;
}

export interface StopShop {
  subOrderId: string;
  vendorId: string;
  name: string;
  phone: string | null;
  status: string;
  notes: string | null;
  itemsCount: number;
  items: StopShopItem[];
  /** Piastres when the captain replaced this shop's line sum. `subtotal` already uses it. */
  captainOverrideTotal?: Piastres | null;
  invoiceUrl?: string | null;
  subtotal: Piastres;
}

export interface TaskStop {
  id: string;
  seq: number;
  kind: StopKind;
  status: StopStatus;
  location: GeoPoint;
  shop?: StopShop | null;
}

export interface OpenIssue {
  id: string;
  taskId: string;
  type: DeliveryIssueType;
  note: string | null;
  createdAt: string;
}

/** `GET /v1/captain/offers/current` — area only, no customer address. */
export interface CaptainOffer {
  id: string;
  expiresAt: string;
  task: {
    id: string;
    orderNumber: string;
    flags: TaskFlags;
    pickupHubName: string;
    hub: { id: string; name: string; address: string | null; location: GeoPoint };
    dropoffArea: string | null;
    vendorsCount: number;
    itemsCount: number;
    cashToCollect: Piastres;
    /** Stored pay. 0 until the trip completes. */
    expectedEarnings: Piastres;
    /** Preview of this trip's pay, in piastres. The offer card divides by 100. */
    expectedCaptainProfit: Piastres;
    totalDistanceMeters: number;
    etaMinutes: number;
  };
}

/** `GET /v1/captain/tasks/current` — the only source of the trip screen. */
export interface CaptainTask {
  id: string;
  status: TaskStatus;
  flags: TaskFlags;
  order: { id: string; orderNumber: string; notes: string | null; callBeforeDelivery: boolean };
  hub: { id: string; name: string; address: string | null; location: GeoPoint };
  customer: {
    name: string;
    phone: string;
    address: string;
    floor: string | null;
    apartment: string | null;
    landmark: string | null;
    deliveryInstructions: string | null;
    location: GeoPoint;
  } | null;
  cashToCollect: Piastres;
  stops: TaskStop[];
  currentStopId: string | null;
  openIssue: OpenIssue | null;
  totalDistanceMeters: number;
  etaMinutes: number;
  expectedEarnings: Piastres;
}

export interface StopCompletionBody {
  location?: GeoPoint;
  cashCollected?: Piastres;
  farReason?: string;
}

export interface ArriveStopBody {
  location?: GeoPoint;
}

/** Socket payload. Domain events also carry `id` for deduplication. */
export interface RealtimeMessage<T = Record<string, unknown>> {
  event: string;
  data: T;
  id?: string;
  occurredAt?: string;
}

export interface GeofencePrompt {
  taskId: string;
  stopId: string;
  distanceMeters: number | null;
  maxMeters: number | null;
}

export type TripScreen = 'IDLE' | 'VENDOR' | 'HUB' | 'CUSTOMER' | 'COLLECTION' | 'ISSUE';

export type TripAction = 'accept' | 'decline' | 'arrive' | 'complete' | 'issue' | 'confirm';
