"use client";

import { useState } from "react";

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-[family-name:var(--font-cinzel)] text-3xl text-[color:var(--color-vault-gold)]">
        Contact
      </h1>
      <p className="mt-2 text-sm text-[color:var(--color-vault-parchment)]/80">
        Send a message through the vault door. We read every note.
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setStatus("idle");
          const fd = new FormData(e.currentTarget);
          const res = await fetch("/api/contact", {
            method: "POST",
            body: JSON.stringify({
              name: fd.get("name"),
              email: fd.get("email"),
              subject: fd.get("subject"),
              message: fd.get("message"),
            }),
            headers: { "Content-Type": "application/json" },
          });
          if (res.ok) {
            setStatus("ok");
            setMsg("Sent. We will get back to you.");
            e.currentTarget.reset();
          } else {
            setStatus("err");
            setMsg("Could not send. Try again later.");
          }
        }}
      >
        <label className="block text-sm">
          <span className="text-[color:var(--color-vault-parchment)]/70">Name</span>
          <input
            required
            name="name"
            className="mt-1 w-full rounded border border-[color:var(--color-vault-gold)]/30 bg-black px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[color:var(--color-vault-parchment)]/70">Email</span>
          <input
            required
            type="email"
            name="email"
            className="mt-1 w-full rounded border border-[color:var(--color-vault-gold)]/30 bg-black px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[color:var(--color-vault-parchment)]/70">Subject</span>
          <input
            required
            name="subject"
            className="mt-1 w-full rounded border border-[color:var(--color-vault-gold)]/30 bg-black px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[color:var(--color-vault-parchment)]/70">Message</span>
          <textarea
            required
            name="message"
            rows={5}
            className="mt-1 w-full rounded border border-[color:var(--color-vault-gold)]/30 bg-black px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded border border-[color:var(--color-vault-gold)]/50 bg-[color:var(--color-vault-crimson)]/85 py-3 text-sm font-semibold uppercase tracking-widest text-[color:var(--color-vault-parchment)] hover:bg-[color:var(--color-vault-crimson-bright)]/90"
        >
          Send
        </button>
      </form>

      {status !== "idle" ? (
        <p
          className={
            status === "ok"
              ? "mt-4 text-sm text-emerald-300"
              : "mt-4 text-sm text-red-300"
          }
        >
          {msg}
        </p>
      ) : null}
    </div>
  );
}
