"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Facebook,
  Instagram,  Linkedin,
  Twitter,
  Package,
  Truck,
  Globe,
  UserRound,
  Heart,
} from "lucide-react";
import { blogAPI } from "@/lib/api";
import { cn } from "@/lib/utils";

const ink = "text-[#5C4033]";
const inkMuted = "text-[#5C4033]/85";
const headingInk = "text-[#453022]";
const subscribeBg = "bg-[#B85C5C]";

function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.219-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  );
}

function FooterNewsletter() {
  const [email, setEmail] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    window.location.href = `mailto:support@leiraindia.com?subject=${encodeURIComponent("Newsletter signup")}&body=${encodeURIComponent(`Please add me to your newsletter.\n\nEmail: ${trimmed}`)}`;
  };

  return (
    <div className="text-left">
      <h4 className={cn("text-xs font-bold uppercase tracking-[0.14em]", headingInk)}>Stay confident</h4>
      <p className={cn("mt-3 text-sm leading-relaxed", inkMuted)}>Get exclusive offers &amp; wellness tips.</p>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
        <label htmlFor="footer-newsletter-email" className="sr-only">
          Email for newsletter
        </label>
        <input
          id="footer-newsletter-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className={cn(
            "min-h-11 w-full min-w-0 flex-1 rounded-md border border-[#D9CFC4] bg-white px-3.5 py-2.5 text-sm text-[#453022] shadow-inner outline-none transition-[border-color,box-shadow] placeholder:text-[#5C4033]/45 focus:border-[#B85C5C]/55 focus:ring-2 focus:ring-[#B85C5C]/20"
          )}
        />
        <button
          type="submit"
          className={cn(
            subscribeBg,
            "inline-flex min-h-11 shrink-0 items-center justify-center rounded-md px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#a35252]"
          )}
        >
          Subscribe
        </button>
      </form>
    </div>
  );
}

export default function Footer() {
  const [showBlogsLink, setShowBlogsLink] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await blogAPI.getAll();
        if (!mounted) return;
        const hasBlogs = !!(res?.success && Array.isArray(res?.data) && res.data.length > 0);
        setShowBlogsLink(hasBlogs);
      } catch {
        if (mounted) setShowBlogsLink(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const quickLinks = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Collaboration", href: "/collaboration" },
    ...(showBlogsLink ? [{ label: "Blogs", href: "/blogs" }] : []),
  ];

  const collectionLinks = [
    { label: "Shop", href: "/shop" },
    { label: "Benefits", href: "/benefits" },
  ];

  const privacyTermsLinks = [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms and Conditions", href: "/terms-and-conditions" },
    { label: "Shipping Policy", href: "/shipping-policy" },
    { label: "Return & Exchange Policy", href: "/return-exchange-policy" },
    { label: "Cancellation Policy", href: "/cancellation-policy" },
    { label: "Account Deletion", href: "/account-deletion" },
  ];

  const socialLinks = [
    {
      icon: <Instagram className="size-5" strokeWidth={1.75} />,
      label: "Instagram",
      href: "https://www.instagram.com/leiraindia?igsh=MXBmY2R2MjNjdzBlaA==",
    },
    {
      icon: <Facebook className="size-5" strokeWidth={1.75} />,
      label: "Facebook",
      href: "https://www.facebook.com/profile.php?id=61581120730884",
    },
    {
      icon: <PinterestIcon className="size-5" />,
      label: "Pinterest",
      href: "https://in.pinterest.com/LeiraIndia/",
    },
    {
      icon: <Linkedin className="size-5" strokeWidth={1.75} />,
      label: "LinkedIn",
      href: "https://www.linkedin.com/company/130554752/",
    },
    {
      icon: <Twitter className="size-5" strokeWidth={1.75} />,
      label: "X (Twitter)",
      href: "https://x.com/LeiraIndiaxe8",
    },
  ];

  const trustItems = [
    {
      icon: <Package className="size-6 shrink-0" strokeWidth={1.5} />,
      line1: "COD Available",
      line2: null as string | null,
    },
    {
      icon: <Truck className="size-6 shrink-0" strokeWidth={1.5} />,
      line1: "Free Shipping",
      line2: "On ₹999+",
    },
    {
      icon: <Globe className="size-6 shrink-0" strokeWidth={1.5} />,
      line1: "Pan India",
      line2: "Delivery",
    },
    {
      icon: <UserRound className="size-6 shrink-0" strokeWidth={1.5} />,
      line1: "Trusted by",
      line2: "10,000+ Women",
    },
  ];

  const linkClass = cn(
    inkMuted,
    "block py-1 text-sm leading-relaxed transition-colors hover:text-[#B85C5C]"
  );

  const columnHeading = (titleCase?: boolean) =>
    cn(
      "text-xs font-bold tracking-[0.14em]",
      titleCase ? "normal-case" : "uppercase",
      headingInk
    );

  return (
    <footer className="relative z-10 bg-[#F9F4F0] text-left">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-16 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 gap-12 sm:gap-14 lg:grid-cols-12 lg:gap-10 xl:gap-12">
          {/* Brand */}
          <div className="lg:col-span-3">
            <Link href="/" className="inline-block">
              <Image
                src="/images/logo.png"
                alt="Leira Logo"
                width={160}
                height={52}
                className="h-11 w-auto object-contain object-left"
                loading="lazy"
              />
            </Link>
            <p className={cn("mt-4 max-w-xs text-sm leading-relaxed", inkMuted)}>
              Discover India&apos;s first essential oil-based feminine perfume designed for natural intimate care,
              long-lasting freshness, and romantic confidence.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              {socialLinks.map(({ icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className={cn(ink, "transition-opacity hover:opacity-70")}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <nav className="lg:col-span-2" aria-label="Quick links">
            <h4 className={columnHeading(true)}>Quick Links</h4>
            <ul className="mt-4 space-y-1">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Collection */}
          <nav className="lg:col-span-2" aria-label="Collection links">
            <h4 className={columnHeading()}>Collection</h4>
            <ul className="mt-4 space-y-1">
              {collectionLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Privacy & Terms */}
          <nav className="lg:col-span-2" aria-label="Privacy and terms links">
            <h4 className={columnHeading()}>Privacy &amp; Terms</h4>
            <ul className="mt-4 space-y-1">
              {privacyTermsLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Get in Touch */}
          <div className="lg:col-span-2">
            <h4 className={columnHeading()}>Get in Touch</h4>
            <div className="mt-4 space-y-3 text-sm leading-relaxed">
              <p className={inkMuted}>
                <span className={cn("font-semibold", headingInk)}>Address :</span>{" "}
                <span data-nosnippet>
                  AOMAN SERVICES PRIVATE LIMITED, Office No. 48, 7th Floor, ETT Tower 2, Sector -132, Noida UP-
                  201304
                </span>
              </p>
              <p className={inkMuted}>
                <span className={cn("font-semibold", headingInk)}>Phone :</span>{" "}
                <a href="tel:+919810822968" className="underline-offset-2 hover:text-[#B85C5C] hover:underline">
                  9810822968
                </a>
              </p>
              <p className={inkMuted}>
                <span className={cn("font-semibold", headingInk)}>Email :</span>{" "}
                <a
                  href="mailto:support@leiraindia.com"
                  className="underline-offset-2 hover:text-[#B85C5C] hover:underline"
                >
                  support@leiraindia.com
                </a>
              </p>
            </div>
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-3">
            <FooterNewsletter />
          </div>
        </div>

        <div className="mt-14 border-t border-[#D9CFC4]/90 pt-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <p className={cn("order-3 text-sm lg:order-1", inkMuted)}>
              Copyright © 2026 Leira | Powered by AOMAN SERVICES PRIVATE LIMITED
            </p>

            <p
              className={cn(
                "order-2 flex items-center justify-start gap-1.5 text-sm lg:order-2 lg:justify-center",
                inkMuted
              )}
            >
              Made with{" "}
              <Heart className="inline size-3.5 fill-[#B85C5C] text-[#B85C5C]" aria-hidden="true" /> in India.
            </p>

            <div className="order-1 grid w-full grid-cols-2 gap-6 sm:grid-cols-4 lg:order-3 lg:w-auto lg:max-w-2xl lg:gap-8">
              {trustItems.map((item) => (
                <div key={item.line1} className="flex gap-2.5 text-left">
                  <span className={ink} aria-hidden="true">
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <p className={cn("text-xs font-semibold leading-tight", headingInk)}>{item.line1}</p>
                    {item.line2 ? (
                      <p className={cn("mt-0.5 text-[11px] leading-tight", inkMuted)}>{item.line2}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
