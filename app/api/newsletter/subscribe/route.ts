import { NextResponse } from "next/server";
import { isIP } from "node:net";
import { getPool, hasDatabaseUrl } from "@/lib/db";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || undefined;
  }
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    undefined
  );
}

async function verifyTurnstileToken(token: string, ip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { ok: false as const, error: "Verification is not configured." };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (ip) body.set("remoteip", ip);

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    return { ok: false as const, error: "Verification failed. Please try again." };
  }

  const result = (await response.json()) as TurnstileVerifyResponse;
  if (!result.success) {
    return {
      ok: false as const,
      error: "Security check failed. Please try again.",
    };
  }

  return { ok: true as const };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email =
      typeof body?.email === "string" ? body.email.trim() : "";
    const turnstileToken =
      typeof body?.turnstileToken === "string" ? body.turnstileToken.trim() : "";
    const website =
      typeof body?.website === "string" ? body.website.trim() : "";

    // Honeypot filled → treat as bot; pretend success without writing.
    if (website) {
      return NextResponse.json({ success: true });
    }

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required." },
        { status: 400 },
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    if (!turnstileToken) {
      return NextResponse.json(
        { success: false, error: "Security check required. Please try again." },
        { status: 400 },
      );
    }

    const verification = await verifyTurnstileToken(
      turnstileToken,
      getClientIp(request),
    );

    if (!verification.ok) {
      return NextResponse.json(
        { success: false, error: verification.error },
        { status: 403 },
      );
    }

    if (!hasDatabaseUrl()) {
      return NextResponse.json(
        { success: false, error: "Newsletter service is not configured." },
        { status: 500 },
      );
    }

    // Duplicate emails (case-insensitive) are treated as success so the
    // form never reveals whether an address is already subscribed.
    const ip = getClientIp(request);
    await getPool().query(
      `INSERT INTO newsletter_subscribers (email, source, client_ip, user_agent)
       VALUES ($1, 'Website', $2::inet, $3)
       ON CONFLICT (lower(btrim(email))) DO NOTHING`,
      [
        email,
        ip && isIP(ip) ? ip : null,
        request.headers.get("user-agent")?.slice(0, 500) ?? null,
      ],
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
