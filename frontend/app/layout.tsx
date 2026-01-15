import "./globals.css";

export const metadata = {
  title: "Unified Identity Verification",
  description: "Secure multi-factor identity verification system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="relative min-h-screen w-full bg-neutral-900 text-white overflow-hidden">
        
        {/* Global Background Glow */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-fuchsia-400 opacity-20 blur-[140px]" />
        </div>

        {/* Page Content */}
        <div className="relative z-10">
          {children}
        </div>

      </body>
    </html>
  );
}
