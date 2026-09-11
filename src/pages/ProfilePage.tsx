import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, Loader2, Save } from "lucide-react";
import { ApiError, api } from "@/lib/client";
import { useAuth, type AppUser } from "@/lib/auth-context";
import { navigate } from "@/lib/router";
import {
  AccentButton, Field, InlineNotice, TextInput, usePageTitle,
} from "@/components/ui";
import { CITIES } from "@/data/site";

export default function ProfilePage({ notify }: { notify: (t: string) => void }) {
  usePageTitle("Profile");
  const { user, booting, setUser } = useAuth();

  const [profile, setProfile] = useState({ name: "", phone: "", city: "Coimbatore", area: "" });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState<Record<string, string>>({});
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    if (!booting && !user) navigate("/login?next=/profile", { replace: true });
  }, [booting, user]);

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name, phone: user.phone, city: user.city, area: user.area });
    }
  }, [user]);

  if (!user) return null;

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileBusy(true);
    setProfileError({});
    try {
      const res = await api<{ user: AppUser }>("/users/me", {
        method: "PATCH",
        body: profile,
      });
      setUser(res.user);
      notify("Profile updated");
    } catch (err) {
      if (err instanceof ApiError && err.field) setProfileError({ [err.field]: err.message });
      else notify(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setProfileBusy(false);
    }
  };

  const changePw = async (e: FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (pw.next !== pw.confirm) {
      setPwError("New passwords don't match.");
      return;
    }
    setPwBusy(true);
    try {
      await api("/users/me/password", {
        method: "POST",
        body: { current: pw.current, next: pw.next },
      });
      setPw({ current: "", next: "", confirm: "" });
      notify("Password changed");
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : "Couldn't change the password.");
    } finally {
      setPwBusy(false);
    }
  };

  const initials = user.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("");

  return (
    <div className="bg-[#fbfdfe]">
      <div className="mx-auto max-w-[860px] px-5 py-9">
        <div className="flex items-center gap-4">
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full text-[20px] font-extrabold text-white"
            style={{ background: user.avatarColor }}
          >
            {initials}
          </span>
          <div>
            <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-ink">{user.name}</h1>
            <p className="text-[13.5px] font-medium text-gray-500">
              {user.email} · {user.roles.includes("admin") ? "Administrator" : user.roles.includes("owner") ? "Owner" : "Renter"} ·
              since {new Date(user.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {/* ---------------------------- profile form ---------------------------- */}
          <form
            onSubmit={(e) => void saveProfile(e)}
            className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-card"
          >
            <h2 className="flex items-center gap-2 text-[16px] font-extrabold text-ink">
              <Save className="h-4 w-4 text-accent-deep" /> Profile details
            </h2>
            <Field label="Full name" error={profileError.name}>
              <TextInput
                value={profile.name} required
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              />
            </Field>
            <Field label="Phone" error={profileError.phone}>
              <TextInput
                type="tel" value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                placeholder="98xxx xxxxx"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" error={profileError.city}>
                <input
                  list="city-choices"
                  value={profile.city}
                  onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-[14px] font-medium outline-none focus:border-accent"
                />
              </Field>
              <Field label="Area" hint="Optional">
                <TextInput
                  value={profile.area}
                  onChange={(e) => setProfile((p) => ({ ...p, area: e.target.value }))}
                  placeholder="RS Puram"
                />
              </Field>
              <datalist id="city-choices">
                {CITIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <AccentButton type="submit" disabled={profileBusy} className="w-full">
              {profileBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </AccentButton>
          </form>

          {/* ---------------------------- password form --------------------------- */}
          <form
            onSubmit={(e) => void changePw(e)}
            className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-card"
          >
            <h2 className="flex items-center gap-2 text-[16px] font-extrabold text-ink">
              <KeyRound className="h-4 w-4 text-accent-deep" /> Change password
            </h2>
            {pwError && <InlineNotice kind="error" text={pwError} />}
            <Field label="Current password">
              <TextInput
                type="password" autoComplete="current-password" required value={pw.current}
                onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
              />
            </Field>
            <Field label="New password" hint="At least 8 characters">
              <TextInput
                type="password" autoComplete="new-password" required value={pw.next}
                onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
              />
            </Field>
            <Field label="Confirm new password">
              <TextInput
                type="password" autoComplete="new-password" required value={pw.confirm}
                onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
              />
            </Field>
            <button
              type="submit"
              disabled={pwBusy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-gray-200 text-[14px] font-bold text-ink transition hover:border-gray-300 hover:bg-gray-50 disabled:opacity-60"
            >
              {pwBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
