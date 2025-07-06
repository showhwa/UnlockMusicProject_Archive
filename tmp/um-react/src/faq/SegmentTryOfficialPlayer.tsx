import { RiErrorWarningLine } from 'react-icons/ri';

export function SegmentTryOfficialPlayer({ className = '' }: { className?: string }) {
  return (
    <div className={`alert alert-warning my-2 ${className}`}>
      <RiErrorWarningLine className="text-2xl" />
      <p>尝试用下载音乐的设备播放一次看看，如果官方客户端都无法播放，那解锁肯定会失败哦。</p>
    </div>
  );
}
