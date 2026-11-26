import { useCallback, useRef, useState } from 'react';
import { Field, Input, Switch, makeStyles, tokens } from '@fluentui/react-components';
import { OutputProfileFields } from '@/components/OutputProfileFields';
import { useSetting } from '@/hooks/useConvertStore';
import { useOptimisticSetting } from '@/hooks/useOptimisticSetting';
import { SettingsSection } from './SettingsSection';

const useStyles = makeStyles({
  field: {
    marginTop: tokens.spacingVerticalM,
  },
});

function parseParallelInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed) || 0;
}

export function GeneralSettingsSection() {
  const styles = useStyles();
  const enableParallel = useOptimisticSetting(
    useSetting((settings) => settings.enableParallel),
    (value) => ({ enableParallel: value }),
  );
  const parallel = useOptimisticSetting(
    useSetting((settings) => settings.parallel),
    (value) => ({ parallel: value }),
  );
  const [parallelDraft, setParallelDraft] = useState<string | null>(null);
  const parallelDraftRef = useRef<string | null>(null);

  const writeParallelDraft = useCallback((value: string | null) => {
    parallelDraftRef.current = value;
    setParallelDraft(value);
  }, []);

  const commitParallelDraft = useCallback(() => {
    const raw = parallelDraftRef.current;
    if (raw === null) return;
    writeParallelDraft(null);
    const parsed = parseParallelInput(raw);
    if (parsed === null || parsed === parallel.value) return;
    void parallel.commit(parsed);
  }, [parallel, writeParallelDraft]);

  return (
    <SettingsSection id="general">
      <OutputProfileFields layout="settings" />
      <Field hint="关闭后按单个工人顺序处理；总进度文案与并行时一致。" className={styles.field}>
        <Switch
          label="启用并行转换"
          checked={enableParallel.value}
          onChange={(_, data) => {
            const next = Boolean(data.checked);
            if (!next) writeParallelDraft(null);
            void enableParallel.commit(next);
          }}
        />
      </Field>
      {enableParallel.value ? (
        <Field
          label="并行数量"
          hint="0 或负数表示使用 CPU 核心数；实际执行时大于 256 按 256 计。"
          className={styles.field}
        >
          <Input
            type="number"
            step={1}
            inputMode="numeric"
            value={parallelDraft ?? String(parallel.value)}
            onChange={(_, data) => writeParallelDraft(data.value)}
            onBlur={commitParallelDraft}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                commitParallelDraft();
              } else if (event.key === 'Escape') {
                writeParallelDraft(null);
              }
            }}
          />
        </Field>
      ) : null}
    </SettingsSection>
  );
}
