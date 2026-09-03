"use client";

import { useEffect, useRef, useState } from "react";

const products = [
  {
    id: 1,
    badge: "Bestseller",
    name: "Ylang Ylang",
    description: "A warm, sensual intimate fragrance.",
    price: "₹3,000",
    image: "/products/LEIRA-Bottle_Damask Rose_Brown.png",
    hoverImage: "/products/hover.jpg",
  },
  {
    id: 2,
    badge: "Bestseller",
    name: "Damask Rose",
    description:
      "A rich floral fragrance with a soft romantic finish.",
    price: "₹3,000",
    image: "/products/LEIRA-Bottle_Jasmine_White.png",
    hoverImage: "/products/hover3.webp",
  },
  {
    id: 3,
    badge: "Bestseller",
    name: "Jasmine",
    description:
      "A light, fresh and delicate intimate fragrance.",
    price: "₹3,000",
    image: "/products/LEIRA-Bottle_Damask-Rose_Black.png",
    hoverImage: "/products/hover2.jpg",
  },
];


// ============================================================
// SCROLL REVEAL CARD
// ============================================================

function RevealCard({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      {
        threshold: 0.15,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <article
      ref={ref}
      style={{
        transitionDelay: visible ? `${delay}ms` : "0ms",
      }}
      className={`
        transform
        transition-all
        duration-[900ms]
        ease-[cubic-bezier(0.22,1,0.36,1)]
        ${
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-20 opacity-0"
        }
      `}
    >
      {children}
    </article>
  );
}


// ============================================================
// PRODUCT SHOWCASE
// ============================================================

export default function ProductShowcase() {
  return (
    <section className="relative overflow-hidden bg-[#F8F5EF] px-5 py-20 sm:px-8 md:py-24 lg:px-12 lg:py-28">

      {/* ======================================================
          SUBTLE BACKGROUND DETAIL
      ====================================================== */}

      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#EEE7DC]/40 blur-3xl" />


      <div className="relative mx-auto max-w-[1500px]">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="mx-auto mb-16 max-w-3xl text-center md:mb-20">

          <div className="flex items-center justify-center gap-4">

            <span className="h-px w-8 bg-[#B39A70]" />

            <p className="text-[10px] font-medium uppercase tracking-[0.38em] text-[#967B4D]">
              The Leira Collection
            </p>

            <span className="h-px w-8 bg-[#B39A70]" />

          </div>


          <h2 className="mt-7 font-serif text-[2.5rem] font-normal leading-[1.08] tracking-[-0.025em] text-[#211E1A] sm:text-[3.2rem] md:text-[2rem] lg:text-[3rem]">
            Intimate care,
            <br />
            <span className="italic">
              beautifully considered.
            </span>
          </h2>


          <p className="mx-auto mt-7 max-w-xl text-[14px] leading-[1.9] tracking-[0.01em] text-[#777168] sm:text-[15px]">
            Infused with pure essential oils, each fragrance is thoughtfully
            created to keep you feeling fresh, confident and unstoppable.
          </p>

        </header>


        {/* ====================================================
            PRODUCTS
        ==================================================== */}

        <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">

          {products.map((product, index) => (

            <RevealCard
              key={product.id}
              delay={index * 250}
            >

              {/* ==================================================
                  CARD
              ================================================== */}

              <div
                className="
                  group
                  relative
                  overflow-hidden
                  border
                  border-[#DDD5C8]
                  bg-[#E9E2D7]
                  transition-all
                  duration-700
                  ease-out
                  hover:-translate-y-1
                  hover:shadow-[0_25px_70px_rgba(61,49,34,0.10)]
                "
              >

                {/* ================================================
                    IMAGE
                ================================================= */}

                <div className="relative aspect-[0.88] overflow-hidden sm:aspect-[0.86] lg:aspect-[0.9]">


                  {/* Product Number */}

                  <div className="absolute right-5 top-5 z-20">

                    <span className="font-serif text-[13px] tracking-[0.12em] text-[#665E52]/60">
                      0{product.id}
                    </span>

                  </div>


                  {/* Badge */}

                  <div className="absolute left-5 top-5 z-20">

                    <span
                      className="
                        inline-flex
                        items-center
                        rounded-full
                        border
                        border-[#7A2F32]/20
                        bg-[#7A2F32]
                        px-3.5
                        py-1.5
                        text-[9px]
                        font-medium
                        uppercase
                        tracking-[0.18em]
                        text-white
                      "
                    >
                      {product.badge}
                    </span>

                  </div>


                  {/* Soft Image Backdrop */}

                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#D8CFC1]/20" />


                  {/* ==============================================
                      DEFAULT PRODUCT IMAGE
                  =============================================== */}

                  <img
                    src={product.image}
                    alt={product.name}
                    className="
                      absolute
                      inset-0
                      h-full
                      w-full
                      object-contain
                      p-10
                      transition-all
                      duration-700
                      ease-out
                      sm:p-12
                      lg:p-10
                      group-hover:scale-[1.04]
                      group-hover:opacity-0
                    "
                  />


                  {/* ==============================================
                      HOVER IMAGE
                  =============================================== */}

                  <img
                    src={product.hoverImage}
                    alt={`${product.name} lifestyle`}
                    className="
                      absolute
                      inset-0
                      h-full
                      w-full
                      object-cover
                      opacity-0
                      scale-[1.04]
                      transition-all
                      duration-700
                      ease-out
                      group-hover:scale-100
                      group-hover:opacity-100
                    "
                  />


                  {/* Image Overlay */}

                  <div
                    className="
                      pointer-events-none
                      absolute
                      inset-0
                      bg-black/[0.03]
                      opacity-0
                      transition-opacity
                      duration-700
                      group-hover:opacity-100
                    "
                  />


                  {/* ==============================================
                      ADD TO CART
                  =============================================== */}

                  <div
                    className="
                      absolute
                      bottom-5
                      left-5
                      right-5
                      z-30
                      translate-y-4
                      opacity-0
                      transition-all
                      duration-500
                      ease-out
                      group-hover:translate-y-0
                      group-hover:opacity-100
                    "
                  >

                    <button
                      className="
                        flex
                        w-full
                        items-center
                        justify-center
                        gap-3
                        rounded-full
                        bg-white/95
                        px-6
                        py-3.5
                        text-[11px]
                        font-medium
                        uppercase
                        tracking-[0.18em]
                        text-[#211E1A]
                        shadow-[0_8px_30px_rgba(0,0,0,0.08)]
                        backdrop-blur-sm
                        transition-all
                        duration-300
                        hover:bg-[#211E1A]
                        hover:text-white
                      "
                    >

                      <span>
                        Add to Cart
                      </span>


                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M5 12h14" />
                        <path d="m13 6 6 6-6 6" />
                      </svg>

                    </button>

                  </div>

                </div>


                {/* ==================================================
                    PRODUCT DETAILS
                ================================================== */}

                <div className="relative bg-[#F1ECE4] px-6 pb-8 pt-7 text-center sm:px-8">

                  {/* Decorative Line */}

                  <div className="mx-auto mb-5 h-px w-7 bg-[#B39A70]" />


                  {/* Product Name */}

                  <h3
                    className="
                      font-serif
                      text-[27px]
                      font-normal
                      leading-none
                      tracking-[-0.015em]
                      text-[#201D19]
                      transition-colors
                      duration-300
                      group-hover:text-[#7A2F32]
                    "
                  >
                    {product.name}
                  </h3>


                  {/* Description */}

                  <p
                    className="
                      mx-auto
                      mt-4
                      max-w-[290px]
                      text-[13px]
                      leading-[1.7]
                      text-[#777168]
                    "
                  >
                    {product.description}
                  </p>


                  {/* Price */}

                  <div className="mt-5 flex items-center justify-center gap-3">

                    <span className="h-px w-5 bg-[#D0C6B7]" />

                    <p className="text-[13px] font-medium tracking-[0.08em] text-[#514B43]">
                      {product.price}
                    </p>

                    <span className="h-px w-5 bg-[#D0C6B7]" />

                  </div>

                </div>

              </div>

            </RevealCard>

          ))}

        </div>


        {/* ====================================================
            BOTTOM CTA
        ==================================================== */}

        <div className="mt-14 flex justify-center md:mt-16">

          <button
            className="
              group
              inline-flex
              items-center
              gap-4
              border-b
              border-[#84765F]
              pb-2
              text-[11px]
              font-medium
              uppercase
              tracking-[0.22em]
              text-[#4D473F]
              transition-all
              duration-300
              hover:gap-6
              hover:text-[#7A2F32]
            "
          >

            <span>
              Explore the collection
            </span>


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
