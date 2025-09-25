import { useLocation } from "react-router-dom";
import { useEffect } from "react";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, RefreshCw } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);
  function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white px-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-6"
      >
        {/* Big glitch-style 404 */}
        <motion.h1
          className="text-8xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          404
        </motion.h1>

        {/* Subheading */}
        <p className="text-xl text-gray-300">
          Oops! The page you’re looking for has drifted into space 🚀
        </p>

        {/* Interactive SVG / Animation */}
        <motion.div
          className="flex justify-center"
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <img
            src="https://illustrations.popsy.co/gray/error-404.svg"
            alt="Lost astronaut"
            className="w-64"
          />
        </motion.div>

        {/* Buttons */}
        <div className="flex justify-center gap-4">
          <Button
            variant="default"
            onClick={() => (window.location.href = "/")}
            className="flex items-center gap-2 rounded-2xl px-6 py-3 text-lg shadow-lg hover:scale-105 transition"
          >
            <Home className="w-5 h-5" /> Go Home
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-2xl px-6 py-3 text-lg border-gray-500 text-gray-200 hover:bg-gray-700 hover:text-white"
          >
            <RefreshCw className="w-5 h-5" /> Reload
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
};

export default NotFound;
