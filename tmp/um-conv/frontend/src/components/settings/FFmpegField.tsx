import { useCallback } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { ExternalLink } from '@/components/ExternalLink';
import { ExecutablePathField } from '@/components/ExecutablePathField';
import { useConvertSelector, useSetting } from '@/hooks/useConvertStore';
import { useExecutablePathProbe } from '@/hooks/useExecutablePathProbe';
import { DropTargetIds } from '@/lib/fileDrop';
import { AACEncoder, OGGEncoder } from '~protocol';

/** Encoders we care about for settings / hint display. */
const FEATURED_ENCODERS = [
  AACEncoder.AACEncoderFDK,
  AACEncoder.AACEncoderAAC,
  OGGEncoder.OGGEncoderOpus,
  OGGEncoder.OGGEncoderVorbis,
] as const;

function checkSupportedEncoders(
  encoders: string[],
  check: readonly string[],
): { supported: string[]; unsupported: string[] } {
  const set = new Set(encoders);
  const supported: string[] = [];
  const unsupported: string[] = [];
  for (const name of check) {
    if (set.has(name)) supported.push(name);
    else unsupported.push(name);
  }
  return { supported, unsupported };
}

const useStyles = makeStyles({
  supported: {
    color: tokens.colorPaletteGreenForeground1,
  },
  unsupported: {
    color: tokens.colorPaletteRedForeground1,
  },
  codecList: {
    display: 'inline-flex',
    listStyle: 'none',
    margin: 0,
    padding: 0,
    gap: tokens.spacingHorizontalXS,
  },
});

export function FFmpegField() {
  const styles = useStyles();
  const patchSettings = useConvertSelector((state) => state.patchSettings);
  const ffmpeg = useSetting((settings) => settings.ffmpeg.path);

  const patchPath = useCallback(
    (value: string) => patchSettings({ ffmpeg: { path: value } }),
    [patchSettings],
  );

  const {
    validationMessage,
    probeResult: probe,
    ...field
  } = useExecutablePathProbe({
    exe: 'ffmpeg',
    persistedPath: ffmpeg,
    patchPath,
  });

  const { supported, unsupported } = checkSupportedEncoders(
    (probe?.ok && probe.encoders) || [],
    FEATURED_ENCODERS,
  );
  const showEncoders = !!probe?.ok;
  const showSupported = showEncoders && supported.length > 0;
  const showUnsupported = showEncoders && unsupported.length > 0;
  const hasValidationContent = Boolean(validationMessage) || showSupported || showUnsupported;

  return (
    <ExecutablePathField
      label="FFmpeg"
      dropTargetId={DropTargetIds.pathFfmpeg}
      hint={
        <>
          多媒体转换工具，可以从{' '}
          <ExternalLink href="https://ffmpeg.org/download.html">FFmpeg 官网</ExternalLink>
          获取官方认可的二进制。推荐使用{' '}
          <ExternalLink href="https://github.com/jellyfin/jellyfin-ffmpeg/releases/latest">
            Jellyfin 构建的版本
          </ExternalLink>
          。
        </>
      }
      validationMessage={
        hasValidationContent ? (
          <span>
            {validationMessage}
            {showSupported && (
              <>
                <span>・支持 </span>
                <ul className={styles.codecList}>
                  {supported.map((name) => (
                    <li key={name} className={styles.supported}>
                      {name}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {showUnsupported && (
              <>
                <span>・不支持 </span>
                <ul className={styles.codecList}>
                  {unsupported.map((name) => (
                    <li key={name} className={styles.unsupported}>
                      {name}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </span>
        ) : undefined
      }
      placeholder="留空则自动查找"
      {...field}
    />
  );
}
