import {
  Armchair,
  Car,
  Ellipsis,
  KeyRound,
  LayoutGrid,
  PartyPopper,
  Tv,
  UserRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const CATEGORIES: Category[] = [
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "rent", label: "Rent", icon: KeyRound },
  { id: "hire", label: "Hire", icon: UserRound },
  { id: "services", label: "Services", icon: Wrench },
  { id: "electronics", label: "Electronics", icon: Tv },
  { id: "vehicles", label: "Vehicles", icon: Car },
  { id: "events", label: "Events", icon: PartyPopper },
  { id: "home", label: "Home & Living", icon: Armchair },
  { id: "more", label: "More", icon: Ellipsis },
];

export const CITIES = [
  "Coimbatore",
  "Chennai",
  "Bengaluru",
  "Madurai",
  "Kochi",
  "Salem",
  "Tiruppur",
];
