import { useEffect } from 'react';

/**
 * Custom hook สำหรับล็อกการ scroll ของ body เมื่อเปิด modal
 * @param {boolean} isOpen - สถานะการเปิด/ปิด modal
 */
export default function useModalScrollLock(isOpen) {
  useEffect(() => {
    document.body.classList.toggle('is-modal-open', isOpen);
    return () => document.body.classList.remove('is-modal-open');
  }, [isOpen]);
}
