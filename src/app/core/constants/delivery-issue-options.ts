import { DeliveryIssueOption } from '../models';

export const DELIVERY_ISSUE_OPTIONS: DeliveryIssueOption[] = [
  { type: 'CUSTOMER_UNREACHABLE', label: 'العميل لا يرد / هاتفه مغلق' },
  { type: 'WRONG_GPS', label: 'موقع العميل (GPS) خاطئ' },
  { type: 'CUSTOMER_REFUSED', label: 'العميل يرفض الاستلام' },
  { type: 'VEHICLE_BREAKDOWN', label: 'عطل طارئ في المركبة' },
];
