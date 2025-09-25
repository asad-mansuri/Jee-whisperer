import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, RefreshCw, Search, ArrowRight, Activity } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [rocketHover, setRocketHover] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
    // auto-focus search for keyboard users
    const t = setTimeout(() => searchRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, [location.pathname]);

  const handleSearch = (e) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) {
      // small wiggle feedback when empty
      const el = searchRef.current;
      if (el) {
        el.animate(
          [
            { transform: "translateX(0)" },
            { transform: "translateX(-6px)" },
            { transform: "translateX(6px)" },
            { transform: "translateX(0)" }
          ],
          { duration: 300 }
        );
      }
      return;
    }
    // Example: navigate to search page or dashboard search route
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const quickNavigate = (path) => {
    navigate(path);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-black text-slate-50">
      {/* Animated starfield layers */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="stars-1 absolute inset-0 opacity-30" />
        <div className="stars-2 absolute inset-0 opacity-20" />
        <div className="stars-3 absolute inset-0 opacity-10" />
      </div>

      <div className="container mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto max-w-4xl rounded-2xl bg-gradient-to-b from-white/3 to-white/6 backdrop-blur px-8 py-12 shadow-2xl"
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Left: content */}
            <div className="flex-1 text-center md:text-left">
              <motion.h1
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-6xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-fuchsia-400"
              >
                404
              </motion.h1>

              <p className="mt-4 text-lg md:text-xl text-slate-200">
                Oops — the page you’re looking for has drifted off-course.
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Maybe the URL changed or the content moved. Try searching or jump back home.
              </p>

              {/* Search */}
              <form
                onSubmit={handleSearch}
                className="mt-6 flex items-center gap-3 justify-center md:justify-start"
                role="search"
                aria-label="Search site"
              >
                <label htmlFor="site-search" className="sr-only">
                  Search
                </label>
                <div className="relative w-full max-w-md">
                  <input
                    id="site-search"
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search topics, quizzes, lectures..."
                    className="w-full rounded-full bg-white/6 ring-1 ring-white/10 px-4 py-3 pr-12 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    aria-label="Search site"
                  />
                  <button
                    type="submit"
                    aria-label="Search"
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-2"
                  >
                    <Search className="w-5 h-5 text-slate-200" />
                  </button>
                </div>
                <Button
                  variant="default"
                  onClick={(e) => handleSearch(e)}
                  className="hidden md:inline-flex items-center gap-2 rounded-full px-5 py-3"
                  aria-label="Search button"
                >
                  Search
                </Button>
              </form>

              {/* Quick links */}
              <div className="mt-6 flex flex-wrap gap-2 justify-center md:justify-start">
                <button
                  onClick={() => quickNavigate("/")}
                  className="inline-flex items-center gap-2 rounded-full bg-white/6 px-4 py-2 text-sm font-medium hover:bg-white/8 transition"
                >
                  <Home className="w-4 h-4" /> Home
                </button>
                <button
                  onClick={() => quickNavigate("/quizzes")}
                  className="inline-flex items-center gap-2 rounded-full bg-white/6 px-4 py-2 text-sm font-medium hover:bg-white/8 transition"
                >
                  <Activity className="w-4 h-4" /> Quizzes
                </button>
                <button
                  onClick={() => quickNavigate("/tutor")}
                  className="inline-flex items-center gap-2 rounded-full bg-white/6 px-4 py-2 text-sm font-medium hover:bg-white/8 transition"
                >
                  <ArrowRight className="w-4 h-4" /> Smart Tutor
                </button>
                <button
                  onClick={() => quickNavigate("/lectures")}
                  className="inline-flex items-center gap-2 rounded-full bg-white/6 px-4 py-2 text-sm font-medium hover:bg-white/8 transition"
                >
                  Lectures
                </button>
              </div>

              {/* Footer action buttons */}
              <div className="mt-8 flex gap-3 justify-center md:justify-start">
                <Button
                  variant="default"
                  onClick={() => navigate("/")}
                  className="flex items-center gap-2 rounded-2xl px-5 py-3 shadow-lg hover:scale-105 transition"
                  aria-label="Go home"
                >
                  <Home className="w-5 h-5" /> Go Home
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 rounded-2xl px-5 py-3"
                  aria-label="Reload page"
                >
                  <RefreshCw className="w-5 h-5" /> Reload
                </Button>
              </div>
            </div>

            {/* Right: interactive scene */}
            <div className="w-full md:w-1/2 flex items-center justify-center">
              <div className="relative w-72 h-72 md:w-80 md:h-80">
                {/* Planet / gradient backdrop */}
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sky-700/30 via-indigo-800/20 to-black/30 ring-1 ring-white/6 flex items-center justify-center"
                >
                  {/* Rocket (interactive) */}
                  <motion.div
                    drag
                    dragConstraints={{ left: -20, right: 20, top: -20, bottom: 20 }}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.98 }}
                    onHoverStart={() => setRocketHover(true)}
                    onHoverEnd={() => setRocketHover(false)}
                    className="relative"
                    aria-hidden
                  >
                    <motion.svg
                      initial={{ y: 0 }}
                      animate={rocketHover ? { y: -6, rotate: 6 } : { y: [0, -6, 0], rotate: [0, -4, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                      width="180"
                      height="180"
                      viewBox="0 0 64 64"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="mx-auto"
                    >
                      <defs>
                        <linearGradient id="g1" x1="0" x2="1">
                          <stop offset="0%" stopColor="#7dd3fc" />
                          <stop offset="100%" stopColor="#a78bfa" />
                        </linearGradient>
                      </defs>
                      <g transform="translate(2 2)">
                        <path d="M24 2c-2 6-8 12-8 20 0 8 6 14 8 20 2-6 8-12 8-20 0-8-6-14-8-20z" fill="url(#g1)"/>
                        <circle cx="24" cy="18" r="3" fill="#0f172a" />
                        <path d="M7 40c6 2 24 2 32 0-8 6-24 6-32 0z" fill="#f97316" opacity="0.95"/>
                      </g>
                    </motion.svg>

                    {/* Rocket flame */}
                    <motion.div
                      animate={{ scaleY: [1, 0.8, 1], opacity: [0.9, 0.6, 0.9] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                      className="absolute left-1/2 -translate-x-1/2 bottom-0 w-6 h-12 rounded-full blur-sm"
                      style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,160,64,0.9))" }}
                    />
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Accessible help & keyboard hint */}
          <div className="mt-8 text-center text-sm text-slate-400">
            Tip: Press <kbd className="rounded bg-slate-700 px-2 py-0.5">/</kbd> to focus search • Press{" "}
            <kbd className="rounded bg-slate-700 px-2 py-0.5">Esc</kbd> to clear
          </div>
        </motion.div>
      </div>

      {/* Small footer */}
      <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-slate-500">
        © {new Date().getFullYear()} Smart AI Tutor — Code Storm
      </footer>

      {/* Inline styles for stars animation (Tailwind can't express dynamic keyframes here) */}
      <style>{`
        .stars-1 {
          background-image: radial-gradient(#ffffff22 1px, transparent 1px);
          background-size: 12px 12px;
          animation: twinkle 9s linear infinite;
          opacity: 0.22;
        }
        .stars-2 {
          background-image: radial-gradient(#ffffff18 1px, transparent 1px);
          background-size: 20px 20px;
          animation: twinkle 12s linear infinite;
          opacity: 0.16;
        }
        .stars-3 {
          background-image: radial-gradient(#ffffff10 1px, transparent 1px);
          background-size: 28px 28px;
          animation: twinkle 18s linear infinite;
          opacity: 0.1;
        }
        @keyframes twinkle {
          0% { transform: translateY(0) translateX(0); opacity: 1; }
          50% { transform: translateY(-6px) translateX(6px); opacity: 0.6; }
          100% { transform: translateY(0) translateX(0); opacity: 1; }
        }
        kbd { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Helvetica Neue", monospace; }
      `}</style>
    </div>
  );
};

export default NotFound;
