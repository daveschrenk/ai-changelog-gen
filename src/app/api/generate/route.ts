import { NextRequest, NextResponse } from "next/server";
import { generateChangelog } from "@/lib/llm";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * POST /api/generate
 *
 * See API.md for full documentation.
 */

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function buildMarkdown(
  sections: Record<string, string[]>,
  summary: string,
  version: string,
  repoName?: string
): string {
  const date = new Date().toISOString().split("T")[0];
  const header = repoName
    ? `# ${repoName} — ${version} (${date})`
    : `# Changelog — ${version} (${date})`;

  const lines: string[] = [header, "", `> ${summary}`, ""];

  const sectionMap: [string, string][] = [
    ["breakingChanges", "⚠️ Breaking Changes"],
    ["features", "✨ Features"],
    ["bugFixes", "🐛 Bug Fixes"],
    ["other", "🔧 Other Changes"],
  ];

  for (const [key, label] of sectionMap) {
    const entries = sections[key] ?? [];
    if (entries.length === 0) continue;
    lines.push(`## ${label}`, "");
    for (const entry of entries) {
      lines.push(`- ${entry}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be JSON" },
        { status: 400 }
      );
    }

    const { gitLog, version = "Unreleased", repoName } = body;

    // --- Validation ---
    if (!gitLog || typeof gitLog !== "string" || gitLog.trim().length === 0) {
      return NextResponse.json(
        { error: "gitLog is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (gitLog.length > 50000) {
      return NextResponse.json(
        { error: "gitLog too large. Maximum 50,000 characters." },
        { status: 400 }
      );
    }

    // --- Rate limit check (skip for paid users) ---
    const isPaid = req.headers.get("x-paid-user") === "true"; // TODO: Stripe session validation
    let rateLimitHeaders: Record<string, string> = {};

    if (!isPaid) {
      const ip = getClientIp(req);
      const { allowed, remaining, limit } = await checkRateLimit(ip);
      rateLimitHeaders = {
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
      };

      if (!allowed) {
        return NextResponse.json(
          {
            error: "Free tier limit reached (5/month). Upgrade to continue.",
            upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
          },
          { status: 429, headers: rateLimitHeaders }
        );
      }
    }

    // --- LLM call ---
    let llmResult;
    try {
      llmResult = await generateChangelog(gitLog);
    } catch (err) {
      const message = err instanceof Error ? err.message : "LLM call failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const { sections, summary, mock } = llmResult;
    const changelog = buildMarkdown(sections, summary, version, repoName);

    return NextResponse.json(
      {
        changelog,
        sections,
        version,
        generatedAt: new Date().toISOString(),
        ...(mock ? { mock: true } : {}),
      },
      { headers: rateLimitHeaders }
    );
  } catch (err) {
    console.error("/api/generate error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
