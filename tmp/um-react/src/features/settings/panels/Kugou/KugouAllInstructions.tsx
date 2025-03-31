import { Tab, TabList, TabPanel, TabPanels } from '@chakra-ui/react';
import { AndroidADBPullInstruction } from '~/components/AndroidADBPullInstruction/AndroidADBPullInstruction';
import { InstructionsPC } from './InstructionsPC';

export function KugouAllInstructions() {
  return (
    <>
      <TabList>
        <Tab>安卓</Tab>
        <Tab>Windows</Tab>
      </TabList>
      <TabPanels flex={1} overflow="auto">
        <TabPanel>
          <AndroidADBPullInstruction
            dir="/data/data/com.kugou.android/files/mmkv"
            file="mggkey_multi_process"
          />
        </TabPanel>
        <TabPanel>
          <InstructionsPC />
        </TabPanel>
      </TabPanels>
    </>
  );
}
