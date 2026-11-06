import { NavLink, Navigate, Route, Routes } from 'react-router';
import { MdHome, MdQuestionAnswer, MdSettings } from 'react-icons/md';
import { Bounce, ToastContainer } from 'react-toastify';

import { Footer } from '~/components/Footer';
import { FaqHome } from '~/faq/FaqHome';
import { FAQ_PAGES } from '~/faq/FAQPages';
import { SettingsHome } from '~/features/settings/SettingsHome';
import { getSettingsTabs, hasOneClickImportCapability, ONE_CLICK_TAB_ID } from '~/features/settings/settingsTabs';
import { usePlatform } from '~/platform/PlatformContext';
import { FaqTab } from '~/tabs/FaqTab';
import { MainTab } from '~/tabs/MainTab';
import { SettingsTab } from '~/tabs/SettingsTab';

const tabClassNames = ({ isActive }: { isActive: boolean }) => `mb-[-2px] tab ${isActive ? 'tab-active' : ''}`;

/** Main chrome (nav / routes / toast / footer). Render only after platform `init()` resolves. */
export function AppLayout() {
  const { capabilities } = usePlatform();
  const settingsTabs = getSettingsTabs(capabilities);
  const showOneClick = hasOneClickImportCapability(capabilities);

  return (
    <>
      <div role="tablist" className="tabs tabs-border w-full justify-center border-b-2 border-base-200 box-content">
        <NavLink to="/" role="tab" className={tabClassNames}>
          <MdHome />
          应用
        </NavLink>
        <NavLink to="/settings" role="tab" className={tabClassNames}>
          <MdSettings />
          设置
        </NavLink>
        <NavLink to="/questions" role="tab" className={tabClassNames}>
          <MdQuestionAnswer />
          答疑
        </NavLink>
      </div>

      <main className="flex-1 flex justify-center min-h-0 overflow-auto">
        <Routes>
          <Route path="/" Component={MainTab} />
          <Route path="/settings" Component={SettingsTab}>
            <Route index Component={SettingsHome} />
            {Object.entries(settingsTabs).map(([key, { Tab }]) => (
              <Route key={key} path={key} Component={Tab} />
            ))}
            {!showOneClick && <Route path={ONE_CLICK_TAB_ID} element={<Navigate to="/settings/general" replace />} />}
          </Route>
          <Route path="/questions" Component={FaqTab}>
            <Route index Component={FaqHome} />
            {FAQ_PAGES.map(({ id, Component }) => (
              <Route key={id} path={id} Component={Component} />
            ))}
          </Route>
        </Routes>
      </main>

      <ToastContainer
        position="bottom-center"
        autoClose={5000}
        newestOnTop
        closeOnClick={false}
        pauseOnFocusLoss
        draggable
        theme="colored"
        transition={Bounce}
      />

      <Footer />
    </>
  );
}
