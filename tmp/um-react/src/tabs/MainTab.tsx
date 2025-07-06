import { RiErrorWarningLine } from 'react-icons/ri';
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
    <div className="size-full max-w-[80%] self-center pt-4">
      <div className="gap-3 flex flex-col">
        {isSettingsNotSaved && (
          <div role="alert" className="alert alert-warning gap-2">
            <span className="md:flex flex-row items-center gap-1">
              <RiErrorWarningLine className="size-6" />
              <span className="font-bold hidden md:inline">警告</span>
            </span>
            <div>
              <span className="block font-bold md:hidden">警告</span>
              <span>有尚未储存的设置，</span>
              <span className="inline-block">设定将在保存后生效。</span>
            </div>
            <div>
              <button type="button" className="btn btn-primary btn-sm" onClick={onClickSaveSettings}>
                立即储存
              </button>
            </div>
          </div>
        )}
        <SelectFile />

        <div className="w-full mt-4">
          <FileListing />
        </div>
      </div>
    </div>
  );
}
