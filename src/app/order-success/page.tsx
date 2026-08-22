"use client";

import { useEffect, useState } from "react";
import { products } from "../data/products";
type Order = {
  orderNumber: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  shipping: {
    address: string;
    city: string;
    country: string;
    postalCode: string;
  };
  items: string[];
  quantities: Record<string, number>;
  total: number;
  createdAt: string;
};

export default function OrderSuccessPage() {
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    const savedOrder = localStorage.getItem("irth-last-order");

    if (!savedOrder) {
      return;
    }

    try {
      const parsedOrder = JSON.parse(savedOrder);
      setOrder(parsedOrder);
    } catch {
      setOrder(null);
    }
  }, []);

  if (!order) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
        <header className="border-b border-[var(--border-soft)] bg-[var(--background)]">
          <div className="mx-auto max-w-[var(--container-max)] px-6 py-5">
            <a
              href="/"
              className="font-[var(--font-display)] text-2xl tracking-[0.08em] text-[var(--color-espresso)]"
            >
              IRTH
            </a>
          </div>
        </header>

        <section className="mx-auto max-w-3xl px-6 py-20 text-center md:py-28">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-muted)] text-2xl text-[var(--color-copper)]">
            —
          </div>

          <p className="mt-8 text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
            Order information
          </p>

          <h1 className="mt-4 font-[var(--font-display)] text-4xl font-normal text-[var(--color-espresso)] md:text-5xl">
            No order found
          </h1>

          <p className="mx-auto mt-5 max-w-md text-base leading-7 text-[var(--text-secondary)]">
            We could not find a recent order on this device.
          </p>

          <a
            href="/"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-7 py-3 text-sm font-medium text-[var(--color-ivory)] transition-colors hover:bg-[var(--color-copper)]"
          >
            Continue shopping
          </a>
        </section>
      </main>
    );
  }

  const orderDate = new Date(order.createdAt).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-soft)] bg-[var(--background)]">
        <div className="mx-auto max-w-[var(--container-max)] px-6 py-5">
          <a
            href="/"
            className="font-[var(--font-display)] text-2xl tracking-[0.08em] text-[var(--color-espresso)]"
          >
            IRTH
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-16 md:py-24">
        {/* Confirmation */}
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-olive)] text-4xl text-[var(--color-ivory)] shadow-[var(--shadow-soft)]">
            ✓
          </div>

          <p className="mt-8 text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
            Order confirmed
          </p>

          <h1 className="mt-4 font-[var(--font-display)] text-4xl font-normal leading-tight text-[var(--color-espresso)] md:text-6xl">
            Thank you, {order.customer.firstName}.
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[var(--text-secondary)] md:text-lg">
            Your order has been received successfully. We’ll be in touch with
            you regarding the next steps.
          </p>
        </div>

        {/* Order meta */}
        <div className="mt-10 grid overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] sm:grid-cols-3">
          <div className="p-6 text-center sm:border-r sm:border-[var(--border-soft)]">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-olive)]">
              Order number
            </p>

            <p className="mt-3 font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
              {order.orderNumber}
            </p>
          </div>

          <div className="border-t border-[var(--border-soft)] p-6 text-center sm:border-t-0 sm:border-r">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-olive)]">
              Date
            </p>

            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              {orderDate}
            </p>
          </div>

          <div className="border-t border-[var(--border-soft)] p-6 text-center sm:border-t-0">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-olive)]">
              Total
            </p>

            <p className="mt-3 text-xl font-medium text-[var(--color-copper)]">
              ${order.total}
            </p>
          </div>
        </div>

        {/* Customer + Shipping */}
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-olive)]">
              Customer
            </p>

            <p className="mt-4 font-[var(--font-display)] text-xl text-[var(--color-espresso)]">
              {order.customer.firstName} {order.customer.lastName}
            </p>

            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {order.customer.email}
            </p>

            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {order.customer.phone}
            </p>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-olive)]">
              Shipping address
            </p>

            <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">
              {order.shipping.address}
              <br />
              {order.shipping.city}
              <br />
              {order.shipping.country}
              <br />
              {order.shipping.postalCode}
            </p>
          </div>
        </div>

        {/* Items */}
        <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-olive)]">
            Your items
          </p>

          <div className="mt-6 space-y-5">
            {Object.entries(order.quantities).map(
              ([slug, quantity]) => {
                const product =
                  products[slug as keyof typeof products];

                if (!product) {
                  return null;
                }

                return (
                  <div
                    key={slug}
                    className="flex items-start justify-between gap-5 border-b border-[var(--border-soft)] pb-5 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p className="font-[var(--font-display)] text-lg text-[var(--color-espresso)]">
                        {product.name}
                      </p>

                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        By {product.artisan}
                      </p>

                      <p className="mt-2 text-xs text-[var(--text-muted)]">
                        Quantity: {quantity}
                      </p>
                    </div>

                    <p className="shrink-0 font-medium text-[var(--color-copper)]">
                      ${product.price * quantity}
                    </p>
                  </div>
                );
              }
            )}
          </div>

          <div className="mt-7 flex items-center justify-between border-t border-[var(--border-soft)] pt-6">
            <span className="font-medium text-[var(--color-espresso)]">
              Total
            </span>

            <span className="text-2xl font-medium text-[var(--color-copper)]">
              ${order.total}
            </span>
          </div>
        </div>

        {/* Payment note */}
        <div className="mt-8 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-olive)]">
            Payment
          </p>

          <p className="mt-4 text-sm font-medium text-[var(--color-espresso)]">
            Payment will be arranged securely.
          </p>

          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Our team will contact you with the next steps for completing your
            payment and fulfilling your order.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-10 flex justify-center">
          <a
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-8 py-3 text-sm font-medium text-[var(--color-ivory)] transition-colors hover:bg-[var(--color-copper)]"
          >
            Continue shopping
          </a>
        </div>
      </section>
    </main>
  );
}

