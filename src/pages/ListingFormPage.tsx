import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarX, ImagePlus, Loader2, X } from "lucide-react";
import { ApiError, api } from "@/lib/client";
import { useAuth } from "@/lib/auth-context";
import { navigate, useRoute } from "@/lib/router";
import {
  AccentButton, Field, GhostButton, InlineNotice, Select, TextArea, TextInput, usePageTitle,
} from "@/components/ui";
import ListingCard, { type CardListing } from "@/components/ListingCard";
import { MAX_LISTING_IMAGES, MAX_PRICE, MIN_PRICE } from "@/server/config";
import { cn } from "@/utils/cn";
import { CITIES } from "@/data/site";

const GALLERY = [
  "/images/drill.jpg", "/images/camera.jpg", "/images/tent.jpg",
  "/images/scooter.jpg", "/images/sofa.jpg", "/images/ladder.jpg",
  "/images/projector.jpg", "/images/bicycle.jpg", "/images/speaker.jpg",
];

interface CategoryOption {
  id: string;
  label: string;
}

interface FormState {
  kind: "rent" | "hire" | "service";
  categoryId: string;
  title: string;
  description: string;
  price: string;
  city: string;
  area: string;
  images: string[];
  blockedDates: string[];
}

const EMPTY: FormState = {
  kind: "rent",
  categoryId: "",
  title: "",
  description: "",
  price: "",
  city: "Coimbatore",
  area: "",
  images: [],
  blockedDates: [],
};

/** Downscale + re-encode uploads so storage stays small and predictable. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      reject(new Error("Images must be JPG, PNG or WebP."));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error("That image is over 5 MB — pick a smaller one."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 960;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Couldn't process the image."));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => reject(new Error("That file doesn't look like a valid image."));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}

export default function ListingFormPage({ notify }: { notify: (t: string) => void }) {
  const route = useRoute();
  const editId = route.segments[1] === "edit" ? route.segments[2] : null;
  usePageTitle(editId ? "Edit listing" : "New listing");

  const { user, booting } = useAuth();
  const isOwner = !!user && (user.roles.includes("owner") || user.roles.includes("admin"));

  const [form, setForm] = useState<FormState>(EMPTY);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(!!editId);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [newBlock, setNewBlock] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!booting && !user) navigate(`/login?next=${route.path}`, { replace: true });
  }, [booting, user, route.path]);

  useEffect(() => {
    api<{ categories: CategoryOption[] }>("/categories")
      .then((res) => setCategories(res.categories))
      .catch(() => notify("Couldn't load categories"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadExisting = useCallback(async () => {
    if (!editId) return;
    try {
      const res = await api<{ listing: CardListing & Partial<FormState> & { blockedDates: string[]; description: string; categoryId?: string } }>(
        `/listings/${editId}`
      );
      const l = res.listing as unknown as {
        kind: FormState["kind"]; categoryId?: string; category: { id: string } | null;
        title: string; description: string; price: number; city: string; area: string;
        images: string[]; blockedDates: string[]; mine: boolean;
      };
      if (!l.mine && !user?.roles.includes("admin")) {
        setNotFound(true);
        return;
      }
      setForm({
        kind: l.kind,
        categoryId: l.category?.id ?? l.categoryId ?? "",
        title: l.title,
        description: l.description,
        price: String(l.price),
        city: l.city,
        area: l.area,
        images: l.images,
        blockedDates: l.blockedDates ?? [],
      });
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [editId, user]);

  useEffect(() => {
    if (user && editId) void loadExisting();
  }, [user, editId, loadExisting]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  /* ------------------------------ validation ------------------------------ */

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (form.title.trim().length < 3) errs.title = "Give it a clear title (3+ characters).";
    if (form.description.trim().length < 20) errs.description = "Describe it properly — at least 20 characters.";
    if (!form.categoryId) errs.categoryId = "Pick a category.";
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < MIN_PRICE || price > MAX_PRICE) {
      errs.price = `Price must be between ₹${MIN_PRICE} and ₹${MAX_PRICE.toLocaleString("en-IN")}.`;
    }
    if (form.city.trim().length < 2) errs.city = "Add the city.";
    return errs;
  };

  /* --------------------------------- images --------------------------------- */

  const addUpload = async (file: File) => {
    try {
      const url = await fileToDataUrl(file);
      setForm((f) =>
        f.images.length >= MAX_LISTING_IMAGES
          ? (notify(`Max ${MAX_LISTING_IMAGES} images`), f)
          : { ...f, images: [...f.images, url] }
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : "Couldn't add that image.");
    }
  };

  const toggleGallery = (src: string) => {
    setForm((f) => {
      if (f.images.includes(src)) return { ...f, images: f.images.filter((i) => i !== src) };
      if (f.images.length >= MAX_LISTING_IMAGES) {
        notify(`Max ${MAX_LISTING_IMAGES} images`);
        return f;
      }
      return { ...f, images: [...f.images, src] };
    });
  };

  /* --------------------------------- submit --------------------------------- */

  const submit = async () => {
    setError(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError("Fix the highlighted fields and try again.");
      return;
    }
    setBusy(true);
    const body = {
      ...form,
      price: Number(form.price),
      title: form.title.trim(),
      description: form.description.trim(),
      area: form.area.trim(),
      city: form.city.trim(),
    };
    try {
      if (editId) {
        await api(`/listings/${editId}`, { method: "PATCH", body });
        notify("Listing updated");
      } else {
        await api("/listings", { method: "POST", body });
        notify("Listing published — you're live");
      }
      navigate("/owner");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.field) setFieldErrors({ [err.field]: err.message });
        setError(err.message);
      } else setError("Couldn't save the listing. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-[560px] px-5 py-20 text-center">
        <InlineNotice kind="error" text="Only owners can create listings. Switch to an owner account from the owner dashboard first." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[980px] animate-pulse px-5 py-10">
        <div className="h-8 w-56 rounded bg-gray-100" />
        <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="h-[560px] rounded-3xl bg-gray-100" />
          <div className="h-[420px] rounded-3xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-[560px] px-5 py-20 text-center">
        <InlineNotice kind="error" text="This listing doesn't exist or isn't yours to edit." />
      </div>
    );
  }

  const isService = form.kind === "service";
  const previewListing: CardListing = {
    id: "preview",
    title: form.title || "Your listing title",
    price: Number(form.price) || 0,
    unit: isService ? "job" : "day",
    kind: form.kind,
    city: form.city || "City",
    area: form.area,
    images: form.images,
    ratingAvg: 0,
    ratingCount: 0,
    category: categories.find((c) => c.id === form.categoryId)
      ? { id: form.categoryId, label: categories.find((c) => c.id === form.categoryId)!.label, icon: "Package" }
      : null,
  };

  return (
    <div className="bg-[#fbfdfe]">
      <div className="mx-auto max-w-[1040px] px-5 py-9">
        <button
          onClick={() => navigate("/owner")}
          className="mb-5 flex items-center gap-1.5 text-[13px] font-bold text-gray-500 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>

        <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-ink">
          {editId ? "Edit listing" : "Create a listing"}
        </h1>
        <p className="mt-1 text-[13.5px] font-medium text-gray-500">
          Everything is validated again on the server before it goes live.
        </p>

        <div className="mt-7 grid items-start gap-8 lg:grid-cols-[1.25fr_1fr]">
          {/* -------------------------------- form -------------------------------- */}
          <div className="space-y-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-card">
            {error && <InlineNotice kind="error" text={error} />}

            <div>
              <span className="mb-1.5 block text-[13px] font-bold text-gray-700">What are you offering?</span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "rent", label: "Item to rent", hint: "per day" },
                    { id: "hire", label: "Item to hire", hint: "per day" },
                    { id: "service", label: "A service", hint: "fixed / job" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => set("kind", opt.id)}
                    aria-pressed={form.kind === opt.id}
                    className={cn(
                      "rounded-2xl border px-3 py-3 text-left transition",
                      form.kind === opt.id
                        ? "border-accent bg-[#f0f9fe] shadow-[0_6px_16px_-6px_rgba(48,184,239,0.5)]"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <span className={cn("block text-[13.5px] font-extrabold", form.kind === opt.id ? "text-accent-deep" : "text-ink")}>
                      {opt.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-medium text-gray-400">{opt.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <Field label="Title" error={fieldErrors.title}>
              <TextInput
                value={form.title}
                maxLength={80}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Bosch Impact Drill 600W"
              />
            </Field>

            <Field label="Description" error={fieldErrors.description}
              hint="Condition, what's included, pickup instructions — renters read this.">
              <TextArea
                value={form.description}
                maxLength={1200}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Tell people what makes yours a good pick…"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Category" error={fieldErrors.categoryId}>
                <Select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                  <option value="">Choose…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </Select>
              </Field>
              <Field
                label={isService ? "Price (fixed per job)" : "Price per day (₹)"}
                error={fieldErrors.price}
              >
                <TextInput
                  type="number" min={MIN_PRICE} max={MAX_PRICE} inputMode="numeric"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="150"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="City" error={fieldErrors.city}>
                <Select value={form.city} onChange={(e) => set("city", e.target.value)}>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Area / neighbourhood" hint="Optional">
                <TextInput
                  value={form.area}
                  maxLength={80}
                  onChange={(e) => set("area", e.target.value)}
                  placeholder="RS Puram"
                />
              </Field>
            </div>

            {/* images */}
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-bold text-gray-700">
                  Photos <span className="font-medium text-gray-400">({form.images.length}/{MAX_LISTING_IMAGES})</span>
                </span>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 text-[12.5px] font-bold text-accent-deep hover:underline"
                >
                  <ImagePlus className="h-4 w-4" /> Upload your own
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  aria-label="Upload a listing photo"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void addUpload(f);
                    e.target.value = "";
                  }}
                />
              </div>

              {form.images.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.images.map((src, i) => (
                    <span key={i} className="relative">
                      <img src={src} alt={`Selected ${i + 1}`} className="h-16 w-20 rounded-xl border-2 border-accent object-cover" />
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 rounded bg-ink/80 px-1.5 py-0.5 text-[9px] font-bold text-white">COVER</span>
                      )}
                      <button
                        type="button"
                        aria-label="Remove image"
                        onClick={() => set("images", form.images.filter((_, x) => x !== i))}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <p className="mt-3 text-[11.5px] font-semibold text-gray-400">
                Or pick from the Needly gallery:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {GALLERY.map((src) => {
                  const selected = form.images.includes(src);
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() => toggleGallery(src)}
                      aria-pressed={selected}
                      className={cn(
                        "h-16 w-20 overflow-hidden rounded-xl border-2 transition",
                        selected ? "border-accent" : "border-transparent opacity-70 hover:opacity-100"
                      )}
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* blocked dates */}
            <div>
              <div className="flex items-center gap-2">
                <CalendarX className="h-4 w-4 text-gray-400" />
                <span className="text-[13px] font-bold text-gray-700">Block unavailable days</span>
                <span className="text-[11.5px] font-medium text-gray-400">(optional)</span>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  type="date"
                  value={newBlock}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setNewBlock(e.target.value)}
                  className="h-10 rounded-xl border border-gray-200 px-3 text-[13px] font-medium outline-none focus:border-accent"
                  aria-label="Date to block"
                />
                <GhostButton
                  className="h-10 px-4 text-[12.5px]"
                  onClick={() => {
                    if (!newBlock) return;
                    if (!form.blockedDates.includes(newBlock)) {
                      set("blockedDates", [...form.blockedDates, newBlock].sort());
                    }
                    setNewBlock("");
                  }}
                >
                  Block day
                </GhostButton>
              </div>
              {form.blockedDates.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {form.blockedDates.map((d) => (
                    <span key={d} className="flex items-center gap-1.5 rounded-full bg-gray-100 py-1 pl-3 pr-1.5 text-[12px] font-bold text-gray-600">
                      {d}
                      <button
                        type="button"
                        aria-label={`Unblock ${d}`}
                        onClick={() => set("blockedDates", form.blockedDates.filter((x) => x !== d))}
                        className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-300 text-white hover:bg-rose-500"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-5">
              <GhostButton onClick={() => navigate("/owner")}>Cancel</GhostButton>
              <AccentButton onClick={() => void submit()} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {editId ? "Save changes" : "Publish listing"}
              </AccentButton>
            </div>
          </div>

          {/* ------------------------------- preview ------------------------------- */}
          <aside className="lg:sticky lg:top-6">
            <p className="mb-3 text-[12px] font-extrabold uppercase tracking-wide text-gray-400">
              Live preview
            </p>
            <div className="pointer-events-none max-w-[320px]">
              <ListingCard listing={previewListing} />
            </div>
            <div className="mt-5 rounded-2xl bg-[#f0f7fc] p-4 text-[12.5px] leading-relaxed text-gray-600">
              <strong className="text-ink">Heads up:</strong> a fee of 8% is added for renters at
              booking time — your price is what you earn. You approve every request before it's
              confirmed.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
