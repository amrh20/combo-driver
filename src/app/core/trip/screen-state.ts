import {
  AssignmentMode,
  CaptainOffer,
  CaptainTask,
  StopStatus,
  TaskStop,
  TripScreen,
} from '../models';

export interface OfferCardView {
  id: string;
  earningsLabel: string;
  earningsPiastres: number;
  pickupHubName: string;
  dropoffArea: string | null;
  showDropoff: boolean;
  showStores: boolean;
  showDistance: boolean;
  showCash: boolean;
  vendorsCount: number;
  itemsCount: number;
  distanceKm: number;
  cashPiastres: number;
  labelAr: string;
}

export interface ShopLineView {
  id: string;
  name: string;
  quantity: number;
  linePiastres: number;
}

export interface ShopStopView {
  stopId: string;
  vendorId: string;
  shopName: string;
  phone: string | null;
  itemsCount: number;
  status: StopStatus;
  statusLabel: string;
  isDone: boolean;
  lat: number;
  lng: number;
  items: ShopLineView[];
  subtotalPiastres: number;
}

export interface ActiveTripView {
  taskId: string;
  orderNumber: string;
  mode: AssignmentMode;
  modeLabel: string;
  hubName: string;
  hubAddress: string;
  hubLat: number;
  hubLng: number;
  hubTitle: string;
  hubActionLabel: string;
  vendorStops: ShopStopView[];
  pickedUpCount: number;
  vendorsCount: number;
  itemsCount: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerLandmark: string;
  customerInstructions: string | null;
  orderNotes: string | null;
  callBeforeDelivery: boolean;
  customerLat: number;
  customerLng: number;
  etaMinutes: number;
  cashPiastres: number;
  collectsCash: boolean;
  currentStopId: string | null;
}

const ACTIVE_STATUSES = new Set(['OPEN', 'ASSIGNED', 'IN_PROGRESS']);

export function isActiveCaptainTask(task: CaptainTask | null): task is CaptainTask {
  if (!task || !ACTIVE_STATUSES.has(task.status)) {
    return false;
  }

  return task.currentStopId !== null || task.openIssue !== null;
}

export function currentStopOf(task: CaptainTask | null): TaskStop | null {
  if (!task?.currentStopId) {
    return null;
  }

  return task.stops.find((stop) => stop.id === task.currentStopId) ?? null;
}

/** Screen follows `currentStopId` and `openIssue`. Copy follows `flags.mode`. */
export function screenFromTask(task: CaptainTask | null): TripScreen {
  if (!isActiveCaptainTask(task)) {
    return 'IDLE';
  }

  if (task.openIssue) {
    return 'ISSUE';
  }

  const stop = currentStopOf(task);
  if (!stop) {
    return 'IDLE';
  }

  switch (stop.kind) {
    case 'VENDOR':
      return 'VENDOR';
    case 'HUB':
      return 'HUB';
    case 'CUSTOMER':
      return stop.status === 'ARRIVED' ? 'COLLECTION' : 'CUSTOMER';
    default:
      return 'IDLE';
  }
}

export function buildOfferCard(offer: CaptainOffer): OfferCardView {
  const task = offer.task;

  return {
    id: task.orderNumber,
    earningsLabel: task.flags.mode === 'COLLECT_ONLY' ? 'مكافأة التجميع' : 'أرباح التوصيل',
    earningsPiastres: task.expectedCaptainProfit,
    pickupHubName: task.pickupHubName,
    dropoffArea: task.dropoffArea,
    showDropoff: task.flags.requiresDelivery && !!task.dropoffArea,
    showStores: task.flags.requiresCollection,
    showDistance: task.totalDistanceMeters > 0,
    showCash: task.flags.collectsCash,
    vendorsCount: task.vendorsCount,
    itemsCount: task.itemsCount,
    distanceKm: task.totalDistanceMeters / 1000,
    cashPiastres: task.cashToCollect,
    labelAr: task.flags.labelAr,
  };
}

export function buildTripView(task: CaptainTask): ActiveTripView {
  const customer = task.customer;
  const shops = task.stops.filter((stop) => stop.kind === 'VENDOR' && stop.shop);
  const addressParts = [
    customer?.address,
    customer?.floor ? `الدور ${customer.floor}` : null,
    customer?.apartment ? `شقة ${customer.apartment}` : null,
  ].filter((part): part is string => !!part);

  return {
    taskId: task.id,
    orderNumber: task.order.orderNumber,
    mode: task.flags.mode,
    modeLabel: task.flags.labelAr,
    hubName: task.hub.name,
    hubAddress: task.hub.address ?? '',
    hubLat: task.hub.location.lat,
    hubLng: task.hub.location.lng,
    hubTitle: hubTitle(task.flags.mode),
    hubActionLabel: hubActionLabel(task.flags.mode),
    vendorStops: shops.map((stop) => toShopView(stop)),
    pickedUpCount: shops.filter((stop) => stop.status === 'DONE' || stop.status === 'SKIPPED').length,
    vendorsCount: shops.length,
    itemsCount: shops.reduce((sum, stop) => sum + (stop.shop?.itemsCount ?? 0), 0),
    customerName: customer?.name ?? '',
    customerPhone: customer?.phone ?? '',
    customerAddress: addressParts.join('، '),
    customerLandmark: customer?.landmark ?? '',
    customerInstructions: customer?.deliveryInstructions ?? null,
    orderNotes: task.order.notes,
    callBeforeDelivery: task.order.callBeforeDelivery,
    customerLat: customer?.location.lat ?? 0,
    customerLng: customer?.location.lng ?? 0,
    etaMinutes: task.etaMinutes,
    cashPiastres: task.cashToCollect,
    collectsCash: task.flags.collectsCash,
    currentStopId: task.currentStopId,
  };
}

export function stateLabel(screen: TripScreen, mode: AssignmentMode | null, online: boolean): string {
  switch (screen) {
    case 'VENDOR':
      return 'استلام من المتاجر';
    case 'HUB':
      return mode ? hubTitle(mode) : 'نقطة التجميع';
    case 'CUSTOMER':
      return 'في الطريق إلى العميل';
    case 'COLLECTION':
      return 'التحصيل والتسليم';
    case 'ISSUE':
      return 'طلب معلّق — بانتظار العمليات';
    default:
      return online ? 'متاح لاستلام الطلبات' : 'غير متصل';
  }
}

export function hubTitle(mode: AssignmentMode): string {
  switch (mode) {
    case 'DELIVER_ONLY':
      return 'استلام الطلب من نقطة التجميع';
    case 'COLLECT_ONLY':
      return 'تسليم الشنط في نقطة التجميع';
    default:
      return 'تأكيد نقطة التجميع';
  }
}

export function hubActionLabel(mode: AssignmentMode): string {
  switch (mode) {
    case 'DELIVER_ONLY':
      return 'تأكيد استلام الطلب من نقطة التجميع';
    case 'COLLECT_ONLY':
      return 'تسليم الطلب في نقطة التجميع';
    default:
      return 'بدء التوصيل للعميل';
  }
}

function toShopView(stop: TaskStop): ShopStopView {
  const shop = stop.shop;
  const items = (shop?.items ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    linePiastres: item.unitPrice * item.quantity,
  }));

  return {
    stopId: stop.id,
    vendorId: shop?.vendorId ?? '',
    shopName: shop?.name ?? 'متجر',
    phone: shop?.phone ?? null,
    itemsCount: shop?.itemsCount ?? items.length,
    status: stop.status,
    statusLabel: shopStatusLabel(stop.status),
    isDone: stop.status === 'DONE' || stop.status === 'SKIPPED',
    lat: stop.location.lat,
    lng: stop.location.lng,
    items,
    subtotalPiastres: shop?.subtotal ?? items.reduce((sum, item) => sum + item.linePiastres, 0),
  };
}

function shopStatusLabel(status: StopStatus): string {
  switch (status) {
    case 'DONE':
      return 'تم الاستلام';
    case 'SKIPPED':
      return 'تم التخطي';
    case 'ARRIVED':
      return 'وصلت للمتجر';
    default:
      return 'بانتظار الاستلام';
  }
}
