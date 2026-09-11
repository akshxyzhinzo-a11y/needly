/**
 * Centralised development seed. Recreates the marketplace content shown on the
 * homepage (the six "Popular near you" listings keep their reference order)
 * plus users, bookings, reviews and notifications. No mock data lives in
 * components — everything flows from this database.
 */
import { DB_VERSION } from "./config";
import { addDays, isSeeded, now, replaceDb, todayStr, uid } from "./db";
import { hashPassword } from "./auth";
import type {
  AppNotification,
  Booking,
  Category,
  Database,
  Favorite,
  Listing,
  Review,
  User,
} from "./types";

const T = now();
const MIN = 60_000;
const DAY = 86_400_000;

export function seedIfNeeded(): void {
  if (!isSeeded()) replaceDb(buildSeed());
}

function buildSeed(): Database {
  /* ------------------------------- users ------------------------------ */
  const admin: User = {
    id: "usr_admin",
    name: "Priya Nair",
    email: "admin@needly.in",
    phone: "98400 11223",
    city: "Coimbatore",
    area: "RS Puram",
    roles: ["user", "admin"],
    passwordHash: hashPassword("admin123"),
    status: "active",
    avatarColor: "#7c5cff",
    createdAt: T - 300 * DAY,
  };
  const arjun: User = {
    id: "usr_arjun",
    name: "Arjun Kumar",
    email: "arjun@needly.in",
    phone: "90032 45678",
    city: "Coimbatore",
    area: "Gandhipuram",
    roles: ["user", "owner"],
    passwordHash: hashPassword("owner123"),
    status: "active",
    avatarColor: "#30b8ef",
    createdAt: T - 260 * DAY,
  };
  const meera: User = {
    id: "usr_meera",
    name: "Meera Subramaniam",
    email: "meera@needly.in",
    phone: "97880 33445",
    city: "Coimbatore",
    area: "RS Puram",
    roles: ["user", "owner"],
    passwordHash: hashPassword("owner123"),
    status: "active",
    avatarColor: "#f97362",
    createdAt: T - 210 * DAY,
  };
  const rahul: User = {
    id: "usr_rahul",
    name: "Rahul Sharma",
    email: "demo@needly.in",
    phone: "98940 22110",
    city: "Coimbatore",
    area: "Peelamedu",
    roles: ["user"],
    passwordHash: hashPassword("demo1234"),
    status: "active",
    avatarColor: "#12b886",
    createdAt: T - 120 * DAY,
  };

  /* ---------------------------- categories ---------------------------- */
  const categories: Category[] = [
    { id: "tools", label: "Tools", icon: "Wrench", enabled: true, order: 1 },
    { id: "electronics", label: "Electronics", icon: "Tv", enabled: true, order: 2 },
    { id: "vehicles", label: "Vehicles", icon: "Car", enabled: true, order: 3 },
    { id: "events", label: "Events", icon: "PartyPopper", enabled: true, order: 4 },
    { id: "home-living", label: "Home & Living", icon: "Armchair", enabled: true, order: 5 },
    { id: "other", label: "Other", icon: "Package", enabled: true, order: 6 },
  ];

  /* ----------------------------- listings ----------------------------- */
  type ListingSeed = Omit<
    Listing,
    "ratingAvg" | "ratingCount" | "status" | "blockedDates" | "updatedAt"
  > &
    Partial<Pick<Listing, "status" | "blockedDates" | "ratingAvg" | "ratingCount">>;

  const L = (partial: ListingSeed): Listing => ({
    status: "active",
    blockedDates: [],
    ratingAvg: 0,
    ratingCount: 0,
    updatedAt: partial.createdAt,
    ...partial,
  });

  const listings: Listing[] = [
    // The six homepage listings, in reference order (oldest first).
    L({
      id: "lst_drill",
      ownerId: arjun.id,
      title: "Drill Machine",
      description:
        "Bosch GSB 13 RE professional impact drill, 600W. Perfect for wall mounting, furniture assembly and light masonry work. Comes with a full bit set and carrying case. Pick-up from Gandhipuram; I can explain the torque settings before you take it.",
      categoryId: "tools",
      kind: "rent",
      price: 150,
      unit: "day",
      city: "Coimbatore",
      area: "Gandhipuram",
      images: ["/images/drill.jpg"],
      createdAt: T - 240 * DAY,
    }),
    L({
      id: "lst_camera",
      ownerId: arjun.id,
      title: "DSLR Camera",
      description:
        "Canon EOS 200D with 50mm f/1.8 prime lens, 64GB card, extra battery and shoulder bag included. Great for birthdays, trips and small events. Sensor cleaned recently. Beginners welcome — it's fully automatic if you need it to be.",
      categoryId: "electronics",
      kind: "rent",
      price: 500,
      unit: "day",
      city: "Coimbatore",
      area: "Gandhipuram",
      images: ["/images/camera.jpg"],
      createdAt: T - 235 * DAY,
    }),
    L({
      id: "lst_tent",
      ownerId: arjun.id,
      title: "Camping Tent",
      description:
        "Quechua 2-person dome tent with rain fly and ground sheet. Packs down small enough for a scooter. Ideal for Valparai or Anamalai weekend trips. I'll show you the 3-minute pitch when you pick it up.",
      categoryId: "events",
      kind: "rent",
      price: 300,
      unit: "day",
      city: "Coimbatore",
      area: "Peelamedu",
      images: ["/images/tent.jpg"],
      blockedDates: [addDays(todayStr(), 20)],
      createdAt: T - 230 * DAY,
    }),
    L({
      id: "lst_scooter",
      ownerId: arjun.id,
      title: "Scooter",
      description:
        "Well-maintained automatic scooter, recent service, both helmets included [valid DL required]. ~55 km/l, perfect for city errands or a day's shopping run. Fuel at pickup level, please return the same.",
      categoryId: "vehicles",
      kind: "hire",
      price: 400,
      unit: "day",
      city: "Coimbatore",
      area: "Saibaba Colony",
      images: ["/images/scooter.jpg"],
      createdAt: T - 225 * DAY,
    }),
    L({
      id: "lst_sofa",
      ownerId: meera.id,
      title: "Sofa (3 Seater)",
      description:
        "Comfortable fabric 3-seater in a warm greige — great when guests visit or for a short-term flat. Cleaned and vacuumed after every rental. Two people can lift it; a mini-truck can be arranged if needed.",
      categoryId: "home-living",
      kind: "rent",
      price: 600,
      unit: "day",
      city: "Coimbatore",
      area: "RS Puram",
      images: ["/images/sofa.jpg"],
      createdAt: T - 220 * DAY,
    }),
    L({
      id: "lst_ladder",
      ownerId: arjun.id,
      title: "Ladder",
      description:
        "Sturdy aluminium 5-step ladder, anti-slip feet, folds flat. Reach roughly 10 feet — good for painting, cleaning lofts, hanging lights or retrieving kites from trees.",
      categoryId: "tools",
      kind: "rent",
      price: 100,
      unit: "day",
      city: "Coimbatore",
      area: "Ukkadam",
      images: ["/images/ladder.jpg"],
      createdAt: T - 215 * DAY,
    }),
    L({
      id: "lst_projector",
      ownerId: arjun.id,
      title: "HD Projector",
      description:
        "Full-HD 1080p projector with HDMI + Fire-stick slot and 3.5m screen fold. Movie nights, match screenings and office presentations. Works best in a dim room — I'll include an extension board.",
      categoryId: "electronics",
      kind: "rent",
      price: 450,
      unit: "day",
      city: "Chennai",
      area: "Velachery",
      images: ["/images/projector.jpg"],
      createdAt: T - 160 * DAY,
    }),
    L({
      id: "lst_bicycle",
      ownerId: meera.id,
      title: "Hybrid Bicycle",
      description:
        "21-speed hybrid cycle, medium frame (suits 5'4\"–6'0\"). Lock, helmet and a small repair kit included. Brakes and gears serviced last month — smooth on Race Course loops.",
      categoryId: "vehicles",
      kind: "rent",
      price: 120,
      unit: "day",
      city: "Coimbatore",
      area: "Race Course",
      images: ["/images/bicycle.jpg"],
      createdAt: T - 150 * DAY,
    }),
    L({
      id: "lst_speaker",
      ownerId: arjun.id,
      title: "Party Speaker",
      description:
        "60W party speaker with punchy bass, wireless mic, Bluetooth + USB. 10-hour battery. Perfect for terrace birthdays and society events. Delivered fully charged.",
      categoryId: "events",
      kind: "rent",
      price: 250,
      unit: "day",
      city: "Bengaluru",
      area: "Indiranagar",
      images: ["/images/speaker.jpg"],
      createdAt: T - 140 * DAY,
    }),
    L({
      id: "lst_cleaning",
      ownerId: meera.id,
      title: "Home Deep Cleaning",
      description:
        "Two-person professional deep-clean team with our own machines and chemicals. Covers kitchen degrease, bathroom descaling, sofa shampooing and balcony wash. A 2BHK typically takes 4–5 hours. Book a day, we arrive by 9 AM.",
      categoryId: "home-living",
      kind: "service",
      price: 1499,
      unit: "job",
      city: "Coimbatore",
      area: "RS Puram",
      images: [],
      createdAt: T - 90 * DAY,
    }),
    L({
      id: "lst_ac",
      ownerId: meera.id,
      title: "AC Service & Repair",
      description:
        "Certified technician: split/window AC general service, gas top-up, cooling issues and uninstall/reinstall for shifting homes. Genuine spares billed at MRP with invoice. Same-day slots usually available.",
      categoryId: "other",
      kind: "service",
      price: 499,
      unit: "job",
      city: "Coimbatore",
      area: "Peelamedu",
      images: [],
      createdAt: T - 80 * DAY,
    }),
    L({
      id: "lst_washer",
      ownerId: arjun.id,
      title: "Pressure Washer",
      description:
        "120-bar pressure washer for car/bike washing, portico and grill cleaning. 8m hose, foam bottle included. Uses a normal 5A socket. Returns wet is fine — returns broken is not!",
      categoryId: "tools",
      kind: "rent",
      price: 350,
      unit: "day",
      city: "Coimbatore",
      area: "Gandhipuram",
      images: [],
      createdAt: T - 60 * DAY,
    }),
  ];

  /* ----------------------------- bookings ----------------------------- */
  type BookingSeed = Omit<Booking, "reviewedByRenter" | "updatedAt" | "note"> &
    Partial<Pick<Booking, "reviewedByRenter" | "updatedAt" | "note">>;

  const B = (partial: BookingSeed): Booking => ({
    reviewedByRenter: false,
    note: "",
    updatedAt: partial.createdAt,
    ...partial,
  });

  const bookings: Booking[] = [
    B({
      id: "bok_camera_done",
      listingId: "lst_camera",
      renterId: rahul.id,
      ownerId: arjun.id,
      startDate: addDays(todayStr(), -21),
      endDate: addDays(todayStr(), -19),
      days: 3,
      subtotal: 1500,
      fee: 120,
      total: 1620,
      status: "completed",
      paymentStatus: "collected",
      reviewedByRenter: true,
      createdAt: T - 24 * DAY,
    }),
    B({
      id: "bok_drill_up",
      listingId: "lst_drill",
      renterId: rahul.id,
      ownerId: arjun.id,
      startDate: addDays(todayStr(), 5),
      endDate: addDays(todayStr(), 6),
      days: 2,
      subtotal: 300,
      fee: 24,
      total: 324,
      status: "confirmed",
      paymentStatus: "pay_on_pickup",
      createdAt: T - 2 * DAY,
    }),
    B({
      id: "bok_tent_pend",
      listingId: "lst_tent",
      renterId: rahul.id,
      ownerId: arjun.id,
      startDate: addDays(todayStr(), 12),
      endDate: addDays(todayStr(), 14),
      days: 3,
      subtotal: 900,
      fee: 72,
      total: 972,
      status: "pending",
      paymentStatus: "pay_on_pickup",
      createdAt: T - 6 * 60 * MIN,
    }),
    B({
      id: "bok_sofa_done",
      listingId: "lst_sofa",
      renterId: rahul.id,
      ownerId: meera.id,
      startDate: addDays(todayStr(), -40),
      endDate: addDays(todayStr(), -36),
      days: 5,
      subtotal: 3000,
      fee: 240,
      total: 3240,
      status: "completed",
      paymentStatus: "collected",
      reviewedByRenter: true,
      createdAt: T - 45 * DAY,
    }),
    B({
      id: "bok_cycle_conf",
      listingId: "lst_bicycle",
      renterId: rahul.id,
      ownerId: meera.id,
      startDate: addDays(todayStr(), 2),
      endDate: addDays(todayStr(), 2),
      days: 1,
      subtotal: 120,
      fee: 10,
      total: 130,
      status: "confirmed",
      paymentStatus: "pay_on_pickup",
      createdAt: T - 1 * DAY,
    }),
  ];

  /* ------------------------------ reviews ----------------------------- */
  const reviews: Review[] = [
    {
      id: "rev_camera_1",
      bookingId: "bok_camera_done",
      listingId: "lst_camera",
      authorId: rahul.id,
      rating: 5,
      text: "Camera was spotless and Arjun even threw in a spare memory card. Pickup took two minutes — would rent again.",
      createdAt: T - 18 * DAY,
    },
    {
      id: "rev_sofa_1",
      bookingId: "bok_sofa_done",
      listingId: "lst_sofa",
      authorId: rahul.id,
      rating: 4,
      text: 'Exactly like the photos and genuinely clean. One leg was slightly wobbly but Meera warned me upfront. Smooth overall.',
      createdAt: T - 35 * DAY,
    },
  ];

  /* --------------------------- notifications -------------------------- */
  const N = (partial: Omit<AppNotification, "id" | "read">): AppNotification => ({
    id: uid("ntf"),
    read: false,
    ...partial,
  });

  const notifications: AppNotification[] = [
    N({
      userId: arjun.id,
      type: "booking_request",
      text: "Rahul Sharma requested Camping Tent for 3 days · ₹972",
      link: "#/owner",
      createdAt: T - 6 * 60 * MIN,
    }),
    N({
      userId: rahul.id,
      type: "booking_accepted",
      text: "Arjun Kumar confirmed your Drill Machine booking · starts " + addDays(todayStr(), 5),
      link: "#/bookings",
      createdAt: T - 1 * DAY,
    }),
    N({
      userId: meera.id,
      type: "booking_accepted",
      text: "Hybrid Bicycle — pickup scheduled for " + addDays(todayStr(), 2),
      link: "#/owner",
      createdAt: T - 20 * 60 * MIN,
    }),
  ];

  const favorites: Favorite[] = [
    { userId: rahul.id, listingId: "lst_projector", createdAt: T - 10 * DAY },
    { userId: rahul.id, listingId: "lst_speaker", createdAt: T - 9 * DAY },
  ];

  return {
    version: DB_VERSION,
    users: [admin, arjun, meera, rahul],
    categories,
    listings,
    bookings,
    reviews,
    notifications,
    sessions: [],
    favorites,
    passwordResets: [],
    seededAt: T,
  };
}

/** Ratings are derived from reviews — recompute whenever reviews change. */
export function recomputeRating(db: Database, listingId: string): void {
  const listing = db.listings.find((l) => l.id === listingId);
  if (!listing) return;
  const rs = db.reviews.filter((r) => r.listingId === listingId);
  listing.ratingCount = rs.length;
  listing.ratingAvg = rs.length
    ? Math.round((rs.reduce((sum, r) => sum + r.rating, 0) / rs.length) * 10) / 10
    : 0;
}
