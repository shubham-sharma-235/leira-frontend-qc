"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MiniNavbar } from "@/components/ui/mini-navbar";
import Footer from "@/components/Footer";
import { blogAPI } from "@/lib/api";
import { motion } from "framer-motion";
import { Calendar, Clock, ArrowLeft, Share2, Bookmark, MessageCircle, Eye, ThumbsUp, ThumbsDown, List } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { extractTocFromHtml, injectHeadingIds, normalizeBlogContent, type TocItem } from "./blog-toc";
import { resolveMediaUrl } from "@/lib/mediaUrl";

function getImageSrc(url: string) {
  return resolveMediaUrl(url);
}

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

const getCategoryPath = (category?: string) => `/blogs/category/${toSlug(category || "")}`;

const BLOG_CONTENT_CLASS =
  "blog-content max-w-none text-[17px] leading-[1.9] text-neutral-800 [&_p]:mb-5 [&_p]:text-neutral-800 [&_strong]:font-semibold [&_strong]:text-neutral-900 [&_ul]:mb-7 [&_ul]:list-disc [&_ul]:pl-6 [&_ul>li]:mb-2 [&_ol]:mb-7 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol>li]:mb-2 [&_h2:not(.blog-hero-subtitle)]:mt-12 [&_h2:not(.blog-hero-subtitle)]:mb-5 [&_h2:not(.blog-hero-subtitle)]:border-t [&_h2:not(.blog-hero-subtitle)]:border-pink-300 [&_h2:not(.blog-hero-subtitle)]:pt-7 [&_h2:not(.blog-hero-subtitle)]:text-[clamp(1.65rem,2.1vw,2.05rem)] [&_h2:not(.blog-hero-subtitle)]:font-semibold [&_h2:not(.blog-hero-subtitle)]:leading-tight [&_h2:not(.blog-hero-subtitle)]:tracking-tight [&_h2:not(.blog-hero-subtitle)]:text-[#8f1d58] [&_h3]:mt-7 [&_h3]:mb-3 [&_h3]:text-[1.05rem] [&_h3]:font-bold [&_h3]:leading-snug [&_h3]:text-[#30548a] [&_h3.tone-gold]:text-[#b07a09] [&_h3.tone-blue]:text-[#30548a] [&_a]:text-[#30548a] [&_a]:underline [&_a]:underline-offset-2 [&_h4]:mt-6 [&_h4]:mb-3 [&_h4]:text-[1.06rem] [&_h4]:font-semibold [&_h4]:text-neutral-900 [&_.inci-name]:my-5 [&_.inci-name]:rounded-none [&_.inci-name]:border [&_.inci-name]:border-[#2f8f45] [&_.inci-name]:bg-[#f8fff9] [&_.inci-name]:px-4 [&_.inci-name]:py-2 [&_.inci-name]:text-[1.02rem] [&_.inci-name]:font-semibold [&_.inci-name]:text-[#24753a] [&_.inci-name_strong]:text-[#24753a] [&_ul.check-list]:list-none [&_ul.check-list]:pl-0 [&_ul.check-list>li]:relative [&_ul.check-list>li]:pl-8 [&_ul.check-list>li]:text-[#24753a] [&_ul.check-list>li]:font-medium [&_ul.check-list>li]:before:content-['✓'] [&_ul.check-list>li]:before:absolute [&_ul.check-list>li]:before:left-0 [&_ul.check-list>li]:before:top-0 [&_ul.check-list>li]:before:text-[#24753a] [&_ul.check-list>li_*]:text-[#24753a] [&_ul.check-list>li_strong]:font-medium [&_ul.check-list>li_strong]:text-[#24753a] [&_blockquote]:my-8 [&_blockquote]:border-l-2 [&_blockquote]:border-pink-500 [&_blockquote]:pl-5 [&_blockquote]:text-center [&_blockquote]:text-[1.2rem] [&_blockquote]:font-medium [&_blockquote]:text-[#8f1d58] [&_.gold-box]:my-6 [&_.gold-box]:border [&_.gold-box]:border-[#b07a09] [&_.gold-box]:bg-[#fffaf0] [&_.gold-box]:px-5 [&_.gold-box]:py-4 [&_.gold-box]:text-[#7a4e00] [&_.gold-box]:text-[0.98rem] [&_.gold-box_p]:my-1 [&_.gold-box_strong]:text-[#7a4e00] [&_.gold-box_strong]:font-semibold";

function markInciHeadingsAsBox(html: string): string {
  if (!html) return html;

  const addInciClassToH3 = html.replace(
    /<h3([^>]*)>([\s\S]*?)<\/h3>/gi,
    (full, attrs = "", inner = "") => {
      const plain = String(inner).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      if (!/^INCI\s*Name\s*:/i.test(plain)) return full;

      if (/class\s*=\s*"/i.test(attrs)) {
        return `<h3${String(attrs).replace(/class\s*=\s*"([^"]*)"/i, ' class="$1 inci-name"')}>${inner}</h3>`;
      }
      return `<h3${attrs} class="inci-name">${inner}</h3>`;
    }
  );

  const withInciParagraphs = addInciClassToH3.replace(
    /<p([^>]*)>\s*<strong>\s*(INCI\s*Name\s*:[\s\S]*?)<\/strong>\s*<\/p>/gi,
    `<p$1 class="inci-name"><strong>$2</strong></p>`
  );

  return withInciParagraphs.replace(/<ul class="check-list"/gi, '<ul class="check-list tone-green"');
}

export default function BlogPostDetailClient({ post, relatedPosts }: { post: any; relatedPosts: any[] }) {
  const router = useRouter();
  const imageSrc = getImageSrc(post.imageUrl);
  const [likes, setLikes] = useState(post.likes ?? 0);
  const [dislikes, setDislikes] = useState(post.dislikes ?? 0);
  const [views, setViews] = useState(post.views ?? 0);
  const [reacting, setReacting] = useState<"like" | "dislike" | null>(null);
  const [userReaction, setUserReaction] = useState<"like" | "dislike" | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(true);

  const { toc, contentWithIds, blocks } = useMemo(() => {
    const incomingBlocks = Array.isArray(post?.blocks) ? post.blocks : [];
    const sortedBlocks = incomingBlocks
      .slice()
      .sort((a: any, b: any) => (Number(a?.order) || 0) - (Number(b?.order) || 0));

    const blockHtml = sortedBlocks
      .map((b: any) => String(b?.html || ""))
      .filter(Boolean)
      .join("\n");

    const htmlSource = normalizeBlogContent(blockHtml || post.content || "");
    const tocList = extractTocFromHtml(htmlSource);
    const withIds = injectHeadingIds(htmlSource, tocList);
    const withInciBoxes = markInciHeadingsAsBox(withIds);
    return { toc: tocList, contentWithIds: withInciBoxes, blocks: sortedBlocks };
  }, [post.content, post?.blocks]);

  const renderedBlocks = useMemo(() => {
    if (!Array.isArray(blocks) || blocks.length === 0) return null;
    const imgSrc = (url: string) => getImageSrc(url);

    const calloutToneClass = (tone?: string) => {
      if (tone === "green") return "border-[#2f8f45] bg-[#f8fff9] text-[#24753a]";
      if (tone === "pink") return "border-pink-300 bg-[#FFFBFD] text-[#8f1d58]";
      return "border-neutral-200 bg-neutral-50 text-neutral-800";
    };

    return blocks.map((b: any, i: number) => {
      const type = String(b?.type || "richText");
      const caption = String(b?.caption || "").trim();
      const alt = String(b?.alt || "").trim() || "Blog image";
      const imageUrl = String(b?.imageUrl || "").trim();
      const html = String(b?.html || "");

      if (type === "image") {
        if (!imageUrl) return null;
        return (
          <figure key={`blk-${i}`} className="my-10">
            <div className="relative w-full overflow-hidden rounded-2xl">
              <Image
                src={imgSrc(imageUrl)}
                alt={alt}
                width={1600}
                height={1000}
                className="h-auto w-full max-w-full object-cover object-center"
                sizes="(max-width: 768px) 100vw, min(896px, 100vw)"
                loading="lazy"
                unoptimized={imageUrl.startsWith("http")}
              />
            </div>
            {caption && <figcaption className="mt-3 text-center text-xs text-neutral-500">{caption}</figcaption>}
          </figure>
        );
      }

      if (type === "imageLeft" || type === "imageRight") {
        if (!imageUrl) return null;
        const isRight = type === "imageRight";
        return (
          <section
            key={`blk-${i}`}
            className="my-12 grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-10 items-start"
          >
            <div className={`lg:col-span-5 ${isRight ? "lg:order-2" : "lg:order-1"}`}>
              <div className="relative aspect-4/5 min-h-[280px] w-full overflow-hidden rounded-3xl border border-neutral-100 bg-transparent shadow-sm lg:min-h-[360px]">
                <Image
                  src={imgSrc(imageUrl)}
                  alt={alt}
                  fill
                  className="object-contain object-center p-2"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  loading="lazy"
                  unoptimized={imageUrl.startsWith("http")}
                />
              </div>
              {caption && <div className="mt-3 text-center text-xs text-neutral-500">{caption}</div>}
            </div>
            <div className={`lg:col-span-7 ${isRight ? "lg:order-1" : "lg:order-2"}`}>
              <div
                className={BLOG_CONTENT_CLASS}
                dangerouslySetInnerHTML={{ __html: injectHeadingIds(normalizeBlogContent(html), toc) }}
              />
            </div>
          </section>
        );
      }

      if (type === "callout") {
        const tone = String(b?.tone || "neutral");
        if (!html) return null;
        return (
          <section key={`blk-${i}`} className="my-10">
            <div
              className={`rounded-3xl border px-6 py-6 md:px-8 md:py-7 shadow-sm ${calloutToneClass(tone)}`}
            >
              <div
                className="max-w-none text-[15.5px] leading-[1.85] [&_p]:my-3 [&_strong]:font-semibold [&_a]:text-[#30548a] [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: normalizeBlogContent(html) }}
              />
            </div>
          </section>
        );
      }

      // richText
      if (!html) return null;
      return (
        <section key={`blk-${i}`} className="my-10">
          <div
            className={BLOG_CONTENT_CLASS}
            dangerouslySetInnerHTML={{ __html: normalizeBlogContent(html) }}
          />
        </section>
      );
    });
  }, [blocks, toc]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await blogAPI.recordView(post._id);
        if (!cancelled && res?.data?.views != null) setViews(res.data.views);
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [post._id]);

  useEffect(() => {
    let cancelled = false;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const rawUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    let role: string | null = null;
    try {
      role = rawUser ? JSON.parse(rawUser)?.role : null;
    } catch {
      role = null;
    }
    const canReact = !!token && role !== "admin";
    setIsLoggedIn(canReact);
    if (!canReact) {
      setUserReaction(null);
      return;
    }
    (async () => {
      try {
        const res = await blogAPI.getReaction(post._id);
        if (!cancelled) setUserReaction(res?.data?.reaction || null);
      } catch {
        if (!cancelled) setUserReaction(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [post._id]);

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: post.title,
        text: post.excerpt,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
    }
  };

  const handleReact = async (type: "like" | "dislike") => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    if (reacting) return;
    setReacting(type);
    try {
      const res = await blogAPI.react(post._id, type);
      if (res?.data) {
        setLikes(res.data.likes ?? likes);
        setDislikes(res.data.dislikes ?? dislikes);
        setUserReaction(res.data.reaction ?? type);
      }
    } catch {
      // ignore
    } finally {
      setReacting(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] leira-underlap-nav-spacer">
      <style>{`
        .leira-summer-blog {
          max-width: 760px;
          margin: 0 auto;
          color: #231f20;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 16px;
          line-height: 1.18;
        }
        .blog-content .leira-summer-blog h2,
        .leira-summer-blog h2 {
          border-top: 1px solid #b01855 !important;
          color: #9b174f !important;
          font-family: Arial, sans-serif !important;
          font-size: 30px !important;
          font-weight: 800 !important;
          line-height: 1.08 !important;
          margin: 42px 0 18px !important;
          padding-top: 26px !important;
        }
        .blog-content .leira-summer-blog h3,
        .leira-summer-blog h3 {
          color: #30548a !important;
          font-family: Arial, sans-serif !important;
          font-size: 17px !important;
          font-weight: 800 !important;
          line-height: 1.25 !important;
          margin: 22px 0 10px !important;
        }
        .blog-content .leira-summer-blog h3.tone-gold,
        .leira-summer-blog h3.tone-gold {
          color: #b88400 !important;
        }
        .leira-summer-blog .hero {
          text-align: center;
        }
        .blog-content .leira-summer-blog .hero h2,
        .leira-summer-blog .hero h2 {
          border-top: 0 !important;
          font-size: 34px !important;
          margin-top: 0 !important;
          padding-top: 0 !important;
        }
        .blog-content .leira-summer-blog .gold,
        .leira-summer-blog .gold {
          color: #b88400 !important;
          font-family: Arial, sans-serif !important;
          font-weight: 800 !important;
        }
        .blog-content .leira-summer-blog p,
        .leira-summer-blog p {
          margin: 0 0 14px !important;
        }
        .leira-summer-blog .banner {
          background: #9b174f;
          color: white;
          font-family: Arial, sans-serif;
          font-size: 20px;
          font-weight: 900;
          line-height: 1.15;
          margin: 34px auto 22px;
          max-width: 650px;
          padding: 10px 18px;
          text-align: center;
        }
        .leira-summer-blog .muted {
          color: #666;
          font-family: Arial, sans-serif;
          font-size: 12px;
          text-align: center;
        }
        .blog-content .leira-summer-blog blockquote,
        .leira-summer-blog blockquote {
          border-left: 4px solid #9b174f !important;
          color: #9b174f !important;
          font-size: 16px !important;
          margin: 36px 0 30px !important;
          padding: 0 0 0 14px !important;
          text-align: left !important;
        }
        .leira-summer-blog table {
          border-collapse: collapse;
          font-size: 13px;
          line-height: 1.08;
          margin: 14px 0 18px;
          width: 100%;
        }
        .leira-summer-blog th {
          background: #9b174f;
          border: 1px solid #111;
          color: white;
          font-family: Arial, sans-serif;
          font-weight: 800;
          padding: 3px 6px;
        }
        .leira-summer-blog td {
          border: 1px solid #111;
          padding: 3px 6px;
        }
        .leira-summer-blog .heat {
          background: linear-gradient(90deg, #ff4b00, #ff9300);
          color: #fff;
          font-weight: 800;
          text-align: center;
        }
        .blog-content .leira-summer-blog ul,
        .leira-summer-blog ul {
          list-style: none !important;
          margin: 12px 0 28px !important;
          padding-left: 20px !important;
        }
        .blog-content .leira-summer-blog li,
        .leira-summer-blog li {
          margin: 8px 0 !important;
        }
        .leira-summer-blog .red-bullets li::before {
          color: #d93458;
          content: "●";
          font-size: 18px;
          margin-right: 10px;
        }
        .leira-summer-blog .green-checks li::before {
          color: #167a25;
          content: "✓";
          font-weight: 900;
          margin-right: 8px;
        }
        .leira-summer-blog .stats {
          border-left: 2px solid #b88400;
          padding-left: 16px !important;
        }
        .leira-summer-blog .stats li strong {
          color: #9b174f !important;
          font-family: Arial, sans-serif;
          font-size: 18px;
        }
        .blog-content .leira-summer-blog .faq h3,
        .leira-summer-blog .faq h3,
        .blog-content h3.tone-blue,
        h3.tone-blue {
          color: #30548a !important;
        }
        .blog-content h3:not(.tone-gold):not(.inci-name) {
          color: #30548a !important;
          font-size: 1.05rem !important;
          font-weight: 700 !important;
        }
        .blog-content h2:not(.blog-hero-subtitle) {
          color: #8f1d58 !important;
          font-size: clamp(1.65rem, 2.1vw, 2.05rem) !important;
        }
        .blog-content a {
          color: #30548a !important;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .blog-content .leira-summer-blog .faq h3,
        .leira-summer-blog .faq h3 {
          font-size: 17px !important;
        }
      `}</style>
      <MiniNavbar />

      <section className="relative w-full overflow-hidden bg-[#ebe5df]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-0"
        >
          <Image
            src={imageSrc}
            alt={post.title}
            width={1920}
            height={1080}
            className="mx-auto h-auto w-full max-w-full max-h-[min(88vh,920px)] object-contain object-center"
            style={{ width: "100%", height: "auto" }}
            priority
            sizes="100vw"
            unoptimized={post.imageUrl?.startsWith("http")}
          />
        </motion.div>

        <div className="absolute top-32 left-8 md:left-12">
          <Link
            href="/blogs"
            className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-md border border-white/50 flex items-center justify-center text-neutral-900 hover:bg-white transition-all group shadow-sm"
            aria-label="Back to blogs"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          </Link>
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-6 py-20">
        <div className="flex items-center justify-between border-b border-gray-100 pb-10 mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 font-bold">
              {(post.author || "L").charAt(0)}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-900">{post.author}</p>
              <p className="text-xs text-gray-400">Contributor</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="p-3 rounded-full hover:bg-gray-50 text-gray-400 transition-colors"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button className="p-3 rounded-full hover:bg-gray-50 text-gray-400 transition-colors" aria-label="Bookmark">
              <Bookmark className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table of Contents - SEO critical for multi-section blogs */}
        {toc.length > 0 && (
          <nav
            className="mb-12 overflow-hidden rounded-3xl bg-white border border-neutral-100 shadow-sm"
            aria-label="Table of contents"
          >
            <div className="px-6 pt-6 pb-4 border-b border-neutral-100 bg-linear-to-b from-white to-[#FFFBFD]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-neutral-500">
                    <List className="w-4 h-4" />
                    On this page
                  </h2>
                  <p className="mt-1 text-xs text-neutral-400">Jump to any section.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTocOpen((v) => !v)}
                  className="shrink-0 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-neutral-600 hover:border-pink-200 hover:text-pink-700 transition-colors"
                  aria-expanded={isTocOpen}
                  aria-controls="blog-toc"
                >
                  {isTocOpen ? "Hide" : "Show"}
                  <span
                    className={`inline-block transition-transform duration-200 ${isTocOpen ? "rotate-180" : "rotate-0"}`}
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                </button>
              </div>
            </div>

            {(() => {
              const sections: Array<{ parent: TocItem; children: TocItem[] }> = [];
              let current: { parent: TocItem; children: TocItem[] } | null = null;

              for (const item of toc) {
                if (item.level === 2) {
                  current = { parent: item, children: [] };
                  sections.push(current);
                  continue;
                }
                if (!current) {
                  // If content starts with an H3, group it under a synthetic parent.
                  current = { parent: { id: item.id, text: "Highlights", level: 2 }, children: [] };
                  sections.push(current);
                }
                current.children.push(item);
              }

              return (
                <div
                  id="blog-toc"
                  className={`px-6 transition-[max-height,opacity] duration-300 ease-out ${
                    isTocOpen ? "max-h-[1200px] opacity-100 py-5" : "max-h-0 opacity-0 py-0"
                  } overflow-hidden`}
                >
                  <ol className="space-y-4">
                    {sections.map((section) => (
                      <li key={section.parent.id}>
                        <a
                          href={`#${section.parent.id}`}
                          onClick={() => setIsTocOpen(false)}
                          className="group flex items-start gap-3 text-[13px] font-semibold text-neutral-900 hover:text-pink-700 transition-colors"
                        >
                          <span className="mt-[0.45rem] h-1.5 w-1.5 rounded-full bg-pink-400/70 group-hover:bg-pink-500 transition-colors" />
                          <span className="leading-snug">{section.parent.text}</span>
                        </a>

                        {section.children.length > 0 && (
                          <ol className="mt-2 ml-[0.35rem] pl-4 border-l border-neutral-100 space-y-2">
                            {section.children.map((child) => (
                              <li key={child.id} className="relative">
                                <a
                                  href={`#${child.id}`}
                                  onClick={() => setIsTocOpen(false)}
                                  className="block text-[12.5px] font-medium text-neutral-600 hover:text-pink-700 transition-colors leading-snug"
                                >
                                  {child.text}
                                </a>
                              </li>
                            ))}
                          </ol>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })()}
          </nav>
        )}

        <article className="prose prose-pink prose-lg max-w-none">
          {/* Title + subtitle from admin fields — never use excerpt/meta as the on-page title */}
          <header className="not-prose mb-10">
            <h1 className="text-[clamp(1.75rem,3vw,2.35rem)] font-semibold leading-tight tracking-tight text-[#8f1d58] m-0">
              {post.title}
            </h1>
            {String(post.subHeading || "").trim() ? (
              <p className="mt-4 mb-0 text-[1.05rem] md:text-[1.12rem] font-normal italic leading-relaxed text-neutral-700">
                {post.subHeading}
              </p>
            ) : null}
          </header>

          {renderedBlocks ? (
            <div className="not-prose">{renderedBlocks}</div>
          ) : contentWithIds ? (
            <div
              className={BLOG_CONTENT_CLASS}
              dangerouslySetInnerHTML={{ __html: contentWithIds }}
            />
          ) : (
            <div className="text-gray-800 leading-[1.8] space-y-6 font-light text-lg">
              <p>No content available for this post.</p>
            </div>
          )}
        </article>

        {/* Like & Dislike + Publish info */}
        <div className="mt-12 pt-10 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-6 text-sm text-neutral-500 mb-6">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Published {post.date}
            </span>
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {views.toLocaleString()} views
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => handleReact("like")}
              disabled={!!reacting}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-colors disabled:opacity-50 ${
                userReaction === "like"
                  ? "border-pink-500 bg-pink-50 text-pink-600"
                  : "border-neutral-200 text-neutral-700 hover:border-pink-300 hover:text-pink-600"
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>{likes}</span>
            </button>
            <button
              type="button"
              onClick={() => handleReact("dislike")}
              disabled={!!reacting}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-colors disabled:opacity-50 ${
                userReaction === "dislike"
                  ? "border-pink-500 bg-pink-50 text-pink-600"
                  : "border-neutral-200 text-neutral-700 hover:border-pink-300 hover:text-pink-600"
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              <span>{dislikes}</span>
            </button>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-8 py-2.5 rounded-full bg-neutral-900 text-white text-sm font-bold uppercase tracking-widest hover:bg-pink-600 transition-colors"
            >
              Shop Now
            </Link>
          </div>
          {!isLoggedIn && (
            <p className="mt-3 text-xs text-neutral-500">
              <Link href="/login" className="text-pink-600 hover:underline">Log in</Link> to react once per post.
            </p>
          )}
        </div>

        <div className="mt-20 pt-10 border-t border-gray-100 flex flex-wrap gap-3">
          {["Beauty", "Lifestyle", "Scent", post.category].filter(Boolean).map((tag) => (
            <span
              key={tag}
              className="px-4 py-2 rounded-xl bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:bg-pink-50 hover:text-pink-500 cursor-pointer transition-colors"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* CTA-ready footer section */}
        <footer className="mt-16 p-8 md:p-12 rounded-3xl bg-neutral-900 text-white text-center">
          <h3 className="text-2xl font-serif italic mb-4">Explore Leira</h3>
          <p className="text-neutral-400 text-sm mb-8 max-w-md mx-auto">
            Discover our collection of fragrances and find your signature scent.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/blogs"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-white/30 text-white text-sm font-bold uppercase tracking-widest hover:bg-white/10 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              More Articles
            </Link>
          </div>
        </footer>
      </main>

      {relatedPosts.length > 0 && (
        <section className="bg-gray-50 py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-serif italic text-gray-900 text-center mb-16 underline decoration-pink-200 underline-offset-8">
              Continue Reading
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
              {relatedPosts.map((p: any) => (
                <Link key={p._id} href={getBlogPath(p)} className="group space-y-6">
                  <div className="relative overflow-hidden rounded-3xl bg-[#ebe5df] shadow-lg transition-all duration-500 group-hover:shadow-pink-100">
                    <Image
                      src={getImageSrc(p.imageUrl)}
                      alt={p.title}
                      width={1200}
                      height={800}
                      className="h-auto w-full max-w-full object-contain object-center"
                      style={{ width: "100%", height: "auto" }}
                      sizes="(max-width: 768px) 100vw, 50vw"
                      loading="lazy"
                      unoptimized={p.imageUrl?.startsWith("http")}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/0" />
                  </div>
                  <div className="space-y-3">
                    <Link
                      href={getCategoryPath(p.category)}
                      className="text-[10px] font-bold uppercase tracking-widest text-pink-500 underline decoration-pink-200"
                    >
                      {p.category}
                    </Link>
                    <h3 className="text-2xl font-serif italic text-gray-900 group-hover:text-pink-600 transition-colors leading-tight">
                      {p.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="bg-[#0F0F11]">
        <Footer />
      </div>
    </div>
  );
}
