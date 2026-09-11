"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, ShoppingBag, Minus, Plus, Star, ChevronDown, Tag, PackageCheck } from "lucide-react";

import { MiniNavbar } from "@/components/ui/mini-navbar";
import Footer from "@/components/Footer";
import { useProduct } from "@/hooks/useProduct";
import { useProducts } from "@/hooks/useProducts";
import { useProductReviews } from "@/hooks/useProductReviews";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useToast } from "@/components/ui/toast";
import { reviewAPI } from "@/lib/api";
import { cn, strikethroughPriceIfHigher } from "@/lib/utils";
import { resolvePdpHeroLine, resolveProductSeoCopy } from "@/lib/seo/productCopy";
import { parseInrPrice, trackMetaEvent } from "@/lib/analytics/metaPixel";
import { trackViewItem } from "@/lib/analytics/ecommerce";
import { isRecommendableProduct } from "@/lib/product-filters";
import { getFlagshipSiblingsExcluding } from "@/lib/shop-flagship-discovery";
import { pickShopCardPath } from "@/lib/product-card-images";
import { getImageUrl } from "@/lib/imageUtils";
import { canonicalProductSlug, getProductShopPath } from "@/lib/product-slugs";
import ScienceUSPSection from "@/components/home/ScienceUSPSection";
import HowToUse from "@/components/home/Howtouse";

const HOW_TO_USE_INFOGRAPHIC_SRC = encodeURI("/How to use leira.png");

/* ---- site palette, restored ---- */
const INK = "text-[#7a2c4e]";
const INK_SOFT = "text-[#7a2c4e]/55";
const BODY = "text-[#6b5560]";
const HAIR = "border-[#7a2c4e]/[0.12]";
const PINK = "#ec4899";
const GOLD = "#d8b06a";
const EASE = [0.22, 1, 0.36, 1] as const;

const GRAIN =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E\")";

function Grain({ opacity = 0.03 }: { opacity?: number }) {
    return <span aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ backgroundImage: GRAIN, opacity }} />;
}

function Mark({ className = "" }: { className?: string }) {
    return <span aria-hidden className={cn("inline-block h-1.5 w-1.5 rotate-[-45deg] rounded-[50%_50%_50%_0] bg-[#ec4899]", className)} />;
}

/* ------------------------------------------------------------------
   SafeImg — a plain <img>, not next/image, for product photography.
   Next/Image's optimizer needs whitelisted remote domains; a native
   <img> has none of that, so it either shows the real photo or falls
   back to this monogram tile — never a broken-image icon.
------------------------------------------------------------------- */
function SafeImg({
    src,
    alt,
    label,
    className,
    style,
}: {
    src: string;
    alt: string;
    label?: string;
    className?: string;
    style?: React.CSSProperties;
}) {
    const [broken, setBroken] = useState(false);
    if (!src || broken) {
        return (
            <div className={cn("flex h-full w-full items-center justify-center bg-[#f7e6ee]", className)} style={style}>
                <span className="font-serif text-[26px] font-light italic text-[#7a2c4e]/25">
                    {(label || alt || "L").trim().charAt(0).toUpperCase()}
                </span>
            </div>
        );
    }
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" className={className} style={style} onError={() => setBroken(true)} />
    );
}

function isLoggedInCustomer(): boolean {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem("token");
    if (!token) return false;
    try {
        const raw = localStorage.getItem("user");
        const user = raw ? JSON.parse(raw) : null;
        return !!user && user.role !== "admin";
    } catch {
        return false;
    }
}

const renderFormattedDescription = (value: string) => {
    const parts = String(value || "").split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
            <strong key={index} className="font-medium text-[#7a2c4e]">{part.slice(2, -2)}</strong>
        ) : (
            part
        )
    );
};

const TRUST = ["Alcohol-free", "pH-balanced", "Dermatologically tested", "100% natural oils"];

/* NOTE: placeholder offers — wire these to your real coupon/offer API
   when available; shown only in the info column, never in the gallery. */
const OFFERS = [
    "Flat 10% off on prepaid orders",
    "Free shipping on orders above ₹999",
    "Extra 5% off on your first order — code WELCOME5",
];

const PILLARS = [
    { n: "01", title: "India's first", body: "The first essential-oil intimate perfume made in India, for the external intimate area specifically." },
    { n: "02", title: "Clinically tested", body: "Every batch is tested for skin safety before it reaches you." },
    { n: "03", title: "Nothing synthetic", body: "No alcohol, no parabens, no synthetic fragrance — only essential oils." },
];

const INGREDIENTS = [
    { name: "Damask Rose", note: "Anti-inflammatory, softening, deeply hydrating." },
    { name: "Jasmine", note: "Calming, antibacterial, naturally uplifting." },
    { name: "Ylang Ylang", note: "Balancing, antioxidant-rich, quietly grounding." },
];

const RIBBON = ["Damask Rose", "Jasmine", "Ylang Ylang", "Alcohol-free", "pH-balanced", "100% organic", "Made in India"];

const FAQS = [
    { q: "Is this safe for daily use?", a: "Yes. Leira is dermatologically tested and pH-balanced for daily use on the external intimate area." },
    { q: "Can I use it after shaving or waxing?", a: "Wait 24 hours after shaving or waxing before applying, to avoid irritation on freshly exposed skin." },
    { q: "How long does one bottle last?", a: "With one or two drops per use, a bottle typically lasts 6–8 weeks." },
    { q: "Is it safe during pregnancy?", a: "As with any intimate care product, check with your doctor before use during pregnancy." },
];

/** Follows scroll direction so the sticky rail/gallery closes the gap a
    hide-on-scroll navbar leaves behind. Returns a top offset in px. */
function useStickyTopOffset(shown = 96, hidden = 16) {
    const [top, setTop] = useState(shown);
    useEffect(() => {
        let lastY = typeof window !== "undefined" ? window.scrollY : 0;
        let raf = 0;
        const onScroll = () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                const y = window.scrollY;
                const goingDown = y > lastY;
                if (y < 8) setTop(shown);
                else if (goingDown && y > shown) setTop(hidden);
                else if (!goingDown) setTop(shown);
                lastY = y;
                raf = 0;
            });
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            if (raf) cancelAnimationFrame(raf);
        };
    }, [shown, hidden]);
    return top;
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className={cn("border-b", HAIR)}>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between py-5 text-left">
                <span className={cn("font-serif text-[19px] font-light", INK)}>{title}</span>
                <ChevronDown className={cn("h-3.5 w-3.5 text-[#ec4899]/70 transition-transform duration-500", open && "rotate-180")} strokeWidth={1.4} />
            </button>
            <div className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
                <div className="overflow-hidden">
                    <div className="pb-6">{children}</div>
                </div>
            </div>
        </div>
    );
}

export default function ProductDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { product, loading, error: fetchError } = useProduct(id as string);
    const { products: allProducts } = useProducts();
    const { reviews, stats: reviewStats, refetch: refetchReviews } = useProductReviews(product?._id || "");
    const { addToCart } = useCart();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const { success, error } = useToast();

    const stickyTop = useStickyTopOffset();
    const [quantity, setQuantity] = useState(1);
    const [activeImage, setActiveImage] = useState(0);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState("");
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const currentParam = String(id || "");

    const toSlug = (value: string) =>
        String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");

    const getProductPath = (item: { id?: string; _id?: string; name?: string }) => getProductShopPath(item);

    useEffect(() => {
        if (!product) return;
        const canonical = canonicalProductSlug(product.id, product.name);
        if (canonical && currentParam && currentParam !== canonical) router.replace(`/shop/${canonical}`);
    }, [product, currentParam, router]);

    useEffect(() => {
        if (!product) return;
        const pid = String(product._id || product.id || "");
        if (!pid) return;
        const price = parseInrPrice(product.price);
        trackViewItem({ item_id: pid, item_name: product.name, price, quantity: 1 });
        trackMetaEvent("ViewContent", { content_ids: [pid], content_name: product.name, content_type: "product", currency: "INR", value: price });
    }, [product?._id, product?.id]);

    const detailMrp = useMemo(
        () => strikethroughPriceIfHigher(product?.price ?? "", product?.originalPrice),
        [product?.price, product?.originalPrice]
    );

    const handleAddToCart = async () => {
        if (!product) return;
        const isOutOfStock = product.status === "inactive" || Number(product.stock ?? 0) <= 0;
        if (isOutOfStock) {
            error("This product is out of stock");
            return;
        }
        try {
            const thumbPath = pickShopCardPath(product);
            const productImage = getImageUrl(thumbPath || product.images?.[0] || "");
            const snapshot = { name: product.name, price: product.price, imageUrl: productImage };
            await addToCart(product._id || product.id, quantity, snapshot);
            success("Added to your bag");
        } catch (e: any) {
            if (e.message?.includes("log in")) {
                error("Please log in to shop");
                router.push("/login");
            } else {
                error(e.message || "Could not add to cart");
            }
        }
    };

    const toggleWishlist = async () => {
        if (!product) return;
        const pid = product._id || product.id;
        try {
            if (isInWishlist(pid)) {
                await removeFromWishlist(pid);
                success("Removed from wishlist");
            } else {
                await addToWishlist(pid);
                success("Added to wishlist");
            }
        } catch (e: any) {
            error(e.message || "Failed to update wishlist");
        }
    };

    const handleSubmitReview = async () => {
        if (!product) return;
        const pid = product._id || product.id;
        if (!isLoggedInCustomer()) {
            error("Please log in to leave a review");
            router.push("/login");
            return;
        }
        setReviewSubmitting(true);
        try {
            await reviewAPI.create(pid, reviewRating, reviewComment);
            success("Thank you — your review was submitted for approval.");
            setReviewComment("");
            setReviewRating(5);
            refetchReviews();
        } catch (e: any) {
            error(e.message || "Could not submit review");
        } finally {
            setReviewSubmitting(false);
        }
    };

    if (loading) {
        return (
            <>
                <MiniNavbar />
                <div className="leira-underlap-nav-spacer flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#fdf1f5] to-[#fffdfc]">
                    <span className="block h-9 w-9 animate-spin rounded-full border border-[#7a2c4e]/15 border-t-[#ec4899]" />
                    <p className={cn("mt-6 font-serif text-[19px] font-light italic", INK)}>Preparing your fragrance…</p>
                </div>
            </>
        );
    }

    if (fetchError || !product) {
        return (
            <>
                <MiniNavbar />
                <div className="leira-underlap-nav-spacer flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#fdf1f5] to-[#fffdfc] px-6 text-center">
                    <h2 className={cn("font-serif text-[clamp(28px,4vw,44px)] font-light", INK)}>Fragrance not found</h2>
                    <p className={cn("mt-4 max-w-[42ch] text-[15px] font-light leading-[1.8]", BODY)}>This scent may be unavailable or has been removed.</p>
                    <Link
                        href="/shop"
                        className="group relative mt-9 inline-block overflow-hidden rounded-full bg-gradient-to-br from-[#f9a8d4] to-[#ec4899] px-9 py-4 text-[11px] uppercase tracking-[0.22em] text-white transition-transform duration-500 hover:-translate-y-0.5"
                    >
                        <span className="relative z-10">Return to shop</span>
                        <span aria-hidden className="absolute inset-0 translate-y-full bg-[#7a2c4e] transition-transform duration-500 group-hover:translate-y-0" />
                    </Link>
                </div>
            </>
        );
    }

    const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [getImageUrl(pickShopCardPath(product) || "")];
    const isOutOfStock = product.status === "inactive" || Number(product.stock ?? 0) <= 0;
    const seoCopy = resolveProductSeoCopy(currentParam, String(product?.id || ""), String(product?.name || ""));
    const benefitH2 = resolvePdpHeroLine(String(product?.name || ""), product?.detailTagline, currentParam, String(product?.id || ""), String(product?.name || ""));
    const productDescription =
        product.description && product.description.trim().length > 3
            ? product.description
            : seoCopy?.longDescription || "Experience the essence of luxury with this exclusive fragrance.";
    const descriptionParagraphs = String(productDescription).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

    return (
        <div className="leira-underlap-nav-spacer min-h-screen bg-white pb-24 lg:pb-0">
            <MiniNavbar />

            {/* ================= HERO ================= */}
            <main className="relative isolate [overflow:clip] bg-gradient-to-b from-[#fdf1f5] via-[#fff7fa] to-[#fffdfc] px-5 py-8 sm:px-8 md:py-12 lg:px-14">
                <Grain />
                <motion.span
                    aria-hidden
                    animate={{ x: [0, 30, 0], y: [0, -26, 0], scale: [1, 1.08, 1] }}
                    transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
                    className="pointer-events-none absolute -right-24 -top-24 -z-10 h-[34vw] max-h-[440px] w-[34vw] max-w-[440px] rounded-full bg-[#f9a8d4]/25 blur-[95px]"
                />

                <div className="mx-auto max-w-[1440px]">
                    <nav className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em]">
                        <Link href="/shop" className={cn(BODY, "transition-colors hover:text-[#ec4899]")}>Shop</Link>
                        <Mark className="opacity-50" />
                        <span className={INK}>{product.name}</span>
                    </nav>

                    <div className="mt-8 grid gap-12 lg:grid-cols-2 lg:gap-16">
                        {/* ---- gallery: rail + image travel together, sticky as one
                              unit, and release once the info column finishes ---- */}
                        <div className="lg:sticky lg:self-start" style={{ top: stickyTop }}>
                            <div className="flex gap-4 sm:gap-6">
                                {images.length > 1 && (
                                    <div className="hidden w-[72px] shrink-0 flex-col items-center gap-3 lg:flex">
                                        {images.map((img, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setActiveImage(i)}
                                                aria-label={`View image ${i + 1}`}
                                                className={cn(
                                                    "relative h-[64px] w-[64px] shrink-0 overflow-hidden rounded-full border-2 transition-all duration-400",
                                                    activeImage === i ? "border-[#ec4899]" : "border-transparent opacity-45 hover:opacity-90"
                                                )}
                                            >
                                                <SafeImg src={img} alt={`${product.name} ${i + 1}`} label={product.name} className="h-full w-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[24px] bg-[#f7e6ee] shadow-[0_40px_80px_-52px_rgba(122,44,78,0.5)]">
                                    <SafeImg src={images[activeImage]} alt={product.name} label={product.name} className="h-full w-full object-cover" />

                                    {isOutOfStock && (
                                        <div className="absolute left-5 top-5 rounded-full bg-[#7a2c4e] px-4 py-1.5 text-[10.5px] uppercase tracking-[0.16em] text-white">Out of stock</div>
                                    )}

                                    <button
                                        onClick={toggleWishlist}
                                        aria-label={isInWishlist(product._id || product.id) ? "Remove from wishlist" : "Add to wishlist"}
                                        className={cn(
                                            "absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-500 active:scale-90",
                                            isInWishlist(product._id || product.id)
                                                ? "border-transparent bg-[#ec4899] text-white"
                                                : "border-white/70 bg-white/70 text-[#7a2c4e]/60 hover:border-[#ec4899]/50 hover:text-[#ec4899]"
                                        )}
                                    >
                                        <Heart className={cn("h-[18px] w-[18px]", isInWishlist(product._id || product.id) && "fill-current")} strokeWidth={1.6} />
                                    </button>

                                    {images.length > 1 && (
                                        <div className="absolute inset-x-4 bottom-4 flex gap-2 lg:hidden">
                                            {images.map((img, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setActiveImage(i)}
                                                    aria-label={`View image ${i + 1}`}
                                                    className={cn(
                                                        "relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 backdrop-blur-sm transition-all duration-400",
                                                        activeImage === i ? "border-[#ec4899]" : "border-white/60 opacity-70"
                                                    )}
                                                >
                                                    <SafeImg src={img} alt={`${product.name} ${i + 1}`} label={product.name} className="h-full w-full object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ---- info panel ---- */}
                        <div>
                            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, ease: EASE }}>
                                <span className="inline-flex items-center gap-2.5 rounded-full bg-[#ec4899]/10 px-4 py-1.5 text-[10.5px] uppercase tracking-[0.26em] text-[#ec4899]">
                                    <i aria-hidden className="block h-1.5 w-1.5 rounded-full bg-[#ec4899]" />
                                    Leira exclusive
                                </span>

                                <h1 className={cn("mt-5 font-serif text-[clamp(32px,3.6vw,48px)] font-light capitalize leading-[1.06] tracking-tight", INK)}>
                                    {product.name}
                                </h1>

                                {benefitH2 ? (
                                    <p className="mt-3 max-w-[38ch] font-serif text-[16px] font-light italic leading-[1.6] text-[#7a2c4e]/55">{benefitH2}</p>
                                ) : null}

                                <div className="mt-5 flex items-center gap-2">
                                    <span className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map((r) => (
                                            <Star
                                                key={r}
                                                className={cn("h-[14px] w-[14px]", reviewStats.totalCount > 0 && r <= Math.round(reviewStats.avgRating) ? "fill-[#ec4899] text-[#ec4899]" : "text-[#7a2c4e]/20")}
                                                strokeWidth={1.4}
                                            />
                                        ))}
                                    </span>
                                    <span className={cn("text-[12.5px] font-light", BODY)}>
                                        {reviewStats.totalCount === 0 ? "No reviews yet" : `${reviewStats.avgRating.toFixed(1)} · ${reviewStats.totalCount} reviews`}
                                    </span>
                                </div>

                                <div className={cn("mt-6 flex items-end gap-3 border-t pt-6", HAIR)}>
                                    <span className="font-serif text-[clamp(28px,3vw,36px)] font-light leading-none text-[#ec4899] tabular-nums">{product.price}</span>
                                    {detailMrp ? <span className="text-[15px] font-light tabular-nums text-[#6b5560]/60 line-through">{detailMrp}</span> : null}
                                    <span className="pb-0.5 text-[11px] font-light uppercase tracking-[0.06em] text-[#6b5560]/50">Incl. taxes</span>
                                </div>

                                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                                    <div className={cn("flex h-14 items-center rounded-full border bg-white/70", HAIR)}>
                                        <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex h-full w-12 items-center justify-center text-[#7a2c4e]/60 hover:text-[#ec4899]" aria-label="Decrease quantity">
                                            <Minus className="h-4 w-4" strokeWidth={1.6} />
                                        </button>
                                        <span className={cn("min-w-9 text-center font-serif text-[18px] tabular-nums", INK)}>{quantity}</span>
                                        <button type="button" onClick={() => setQuantity((q) => q + 1)} className="flex h-full w-12 items-center justify-center text-[#7a2c4e]/60 hover:text-[#ec4899]" aria-label="Increase quantity">
                                            <Plus className="h-4 w-4" strokeWidth={1.6} />
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleAddToCart}
                                        disabled={isOutOfStock}
                                        className={cn(
                                            "group relative flex h-14 flex-1 items-center justify-center gap-3 overflow-hidden rounded-full text-[11px] uppercase tracking-[0.22em] transition-transform duration-500",
                                            isOutOfStock
                                                ? "cursor-not-allowed bg-[#7a2c4e]/15 text-[#7a2c4e]/50"
                                                : "bg-gradient-to-br from-[#f9a8d4] to-[#ec4899] text-white shadow-[0_18px_34px_-20px_rgba(236,72,153,0.9)] hover:-translate-y-0.5"
                                        )}
                                    >
                                        <span className="relative z-10 flex items-center gap-3">
                                            <ShoppingBag className="h-4 w-4" strokeWidth={1.6} />
                                            {isOutOfStock ? "Out of stock" : "Add to bag"}
                                        </span>
                                        {!isOutOfStock && <span aria-hidden className="absolute inset-0 translate-y-full bg-[#7a2c4e] transition-transform duration-500 group-hover:translate-y-0" />}
                                    </button>
                                </div>

                                <ul className={cn("mt-7 flex flex-wrap items-center gap-x-2 gap-y-2 border-t pt-5 text-[11px] font-light uppercase tracking-[0.06em]", HAIR, BODY)}>
                                    {TRUST.map((t, i) => (
                                        <li key={t} className="flex items-center gap-2">
                                            {i > 0 && <Mark className="scale-75 opacity-40" />}
                                            {t}
                                        </li>
                                    ))}
                                </ul>

                                {/* ---- offers — right column only ---- */}
                                <div className={cn("mt-6 rounded-[16px] border bg-[#fdeef4]/50 p-5", HAIR)}>
                                    <div className="flex items-center gap-2">
                                        <Tag className="h-[15px] w-[15px] text-[#ec4899]" strokeWidth={1.6} />
                                        <span className={cn("text-[12px] font-light uppercase tracking-[0.14em]", INK)}>Available offers</span>
                                    </div>
                                    <ul className="mt-3 space-y-2">
                                        {OFFERS.map((offer) => (
                                            <li key={offer} className={cn("flex items-start gap-2.5 text-[13px] font-light leading-[1.6]", BODY)}>
                                                <Mark className="mt-1.5 shrink-0 scale-75 opacity-60" />
                                                {offer}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* ---- discreet packaging note ---- */}
                                <div className="mt-4 flex items-center gap-2.5">
                                    <PackageCheck className="h-[15px] w-[15px] shrink-0 text-[#7a2c4e]/45" strokeWidth={1.5} />
                                    <span className={cn("text-[12px] font-light leading-[1.5]", BODY)}>
                                        Ships in plain, unmarked packaging — always discreet.
                                    </span>
                                </div>

                                <div className="mt-7">
                                    <Section title="Description">
                                        <div className={cn("space-y-4 text-[14.5px] font-light leading-[1.85]", BODY)}>
                                            {descriptionParagraphs.map((paragraph, index) => (
                                                <p key={`${product._id || product.id}-desc-${index}`}>{renderFormattedDescription(paragraph)}</p>
                                            ))}
                                        </div>
                                    </Section>

                                    <Section title="How to use">
                                        <div className="overflow-hidden rounded-[16px] border border-[#7a2c4e]/[0.1]">
                                            <Image
                                                src={HOW_TO_USE_INFOGRAPHIC_SRC}
                                                alt="Leira — how to use"
                                                width={1125}
                                                height={1398}
                                                className="h-auto w-full object-contain object-top"
                                                sizes="(max-width: 1024px) 100vw, 480px"
                                            />
                                        </div>
                                    </Section>

                                    <Section title="Frequently asked questions">
                                        <div className="space-y-5">
                                            {FAQS.map((f) => (
                                                <div key={f.q}>
                                                    <p className={cn("text-[14.5px] font-medium", INK)}>{f.q}</p>
                                                    <p className={cn("mt-1.5 text-[13.5px] font-light leading-[1.75]", BODY)}>{f.a}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </Section>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </main>

            {/* ================= scent ribbon — a drifting full-width band ================= */}
            {/* <div className="relative isolate [overflow:clip] border-y border-[#d8b06a]/25 bg-[#fdeef4] py-4">
                <style
                    dangerouslySetInnerHTML={{
                        __html: `@keyframes leiraRibbonPdp{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}
.leiraRibbonPdp{animation:leiraRibbonPdp 36s linear infinite}
.leiraRibbonPdp:hover{animation-play-state:paused}
@media (prefers-reduced-motion: reduce){.leiraRibbonPdp{animation:none}}`,
                    }}
                />
                <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#fdeef4] to-transparent" />
                <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#fdeef4] to-transparent" />
                <div className="leiraRibbonPdp flex w-max items-center gap-9 whitespace-nowrap">
                    {[...RIBBON, ...RIBBON].map((w, i) => (
                        <span key={i} className="flex items-center gap-9">
                            <span className="font-serif text-[18px] font-light italic text-[#7a2c4e]/65">{w}</span>
                            <Mark className="opacity-60" />
                        </span>
                    ))}
                </div>
            </div> */}

            <ScienceUSPSection />
            <HowToUse />

            {/* ================= why leira — dark plum band, full width ================= */}
            <section className="relative isolate [overflow:clip] bg-gradient-to-br from-[#2b0f1d] via-[#3a1526] to-[#4a1c31] px-5 py-16 sm:px-8 md:py-20 lg:px-12">
                <Grain opacity={0.05} />
                <span aria-hidden className="pointer-events-none absolute -left-28 top-1/3 -z-10 h-[32vw] max-h-[400px] w-[32vw] max-w-[400px] rounded-full bg-[#ec4899]/18 blur-[110px]" />
                <div className="mx-auto max-w-6xl">
                    <dl className="grid gap-x-10 gap-y-10 sm:grid-cols-3">
                        {PILLARS.map((p) => (
                            <div key={p.n} className="relative">
                                <span className="pointer-events-none absolute -top-3 left-0 font-serif text-[64px] font-light leading-none text-white/[0.06]">{p.n}</span>
                                <span className="relative text-[11px] tracking-[0.2em] text-[#d8b06a]">{p.n}</span>
                                <dt className="relative mt-3 font-serif text-[19px] font-light leading-[1.25] text-white">{p.title}</dt>
                                <dd className="relative mt-2 max-w-[32ch] text-[13.5px] font-light leading-[1.75] text-[#f7dfe8]/70">{p.body}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>

            {/* ================= ingredients ================= */}
            <section className="relative isolate [overflow:clip] bg-gradient-to-b from-[#fdf1f5] to-[#fffdfc] px-5 py-16 sm:px-8 md:py-20 lg:px-12">
                <Grain />
                <div className="mx-auto max-w-6xl">
                    <span className="text-[10.5px] uppercase tracking-[0.24em] text-[#ec4899]">Crafted with</span>
                    <h2 className={cn("mt-3 font-serif text-[clamp(24px,3vw,34px)] font-light leading-[1.15]", INK)}>Three essential oils, nothing else</h2>
                    <div className={cn("mt-9 grid gap-x-10 gap-y-8 border-t pt-9 sm:grid-cols-3", HAIR)}>
                        {INGREDIENTS.map((ing) => (
                            <div key={ing.name}>
                                <p className={cn("font-serif text-[19px] font-light italic", INK)}>{ing.name}</p>
                                <p className={cn("mt-2 text-[13.5px] font-light leading-[1.75]", BODY)}>{ing.note}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ================= explore ================= */}
            <section className="relative isolate [overflow:clip] bg-[#fffdfc] px-5 py-16 sm:px-8 md:py-20 lg:px-12" aria-labelledby="explore-leira-heading">
                <Grain />
                <div className="mx-auto max-w-6xl">
                    <div className="max-w-2xl">
                        <span className="text-[10.5px] uppercase tracking-[0.24em] text-[#ec4899]">The collection</span>
                        <h2 id="explore-leira-heading" className={cn("mt-3 font-serif text-[clamp(24px,3vw,36px)] font-light leading-[1.15]", INK)}>Explore more from Leira</h2>
                    </div>

                    <div className="mt-8 grid gap-px overflow-hidden rounded-[20px] border border-[#7a2c4e]/[0.1] bg-[#7a2c4e]/[0.08] sm:grid-cols-2 xl:grid-cols-4">
                        {getFlagshipSiblingsExcluding({
                            canonicalPath: getProductPath(product),
                            urlParam: currentParam,
                            slugFromProduct: toSlug(product.id || product.name || ""),
                        }).map((item) => (
                            <Link key={item.href} href={item.href} className="group flex flex-col justify-between bg-[#fffdfc] p-6 transition-colors duration-500 hover:bg-[#fff5f9]">
                                <div>
                                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#ec4899]">Fragrance</span>
                                    <p className={cn("mt-2.5 font-serif text-[19px] font-light leading-[1.25]", INK)}>{item.label}</p>
                                    <p className={cn("mt-1.5 text-[12.5px] font-light leading-[1.65]", BODY)}>{item.line}</p>
                                </div>
                                <span className="mt-5 inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.2em] text-[#7a2c4e]/70 group-hover:text-[#ec4899]">
                                    View product <Mark className="transition-transform duration-500 group-hover:translate-x-1" />
                                </span>
                            </Link>
                        ))}
                        <Link href="/benefits" className="group flex flex-col justify-between bg-[#fff5f9] p-6 transition-colors duration-500 hover:bg-[#fdeef4]">
                            <div>
                                <span className="text-[10px] uppercase tracking-[0.2em] text-[#ec4899]">Learn</span>
                                <p className={cn("mt-2.5 font-serif text-[19px] font-light leading-[1.25]", INK)}>Why Leira — benefits</p>
                                <p className={cn("mt-1.5 text-[12.5px] font-light leading-[1.65]", BODY)}>Safety, ingredients, and how it fits your routine.</p>
                            </div>
                            <span className="mt-5 inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.2em] text-[#7a2c4e]/70 group-hover:text-[#ec4899]">
                                Read benefits <Mark className="transition-transform duration-500 group-hover:translate-x-1" />
                            </span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ================= reviews ================= */}
            <section className="relative isolate [overflow:clip] bg-gradient-to-b from-[#fffdfc] to-[#fff5f9] px-5 py-16 sm:px-8 md:py-20 lg:px-12">
                <Grain />
                <div className="mx-auto max-w-6xl">
                    <div className="grid gap-10 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)] lg:gap-16">
                        <div className="lg:sticky lg:self-start" style={{ top: stickyTop }}>
                            <span className="text-[10.5px] uppercase tracking-[0.24em] text-[#ec4899]">In their words</span>
                            <h2 className={cn("mt-3 font-serif text-[clamp(24px,3vw,36px)] font-light leading-[1.15]", INK)}>Customer reviews</h2>
                            {reviewStats.totalCount > 0 && (
                                <div className={cn("mt-6 flex items-end gap-4 border-t pt-5", HAIR)}>
                                    <span className="font-serif text-[40px] font-light leading-none text-[#ec4899]">{reviewStats.avgRating.toFixed(1)}</span>
                                    <span className={cn("pb-1 text-[12.5px] font-light", BODY)}>from {reviewStats.totalCount} review{reviewStats.totalCount === 1 ? "" : "s"}</span>
                                </div>
                            )}
                            {!isLoggedInCustomer() && (
                                <p className={cn("mt-5 text-[13.5px] font-light", BODY)}>
                                    <Link href="/login" className="border-b border-[#ec4899]/40 pb-0.5 text-[#ec4899] hover:border-[#ec4899]">Log in</Link> to leave a review.
                                </p>
                            )}
                        </div>

                        <div>
                            {isLoggedInCustomer() && (
                                <div className="mb-8 rounded-[20px] border border-[#ec4899]/[0.12] bg-white/70 p-6 md:p-8">
                                    <h3 className={cn("font-serif text-[19px] font-light", INK)}>Write a review</h3>
                                    <div className="mt-4 flex gap-1.5">
                                        {[1, 2, 3, 4, 5].map((r) => (
                                            <button key={r} type="button" onClick={() => setReviewRating(r)} aria-label={`${r} stars`} className={cn("p-1", reviewRating >= r ? "text-[#ec4899]" : "text-[#7a2c4e]/20 hover:text-[#f9a8d4]")}>
                                                <Star className={cn("h-6 w-6", reviewRating >= r && "fill-current")} strokeWidth={1.4} />
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        value={reviewComment}
                                        onChange={(e) => setReviewComment(e.target.value)}
                                        rows={3}
                                        maxLength={1000}
                                        placeholder="Share your experience (optional)"
                                        className={cn("mt-4 w-full resize-none rounded-[12px] border bg-transparent p-3.5 text-[14.5px] font-light leading-[1.75] outline-none focus:border-[#ec4899]/50", HAIR, INK)}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSubmitReview}
                                        disabled={reviewSubmitting}
                                        className="mt-4 rounded-full bg-gradient-to-br from-[#f9a8d4] to-[#ec4899] px-7 py-3 text-[11px] uppercase tracking-[0.2em] text-white transition-transform duration-500 hover:-translate-y-0.5 disabled:opacity-55"
                                    >
                                        {reviewSubmitting ? "Submitting…" : "Submit review"}
                                    </button>
                                </div>
                            )}

                            {reviews.length === 0 ? (
                                <p className="font-serif text-[18px] font-light italic text-[#7a2c4e]/45">No approved reviews yet.</p>
                            ) : (
                                <ul className={cn("border-t", HAIR)}>
                                    {reviews.map((rev) => (
                                        <li key={rev._id} className={cn("border-b py-5", HAIR)}>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                                <span className={cn("font-serif text-[16px]", INK)}>{rev.user?.name || "Customer"}</span>
                                                <span className="flex items-center gap-0.5">
                                                    {[1, 2, 3, 4, 5].map((r) => (
                                                        <Star key={r} className={cn("h-3.5 w-3.5", r <= rev.rating ? "fill-[#ec4899] text-[#ec4899]" : "text-[#7a2c4e]/20")} strokeWidth={1.4} />
                                                    ))}
                                                </span>
                                                <span className="text-[11px] uppercase tracking-[0.12em] text-[#7a2c4e]/40">
                                                    {new Date(rev.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                </span>
                                            </div>
                                            {rev.comment && <p className={cn("mt-2.5 max-w-[62ch] text-[13.5px] font-light leading-[1.8]", BODY)}>{rev.comment}</p>}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ================= related ================= */}
            {(() => {
                const currentId = product._id || product.id;
                const related = allProducts
                    .filter((p) => (p._id || p.id) !== currentId)
                    .filter((p) => isRecommendableProduct({ id: p.id, _id: p._id, name: p.name, status: p.status, showInShopSection: p.showInShopSection, showInComboSection: p.showInComboSection }))
                    .slice(0, 4);
                if (related.length === 0) return null;
                return (
                    <section className="relative isolate [overflow:clip] bg-[#fffdfc] px-5 py-16 sm:px-8 md:py-20 lg:px-12">
                        <Grain />
                        <div className="mx-auto max-w-6xl">
                            <span className="text-[10.5px] uppercase tracking-[0.24em] text-[#ec4899]">You may also like</span>
                            <h2 className={cn("mt-3 font-serif text-[clamp(24px,3vw,36px)] font-light leading-[1.15]", INK)}>More to discover</h2>
                            <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-4 md:gap-6">
                                {related.map((p) => {
                                    const pid = p._id || p.id;
                                    const img = getImageUrl(pickShopCardPath(p) || p.images?.[0] || "");
                                    const relMrp = strikethroughPriceIfHigher(p.price || "", p.originalPrice);
                                    return (
                                        <Link key={pid} href={getProductPath(p)} className="group block">
                                            <div className="relative overflow-hidden rounded-[16px] bg-[#f7e6ee]">
                                                <SafeImg src={img} alt={p.name} label={p.name} className="aspect-[4/5] w-full object-cover transition-transform duration-[1.1s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]" />
                                            </div>
                                            <h3 className={cn("mt-3 line-clamp-2 font-serif text-[15px] font-light capitalize leading-[1.3] group-hover:text-[#ec4899] md:text-[17px]", INK)}>{p.name}</h3>
                                            <div className="mt-1 flex flex-wrap items-baseline gap-2">
                                                <span className="text-[14px] font-light tabular-nums text-[#ec4899]">{p.price}</span>
                                                {relMrp ? <span className="text-[11.5px] font-light tabular-nums text-[#6b5560]/55 line-through">{relMrp}</span> : null}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                );
            })()}

            <Footer />

            {/* ================= sticky mobile add-to-cart bar ================= */}
            <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-[#7a2c4e]/10 bg-white/95 px-4 py-3 backdrop-blur-md sm:hidden">
                <div className={cn("flex h-12 items-center rounded-full border bg-white/70", HAIR)}>
                    <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex h-full w-10 items-center justify-center text-[#7a2c4e]/60" aria-label="Decrease quantity">
                        <Minus className="h-3.5 w-3.5" strokeWidth={1.6} />
                    </button>
                    <span className={cn("min-w-7 text-center font-serif text-[15px] tabular-nums", INK)}>{quantity}</span>
                    <button type="button" onClick={() => setQuantity((q) => q + 1)} className="flex h-full w-10 items-center justify-center text-[#7a2c4e]/60" aria-label="Increase quantity">
                        <Plus className="h-3.5 w-3.5" strokeWidth={1.6} />
                    </button>
                </div>
                <button
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                    className={cn(
                        "flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-[11px] uppercase tracking-[0.2em] transition-colors duration-400",
                        isOutOfStock ? "bg-[#7a2c4e]/15 text-[#7a2c4e]/50" : "bg-gradient-to-br from-[#f9a8d4] to-[#ec4899] text-white"
                    )}
                >
                    <ShoppingBag className="h-4 w-4" strokeWidth={1.6} />
                    {isOutOfStock ? "Out of stock" : `Add · ${product.price}`}
                </button>
            </div>
        </div>
    );
}