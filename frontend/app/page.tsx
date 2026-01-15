"use client";
import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl min-h-screen px-8 flex flex-col md:flex-row items-center justify-center gap-16">

      {/* LEFT */}
      <div className="max-w-xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Unified <span className="text-fuchsia-400">Identity</span><br />
          Verification System
        </h1>

        <p className="text-lg text-neutral-300 mb-10">
          A secure, multi-factor platform that verifies identity,
          presence, and authenticity for classrooms and online sessions.
        </p>

        <Link
          href="/verify"
          className="inline-flex items-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-500 transition px-8 py-3 rounded-lg text-lg font-semibold shadow-xl"
        >
          Proceed to Verification →
        </Link>
      </div>

      {/* RIGHT */}
      <div className="max-w-md space-y-6">
        <SystemCard title="Face Verification" desc="Secure facial identity matching." />
        <SystemCard title="Cognitive Liveness" desc="Ensures real human presence." />
        <SystemCard title="Attendance Engine" desc="Marks attendance only after verification." />
      </div>

    </main>
  );
}

function SystemCard({ title, desc }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-lg">
      <h3 className="text-fuchsia-400 font-semibold mb-2">{title}</h3>
      <p className="text-sm text-neutral-300">{desc}</p>
    </div>
  );
}
