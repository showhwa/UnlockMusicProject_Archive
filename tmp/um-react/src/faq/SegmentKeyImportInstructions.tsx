import { SegmentTopNavSettings } from './SegmentTopNavSettings';
import { VQuote } from '~/components/HelpText/VQuote';
import { SegmentAddKeyDropdown } from './SegmentAddKeyDropdown';
import React from 'react';

export interface SegmentKeyImportInstructionsProps {
  clientInstructions: React.ReactNode;
  tab: string;
  keyInstructionText?: React.ReactNode;
}

export function SegmentKeyImportInstructions({
  clientInstructions,
  tab,
  keyInstructionText = '选择你的客户端平台来查看密钥提取说明：',
}: SegmentKeyImportInstructionsProps) {
  return (
    <>
      <p className="mt-2">导入密钥可以参考下面的步骤：</p>
      <ol className="list-decimal pl-5">
        <li>
          <SegmentTopNavSettings />
        </li>
        <li>
          设定区域选择<VQuote>{tab}</VQuote>
        </li>
        <li>
          <SegmentAddKeyDropdown />
        </li>
        <li>
          <p className="mb-2">{keyInstructionText}</p>
          {clientInstructions}
        </li>
      </ol>
    </>
  );
}
