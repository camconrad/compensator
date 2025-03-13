import { useEffect } from 'react';
import { IoMdClose } from 'react-icons/io';

interface ModalProps {
  open: boolean;
  handleClose: () => void;
  className?: string;
  children?: React.ReactNode; // It's better to specify React.ReactNode for children prop type
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
    const originalOverflow = document.body.style.overflowY;  // Store the original overflow style
    document.body.style.overflowY = open ? 'hidden' : 'auto'; // Control the overflow based on the modal state

    // Cleanup function to restore the original overflow style
    return () => {
      document.body.style.overflowY = originalOverflow;
    };
  }, [open]);

  return (
    <div
      className={`fixed top-0 left-0 z-[1000] h-screen w-full ${
        open ? "overflow-y-hidden" : "overflow-y-auto"
      } bg-white bg-opacity-10 dark:bg-[#030303] dark:bg-opacity-40 transition-all ${
        open ? "opacity-1 backdrop-blur-sm" : "pointer-events-none opacity-0"
      }`}
      // onClick={() => handleClose()}
    >
      <div className="flex min-h-screen items-center justify-center py-[10px] px-[8px]">
        <div
          className={`${className} relative mx-auto w-[380px] rounded-[24px] border dark:border-[#1D1D1D] bg-[#030303] p-4 transition-all ${
            open ? "scale-100" : "scale-[0.9]"
          }`}
          onClick={(e) => e.stopPropagation()} // Prevent modal close when clicking inside the modal content
        >
          {title && (
            <h3 className="mb-[16px] text-[24px] font-semibold text-white">{title}</h3>
          )}
          {!hideCloseIcon && (
            <div
              className="absolute top-2 right-2 z-10 flex h-[32px] w-[32px] cursor-pointer items-center justify-center rounded-full bg-[#fff] bg-opacity-10 hover:bg-opacity-20"
              onClick={handleClose}
            >
              <IoMdClose className="stroke-current text-[18px]" />
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
