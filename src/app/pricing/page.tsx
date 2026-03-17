"use client";
import { useState } from "react";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err) {
      alert("Could not start checkout. Please try again.");
      setLoading(false);
    }
  }
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-center mb-2">Simple pricing</h1>
        <p className="text-center text-gray-400 mb-12">
          Start free. Upgrade when you ship more.
        </p>

        <div className="grid sm:grid-cols-2 gap-8">
          {/* Free */}
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-1">Free</h2>
            <div className="text-4xl font-bold mb-6">
              $0<span className="text-lg text-gray-400 font-normal">/mo</span>
            </div>
            <ul className="space-y-3 text-gray-400 text-sm mb-8">
              <li>✓ 5 changelogs per month</li>
              <li>✓ All output formats (Markdown, plain)</li>
              <li>✓ No signup required</li>
              <li className="text-gray-600">✗ API access</li>
              <li className="text-gray-600">✗ GitHub integration</li>
            </ul>
            <a
              href="/"
              className="block text-center bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Start for free
            </a>
          </div>

          {/* Pro */}
          <div className="bg-indigo-900/30 border border-indigo-500 rounded-2xl p-8 relative">
            <span className="absolute top-4 right-4 bg-indigo-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
              Popular
            </span>
            <h2 className="text-xl font-semibold mb-1">Pro</h2>
            <div className="text-4xl font-bold mb-6">
              $9<span className="text-lg text-gray-400 font-normal">/mo</span>
            </div>
            <ul className="space-y-3 text-gray-300 text-sm mb-8">
              <li>✓ Unlimited changelogs</li>
              <li>✓ All output formats</li>
              <li>✓ REST API access</li>
              <li>✓ GitHub repo integration (coming soon)</li>
              <li>✓ Priority support</li>
            </ul>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="block w-full text-center bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-lg transition-colors cursor-pointer"
            >
              {loading ? "Redirecting…" : "Upgrade to Pro →"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
