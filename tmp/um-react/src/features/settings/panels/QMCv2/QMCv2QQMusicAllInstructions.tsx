import { AndroidADBPullInstruction } from '~/components/AndroidADBPullInstruction/AndroidADBPullInstruction';
import { InstructionsIOS } from './InstructionsIOS';
import { InstructionsMac } from './InstructionsMac';
import { InstructionsPC } from './InstructionsPC';
import { InstructionsTabs, InstructionTab } from '~/components/InstructionsTabs.tsx';

export function QMCv2QQMusicAllInstructions({ limitHeight }: { limitHeight?: boolean }) {
  const tabs: InstructionTab[] = [
    {
      id: 'android',
      label: '安卓',
      content: <AndroidADBPullInstruction dir="/data/data/com.tencent.qqmusic/databases" file="player_process_db" />,
    },
    { id: 'ios', label: 'iOS', content: <InstructionsIOS /> },
    { id: 'mac', label: 'Mac', content: <InstructionsMac /> },
    { id: 'windows', label: 'Windows', content: <InstructionsPC /> },
  ];

  return <InstructionsTabs tabs={tabs} limitHeight={limitHeight} />;
}
