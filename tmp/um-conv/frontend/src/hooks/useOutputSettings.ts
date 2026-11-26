import { useSelectableProfiles, useSetting } from '@/hooks/useConvertStore';
import { useOptimisticSetting } from '@/hooks/useOptimisticSetting';
import { OutputTarget } from '~protocol';

/** Output-related optimistic settings shared by the quick panel and the settings page. */
export function useOutputSettings() {
  const profiles = useSelectableProfiles();
  const outputFormat = useOptimisticSetting(
    useSetting((settings) => settings.outputFormat),
    (value) => ({ outputFormat: value }),
  );
  const audioQuality = useOptimisticSetting(
    useSetting((settings) => settings.audioQuality),
    (value) => ({ audioQuality: value }),
  );
  const deleteSource = useOptimisticSetting(
    useSetting((settings) => settings.deleteSourceAfterConvert),
    (value) => ({ deleteSourceAfterConvert: value }),
  );
  const existingOutputMode = useOptimisticSetting(
    useSetting((settings) => settings.existingOutputMode),
    (value) => ({ existingOutputMode: value }),
  );
  const outputTarget = useOptimisticSetting(
    useSetting((settings) => settings.outputTarget),
    (value) => ({ outputTarget: value }),
  );
  const outputDir = useOptimisticSetting(
    useSetting((settings) => settings.outputDir),
    (value) => ({ outputDir: value }),
  );

  const selectedProfile = profiles.find((profile) => profile.id === outputFormat.value);

  return {
    profiles,
    outputFormat,
    audioQuality,
    deleteSource,
    existingOutputMode,
    outputTarget,
    outputDir,
    isLossless: Boolean(selectedProfile?.isLossless),
    toSource: outputTarget.value === OutputTarget.OutputTargetSource,
  };
}
