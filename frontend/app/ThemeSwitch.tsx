"use client";
import { useTheme } from "@/app/ThemeProvider";

export default function ThemeSwitch() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="
        flex items-center gap-2
        rounded-full px-4 py-2
        border backdrop-blur-md
        transition hover:scale-105
      "
      style={{
        color: "var(--text)",
        borderColor: "var(--card-border)",
        backgroundColor: "var(--card-bg)",
      }}
    >
      <span className="text-lg">
        {theme === "dark" ? "🌙" : "☀️"}
      </span>
      <span className="text-sm font-medium">
        {theme === "dark" ? "Dark" : "Light"}
      </span>
    </button>
  );
}
