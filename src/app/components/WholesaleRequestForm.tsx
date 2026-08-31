"use client";

import { FormEvent, useState } from "react";

type Props = {
  sourceType: "general" | "product";
  productId?: string | null;
  initialRequest?: string;
};

export default function WholesaleRequestForm({ sourceType, productId = null, initialRequest = "" }: Props) {
  const [requesterName, setRequesterName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [countryName, setCountryName] = useState("");
  const [contactDetails, setContactDetails] = useState("");
  const [requestedProductOrCraft, setRequestedProductOrCraft] = useState(initialRequest);
  const [quantity, setQuantity] = useState("1");
  const [destination, setDestination] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/wholesale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          productId,
          craftId: null,
          requesterName,
          companyName,
          countryName,
          contactDetails,
          requestedProductOrCraft,
          quantity: Number(quantity),
          destination,
          notes,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Unable to submit wholesale request.");
      setSuccess("تم استلام طلب الجملة لدى IRTH. بيانات التواصل تظل لدى IRTH ولا تُرسل للحرفي مباشرة.");
      setRequesterName("");
      setCompanyName("");
      setCountryName("");
      setContactDetails("");
      setQuantity("1");
      setDestination("");
      setNotes("");
      if (sourceType === "general") setRequestedProductOrCraft("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit wholesale request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 md:p-8">
      {success && <div className="rounded-[var(--radius-md)] bg-green-50 p-4 text-sm leading-6 text-green-700">{success}</div>}
      {error && <div className="rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="الاسم / Name" value={requesterName} onChange={setRequesterName} required />
        <Field label="الشركة / Company (optional)" value={companyName} onChange={setCompanyName} />
        <Field label="الدولة / Country" value={countryName} onChange={setCountryName} required />
        <Field label="بيانات التواصل / Contact details" value={contactDetails} onChange={setContactDetails} required />
      </div>

      <Field label="المنتج أو الحرفة المطلوبة / Product or craft" value={requestedProductOrCraft} onChange={setRequestedProductOrCraft} required readOnly={sourceType === "product"} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">الكمية / Quantity</label>
          <input type="number" min={1} step={1} required value={quantity} onChange={(event) => setQuantity(event.target.value)} className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]" />
        </div>
        <Field label="الوجهة / Destination (optional)" value={destination} onChange={setDestination} />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">ملاحظات / Notes (optional)</label>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={4000} rows={5} className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]" />
      </div>

      <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4 text-xs leading-6 text-[var(--text-secondary)]">
        الطلب يصل إلى <strong>IRTH فقط</strong>. بيانات التواصل لا تظهر للحرفي ولا تُستخدم لفتح تواصل مباشر بين العميل والحرفي.
      </div>

      <button disabled={saving} className="w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-medium text-[var(--color-ivory)] hover:bg-[var(--color-copper)] disabled:opacity-50">
        {saving ? "جاري الإرسال..." : "إرسال طلب الجملة إلى IRTH"}
      </button>
    </form>
  );
}

function Field({ label, value, onChange, required = false, readOnly = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; readOnly?: boolean }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} required={required} readOnly={readOnly} className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)] read-only:bg-[var(--surface-muted)]" />
    </div>
  );
}
