"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MiniNavbar } from "@/components/ui/mini-navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import type { Ga4PurchaseLineItem } from "@/lib/analytics/google";
import ThankYouPixel from "./ThankYouPixel";

export default function ThankYouContent(props: {
  orderId?: string;
  orderNumber?: string;
  value: number;
  contentIds: string[];
  numItems: number;
  ga4Items: Ga4PurchaseLineItem[];
}) {
  const { orderId, orderNumber, value, contentIds, numItems, ga4Items } = props;

  return (
    <div className="min-h-screen bg-[#FAF9F6] leira-underlap-nav-spacer">
      <ThankYouPixel
        orderId={orderId}
        orderNumber={orderNumber}
        value={value}
        contentIds={contentIds}
        numItems={numItems}
        ga4Items={ga4Items}
      />

      <MiniNavbar />

      <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="rounded-3xl border border-pink-100 bg-white/95 p-6 shadow-[0_18px_45px_rgba(236,72,153,0.12)] md:p-10"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-600">Thank you</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 md:text-4xl">
            Your order is confirmed
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600 md:text-base">
            We’ve received your order and will start processing it right away.
          </p>

          {orderNumber && (
            <div className="mt-6 rounded-2xl border border-neutral-100 bg-neutral-50/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Order ID</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">{orderNumber}</p>
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link href="/profile?tab=track-order" className="w-full">
              <Button className="h-12 w-full rounded-full bg-neutral-900 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-neutral-800">
                Track your order
              </Button>
            </Link>
            <Link href="/shop" className="w-full">
              <Button
                variant="outline"
                className="h-12 w-full rounded-full border-neutral-200 text-xs font-semibold uppercase tracking-[0.12em]"
              >
                Continue shopping
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-xs text-neutral-500">
            Need help?{" "}
            <Link href="/contact" className="underline hover:text-neutral-900">
              Contact support
            </Link>
            .
          </p>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

