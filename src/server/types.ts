/** Relational entity model for the Needly data store. */

export type Role = "user" | "owner" | "admin";
export type UserStatus = "active" | "suspended";

export interface User {
  id: string;
  name: string;
  email: string; // unique, normalised lowercase
  phone: string;
  city: string;
  area: string;
  roles: Role[]; // a renter can also be an owner; admin is separate
  passwordHash: string;
  status: UserStatus;
  avatarColor: string; // deterministic color for the avatar chip
  createdAt: number;
}

export type ListingKind = "rent" | "hire" | "service";
export type PricingUnit = "day" | "job";

export interface Category {
  id: string; // slug
  label: string;
  icon: string; // lucide icon name, resolved client-side
  enabled: boolean;
  order: number;
}

export type ListingStatus = "active" | "paused" | "removed";

export interface Listing {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  categoryId: string;
  kind: ListingKind;
  price: number; // per `unit`
  unit: PricingUnit;
  city: string;
  area: string;
  images: string[]; // dataURLs or /images/*.jpg paths; [0] is primary
  blockedDates: string[]; // owner-blocked "YYYY-MM-DD" days
  status: ListingStatus;
  ratingAvg: number; // denormalised, maintained by review writes
  ratingCount: number;
  createdAt: number;
  updatedAt: number;
}

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "completed";

export type PaymentStatus = "pay_on_pickup" | "collected";

export interface Booking {
  id: string;
  listingId: string;
  renterId: string;
  ownerId: string;
  startDate: string; // "YYYY-MM-DD" (inclusive)
  endDate: string; // "YYYY-MM-DD" (inclusive)
  days: number;
  subtotal: number; // price * days (or fixed job price)
  fee: number; // platform service fee
  total: number; // subtotal + fee — computed server-side only
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  note: string;
  reviewedByRenter: boolean;
  createdAt: number;
  updatedAt: number;
  cancelledBy?: string; // userId
}

export interface Review {
  id: string;
  bookingId: string;
  listingId: string;
  authorId: string;
  rating: number; // 1..5
  text: string;
  createdAt: number;
}

export type NotificationType =
  | "booking_request"
  | "booking_accepted"
  | "booking_rejected"
  | "booking_cancelled"
  | "booking_completed"
  | "review_new"
  | "account"
  | "moderation";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  text: string;
  link: string; // in-app hash route
  read: boolean;
  createdAt: number;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

export interface Favorite {
  userId: string;
  listingId: string;
  createdAt: number;
}

export interface PasswordReset {
  token: string;
  userId: string;
  expiresAt: number;
}

export interface Database {
  version: number;
  users: User[];
  categories: Category[];
  listings: Listing[];
  bookings: Booking[];
  reviews: Review[];
  notifications: AppNotification[];
  sessions: Session[];
  favorites: Favorite[];
  passwordResets: PasswordReset[];
  seededAt: number;
}

/** Shared API error shape — predictable across every endpoint. */
export interface ApiErrorShape {
  status: number;
  message: string;
  field?: string;
}
