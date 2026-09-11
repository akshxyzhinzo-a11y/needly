import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last line of defense: without this, ANY uncaught error thrown during
 * render (anywhere in the tree) unmounts the whole app with nothing shown —
 * a silent, permanently blank page. This boundary catches that and shows a
 * real, on-brand fallback instead, and lets the person retry.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("[Needly] Unhandled error, showing fallback UI:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex min-h-screen max-w-[520px] flex-col items-center justify-center px-5 text-center">
          <p className="font-hand text-[64px] leading-none text-accent-deep">:(</p>
          <h1 className="mt-2 text-[24px] font-extrabold tracking-[-0.02em] text-ink">
            Something went wrong
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-gray-500">
            Needly hit an unexpected error and couldn't load this page. Reloading usually fixes
            it.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-[44px] items-center justify-center rounded-full bg-ink px-6 text-[14px] font-semibold text-white transition-colors hover:bg-black active:scale-[.98]"
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
