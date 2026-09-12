"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingBag, Star, Zap, ChevronUp, ChevronDown } from "lucide-react";
import { MiniNavbar } from "@/components/ui/mini-navbar";
import Footer from "@/components/Footer";
import { useProducts, Product } from "@/hooks/useProducts";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { reviewAPI } from "@/lib/api";
import { cn, strikethroughPriceIfHigher } from "@/lib/utils";
import { pickShopCardPath } from "@/lib/product-card-images";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { getProductShopPath } from "@/lib/product-slugs";

const HOW_TO_USE_INFOGRAPHIC_SRC = encodeURI("/How to use leira.png");

const EASE = [0.22, 1, 0.36, 1] as const;
const INK = "text-[#7a2c4e]";
const BODY = "text-[#6b5560]";
const HAIR = "border-[#7a2c4e]/[0.12]";

const GRAIN =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* USPs cycle automatically inside each card — short, factual, and
   generic across the whole line rather than invented per product. */
const USP_ROTATION = ["Alcohol-free", "pH-balanced", "100% natural oils", "Dermatologically tested"];

function Grain({ opacity = 0.03 }: { opacity?: number }) {
    return <span aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ backgroundImage: GRAIN, opacity }} />;
}

/** Guarantees a visible ₹ sign — some price sources return a bare number. */
function formatRupee(value?: string | number): string {
    if (value === undefined || value === null || value === "") return "";
    const str = String(value).trim();
    return str.startsWith("₹") ? str : `₹${str}`;
}

/** Plain <img>, not next/image — for product photography. next/image's
    optimizer requires a whitelisted remote domain; a native <img> has
    no such requirement, so it either shows the real photo or falls
    back to this soft monogram tile. Never a broken-image icon. */
function SafeImg({
    src,
    alt,
    label,
    className,
}: {
    src: string;
    alt: string;
    label?: string;
    className?: string;
}) {
    const [broken, setBroken] = useState(false);
    if (!src || broken) {
        return (
            <div className={cn("flex items-center justify-center bg-[#f6f4f2]", className)}>
                <span className="font-serif text-[30px] font-light italic text-[#7a2c4e]/25">
                    {(label || alt || "L").trim().charAt(0).toUpperCase()}
                </span>
            </div>
        );
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading="lazy" className={className} onError={() => setBroken(true)} />;
}

function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay, ease: EASE }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/* ------------------------------------------------------------------
   RATING ROW — stars + review count. Reads straight from the stats
   already fetched for this product; renders nothing if there isn't
   any review data yet, rather than showing a fake "0 reviews" line.
------------------------------------------------------------------- */
function RatingRow({ stats }: { stats?: { avgRating: number; totalCount: number } }) {
    if (!stats || stats.totalCount === 0) return null;
    const rounded = Math.round(stats.avgRating);
    return (
        <div className="flex items-center justify-center gap-1.5">
            <span className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                        key={n}
                        className={cn("h-3 w-3", n <= rounded ? "fill-[#ec4899] text-[#ec4899]" : "text-[#7a2c4e]/20")}
                        strokeWidth={1.4}
                    />
                ))}
            </span>
            <span className="text-[11.5px] font-light text-[#6b5560]/70">({stats.totalCount})</span>
        </div>
    );
}

/* ------------------------------------------------------------------
   USP TICKER — a vertical bar: the current claim slides up and fades
   out, the next slides up from below and fades in. Auto-advances on
   an interval, and can also be stepped manually with the up/down
   controls (both pause the auto-advance briefly so they don't fight).
------------------------------------------------------------------- */
function UspTicker() {
    const [index, setIndex] = useState(0);
    const pausedUntilRef = useRef(0);

    useEffect(() => {
        let reduced = false;
        try {
            reduced = !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        } catch {
            reduced = false;
        }
        if (reduced) return;

        const id = window.setInterval(() => {
            if (Date.now() < pausedUntilRef.current) return;
            setIndex((i) => (i + 1) % USP_ROTATION.length);
        }, 2600);
        return () => window.clearInterval(id);
    }, []);

    const step = (dir: 1 | -1, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        pausedUntilRef.current = Date.now() + 4000; // give manual control room to breathe
        setIndex((i) => (i + dir + USP_ROTATION.length) % USP_ROTATION.length);
    };

    return (
        <div className="mx-auto mt-2.5 flex items-center justify-center gap-2">
            <button
                type="button"
                onClick={(e) => step(-1, e)}
                aria-label="Previous highlight"
                className="text-[#7a2c4e]/25 transition-colors hover:text-[#ec4899]"
            >
                <ChevronUp className="h-3 w-3" strokeWidth={2} />
            </button>

            <div className="relative h-[16px] w-[152px] overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                        key={index}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ duration: 0.35, ease: EASE }}
                        className="absolute inset-x-0 top-0 block text-center text-[10.5px] font-medium uppercase tracking-[0.1em] text-[#a8823f]"
                    >
                        {USP_ROTATION[index]}
                    </motion.span>
                </AnimatePresence>
            </div>

            <button
                type="button"
                onClick={(e) => step(1, e)}
                aria-label="Next highlight"
                className="text-[#7a2c4e]/25 transition-colors hover:text-[#ec4899]"
            >
                <ChevronDown className="h-3 w-3" strokeWidth={2} />
            </button>
        </div>
    );
}

/* ------------------------------------------------------------------
   PRODUCT CARD
------------------------------------------------------------------- */
function ProductCard({
    product,
    priority,
    stats,
    onAddToCart,
    onBuyNow,
}: {
    product: Product;
    priority: boolean;
    stats?: { avgRating: number; totalCount: number };
    onAddToCart: (p: Product) => void;
    onBuyNow: (p: Product) => void;
}) {
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const [hovered, setHovered] = useState(false);
    const pid = product._id || product.id;
    const inWishlist = isInWishlist(pid);
    const coverPath = pickShopCardPath(product);
    const coverUrl = coverPath ? resolveMediaUrl(coverPath) : "/images/placeholder.png";
    const secondUrl = Array.isArray(product.images) && product.images.length > 1 ? resolveMediaUrl(product.images[1]) : null;
    const isOutOfStock = product.status === "inactive" || Number(product.stock ?? 0) <= 0;
    const original = strikethroughPriceIfHigher(product.price || "", product.originalPrice);

    // savings — only shown when we actually have both numbers to compare
    const currentNum = Number(String(product.price || "").replace(/[^0-9.]/g, "")) || 0;
    const originalNum = Number(String(product.originalPrice || "").replace(/[^0-9.]/g, "")) || 0;
    const savingsPercent = originalNum > currentNum && originalNum > 0 ? Math.round(((originalNum - currentNum) / originalNum) * 100) : 0;

    const shortDesc = (product as any).detailTagline || product.description || "";

    return (
        <div
            className="group relative flex h-full flex-col overflow-hidden rounded-[14px] border border-[#7a2c4e]/[0.08] bg-white p-4 transition-shadow duration-500 hover:shadow-[0_24px_48px_-34px_rgba(122,44,78,0.28)] sm:p-5"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <Link href={getProductShopPath(product)} className="block">
                {/* the photo fills its slot completely — the coloured card
                    around it does the framing instead of internal padding */}
                <div className="relative aspect-[4/5] overflow-hidden rounded-[10px] bg-[#f6f4f2]">
                    <SafeImg
                        src={coverUrl}
                        alt={product.name}
                        label={product.name}
                        className={cn(
                            "h-full w-full object-cover transition-all duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]",
                            secondUrl && hovered ? "opacity-0" : "opacity-100"
                        )}
                    />
                    {secondUrl && (
                        <SafeImg
                            src={secondUrl}
                            alt={`${product.name} — alternate view`}
                            label={product.name}
                            className={cn(
                                "absolute inset-0 h-full w-full object-cover transition-opacity duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                                hovered ? "opacity-100" : "opacity-0"
                            )}
                        />
                    )}

                    {isOutOfStock ? (
                        <span className="absolute left-3 top-3 rounded-[3px] bg-[#7a2c4e] px-3.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white">
                            Sold out
                        </span>
                    ) : savingsPercent > 0 ? (
                        <span className="absolute left-3 top-3 rounded-[3px] bg-[#ec4899] px-3.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white">
                            Save {savingsPercent}%
                        </span>
                    ) : null}
                </div>

                <div className="mt-4 text-center">
                    <RatingRow stats={stats} />

                    <h3
                        className={cn(
                            "font-serif text-[20px] font-light capitalize leading-[1.2] transition-colors group-hover:text-[#ec4899] md:text-[22px]",
                            stats && stats.totalCount > 0 ? "mt-1.5" : "",
                            INK
                        )}
                    >
                        {product.name}
                    </h3>

                    {shortDesc ? (
                        <p className={cn("mx-auto mt-1.5 line-clamp-2 max-w-[36ch] text-[13px] font-light leading-[1.55]", BODY)}>
                            {shortDesc}
                        </p>
                    ) : null}

                    <UspTicker />

                    {/* price — the ₹ sign sits smaller and lighter beside a
                        bolder numeral; savings called out beneath rather
                        than crowding the price line itself */}
                    <div className="mt-2 flex items-baseline justify-center gap-2.5">
                        <span className="font-serif text-[23px] font-normal tabular-nums text-[#ec4899] md:text-[25px]">
                            <span className="mr-0.5 text-[15px] font-light align-baseline text-[#ec4899]/80">₹</span>
                            {formatRupee(product.price).replace("₹", "")}
                        </span>
                        {original ? (
                            <span className="text-[12px] font-light tabular-nums text-[#6b5560]/50 line-through">{formatRupee(original)}</span>
                        ) : null}
                    </div>

                    {savingsPercent > 0 && originalNum > currentNum && (
                        <p className="mt-1 text-[11px] font-medium text-emerald-700">
                            You save {formatRupee(String(originalNum - currentNum))}
                        </p>
                    )}
                </div>
            </Link>

            {/* wishlist */}
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    inWishlist ? removeFromWishlist(pid) : addToWishlist(pid);
                }}
                aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
                className={cn(
                    "absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-[8px] border backdrop-blur-md transition-all duration-400",
                    inWishlist
                        ? "border-transparent bg-[#ec4899] text-white opacity-100"
                        : "border-white/70 bg-white/70 text-[#7a2c4e]/55 opacity-0 hover:text-[#ec4899] group-hover:opacity-100"
                )}
            >
                <Heart className={cn("h-[14px] w-[14px]", inWishlist && "fill-current")} strokeWidth={1.6} />
            </button>

            {/* CTAs — Buy Now leads (filled), Add to bag is the quieter
                second action (outline), always visible. Both stop the
                click from also triggering the card's own navigation. */}
            <div className="mt-auto flex gap-2 pt-5">
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAddToCart(product);
                    }}
                    disabled={isOutOfStock}
                    className={cn(
                        "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[4px] border text-[10px] uppercase tracking-[0.14em] transition-colors duration-300",
                        isOutOfStock
                            ? "cursor-not-allowed border-[#7a2c4e]/10 text-[#7a2c4e]/35"
                            : "border-[#7a2c4e]/20 text-[#7a2c4e] hover:border-[#7a2c4e]/35 hover:bg-[#7a2c4e]/[0.03]"
                    )}
                >
                    <ShoppingBag className="h-[12px] w-[12px]" strokeWidth={1.6} />
                    Add to bag
                </button>

                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onBuyNow(product);
                    }}
                    disabled={isOutOfStock}
                    className={cn(
                        "group/cta relative flex h-11 flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-[4px] text-[10px] uppercase tracking-[0.14em] transition-transform duration-500",
                        isOutOfStock
                            ? "cursor-not-allowed bg-[#7a2c4e]/10 text-[#7a2c4e]/35"
                            : "bg-gradient-to-br from-[#f9a8d4] to-[#ec4899] text-white shadow-[0_14px_28px_-16px_rgba(236,72,153,0.85)] hover:-translate-y-0.5"
                    )}
                >
                    <span className="relative z-10 flex items-center gap-1.5">
                        <Zap className="h-[12px] w-[12px]" strokeWidth={1.8} />
                        {isOutOfStock ? "Sold out" : "Buy now"}
                    </span>
                    {!isOutOfStock && (
                        <span aria-hidden className="absolute inset-0 translate-y-full bg-[#7a2c4e] transition-transform duration-500 group-hover/cta:translate-y-0" />
                    )}
                </button>
            </div>
        </div>
    );
}

export default function ShopPageClient({ initialProducts = [] }: { initialProducts?: Product[] }) {
    const { products, loading } = useProducts(initialProducts);
    const { addToCart } = useCart();
    const { success, error } = useToast();
    const router = useRouter();
    const [reviewStatsMap, setReviewStatsMap] = useState<Record<string, { avgRating: number; totalCount: number }>>({});

    const shopProducts = useMemo(() => {
        const safeOrder = (v: unknown) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
        };
        const isShopVisible = (p: Product) => {
            if (typeof p.showInShopSection === "boolean") return p.showInShopSection;
            return !Boolean(p.showInComboSection);
        };
        return [...products]
            .filter(isShopVisible)
            .sort((a, b) => {
                const byOrder = safeOrder(a.shopSectionOrder) - safeOrder(b.shopSectionOrder);
                if (byOrder !== 0) return byOrder;
                return String(a.name || "").localeCompare(String(b.name || ""));
            });
    }, [products]);

    const productIds = useMemo(() => shopProducts.map((p) => p._id).filter((id): id is string => !!id), [shopProducts]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!productIds.length) {
                setReviewStatsMap({});
                return;
            }
            try {
                const res = await reviewAPI.getStatsByProducts(productIds);
                if (mounted && res?.success) setReviewStatsMap(res.data || {});
            } catch {
                if (mounted) setReviewStatsMap({});
            }
        })();
        return () => {
            mounted = false;
        };
    }, [productIds]);

    const handleAddToCart = async (product: Product, opts?: { silent?: boolean }) => {
        const productId = product._id || product.id;
        if (!productId) return;
        const isOutOfStock = product.status === "inactive" || Number(product.stock ?? 0) <= 0;
        if (isOutOfStock) {
            error("This product is out of stock");
            return;
        }
        const thumbPath = pickShopCardPath(product);
        const imageUrl = thumbPath ? resolveMediaUrl(thumbPath) : "/images/placeholder.png";
        const snapshot = { name: product.name, price: product.price || "₹0", imageUrl };
        try {
            await addToCart(productId, 1, snapshot);
            if (!opts?.silent) success(`${product.name} added to your bag`);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "";
            if (msg.includes("customer to add to cart") || msg.includes("Not authorized") || msg.includes("User not found")) {
                error("Please log in to add to cart");
                router.push("/login");
            } else {
                error(msg || "Could not add to cart");
            }
            throw e;
        }
    };

    /* Buy Now adds the item to cart, then opens the existing cart /
       checkout drawer directly via the same custom event it already
       listens for elsewhere in the app — no new checkout route
       invented, just the shortest path into the flow that exists. */
    const handleBuyNow = async (product: Product) => {
        try {
            await handleAddToCart(product, { silent: true });
            window.dispatchEvent(new Event("leira:cart:open"));
        } catch {
            // handleAddToCart already surfaced the error toast / login redirect
        }
    };

    return (
        <>
            <MiniNavbar />
            <main className="leira-underlap-nav-spacer min-h-screen bg-white">
                {/* ---------------- masthead ---------------- */}
                <section className="relative isolate [overflow:clip] bg-gradient-to-b from-[#fdf1f5] via-[#fff7fa] to-[#fffdfc] px-5 pb-12 pt-14 text-center sm:px-8 md:pb-16 md:pt-20 lg:px-12">
                    <Grain />
                    <div className="mx-auto max-w-2xl">
                        <Reveal>
                            <span className="text-[11px] font-light uppercase tracking-[0.3em] text-[#ec4899]/75">Our collection</span>
                        </Reveal>
                        <Reveal delay={0.08}>
                            <h1 className={cn("mt-4 font-serif text-[clamp(34px,5.4vw,60px)] font-light leading-[1.05] tracking-tight", INK)}>
                                Shop Leira
                            </h1>
                        </Reveal>
                        <Reveal delay={0.16}>
                            <span aria-hidden className="mx-auto mt-6 block h-px w-14 bg-gradient-to-r from-transparent via-[#d8b06a] to-transparent" />
                        </Reveal>
                        <Reveal delay={0.22}>
                            <p className={cn("mx-auto mt-5 max-w-[48ch] text-[14.5px] font-light leading-[1.8]", BODY)}>
                                Three essential-oil intimate perfumes. Alcohol-free, pH-balanced, made for sensitive skin.
                            </p>
                        </Reveal>
                    </div>
                </section>

                {/* ---------------- grid ---------------- */}
                <section className="bg-[#fffdfc] px-5 pb-20 pt-12 sm:px-8 md:pb-28 md:pt-16 lg:px-12">
                    <div className="mx-auto max-w-6xl">
                        {loading ? (
                            <div className="flex flex-col items-center py-20 text-center">
                                <span className="block h-9 w-9 animate-spin rounded-full border border-[#7a2c4e]/15 border-t-[#ec4899]" />
                                <p className={cn("mt-6 font-serif text-[18px] font-light italic", INK)}>Loading the collection…</p>
                            </div>
                        ) : shopProducts.length === 0 ? (
                            <div className="mx-auto max-w-md py-16 text-center">
                                <p className={cn("font-serif text-[21px] font-light", INK)}>Everything is in the combo edit right now.</p>
                                <Link href="/combo" className="mt-6 inline-block border-b border-[#ec4899]/40 pb-1 font-serif text-[17px] text-[#ec4899] hover:border-[#ec4899]">
                                    View signature combos
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 items-stretch gap-x-6 gap-y-12 sm:gap-x-8 lg:grid-cols-3 lg:gap-x-10">
                                {shopProducts.map((product, index) => {
                                    const pid = product._id || product.id;
                                    return (
                                        <Reveal key={pid} delay={Math.min(index, 5) * 0.06} className="h-full">
                                            <ProductCard
                                                product={product}
                                                priority={index < 3}
                                                stats={pid ? reviewStatsMap[pid] : undefined}
                                                onAddToCart={handleAddToCart}
                                                onBuyNow={handleBuyNow}
                                            />
                                        </Reveal>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                {/* ---------------- how to use ---------------- */}
                <section className="relative isolate [overflow:clip] bg-gradient-to-b from-[#fdeef4] via-[#fff5f9] to-[#fffdfc] px-5 py-16 sm:px-8 md:py-24 lg:px-12">
                    <Grain />
                    <div className="mx-auto max-w-3xl text-center">
                        <Reveal>
                            <span className="text-[11px] font-light uppercase tracking-[0.3em] text-[#ec4899]/75">The ritual</span>
                            <h2 className={cn("mt-4 font-serif text-[clamp(24px,3vw,36px)] font-light leading-[1.15]", INK)}>How to use Leira</h2>
                        </Reveal>
                        <Reveal delay={0.12}>
                            <div className="relative mx-auto mt-10 max-w-[820px] overflow-hidden rounded-[8px] border border-[#7a2c4e]/[0.1] bg-white/70 shadow-[0_36px_70px_-48px_rgba(122,44,78,0.45)]">
                                <Image
                                    src={HOW_TO_USE_INFOGRAPHIC_SRC}
                                    alt="Leira — how to use"
                                    width={1125}
                                    height={1398}
                                    className="h-auto w-full object-contain object-top"
                                    sizes="(max-width: 768px) 100vw, 820px"
                                    quality={90}
                                />
                            </div>
                        </Reveal>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}