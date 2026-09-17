"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/ui/toast";

/* ------------------------------------------------------------------
   PRODUCTS
   Fixed from the original file, where every product pointed at the
   wrong bottle photo (Ylang Ylang → a Damask Rose image, Damask Rose
   → the Jasmine image, Jasmine → a Damask Rose image). Matched each
   name to the file that actually says that name.

   NOTE: there is no bottle asset in the original list whose filename
   says "Ylang Ylang" — only two Damask Rose colourways (Brown, Black)
   and one Jasmine (White). Ylang Ylang below is temporarily pointed
   at the Black Damask Rose bottle as a placeholder so the layout
   isn't broken — swap in the real Ylang Ylang photo when you have it.
------------------------------------------------------------------- */
const products = [
    {
        id: 1,
        badge: "Bestseller",
        name: "Ylang Ylang",
        description: "A warm, sensual intimate fragrance.",
        price: "₹2,399",
        originalPrice: "₹2,999",
        image: "/products/LEIRA-Bottle_Damask-Rose_Black.png", // TODO: replace with real Ylang Ylang bottle photo
        hoverImage: "/products/hover.jpg",
        href: "/shop/ylang-ylang",
    },
    {
        id: 2,
        badge: "Bestseller",
        name: "Damask Rose",
        description: "A rich floral fragrance with a soft romantic finish.",
        price: "₹2,399",
        originalPrice: "₹2,999",
        image: "/products/LEIRA-Bottle_Damask Rose_Brown.png",
        hoverImage: "/products/hover3.webp",
        href: "/shop/damask-rose",
    },
    {
        id: 3,
        badge: "Bestseller",
        name: "Jasmine",
        description: "A light, fresh and delicate intimate fragrance.",
        price: "₹2,399",
        originalPrice: "₹2,999",
        image: "/products/LEIRA-Bottle_Jasmine_White.png",
        hoverImage: "/products/hover2.jpg",
        href: "/shop/jasmine",
    },
];

/* ------------------------------------------------------------------
   COMBOS
   Pulled directly from leiraindia.com's homepage — these are the four
   real combo listings live on the site (three duos + the Complete
   Trio), with their actual prices and savings.

   NOTE: none of these have real combo-pack photography available in
   this file's asset list, so each is temporarily shown with one of
   the single-scent bottle images as a stand-in (flagged below). Swap
   in real duo/trio pack photos before this ships — a customer buying
   a two-bottle set should see two bottles, not one.
------------------------------------------------------------------- */
const combos = [
    {
        id: 101,
        badge: "Save ₹2,399",
        name: "Jasmine × Damask Rose",
        description: "Jasmine for your bikini area, Damask Rose for your sensitive area.",
        price: "₹3,599",
        originalPrice: "₹5,998",
        image: "/products/LEIRA-Bottle_Jasmine_White.png", // TODO: real duo pack photo
        hoverImage: "/products/hover2.jpg",
        href: "/shop/jasmine-damask-rose-duo",
    },
    {
        id: 102,
        badge: "Save ₹2,399",
        name: "Damask Rose × Ylang Ylang",
        description: "Damask Rose for your sensitive area, Ylang Ylang for your private area.",
        price: "₹3,599",
        originalPrice: "₹5,998",
        image: "/products/LEIRA-Bottle_Damask Rose_Brown.png", // TODO: real duo pack photo
        hoverImage: "/products/hover3.webp",
        href: "/shop/damask-rose-ylang-ylang-duo",
    },
    {
        id: 103,
        badge: "Save ₹2,399",
        name: "Jasmine × Ylang Ylang",
        description: "Fresh by day, sensual by night — both alcohol-free and pH-balanced.",
        price: "₹3,599",
        originalPrice: "₹5,998",
        image: "/products/LEIRA-Bottle_Damask-Rose_Black.png", // TODO: real duo pack photo
        hoverImage: "/products/hover.jpg",
        href: "/shop/jasmine-ylang-ylang-duo",
    },
    {
        id: 104,
        badge: "Save ₹4,048",
        name: "The Complete Trio",
        description: "All three scents. One complete intimate care routine.",
        price: "₹4,949",
        originalPrice: "₹8,997",
        image: "/products/LEIRA-Bottle_Jasmine_White.png", // TODO: real trio pack photo
        hoverImage: "/products/hover3.webp",
        href: "/shop/complete-trio-full-mother-s-day-description",
    },
];

type ShowcaseProduct = (typeof products)[number] | (typeof combos)[number];

const GRAIN =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* ------------------------------------------------------------------
   SCROLL REVEAL CARD — `className` added so callers can size each
   card differently for the mobile horizontal row vs. the desktop grid
   (e.g. a fixed percentage width for the drag-scroll row, auto width
   once it becomes a grid item).
------------------------------------------------------------------- */
function RevealCard({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
    const ref = useRef<HTMLElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
            threshold: 0.15,
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return (
        <article
            ref={ref}
            style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
            className={`transform transition-all duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                visible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
            } ${className}`}
        >
            {children}
        </article>
    );
}

/* ------------------------------------------------------------------
   PRODUCT CARD — shared by both rows so singles and combos look and
   behave identically; only the data feeding them differs.
------------------------------------------------------------------- */
function ProductCard({
    product,
    onAddToCart,
}: {
    product: ShowcaseProduct;
    onAddToCart: (product: ShowcaseProduct) => void;
}) {
    return (
        <Link
            href={product.href}
            className="group relative block h-full overflow-hidden rounded-[16px] border border-[#7a2c4e]/[0.12] bg-[#fdf1f5] transition-all duration-700 ease-out sm:hover:-translate-y-1 sm:hover:shadow-[0_28px_60px_-32px_rgba(122,44,78,0.35)]"
        >
            {/* ---- image ---- */}
            <div className="relative aspect-[0.88] overflow-hidden rounded-t-[16px] sm:aspect-[0.86] lg:aspect-[0.9]">
                <div className="absolute left-3 top-3 z-20 sm:left-5 sm:top-5">
                    <span className="inline-flex items-center rounded-full bg-[#ec4899] px-2.5 py-1 text-[7.5px] font-medium uppercase tracking-[0.14em] text-white sm:px-3.5 sm:py-1.5 sm:text-[9px] sm:tracking-[0.18em]">
                        {product.badge}
                    </span>
                </div>

                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#7a2c4e]/[0.06]" />

                <img
                    src={product.image}
                    alt={product.name}
                    className="absolute inset-0 h-full w-full object-contain p-6 transition-all duration-700 ease-out sm:group-hover:scale-[1.04] sm:group-hover:opacity-0 sm:p-10 lg:p-10"
                />
                <img
                    src={product.hoverImage}
                    alt={`${product.name} lifestyle`}
                    className="absolute inset-0 h-full w-full scale-[1.04] object-cover opacity-0 transition-all duration-700 ease-out sm:group-hover:scale-100 sm:group-hover:opacity-100"
                />

                <div className="pointer-events-none absolute inset-0 bg-[#3a1424]/[0.03] opacity-0 transition-opacity duration-700 sm:group-hover:opacity-100" />

                {/* add to cart — always visible (hover-only was invisible and
                    unclickable on touch devices, which is almost certainly why
                    it looked broken). stopPropagation/preventDefault so tapping
                    it doesn't also trigger the card's own Link navigation. */}
                <div className="absolute bottom-3 left-3 right-3 z-30 sm:bottom-5 sm:left-5 sm:right-5">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onAddToCart(product);
                        }}
                        className="group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-4 py-2.5 text-[9.5px] font-medium uppercase tracking-[0.14em] text-[#7a2c4e] shadow-[0_8px_24px_rgba(122,44,78,0.22)] transition-colors duration-300 sm:gap-3 sm:px-6 sm:py-3.5 sm:text-[11px] sm:tracking-[0.18em]"
                    >
                        <span className="relative z-10 flex items-center gap-2 transition-colors duration-300 sm:group-hover/btn:text-white sm:gap-3">
                            Add to Cart
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="sm:h-3.5 sm:w-3.5">
                                <path d="M5 12h14" />
                                <path d="m13 6 6 6-6 6" />
                            </svg>
                        </span>
                        <span aria-hidden className="absolute inset-0 translate-y-full bg-[#7a2c4e] transition-transform duration-400 sm:group-hover/btn:translate-y-0" />
                    </button>
                </div>
            </div>

            {/* ---- details ---- */}
            <div className="relative px-4 pb-5 pt-5 text-center sm:px-6 sm:pb-8 sm:pt-7 lg:px-8">
                <div className="mx-auto mb-3 h-px w-6 bg-[#ec4899] sm:mb-5 sm:w-7" />

                <h3 className="font-serif text-[17px] font-light leading-tight tracking-[-0.01em] text-[#7a2c4e] transition-colors duration-300 sm:group-hover:text-[#ec4899] sm:text-[27px] sm:leading-none sm:tracking-[-0.015em]">
                    {product.name}
                </h3>

                <p className="mx-auto mt-2 line-clamp-2 max-w-[290px] text-[11.5px] leading-[1.55] text-[#6b5560] sm:mt-4 sm:text-[13px] sm:leading-[1.7]">
                    {product.description}
                </p>

                {/* price — the ₹ sits smaller and lighter beside a bolder
                    numeral, same treatment as the shop grid */}
                <div className="mt-3 flex items-center justify-center gap-2 sm:mt-5 sm:gap-3">
                    <span className="hidden h-px w-5 bg-[#7a2c4e]/[0.15] sm:block" />
                    <p className="font-serif text-[15px] font-normal tabular-nums text-[#ec4899] sm:text-[19px]">
                        <span className="mr-0.5 text-[10.5px] font-light text-[#ec4899]/80 sm:text-[13px]">₹</span>
                        {product.price.replace("₹", "")}
                    </p>
                    {product.originalPrice && (
                        <span className="text-[11px] font-light tabular-nums text-[#6b5560]/45 line-through sm:text-[13px]">
                            {product.originalPrice}
                        </span>
                    )}
                    <span className="hidden h-px w-5 bg-[#7a2c4e]/[0.15] sm:block" />
                </div>
            </div>
        </Link>
    );
}

/* ==================================================================
   PRODUCT SHOWCASE
   ================================================================== */
export default function ProductShowcase() {
    const { addToCart } = useCart();
    const { success, error } = useToast();
    const router = useRouter();

    /* Same pattern as the shop grid: snapshot the name/price/image the
       cart needs, handle the "please log in" cases the same way, and
       otherwise surface whatever the API says went wrong. */
    const handleAddToCart = async (product: ShowcaseProduct) => {
        const snapshot = { name: product.name, price: product.price, imageUrl: product.image };
        try {
            await addToCart(String(product.id), 1, snapshot);
            success(`${product.name} added to your bag`);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "";
            if (
                msg.includes("customer to add to cart") ||
                msg.includes("Not authorized") ||
                msg.includes("User not found") ||
                msg.includes("log in")
            ) {
                error("Please log in to add to cart");
                router.push("/login");
            } else {
                error(msg || "Could not add to cart");
            }
        }
    };

    return (
        <section
            className={`
                relative isolate overflow-hidden bg-[#fffdfc] px-5 py-20 sm:px-8 md:py-24 lg:px-12 lg:py-28
                before:pointer-events-none before:absolute before:-left-28 before:-top-24 before:-z-10
                before:h-[36vw] before:max-h-[440px] before:w-[36vw] before:max-w-[440px]
                before:rounded-full before:bg-[#f9a8d4]/[0.22] before:blur-[100px] before:content-['']
                after:pointer-events-none after:absolute after:-bottom-28 after:-right-20 after:-z-10
                after:h-[30vw] after:max-h-[380px] after:w-[30vw] after:max-w-[380px]
                after:rounded-full after:bg-[#ec4899]/[0.14] after:blur-[110px] after:content-['']
            `}
        >
            <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03]" style={{ backgroundImage: GRAIN }} />

            <div className="relative mx-auto max-w-[1500px]">
                {/* ---------------- header 1 — singles ---------------- */}
                <header className="mx-auto mb-10 max-w-3xl px-5 text-center sm:mb-16 sm:px-0 md:mb-20">
                    <span className="inline-flex items-center gap-2.5 rounded-full bg-[#ec4899]/10 px-4 py-1.5 text-[10.5px] uppercase tracking-[0.26em] text-[#ec4899]">
                        <i aria-hidden className="block h-1.5 w-1.5 rounded-full bg-[#ec4899]" />
                        The Leira Collection
                    </span>

                    <h2 className="mt-6 font-serif text-[2.5rem] font-light leading-[1.08] tracking-[-0.02em] text-[#7a2c4e] sm:text-[3.2rem] md:text-[2rem] lg:text-[3rem]">
                        Intimate Odour Meet,
                        <br />
                        <em className="not-italic text-[#ec4899]"> a Gentle Solution.</em>
                    </h2>

                    <span aria-hidden className="mx-auto mt-6 block h-px w-14 bg-gradient-to-r from-transparent via-[#ec4899] to-transparent" />

                    <p className="mx-auto mt-6 max-w-xl text-[14px] leading-[1.9] tracking-[0.01em] text-[#6b5560] sm:text-[15px]">
                        Infused with pure essential oils, each fragrance is thoughtfully created to keep you
                        feeling fresh, confident and unstoppable.
                    </p>
                </header>

                {/* ---------------- single scents ----------------
                    Mobile: horizontal drag/swipe row, one card mostly
                    in frame with the next peeking in to invite scrolling.
                    sm: and up: back to the original grid, untouched. */}
                <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pl-8 pr-6 overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pl-0 lg:grid-cols-3">
                    {products.map((product, index) => (
                        <RevealCard
                            key={product.id}
                            delay={index * 250}
                            className="w-[68%] shrink-0 snap-start sm:w-auto sm:shrink sm:snap-align-none"
                        >
                            <ProductCard product={product} onAddToCart={handleAddToCart} />
                        </RevealCard>
                    ))}
                </div>

                {/* ---------------- header 2 — combos ---------------- */}
                <div className="mt-14 px-5 text-center sm:px-0 md:mt-16">
                    <span className="inline-flex items-center gap-2.5 rounded-full bg-[#ec4899]/10 px-4 py-1.5 text-[10.5px] uppercase tracking-[0.26em] text-[#ec4899]">
                        <i
                            aria-hidden
                            className="block h-1.5 w-1.5 rounded-full bg-[#ec4899]"
                        />
                        Save more, together
                    </span>
                
                    <h3 className="mt-4 font-serif text-[1.6rem] font-light leading-[1.15] text-[#7a2c4e] sm:text-[2rem]">
                        Signature combos
                    </h3>
                </div>

                {/* ---------------- combos ----------------
                    Same mobile drag-row treatment, slightly narrower per
                    card since there are 4 to imply more content off-screen. */}
                <div className="-mx-5 mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pl-8 pr-6 overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mt-10 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pl-0 lg:grid-cols-4">
                    {combos.map((combo, index) => (
                        <RevealCard
                            key={combo.id}
                            delay={index * 200}
                            className="w-[58%] shrink-0 snap-start sm:w-auto sm:shrink sm:snap-align-none"
                        >
                            <ProductCard product={combo} onAddToCart={handleAddToCart} />
                        </RevealCard>
                    ))}
                </div>

                {/* ---------------- bottom cta ---------------- */}
                <div className="mt-14 flex justify-center md:mt-16">
                    <button className="group inline-flex items-center gap-4 border-b border-[#7a2c4e]/25 pb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-[#7a2c4e] transition-all duration-300 sm:hover:gap-6 sm:hover:text-[#ec4899]">
                        <span>Explore the collection</span>
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="transition-transform duration-300 sm:group-hover:translate-x-1"
                        >
                            <path d="M5 12h14" />
                            <path d="m13 6 6 6-6 6" />
                        </svg>
                    </button>
                </div>
            </div>
        </section>
    );
}