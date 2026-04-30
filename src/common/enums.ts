// Centralized shared enums/constants for backend modules
// Use this file as the single source of truth for codes, types and role/permission keys.

export enum AssetCategoryCode {
  LAPTOP = 'LAP',
  DESKTOP = 'DESK',
  OTHER = 'OTHER',
}

export enum AssetStatusCode {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  IN_MAINTENANCE = 'IN_MAINTENANCE',
  RETIRED = 'RETIRED',
}

export enum LocationType {
  OFFICE = 'OFFICE',
  BRANCH = 'BRANCH',
  BUILDING = 'BUILDING',
  FLOOR = 'FLOOR',
}

export enum RoomType {
  MEETING = 'MEETING',
  CONFERENCE = 'CONFERENCE',
  TRAINING = 'TRAINING',
  STORAGE = 'STORAGE',
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE',
}

export enum RoleKey {
  SUPER_ADMIN = 'super:admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
}

export enum AssetTimelineEventType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  ASSIGNED = 'ASSIGNED',
  UNASSIGNED = 'UNASSIGNED',
  MOVED = 'MOVED',
  MAINTAINED = 'MAINTAINED',
  RETIRED = 'RETIRED',
}

export enum AssetDepreciationMethod {
  STRAIGHT_LINE = 'STRAIGHT_LINE',
}

export enum AssetLifecycleState {
  REQUESTED = 'REQUESTED',
  PURCHASED = 'PURCHASED',
  RECEIVED = 'RECEIVED',
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  MAINTENANCE = 'MAINTENANCE',
  RETIRED = 'RETIRED',
  DISPOSED = 'DISPOSED',
  LOST = 'LOST',
}

export enum MaintenanceRequestStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MaintenanceRequestPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum ContractType {
  MAINTENANCE = 'MAINTENANCE',
  SUPPORT = 'SUPPORT',
  LICENSE = 'LICENSE',
  RENTAL = 'RENTAL',
  SERVICE = 'SERVICE',
}

export enum ContractStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  RENEWED = 'RENEWED',
  CANCELLED = 'CANCELLED',
  TERMINATED = 'TERMINATED',
}

export const LaptopCategoryCodes = [AssetCategoryCode.LAPTOP];

export default {
  AssetCategoryCode,
  AssetStatusCode,
  LocationType,
  RoomType,
  EmployeeStatus,
  RoleKey,
  AssetTimelineEventType,
  AssetDepreciationMethod,
  AssetLifecycleState,
  MaintenanceRequestStatus,
  MaintenanceRequestPriority,
  ContractType,
  ContractStatus,
};
