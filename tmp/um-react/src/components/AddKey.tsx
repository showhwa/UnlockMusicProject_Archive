import {
  Button,
  ButtonGroup,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
} from '@chakra-ui/react';
import { MdAdd, MdDeleteForever, MdExpandMore, MdFileUpload } from 'react-icons/md';

export interface AddKeyProps {
  addKey: () => void;
  importKeyFromFile?: () => void;
  clearKeys?: () => void;
}

export function AddKey({ addKey, importKeyFromFile, clearKeys }: AddKeyProps) {
  return (
    <HStack pb={2} pt={2}>
      <ButtonGroup isAttached colorScheme="purple" variant="outline">
        <Button onClick={addKey} leftIcon={<Icon as={MdAdd} />}>
          添加一条密钥
        </Button>
        <Menu>
          <MenuButton as={IconButton} icon={<MdExpandMore />}></MenuButton>
          <MenuList>
            {importKeyFromFile && (
              <MenuItem onClick={importKeyFromFile} icon={<Icon as={MdFileUpload} boxSize={5} />}>
                从文件导入密钥…
              </MenuItem>
            )}
            {importKeyFromFile && clearKeys && <MenuDivider />}
            {clearKeys && (
              <MenuItem color="red" onClick={clearKeys} icon={<Icon as={MdDeleteForever} boxSize={5} />}>
                清空密钥
              </MenuItem>
            )}
          </MenuList>
        </Menu>
      </ButtonGroup>
    </HStack>
  );
}
