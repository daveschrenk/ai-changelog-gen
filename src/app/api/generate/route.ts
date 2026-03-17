import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * POST /api/generate
 *
 * Request body:
 * {
 *   gitLog: string;        // Raw git log output (required)
 *   version?: string;      // Version tag for the release (optional, e.g. "v1.2.0")
 *   repoName?: string;     // Repo name for the header (optional)
 * }
 *
 * Response (200):
 * {
 *   changelog: string;     // Markdown-formatted changelog
 *   sections: {
 *     features: string[];
 *     bugFixes: string[];
 *     breakingChanges: string[];
 *     other: string[];
 *   };
 *   version: string;
 *   generatedAt: string;   // ISO timestamp
 * }
 *
 * Error responses:
 * 400 - Missing or invalid input
 * 429 - Free tier limit reached
 * 500 - LLM or server error
 */

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "AI Changelog Generator",
  },
});

const SYSTEM_PROMPT = `You are a changelog generator. Given a raw git log, produce a polished, human-readable changelog in Markdown.

Rules:
- Categorize commits into: Features, Bug Fixes, Breaking Changes, Other
- Use clear, non-technical language where possible
- Skip merge commits and version bumps
- Keep entries concise (one line each)
- If a category has no entries, omit it entirely
- Output ONLY valid JSON matching the schema below — no extra text

Schema:
{
  "sections": {
    "features": ["string"],
    "bugFixes": ["string"],
    "breakingChanges": ["string"],
    "other": ["string"]
  },
  "summary": "One sentence summary of this release"
}`;

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

  const sectionMap: Record<string, string> = {
    breakingChanges: "⚠️ Breaking Changes",
    features: "✨ Features",
    bugFixes: "🐛 Bug Fixes",
    other: "🔧 Other Changes",
  };

  for (const [key, label] of Object.entries(sectionMap)) {
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

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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

    // --- Free tier gate ---
    const isPaid = req.headers.get("x-paid-user") === "true"; // TODO: replace with Stripe session validation
    if (!isPaid) {
      const ip = getClientIp(req);
      const { allowed, remaining } = await checkRateLimit(ip);
      if (!allowed) {
        return NextResponse.json(
          {
            error: "Free tier limit reached (5/month). Upgrade to continue.",
            upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
          },
          {
            status: 429,
            headers: { "X-RateLimit-Remaining": "0" },
          }
        );
      }
      // Pass remaining quota through for client awareness
      void remaining; // used in response headers below
    }

    // --- LLM call ---
    const completion = await client.chat.completions.create({
      model: "anthropic/claude-3-5-haiku",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Git log:\n\`\`\`\n${gitLog.trim()}\n\`\`\``,
        },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    // Parse JSON from LLM response
    let parsed: { sections: Record<string, string[]>; summary: string };
    try {
      // Strip potential markdown code fences
      const jsonStr = raw.replace(/^```json?\n?/m, "").replace(/```$/m, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("LLM returned non-JSON:", raw);
      return NextResponse.json(
        { error: "Failed to parse LLM response", raw },
        { status: 500 }
      );
    }

    const { sections, summary } = parsed;
    const changelog = buildMarkdown(sections, summary, version, repoName);

    return NextResponse.json({
      changelog,
      sections,
      version,
      generatedAt: new Date().toISOString(),
    }, {
      headers: {
        "X-RateLimit-Limit": "5",
      }
    });
  } catch (err) {
    console.error("/api/generate error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
