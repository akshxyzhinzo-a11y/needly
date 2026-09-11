import { useState, type FormEvent, type ReactNode } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { ApiError, api } from "@/lib/client";
import { useAuth } from "@/lib/auth-context";
import { Link, navigate, useRoute } from "@/lib/router";
import { Field, InlineNotice, TextInput, usePageTitle } from "@/components/ui";

/* ------------------------------ shared shell ------------------------------ */

function AuthShell({
  title, subtitle, children, footer,
}: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="relative overflow-hidden bg-[#f6fafd]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#dff0fb] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-[#e8f4fc] blur-3xl"
      />
      <div className="relative mx-auto flex min-h-[calc(100vh-68px)] max-w-[460px] flex-col justify-center px-5 py-14">
        <div className="rounded-[28px] border border-gray-100 bg-white p-8 shadow-[0_24px_70px_-30px_rgba(10,40,70,0.3)]">
          <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-ink">{title}</h1>
          <p className="mt-1.5 text-[13.5px] font-medium text-gray-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
          <div className="mt-6 border-t border-gray-100 pt-5 text-center text-[13px] font-medium text-gray-500">
            {footer}
          </div>
        </div>
        <p className="mt-5 text-center text-[11.5px] font-medium text-gray-400">
          Demo accounts — renter demo@needly.in / demo1234 · owner arjun@needly.in / owner123 ·
          admin admin@needly.in / admin123
        </p>
      </div>
    </div>
  );
}

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <TextInput {...props} type={show ? "text" : "password"} className="pr-11" />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-ink"
      >
        {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
      </button>
    </div>
  );
}

function SubmitButton({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14.5px] font-bold text-white transition hover:bg-[#26282d] active:scale-[.98] disabled:opacity-60"
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </button>
  );
}

/* --------------------------------- login --------------------------------- */

export function LoginPage({ notify }: { notify: (t: string) => void }) {
  usePageTitle("Log in");
  const { login } = useAuth();
  const route = useRoute();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(email, password);
      notify(`Welcome back, ${user.name.split(" ")[0]}`);
      navigate(route.query.get("next") || "/");
    } catch (err) {
      setError({
        text: err instanceof ApiError ? err.message : "Couldn't log you in. Try again.",
        field: err instanceof ApiError ? err.field : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to book things nearby or manage your listings."
      footer={
        <>
          New to Needly?{" "}
          <Link to="/register" className="font-bold text-accent-deep hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
        {error && <InlineNotice kind="error" text={error.text} />}
        <Field label="Email" error={error?.field === "email" ? error.text : null}>
          <TextInput
            type="email" autoComplete="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password" error={error?.field === "password" ? error.text : null}>
          <PasswordInput
            autoComplete="current-password" required value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
          />
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot" className="text-[12.5px] font-bold text-accent-deep hover:underline">
            Forgot password?
          </Link>
        </div>
        <SubmitButton busy={busy} label="Log in" />
      </form>
    </AuthShell>
  );
}

/* -------------------------------- register -------------------------------- */

export function RegisterPage({ notify }: { notify: (t: string) => void }) {
  usePageTitle("Sign up");
  const { register } = useAuth();
  const route = useRoute();
  const [form, setForm] = useState({ name: "", email: "", phone: "", city: "Coimbatore", password: "" });
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldError({});
    try {
      const user = await register(form);
      notify(`Welcome to Needly, ${user.name.split(" ")[0]}`);
      navigate(route.query.get("next") || "/");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.field) setFieldError({ [err.field]: err.message });
        else setError(err.message);
      } else setError("Couldn't create your account. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="One account to rent, hire and offer things around you."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-accent-deep hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
        {error && <InlineNotice kind="error" text={error} />}
        <Field label="Full name" error={fieldError.name}>
          <TextInput
            autoComplete="name" required value={form.name} onChange={set("name")}
            placeholder="Ravi Chandran"
          />
        </Field>
        <Field label="Email" error={fieldError.email}>
          <TextInput
            type="email" autoComplete="email" required value={form.email} onChange={set("email")}
            placeholder="you@example.com"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone" error={fieldError.phone} hint="Optional">
            <TextInput
              type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")}
              placeholder="98xxx xxxxx"
            />
          </Field>
          <Field label="City" error={fieldError.city}>
            <TextInput value={form.city} onChange={set("city")} placeholder="Coimbatore" />
          </Field>
        </div>
        <Field label="Password" error={fieldError.password} hint="At least 8 characters">
          <PasswordInput
            autoComplete="new-password" required value={form.password} onChange={set("password")}
            placeholder="Create a password"
          />
        </Field>
        <SubmitButton busy={busy} label="Sign up" />
      </form>
    </AuthShell>
  );
}

/* --------------------------------- forgot --------------------------------- */

export function ForgotPage({ notify }: { notify: (t: string) => void }) {
  usePageTitle("Reset password");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ devToken: string | null }>("/auth/forgot", {
        method: "POST",
        body: { email },
      });
      setDone(true);
      setDevToken(res.devToken);
      notify("Reset link created");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Couldn't process that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your account email and we'll create a reset link."
      footer={
        <Link to="/login" className="font-bold text-accent-deep hover:underline">
          Back to log in
        </Link>
      }
    >
      {done ? (
        <div className="space-y-4">
          <InlineNotice
            kind="success"
            text="If an account exists for that email, a reset link has been created. It expires in 30 minutes."
          />
          {devToken && (
            <div className="rounded-2xl border border-dashed border-accent/40 bg-[#f4fafd] p-4">
              <p className="text-[12px] font-medium leading-relaxed text-gray-500">
                Email delivery isn't configured in this environment, so here's the link directly:
              </p>
              <Link
                to={`/reset?token=${devToken}`}
                className="mt-2 inline-block break-all text-[13px] font-bold text-accent-deep underline underline-offset-2"
              >
                Open password reset →
              </Link>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <Field label="Email">
            <TextInput
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <SubmitButton busy={busy} label="Create reset link" />
        </form>
      )}
    </AuthShell>
  );
}

/* --------------------------------- reset ---------------------------------- */

export function ResetPage({ notify }: { notify: (t: string) => void }) {
  usePageTitle("Choose a new password");
  const route = useRoute();
  const token = route.query.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/auth/reset", { method: "POST", body: { token, password } });
      setDone(true);
      notify("Password updated — log in with your new one");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reset the password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Pick something strong — at least 8 characters."
      footer={
        <Link to="/login" className="font-bold text-accent-deep hover:underline">
          Back to log in
        </Link>
      }
    >
      {done ? (
        <InlineNotice kind="success" text="Password updated. You can now log in with your new password." />
      ) : !token ? (
        <InlineNotice kind="error" text="This reset link is missing its token. Request a fresh link from the forgot-password page." />
      ) : (
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          {error && <InlineNotice kind="error" text={error} />}
          <Field label="New password">
            <PasswordInput
              autoComplete="new-password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
            />
          </Field>
          <SubmitButton busy={busy} label="Update password" />
        </form>
      )}
    </AuthShell>
  );
}
