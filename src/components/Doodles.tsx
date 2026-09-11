interface DoodleProps {
  className?: string;
  delay?: number;
}

/** Irregular hand-drawn scribble underline (deep blue marker). */
export function Underline({ className, delay = 450 }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 176 14"
      fill="none"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        className="doodle-line"
        style={{ animationDelay: `${delay}ms` }}
        d="M4 8.5C42 3.6 95 12.6 172 6"
        stroke="var(--color-mark)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Three-stroke sparkle burst in bright cyan. */
export function Spark({ className, delay = 250 }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        className="doodle-line"
        style={{ animationDelay: `${delay}ms` }}
        d="M22 5v11"
        stroke="var(--color-accent)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        className="doodle-line"
        style={{ animationDelay: `${delay + 90}ms` }}
        d="M8.5 12.5l7.5 7.5"
        stroke="var(--color-accent)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        className="doodle-line"
        style={{ animationDelay: `${delay + 180}ms` }}
        d="M35.5 12.5L28 20"
        stroke="var(--color-accent)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Small double-tick accent marks (deep blue). */
export function Ticks({ className, delay = 600 }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 34 26"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        className="doodle-line"
        style={{ animationDelay: `${delay}ms` }}
        d="M7 20L14 7"
        stroke="var(--color-mark)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        className="doodle-line"
        style={{ animationDelay: `${delay + 110}ms` }}
        d="M21 20L28 7"
        stroke="var(--color-mark)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Curved hand-drawn arrow that sweeps down and to the right. */
export function CurveArrow({ className, delay = 750 }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 120 96"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        className="doodle-line"
        style={{ animationDelay: `${delay}ms` }}
        d="M8 14C52 2 106 22 99 74"
        stroke="var(--color-mark)"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path
        className="doodle-line"
        style={{ animationDelay: `${delay + 260}ms` }}
        d="M86.5 66.5L99 74l2.5-13"
        stroke="var(--color-mark)"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
