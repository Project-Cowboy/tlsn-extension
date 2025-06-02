import toast from 'react-hot-toast';

/**  
 * A simple wrapper to avoid importing `toast` everywhere  
 * and to give you semantic methods (success, error, info).  
 */
export function useNotifier() {
  return {
    success: (msg: string) => toast.success(msg),
    error:   (msg: string) => toast.error(msg),
    info:    (msg: string) => toast(msg),
  };
}
