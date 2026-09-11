import { CalendarCheck, Search, Store } from "lucide-react";

const STEPS = [
  {
    id: "search",
    icon: Search,
    title: "Tell us what you need",
    text: "Search thousands of items, tools and services listed by people around you.",
  },
  {
    id: "choose",
    icon: Store,
    title: "Pick the best match",
    text: "Compare prices, check availability and choose an owner right in your neighbourhood.",
  },
  {
    id: "book",
    icon: CalendarCheck,
    title: "Book, use, return",
    text: "Reserve in a couple of taps, pick it up nearby, and return it when you're done.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-4 bg-white">
      <div className="mx-auto max-w-[1260px] px-5 pb-[72px]">
        <div className="rounded-[30px] bg-panel px-6 pb-[56px] pt-[30px] md:px-16">
          <div className="anim-fade-up text-center">
            <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-ink md:text-[30px]">
              How Needly works
            </h2>
            <p className="mt-2 text-[14px] font-medium text-gray-500">
              Get what you need in just a few steps.
            </p>
          </div>

          <ol className="mx-auto mt-[46px] grid max-w-[920px] gap-9 sm:grid-cols-3 sm:gap-8">
            {STEPS.map(({ id, icon: Icon, title, text }, index) => (
              <li
                key={id}
                className="anim-fade-up flex flex-col items-center text-center"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-white text-accent-deep shadow-[0_10px_24px_-10px_rgba(25,100,150,0.3)]">
                  <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
                </span>
                <h3 className="mt-4 text-[15px] font-bold text-ink">{title}</h3>
                <p className="mt-1.5 max-w-[250px] text-[13px] leading-relaxed text-gray-500">
                  {text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
