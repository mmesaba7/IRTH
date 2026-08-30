import "server-only";

export type CheckoutCustomer = {
  recipientName: string;
  email: string;
  phone: string;
  countryCode: string;
  administrativeArea: string;
  city: string;
  addressLine1: string;
  deliveryNotes: string;
};

export type CheckoutFieldErrors = Partial<Record<keyof CheckoutCustomer, string>>;

const EGYPT_ADMINISTRATIVE_AREAS = new Set([
  "Alexandria",
  "Aswan",
  "Asyut",
  "Beheira",
  "Beni Suef",
  "Cairo",
  "Dakahlia",
  "Damietta",
  "Faiyum",
  "Gharbia",
  "Giza",
  "Ismailia",
  "Kafr El Sheikh",
  "Luxor",
  "Matrouh",
  "Minya",
  "Monufia",
  "New Valley",
  "North Sinai",
  "Port Said",
  "Qalyubia",
  "Qena",
  "Red Sea",
  "Sharqia",
  "Sohag",
  "South Sinai",
  "Suez",
]);

function readString(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(value: string) {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return `${hasPlus ? "+" : ""}${digits}`;
}

export function validateCheckoutCustomer(
  rawCustomer: unknown,
  marketCountryCode: string
): { customer: CheckoutCustomer | null; errors: CheckoutFieldErrors } {
  if (typeof rawCustomer !== "object" || rawCustomer === null) {
    return { customer: null, errors: { recipientName: "Customer details are required." } };
  }

  const source = rawCustomer as Record<string, unknown>;
  const customer: CheckoutCustomer = {
    recipientName: readString(source, "recipientName"),
    email: readString(source, "email").toLowerCase(),
    phone: normalizePhone(readString(source, "phone")),
    countryCode: readString(source, "countryCode").toUpperCase(),
    administrativeArea: readString(source, "administrativeArea"),
    city: readString(source, "city"),
    addressLine1: readString(source, "addressLine1"),
    deliveryNotes: readString(source, "deliveryNotes"),
  };

  const errors: CheckoutFieldErrors = {};

  if (customer.recipientName.length < 2 || customer.recipientName.length > 120) {
    errors.recipientName = "Enter the recipient full name.";
  }

  if (
    customer.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)
  ) {
    errors.email = "Enter a valid email address.";
  }

  const phoneDigits = customer.phone.replace(/\D/g, "");
  if (phoneDigits.length < 8 || phoneDigits.length > 15) {
    errors.phone = "Enter a valid phone number.";
  }

  if (customer.countryCode !== marketCountryCode) {
    errors.countryCode = "Delivery country must match the selected market.";
  }

  if (
    customer.administrativeArea.length < 2 ||
    customer.administrativeArea.length > 120
  ) {
    errors.administrativeArea = "Select or enter a valid administrative area.";
  } else if (
    marketCountryCode === "EG" &&
    !EGYPT_ADMINISTRATIVE_AREAS.has(customer.administrativeArea)
  ) {
    errors.administrativeArea = "Select a valid Egyptian governorate.";
  }

  if (customer.city.length < 2 || customer.city.length > 120) {
    errors.city = "Enter a valid city.";
  }

  if (customer.addressLine1.length < 5 || customer.addressLine1.length > 240) {
    errors.addressLine1 = "Enter a complete delivery address.";
  }

  if (customer.deliveryNotes.length > 500) {
    errors.deliveryNotes = "Delivery notes must be 500 characters or fewer.";
  }

  return {
    customer: Object.keys(errors).length === 0 ? customer : null,
    errors,
  };
}
