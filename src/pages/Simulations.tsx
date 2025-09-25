import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
type Simulation = {
  title: string;
  description: string;
  category: string;
  url: string; // embed URL
  link?: string; // informational link
};

const SIMULATIONS: Simulation[] = [
  // ... (keep the same simulations array you already have)
  {
    title: "Balancing Chemical Equations",
    description: "Practice balancing equations and explore conservation of mass.",
    category: "Chemistry",
    url: "https://phet.colorado.edu/sims/html/balancing-chemical-equations/latest/balancing-chemical-equations_en.html",
    link: "https://phet.colorado.edu/en/simulation/balancing-chemical-equations",
  },
  {
    title: "Acid-Base Solutions",
    description: "Explore pH, probes, indicators, and solution behavior.",
    category: "Chemistry",
    url: "https://phet.colorado.edu/sims/html/acid-base-solutions/latest/acid-base-solutions_en.html",
    link: "https://phet.colorado.edu/en/simulation/acid-base-solutions",
  },
  {
    title: "pH Scale",
    description: "Test everyday liquids and visualize how dilution changes pH.",
    category: "Chemistry",
    url: "https://phet.colorado.edu/sims/html/ph-scale/latest/ph-scale_en.html",
    link: "https://phet.colorado.edu/en/simulation/ph-scale",
  },
  {
    title: "Build an Atom",
    description: "Create atoms from protons, neutrons, electrons — see how element, mass, and charge change.",
    category: "Chemistry / Atomic",
    url: "https://phet.colorado.edu/sims/html/build-an-atom/latest/build-an-atom_all.html",
    link: "https://phet.colorado.edu/en/simulation/build-an-atom",
  },
  {
    title: "Build a Molecule",
    description: "Assemble atoms into molecules and view 3D structures.",
    category: "Chemistry / Molecules",
    url: "https://phet.colorado.edu/sims/html/build-a-molecule/latest/build-a-molecule_all.html",
    link: "https://phet.colorado.edu/en/simulation/build-a-molecule",
  },
  {
    title: "States of Matter: Basics",
    description: "Heat, cool and compress particles — observe phase changes (solid/liquid/gas).",
    category: "Physical Science",
    url: "https://phet.colorado.edu/sims/html/states-of-matter-basics/latest/states-of-matter-basics_en.html",
    link: "https://phet.colorado.edu/en/simulation/states-of-matter-basics",
  },
  {
    title: "Molarity",
    description: "Explore concentration, moles, and how to prepare solutions of given molarity.",
    category: "Chemistry",
    url: "https://phet.colorado.edu/sims/html/molarity/latest/molarity_en.html",
    link: "https://phet.colorado.edu/en/simulation/molarity",
  },
  {
    title: "Circuit Construction Kit: DC",
    description: "Build DC circuits with batteries, bulbs, resistors, ammeter/voltmeter and explore current/voltage.",
    category: "Physics / Electricity",
    url: "https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_en.html",
    link: "https://phet.colorado.edu/en/simulation/circuit-construction-kit-dc",
  },
  {
    title: "Forces & Motion: Basics",
    description: "Investigate net force, friction, acceleration, and simple push/pull scenarios.",
    category: "Physics / Mechanics",
    url: "https://phet.colorado.edu/sims/html/forces-and-motion-basics/latest/forces-and-motion-basics_en.html",
    link: "https://phet.colorado.edu/en/simulation/forces-and-motion-basics",
  },
  {
    title: "Natural Selection",
    description: "Model how traits, selection agents, and environment affect population changes over time.",
    category: "Biology",
    url: "https://phet.colorado.edu/sims/html/natural-selection/latest/natural-selection_en.html",
    link: "https://phet.colorado.edu/en/simulation/natural-selection",
  },
  {
    title: "Wave on a String",
    description: "Wiggle the end of a string and make waves, or adjust frequency and amplitude to see how it affects the wave pattern.",
    category: "Physics / Waves",
    url: "https://phet.colorado.edu/sims/html/wave-on-a-string/latest/wave-on-a-string_en.html",
    link: "https://phet.colorado.edu/en/simulation/wave-on-a-string",
  },
  {
    title: "Projectile Motion",
    description: "Blast a cannon ball and explore projectile motion concepts including optimum angle, initial speed, and air resistance.",
    category: "Physics / Mechanics",
    url: "https://phet.colorado.edu/sims/html/projectile-motion/latest/projectile-motion_en.html",
    link: "https://phet.colorado.edu/en/simulation/projectile-motion",
  },
];

export default function Simulations(): JSX.Element {
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState<Simulation[]>(SIMULATIONS);
  const [activeSim, setActiveSim] = useState<Simulation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const modalIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Use the theme from the central theme system
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      setFiltered(SIMULATIONS);
      return;
    }

    const results = SIMULATIONS.filter((s) => {
      const hay = `${s.title} ${s.description} ${s.category}`.toLowerCase();
      return hay.includes(term);
    });

    setFiltered(results);
  }, [query]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeModal();
      }
    }

    if (activeSim) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [activeSim]);

  function launchSim(sim: Simulation) {
    setIsLoading(true);
    setActiveSim(sim);
    // allow iframe a moment to load — spinner hides on onLoad
  }

  function closeModal() {
    setActiveSim(null);
    setIsLoading(false);
    // clear iframe src to stop simulation (gives same effect as original)
    if (modalIframeRef.current) modalIframeRef.current.src = "about:blank";
  }

  // helper that returns card classes depending on theme
  const cardBase = `rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[480px]`;
  const cardBg = isDark
    ? "bg-gradient-to-b from-white/2 to-transparent border border-white/6"
    : "bg-white/80 border border-slate-200";
  const pageRoot = isDark
    ? "min-h-screen bg-gradient-to-b from-[#071026] to-[#081428] text-slate-100 font-sans"
    : "min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900 font-sans";

  return (
    <div className={pageRoot}>
      {/* Navbar */}
      <header className={`sticky top-0 z-40 ${isDark ? "bg-[rgba(15,23,36,0.95)]/95" : "bg-white/80"} backdrop-blur-md border-b ${isDark ? "border-white/5" : "border-slate-200"}`}>
        <div className="max-w-6xl mx-auto flex items-center gap-6 px-4 py-3">
          <h1 className="text-lg font-semibold tracking-tight">simulations</h1>

          <div className="relative flex-1 max-w-xl">
            <svg className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? "text-slate-400" : "text-slate-500"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx={11} cy={11} r={8} />
              <path d="M21 21l-4.35-4.35" />
            </svg>

            <input
              className={`w-full pl-10 pr-10 py-2 rounded-lg ${isDark ? "bg-white/6 border border-white/6 placeholder:text-slate-400 focus:ring-sky-300" : "bg-white border border-slate-200 placeholder:text-slate-500 focus:ring-sky-300"} outline-none`}
              placeholder="Search simulations by name, description, or category..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {query.length > 0 && (
              <button
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded ${isDark ? "text-slate-400 hover:text-slate-100" : "text-slate-500 hover:text-slate-800"}`}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1={18} y1={6} x2={6} y2={18} />
                  <line x1={6} y1={6} x2={18} y2={18} />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className={`mb-4 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          {query === ""
            ? `Showing all ${SIMULATIONS.length} simulations`
            : filtered.length === 0
            ? `No results found for "${query}"`
            : `Found ${filtered.length} simulation${filtered.length > 1 ? "s" : ""} matching "${query}"`}
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((sim, idx) => (
            <article
              key={sim.title + idx}
              className={`${cardBase} ${cardBg}`}
            >
              <div className={`p-3 flex items-start justify-between ${isDark ? "" : ""}`}>
                <div>
                  <h2 className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{sim.title}</h2>
                  <p className={`text-xs ${isDark ? "text-slate-400 mt-1" : "text-slate-600 mt-1"}`}>{sim.description}</p>
                </div>
                <div className={`text-right text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{sim.category}</div>
              </div>

              <div className="flex-1 bg-black/80">
                {/* iframe - note: many iframes may increase page weight. */}
                <iframe title={`${sim.title} (PhET)`} src={sim.url} className="w-full h-full border-0" />
              </div>

              <div className="p-3 flex items-center gap-2">
                <button
                  onClick={() => launchSim(sim)}
                  className={`${isDark ? "ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-md border border-sky-400/30 bg-sky-500/10 text-sky-300 font-semibold" : "ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-md border border-sky-400/20 bg-sky-100 text-sky-700 font-semibold"}`}
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M5 12h14" />
                    <path d="M12 5l7 7-7 7" />
                  </svg>
                  Launch
                </button>
              </div>
            </article>
          ))}
        </section>

        <footer className={`text-sm text-center mt-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          Simulations embedded from PhET Interactive Simulations (University of Colorado Boulder).
        </footer>
      </main>

      {/* Modal Fullscreen Simulation */}
      {activeSim && (
        <div className="fixed inset-0 z-50 bg-[#0f1724] flex flex-col">
          <div className="h-14 flex items-center px-4 border-b border-white/6">
            <button
              onClick={closeModal}
              className="inline-flex items-center gap-2 px-3 py-2 rounded bg-white/4 text-slate-100"
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="flex-1 text-center text-slate-100 font-medium">{activeSim.title}</div>
          </div>

          <div className="relative flex-1">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-4 border-sky-300/20 border-t-sky-300 animate-spin" />
              </div>
            )}

            <iframe
              ref={modalIframeRef}
              title={activeSim.title}
              src={activeSim.url}
              className="w-full h-full border-0"
              onLoad={() => setIsLoading(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
