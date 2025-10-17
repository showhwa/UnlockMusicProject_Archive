import { toast } from 'react-toastify';

export const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(
    () => toast.success('已复制到剪贴板'),
    (err) => toast.error(`复制失败，请手动复制。\n错误: ${err as Error}`),
  );
};
