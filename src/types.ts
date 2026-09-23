export type Role = "SUPER_ADMIN" | "ADMIN" | "SELLER";
export type Visibility = "DRAFT" | "PUBLISHED" | "HIDDEN";
export type SubStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "PENDING"
  | "CANCELLED";
export type JobStatus =
  | "QUEUED"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED";
export type DimensionUnit = "MM" | "CM" | "M";

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  seller: {
    id: string;
    slug: string;
    storeName: string;
  } | null;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  parentId: string | null;
  _count?: {
    products: number;
    sellers?: number;
  };
}

export interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductModel {
  id: string;
  kind: "GLB" | "GLTF" | "USDZ";
  url: string;
  posterImageUrl: string | null;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  fullDescription: string | null;
  tags: string | null;
  categoryId: string | null;
  category?: Category | null;
  seller?: {
    id: string;
    slug: string;
    storeName: string;
  };
  sellerId: string;
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
  inputUnit: DimensionUnit | null;
  visibility: Visibility;
  hasUnpublishedChanges: boolean;
  images: ProductImage[];
  models: ProductModel[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface Seller {
  id: string;
  slug: string;
  storeName: string;
  description: string | null;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  sellerCategory?: Category | null;
  sellerCategoryId?: string | null;
  socialLinks: Record<string, string> | null;
  isActive: boolean;
  user?: {
    email: string;
    isActive: boolean;
    createdAt: string;
  };
  _count?: {
    products: number;
  };
  subscriptions?: Subscription[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  discountPct: number | null;
  productLimit: number | null;
  storageLimitMb: number | null;
  isActive: boolean;
}

export interface Subscription {
  id: string;
  sellerId: string;
  planId: string;
  plan?: SubscriptionPlan;
  status: SubStatus;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
}

export interface PublishJob {
  id: string;
  sellerId: string;
  productId: string | null;
  product?: {
    name: string;
    slug: string;
  } | null;
  seller?: {
    storeName: string;
  };
  status: JobStatus;
  commitSha: string | null;
  errorMessage: string | null;
  requestedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  logs?: {
    id: string;
    message: string;
    level: string;
    createdAt: string;
  }[];
}

export interface PlatformSettings {
  platformName: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorBackground: string;
  colorText: string;
  fontFamily: string;
  socialLinks?: Record<string, string> | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  githubOwner?: string | null;
  githubRepository?: string | null;
  githubBranch?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  actor?: {
    email: string;
    role: Role;
  } | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface HealthReport {
  status: "ok" | "degraded";
  uptimeMs: number;
  services: {
    database: {
      status: string;
      latencyMs: number | null;
    };
    storage: {
      provider: string;
      status: string;
    };
    github: {
      configured: boolean;
      status: string;
      message?: string;
    };
  };
}
