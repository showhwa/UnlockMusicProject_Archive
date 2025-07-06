import { useAppDispatch, useAppSelector } from '~/hooks';
import { commitStagingChange, discardStagingChanges } from './settingsSlice';
import { selectIsSettingsNotSaved } from './settingsSelector';
import { Outlet } from 'react-router';
import { SETTINGS_TABS } from '~/features/settings/settingsTabs.tsx';
import { MdOutlineSettingsBackupRestore } from 'react-icons/md';
import { toast } from 'react-toastify';
import { ResponsiveNav } from '../nav/ResponsiveNav';
import { TabNavLink } from '../nav/TabNavLink';

export function Settings() {
  const dispatch = useAppDispatch();

  const handleResetSettings = () => {
    dispatch(discardStagingChanges());

    toast.info(() => (
      <div>
        <h3 className="text-lg font-bold">未储存的设定已舍弃</h3>
        <p className="text-sm">已还原到更改前的状态。</p>
      </div>
    ));
  };
  const handleApplySettings = () => {
    dispatch(commitStagingChange());
    toast.success('设定已应用');
  };
  const isSettingsNotSaved = useAppSelector(selectIsSettingsNotSaved);

  return (
    <div className="flex flex-col flex-1 container w-full">
      <ResponsiveNav
        className="grow h-full overflow-auto"
        contentClassName="flex flex-col overflow-auto"
        navigationClassName="overflow-x-auto pb-[2px] md:pb-0 h-full items-start [&]:md:flex"
        navigation={
          <div role="tablist" className="tabs gap-1 flex-nowrap md:flex-col grow items-center">
            {Object.entries(SETTINGS_TABS).map(([id, { name }]) => (
              <TabNavLink key={id} to={`/settings/${id}`}>
                {name}
              </TabNavLink>
            ))}
          </div>
        }
      >
        <Outlet />
      </ResponsiveNav>

      <footer className="flex flex-row gap-2 w-full p-2 border-t border-base-200 bg-base-100">
        <div className="grow inline-flex items-center">
          {isSettingsNotSaved ? (
            <span>
              有未储存的更改，<span className="text-red-600">设定将在保存后生效</span>
            </span>
          ) : (
            <span className="text-base-700">设定将在保存后生效</span>
          )}
        </div>

        <div className="flex flex-row gap-2">
          <button
            className="btn btn-sm btn-ghost text-error"
            onClick={handleResetSettings}
            title="放弃未储存的更改，将设定还原未储存前的状态。"
          >
            <MdOutlineSettingsBackupRestore className="size-4" />
          </button>
          <button className="btn btn-sm btn-primary" onClick={handleApplySettings}>
            保存
          </button>
        </div>
      </footer>
    </div>
  );
}
