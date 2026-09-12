"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    Heart,
    ShoppingBag,
    Minus,
    Plus,
    Star,
    ChevronDown,
    Leaf,
    Droplet,
    Scale,
    Stethoscope,
    Sparkles,
    Package,
    Timer,
    ShieldCheck,
    Copy,
    Check,
    Share2,
} from "lucide-react";

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

const HOW_TO_USE_INFOGRAPHIC_SRC = encodeURI("/How to use leira.png");
const PDP_IMAGE_QUALITY = 82;

const INK = "text-[#7a2c4e]";
const BODY = "text-[#6b5560]";
const HAIR = "border-[#7a2c4e]/[0.12]";
const EASE = [0.22, 1, 0.36, 1] as const;

const GRAIN =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E\")";

function Grain({ opacity = 0.03 }: { opacity?: number }) {
    return <span aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ backgroundImage: GRAIN, opacity }} />;
}

function Mark({ className = "" }: { className?: string }) {
    return <span aria-hidden className={cn("inline-block h-1.5 w-1.5 rotate-[-45deg] rounded-[50%_50%_50%_0] bg-[#ec4899]", className)} />;
}

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

/** Scroll-triggered reveal, once, with a safety timeout so content
    never stays permanently hidden if the observer fails to fire. */
function useReveal<T extends HTMLElement>() {
    const ref = React.useRef<T | null>(null);
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
                (entries) => entries.forEach((e) => { if (e.isIntersecting) { setShown(true); io?.disconnect(); } }),
                { threshold: 0.15 }
            );
            io.observe(el);
        } catch {
            setShown(true);
            return;
        }
        const bail = window.setTimeout(() => setShown(true), 1400);
        return () => { io?.disconnect(); window.clearTimeout(bail); };
    }, []);
    return { ref, shown };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
    const { ref, shown } = useReveal<HTMLDivElement>();
    return (
        <div
            ref={ref}
            className={cn("transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]", className)}
            style={{ opacity: shown ? 1 : 0, transform: shown ? "none" : "translateY(18px)", transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
}

/* ------------------------------------------------------------------
   SafeImg — plain <img> for product photography, no next/image
   domain-whitelist requirement, falls back to a monogram tile.
------------------------------------------------------------------- */
function SafeImg({ src, alt, label, className }: { src: string; alt: string; label?: string; className?: string }) {
    const [broken, setBroken] = useState(false);
    if (!src || broken) {
        return (
            <div className={cn("flex items-center justify-center bg-[#f7e6ee]", className)}>
                <span className="font-serif text-[26px] font-light italic text-[#7a2c4e]/25">
                    {(label || alt || "L").trim().charAt(0).toUpperCase()}
                </span>
            </div>
        );
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading="lazy" className={className} onError={() => setBroken(true)} />;
}

const renderFormattedDescription = (value: string) => {
    const parts = String(value || "").split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
            <strong key={index} className="font-medium text-[#ec4899]">{part.slice(2, -2)}</strong>
        ) : (
            part
        )
    );
};

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

/* ------------------------------------------------------------------
   Content — icons + colours, so nothing here is a plain text block
------------------------------------------------------------------- */
const USPS = [
    { label: "Alcohol-free", icon: Droplet, tint: "#ec4899" },
    { label: "pH-balanced", icon: Scale, tint: "#d8b06a" },
    { label: "Dermatologist tested", icon: Stethoscope, tint: "#b23a63" },
    { label: "100% natural oils", icon: Leaf, tint: "#7a9b5c" },
];

const SPECS = [
    { icon: Package, label: "Volume", value: "15 ml" },
    { icon: Droplet, label: "Format", value: "Precision dropper" },
    { icon: ShieldCheck, label: "Skin type", value: "All, incl. sensitive" },
    { icon: Timer, label: "Usage", value: "1–2 drops daily" },
    { icon: Scale, label: "pH", value: "Balanced" },
    { icon: Sparkles, label: "Alcohol", value: "None" },
];

const INGREDIENTS = [
    { name: "Damask Rose", tint: "#b23a63", note: "Anti-inflammatory, softening, deeply hydrating." },
    { name: "Jasmine", tint: "#ec4899", note: "Calming, antibacterial, naturally uplifting." },
    { name: "Ylang Ylang", tint: "#d8b06a", note: "Balancing, antioxidant-rich, quietly grounding." },
];

const PRODUCT_POINTS = [
    { title: "Natural essence", description: "100% natural, skin-friendly essential oils.", icon: Leaf, tint: "#7a9b5c" },
    { title: "External use only", description: "Made exclusively for the outer intimate area.", icon: ShieldCheck, tint: "#b23a63" },
    { title: "pH-balanced", description: "Works with your skin's natural balance.", icon: Scale, tint: "#d8b06a" },
    { title: "Dermatologist tested", description: "Verified gentle for daily intimate use.", icon: Stethoscope, tint: "#ec4899" },
];

/* ------------------------------------------------------------------
   Share row — WhatsApp / Facebook / X all have real share-intent
   URLs; Instagram does not expose one for arbitrary web content, so
   it falls back to copying the link (native share sheet on mobile
   covers Instagram directly when available).
------------------------------------------------------------------- */
function ShareRow({ productName, price }: { productName: string; price: string }) {
    const [copied, setCopied] = useState(false);
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `${productName} — ${price} · Leira`;

    const links = [
        { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, color: "#25D366" },
        { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, color: "#1877F2" },
        { label: "X", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, color: "#111111" },
    ];

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            // clipboard may be unavailable — silently ignore
        }
    };

    const nativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: productName, text, url });
            } catch {
                // user cancelled — no action needed
            }
        } else {
            copyLink();
        }
    };

    return (
        <div className={cn("mt-6 flex flex-wrap items-center gap-2 border-t pt-5", HAIR)}>
            <span className={cn("mr-1 text-[11px] uppercase tracking-[0.16em]", BODY)}>Share</span>
            {links.map((l) => (
                <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Share on ${l.label}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#7a2c4e]/15 text-[#7a2c4e]/70 transition-all duration-300 hover:-translate-y-0.5 hover:text-white"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = l.color)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                    <span className="text-[11px] font-semibold">{l.label.charAt(0)}</span>
                </a>
            ))}
            {/* Instagram: no public share-intent URL exists, so this opens the
                native share sheet (covers IG directly on mobile) or copies
                the link as a safe fallback on desktop. */}
            <button
                type="button"
                onClick={nativeShare}
                aria-label="Share on Instagram or more"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#7a2c4e]/15 text-[#7a2c4e]/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#ec4899]/50 hover:text-[#ec4899]"
            >
                <Share2 className="h-[14px] w-[14px]" strokeWidth={1.7} />
            </button>
            <button
                type="button"
                onClick={copyLink}
                aria-label="Copy link"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#7a2c4e]/15 text-[#7a2c4e]/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#d8b06a]/60 hover:text-[#a8823f]"
            >
                <AnimatePresence mode="wait" initial={false}>
                    {copied ? (
                        <motion.span key="check" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
                            <Check className="h-[14px] w-[14px]" strokeWidth={1.8} />
                        </motion.span>
                    ) : (
                        <motion.span key="copy" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
                            <Copy className="h-[14px] w-[14px]" strokeWidth={1.7} />
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>
        </div>
    );
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
                <div className="overflow-hidden"><div className="pb-6">{children}</div></div>
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
        if (isOutOfStock) { error("This product is out of stock"); return; }
        try {
            const thumbPath = pickShopCardPath(product);
            const productImage = getImageUrl(thumbPath || product.images?.[0] || "");
            const snapshot = { name: product.name, price: product.price, imageUrl: productImage };
            await addToCart(product._id || product.id, quantity, snapshot);
            success("Added to your bag");
        } catch (e: any) {
            if (e.message?.includes("log in")) { error("Please log in to shop"); router.push("/login"); }
            else error(e.message || "Could not add to cart");
        }
    };

    const toggleWishlist = async () => {
        if (!product) return;
        const pid = product._id || product.id;
        try {
            if (isInWishlist(pid)) { await removeFromWishlist(pid); success("Removed from wishlist"); }
            else { await addToWishlist(pid); success("Added to wishlist"); }
        } catch (e: any) {
            error(e.message || "Failed to update wishlist");
        }
    };

    const handleSubmitReview = async () => {
        if (!product) return;
        const pid = product._id || product.id;
        if (!isLoggedInCustomer()) { error("Please log in to leave a review"); router.push("/login"); return; }
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
                    <Link href="/shop" className="group relative mt-9 inline-block overflow-hidden rounded-full bg-gradient-to-br from-[#f9a8d4] to-[#ec4899] px-9 py-4 text-[11px] uppercase tracking-[0.22em] text-white transition-transform duration-500 hover:-translate-y-0.5">
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

            {/* ================= hero ================= */}
            <main className="relative isolate [overflow:clip] bg-gradient-to-b from-[#fdf1f5] via-[#fff7fa] to-[#fffdfc] px-4 pb-16 pt-6 sm:px-8 md:pb-24 lg:px-12 mt-16">
                <Grain />
                <div className="mx-auto max-w-8xl">
                    {/* <nav className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em]">
                        <Link href="/shop" className={cn(BODY, "transition-colors hover:text-[#ec4899]")}>Shop</Link>
                        <Mark className="opacity-50" />
                        <span className={INK}>{product.name}</span>
                    </nav> */}

                    <div className="mt-8 grid gap-10 lg:grid-cols-[88px_minmax(0,45fr)_minmax(0,55fr)] lg:gap-8">
                        {images.length > 1 && (
                            <div className="hidden flex-col gap-3 lg:flex lg:sticky lg:self-start" style={{ top: stickyTop }}>
                                {images.map((img, i) => (
                                    <button key={i} onClick={() => setActiveImage(i)} aria-label={`View image ${i + 1}`}
                                        className={cn("relative h-[76px] w-[76px] overflow-hidden rounded-[12px] border transition-all duration-400",
                                            activeImage === i ? "border-[#ec4899]" : "border-[#7a2c4e]/10 opacity-55 hover:opacity-100")}>
                                        <SafeImg src={img} alt={`${product.name} ${i + 1}`} label={product.name} className="h-full w-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="lg:sticky lg:self-start" style={{ top: stickyTop }}>
                            <div className="relative overflow-hidden rounded-[22px] bg-[#f7e6ee] shadow-[0_40px_80px_-56px_rgba(122,44,78,0.55)]">
                                <AnimatePresence mode="wait">
                                    <motion.div key={activeImage} initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: EASE }} className="relative w-full">
                                        <SafeImg src={images[activeImage]} alt={product.name} label={product.name} className="h-auto w-full max-w-full object-contain object-center" />
                                    </motion.div>
                                </AnimatePresence>
                                {isOutOfStock && <div className="absolute left-5 top-5 rounded-full bg-[#7a2c4e] px-4 py-1.5 text-[10.5px] uppercase tracking-[0.16em] text-white">Out of stock</div>}
                                <button onClick={toggleWishlist} aria-label={isInWishlist(product._id || product.id) ? "Remove from wishlist" : "Add to wishlist"}
                                    className={cn("absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-500 active:scale-90",
                                        isInWishlist(product._id || product.id) ? "border-transparent bg-[#ec4899] text-white" : "border-white/70 bg-white/70 text-[#7a2c4e]/60 hover:border-[#ec4899]/50 hover:text-[#ec4899]")}>
                                    <Heart className={cn("h-[18px] w-[18px]", isInWishlist(product._id || product.id) && "fill-current")} strokeWidth={1.6} />
                                </button>
                            </div>

                            {images.length > 1 && (
                                <div className="scrollbar-hide mt-3 flex gap-3 overflow-x-auto pb-1 lg:hidden">
                                    {images.map((img, i) => (
                                        <button key={i} onClick={() => setActiveImage(i)} aria-label={`View image ${i + 1}`}
                                            className={cn("relative h-16 w-16 shrink-0 overflow-hidden rounded-[10px] border transition-all duration-400",
                                                activeImage === i ? "border-[#ec4899]" : "border-[#7a2c4e]/10 opacity-55")}>
                                            <SafeImg src={img} alt={`${product.name} ${i + 1}`} label={product.name} className="h-full w-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ---- info ---- */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}>
                            <span className="inline-flex items-center gap-2.5 rounded-full bg-[#ec4899]/10 px-4 py-1.5 text-[10.5px] uppercase tracking-[0.26em] text-[#ec4899]">
                                <i aria-hidden className="block h-1.5 w-1.5 rounded-full bg-[#ec4899]" />Leira exclusive
                            </span>

                            <h1 className={cn("mt-4 font-serif text-[clamp(28px,3.6vw,42px)] font-light leading-[1.1] tracking-tight", INK)}>{product.name}</h1>
                            {benefitH2 && <p className="mt-2 max-w-[36ch] font-serif text-[16px] font-light italic text-[#7a2c4e]/55">{benefitH2}</p>}

                            <div className="mt-4 flex items-center gap-2">
                                <span className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((r) => (
                                        <Star key={r} className={cn("h-[14px] w-[14px]", reviewStats.totalCount > 0 && r <= Math.round(reviewStats.avgRating) ? "fill-[#ec4899] text-[#ec4899]" : "text-[#7a2c4e]/20")} strokeWidth={1.4} />
                                    ))}
                                </span>
                                <span className={cn("text-[12.5px] font-light", BODY)}>
                                    {reviewStats.totalCount === 0 ? "No reviews yet" : `${reviewStats.avgRating.toFixed(1)} · ${reviewStats.totalCount} reviews`}
                                </span>
                            </div>

                            <div className={cn("mt-5 flex items-baseline gap-3 border-t pt-5", HAIR)}>
                                <span className="font-serif text-[clamp(28px,3vw,36px)] font-light leading-none text-[#ec4899] tabular-nums">{product.price}</span>
                                {detailMrp && <span className="text-[15px] font-light tabular-nums text-[#6b5560]/60 line-through">{detailMrp}</span>}
                                <span className="text-[11.5px] font-light text-[#6b5560]/60">Inclusive of taxes</span>
                            </div>

                            <div className="mt-6 hidden gap-3 sm:flex">
                                <div className={cn("flex h-14 items-center rounded-full border bg-white/70", HAIR)}>
                                    <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex h-full w-12 items-center justify-center text-[#7a2c4e]/60 hover:text-[#ec4899]" aria-label="Decrease quantity"><Minus className="h-4 w-4" strokeWidth={1.6} /></button>
                                    <span className={cn("min-w-9 text-center font-serif text-[18px] tabular-nums", INK)}>{quantity}</span>
                                    <button type="button" onClick={() => setQuantity((q) => q + 1)} className="flex h-full w-12 items-center justify-center text-[#7a2c4e]/60 hover:text-[#ec4899]" aria-label="Increase quantity"><Plus className="h-4 w-4" strokeWidth={1.6} /></button>
                                </div>
                                <button onClick={handleAddToCart} disabled={isOutOfStock}
                                    className={cn("group relative flex h-14 flex-1 items-center justify-center gap-3 overflow-hidden rounded-full text-[11px] uppercase tracking-[0.22em] transition-transform duration-500",
                                        isOutOfStock ? "cursor-not-allowed bg-[#7a2c4e]/15 text-[#7a2c4e]/50" : "bg-gradient-to-br from-[#f9a8d4] to-[#ec4899] text-white shadow-[0_18px_34px_-20px_rgba(236,72,153,0.9)] hover:-translate-y-0.5")}>
                                    <span className="relative z-10 flex items-center gap-3"><ShoppingBag className="h-4 w-4" strokeWidth={1.6} />{isOutOfStock ? "Out of stock" : "Add to bag"}</span>
                                    {!isOutOfStock && <span aria-hidden className="absolute inset-0 translate-y-full bg-[#7a2c4e] transition-transform duration-500 group-hover:translate-y-0" />}
                                </button>
                            </div>

                            {/* ---- USPs: icon + colour, never a plain text row ---- */}
                            <div className={cn("mt-7 grid grid-cols-2 gap-2.5 border-t pt-6", HAIR)}>
                                {USPS.map((u, i) => {
                                    const Icon = u.icon;
                                    return (
                                        <Reveal key={u.label} delay={i * 70}>
                                            <div className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5" style={{ background: `${u.tint}12` }}>
                                                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.7} style={{ color: u.tint }} />
                                                <span className="text-[11.5px] font-medium" style={{ color: u.tint }}>{u.label}</span>
                                            </div>
                                        </Reveal>
                                    );
                                })}
                            </div>

                            {/* ---- share ---- */}
                            <ShareRow productName={product.name} price={product.price || ""} />

                            {/* ---- reading sections ---- */}
                            <div className="mt-2">
                                <Section title="Description">
                                    <div className={cn("space-y-4 text-[14.5px] font-light leading-[1.85]", BODY)}>
                                        {descriptionParagraphs.map((p, i) => <p key={i}>{renderFormattedDescription(p)}</p>)}
                                    </div>
                                </Section>
                                <Section title="How to use">
                                    <div className="overflow-hidden rounded-[16px] border border-[#7a2c4e]/[0.1]">
                                        <Image src={HOW_TO_USE_INFOGRAPHIC_SRC} alt="Leira — how to use" width={1125} height={1398} className="h-auto w-full object-contain object-top" sizes="(max-width: 1024px) 100vw, 480px" />
                                    </div>
                                </Section>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </main>

            {/* ================= specifications — animated stat cards ================= */}
            <section className="relative isolate [overflow:clip] bg-[#fffdfc] px-5 py-16 sm:px-8 md:py-20 lg:px-12">
                <Grain />
                <div className="mx-auto max-w-6xl">
                    <Reveal>
                        <span className="text-[10.5px] uppercase tracking-[0.24em] text-[#ec4899]">Specifications</span>
                        <h2 className={cn("mt-3 font-serif text-[clamp(24px,3vw,34px)] font-light leading-[1.15]", INK)}>The details that matter</h2>
                    </Reveal>

                    <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {SPECS.map((s, i) => {
                            const Icon = s.icon;
                            return (
                                <Reveal key={s.label} delay={i * 60}>
                                    <motion.div
                                        whileHover={{ y: -4 }}
                                        transition={{ duration: 0.3, ease: EASE }}
                                        className="flex flex-col items-center gap-2 rounded-[16px] border border-[#7a2c4e]/[0.1] bg-white p-5 text-center shadow-[0_16px_32px_-26px_rgba(122,44,78,0.3)]"
                                    >
                                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ec4899]/10">
                                            <Icon className="h-[18px] w-[18px] text-[#ec4899]" strokeWidth={1.6} />
                                        </span>
                                        <span className="text-[10px] uppercase tracking-[0.14em] text-[#7a2c4e]/50">{s.label}</span>
                                        <span className={cn("font-serif text-[14px] font-normal leading-tight", INK)}>{s.value}</span>
                                    </motion.div>
                                </Reveal>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ================= ingredients — flip cards ================= */}
            <section className="relative isolate [overflow:clip] bg-gradient-to-b from-[#fdeef4] via-[#fff5f9] to-[#fffdfc] px-5 py-16 sm:px-8 md:py-20 lg:px-12">
                <Grain />
                <div className="mx-auto max-w-6xl">
                    <Reveal>
                        <span className="text-[10.5px] uppercase tracking-[0.24em] text-[#ec4899]">Ingredients</span>
                        <h2 className={cn("mt-3 font-serif text-[clamp(24px,3vw,34px)] font-light leading-[1.15]", INK)}>Crafted with three essential oils</h2>
                        <p className={cn("mt-3 max-w-[54ch] text-[14px] font-light leading-[1.85]", BODY)}>Hover a card to see what each oil actually does for your skin.</p>
                    </Reveal>

                    <div className="mt-9 grid gap-6 sm:grid-cols-3">
                        {INGREDIENTS.map((ing, i) => (
                            <Reveal key={ing.name} delay={i * 90}>
                                <FlipCard tint={ing.tint} front={ing.name} back={ing.note} />
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ================= benefits — coloured icon cards ================= */}
            <section className="relative isolate [overflow:clip] bg-[#fffdfc] px-5 py-16 sm:px-8 md:py-20 lg:px-12">
                <Grain />
                <div className="mx-auto max-w-6xl">
                    <Reveal>
                        <span className="text-[10.5px] uppercase tracking-[0.24em] text-[#ec4899]">Benefits</span>
                        <h2 className={cn("mt-3 font-serif text-[clamp(24px,3vw,34px)] font-light leading-[1.15]", INK)}>Why it works</h2>
                    </Reveal>

                    <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {PRODUCT_POINTS.map((p, i) => {
                            const Icon = p.icon;
                            return (
                                <Reveal key={p.title} delay={i * 80}>
                                    <motion.div
                                        whileHover={{ y: -5, boxShadow: "0 24px 48px -30px rgba(122,44,78,0.35)" }}
                                        transition={{ duration: 0.3, ease: EASE }}
                                        className="h-full rounded-[18px] border border-[#7a2c4e]/[0.1] bg-white p-6"
                                    >
                                        <span className="flex h-11 w-11 items-center justify-center rounded-[12px]" style={{ background: `${p.tint}15` }}>
                                            <Icon className="h-5 w-5" strokeWidth={1.6} style={{ color: p.tint }} />
                                        </span>
                                        <h3 className={cn("mt-4 font-serif text-[17px] font-normal leading-tight", INK)}>{p.title}</h3>
                                        <p className={cn("mt-2 text-[13px] font-light leading-[1.65]", BODY)}>{p.description}</p>
                                    </motion.div>
                                </Reveal>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ================= explore ================= */}
            <section className="relative isolate [overflow:clip] bg-gradient-to-b from-[#fdeef4] via-[#fff5f9] to-[#fffdfc] px-5 py-16 sm:px-8 md:py-20 lg:px-12" aria-labelledby="explore-leira-heading">
                <Grain />
                <div className="mx-auto max-w-6xl">
                    <Reveal>
                        <span className="text-[10.5px] uppercase tracking-[0.24em] text-[#ec4899]">The collection</span>
                        <h2 id="explore-leira-heading" className={cn("mt-3 font-serif text-[clamp(24px,3vw,36px)] font-light leading-[1.15]", INK)}>Explore more from Leira</h2>
                    </Reveal>
                    <div className="mt-8 grid gap-px overflow-hidden rounded-[20px] border border-[#7a2c4e]/[0.1] bg-[#7a2c4e]/[0.08] sm:grid-cols-2 xl:grid-cols-4">
                        {getFlagshipSiblingsExcluding({ canonicalPath: getProductPath(product), urlParam: currentParam, slugFromProduct: toSlug(product.id || product.name || "") }).map((item) => (
                            <Link key={item.href} href={item.href} className="group flex flex-col justify-between bg-[#fffdfc] p-6 transition-colors duration-500 hover:bg-[#fff5f9]">
                                <div>
                                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#ec4899]">Fragrance</span>
                                    <p className={cn("mt-2.5 font-serif text-[19px] font-light leading-[1.25]", INK)}>{item.label}</p>
                                    <p className={cn("mt-1.5 text-[12.5px] font-light leading-[1.65]", BODY)}>{item.line}</p>
                                </div>
                                <span className="mt-5 inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.2em] text-[#7a2c4e]/70 group-hover:text-[#ec4899]">View product <Mark className="transition-transform duration-500 group-hover:translate-x-1" /></span>
                            </Link>
                        ))}
                        <Link href="/benefits" className="group flex flex-col justify-between bg-[#fff5f9] p-6 transition-colors duration-500 hover:bg-[#fdeef4]">
                            <div>
                                <span className="text-[10px] uppercase tracking-[0.2em] text-[#ec4899]">Learn</span>
                                <p className={cn("mt-2.5 font-serif text-[19px] font-light leading-[1.25]", INK)}>Why Leira — benefits</p>
                                <p className={cn("mt-1.5 text-[12.5px] font-light leading-[1.65]", BODY)}>Safety, ingredients, and how it fits your routine.</p>
                            </div>
                            <span className="mt-5 inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.2em] text-[#7a2c4e]/70 group-hover:text-[#ec4899]">Read benefits <Mark className="transition-transform duration-500 group-hover:translate-x-1" /></span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ================= reviews ================= */}
            <section className="relative isolate [overflow:clip] bg-[#fffdfc] px-5 py-16 sm:px-8 md:py-20 lg:px-12">
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
                                    <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} maxLength={1000} placeholder="Share your experience (optional)"
                                        className={cn("mt-4 w-full resize-none rounded-[12px] border bg-transparent p-3.5 text-[14.5px] font-light leading-[1.75] outline-none focus:border-[#ec4899]/50", HAIR, INK)} />
                                    <button type="button" onClick={handleSubmitReview} disabled={reviewSubmitting}
                                        className="mt-4 rounded-full bg-gradient-to-br from-[#f9a8d4] to-[#ec4899] px-7 py-3 text-[11px] uppercase tracking-[0.2em] text-white transition-transform duration-500 hover:-translate-y-0.5 disabled:opacity-55">
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
                                                    {[1, 2, 3, 4, 5].map((r) => <Star key={r} className={cn("h-3.5 w-3.5", r <= rev.rating ? "fill-[#ec4899] text-[#ec4899]" : "text-[#7a2c4e]/20")} strokeWidth={1.4} />)}
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
                                                {relMrp && <span className="text-[11.5px] font-light tabular-nums text-[#6b5560]/55 line-through">{relMrp}</span>}
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
                    <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex h-full w-10 items-center justify-center text-[#7a2c4e]/60" aria-label="Decrease quantity"><Minus className="h-3.5 w-3.5" strokeWidth={1.6} /></button>
                    <span className={cn("min-w-7 text-center font-serif text-[15px] tabular-nums", INK)}>{quantity}</span>
                    <button type="button" onClick={() => setQuantity((q) => q + 1)} className="flex h-full w-10 items-center justify-center text-[#7a2c4e]/60" aria-label="Increase quantity"><Plus className="h-3.5 w-3.5" strokeWidth={1.6} /></button>
                </div>
                <button onClick={handleAddToCart} disabled={isOutOfStock}
                    className={cn("flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-[11px] uppercase tracking-[0.2em] transition-colors duration-400",
                        isOutOfStock ? "bg-[#7a2c4e]/15 text-[#7a2c4e]/50" : "bg-gradient-to-br from-[#f9a8d4] to-[#ec4899] text-white")}>
                    <ShoppingBag className="h-4 w-4" strokeWidth={1.6} />{isOutOfStock ? "Out of stock" : `Add · ${product.price}`}
                </button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------
   FlipCard — hover/tap to reveal the benefit behind each ingredient.
   Pure CSS 3D flip, no dependency beyond what's already imported.
------------------------------------------------------------------- */
function FlipCard({ tint, front, back }: { tint: string; front: string; back: string }) {
    const [flipped, setFlipped] = useState(false);
    return (
        <div
            className="group relative h-[220px] cursor-pointer [perspective:1200px]"
            onMouseEnter={() => setFlipped(true)}
            onMouseLeave={() => setFlipped(false)}
            onClick={() => setFlipped((f) => !f)}
        >
            <div
                className="relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d]"
                style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
            >
                {/* front */}
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[18px] border border-[#7a2c4e]/[0.1] p-6 text-center [backface-visibility:hidden]"
                    style={{ background: `linear-gradient(160deg, ${tint}14, #fffdfc)` }}
                >
                    <span className="h-2 w-2 rotate-[-45deg] rounded-[50%_50%_50%_0]" style={{ background: tint }} />
                    <p className="font-serif text-[22px] font-light italic" style={{ color: tint }}>{front}</p>
                    <span className={cn("text-[11px] font-light uppercase tracking-[0.14em]", BODY)}>Hover to reveal</span>
                </div>
                {/* back */}
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[18px] p-7 text-center text-white [backface-visibility:hidden]"
                    style={{ transform: "rotateY(180deg)", background: `linear-gradient(160deg, ${tint}, #2b0f1d)` }}
                >
                    <p className="text-[14px] font-light leading-[1.7]">{back}</p>
                </div>
            </div>
        </div>
    );
}