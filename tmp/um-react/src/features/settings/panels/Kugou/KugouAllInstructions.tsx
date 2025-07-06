import { AndroidADBPullInstruction } from '~/components/AndroidADBPullInstruction/AndroidADBPullInstruction';
import { InstructionsPC } from './InstructionsPC';
import { InstructionsTabs, InstructionTab } from '~/components/InstructionsTabs';

export function KugouAllInstructions() {
  const ANDROID_DIR = '/data/data/com.kugou.android/files/mmkv';
  const ANDROID_FILE = 'mggkey_multi_process';
  const tabs: InstructionTab[] = [
    { id: 'android', label: '安卓', content: <AndroidADBPullInstruction dir={ANDROID_DIR} file={ANDROID_FILE} /> },
    { id: 'windows', label: 'Windows', content: <InstructionsPC /> },
  ];

  return <InstructionsTabs tabs={tabs} />;
}
