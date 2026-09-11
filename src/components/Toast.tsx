export interface ToastMessage {
  id: number;
  text: string;
}

export default function Toast({ toast }: { toast: ToastMessage | null }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4"
    >
      {toast && (
        <div
          key={toast.id}
          className="toast-in flex items-center gap-2.5 rounded-full bg-ink px-5 py-3 text-[13.5px] font-semibold text-white shadow-[0_16px_40px_-10px_rgba(2,10,25,0.45)]"
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
          {toast.text}
        </div>
      )}
    </div>
  );
}
