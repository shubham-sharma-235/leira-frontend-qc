"use client";

import React, { useEffect, useRef } from "react";

/* ------------------------------------------------------------------
   STEPS — swap `img` for your own shots when you have them.
------------------------------------------------------------------- */
type Step = { n: string; title: string; copy: string; img: string };

const STEPS: Step[] = [
  {
    n: "01",
    title: "Start on clean, dry skin",
    copy: "Apply straight after your shower. Damp skin dilutes the oil — dry skin holds it, so the scent stays with you through the day.",
    img: "https://images.unsplash.com/photo-1573461160327-b450ce3d8e7f?q=80&w=900&auto=format&fit=crop",
  },
  {
    n: "02",
    title: "Draw one or two drops",
    copy: "The precision dropper gives you exactly what you need, with nothing spilled. The oil is pure and undiluted, so two drops is plenty.",
    img: "https://images.unsplash.com/photo-1671493229066-f36e86b35841?q=80&w=900&auto=format&fit=crop",
  },
  {
    n: "03",
    title: "Press gently, then wait",
    copy: "Apply to the external intimate area or along the bikini line. Give it a few seconds to settle into the skin before you dress.",
    img: "https://plus.unsplash.com/premium_photo-1674739375749-7efe56fc8bbb?q=80&w=900&auto=format&fit=crop",
  },
  {
    n: "04",
    title: "Make it part of your morning",
    copy: "Patch test somewhere less delicate the first time. Once your skin is comfortable, Leira belongs in your routine — every day.",
    img: "https://images.unsplash.com/photo-1665763630810-e6251bdd392d?q=80&w=900&auto=format&fit=crop",
  },
];

const CSS = `
@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Jost:wght@300;400;500&display=swap");

.huRoot {
  font-family: "Jost", system-ui, sans-serif;
  --font-serif: "Cormorant Garamond", Georgia, serif;

  --pink: #ec4899;
  --pink-soft: #f9a8d4;
  --rose-ink: #7a2c4e;
  --body-ink: #6b5560;
  --gold: #d8b06a;
  --hair: rgba(122, 44, 78, 0.13);

  --sticky-top: 0px;
  --stage-h: 100vh;
  --p: 0;
  --pos: 0;

  color: var(--body-ink);
  background: linear-gradient(180deg, #fdeef4 0%, #fff6f9 34%, #fffdfc 100%);

  /* must not clip or transform, or the sticky child dies */
  overflow: visible;
  transform: none;
  filter: none;
  perspective: none;
  contain: none;
}

.huScroller {
  position: relative;
  height: 500vh;
  overflow: visible;
  transform: none;
}

.huStage {
  position: -webkit-sticky;
  position: sticky;
  isolation: isolate;
  top: var(--sticky-top);
  height: var(--stage-h);
  min-height: 560px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(26px, 4vh, 54px);
  padding: clamp(28px, 5vh, 60px) clamp(20px, 6vw, 88px);
  overflow: hidden;
}

/* fine grain so the panel reads as paper, not flat pixels */
.huStage::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  opacity: 0.035;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* ---------------- heading ---------------- */
.huHead {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  align-items: baseline;
  gap: clamp(16px, 3vw, 34px);
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.9s ease, transform 1s cubic-bezier(0.22, 1, 0.36, 1);
}
.in .huHead {
  opacity: 1;
  transform: none;
}

.huTag {
  flex: none;
  font-size: 11.5px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--pink);
}

.huTitle {
  flex: none;
  margin: 0;
  font-family: var(--font-serif);
  font-weight: 300;
  font-size: clamp(30px, 4vw, 54px);
  line-height: 1.1;
  letter-spacing: -0.014em;
  color: var(--rose-ink);
}
.huTitle em {
  font-style: italic;
  color: var(--pink);
}

.huRule {
  flex: 1 1 auto;
  height: 1px;
  background: linear-gradient(90deg, rgba(216, 176, 106, 0.85), rgba(216, 176, 106, 0.1));
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 1.4s cubic-bezier(0.22, 1, 0.36, 1) 0.2s;
}
.in .huRule {
  transform: scaleX(1);
}

.huCount {
  flex: none;
  font-family: var(--font-serif);
  font-size: 19px;
  letter-spacing: 0.08em;
  color: rgba(122, 44, 78, 0.5);
}
.huCount b {
  font-weight: 400;
  color: var(--pink);
}

/* ---------------- body ---------------- */
.huGrid {
  max-width: 1300px;
  width: 100%;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: clamp(30px, 5vw, 84px);
  align-items: center;
}

/* ---- left: the stacked images ---- */
.huVisual {
  position: relative;
  aspect-ratio: 4 / 5;
  max-height: 58vh;
  border-radius: 24px;
  overflow: hidden;
  background: #f7e6ee;
  box-shadow: 0 44px 84px -52px rgba(122, 44, 78, 0.6);
  /* hairline mat, sitting outside the frame — outline is not clipped
     by the element's own overflow, so no extra wrapper is needed */
  outline: 1px solid rgba(216, 176, 106, 0.5);
  outline-offset: clamp(10px, 1.3vw, 18px);
  opacity: 0;
  clip-path: inset(0 0 100% 0);
  transition: clip-path 1.5s cubic-bezier(0.76, 0, 0.24, 1) 0.15s, opacity 0.9s ease 0.15s;
}

/* scrim so the caption stays legible on any photograph */
.huVisual::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(58, 20, 36, 0) 52%,
    rgba(58, 20, 36, 0.5) 100%
  );
}
.in .huVisual {
  opacity: 1;
  clip-path: inset(0 0 0 0);
}

.huShot {
  position: absolute;
  inset: 0;
  opacity: 0;
  transform: scale(1.12);
  filter: blur(12px);
  transition: opacity 1.5s cubic-bezier(0.4, 0, 0.2, 1),
    transform 2.2s cubic-bezier(0.22, 1, 0.36, 1),
    filter 1.6s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity, transform, filter;
}
/* resolves into focus, then holds a slow drift the whole time it is up */
.huShot.on {
  opacity: 1;
  filter: blur(0);
  transform: scale(calc(1.015 + var(--local, 0) * 0.05));
}
.huShot img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* the step number sitting on the image */
.huBadge {
  position: absolute;
  left: clamp(18px, 2vw, 28px);
  right: clamp(18px, 2vw, 28px);
  bottom: clamp(16px, 2vw, 24px);
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 10.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.94);
  text-shadow: 0 1px 12px rgba(58, 20, 36, 0.45);
}
.huBadge i {
  flex: none;
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  background: linear-gradient(150deg, #fff, var(--pink-soft));
}
/* hairline that fills across the caption as the step is held */
.huBadge::after {
  content: "";
  flex: 1 1 auto;
  height: 1px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.85) calc(var(--local, 0) * 100%),
    rgba(255, 255, 255, 0.22) calc(var(--local, 0) * 100%)
  );
}

/* ---- right: one step at a time, held large ---- */
.huPane {
  position: relative;
  min-height: clamp(300px, 42vh, 420px);
}

/* oversized numeral watermark */
.huGhost {
  position: absolute;
  top: clamp(-30px, -3vw, -10px);
  right: 0;
  z-index: -1;
  font-family: var(--font-serif);
  font-weight: 300;
  font-size: clamp(120px, 17vw, 260px);
  line-height: 0.8;
  color: rgba(236, 72, 153, 0.07);
  pointer-events: none;
  user-select: none;
  transform: translateY(24px) scale(0.94);
  opacity: 0;
  transition: opacity 1.4s cubic-bezier(0.22, 1, 0.36, 1),
    transform 1.8s cubic-bezier(0.22, 1, 0.36, 1);
}
.huStep.on .huGhost {
  opacity: 1;
  transform: translateY(calc((0.5 - var(--local, 0)) * -26px)) scale(1);
}

.huStep {
  position: absolute;
  inset: 0;
  isolation: isolate;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear 0.9s;
}
.huStep.on {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition: opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1), visibility 0s;
}

/* each part arrives on its own beat — slow, and staggered.
   Steps already passed leave upward, steps still to come wait below,
   so the movement always follows the scroll direction. */
.huNum,
.huName,
.huCopy {
  opacity: 0;
  transform: translateY(38px);
  transition: opacity 1.15s cubic-bezier(0.22, 1, 0.36, 1),
    transform 1.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.huStep.prev .huNum,
.huStep.prev .huName,
.huStep.prev .huCopy {
  transform: translateY(-38px);
}

.huStep.on .huNum {
  opacity: 1;
  transform: none;
  transition-delay: 0.08s;
}
.huStep.on .huName {
  opacity: 1;
  transform: none;
  transition-delay: 0.22s;
}
.huStep.on .huCopy {
  opacity: 1;
  transform: none;
  transition-delay: 0.36s;
}

/* the whole step drifts a little while it is held, so nothing sits still */
.huStep.on {
  transform: translateY(calc((0.5 - var(--local, 0)) * 12px));
}

.huNum {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: clamp(12px, 1.8vh, 20px);
}
.huNum b {
  font-family: var(--font-serif);
  font-weight: 300;
  font-size: clamp(40px, 5.4vw, 78px);
  line-height: 0.9;
  color: var(--pink);
  opacity: 0.85;
}
.huNum i {
  display: block;
  width: clamp(40px, 6vw, 88px);
  height: 1px;
  background: linear-gradient(90deg, rgba(216, 176, 106, 0.9), rgba(216, 176, 106, 0.08));
}

.huName {
  margin: 0 0 clamp(14px, 2vh, 22px);
  font-family: var(--font-serif);
  font-weight: 300;
  font-size: clamp(28px, 3.6vw, 50px);
  line-height: 1.14;
  letter-spacing: -0.014em;
  color: var(--rose-ink);
  max-width: 16ch;
}

.huCopy {
  margin: 0;
  max-width: 46ch;
  font-size: clamp(15px, 1.2vw, 18px);
  font-weight: 300;
  line-height: 1.85;
  color: rgba(107, 85, 96, 0.88);
}

/* ---- the four markers below the step ---- */
.huDots {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: clamp(24px, 4vh, 42px);
  opacity: 0;
  transition: opacity 0.9s ease 0.6s;
}
.in .huDots {
  opacity: 1;
}
.huDots b {
  position: relative;
  display: block;
  width: clamp(34px, 5vw, 64px);
  height: 2px;
  border-radius: 2px;
  background: var(--hair);
  overflow: hidden;
}
.huDots b::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--pink-soft), var(--pink));
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}
.huDots b.done::after {
  transform: scaleX(1);
}
/* the current one fills gradually with the scroll */
.huDots b.now::after {
  transform: scaleX(var(--local, 0));
  transition: none;
}

/* ---------------- footnote ---------------- */
.huNote {
  max-width: 1300px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 12.5px;
  font-weight: 300;
  line-height: 1.65;
  color: rgba(107, 85, 96, 0.75);
  opacity: 0;
  transition: opacity 0.9s ease 0.9s;
}
.in .huNote {
  opacity: 1;
}
.huNote b {
  font-weight: 500;
  color: var(--rose-ink);
}
.huNote span {
  flex: none;
  width: 7px;
  height: 7px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--pink);
  box-shadow: 0 0 0 4px rgba(236, 72, 153, 0.12);
}

/* ---------------- responsive ---------------- */
@media (max-width: 900px) {
  .huScroller {
    height: 440vh;
  }
  .huStage {
    gap: 20px;
    justify-content: flex-start;
    padding-top: clamp(34px, 7vh, 70px);
  }
  .huHead {
    flex-wrap: wrap;
    gap: 10px 18px;
  }
  .huRule,
  .huCount {
    display: none;
  }
  .huGrid {
    grid-template-columns: 1fr;
    gap: 22px;
  }
  .huVisual {
    aspect-ratio: 16 / 10;
    max-height: 28vh;
  }
  .huPane {
    min-height: clamp(250px, 40vh, 330px);
  }
  .huName {
    max-width: none;
  }
  .huNote {
    font-size: 11.5px;
  }
}

@media (prefers-reduced-motion: reduce) {
  /* motion off — but the layout stays exactly the same, so it is still
     one step at a time. Only the transitions are removed. */
  .huRoot *,
  .huRoot *::before,
  .huRoot *::after {
    transition: none !important;
    animation: none !important;
  }
  .huVisual {
    clip-path: none;
  }
  .huHead,
  .huNote,
  .huDots,
  .huVisual {
    opacity: 1;
    transform: none;
  }
  .huRule {
    transform: none;
  }
  /* still hidden unless active */
  .huStep {
    opacity: 0;
    visibility: hidden;
  }
  .huStep.on {
    opacity: 1;
    visibility: visible;
  }
  .huStep.on,
  .huStep.on .huNum,
  .huStep.on .huName,
  .huStep.on .huCopy,
  .huStep.on .huGhost {
    opacity: 1;
    transform: none;
  }
  .huShot {
    filter: none;
  }
}
`;

/* position:sticky dies silently under a clipping or transformed ancestor.
   overflow:hidden can be swapped for overflow:clip, which clips the same
   but does not create a scroll container. */
function auditSticky(el: HTMLElement, autofix: boolean, debug: boolean) {
  const bad: { el: HTMLElement; reason: string }[] = [];
  let node: HTMLElement | null = el.parentElement;

  while (node && node !== document.documentElement) {
    const cs = getComputedStyle(node);
    const clipsY = cs.overflowY !== "visible" && cs.overflowY !== "clip";
    const clipsX = cs.overflowX !== "visible" && cs.overflowX !== "clip";

    if (clipsY || clipsX) {
      const scrolls =
        (clipsY && node.scrollHeight > node.clientHeight + 1) ||
        (clipsX && node.scrollWidth > node.clientWidth + 1);
      const forcedAutoY = cs.overflowX === "hidden" && cs.overflowY === "auto";

      if (autofix && !scrolls) {
        if (forcedAutoY) {
          node.style.overflowX = "clip";
          node.style.overflowY = "visible";
        } else {
          if (clipsX) node.style.overflowX = "clip";
          if (clipsY) node.style.overflowY = "clip";
        }
      } else {
        bad.push({ el: node, reason: `overflow ${cs.overflowX}/${cs.overflowY}` });
      }
    }

    const cb: string[] = [];
    if (cs.transform !== "none") cb.push("transform");
    if (cs.filter !== "none") cb.push("filter");
    if (cs.perspective !== "none") cb.push("perspective");
    if (cs.contain.includes("paint") || cs.contain.includes("layout")) cb.push("contain");
    if (cb.length) bad.push({ el: node, reason: cb.join(", ") });

    node = node.parentElement;
  }

  [document.documentElement, document.body].forEach((n) => {
    if (getComputedStyle(n).overflowX === "hidden") {
      if (autofix) (n as HTMLElement).style.overflowX = "clip";
      else bad.push({ el: n as HTMLElement, reason: "overflow-x:hidden" });
    }
  });

  if (bad.length) {
    // eslint-disable-next-line no-console
    console.warn("[LeiraHowToUse] ancestors breaking position:sticky:", bad);
  } else if (debug) {
    // eslint-disable-next-line no-console
    console.info("[LeiraHowToUse] sticky ok");
  }
}

function getScrollParent(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const cs = getComputedStyle(node);
    if (/(auto|scroll|overlay)/.test(cs.overflowY) && node.scrollHeight > node.clientHeight)
      return node;
    node = node.parentElement;
  }
  return null;
}

type Props = {
  /** px of fixed-header clearance to pin below. Default 0. */
  stickyTop?: number;
  /** auto-convert clipping ancestors from overflow:hidden to overflow:clip. */
  autoFixSticky?: boolean;
  debug?: boolean;
};

export default function LeiraHowToUse({
  stickyTop = 0,
  autoFixSticky = true,
  debug = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const countRef = useRef<HTMLSpanElement | null>(null);
  const shotsRef = useRef<HTMLDivElement | null>(null);
  const stepsRef = useRef<HTMLDivElement | null>(null);
  const badgeRef = useRef<HTMLSpanElement | null>(null);
  const dotsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const scroller = scrollerRef.current;
    const stage = stageRef.current;
    if (!root || !scroller || !stage) return;

    auditSticky(root, autoFixSticky, debug);
    root.style.setProperty("--sticky-top", stickyTop + "px");

    const scrollParent = getScrollParent(root);
    const shots = Array.from(shotsRef.current?.querySelectorAll<HTMLElement>(".huShot") ?? []);
    const steps = Array.from(stepsRef.current?.querySelectorAll<HTMLElement>(".huStep") ?? []);
    const dots = Array.from(dotsRef.current?.querySelectorAll<HTMLElement>("b") ?? []);
    const last = STEPS.length - 1;

    const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
    const viewH = () => (scrollParent ? scrollParent.clientHeight : window.innerHeight) - stickyTop;

    let reduce = false;
    try {
      reduce = !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    } catch {
      reduce = false;
    }

    // one-shot entrance
    let io: IntersectionObserver | null = null;
    if (reduce || typeof IntersectionObserver === "undefined") {
      root.classList.add("in");
    } else {
      try {
        io = new IntersectionObserver(
          (es, o) =>
            es.forEach((e) => {
              if (e.isIntersecting) {
                root.classList.add("in");
                o.disconnect();
              }
            }),
          { root: scrollParent, threshold: 0.2 }
        );
        io.observe(stage);
      } catch {
        root.classList.add("in");
      }
    }

    let target = 0;
    let current = -1;
    let raf = 0;
    let shown = -1;

    const measure = () => {
      const vh = viewH();
      root.style.setProperty("--stage-h", vh + "px");

      const r = scroller.getBoundingClientRect();
      const top = scrollParent
        ? r.top - scrollParent.getBoundingClientRect().top - stickyTop
        : r.top - stickyTop;
      const d = r.height - vh;
      if (d > 0) target = clamp01(-top / d);
    };

    const paint = (p: number) => {
      root.style.setProperty("--p", p.toFixed(4));

      /* every step gets an equal share of the scroll, so each one is held
         for the same length of time before the next takes over */
      const span = clamp01(p / 0.94) * STEPS.length;
      const active = Math.min(last, Math.floor(span));
      const local = clamp01(span - active); // 0 → 1 within the current step

      root.style.setProperty("--local", local.toFixed(4));

      if (active !== shown) {
        shown = active;
        shots.forEach((el, i) => el.classList.toggle("on", i === active));
        steps.forEach((el, i) => {
          el.classList.toggle("on", i === active);
          el.classList.toggle("prev", i < active);
        });
        dots.forEach((el, i) => {
          el.classList.toggle("done", i < active);
          el.classList.toggle("now", i === active);
        });
        if (countRef.current) countRef.current.innerHTML = `<b>0${active + 1}</b> / 0${last + 1}`;
        if (badgeRef.current) badgeRef.current.textContent = STEPS[active].title;
      }
    };

    const tick = () => {
      measure();
      const diff = target - current;
      if (Math.abs(diff) > 0.0004) {
        current += diff * 0.07; // slow eased follow — this is the smoothness
        paint(current);
      }
      raf = requestAnimationFrame(tick);
    };

    measure();
    current = 0;
    paint(0);
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      io?.disconnect();
    };
  }, [stickyTop, autoFixSticky, debug]);

  return (
    <div className="huRoot" ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <section aria-labelledby="how-to-use-title">
        <div className="huScroller" ref={scrollerRef}>
          <div className="huStage" ref={stageRef}>
            <header className="huHead">
              <h2 className="huTitle" id="how-to-use-title">
                How to <em>use</em> Leira
              </h2>
              <span className="huRule" aria-hidden="true" />
              
            </header>

            <div className="huGrid">
              <div className="huVisual" ref={shotsRef}>
                {STEPS.map((s, i) => (
                  <div className={i === 0 ? "huShot on" : "huShot"} key={s.n} aria-hidden="true">
                    <img src={s.img} alt="" loading="lazy" />
                  </div>
                ))}
                <span className="huBadge" aria-hidden="true">
                  <i />
                  <span ref={badgeRef}>{STEPS[0].title}</span>
                </span>
              </div>

              <div className="huRight">
                <div className="huPane" ref={stepsRef}>
                  {STEPS.map((s, i) => (
                    <article className={i === 0 ? "huStep on" : "huStep"} key={s.n}>
                      <span className="huGhost" aria-hidden="true">
                        {s.n}
                      </span>
                      <span className="huNum" aria-hidden="true">
                        <b>{s.n}</b>
                        <i />
                      </span>
                      <h3 className="huName">{s.title}</h3>
                      <p className="huCopy">{s.copy}</p>
                    </article>
                  ))}
                </div>

                <div className="huDots" ref={dotsRef} aria-hidden="true">
                  {STEPS.map((s) => (
                    <b key={s.n} />
                  ))}
                </div>
              </div>
            </div>

            <p className="huNote">
              <span aria-hidden="true" />
              <span style={{ width: "auto", height: "auto", margin: 0, background: "none", boxShadow: "none", borderRadius: 0 }}>
                <b>For external use only.</b> Avoid freshly shaved skin — wait 24 hours. Leira
                complements your daily cleansing, it doesn&apos;t replace it.
              </span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}