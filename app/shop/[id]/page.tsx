"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MiniNavbar } from "@/components/ui/mini-navbar";
import Footer from "@/components/Footer";
import { useProduct } from "@/hooks/useProduct";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useToast } from "@/components/ui/toast";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingBag, Minus, Plus, Star, Zap, Leaf, Eye, ShieldCheck, Droplet, Scale, Stethoscope } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn, strikethroughPriceIfHigher } from "@/lib/utils";
import { useProducts } from "@/hooks/useProducts";
import { useProductReviews } from "@/hooks/useProductReviews";
import { reviewAPI } from "@/lib/api";
import { resolvePdpHeroLine, resolveProductSeoCopy } from "@/lib/seo/productCopy";
import { parseInrPrice } from "@/lib/analytics/metaPixel";
import { isRecommendableProduct } from "@/lib/product-filters";
import { getFlagshipSiblingsExcluding } from "@/lib/shop-flagship-discovery";
import { pickShopCardPath } from "@/lib/product-card-images";
import { getImageUrl } from "@/lib/imageUtils";
import { canonicalProductSlug, getProductShopPath } from "@/lib/product-slugs";
import { trackViewItem } from "@/lib/analytics/ecommerce";
import { trackMetaEvent } from "@/lib/analytics/metaPixel";

/** Public asset — spaces encoded for Next/Image `src` */
const HOW_TO_USE_INFOGRAPHIC_SRC = encodeURI("/How to use leira.png");

/** Match hero + shop cards — smaller optimized payloads */
const PDP_IMAGE_QUALITY = 82;

const pseudoCount = (seed: string, min = 1, max = 50) => {
    const normalized = String(seed || "leira");
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
        hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
    }
    return (hash % (max - min + 1)) + min;
};

const renderFormattedDescription = (value: string) => {
    const parts = String(value || "").split(/(\*\*[^*]+\*\*)/g);

    return parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return (
                <strong key={index} className="font-semibold text-gray-950">
                    {part.slice(2, -2)}
                </strong>
            );
        }
        return part;
    });
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

export default function ProductDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { product, loading, error: fetchError } = useProduct(id as string);
    const { products: allProducts } = useProducts();
    const { reviews, stats: reviewStats, refetch: refetchReviews } = useProductReviews(product?._id || "");
    const { addToCart } = useCart();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const { success, error } = useToast();

    const [quantity, setQuantity] = useState(1);
    const [activeImage, setActiveImage] = useState(0);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState("");
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const currentParam = String(id || "");

    const toSlug = (value: string) =>
        String(value || "")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .replace(/-{2,}/g, "-");

    const getProductPath = (item: { id?: string; _id?: string; name?: string }) =>
        getProductShopPath(item);

    useEffect(() => {
        if (!product) return;
        const canonical = canonicalProductSlug(product.id, product.name);
        if (canonical && currentParam && currentParam !== canonical) {
            router.replace(`/shop/${canonical}`);
        }
    }, [product, currentParam, router]);

    useEffect(() => {
        if (!product) return;
        const pid = String(product._id || product.id || "");
        if (!pid) return;
        const price = parseInrPrice(product.price);
        trackViewItem({
            item_id: pid,
            item_name: product.name,
            price,
            quantity: 1,
        });
        trackMetaEvent("ViewContent", {
            content_ids: [pid],
            content_name: product.name,
            content_type: "product",
            currency: "INR",
            value: price,
        });
    }, [product?._id, product?.id]);

    const unitPrice = React.useMemo(() => parseInrPrice(product?.price), [product?.price]);
    const detailMrp = React.useMemo(
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
            const snapshot = {
                name: product.name,
                price: product.price,
                imageUrl: productImage
            };
            await addToCart(product._id || product.id, quantity, snapshot);
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
                <div className="min-h-screen bg-white leira-underlap-nav-spacer flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
                    <p className="mt-4 text-gray-500 font-serif italic text-lg">Preparing your fragrance experience...</p>
                </div>
            </>
        );
    }

    if (fetchError || !product) {
        return (
            <>
                <MiniNavbar />
                <div className="min-h-screen bg-white leira-underlap-nav-spacer flex flex-col items-center justify-center p-6">
                <h2 className="text-3xl font-serif italic text-gray-900 mb-4">Fragrance Not Found</h2>
                <p className="text-gray-500 mb-8">This exclusive scent might be unavailable or removed.</p>
                <Link href="/shop" className="px-10 py-4 bg-black text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors">
                    Return to Shop
                </Link>
                </div>
            </>
        );
    }

    const images =
        Array.isArray(product.images) && product.images.length > 0
            ? product.images
            : [getImageUrl(pickShopCardPath(product) || "")];
    const isOutOfStock = product.status === "inactive" || Number(product.stock ?? 0) <= 0;
    const viewersCount = pseudoCount(`${product._id || product.id || product.name}`);
    const seoCopy = resolveProductSeoCopy(
        currentParam,
        String(product?.id || ""),
        String(product?.name || "")
    );
    const benefitH2 = resolvePdpHeroLine(
        String(product?.name || ""),
        product?.detailTagline,
        currentParam,
        String(product?.id || ""),
        String(product?.name || "")
    );
    const productDescription =
        (product.description && product.description.trim().length > 3
            ? product.description
            : seoCopy?.longDescription || "Experience the essence of luxury with this exclusive fragrance.");
    const descriptionParagraphs = String(productDescription)
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);

    return (
        <div className="min-h-screen bg-[#FAF9F6] leira-underlap-nav-spacer">
            <MiniNavbar />

            <main className="pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 mb-12">
                    <Link href="/shop" className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-pink-600 transition-colors">Shop</Link>
                    <span className="text-gray-300">/</span>
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">{product.name}</span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24 items-start">
                    {/* Left: Image Gallery */}
                    <div className="space-y-6">
                        <motion.div
                            layoutId="product-image"
                            className="relative w-full overflow-hidden rounded-3xl bg-[#ebe5df] shadow-2xl shadow-gray-200 border border-gray-100"
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeImage}
                                    initial={{ opacity: 0, scale: 1.02 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="relative w-full"
                                >
                                    <Image
                                        src={images[activeImage]}
                                        alt={product.name}
                                        width={1200}
                                        height={1500}
                                        className="h-auto w-full max-w-full object-contain object-center"
                                        style={{ width: "100%", height: "auto" }}
                                        priority={activeImage === 0}
                                        fetchPriority={activeImage === 0 ? "high" : undefined}
                                        sizes="(max-width: 1024px) 100vw, min(50vw, 42rem)"
                                        quality={PDP_IMAGE_QUALITY}
                                    />
                                </motion.div>
                            </AnimatePresence>

                            <button
                                onClick={toggleWishlist}
                                className={cn(
                                    "absolute top-6 right-6 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90",
                                    isInWishlist(product._id || product.id)
                                        ? "bg-pink-500 text-white"
                                        : "bg-white/80 backdrop-blur-md text-gray-400 hover:text-pink-500"
                                )}
                            >
                                <Heart className={cn("w-6 h-6", isInWishlist(product._id || product.id) && "fill-current")} />
                            </button>
                        </motion.div>

                        {/* Thumbnails */}
                        {images.length > 1 && (
                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                {images.map((img, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setActiveImage(i)}
                                        className={cn(
                                            "relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 border-2 transition-all",
                                            activeImage === i ? "border-pink-500 shadow-md scale-95" : "border-transparent opacity-60 hover:opacity-100"
                                        )}
                                    >
                                        <Image
                                            src={img}
                                            alt={`${product.name} ${i}`}
                                            fill
                                            className="object-cover"
                                            sizes="96px"
                                            quality={PDP_IMAGE_QUALITY}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Premium "How to use" filler under gallery (fills blank space on wide layouts) */}
                        <div className="mt-6">
                            <div className="mx-auto max-w-[520px] rounded-3xl border border-[#e8ddd4]/70 bg-[#faf8f4] p-2 shadow-[0_18px_38px_-18px_rgba(74,44,42,0.18),0_10px_26px_-18px_rgba(139,74,92,0.12)] lg:mx-0">
                                <div className="overflow-hidden rounded-2xl ring-1 ring-black/4">
                                    <Image
                                        src={HOW_TO_USE_INFOGRAPHIC_SRC}
                                        alt="Leira — how to use (clean, drop, apply, glow)"
                                        width={1125}
                                        height={1398}
                                        className="h-auto w-full object-contain object-top"
                                        sizes="(max-width: 1024px) 100vw, 520px"
                                        quality={PDP_IMAGE_QUALITY}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Info */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-10"
                    >
                        <div className="space-y-4">
                            <p className="text-xs font-bold text-pink-600 uppercase tracking-[0.3em]">Leira Exclusive</p>
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-semibold text-gray-900 leading-tight tracking-tight">
                                {product.name}
                            </h1>
                            {benefitH2 ? (
                                <h2 className="text-lg md:text-xl font-serif italic text-neutral-700 leading-snug tracking-tight max-w-2xl">
                                    {benefitH2}
                                </h2>
                            ) : null}
                            <div className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-pink-50/80 px-4 py-1.5 text-xs font-medium text-pink-700">
                                <Eye className="h-3.5 w-3.5" />
                                {viewersCount} viewing now
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
                                <div className="flex flex-wrap items-baseline gap-2">
                                    {detailMrp ? (
                                        <span className="text-lg md:text-xl font-medium text-neutral-500 line-through tabular-nums decoration-neutral-400">
                                            {detailMrp}
                                        </span>
                                    ) : null}
                                    <span className="text-3xl md:text-4xl font-bold text-pink-600 tabular-nums tracking-tight">
                                        {product.price}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((r) => (
                                        <Star
                                            key={r}
                                            className={cn("w-4 h-4", reviewStats.totalCount > 0 && r <= Math.round(reviewStats.avgRating) ? "text-amber-500 fill-amber-500" : "text-gray-300")}
                                        />
                                    ))}
                                    <span className="text-gray-500 text-sm font-medium ml-2">
                                        {reviewStats.totalCount === 0
                                            ? "No reviews yet"
                                            : `${reviewStats.avgRating.toFixed(1)} (${reviewStats.totalCount} reviews)`}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="max-w-2xl space-y-3 text-neutral-700 text-base md:text-lg leading-relaxed font-light text-justify">
                            {descriptionParagraphs.map((paragraph, index) => (
                                <p
                                    key={`${product._id || product.id}-desc-${index}`}
                                    className={index === descriptionParagraphs.length - 1 ? "font-medium text-gray-900" : undefined}
                                >
                                    {renderFormattedDescription(paragraph)}
                                </p>
                            ))}
                        </div>

                        <div className="space-y-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
                                <div className="flex w-full items-center border border-gray-200 rounded-full h-14 bg-white shadow-sm overflow-hidden sm:w-auto">
                                    <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                        className="h-full w-16 shrink-0 text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center"
                                        aria-label="Decrease quantity"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </motion.button>
                                    <span className="flex-1 text-center font-bold text-lg text-gray-900 tabular-nums">
                                        {quantity}
                                    </span>
                                    <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={() => setQuantity((q) => q + 1)}
                                        className="h-full w-16 shrink-0 text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center"
                                        aria-label="Increase quantity"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </motion.button>
                                </div>

                                <button
                                    onClick={handleAddToCart}
                                    disabled={isOutOfStock}
                                    className={cn(
                                        "h-14 w-full rounded-full font-bold uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-3 sm:flex-1 sm:max-w-xs",
                                        isOutOfStock
                                            ? "bg-neutral-300 text-white cursor-not-allowed"
                                            : "bg-linear-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-200 hover:shadow-pink-300 hover:translate-y-[-2px] active:translate-y-0"
                                    )}
                                >
                                    <ShoppingBag className="w-4 h-4" />
                                    {isOutOfStock ? "Out of Stock" : "Add to Luxury Box"}
                                </button>
                            </div>

                            {/* Trust + Shipping cues (pre-checkout) */}
                            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
                                <span className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-pink-200 bg-linear-to-r from-pink-50 via-white to-rose-50 px-4 py-2.5 text-[13px] font-extrabold text-pink-700 shadow-sm shadow-pink-200/40 ring-1 ring-pink-200/40 sm:w-auto sm:justify-start sm:px-5">
                                    Free Shipping
                                </span>
                                <span className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-200 bg-linear-to-r from-emerald-50 via-white to-emerald-50 px-4 py-2.5 text-[13px] font-extrabold text-emerald-800 shadow-sm shadow-emerald-200/40 ring-1 ring-emerald-200/50 sm:w-auto sm:justify-start sm:px-5">
                                    COD Available
                                </span>
                                <span className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-neutral-200 bg-linear-to-r from-white via-white to-neutral-50 px-4 py-2.5 text-[13px] font-extrabold text-neutral-800 shadow-sm ring-1 ring-neutral-200/60 sm:w-auto sm:justify-start sm:px-5">
                                    Secure Payments
                                </span>
                                <span className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-neutral-200 bg-linear-to-r from-white via-white to-neutral-50 px-4 py-2.5 text-[13px] font-extrabold text-neutral-800 shadow-sm ring-1 ring-neutral-200/60 sm:w-auto sm:justify-start sm:px-5">
                                    Easy Support
                                </span>
                            </div>
                        </div>

                        {/* Benefit Grid - from DB features or defaults */}
                        {((product.features && product.features.length > 0) || true) && (
                            <div className="grid grid-cols-1 gap-6 pt-10 border-t border-gray-100 sm:grid-cols-2 lg:grid-cols-3">
                                {[
                                    {
                                        title: "Natural Essence",
                                        description: "Crafted from 100% natural and skin-friendly ingredients.",
                                        icon: <Leaf className="w-5 h-5 text-pink-500" />,
                                    },
                                    {
                                        title: "Instant Freshness",
                                        description: "Eliminates odors instantly and lasts up to 12 hours.",
                                        icon: <Zap className="w-5 h-5 text-pink-500" />,
                                    },
                                    {
                                        title: "External Use Only",
                                        description:
                                            "Made exclusively for the outer intimate area to ensure complete safety and comfort.",
                                        icon: <ShieldCheck className="w-5 h-5 text-pink-500" />,
                                    },
                                    {
                                        title: "100% Safe for Private Area",
                                        description:
                                            "Dermatologically tested and crafted for sensitive skin, with zero irritation.",
                                        icon: <Droplet className="w-5 h-5 text-pink-500" />,
                                    },
                                    {
                                        title: "pH-Balanced Formula",
                                        description:
                                            "Designed to support your skin’s natural balance and keep intimate freshness gentle and irritation-free.",
                                        icon: <Scale className="w-5 h-5 text-pink-500" />,
                                    },
                                    {
                                        title: "Dermatologist Tested",
                                        description:
                                            "Verified by experts to be gentle, non-irritating, and safe for daily intimate use.",
                                        icon: <Stethoscope className="w-5 h-5 text-pink-500" />,
                                    },
                                ].map((item) => (
                                    <div key={item.title} className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center shrink-0">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-1">
                                                {item.title}
                                            </h4>
                                            <p className="text-xs text-gray-500 leading-relaxed font-light">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Flagship siblings + benefits — always in HTML for internal linking (SEO) */}
                <section
                    className="mt-16 rounded-3xl border border-pink-100/80 bg-white/90 p-6 shadow-sm shadow-pink-100/40 sm:p-8 md:p-10"
                    aria-labelledby="explore-leira-heading"
                >
                    <h2 id="explore-leira-heading" className="text-xl font-serif italic text-gray-900 md:text-2xl">
                        Explore more from Leira
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm text-neutral-600 leading-relaxed">
                        Try our other intimate perfumes, or read how Leira keeps you fresh safely — every page on our site connects
                        so you never hit a dead end.
                    </p>
                    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {getFlagshipSiblingsExcluding({
                            canonicalPath: getProductPath(product),
                            urlParam: currentParam,
                            slugFromProduct: toSlug(product.id || product.name || ""),
                        }).map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="group flex flex-col justify-between rounded-2xl border border-gray-100 bg-[#FAF9F6] p-5 transition-all hover:border-pink-200 hover:shadow-md"
                            >
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Fragrance</p>
                                    <p className="mt-2 font-serif text-lg italic text-gray-900 group-hover:text-pink-700">
                                        {item.label}
                                    </p>
                                    <p className="mt-1 text-xs text-neutral-500">{item.line}</p>
                                </div>
                                <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-neutral-900">
                                    View product
                                    <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                                        →
                                    </span>
                                </span>
                            </Link>
                        ))}
                        <Link
                            href="/benefits"
                            className="group flex flex-col justify-between rounded-2xl border border-pink-200/70 bg-linear-to-br from-pink-50/90 to-white p-5 transition-all hover:border-pink-300 hover:shadow-md"
                        >
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Learn</p>
                                <p className="mt-2 font-serif text-lg italic text-gray-900 group-hover:text-pink-700">
                                    Why Leira — benefits
                                </p>
                                <p className="mt-1 text-xs text-neutral-600">
                                    Safety, ingredients, and how intimate perfume fits your daily routine.
                                </p>
                            </div>
                            <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-neutral-900">
                                Read benefits
                                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                                    →
                                </span>
                            </span>
                        </Link>
                    </div>
                    <p className="mt-6 text-center text-xs text-neutral-500">
                        <Link
                            href="/shop"
                            className="font-semibold text-pink-600 underline decoration-pink-200 underline-offset-4 hover:text-pink-700"
                        >
                            Browse the full shop
                        </Link>
                    </p>
                </section>

                {/* Customer Reviews */}
                <section className="mt-20 pt-16 border-t border-gray-100">
                    <h2 className="text-2xl font-serif italic text-gray-900 mb-8">Customer Reviews</h2>

                    <div className="mb-6 rounded-2xl border border-pink-100 bg-pink-50/50 p-4">
                        <p className="text-sm text-pink-700 font-medium">
                            Share your experience with a review — we read every submission. (Review discounts are not offered at this time.)
                        </p>
                    </div>

                    {isLoggedInCustomer() && (
                        <div className="mb-10 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-4">Write a review</h3>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {[1, 2, 3, 4, 5].map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setReviewRating(r)}
                                        className={cn(
                                            "p-1 rounded transition-colors",
                                            reviewRating >= r ? "text-amber-500" : "text-gray-300 hover:text-amber-400"
                                        )}
                                    >
                                        <Star className={cn("w-8 h-8", reviewRating >= r && "fill-current")} />
                                    </button>
                                ))}
                            </div>
                            <textarea
                                placeholder="Share your experience (optional)"
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 resize-none"
                                rows={3}
                                maxLength={1000}
                            />
                            <button
                                type="button"
                                onClick={handleSubmitReview}
                                disabled={reviewSubmitting}
                                className="mt-4 px-6 py-3 bg-neutral-900 text-white rounded-xl text-sm font-medium hover:bg-neutral-800 disabled:opacity-60"
                            >
                                {reviewSubmitting ? "Submitting…" : "Submit review"}
                            </button>
                            <p className="mt-2 text-xs text-gray-500">Your review will be visible after approval.</p>
                        </div>
                    )}
                    {!isLoggedInCustomer() && (
                        <p className="mb-8 text-gray-600">
                            <Link href="/login" className="text-pink-600 font-medium hover:underline">Log in</Link> to leave a review.
                        </p>
                    )}

                    {reviews.length === 0 ? (
                        <p className="text-gray-500 italic">No approved reviews yet.</p>
                    ) : (
                        <ul className="space-y-6">
                            {reviews.map((rev) => (
                                <li key={rev._id} className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-medium text-gray-900">{rev.user?.name || "Customer"}</span>
                                        <span className="flex items-center gap-0.5 text-amber-500">
                                            {[1, 2, 3, 4, 5].map((r) => (
                                                <Star key={r} className={cn("w-4 h-4", r <= rev.rating && "fill-current")} />
                                            ))}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(rev.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                        </span>
                                    </div>
                                    {rev.comment && <p className="text-gray-600 text-sm leading-relaxed">{rev.comment}</p>}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Related Products */}
                {(() => {
                    const currentId = product._id || product.id;
                    const related = allProducts
                        .filter((p) => (p._id || p.id) !== currentId)
                        .filter((p) =>
                            isRecommendableProduct({
                                id: p.id,
                                _id: p._id,
                                name: p.name,
                                status: p.status,
                                showInShopSection: p.showInShopSection,
                                showInComboSection: p.showInComboSection,
                            })
                        )
                        .slice(0, 4);
                    if (related.length === 0) return null;
                    return (
                        <section className="mt-24 pt-16 border-t border-gray-100">
                            <h2 className="text-2xl font-serif italic text-gray-900 mb-8">You May Also Like</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                {related.map((p) => {
                                    const pid = p._id || p.id;
                                    const img = getImageUrl(pickShopCardPath(p) || p.images?.[0] || "");
                                    const relMrp = strikethroughPriceIfHigher(p.price || "", p.originalPrice);
                                    return (
                                        <Link
                                            key={pid}
                                            href={getProductPath(p)}
                                            className="group block rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:border-pink-100 transition-all"
                                        >
                                            <div className="relative w-full overflow-hidden bg-[#ebe5df]">
                                                <Image
                                                    src={img}
                                                    alt={p.name}
                                                    width={1200}
                                                    height={1500}
                                                    className="h-auto w-full max-w-full object-contain object-center"
                                                    style={{ width: "100%", height: "auto" }}
                                                    sizes="(max-width: 640px) 50vw, 25vw"
                                                    quality={PDP_IMAGE_QUALITY}
                                                />
                                            </div>
                                            <div className="p-4">
                                                <h3 className="font-serif italic text-gray-900 text-sm md:text-base line-clamp-2 group-hover:text-pink-600 transition-colors">{p.name}</h3>
                                                <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
                                                    {relMrp ? (
                                                        <span className="text-xs font-medium text-neutral-500 line-through tabular-nums decoration-neutral-400">
                                                            {relMrp}
                                                        </span>
                                                    ) : null}
                                                    <span className="text-sm font-bold text-pink-600 tabular-nums">{p.price}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })()}
            </main>

            <Footer />
        </div>
    );
}
