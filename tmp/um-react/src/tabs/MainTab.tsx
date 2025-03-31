import { Alert, AlertIcon, Box, Button, Flex, Text, VStack } from '@chakra-ui/react';
import { SelectFile } from '../components/SelectFile';

import { FileListing } from '~/features/file-listing/FileListing';
import { useAppDispatch, useAppSelector } from '~/hooks.ts';
import { selectIsSettingsNotSaved } from '~/features/settings/settingsSelector.ts';
import { commitStagingChange } from '~/features/settings/settingsSlice.ts';

export function MainTab() {
  const dispatch = useAppDispatch();
  const isSettingsNotSaved = useAppSelector(selectIsSettingsNotSaved);
  const onClickSaveSettings = () => {
    dispatch(commitStagingChange());
  };

  return (
    <Box h="full" w="full" pt="4">
      <VStack gap="3">
        {isSettingsNotSaved && (
          <Alert borderRadius={7} maxW={400} status="warning">
            <AlertIcon />
            <Flex flexDir="row" alignItems="center" flexGrow={1} justifyContent="space-between">
              <Text m={0}>
                有尚未储存的设置，
                <br />
                设定将在保存后生效
              </Text>
              <Button type="button" ml={3} size="md" onClick={onClickSaveSettings}>
                立即储存
              </Button>
            </Flex>
          </Alert>
        )}
        <SelectFile />

        <Box w="full">
          <FileListing />
        </Box>
      </VStack>
    </Box>
  );
}
