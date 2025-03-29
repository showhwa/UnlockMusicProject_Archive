import { Alert, AlertIcon, Container } from '@chakra-ui/react';

export function SegmentTryOfficialPlayer() {
  return (
    <Container p={2} my={2} pt={0}>
      <Alert status="info" borderRadius={5}>
        <AlertIcon />
        尝试用下载音乐的设备播放一次看看，如果官方客户端都无法播放，那解锁肯定会失败哦。
      </Alert>
    </Container>
  );
}
