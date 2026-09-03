"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Review = {
  name: string;
  city: string;
  scent: string;
  rating: number;
  quote: string;
};

/* Replace these with your real, verified customer reviews before publishing. */
const REVIEWS: Review[] = [
  {
    name: "Ananya R.",
    city: "Mumbai",
    scent: "Damask Rose",
    rating: 5,
    quote:
      "I was nervous about using anything scented there. Two drops after my shower and it just felt clean — no burning, no heaviness, and the rose stays soft all day.",
  },
  {
    name: "Meher K.",
    city: "Bengaluru",
    scent: "Jasmine",
    rating: 5,
    quote:
      "Bengaluru humidity used to mean checking myself every few hours. I stopped doing that. It's a small thing, but it changed how I get through a workday.",
  },
  {
    name: "Ritika S.",
    city: "New Delhi",
    scent: "Ylang Ylang",
    rating: 5,
    quote:
      "The dropper is what sold me. Nothing spills, nothing is wasted, and it feels like a proper ritual rather than another product on the shelf.",
  },
  {
    name: "Fatima A.",
    city: "Hyderabad",
    scent: "Damask Rose",
    rating: 5,
    quote:
      "My skin reacts to almost everything, so I patch tested on my hip for two days first. No redness at all. I've been using it every morning since.",
  },
  {
    name: "Simran B.",
    city: "Chandigarh",
    scent: "Jasmine",
    rating: 4,
    quote:
      "It's expensive for what it is, and I still bought a second bottle. The scent is genuinely lovely and it lasts far longer than I expected it to.",
  },
];

const DURATION = 8000;

export default function Testimonials() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);

  const go = useCallback((next: number) => {
    setIndex(((next % REVIEWS.length) + REVIEWS.length) % REVIEWS.length);
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReady(true);
      setPaused(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setReady(true);
            io.disconnect();
          }
        }),
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!ready || paused) return;
    const t = window.setTimeout(() => go(index + 1), DURATION);
    return () => window.clearTimeout(t);
  }, [ready, paused, index, go]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") go(index + 1);
    if (e.key === "ArrowLeft") go(index - 1);
  };

  const active = REVIEWS[index];

  return (
    <section
      ref={sectionRef}
      id="testimonials"
      aria-labelledby="testimonials-title"
      className={`tst${ready ? " ready" : ""}${paused ? " paused" : ""}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span className="glow" aria-hidden="true" />

      <div className="wrap">
        <div className="side">
          <span className="eyebrow">
            <i aria-hidden="true" />
            In their words
          </span>
          <h2 className="title" id="testimonials-title">
            Trusted by ten
            <br />
            thousand <em>women</em>.
          </h2>

          <div className="score">
            <span className="scoreNum">4.9</span>
            <span className="scoreMeta">
              <Drops value={5} />
              <span className="scoreText">Average rating across verified purchases</span>
            </span>
          </div>
        </div>

        <div className="stage" onKeyDown={onKey} tabIndex={0} role="group" aria-roledescription="carousel" aria-label="Customer reviews">
          <span className="quoteMark" aria-hidden="true">
            &ldquo;
          </span>

          <div className="slides" aria-live="polite">
            {REVIEWS.map((r, i) => (
              <blockquote
                key={r.name}
                className={`slide${i === index ? " on" : ""}${i < index ? " past" : ""}`}
                aria-hidden={i !== index}
              >
                <p className="quote">{r.quote}</p>
              </blockquote>
            ))}
          </div>

          <figcaption className="meta">
            <span className="metaName">{active.name}</span>
            <span className="metaLine" aria-hidden="true" />
            <span className="metaCity">{active.city}</span>
            <span className="metaScent">{active.scent}</span>
          </figcaption>

          <div className="rating">
            <Drops value={active.rating} />
            <span className="verified">Verified purchase</span>
          </div>

          <ul className="dots" role="tablist" aria-label="Choose a review">
            {REVIEWS.map((r, i) => (
              <li key={r.name}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Review from ${r.name}, ${r.city}`}
                  className={`avatar${i === index ? " on" : ""}`}
                  onClick={() => go(i)}
                >
                  <svg className="ring" viewBox="0 0 44 44" aria-hidden="true">
                    <circle className="ringTrack" cx="22" cy="22" r="20.5" />
                    {i === index && !paused && (
                      <circle key={index} className="ringFill" cx="22" cy="22" r="20.5" />
                    )}
                  </svg>
                  <span className="initials">{r.name.charAt(0)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <style jsx>{`
        .tst {
          --pink: #ec4899;
          --pink-soft: #f9a8d4;
          --rose-ink: #7a2c4e;
          --body-ink: #6b5560;
          --gold: #d8b06a;
          --hair: rgba(122, 44, 78, 0.14);

          position: relative;
          isolation: isolate;
          overflow: hidden;
          padding: clamp(72px, 10vw, 140px) clamp(20px, 6vw, 88px);
          background: linear-gradient(180deg, #fffdfc 0%, #fff5f8 50%, #fdf1f5 100%);
          color: var(--body-ink);
          -webkit-font-smoothing: antialiased;
        }

        .glow {
          position: absolute;
          bottom: -200px;
          left: -160px;
          width: 540px;
          height: 540px;
          border-radius: 50%;
          filter: blur(100px);
          background: rgba(236, 72, 153, 0.14);
          z-index: -1;
          pointer-events: none;
          animation: drift 24s ease-in-out infinite;
        }
        @keyframes drift {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(36px, -30px, 0) scale(1.1);
          }
        }

        .wrap {
          max-width: 1140px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
          gap: clamp(40px, 7vw, 100px);
          align-items: center;
        }

        /* ---------------- left ---------------- */
        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          font-size: 12.5px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--pink);
          opacity: 0;
          transform: translateY(14px);
        }
        .eyebrow i {
          width: 34px;
          height: 1px;
          background: linear-gradient(90deg, var(--pink-soft), transparent);
        }

        .title {
          margin: 18px 0 0;
          font-family: var(--font-serif, "Cormorant Garamond", "Playfair Display", Georgia, serif);
          font-weight: 300;
          font-size: clamp(36px, 4.4vw, 58px);
          line-height: 1.04;
          letter-spacing: -0.012em;
          color: var(--rose-ink);
          opacity: 0;
          transform: translateY(18px);
        }
        .title em {
          font-style: italic;
          color: var(--pink);
        }

        .score {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-top: clamp(26px, 3vw, 38px);
          padding-top: clamp(22px, 2.6vw, 30px);
          border-top: 1px solid var(--hair);
          opacity: 0;
          transform: translateY(18px);
        }
        .scoreNum {
          font-family: var(--font-serif, "Cormorant Garamond", Georgia, serif);
          font-size: clamp(42px, 4vw, 58px);
          line-height: 1;
          color: var(--rose-ink);
        }
        .scoreMeta {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .scoreText {
          max-width: 24ch;
          font-size: 12.8px;
          font-weight: 300;
          line-height: 1.6;
          color: rgba(107, 85, 96, 0.75);
        }

        .ready .eyebrow {
          animation: rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .ready .title {
          animation: rise 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.08s forwards;
        }
        .ready .score {
          animation: rise 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.18s forwards;
        }
        @keyframes rise {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ---------------- stage ---------------- */
        .stage {
          position: relative;
          padding-left: clamp(0px, 2vw, 26px);
          outline: none;
          opacity: 0;
          transform: translateY(20px);
        }
        .ready .stage {
          animation: rise 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.26s forwards;
        }
        .stage:focus-visible {
          outline: 1px solid var(--gold);
          outline-offset: 18px;
          border-radius: 6px;
        }

        .quoteMark {
          position: absolute;
          top: -46px;
          left: -10px;
          font-family: var(--font-serif, "Cormorant Garamond", Georgia, serif);
          font-size: 150px;
          line-height: 1;
          color: rgba(236, 72, 153, 0.13);
          pointer-events: none;
        }

        .slides {
          position: relative;
          min-height: clamp(180px, 21vw, 230px);
        }

        .slide {
          position: absolute;
          inset: 0;
          margin: 0;
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1),
            transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
          pointer-events: none;
        }
        .slide.past {
          transform: translateY(-24px);
        }
        .slide.on {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .quote {
          margin: 0;
          font-family: var(--font-serif, "Cormorant Garamond", Georgia, serif);
          font-weight: 300;
          font-size: clamp(21px, 2.3vw, 32px);
          line-height: 1.45;
          letter-spacing: -0.005em;
          color: var(--rose-ink);
        }

        .meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: clamp(20px, 2.4vw, 30px);
        }
        .metaName {
          font-size: 14px;
          letter-spacing: 0.06em;
          color: var(--rose-ink);
        }
        .metaLine {
          width: 22px;
          height: 1px;
          background: rgba(216, 176, 106, 0.8);
        }
        .metaCity {
          font-size: 13.5px;
          font-weight: 300;
          color: rgba(107, 85, 96, 0.8);
        }
        .metaScent {
          margin-left: 4px;
          padding: 5px 13px;
          border-radius: 999px;
          border: 1px solid rgba(236, 72, 153, 0.22);
          background: rgba(255, 255, 255, 0.7);
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--pink);
        }

        .rating {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 16px;
        }
        .verified {
          font-size: 11.5px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(216, 176, 106, 0.95);
        }

        /* ---------------- selector ---------------- */
        .dots {
          display: flex;
          gap: 14px;
          list-style: none;
          margin: clamp(30px, 3.4vw, 44px) 0 0;
          padding-top: clamp(24px, 2.8vw, 32px);
          border-top: 1px solid var(--hair);
        }

        .avatar {
          position: relative;
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          padding: 0;
          border: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          color: rgba(122, 44, 78, 0.45);
          font: inherit;
          transition: color 0.4s ease, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
            background 0.4s ease;
        }
        .avatar:hover {
          color: var(--rose-ink);
          transform: translateY(-2px);
        }
        .avatar.on {
          color: #fff;
          background: linear-gradient(150deg, var(--pink-soft), var(--pink));
          box-shadow: 0 10px 22px -12px rgba(236, 72, 153, 0.7);
        }
        .avatar:focus-visible {
          outline: 1px solid var(--gold);
          outline-offset: 3px;
        }

        .initials {
          font-family: var(--font-serif, "Cormorant Garamond", Georgia, serif);
          font-size: 18px;
          line-height: 1;
          z-index: 1;
        }

        .ring {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
          overflow: visible;
        }
        .ring :global(circle) {
          fill: none;
          stroke-width: 1;
        }
        .ring :global(.ringTrack) {
          stroke: rgba(236, 72, 153, 0.22);
        }
        .ring :global(.ringFill) {
          stroke: var(--gold);
          stroke-width: 1.6;
          stroke-linecap: round;
          stroke-dasharray: 129;
          stroke-dashoffset: 129;
          animation: sweep ${DURATION}ms linear forwards;
        }
        @keyframes sweep {
          to {
            stroke-dashoffset: 0;
          }
        }

        /* ---------------- responsive ---------------- */
        @media (max-width: 900px) {
          .wrap {
            grid-template-columns: 1fr;
            gap: 34px;
            align-items: start;
          }
          .quoteMark {
            top: -34px;
            font-size: 104px;
          }
          .stage {
            padding-left: 0;
          }
          .slides {
            min-height: 220px;
          }
        }

        @media (max-width: 520px) {
          .slides {
            min-height: 260px;
          }
          .dots {
            gap: 10px;
          }
          .avatar {
            width: 40px;
            height: 40px;
          }
          .metaScent {
            margin-left: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .tst :global(*) {
            animation: none !important;
            transition: none !important;
          }
          .eyebrow,
          .title,
          .score,
          .stage {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </section>
  );
}

/* rating shown as dropper drops rather than stars */
function Drops({ value }: { value: number }) {
  return (
    <span className="drops" aria-label={`${value} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 16 20" className={i < value ? "drop full" : "drop"} aria-hidden="true">
          <path d="M8 1.5c3.4 4.2 5.4 6.9 5.4 9.4A5.4 5.4 0 0 1 8 16.3a5.4 5.4 0 0 1-5.4-5.4c0-2.5 2-5.2 5.4-9.4Z" />
        </svg>
      ))}
      <style jsx>{`
        .drops {
          display: inline-flex;
          gap: 6px;
          align-items: center;
        }
        .drop {
          width: 11px;
          height: 14px;
        }
        .drop :global(path) {
          fill: none;
          stroke: rgba(236, 72, 153, 0.4);
          stroke-width: 1.2;
        }
        .drop.full :global(path) {
          fill: #ec4899;
          stroke: #ec4899;
        }
      `}</style>
    </span>
  );
}