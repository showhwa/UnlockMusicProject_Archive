import { InstructionsIOSCondition } from './InstructionsIOSCondition';
import { useId } from 'react';

export function InstructionsIOS() {
  const iosInstructionId = useId();

  return (
    <>
      <div>
        <p>iOS 设备获取应用私有文件比较麻烦，你需要越狱或使用一台 PC 或 Mac 来对 iOS 设备进行完整备份。</p>
        <p>因此，建议换用 PC 或 Mac 重新下载音乐文件然后再尝试解密。</p>
      </div>

      <div className="join join-vertical bg-base-100 mt-2 max-w-full">
        <div className="collapse collapse-arrow join-item border-base-300 border">
          <input type="radio" name={iosInstructionId} />
          <div className="collapse-title font-semibold">
            我的 iOS 设备<strong>已经越狱</strong>{' '}
          </div>
          <div className="collapse-content text-sm min-w-0">
            <InstructionsIOSCondition jailbreak={true} />
          </div>
        </div>
        <div className="collapse collapse-arrow join-item border-base-300 border">
          <input type="radio" name={iosInstructionId} />
          <div className="collapse-title font-semibold">
            我的 iOS 设备<strong>没有越狱</strong>
          </div>
          <div className="collapse-content text-sm min-w-0">
            <InstructionsIOSCondition jailbreak={false} />
          </div>
        </div>
      </div>
    </>
  );
}
