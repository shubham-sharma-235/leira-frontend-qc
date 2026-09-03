"use client";

import React, { useState, useEffect } from "react";
import { MiniNavbar } from "@/components/ui/mini-navbar";
import Footer from "@/components/Footer";
import { blogAPI } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, FileText, Eye, ThumbsUp, ThumbsDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All", "Scent Guide", "Self Care", "Lifestyle", "Science", "Ethics"];

const toSlug = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const getBlogPath = (post: { slug?: string; _id?: string; title?: string }) => {
  const slug = toSlug(post?.slug || post?.title || "");
  return `/blogs/${slug || post?._id || ""}`;
};

function getImageSrc(url: string) {
  if (!url) return "/images/placeholder.png";
  if (url.startsWith("http")) return url;
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
  return url.startsWith("/") ? `${base}${url}` : url;
}

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await blogAPI.getAll();
        if (!cancelled && res.success && Array.isArray(res.data)) {
          setPosts(res.data);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load blog posts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredPosts =
    activeCategory === "All"
      ? posts
      : posts.filter((p) => p.category === activeCategory);

  const displayPosts = filteredPosts;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col leira-underlap-nav-spacer">
        <MiniNavbar />
        <main className="flex-1 flex items-center justify-center pb-20">
          <div className="w-12 h-12 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col leira-underlap-nav-spacer">
        <MiniNavbar />
        <main className="flex-1 flex flex-col items-center justify-center pb-20 px-6">
          <FileText className="w-14 h-14 text-neutral-300 mb-4" />
          <h2 className="text-xl font-serif text-neutral-900 mb-2">Something went wrong</h2>
          <p className="text-neutral-500 text-center mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-neutral-900 text-white rounded-full text-sm font-medium hover:bg-neutral-800"
          >
            Try again
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] leira-underlap-nav-spacer">
      <MiniNavbar />

      <main className="pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <header className="text-center pt-2 pb-10 md:pb-14 max-w-3xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gray-400 mb-4">
            Scent · Care · Stories
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif italic text-gray-900 leading-[1.1]">
            The Leira Journal
          </h1>
          <p className="mt-5 text-sm md:text-base text-neutral-500 font-medium leading-relaxed">
            Guides, rituals, and quiet science behind India&apos;s first intimate perfume — written for your most sensitive skin.
          </p>
        </header>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="flex flex-wrap gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border",
                  activeCategory === cat
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-500 border-gray-100 hover:border-pink-300 hover:text-pink-500"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
            {filteredPosts.length} Articles Found
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-3xl border border-neutral-100">
            <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-xl font-serif text-neutral-900 mb-2">No articles yet</h3>
            <p className="text-neutral-500">Check back soon for new posts in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-12">
            <AnimatePresence mode="popLayout">
              {displayPosts.map((post: any, index: number) => (
                <motion.article
                  key={post._id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group cursor-pointer"
                >
                  <Link href={getBlogPath(post)}>
                    <div className="relative mb-6 overflow-hidden rounded-4xl bg-[#ebe5df] shadow-lg shadow-gray-200/50">
                      <Image
                        src={getImageSrc(post.imageUrl)}
                        alt={post.title}
                        width={1200}
                        height={800}
                        className="h-auto w-full max-w-full object-contain object-center"
                        style={{ width: "100%", height: "auto" }}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        unoptimized={post.imageUrl?.startsWith("http")}
                      />
                      <div className="pointer-events-none absolute inset-0 bg-black/10 transition-colors duration-500 group-hover:bg-black/0" />
                      <div className="absolute top-6 left-6">
                        <span className="px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-[9px] font-bold uppercase tracking-[0.15em] text-black">
                          {post.category}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {post.date}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {post.readTime}
                        </span>
                      </div>
                      <h3 className="text-2xl font-serif italic text-gray-900 group-hover:text-pink-600 transition-colors duration-300 leading-tight">
                        {post.title}
                      </h3>
                      <p className="text-neutral-500 text-sm font-medium line-clamp-2">
                        {post.subHeading || post.excerpt}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-neutral-400">
                        <span className="flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          {(post.views ?? 0).toLocaleString()} views
                        </span>
                        <span className="flex items-center gap-1.5">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {post.likes ?? 0}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <ThumbsDown className="w-3.5 h-3.5" />
                          {post.dislikes ?? 0}
                        </span>
                      </div>
                      <div className="pt-2">
                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.2em] text-black group-hover:text-pink-500 transition-colors after:content-[''] after:w-0 after:h-px after:bg-pink-500 after:absolute after:bottom-0 after:left-0 group-hover:after:w-full relative pb-1">
                          Read Entry
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}

      </main>

      <div className="bg-[#0F0F11]">
        <Footer />
      </div>
    </div>
  );
}
