import { AndroidADBPullInstruction } from '~/components/AndroidADBPullInstruction/AndroidADBPullInstruction';
import { InstructionsTabs, InstructionTab } from '~/components/InstructionsTabs.tsx';

export function QMCv2DoubanAllInstructions() {
  const tabs: InstructionTab[] = [
    {
      id: 'android',
      label: '安卓',
      content: <AndroidADBPullInstruction dir="/data/data/com.douban.radio/databases" file="music_audio_play" />,
    },
  ];

  return <InstructionsTabs tabs={tabs} />;
}
