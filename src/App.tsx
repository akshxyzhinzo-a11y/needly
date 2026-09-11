import { useCallback, useEffect, useRef, useState } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { navigate, useRoute } from "@/lib/router";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";
import Header from "@/components/Header";
import Toast, { type ToastMessage } from "@/components/Toast";
import { GhostButton } from "@/components/ui";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import HomePage from "@/pages/HomePage";
import BrowsePage from "@/pages/BrowsePage";
import ListingPage from "@/pages/ListingPage";
import { ForgotPage, LoginPage, RegisterPage, ResetPage } from "@/pages/AuthPages";
import ProfilePage from "@/pages/ProfilePage";
import BookingsPage from "@/pages/BookingsPage";
import SavedPage from "@/pages/SavedPage";
import OwnerPage from "@/pages/OwnerPage";
import ListingFormPage from "@/pages/ListingFormPage";
import AdminPage from "@/pages/AdminPage";
import { runSmokeTests } from "@/server/smoke";

const CITY_KEY = "needly.city";

function Shell() {
  const route = useRoute();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const [city, setCity] = useState<string>(() => {
    return safeGetItem(CITY_KEY) || "Coimbatore";
  });

  const notify = useCallback((text: string) => {
    window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text });
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  // Dev QA hook — see README §Testing.
  useEffect(() => {
    window.__needlySmoke = runSmokeTests;
  }, []);

  const pickCity = useCallback((next: string) => {
    setCity(next);
    safeSetItem(CITY_KEY, next);
  }, []);

  const seg = route.segments;
  let page: React.ReactNode;

  if (seg.length === 0) {
    page = <HomePage city={city} onCity={pickCity} notify={notify} />;
  } else if (seg[0] === "search") {
    page = <BrowsePage city={city} notify={notify} />;
  } else if (seg[0] === "listing" && seg[1]) {
    page = <ListingPage key={seg[1]} notify={notify} />;
  } else if (seg[0] === "login") {
    page = <LoginPage notify={notify} />;
  } else if (seg[0] === "register") {
    page = <RegisterPage notify={notify} />;
  } else if (seg[0] === "forgot") {
    page = <ForgotPage notify={notify} />;
  } else if (seg[0] === "reset") {
    page = <ResetPage notify={notify} />;
  } else if (seg[0] === "profile") {
    page = <ProfilePage notify={notify} />;
  } else if (seg[0] === "bookings") {
    page = <BookingsPage notify={notify} />;
  } else if (seg[0] === "saved") {
    page = <SavedPage notify={notify} />;
  } else if (seg[0] === "owner" && !seg[1]) {
    page = <OwnerPage notify={notify} />;
  } else if (seg[0] === "owner" && (seg[1] === "new" || seg[1] === "edit")) {
    page = <ListingFormPage key={route.path} notify={notify} />;
  } else if (seg[0] === "admin") {
    page = <AdminPage notify={notify} />;
  } else {
    page = (
      <div className="mx-auto flex min-h-[55vh] max-w-[520px] flex-col items-center justify-center px-5 py-20 text-center">
        <p className="font-hand text-[64px] leading-none text-accent-deep">404</p>
        <h1 className="mt-2 text-[24px] font-extrabold tracking-[-0.02em] text-ink">
          This page wandered off
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-gray-500">
          The route <span className="font-bold text-ink">#{route.path}</span> doesn't exist. Let's
          get you back to things people are renting nearby.
        </p>
        <GhostButton className="mt-6" onClick={() => navigate("/")}>
          Back to home
        </GhostButton>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-ink">
      <Header city={city} onCity={pickCity} notify={notify} />
      <main>{page}</main>
      <Toast toast={toast} />
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
