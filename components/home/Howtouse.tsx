"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Droplets, Hand, ShowerHead, Sparkles, ArrowRight } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const INK = "text-[#7a2c4e]";
const BODY = "text-[#6b5560]";

const GRAIN =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* ------------------------------------------------------------------
   The four steps — all rendered simultaneously, no gating.
------------------------------------------------------------------- */
const STEPS = [
    {
        n: "01",
        title: "Cleanse",
        copy: "Start on clean, dry skin — right after your shower is best.",
        icon: ShowerHead,
    },
    {
        n: "02",
        title: "Draw",
        copy: "One or two drops from the precision dropper is all you need.",
        icon: Droplets,
    },
    {
        n: "03",
        title: "Apply",
        copy: "Press gently onto the external area and let it settle for a moment.",
        icon: Hand,
    },
    {
        n: "04",
        title: "Repeat daily",
        copy: "Make it part of your morning — every day, effortlessly.",
        icon: Sparkles,
    },
];

/* One-time fade-in when the section enters view. This never hides
   content behind a scroll position — everything is in the DOM and
   visible on load; this only softens the entrance. */
function useOnceVisible<T extends HTMLElement>() {
    const ref = useRef<T | null>(null);
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        let reduced = false;
        try {
            reduced = !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        } catch {
            reduced = false;
        }
        if (reduced || typeof IntersectionObserver === "undefined") {
            setShown(true);
            return;
        }

        let io: IntersectionObserver | null = null;
        try {
            io = new IntersectionObserver(
                (entries) =>
                    entries.forEach((e) => {
                        if (e.isIntersecting) {
                            setShown(true);
                            io?.disconnect();
                        }
                    }),
                { threshold: 0.15 }
            );
            io.observe(el);
        } catch {
            setShown(true);
            return;
        }

        // safety net — content must never stay hidden if the observer fails
        const bail = window.setTimeout(() => setShown(true), 1200);
        return () => {
            io?.disconnect();
            window.clearTimeout(bail);
        };
    }, []);

    return { ref, shown };
}

export default function HowToUseSection() {
    const { ref, shown } = useOnceVisible<HTMLElement>();

    return (
        <section ref={ref} className="relative isolate overflow-hidden bg-gradient-to-b from-[#fdeef4] via-[#fff5f9] to-[#fffdfc] px-5 py-16 sm:px-8 md:py-24 lg:px-12">
            <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03]" style={{ backgroundImage: GRAIN }} />

            <div className="mx-auto max-w-6xl">
                {/* ---------------- heading ---------------- */}
                <div
                    className="mx-auto max-w-2xl text-center transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{ opacity: shown ? 1 : 0, transform: shown ? "none" : "translateY(16px)" }}
                >
                    <span className="text-[11px] font-light uppercase tracking-[0.3em] text-[#ec4899]/75">The ritual</span>
                    <h2 className={`mt-4 font-serif text-[clamp(28px,4vw,42px)] font-light leading-[1.15] ${INK}`}>
                        How to use Leira
                    </h2>
                    <p className={`mx-auto mt-4 max-w-[46ch] text-[14.5px] font-light leading-[1.8] ${BODY}`}>
                        Four simple steps. Thirty seconds. The whole process, at a glance.
                    </p>
                </div>

                {/* ---------------- all steps, one row, always visible ---------------- */}
                <div className="relative mt-14 md:mt-16">
                    {/* connecting line — desktop only, sits behind the step badges */}
                    <span
                        aria-hidden
                        className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-[34px] hidden h-px bg-gradient-to-r from-[#ec4899]/10 via-[#d8b06a]/50 to-[#ec4899]/10 md:block"
                    />

                    <ol className="grid grid-cols-1 gap-y-10 md:grid-cols-4 md:gap-x-6 md:gap-y-0">
                        {STEPS.map((step, i) => {
                            const Icon = step.icon;
                            return (
                                <li
                                    key={step.n}
                                    className="relative flex gap-5 text-left transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] md:flex-col md:items-center md:gap-0 md:text-center"
                                    style={{
                                        opacity: shown ? 1 : 0,
                                        transform: shown ? "none" : "translateY(18px)",
                                        transitionDelay: shown ? `${i * 90}ms` : "0ms",
                                    }}
                                >
                                    {/* icon badge — doubles as the step number's frame */}
                                    <span className="relative z-10 flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full border border-[#7a2c4e]/[0.14] bg-[#fffdfc] shadow-[0_10px_26px_-14px_rgba(122,44,78,0.35)]">
                                        <Icon className="h-[22px] w-[22px] text-[#ec4899]" strokeWidth={1.5} />
                                        <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#7a2c4e] font-serif text-[11px] font-light text-white">
                                            {i + 1}
                                        </span>
                                    </span>

                                    {/* mobile-only connector: a short vertical rule + arrow between steps */}
                                    {i < STEPS.length - 1 && (
                                        <span
                                            aria-hidden
                                            className="absolute left-[33px] top-[68px] block h-10 w-px bg-gradient-to-b from-[#d8b06a]/50 to-transparent md:hidden"
                                        />
                                    )}

                                    <div className="pt-1 md:pt-5">
                                        <span className="hidden text-[10.5px] font-light uppercase tracking-[0.2em] text-[#d8b06a] md:block">
                                            Step {step.n}
                                        </span>
                                        <h3 className={`font-serif text-[19px] font-light leading-[1.2] md:mt-2 md:text-[20px] ${INK}`}>
                                            {step.title}
                                        </h3>
                                        <p className={`mt-1.5 max-w-[30ch] text-[13.5px] font-light leading-[1.7] md:mx-auto md:mt-2.5 ${BODY}`}>
                                            {step.copy}
                                        </p>
                                    </div>

                                    {/* desktop connector arrow, sitting on the horizontal line
                                        between this step and the next */}
                                    {i < STEPS.length - 1 && (
                                        <span
                                            aria-hidden
                                            className="pointer-events-none absolute -right-3 top-[26px] hidden h-6 w-6 items-center justify-center rounded-full bg-[#fffdfc] text-[#d8b06a] md:flex"
                                        >
                                            <ArrowRight className="h-3 w-3" strokeWidth={2} />
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                </div>
            </div>
        </section>
    );
}