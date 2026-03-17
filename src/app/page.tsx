"use client";

import { useState } from "react";

const EXAMPLE_GIT_LOG = `abc1234 feat: add user authentication with JWT
def5678 fix: resolve null pointer in payment processor
ghi9012 feat: dark mode support across all pages
jkl3456 fix: mobile nav menu overlapping content
mno7890 chore: upgrade dependencies to latest
pqr2345 feat!: rename API endpoint /users to /accounts (breaking)
stu6789 fix: correct tax calculation for EU customers
vwx0123 docs: update README with setup instructions
yza4567 refactor: extract shared button component
bcd8901 fix: resolve race condition in cart checkout`;

interface GenerateResult {
  changelog: string;
  sections: {
    features?: string[];
    bugFixes?: string[];
    breakingChanges?: string[];
    other?: string[];
  };
  version: string;
  generatedAt: string;
}

export default function Home() {
  const [gitLog, setGitLog] = useState("");
  const [version, setVersion] = useState("v1.0.0");
  const [repoName, setRepoName] = useState("");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (!gitLog.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gitLog, version, repoName }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result?.changelog) return;
    await navigator.clipboard.writeText(result.changelog);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      {/* Hero */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <span className="inline-block mb-4 px-3 py-1 rounded-full bg-indigo-900/50 text-indigo-300 text-sm font-medium border border-indigo-700">
            Free to try · No signup required
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Turn your git log into a{" "}
            <span className="text-indigo-400">polished changelog</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Paste your raw git history. Get a clean, categorized, human-readable
            changelog in seconds — powered by AI.
          </p>
        </div>
      </div>

      {/* Generator */}
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        {/* Inputs */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Version tag (optional)
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="v1.0.0"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Repo name (optional)
            </label>
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="my-awesome-project"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-400">
              Git log
            </label>
            <button
              onClick={() => setGitLog(EXAMPLE_GIT_LOG)}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              Load example
            </button>
          </div>
          <textarea
            value={gitLog}
            onChange={(e) => setGitLog(e.target.value)}
            placeholder={`Paste your git log here...\n\nTip: run: git log --oneline`}
            rows={10}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm font-mono text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-y"
          />
          <p className="mt-1 text-xs text-gray-500">
            Run <code className="text-indigo-400">git log --oneline</code> in
            your repo and paste the output above.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !gitLog.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          {loading ? "Generating…" : "Generate Changelog ✨"}
        </button>

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-100">
                Your Changelog
              </h2>
              <button
                onClick={handleCopy}
                className="text-sm text-indigo-400 hover:text-indigo-300 border border-indigo-700 hover:border-indigo-500 px-3 py-1 rounded-lg transition-colors"
              >
                {copied ? "Copied! ✓" : "Copy Markdown"}
              </button>
            </div>
            <pre className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-sm text-gray-100 whitespace-pre-wrap font-mono overflow-x-auto">
              {result.changelog}
            </pre>
            <p className="text-xs text-gray-500 text-right">
              Generated {new Date(result.generatedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-gray-500">
          <span>AI Changelog Generator</span>
          <a href="/pricing" className="hover:text-indigo-400 transition-colors">
            Pricing →
          </a>
        </div>
      </footer>
    </main>
  );
}
