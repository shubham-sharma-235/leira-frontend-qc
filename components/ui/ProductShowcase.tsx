"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
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
        price: "₹3,000",
        image: "/products/LEIRA-Bottle_Damask-Rose_Black.png", // TODO: replace with real Ylang Ylang bottle photo
        hoverImage: "/products/hover.jpg",
    },
    {
        id: 2,
        badge: "Bestseller",
        name: "Damask Rose",
        description: "A rich floral fragrance with a soft romantic finish.",
        price: "₹3,000",
        image: "/products/LEIRA-Bottle_Damask Rose_Brown.png",
        hoverImage: "/products/hover3.webp",
    },
    {
        id: 3,
        badge: "Bestseller",
        name: "Jasmine",
        description: "A light, fresh and delicate intimate fragrance.",
        price: "₹3,000",
        image: "/products/LEIRA-Bottle_Jasmine_White.png",
        hoverImage: "/products/hover2.jpg",
    },
];

const GRAIN =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* ------------------------------------------------------------------
   SCROLL REVEAL CARD — unchanged behaviour, `React.ReactNode` swapped
   for the imported `ReactNode` type (the original referenced the
   `React` namespace without ever importing it, which fails to
   type-check under most tsconfig setups).
------------------------------------------------------------------- */
function RevealCard({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
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
            }`}
        >
            {children}
        </article>
    );
}

/* ==================================================================
   PRODUCT SHOWCASE — recoloured onto Leira's own palette:
   ink #7a2c4e, pink #ec4899, gold #d8b06a, blush #fdf1f5/#fffdfc.
   Background glow is done as before:/after: pseudo-elements, same
   as the rest of the site, instead of the beige blurred <div>.
   ================================================================== */
export default function ProductShowcase() {
    const { addToCart } = useCart();
    const { success, error } = useToast();
    const router = useRouter();

    /* Same pattern as the shop grid: snapshot the name/price/image the
       cart needs, handle the "please log in" cases the same way, and
       otherwise surface whatever the API says went wrong. */
    const handleAddToCart = async (product: (typeof products)[number]) => {
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
                {/* ---------------- header ---------------- */}
                <header className="mx-auto mb-16 max-w-3xl text-center md:mb-20">
                    <span className="inline-flex items-center gap-2.5 rounded-full bg-[#ec4899]/10 px-4 py-1.5 text-[10.5px] uppercase tracking-[0.26em] text-[#ec4899]">
                        <i aria-hidden className="block h-1.5 w-1.5 rounded-full bg-[#ec4899]" />
                        The Leira Collection
                    </span>

                    <h2 className="mt-6 font-serif text-[2.5rem] font-light leading-[1.08] tracking-[-0.02em] text-[#7a2c4e] sm:text-[3.2rem] md:text-[2rem] lg:text-[3rem]">
                        Intimate care,
                        <br />
                        <em className="not-italic text-[#ec4899]">beautifully considered.</em>
                    </h2>

                    <span aria-hidden className="mx-auto mt-6 block h-px w-14 bg-gradient-to-r from-transparent via-[#d8b06a] to-transparent" />

                    <p className="mx-auto mt-6 max-w-xl text-[14px] leading-[1.9] tracking-[0.01em] text-[#6b5560] sm:text-[15px]">
                        Infused with pure essential oils, each fragrance is thoughtfully created to keep you
                        feeling fresh, confident and unstoppable.
                    </p>
                </header>

                {/* ---------------- products ---------------- */}
                <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {products.map((product, index) => (
                        <RevealCard key={product.id} delay={index * 250}>
                            <div className="group relative overflow-hidden rounded-[16px] border border-[#7a2c4e]/[0.12] bg-[#fdf1f5] transition-all duration-700 ease-out hover:-translate-y-1 hover:shadow-[0_28px_60px_-32px_rgba(122,44,78,0.35)]">
                                {/* ---- image ---- */}
                                <div className="relative aspect-[0.88] overflow-hidden rounded-t-[16px] sm:aspect-[0.86] lg:aspect-[0.9]">
                                    <div className="absolute right-5 top-5 z-20">
                                        <span className="font-serif text-[13px] tracking-[0.12em] text-[#7a2c4e]/45">0{product.id}</span>
                                    </div>

                                    <div className="absolute left-5 top-5 z-20">
                                        <span className="inline-flex items-center rounded-full bg-[#ec4899] px-3.5 py-1.5 text-[9px] font-medium uppercase tracking-[0.18em] text-white">
                                            {product.badge}
                                        </span>
                                    </div>

                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#7a2c4e]/[0.06]" />

                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="absolute inset-0 h-full w-full object-contain p-10 transition-all duration-700 ease-out group-hover:scale-[1.04] group-hover:opacity-0 sm:p-12 lg:p-10"
                                    />
                                    <img
                                        src={product.hoverImage}
                                        alt={`${product.name} lifestyle`}
                                        className="absolute inset-0 h-full w-full scale-[1.04] object-cover opacity-0 transition-all duration-700 ease-out group-hover:scale-100 group-hover:opacity-100"
                                    />

                                    <div className="pointer-events-none absolute inset-0 bg-[#3a1424]/[0.03] opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

                                    {/* add to cart — sweeps to ink on hover, same pattern as the
                                        rest of the site's buttons */}
                                    <div className="absolute bottom-5 left-5 right-5 z-30 translate-y-4 opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                                        <button
                                            type="button"
                                            onClick={() => handleAddToCart(product)}
                                            className="group/btn relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-white/95 px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[#7a2c4e] shadow-[0_8px_30px_rgba(122,44,78,0.14)] backdrop-blur-sm transition-colors duration-300"
                                        >
                                            <span className="relative z-10 flex items-center gap-3 transition-colors duration-300 group-hover/btn:text-white">
                                                Add to Cart
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <path d="M5 12h14" />
                                                    <path d="m13 6 6 6-6 6" />
                                                </svg>
                                            </span>
                                            <span aria-hidden className="absolute inset-0 translate-y-full bg-[#7a2c4e] transition-transform duration-400 group-hover/btn:translate-y-0" />
                                        </button>
                                    </div>
                                </div>

                                {/* ---- details ---- */}
                                <div className="relative px-6 pb-8 pt-7 text-center sm:px-8">
                                    <div className="mx-auto mb-5 h-px w-7 bg-[#d8b06a]" />

                                    <h3 className="font-serif text-[27px] font-light leading-none tracking-[-0.015em] text-[#7a2c4e] transition-colors duration-300 group-hover:text-[#ec4899]">
                                        {product.name}
                                    </h3>

                                    <p className="mx-auto mt-4 max-w-[290px] text-[13px] leading-[1.7] text-[#6b5560]">
                                        {product.description}
                                    </p>

                                    {/* price — the ₹ sits smaller and lighter beside a bolder
                                        numeral, same treatment as the shop grid */}
                                    <div className="mt-5 flex items-center justify-center gap-3">
                                        <span className="h-px w-5 bg-[#7a2c4e]/[0.15]" />
                                        <p className="font-serif text-[19px] font-normal tabular-nums text-[#ec4899]">
                                            <span className="mr-0.5 text-[13px] font-light text-[#ec4899]/80">₹</span>
                                            {product.price.replace("₹", "")}
                                        </p>
                                        <span className="h-px w-5 bg-[#7a2c4e]/[0.15]" />
                                    </div>
                                </div>
                            </div>
                        </RevealCard>
                    ))}
                </div>

                {/* ---------------- bottom cta ---------------- */}
                <div className="mt-14 flex justify-center md:mt-16">
                    <button className="group inline-flex items-center gap-4 border-b border-[#7a2c4e]/25 pb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-[#7a2c4e] transition-all duration-300 hover:gap-6 hover:text-[#ec4899]">
                        <span>Explore the collection</span>
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="transition-transform duration-300 group-hover:translate-x-1"
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