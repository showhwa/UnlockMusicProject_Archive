import { AndroidADBPullInstruction } from '~/components/AndroidADBPullInstruction/AndroidADBPullInstruction';
import { InstructionsPC } from './InstructionsPC';
import { InstructionsIOS } from './InstructionsIOS';
import { InstructionsTabs, InstructionTab } from '~/components/InstructionsTabs';

export function KWMv2AllInstructions() {
  const ANDROID_DIR = '/data/data/cn.kuwo.player/files/mmkv';
  const ANDROID_FILE = 'cn.kuwo.player.mmkv.defaultconfig';
  const tabs: InstructionTab[] = [
    { id: 'android', label: '安卓', content: <AndroidADBPullInstruction dir={ANDROID_DIR} file={ANDROID_FILE} /> },
    { id: 'ios', label: 'iOS', content: <InstructionsIOS /> },
    { id: 'windows', label: 'Windows', content: <InstructionsPC /> },
  ];

  return <InstructionsTabs tabs={tabs} />;
}
