"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  LABELS,
  LIMITS,
  PARTNERSHIP_TYPES,
  REQUIRED,
  SUCCESS_MESSAGE,
  emptyValues,
  newSubmissionId,
  submitEnquiry,
  validateEnquiry,
  type EnquiryType,
  type FieldErrors,
  type FieldName,
  type FormValues,
} from "@/lib/enquiry";

type Kind = "text" | "email" | "tel" | "select" | "textarea";
type FieldConfig = { name: FieldName; kind: Kind; autoComplete?: string; maxLength: number; rows?: number; half?: boolean; hint?: string };

/** Field order and input behaviour per enquiry type. Which fields exist / are required comes from src/lib/enquiry.ts. */
const LAYOUT: Record<EnquiryType, FieldConfig[]> = {
  membership: [
    { name: "fullName", kind: "text", autoComplete: "name", maxLength: LIMITS.fullName.max, half: true },
    { name: "email", kind: "email", autoComplete: "email", maxLength: LIMITS.email.max, half: true },
    { name: "phone", kind: "tel", autoComplete: "tel", maxLength: LIMITS.phone.rawMax, half: true },
    { name: "city", kind: "text", autoComplete: "address-level2", maxLength: LIMITS.city.max, half: true },
    { name: "organisation", kind: "text", autoComplete: "organization", maxLength: LIMITS.organisation.max },
    { name: "message", kind: "textarea", maxLength: LIMITS.message.max, rows: 5 },
  ],
  partnership: [
    { name: "fullName", kind: "text", autoComplete: "name", maxLength: LIMITS.fullName.max, half: true },
    { name: "organisation", kind: "text", autoComplete: "organization", maxLength: LIMITS.organisation.max, half: true },
    { name: "email", kind: "email", autoComplete: "email", maxLength: LIMITS.email.max, half: true },
    { name: "phone", kind: "tel", autoComplete: "tel", maxLength: LIMITS.phone.rawMax, half: true },
    { name: "partnershipType", kind: "select", maxLength: 50 },
    { name: "message", kind: "textarea", maxLength: LIMITS.message.max, rows: 6 },
  ],
  general: [
    { name: "fullName", kind: "text", autoComplete: "name", maxLength: LIMITS.fullName.max, half: true },
    { name: "email", kind: "email", autoComplete: "email", maxLength: LIMITS.email.max, half: true },
    { name: "phone", kind: "tel", autoComplete: "tel", maxLength: LIMITS.phone.rawMax },
    { name: "subject", kind: "text", maxLength: LIMITS.subject.max },
    { name: "message", kind: "textarea", maxLength: LIMITS.message.max, rows: 6 },
  ],
};

const control =
  "block w-full min-h-12 rounded-xl border bg-obsidian/50 px-4 py-3 text-base text-ivory placeholder:text-ivory/50 transition-colors duration-fast focus-visible:border-saffron disabled:cursor-not-allowed disabled:opacity-60";

type Status = "idle" | "submitting" | "success" | "error";

/**
 * One form for all three enquiry types. Submits to the Supabase Edge Function `submit-enquiry` (see src/lib/enquiry.ts).
 * Success is shown only after the server confirms the enquiry was stored. On failure the visitor's answers are kept.
 */
export function EnquiryForm({ type, className }: { type: EnquiryType; className?: string }) {
  const uid = useId();
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const inFlight = useRef(false); // synchronous guard: state updates are async, a fast double click is not
  const shownAt = useRef(0);
  const attempt = useRef<{ id: string; fingerprint: string } | null>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const labels = LABELS[type];
  const required = REQUIRED[type];
  const idFor = (name: FieldName) => `${uid}-${name}`;

  useEffect(() => {
    shownAt.current = Date.now();
  }, []);
  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  const setValue = useCallback(
    (name: FieldName, value: string) => {
      setValues((v) => ({ ...v, [name]: value }));
      // Once a field has been flagged, re-check it as the visitor fixes it
      if (errors[name]) {
        const next = validateEnquiry(type, { ...values, [name]: value });
        setErrors((e) => {
          const copy = { ...e };
          if (next[name]) copy[name] = next[name];
          else delete copy[name];
          return copy;
        });
      }
    },
    [errors, type, values],
  );

  const onBlur = (name: FieldName) => {
    const next = validateEnquiry(type, values);
    setErrors((e) => {
      const copy = { ...e };
      if (next[name]) copy[name] = next[name];
      else delete copy[name];
      return copy;
    });
  };

  const focusFirstError = (errs: FieldErrors) => {
    const first = LAYOUT[type].find((f) => errs[f.name]);
    if (first) document.getElementById(idFor(first.name))?.focus();
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current || status === "submitting") return; // duplicate submission guard

    const found = validateEnquiry(type, values);
    setErrors(found);
    if (Object.keys(found).length) {
      setFormError("");
      setStatus("idle");
      focusFirstError(found);
      return;
    }

    // One id per attempt. Re-using it for a retry of the *same* content means the server can safely ignore a repeat
    // (for example when the first request was stored but the response never arrived). Changed content gets a new id.
    const fingerprint = JSON.stringify([type, values]);
    if (!attempt.current || attempt.current.fingerprint !== fingerprint) attempt.current = { id: newSubmissionId(), fingerprint };

    inFlight.current = true;
    setStatus("submitting");
    setFormError("");
    try {
      const result = await submitEnquiry({
        type,
        values,
        clientSubmissionId: attempt.current.id,
        elapsedMs: Date.now() - shownAt.current,
        honeypot,
      });
      if (result.ok) {
        attempt.current = null;
        setValues(emptyValues());
        setErrors({});
        setStatus("success");
      } else {
        setStatus("error");
        setFormError(result.message);
        if (result.fieldErrors && Object.keys(result.fieldErrors).length) {
          setErrors(result.fieldErrors);
          focusFirstError(result.fieldErrors);
        }
      }
    } finally {
      inFlight.current = false;
    }
  }

  function sendAnother() {
    attempt.current = null;
    shownAt.current = Date.now();
    setStatus("idle");
    setFormError("");
  }

  if (status === "success") {
    return (
      <div ref={successRef} tabIndex={-1} role="status" className={cn("flex flex-col items-start gap-5 outline-none", className)}>
        <CircleCheck aria-hidden className="size-10 text-saffron" />
        <p className="max-w-prose text-lg leading-relaxed text-ivory">{SUCCESS_MESSAGE}</p>
        <button type="button" onClick={sendAnother} className={buttonClasses("secondary")}>
          Send another enquiry
        </button>
      </div>
    );
  }

  const submitting = status === "submitting";

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={submitting} className={className}>
      <p className="text-sm text-ivory/78">
        Fields marked <span aria-hidden className="text-saffron">*</span>
        <span className="sr-only">with an asterisk</span> are required.
      </p>

      <div className="mt-6 grid gap-x-6 gap-y-6 sm:grid-cols-2">
        {LAYOUT[type].map((f) => {
          const id = idFor(f.name);
          const err = errors[f.name];
          const isRequired = required.includes(f.name);
          const describedBy = [err ? `${id}-error` : "", f.kind === "textarea" ? `${id}-count` : ""].filter(Boolean).join(" ") || undefined;
          const common = {
            id,
            name: f.name,
            value: values[f.name],
            disabled: submitting,
            required: isRequired,
            "aria-required": isRequired,
            "aria-invalid": err ? true : undefined,
            "aria-describedby": describedBy,
            onBlur: () => onBlur(f.name),
            className: cn(control, err ? "border-error" : "border-gold/40 hover:border-gold/70"),
          } as const;

          return (
            <div key={f.name} className={cn(!f.half && "sm:col-span-2")}>
              <label htmlFor={id} className="mb-2 block text-sm font-semibold text-ivory/90">
                {labels[f.name]}
                {isRequired ? (
                  <>
                    <span aria-hidden className="ml-0.5 text-saffron">*</span>
                    <span className="sr-only"> (required)</span>
                  </>
                ) : (
                  <span className="ml-1.5 text-xs font-normal text-ivory/70">(optional)</span>
                )}
              </label>

              {f.kind === "textarea" ? (
                <textarea
                  {...common}
                  rows={f.rows}
                  maxLength={f.maxLength}
                  onChange={(e) => setValue(f.name, e.target.value)}
                  className={cn(common.className, "resize-y")}
                />
              ) : f.kind === "select" ? (
                <select {...common} onChange={(e) => setValue(f.name, e.target.value)}>
                  <option value="">Select a partnership type</option>
                  {PARTNERSHIP_TYPES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  {...common}
                  type={f.kind}
                  inputMode={f.kind === "tel" ? "tel" : f.kind === "email" ? "email" : undefined}
                  autoComplete={f.autoComplete}
                  maxLength={f.maxLength}
                  onChange={(e) => setValue(f.name, e.target.value)}
                />
              )}

              {f.kind === "textarea" && (
                <p id={`${id}-count`} className="mt-1.5 text-right text-xs text-ivory/70">
                  {values[f.name].length} / {f.maxLength}
                </p>
              )}
              {err && (
                <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm text-error">
                  <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <span>{err}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Honeypot: invisible to people (and to assistive tech), tempting to bots. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Leave this field empty
          <input type="text" name="company_url_confirm" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
        </label>
      </div>

      <div aria-live="polite" className="mt-6 empty:hidden">
        {status === "error" && formError && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-error/60 p-4 text-sm text-ivory">
            <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-error" />
            <p>{formError}</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={submitting} className={cn(buttonClasses("primary"), "disabled:cursor-not-allowed disabled:opacity-70")}>
          {submitting ? (
            <>
              <LoaderCircle aria-hidden className="size-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Submit enquiry"
          )}
        </button>
        <p className="max-w-sm text-xs text-ivory/70">We use these details only to respond to your enquiry.</p>
      </div>
    </form>
  );
}
