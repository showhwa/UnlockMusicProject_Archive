import type { ComponentType } from 'react';
import { QQMusicFAQ } from './QQMusicFAQ';
import { KuwoFAQ } from './KuwoFAQ';
import { KugouFAQ } from './KugouFAQ';
import { OtherFAQ } from './OtherFAQ';
import { AndroidEmulatorFAQ } from './AndroidEmulatorFAQ';
import { FAQAboutProject } from './FAQAbout';

export type FAQEntry = {
  id: string;
  name: string;
  Component: ComponentType;
};

export const FAQ_PAGES: FAQEntry[] = [
  { id: 'qqmusic', name: 'QQ 音乐', Component: QQMusicFAQ },
  { id: 'kuwo', name: '酷我音乐', Component: KuwoFAQ },
  { id: 'kugou', name: '酷狗音乐', Component: KugouFAQ },
  { id: 'android-emu', name: '安卓模拟器', Component: AndroidEmulatorFAQ },
  { id: 'other', name: '其它问题', Component: OtherFAQ },
  { id: 'about', name: '关于项目', Component: FAQAboutProject },
];
