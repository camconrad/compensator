import { useEffect } from 'react';
import { IoMdClose } from 'react-icons/io';
import { motion } from 'framer-motion';

interface ModalProps {
  open: boolean;
  handleClose: () => void;
  className?: string;
  children?: React.ReactNode;
  title?: string;
  hideCloseIcon?: boolean;
}

const Modal = ({
  open,
  handleClose,
  className,
  title,
  hideCloseIcon = false,
  children,
}: ModalProps) => {
  useEffect(() => {
    const originalOverflow = document.body.style.overflowY;
    document.body.style.overflowY = open ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflowY = originalOverflow;
    };
  }, [open]);

  // Backdrop variants
  const backdropVariants = {
    hidden: { 
      opacity: 0,
      backdropFilter: 'blur(0px)'
    },
    visible: { 
      opacity: 1,
      backdropFilter: 'blur(8px)',
      transition: {
        duration: 0.2,
        ease: [0.23, 1, 0.32, 1]
      }
    }
  };

  const modalVariants = {
    hidden: { 
      scale: 0.85,
      opacity: 0,
      y: 20
    },
    visible: { 
      scale: 1,
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
        mass: 0.8,
        delay: 0.05
      }
    }
  };

  const closeButtonVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.1 },
    tap: { scale: 0.95 }
  };

  if (!open) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 z-[1000] h-screen w-full bg-white bg-opacity-10 dark:bg-[#0D131A] dark:bg-opacity-40"
      onClick={handleClose}
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={backdropVariants}
    >
      <div className="flex min-h-screen items-center justify-center py-2 px-2">
        <motion.div
          className={`${className} relative mx-auto w-full max-w-sm rounded-3xl border border-[#efefef] dark:border-[#151f29] bg-white dark:bg-[#0D131A] overflow-hidden`}
          onClick={(e) => e.stopPropagation()}
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          layout
        >
          {title && (
            <motion.h3 
              className="mb-4 text-2xl font-semibold text-white px-6 pt-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {title}
            </motion.h3>
          )}
          {!hideCloseIcon && (
            <motion.div
              className="absolute top-3 right-3 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#ccd3d9] dark:bg-gray-800 bg-opacity-20 hover:bg-opacity-30"
              onClick={handleClose}
              variants={closeButtonVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <IoMdClose className="stroke-current text-lg dark:text-gray-300" />
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.13 }}
          >
            {children}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Modal;
