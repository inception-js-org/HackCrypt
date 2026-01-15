import "./globals.css";
import { ThemeProvider } from "./ThemeProvider";
import ThemeSwitch from "./ThemeSwitch";

export const metadata = {
  title: "Unified Identity Verification",
  description: "Secure multi-factor identity verification system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="relative min-h-screen w-full overflow-hidden">
        <ThemeProvider>

          {/* ✅ GLOBAL THEME SWITCH */}
          <div className="fixed top-6 right-6 z-50">
            <ThemeSwitch />
          </div>

          {/* ✅ GLOBAL GRID BACKGROUND (light + dark aware) */}
          <div className="themed-grid pointer-events-none fixed inset-0 -z-20" />

          {/* ✅ GLOBAL GLOW */}
          <div className="pointer-events-none fixed inset-0 -z-10">
            <div
              className="absolute inset-0 blur-[140px]"
              style={{ backgroundColor: "var(--glow)" }}
            />
          </div>

          {/* ✅ PAGE CONTENT */}
          <div className="relative z-10">
            {children}
          </div>

        </ThemeProvider>
      </body>
    </html>
  );
}
