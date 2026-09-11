"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, ShoppingBag } from "lucide-react";
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
            <div className={cn("flex items-center justify-center bg-[#f3dce8]", className)}>
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
   Minimal product card — image, name, price. One quiet wishlist icon
   and one quiet add-to-bag icon, both hidden until hover, and the
   whole card is the link to the product. No stacked buttons, no
   competing badges — the photograph and the price do the talking.
------------------------------------------------------------------- */
function ProductCard({
    product,
    priority,
    onAddToCart,
}: {
    product: Product;
    priority: boolean;
    onAddToCart: (p: Product) => void;
}) {
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const [hovered, setHovered] = useState(false);
    const pid = product._id || product.id;
    const inWishlist = isInWishlist(pid);
    const coverPath = pickShopCardPath(product);
    const coverUrl = coverPath ? resolveMediaUrl(coverPath) : "/images/placeholder.png";
    // a second photo, if the product has one, crossfades in on hover —
    // a small, quietly premium interaction rather than a static tile
    const secondUrl = Array.isArray(product.images) && product.images.length > 1 ? resolveMediaUrl(product.images[1]) : null;
    const isOutOfStock = product.status === "inactive" || Number(product.stock ?? 0) <= 0;
    const original = strikethroughPriceIfHigher(product.price || "", product.originalPrice);

    return (
        <div
            className="group relative overflow-hidden rounded-[14px] bg-[#fdf1f5] p-4 transition-shadow duration-500 hover:shadow-[0_28px_54px_-36px_rgba(122,44,78,0.4)] sm:p-5"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <Link href={getProductShopPath(product)} className="block">
                {/* the photo fills its slot completely — no inset padding,
                    no letterboxing — the coloured card around it does the
                    framing instead */}
                <div className="relative aspect-[4/5] overflow-hidden rounded-[10px] bg-[#f3dce8]">
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

                    {isOutOfStock && (
                        <span className="absolute left-3 top-3 rounded-[3px] bg-[#7a2c4e] px-3.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white">
                            Sold out
                        </span>
                    )}
                </div>

                <div className="mt-4 text-center">
                    <h3 className={cn("font-serif text-[21px] font-light capitalize leading-[1.2] transition-colors group-hover:text-[#ec4899] md:text-[23px]", INK)}>
                        {product.name}
                    </h3>
                    {/* price is the visual lead on the card — the ₹ sign sits
                        smaller and lighter beside a bolder numeral, rather than
                        both characters competing at the same weight */}
                    <div className="mt-2.5 flex items-baseline justify-center gap-2.5">
                        <span className="font-serif text-[24px] font-normal tabular-nums text-[#ec4899] md:text-[26px]">
                            <span className="mr-0.5 text-[16px] font-light align-baseline text-[#ec4899]/80">₹</span>
                            {formatRupee(product.price).replace("₹", "")}
                        </span>
                        {original ? (
                            <span className="text-[12px] font-light tabular-nums text-[#6b5560]/50 line-through">{formatRupee(original)}</span>
                        ) : null}
                    </div>
                </div>
            </Link>

            {/* wishlist — the one quiet icon action, still hover-revealed */}
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
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

            {/* the one deliberate, always-visible CTA — a real pill button,
                not an icon hidden behind a hover, since the price above it
                is meant to lead straight into a purchase decision */}
            <button
                type="button"
                onClick={() => onAddToCart(product)}
                disabled={isOutOfStock}
                className={cn(
                    "group/cta relative mt-5 flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-[4px] text-[10.5px] uppercase tracking-[0.2em] transition-transform duration-500",
                    isOutOfStock
                        ? "cursor-not-allowed bg-[#7a2c4e]/10 text-[#7a2c4e]/40"
                        : "bg-gradient-to-br from-[#f9a8d4] to-[#ec4899] text-white shadow-[0_14px_28px_-16px_rgba(236,72,153,0.85)] hover:-translate-y-0.5"
                )}
            >
                <span className="relative z-10 flex items-center gap-2">
                    <ShoppingBag className="h-[13px] w-[13px]" strokeWidth={1.6} />
                    {isOutOfStock ? "Sold out" : "Add to bag"}
                </span>
                {!isOutOfStock && (
                    <span aria-hidden className="absolute inset-0 translate-y-full bg-[#7a2c4e] transition-transform duration-500 group-hover/cta:translate-y-0" />
                )}
            </button>
        </div>
    );
}

export default function ShopPageClient({ initialProducts = [] }: { initialProducts?: Product[] }) {
    const { products, loading } = useProducts(initialProducts);
    const { addToCart } = useCart();
    const { error } = useToast();
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

    const handleAddToCart = async (product: Product) => {
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
        } catch (e) {
            const msg = e instanceof Error ? e.message : "";
            if (msg.includes("customer to add to cart") || msg.includes("Not authorized") || msg.includes("User not found")) {
                error("Please log in to add to cart");
                router.push("/login");
            } else {
                error(msg || "Could not add to cart");
            }
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
                            <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:gap-x-8 lg:grid-cols-3 lg:gap-x-10">
                                {shopProducts.map((product, index) => (
                                    <Reveal key={product._id || product.id} delay={Math.min(index, 5) * 0.06}>
                                        <ProductCard product={product} priority={index < 3} onAddToCart={handleAddToCart} />
                                    </Reveal>
                                ))}
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