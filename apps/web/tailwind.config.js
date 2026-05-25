/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        brand: {
          cyan:   "#00E5CC",
          purple: "#7B61FF",
          orange: "#FF6B35",
          gold:   "#F7931A",
        },
        // Surface system (dark-first)
        surface: {
          base:    "#080C14",
          raised:  "#0D1422",
          overlay: "#121929",
          border:  "#1E2D45",
          muted:   "#1A2540",
        },
        // Text
        text: {
          primary:   "#F0F4FF",
          secondary: "#8899BB",
          muted:     "#4A607A",
        },
        // Semantic
        success: "#22C55E",
        warning: "#F59E0B",
        danger:  "#EF4444",
        info:    "#3B82F6",
        // Asset colours
        usdy:  "#00E5CC",
        meth:  "#7B61FF",
        usde:  "#FF6B35",
        fbtc:  "#F7931A",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(0,229,204,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,204,0.03) 1px, transparent 1px)",
        "hero-gradient":
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,229,204,0.12), transparent)",
        "card-gradient":
          "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in":    "fadeIn 0.4s ease-out",
        "slide-up":   "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn:  { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      borderRadius: {
        xl2: "1rem",
        xl3: "1.5rem",
      },
    },
  },
  plugins: [],
}
