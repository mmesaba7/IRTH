"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import { products } from "../data/products";

export default function CheckoutPage() {
  const [cartItems, setCartItems] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cartLoaded, setCartLoaded] = useState(false);
  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem("irth-cart") || "[]");

    setCartItems(cart);

    const initialQuantities: Record<string, number> = {};

    cart.forEach((slug: string) => {
      initialQuantities[slug] = (initialQuantities[slug] || 0) + 1;
    });

    setQuantities(initialQuantities);
    setCartLoaded(true);
  }, []);

  const validateCheckout = () => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required.";
    }

    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required.";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = "Please enter a valid email.";
    }

    if (!phone.trim()) {
      newErrors.phone = "Phone number is required.";
    }

    if (!address.trim()) {
      newErrors.address = "Address is required.";
    }

    if (!city.trim()) {
      newErrors.city = "City is required.";
    }

    if (!country.trim()) {
      newErrors.country = "Country is required.";
    }

    if (!postalCode.trim()) {
      newErrors.postalCode = "Postal code is required.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const total = Object.entries(quantities).reduce(
    (sum, [slug, quantity]) => {
      const product = products[slug as keyof typeof products];

      return product ? sum + product.price * quantity : sum;
    },
    0
  );

  const handlePlaceOrder = () => {
  const isValid = validateCheckout();

  if (!isValid) {
    return;
  }

  const orderNumber = `IRTH-${Math.floor(
    100000 + Math.random() * 900000
  )}`;

  const order = {
    orderNumber,
    customer: {
      firstName,
      lastName,
      email,
      phone,
    },
    shipping: {
      address,
      city,
      country,
      postalCode,
    },
    items: cartItems,
    quantities,
    total,
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(
    "irth-last-order",
    JSON.stringify(order)
  );

  localStorage.removeItem("irth-cart");

  window.location.href = "/order-success";
};

  return (
  <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
    <Header />

    <section className="mx-auto max-w-[var(--container-max)] px-6 py-12 md:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
            Complete your order
          </p>

          <h1 className="mt-3 font-[var(--font-display)] text-5xl font-normal text-[var(--color-espresso)]">
            Checkout
          </h1>

          <p className="mt-5 text-base leading-7 text-[var(--text-secondary)]">
            Complete your details below to place your order.
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="space-y-8">

            {/* Contact information */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-olive)]">
                Contact information
              </p>

              <div className="mt-6 grid gap-5 md:grid-cols-2">

                {/* First name */}
                <div>
                  <label className="text-sm text-[var(--text-secondary)]">
                    First name
                  </label>

                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className={`mt-2 w-full rounded-[var(--radius-md)] border ${
                      errors.firstName
                        ? "border-red-500"
                        : "border-[var(--border-soft)]"
                    } bg-[var(--background)] px-4 py-3 outline-none focus:border-[var(--color-copper)]`}
                  />

                  {errors.firstName && (
                    <p className="mt-2 text-sm text-red-500">
                      {errors.firstName}
                    </p>
                  )}
                </div>

                {/* Last name */}
                <div>
                  <label className="text-sm text-[var(--text-secondary)]">
                    Last name
                  </label>

                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className={`mt-2 w-full rounded-[var(--radius-md)] border ${
                      errors.lastName
                        ? "border-red-500"
                        : "border-[var(--border-soft)]"
                    } bg-[var(--background)] px-4 py-3 outline-none focus:border-[var(--color-copper)]`}
                  />

                  {errors.lastName && (
                    <p className="mt-2 text-sm text-red-500">
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="mt-5">
                <label className="text-sm text-[var(--text-secondary)]">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`mt-2 w-full rounded-[var(--radius-md)] border ${
                    errors.email
                      ? "border-red-500"
                      : "border-[var(--border-soft)]"
                  } bg-[var(--background)] px-4 py-3 outline-none focus:border-[var(--color-copper)]`}
                />

                {errors.email && (
                  <p className="mt-2 text-sm text-red-500">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="mt-5">
                <label className="text-sm text-[var(--text-secondary)]">
                  Phone
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+20"
                  className={`mt-2 w-full rounded-[var(--radius-md)] border ${
                    errors.phone
                      ? "border-red-500"
                      : "border-[var(--border-soft)]"
                  } bg-[var(--background)] px-4 py-3 outline-none focus:border-[var(--color-copper)]`}
                />

                {errors.phone && (
                  <p className="mt-2 text-sm text-red-500">
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Shipping address */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-olive)]">
                Shipping address
              </p>

              {/* Address */}
              <div className="mt-6">
                <label className="text-sm text-[var(--text-secondary)]">
                  Address
                </label>

                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address"
                  className={`mt-2 w-full rounded-[var(--radius-md)] border ${
                    errors.address
                      ? "border-red-500"
                      : "border-[var(--border-soft)]"
                  } bg-[var(--background)] px-4 py-3 outline-none focus:border-[var(--color-copper)]`}
                />

                {errors.address && (
                  <p className="mt-2 text-sm text-red-500">
                    {errors.address}
                  </p>
                )}
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-3">

                {/* City */}
                <div>
                  <label className="text-sm text-[var(--text-secondary)]">
                    City
                  </label>

                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className={`mt-2 w-full rounded-[var(--radius-md)] border ${
                      errors.city
                        ? "border-red-500"
                        : "border-[var(--border-soft)]"
                    } bg-[var(--background)] px-4 py-3 outline-none focus:border-[var(--color-copper)]`}
                  />

                  {errors.city && (
                    <p className="mt-2 text-sm text-red-500">
                      {errors.city}
                    </p>
                  )}
                </div>

                {/* Country */}
                <div>
                  <label className="text-sm text-[var(--text-secondary)]">
                    Country
                  </label>

                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Country"
                    className={`mt-2 w-full rounded-[var(--radius-md)] border ${
                      errors.country
                        ? "border-red-500"
                        : "border-[var(--border-soft)]"
                    } bg-[var(--background)] px-4 py-3 outline-none focus:border-[var(--color-copper)]`}
                  />

                  {errors.country && (
                    <p className="mt-2 text-sm text-red-500">
                      {errors.country}
                    </p>
                  )}
                </div>

                {/* Postal code */}
                <div>
                  <label className="text-sm text-[var(--text-secondary)]">
                    Postal code
                  </label>

                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="Postal code"
                    className={`mt-2 w-full rounded-[var(--radius-md)] border ${
                      errors.postalCode
                        ? "border-red-500"
                        : "border-[var(--border-soft)]"
                    } bg-[var(--background)] px-4 py-3 outline-none focus:border-[var(--color-copper)]`}
                  />

                  {errors.postalCode && (
                    <p className="mt-2 text-sm text-red-500">
                      {errors.postalCode}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-olive)]">
                Payment
              </p>

              <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface-muted)] p-5">
                <p className="text-sm font-medium text-[var(--color-espresso)]">
                  Payment will be arranged securely.
                </p>

                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  This prototype does not process real payments yet.
                </p>
              </div>
            </div>
          </div>

          {/* Order summary */}
          <aside className="h-fit rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-7 lg:sticky lg:top-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-olive)]">
              Order summary
            </p>

            <div className="mt-6 space-y-5">
              {Object.entries(quantities).map(([slug, quantity]) => {
                const product =
                  products[slug as keyof typeof products];

                if (!product) return null;

                return (
                  <div
                    key={slug}
                    className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-5"
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
              })}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <span className="font-medium text-[var(--color-espresso)]">
                Total
              </span>

              <span className="text-2xl font-medium text-[var(--color-copper)]">
                ${total}
              </span>
            </div>

            <button
              type="button"
              onClick={handlePlaceOrder}
              className="mt-7 w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-medium text-[var(--color-ivory)] transition-colors hover:bg-[var(--color-copper)]"
            >
              Place order
            </button>

            <a
              href="/cart"
              className="mt-4 block text-center text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--color-copper)]"
            >
              ← Back to cart
            </a>
          </aside>
        </div>
      </section>
    </main>
  );
}