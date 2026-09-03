"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { LogOut, Search, ShoppingBag, User } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { ProfileDropdown } from '@/components/ui/profile-dropdown';
import { useCart } from '@/context/CartContext';
import { blogAPI } from '@/lib/api';

const EASE = [0.22, 1, 0.36, 1] as const;

/* Palette pulled from the hero: blush ground, plum headline, dusty rose hairline. */
const PLUM = '#7b2e45';
const INK = '#4a1c2e';
const MUTED = '#9a6274';
const HAIR = '#c9a2ae';

const ANNOUNCEMENTS = [
  'India’s first intimate perfume, made for your most sensitive skin',
  'Dermatologist tested, alcohol free, skin safe',
  'Free shipping over ₹1,499',
];

/** Display face — same serif voice as the hero headline. */
const DISPLAY = 'var(--font-display, "Cormorant Garamond", ui-serif, Georgia, serif)';

const EditorialNavLink = ({
  href,
  children,
  isActive,
}: {
  href: string;
  children: React.ReactNode;
  isActive: boolean;
}) => (
  <Link
    href={href}
    aria-current={isActive ? 'page' : undefined}
    className="group relative block whitespace-nowrap py-1 focus:outline-none"
  >
    <span
      style={{ fontFamily: DISPLAY }}
      className={`block text-[15px] leading-none tracking-[0.02em] transition-colors duration-300 ${
        isActive ? 'text-[#7b2e45]' : 'text-[#9a6274] group-hover:text-[#7b2e45]'
      }`}
    >
      {children}
    </span>

    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -bottom-1 h-px origin-right scale-x-0 bg-[#c9a2ae] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:origin-left group-hover:scale-x-100 motion-reduce:transition-none"
    />

    {isActive && (
      <motion.span
        layoutId="leira-nav-active"
        aria-hidden
        className="absolute inset-x-0 -bottom-1 h-px bg-[#7b2e45]"
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      />
    )}

    <span
      aria-hidden
      className="pointer-events-none absolute -inset-x-2 -inset-y-1.5 rounded ring-0 ring-[#7b2e45]/35 transition-shadow group-focus-visible:ring-2"
    />
  </Link>
);

type LoggedUser = { name?: string; email?: string; role?: string } | null;

function getStoredUser(): LoggedUser {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('token');
  const raw = localStorage.getItem('user');
  if (!token || !raw) return null;
  try {
    const user = JSON.parse(raw);
    return user?.role === 'admin' ? null : user;
  } catch {
    return null;
  }
}

/**
 * Transparent, in-flow header. It sits on top of the hero rather than floating
 * over the whole page, so the hero colour reads straight through it.
 *
 * `scrim` adds a barely-there wash behind the bar — turn it on for pages whose
 * first section is photography rather than a flat colour.
 */
export function MiniNavbar({ scrim = false }: { scrim?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<LoggedUser>(null);
  const [authReady, setAuthReady] = useState(false);
  const [showBlogsLink, setShowBlogsLink] = useState(false);
  const [noteIndex, setNoteIndex] = useState(0);

  const headerRef = useRef<HTMLElement | null>(null);
  const { items: cartItems } = useCart();
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  /* Publish the height for the mobile drawer only. The page no longer offsets
     itself — the header overlays the hero. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const el = headerRef.current;
    if (!el) return;
    const root = document.documentElement;
    const apply = () => {
      root.style.setProperty('--leira-nav-h', `${el.offsetHeight}px`);
      root.style.setProperty('--leira-mini-nav-h', '0px');
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(
      () => setNoteIndex((i) => (i + 1) % ANNOUNCEMENTS.length),
      5200,
    );
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  useEffect(() => {
    setUser(getStoredUser());
    setAuthReady(true);
    const onAuthChange = () => setUser(getStoredUser());
    window.addEventListener('userLoggedIn', onAuthChange);
    window.addEventListener('userLoggedOut', onAuthChange);
    return () => {
      window.removeEventListener('userLoggedIn', onAuthChange);
      window.removeEventListener('userLoggedOut', onAuthChange);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await blogAPI.getAll();
        if (!mounted) return;
        setShowBlogsLink(!!(res?.success && Array.isArray(res?.data) && res.data.length > 0));
      } catch {
        if (mounted) setShowBlogsLink(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (authReady) setUser(getStoredUser());
  }, [pathname, authReady]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = isOpen ? 'hidden' : prev || '';
    return () => {
      document.body.style.overflow = prev || '';
    };
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('userLoggedOut'));
  };

  const openCart = () => {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('leira:cart:open'));
  };

  const initial = user?.name
    ? user.name.trim().charAt(0).toUpperCase()
    : user?.email
      ? user.email.trim().charAt(0).toUpperCase()
      : '?';
  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'User';

  const navLinksData = useMemo(
    () => [
      { label: 'Home', href: '/' },
      { label: 'Shop', href: '/shop' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Collaboration', href: '/collaboration' },
      { label: 'Benefits', href: '/benefits' },
      ...(showBlogsLink ? [{ label: 'Blogs', href: '/blogs' }] : []),
    ],
    [showBlogsLink],
  );

  const isActiveHref = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href));

  const goToLogin = () => {
    setIsOpen(false);
    router.replace('/login');
  };

  const goToSignup = () => {
    setIsOpen(false);
    router.replace('/login?signup=1');
  };

  const iconBtn =
    'group relative flex h-9 w-9 items-center justify-center rounded-full text-[#7b2e45]/85 transition-colors duration-300 hover:text-[#4a1c2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7b2e45]/35';

  const IconHalo = () => (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 scale-50 rounded-full bg-white/55 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-100 group-hover:opacity-100 motion-reduce:transition-none"
    />
  );

  return (
    <>
      <motion.header
        ref={(node) => {
          headerRef.current = node;
        }}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="absolute inset-x-0 top-0 z-50 flex w-full flex-col bg-transparent"
      >
        {scrim && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -bottom-8 top-0 bg-gradient-to-b from-white/45 via-white/15 to-transparent"
          />
        )}

        {/* Announcement — a line of type, not a coloured band */}
        <div className="relative z-10 px-4 pt-3 sm:px-6">
          <div className="mx-auto h-4 max-w-[92%] text-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={noteIndex}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.45, ease: EASE }}
                className="truncate text-[11px] italic leading-4 tracking-[0.03em] text-[#9a6274]/85"
                style={{ fontFamily: DISPLAY }}
              >
                {ANNOUNCEMENTS[noteIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Links left, wordmark centre, icons right */}
        <div className="relative z-10 mx-auto grid w-full min-w-0 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3 sm:px-6 lg:px-10">
          {/* left */}
          <div className="flex min-w-0 items-center justify-start">
            <motion.button
              type="button"
              onClick={() => setIsOpen((v) => !v)}
              whileTap={{ scale: 0.94 }}
              className={`${iconBtn} -ml-1.5 xl:hidden`}
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isOpen}
            >
              <IconHalo />
              <span className="relative flex h-3.5 w-[19px] flex-col justify-center gap-[6px]">
                <motion.span
                  animate={isOpen ? { rotate: 45, y: 3.5 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="block h-px w-full origin-center rounded-full bg-current"
                />
                <motion.span
                  animate={isOpen ? { rotate: -45, y: -3.5 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="block h-px w-full origin-center rounded-full bg-current"
                />
              </span>
            </motion.button>

            <nav className="hidden min-w-0 items-center gap-x-6 xl:flex 2xl:gap-x-8">
              {navLinksData.map((link) => (
                <EditorialNavLink
                  key={link.href}
                  href={link.href}
                  isActive={isActiveHref(link.href)}
                >
                  {link.label}
                </EditorialNavLink>
              ))}
            </nav>
          </div>

          {/* centre — wordmark */}
          <div className="group relative z-20 flex shrink-0 items-center justify-center">
            <Link href="/" aria-label="Leira — home" className="relative block overflow-hidden">
              <Image
                src="/images/logo.png"
                alt="Leira"
                width={160}
                height={44}
                className="h-8 w-auto object-contain transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03] motion-reduce:transition-none sm:h-9"
                priority
                unoptimized
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -left-full w-1/2 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/70 to-transparent transition-[left] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:left-[150%] motion-reduce:hidden"
              />
            </Link>
          </div>

          {/* right */}
          <div className="flex min-w-0 items-center justify-end gap-1">
            <Link href="/shop" className={iconBtn} aria-label="Search the shop">
              <IconHalo />
              <Search className="relative h-[17px] w-[17px] stroke-[1.25] transition-transform duration-300 group-hover:scale-110" />
            </Link>

            {!authReady ? (
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-[#7b2e45]/10" aria-hidden />
            ) : user ? (
              <div className="flex items-center [&_button]:h-9 [&_button]:w-9 [&_button]:min-w-0 [&_button]:rounded-full [&_button]:border-[#c9a2ae]/50 [&_button]:bg-white/45 [&_button]:p-0 [&_button]:shadow-none [&_button]:backdrop-blur-sm">
                <ProfileDropdown
                  data={{ name: displayName, email: user.email || '', avatar: undefined }}
                  onLogout={handleLogout}
                />
              </div>
            ) : (
              <Link href="/login" className={iconBtn} aria-label="Log in">
                <IconHalo />
                <User className="relative h-[17px] w-[17px] stroke-[1.25] transition-transform duration-300 group-hover:-translate-y-px" />
              </Link>
            )}

            <button
              type="button"
              className={`${iconBtn} -mr-1.5`}
              onClick={openCart}
              aria-label="Open bag"
            >
              <IconHalo />
              <ShoppingBag className="relative h-[17px] w-[17px] stroke-[1.25] transition-transform duration-300 group-hover:-translate-y-px" />
              {cartCount > 0 && (
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    className="absolute right-0 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#7b2e45] px-1 text-[9px] font-semibold tabular-nums leading-none text-white"
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </motion.span>
                </AnimatePresence>
              )}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Menu — below xl */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-[#4a1c2e]/20 backdrop-blur-[2px] xl:hidden"
            />
            <motion.div
              key="drawer"
              initial={{ opacity: 0, y: -10, clipPath: 'inset(0 0 100% 0)' }}
              animate={{ opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' }}
              exit={{ opacity: 0, y: -10, clipPath: 'inset(0 0 100% 0)' }}
              transition={{ duration: 0.4, ease: EASE }}
              style={{ top: 'var(--leira-nav-h, 76px)' }}
              className="fixed inset-x-0 z-40 max-h-[calc(100vh-var(--leira-nav-h,76px))] overflow-y-auto border-b border-[#c9a2ae]/35 bg-[#fdeef0]/92 px-5 pb-8 pt-5 shadow-[0_28px_70px_-40px_rgba(74,28,46,0.55)] backdrop-blur-xl xl:hidden"
            >
              <nav className="flex flex-col">
                {navLinksData.map((link, index) => {
                  const isActive = isActiveHref(link.href);
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + index * 0.045, duration: 0.35, ease: EASE }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center justify-between border-b border-[#c9a2ae]/30 py-3.5 transition-colors ${
                          isActive ? 'text-[#7b2e45]' : 'text-[#9a6274]'
                        }`}
                      >
                        <span style={{ fontFamily: DISPLAY }} className="text-[22px] leading-none">
                          {link.label}
                        </span>
                        {isActive && (
                          <span aria-hidden className="h-1 w-1 rounded-full bg-[#7b2e45]" />
                        )}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.35, ease: EASE }}
                className="mt-7 flex flex-col gap-4"
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    openCart();
                  }}
                  className="flex items-center justify-between border-b border-[#c9a2ae]/30 pb-3.5 text-left"
                >
                  <span
                    style={{ fontFamily: DISPLAY }}
                    className="flex items-center gap-2.5 text-[18px] text-[#9a6274]"
                  >
                    <ShoppingBag className="h-4 w-4 stroke-[1.25]" />
                    Bag
                  </span>
                  <span className="text-[12px] text-[#7b2e45]">
                    {cartCount} {cartCount === 1 ? 'item' : 'items'}
                  </span>
                </button>

                {!authReady ? (
                  <div className="h-12 animate-pulse rounded-xl bg-white/50" aria-hidden />
                ) : user ? (
                  <div className="flex flex-col gap-3">
                    <Link
                      href="/profile"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 py-1"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#9a6274] to-[#4a1c2e] text-xs font-semibold text-white">
                        {initial}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-[#4a1c2e]">{displayName}</span>
                        <span className="block truncate text-[11px] text-[#9a6274]/80">
                          {user?.email}
                        </span>
                      </span>
                    </Link>

                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Profile', href: '/profile' },
                        { label: 'Wishlist', href: '/profile?tab=wishlist' },
                        { label: 'Orders', href: '/profile?tab=orders' },
                      ].map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className="rounded-full border border-[#c9a2ae]/50 px-4 py-1.5 text-[12px] text-[#9a6274] transition-colors hover:border-[#7b2e45] hover:text-[#7b2e45]"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleLogout();
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-2 py-1 text-[13px] text-[#9a6274] transition-colors hover:text-[#7b2e45]"
                    >
                      <LogOut className="h-3.5 w-3.5 stroke-[1.25]" /> Log out
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={goToSignup}
                      style={{ fontFamily: DISPLAY }}
                      className="rounded-full bg-[#7b2e45] px-6 py-3 text-[15px] tracking-[0.02em] text-[#fdeef0] transition-colors hover:bg-[#4a1c2e]"
                    >
                      Create account
                    </button>
                    <button
                      type="button"
                      onClick={goToLogin}
                      style={{ fontFamily: DISPLAY }}
                      className="rounded-full border border-[#c9a2ae]/60 px-6 py-3 text-[15px] tracking-[0.02em] text-[#7b2e45] transition-colors hover:border-[#7b2e45]"
                    >
                      Log in
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}