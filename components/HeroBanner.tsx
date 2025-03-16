"use client";

import { motion } from "framer-motion";

const HeroBanner = () => {
  return (
    <div className="flex items-center mt-[-12px] justify-center py-8 px-4 w-full max-w-[1100px] mx-auto">
      <div className="relative max-w-7xl w-full mx-auto overflow-hidden rounded-lg shadow-sm max-h-[180px] bg-white dark:bg-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full p-8 md:p-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col justify-center"
          >
            <h1 className="text-2xl md:text-3xl font-bold text-[#030303] dark:text-white mb-2">
              Delegate votes,
              <br />
              earn rewards
            </h1>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex items-center justify-start md:justify-end"
          >
            {/* Placeholder */}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HeroBanner
