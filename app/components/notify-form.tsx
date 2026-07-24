"use client";

import Image from "next/image";
import Script from "next/script";
import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileRenderOptions = {
  sitekey: string;
  appearance?: "always" | "execute" | "interaction-only";
  theme?: "light" | "dark" | "auto";
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
  "timeout-callback"?: () => void;
};

type TurnstileApi = {
  render: (
    container: HTMLElement | string,
    options: TurnstileRenderOptions,
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
  getResponse: (widgetId?: string) => string;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function waitForTurnstileToken(
  getToken: () => string | null,
  timeoutMs = 8000,
) {
  const existing = getToken();
  if (existing) return Promise.resolve(existing);

  return new Promise<string | null>((resolve) => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      const token = getToken();
      if (token) {
        window.clearInterval(timer);
        resolve(token);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(timer);
        resolve(null);
      }
    }, 100);
  });
}

type ModalStatus = "loading" | "success" | "error";

export function NotifyForm() {
  const [inlineMessage, setInlineMessage] = useState("");
  const [isInlineError, setIsInlineError] = useState(false);
  const [isInlineVisible, setIsInlineVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalStatus, setModalStatus] = useState<ModalStatus>("loading");
  const [modalMessage, setModalMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (window.turnstile) setScriptReady(true);
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!scriptReady || !TURNSTILE_SITE_KEY || !turnstileContainerRef.current) {
      return;
    }
    if (!window.turnstile || widgetIdRef.current) return;

    const widgetId = window.turnstile.render(turnstileContainerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      appearance: "interaction-only",
      theme: "light",
      callback: (token) => {
        tokenRef.current = token;
      },
      "expired-callback": () => {
        tokenRef.current = null;
      },
      "error-callback": () => {
        tokenRef.current = null;
      },
      "timeout-callback": () => {
        tokenRef.current = null;
      },
    });
    widgetIdRef.current = widgetId;

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
      tokenRef.current = null;
    };
  }, [scriptReady]);

  useEffect(() => {
    if (!modalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => setModalVisible(true));

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen || modalStatus === "loading") return;
    closeButtonRef.current?.focus();
  }, [modalOpen, modalStatus]);

  useEffect(() => {
    if (!modalOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || modalStatus !== "success") return;
      setModalVisible(false);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = setTimeout(() => {
        setModalOpen(false);
        closeTimerRef.current = null;
      }, 280);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, modalStatus]);

  function resetTurnstile() {
    tokenRef.current = null;
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }

  function showInlineMessage(text: string, error: boolean) {
    setInlineMessage(text);
    setIsInlineError(error);
    setIsInlineVisible(true);
  }

  function openModal(status: ModalStatus, message: string) {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setModalStatus(status);
    setModalMessage(message);
    setModalOpen(true);
  }

  function closeModal() {
    if (modalStatus !== "success" && modalStatus !== "error") return;
    setModalVisible(false);
    closeTimerRef.current = setTimeout(() => {
      setModalOpen(false);
      closeTimerRef.current = null;
    }, 280);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("email") as HTMLInputElement;
    const email = input.value.trim();

    if (!email) {
      showInlineMessage("Please enter your email address.", true);
      input.focus();
      return;
    }

    if (!isValidEmail(email)) {
      showInlineMessage("Please enter a valid email address.", true);
      input.focus();
      return;
    }

    if (!TURNSTILE_SITE_KEY) {
      showInlineMessage("Security check is not configured.", true);
      return;
    }

    setIsInlineVisible(false);
    setIsSubmitting(true);
    openModal("loading", "Joining the list…");

    const honeypot = form.elements.namedItem("website") as HTMLInputElement | null;
    const website = honeypot?.value ?? "";

    try {
      const turnstileToken = await waitForTurnstileToken(
        () =>
          tokenRef.current ||
          (widgetIdRef.current && window.turnstile
            ? window.turnstile.getResponse(widgetIdRef.current) || null
            : null),
      );

      if (!turnstileToken) {
        setModalStatus("error");
        setModalMessage("Security check incomplete. Please try again.");
        resetTurnstile();
        return;
      }

      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken, website }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setModalStatus("error");
        setModalMessage(
          data.error || "Something went wrong. Please try again.",
        );
        resetTurnstile();
        return;
      }

      setModalStatus("success");
      setModalMessage("You will be the first to know.");
      form.reset();
      resetTurnstile();
    } catch {
      setModalStatus("error");
      setModalMessage("Something went wrong. Please try again.");
      resetTurnstile();
    } finally {
      setIsSubmitting(false);
    }
  }

  const modal =
    mounted &&
    modalOpen &&
    createPortal(
      <div
        className={`notify-modal-overlay${modalVisible ? " is-visible" : ""}`}
      >
        <div
          className={`notify-modal${modalVisible ? " is-visible" : ""} status-${modalStatus}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="notify-modal-glow" aria-hidden="true" />

          <div className="notify-modal-icon" aria-hidden="true">
            {modalStatus === "loading" && (
              <span className="notify-modal-spinner">
                <span className="notify-modal-spinner-ring" />
                <Image
                  src="/images/icons/lotus-icon-colored.png"
                  alt=""
                  width={28}
                  height={28}
                  className="notify-modal-lotus"
                />
              </span>
            )}
            {modalStatus === "success" && (
              <span className="notify-modal-mark notify-modal-mark-success">
                <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
                  <circle className="mark-circle" cx="24" cy="24" r="22" />
                  <path
                    className="mark-check"
                    d="M14 24.5L21 31.5L34 17"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            )}
            {modalStatus === "error" && (
              <span className="notify-modal-mark notify-modal-mark-error">
                <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
                  <circle className="mark-circle" cx="24" cy="24" r="22" />
                  <path
                    className="mark-x"
                    d="M17 17L31 31M31 17L17 31"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            )}
          </div>

          <p className="notify-modal-eyebrow">
            {modalStatus === "loading"
              ? "PLEASE WAIT"
              : modalStatus === "success"
                ? "YOU'RE IN"
                : "NOT QUITE"}
          </p>
          <h3 id={titleId} className="notify-modal-title">
            {modalMessage}
          </h3>
          <p className="notify-modal-copy">
            {modalStatus === "loading"
              ? "Securing your place on the list."
              : modalStatus === "success"
                ? "We'll notify you the moment we open."
                : "Please try again in a moment."}
          </p>

          {modalStatus !== "loading" && (
            <button
              ref={closeButtonRef}
              type="button"
              className="notify-modal-close"
              onClick={closeModal}
            >
              {modalStatus === "success" ? "Continue" : "Try again"}
            </button>
          )}
        </div>
      </div>,
      document.body,
    );

  return (
    <section className="notify reveal">
      <Script
        src={TURNSTILE_SCRIPT_SRC}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onReady={() => {
          if (window.turnstile) setScriptReady(true);
        }}
      />
      <p className="notify-label">BE THE FIRST TO KNOW</p>
      <form onSubmit={handleSubmit} noValidate>
        <div className="notify-form">
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Enter your email address"
            autoComplete="email"
            required
            aria-label="Email address"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            className="notify-btn"
            aria-label="Subscribe"
            disabled={isSubmitting}
          >
            <Image
              src="/images/icons/arrow-right-white.png"
              alt=""
              width={16}
              height={16}
            />
          </button>
        </div>
        <input
          name="website"
          className="notify-honeypot"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
      </form>
      <div ref={turnstileContainerRef} className="notify-turnstile" />
      <p
        className={`notify-message${isInlineVisible ? " is-visible" : ""}${isInlineError ? " is-error" : ""}`}
        role="status"
        aria-live="polite"
      >
        {inlineMessage}
      </p>
      {modal}
    </section>
  );
}
