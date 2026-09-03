"use client";

import { useEffect, useRef, useState } from "react";
import {
  Atom,
  Droplets,
  Feather,
  FlaskConical,
  Gem,
  Leaf,
  ShieldCheck,
  Sun,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Content                                                            */
/* ------------------------------------------------------------------ */

type Usp = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const usps: Usp[] = [
  {
    title: "Clinically Backed",
    description:
      "Carefully formulated ingredients supported by scientific research.",
    icon: FlaskConical,
  },
  {
    title: "Premium Ingredients",
    description:
      "Thoughtfully selected ingredients with exceptional quality.",
    icon: Leaf,
  },
  {
    title: "High Absorption",
    description:
      "Designed for efficient absorption and everyday use.",
    icon: Droplets,
  },
  {
    title: "Clean Formula",
    description:
      "A carefully considered formula without unnecessary additions.",
    icon: Feather,
  },
  {
    title: "Visible Results",
    description:
      "Designed to support healthier-looking skin, hair and overall wellness.",
    icon: Gem,
  },
  {
    title: "Advanced Formula",
    description:
      "Modern formulation combining science and premium ingredients.",
    icon: Atom,
  },
  {
    title: "Everyday Wellness",
    description:
      "Simple nutrition designed to fit naturally into your daily routine.",
    icon: Sun,
  },
  {
    title: "Quality Assured",
    description:
      "Produced with rigorous quality and consistency standards.",
    icon: ShieldCheck,
  },
];

const leftUsps = usps.slice(0, 4);
const rightUsps = usps.slice(4, 8);

const VIDEO_SRC =
  "https://bodicine.com/cdn/shop/videos/c/vp/013193b14f894ad3a55118e99796113e/013193b14f894ad3a55118e99796113e.HD-1080p-7.2Mbps-73028510.mp4?v=0";

/* ------------------------------------------------------------------ */
/* Design tokens                                                      */
/* ------------------------------------------------------------------ */

const token = {
  shell: "#FAF7F2",
  ink: "#1E1C19",
  muted: "#807A70",
  sand: "#E4DCCE",
  bronze: "#8C7346",
} as const;

const displayFont =
  'var(--font-display, ui-serif, "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif)';

const bodyFont =
  'var(--font-body, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif)';

/* ------------------------------------------------------------------ */
/* Scroll Reveal Hook                                                 */
/* ------------------------------------------------------------------ */

function useScrollReveal(threshold = 0.18) {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

/* ------------------------------------------------------------------ */
/* USP Item                                                           */
/* ------------------------------------------------------------------ */

function UspItem({
  usp,
  side,
  index,
}: {
  usp: Usp;
  side: "left" | "right";
  index: number;
}) {
  const Icon = usp.icon;
  const isLeft = side === "left";

  const { ref, isVisible } = useScrollReveal(0.2);

  return (
    <li
      ref={ref}
      className={[
        "group relative flex w-full max-w-[20rem] flex-col items-center text-center",
        "mx-auto lg:mx-0 lg:max-w-[17rem]",

        isLeft
          ? "lg:items-end lg:text-right"
          : "lg:items-start lg:text-left",

        // Scroll animation
        "transform-gpu transition-all duration-[850ms]",
        "ease-[cubic-bezier(0.22,1,0.36,1)]",

        isVisible
          ? "translate-x-0 translate-y-0 opacity-100"
          : isLeft
            ? "-translate-x-10 translate-y-4 opacity-0"
            : "translate-x-10 translate-y-4 opacity-0",
      ].join(" ")}
      style={{
        transitionDelay: isVisible ? `${index * 100}ms` : "0ms",
      }}
    >
      {/* ============================================================
          CALLOUT LINE
      ============================================================ */}

      <span
        aria-hidden="true"
        className={[
          "pointer-events-none absolute top-[1.4rem] hidden items-center lg:flex",
          isLeft
            ? "left-full ml-4 flex-row"
            : "right-full mr-4 flex-row-reverse",
        ].join(" ")}
      >
        <span
          className={[
            "block h-px origin-center",
            "transition-all duration-700 ease-out",
            isVisible ? "w-9" : "w-0",
          ].join(" ")}
          style={{
            backgroundColor: token.sand,
            transitionDelay: isVisible ? `${index * 100 + 250}ms` : "0ms",
          }}
        />

        <span
          className={[
            "block h-[3px] w-[3px] rounded-full",
            "transition-all duration-500 ease-out",
            isVisible ? "scale-100 opacity-100" : "scale-0 opacity-0",
          ].join(" ")}
          style={{
            backgroundColor: token.sand,
            transitionDelay: isVisible ? `${index * 100 + 350}ms` : "0ms",
          }}
        />
      </span>


      {/* ============================================================
          ICON
      ============================================================ */}

      <span
        className={[
          "mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full",
          "transition-all duration-500 ease-out",

          isVisible
            ? "translate-y-0 scale-100 rotate-0 opacity-100"
            : "translate-y-3 scale-75 rotate-[-8deg] opacity-0",

          "group-hover:-translate-y-[3px]",
        ].join(" ")}
        style={{
          backgroundColor: "#FFFFFF",
          boxShadow: `inset 0 0 0 1px ${token.sand}, 0 1px 2px rgba(30,28,25,0.03)`,
          transitionDelay: isVisible
            ? `${index * 100 + 120}ms`
            : "0ms",
        }}
      >
        <Icon
          aria-hidden="true"
          strokeWidth={1.25}
          className={[
            "h-[18px] w-[18px]",
            "transition-transform duration-500 ease-out",
            isVisible
              ? "scale-100 rotate-0"
              : "scale-75 rotate-[-12deg]",
          ].join(" ")}
          style={{ color: token.bronze }}
        />
      </span>


      {/* ============================================================
          TITLE
      ============================================================ */}

      <h3
        className={[
          "text-[0.95rem] leading-snug tracking-[0.005em]",
          "transition-all duration-500 ease-out",

          isVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-3 opacity-0",

          isLeft
            ? "lg:group-hover:translate-x-[3px]"
            : "lg:group-hover:-translate-x-[3px]",
        ].join(" ")}
        style={{
          fontFamily: bodyFont,
          fontWeight: 500,
          color: token.ink,
          transitionDelay: isVisible
            ? `${index * 100 + 220}ms`
            : "0ms",
        }}
      >
        {usp.title}
      </h3>


      {/* ============================================================
          DESCRIPTION
      ============================================================ */}

      <p
        className={[
          "mt-2 text-[0.8125rem] leading-[1.7] [text-wrap:pretty]",
          "transition-all duration-600 ease-out",

          isVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-3 opacity-0",
        ].join(" ")}
        style={{
          fontFamily: bodyFont,
          color: token.muted,
          transitionDelay: isVisible
            ? `${index * 100 + 300}ms`
            : "0ms",
        }}
      >
        {usp.description}
      </p>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                            */
/* ------------------------------------------------------------------ */

type ScienceUSPSectionProps = {
  blendVideo?: boolean;
};

export default function ScienceUSPSection({
  blendVideo = true,
}: ScienceUSPSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  const {
    ref: videoRef,
    isVisible: videoVisible,
  } = useScrollReveal(0.15);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="science-usp-heading"
      className="relative w-full overflow-hidden px-5 py-24 sm:px-8 lg:py-36"
      style={{ backgroundColor: token.shell }}
    >
      <div className="mx-auto w-full max-w-[1240px]">

        {/* ==========================================================
            HEADER
        ========================================================== */}

        <header className="mx-auto mb-16 max-w-3xl text-center md:mb-20">

          <div className="flex items-center justify-center gap-4">

            <span className="h-px w-8 bg-[#B39A70]" />

            <p className="text-[10px] font-medium uppercase tracking-[0.38em] text-[#967B4D]">
              Why Choose Us
            </p>

            <span className="h-px w-8 bg-[#B39A70]" />

          </div>


          <h2
            id="science-usp-heading"
            className="mt-7 font-serif text-[2.5rem] font-normal leading-[1.08] tracking-[-0.025em] text-[#211E1A] sm:text-[3.2rem] md:text-[2rem] lg:text-[3rem]"
            style={{ fontFamily: displayFont }}
          >
            Intimate care,
            <br />
            <span className="italic">
              Science Behind Every Drop
            </span>
          </h2>


          <p className="mx-auto mt-7 max-w-xl text-[14px] leading-[1.9] tracking-[0.01em] text-[#777168] sm:text-[15px]">
            Every batch begins in the lab and ends in your daily ritual —
            researched ingredients, measured doses and nothing along for the
            ride.
          </p>

        </header>


        {/* ==========================================================
            MAIN COMPOSITION
        ========================================================== */}

        <div className="mt-16 grid grid-cols-1 gap-y-14 lg:mt-24 lg:grid-cols-[1fr_minmax(320px,460px)_1fr] lg:items-stretch lg:gap-x-12 xl:gap-x-20">


          {/* ========================================================
              LEFT USP COLUMN
          ======================================================== */}

          <ul
            role="list"
            className="
              order-2
              grid
              grid-cols-2
              gap-x-8
              gap-y-12

              lg:order-1
              lg:flex
              lg:h-full
              lg:flex-col
              lg:justify-between
              lg:gap-y-0
            "
          >
            {leftUsps.map((usp, index) => (
              <UspItem
                key={usp.title}
                usp={usp}
                side="left"
                index={index}
              />
            ))}
          </ul>


          {/* ========================================================
              CENTER PRODUCT / GIF
          ======================================================== */}

          <div
            ref={videoRef}
            className={[
              "relative order-1 mx-auto w-full max-w-[420px] lg:order-2 lg:max-w-none",
              "transform-gpu",
              "transition-all duration-[1200ms]",
              "ease-[cubic-bezier(0.22,1,0.36,1)]",

              videoVisible
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-8 scale-[0.965] opacity-0",
            ].join(" ")}
            style={{ backgroundColor: token.shell }}
          >

            {/* ======================================================
                OUTER APERTURE RING
            ====================================================== */}

            <div
              aria-hidden="true"
              className={[
                "pointer-events-none absolute left-1/2 top-1/2",
                "aspect-square w-[86%]",
                "-translate-x-1/2 -translate-y-1/2",
                "rounded-full",

                "transition-all duration-[1400ms] ease-out",

                videoVisible
                  ? "scale-100 opacity-100"
                  : "scale-[0.82] opacity-0",
              ].join(" ")}
              style={{
                boxShadow: `inset 0 0 0 1px ${token.sand}`,
              }}
            />


            {/* ======================================================
                INNER APERTURE RING
            ====================================================== */}

            <div
              aria-hidden="true"
              className={[
                "pointer-events-none absolute left-1/2 top-1/2",
                "aspect-square w-[64%]",
                "-translate-x-1/2 -translate-y-1/2",
                "rounded-full",

                "transition-all duration-[1600ms] ease-out",

                videoVisible
                  ? "scale-100 opacity-100"
                  : "scale-[0.75] opacity-0",
              ].join(" ")}
              style={{
                boxShadow:
                  "inset 0 0 0 1px rgba(228,220,206,0.55)",
                transitionDelay: "150ms",
              }}
            />


            {/* ======================================================
                SOFT RADIAL LIGHT
            ====================================================== */}

            <div
              aria-hidden="true"
              className={[
                "pointer-events-none absolute left-1/2 top-1/2",
                "aspect-square w-[110%]",
                "-translate-x-1/2 -translate-y-1/2",
                "rounded-full",

                "transition-all duration-[1800ms] ease-out",

                videoVisible
                  ? "scale-100 opacity-100"
                  : "scale-[0.7] opacity-0",
              ].join(" ")}
              style={{
                background:
                  "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.55) 42%, rgba(255,255,255,0) 70%)",
                transitionDelay: "250ms",
              }}
            />


            {/* ======================================================
                CONTACT SHADOW
            ====================================================== */}

            <div
              aria-hidden="true"
              className={[
                "pointer-events-none absolute bottom-[6%] left-1/2",
                "h-6 w-[46%]",
                "-translate-x-1/2 rounded-[50%] blur-xl",

                "transition-all duration-[1000ms] ease-out",

                videoVisible
                  ? "scale-100 opacity-100"
                  : "scale-[0.65] opacity-0",
              ].join(" ")}
              style={{
                backgroundColor: "rgba(30,28,25,0.10)",
                transitionDelay: "350ms",
              }}
            />


            {/* ======================================================
                VIDEO
            ====================================================== */}

            <video
              className={[
                "relative z-10 aspect-[4/5] w-full object-contain",
                "[&::-webkit-media-controls]:hidden",
                blendVideo ? "mix-blend-multiply" : "",

                "transition-transform duration-[1200ms] ease-out",

                videoVisible
                  ? "scale-100"
                  : "scale-[0.96]",
              ].join(" ")}
              src={VIDEO_SRC}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              controls={false}
              disablePictureInPicture
              aria-hidden="true"
              tabIndex={-1}
            />

          </div>


          {/* ========================================================
              RIGHT USP COLUMN
          ======================================================== */}

          <ul
            role="list"
            className="
              order-3
              grid
              grid-cols-2
              gap-x-8
              gap-y-12

              lg:flex
              lg:h-full
              lg:flex-col
              lg:justify-between
              lg:gap-y-0
            "
          >
            {rightUsps.map((usp, index) => (
              <UspItem
                key={usp.title}
                usp={usp}
                side="right"
                index={index}
              />
            ))}
          </ul>

        </div>

      </div>
    </section>
  );
}
