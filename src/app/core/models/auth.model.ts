export type DriverRole = 'COLLECTOR' | 'DELIVERY' | 'BOTH';

export type CaptainEmploymentType = 'FIXED' | 'FREELANCER';

export type CaptainVehicleType = 'MOTORCYCLE' | 'CAR' | 'BICYCLE' | 'NONE';

export interface CaptainLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  role: DriverRole;
  mustChangePassword: boolean;
}

export interface CaptainProfile {
  id: string;
  phone: string;
  fullName: string;
  role: DriverRole;
  vehicleType: CaptainVehicleType;
  status: string;
  hubId: string | null;
  mustChangePassword: boolean;
  /** Monthly salary is paid outside the app for `FIXED` captains. */
  employmentType?: CaptainEmploymentType;
}

export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

/** Open shift returned by `GET /v1/captain/availability`. */
export interface CaptainOpenShift {
  id: string;
  startedAt: string;
}

/** Source of truth for the captain online switch and the open shift. */
export interface CaptainAvailability {
  online: boolean;
  shift: CaptainOpenShift | null;
}
