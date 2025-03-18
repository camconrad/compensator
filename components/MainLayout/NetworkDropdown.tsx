"use client";

import { useSelectedNetwork, useSelectedNetworkActions } from "@/store/network/selector";
import { networks } from "@/store/network/useNetwork";
import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";

const NetworkDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedNetwork = useSelectedNetwork();
  const { setNetwork } = useSelectedNetworkActions();
  const currentNetwork: any = networks?.find(network => network.value === selectedNetwork);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleNetworkChange = (network: string) => {
    setNetwork(network);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div
        // onClick={toggleDropdown}
        className=""
      >
        <Image
          src={currentNetwork?.icon}
          alt={currentNetwork?.name}
          width={24}
          height={24}
          className="rounded-md dark:invert"
        />
        {/* <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
          <ChevronDown size={16} />
        </motion.div> */}
      </div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="absolute right-0 mt-2 w-48 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md"
      >
        {isOpen && (
          <>
            {networks.map((network) => (
              <div
                key={network.name}
                onClick={() => handleNetworkChange(network?.value)}
                className="flex items-center font-medium space-x-2 py-1 px-[6px] hover:bg-gray-100 hover:rounded-md dark:hover:bg-gray-700 cursor-pointer"
              >
                <Image
                  src={network.icon}
                  alt={network.name}
                  width={24}
                  height={24}
                  className="rounded-md dark:invert"
                />
                <span className="text-[#595959] dark:text-white">{network.name}</span>
              </div>
            ))}
          </>
        )}
      </motion.div>
    </div>
  );
};

export default NetworkDropdown;
