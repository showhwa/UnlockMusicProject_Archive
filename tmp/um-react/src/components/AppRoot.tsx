import { useEffect } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router';
import { MdSettings, MdHome, MdQuestionAnswer } from 'react-icons/md';

import { MainTab } from '~/tabs/MainTab';
import { SettingsTab } from '~/tabs/SettingsTab';

import { Provider } from 'react-redux';
import { persistSettings } from '~/features/settings/persistSettings';
import { setupStore } from '~/store';
import { Footer } from '~/components/Footer';
import { FaqTab } from '~/tabs/FaqTab';
import { SETTINGS_TABS } from '~/features/settings/settingsTabs';
import { Bounce, ToastContainer } from 'react-toastify';
import { SettingsHome } from '~/features/settings/SettingsHome';
import { FAQ_PAGES } from '~/faq/FAQPages';
import { FaqHome } from '~/faq/FaqHome';

// Private to this file only.
const store = setupStore();

const tabClassNames = ({ isActive }: { isActive: boolean }) => `mb-[-2px] tab ${isActive ? 'tab-active' : ''}`;

export function AppRoot() {
  useEffect(() => persistSettings(store), []);

  return (
    <BrowserRouter>
      <Provider store={store}>
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
              {Object.entries(SETTINGS_TABS).map(([key, { Tab }]) => (
                <Route key={key} path={key} Component={Tab} />
              ))}
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
      </Provider>
    </BrowserRouter>
  );
}
