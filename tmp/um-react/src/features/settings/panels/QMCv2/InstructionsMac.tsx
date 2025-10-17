import { useId } from 'react';
import { InstructionsMacV8 } from './InstructionsMacV8';
import { InstructionsMacV10 } from './InstructionsMacV10';

export function InstructionsMac() {
  const macInstructionId = useId();

  return (
    <>
      <p>Mac 客户端使用 mmkv 数据库储存密钥。</p>
      <p>建议使用 v8.8.0 或 v10.7 版本的客户端，其中 v8.8.0 版本需要屏蔽更新。</p>

      <div className="join join-vertical bg-base-100 mt-2 max-w-full">
        <div className="collapse collapse-arrow join-item border-base-300 border">
          <input type="radio" name={macInstructionId} />
          <div className="collapse-title font-semibold">使用 QQ 音乐 Mac v8.8.0</div>
          <div className="collapse-content text-sm min-w-0">
            <InstructionsMacV8 />
          </div>
        </div>
        <div className="collapse collapse-arrow join-item border-base-300 border">
          <input type="radio" name={macInstructionId} />
          <div className="collapse-title font-semibold">使用 QQ 音乐 Mac v10.7.1</div>
          <div className="collapse-content text-sm min-w-0">
            <InstructionsMacV10 />
          </div>
        </div>
      </div>
    </>
  );
}
