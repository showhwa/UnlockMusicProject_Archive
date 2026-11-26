import { Field, Option, Switch, makeStyles, tokens } from '@fluentui/react-components';
import { DirectoryPathField } from '@/components/DirectoryPathField';
import { Dropdown } from '@/components/Dropdown';
import { DropdownOptionLabel } from '@/components/DropdownOptionLabel';
import { useOutputSettings } from '@/hooks/useOutputSettings';
import { DropTargetIds } from '@/lib/fileDrop';
import {
  AUDIO_QUALITIES,
  AUDIO_QUALITY_FIELD_HINT,
  AUDIO_QUALITY_FIELD_HINT_LOSSLESS,
  EXISTING_OUTPUT_MODES,
  OUTPUT_TARGETS,
} from '@/settings/labels';
import type { ExistingOutputMode, OutputTarget } from '~protocol';

/** Prefer below; Fluent flips above when needed. Listbox right edge aligns with the control. */
const compactPositioning = { position: 'below' as const, align: 'end' as const };

const useStyles = makeStyles({
  field: {
    minWidth: 0,
    gap: 0,
    rowGap: 0,
    '& label': {
      margin: 0,
      fontSize: tokens.fontSizeBase200,
      lineHeight: tokens.lineHeightBase200,
    },
  },
  fill: {
    minWidth: 0,
    width: '100%',
  },
  formatListbox: {
    minWidth: '20rem',
  },
  qualityListbox: {
    minWidth: '20rem',
  },
  existsListbox: {
    minWidth: '16rem',
  },
});

export type OutputProfileFieldsLayout = 'compact' | 'settings';

export type OutputProfileFieldsProps = {
  /** `compact` for the quick panel, `settings` for the settings page. */
  layout: OutputProfileFieldsLayout;
};

/** Output format, quality, destination, and overwrite controls shared by quick and full settings. */
export function OutputProfileFields({ layout }: OutputProfileFieldsProps) {
  const styles = useStyles();
  const {
    profiles,
    outputFormat,
    audioQuality,
    deleteSource,
    existingOutputMode,
    outputTarget,
    outputDir,
    isLossless,
    toSource,
  } = useOutputSettings();
  const compact = layout === 'compact';
  const fieldClass = compact ? styles.field : undefined;
  const fillClass = compact ? styles.fill : undefined;
  const positioning = compact ? compactPositioning : undefined;

  const formatField = (
    <Field key="format" label="输出格式" className={fieldClass}>
      <Dropdown
        className={fillClass}
        listbox={compact ? { className: styles.formatListbox } : undefined}
        positioning={positioning}
        value={outputFormat.value || undefined}
        disabled={profiles.length === 0}
        onOptionSelect={(_, data) => {
          if (data.optionValue) {
            void outputFormat.commit(data.optionValue);
          }
        }}
      >
        {profiles.map((fmt) => (
          <Option key={fmt.id} value={fmt.id} text={fmt.name}>
            <DropdownOptionLabel text={fmt.name} hint={fmt.description} />
          </Option>
        ))}
      </Dropdown>
    </Field>
  );

  const qualityField = (
    <Field
      key="quality"
      label="音频质量"
      className={fieldClass}
      hint={isLossless ? AUDIO_QUALITY_FIELD_HINT_LOSSLESS : AUDIO_QUALITY_FIELD_HINT}
    >
      <Dropdown
        className={fillClass}
        listbox={compact ? { className: styles.qualityListbox } : undefined}
        positioning={positioning}
        value={String(audioQuality.value)}
        disabled={isLossless}
        onOptionSelect={(_, data) => {
          if (isLossless || !data.optionValue) return;
          void audioQuality.commit(Number(data.optionValue));
        }}
      >
        {AUDIO_QUALITIES.map((item) => (
          <Option key={item.value} value={String(item.value)} text={item.text}>
            <DropdownOptionLabel text={item.text} hint={item.hint} />
          </Option>
        ))}
      </Dropdown>
    </Field>
  );

  const targetField = (
    <Field key="target" label="输出目录" className={fieldClass}>
      <Dropdown
        className={fillClass}
        positioning={positioning}
        value={outputTarget.value}
        onOptionSelect={(_, data) => {
          if (data.optionValue) {
            void outputTarget.commit(data.optionValue as OutputTarget);
          }
        }}
      >
        {OUTPUT_TARGETS.map((item) => (
          <Option key={item.value} value={item.value} text={item.text}>
            {item.text}
          </Option>
        ))}
      </Dropdown>
    </Field>
  );

  const dirField = toSource ? null : compact ? (
    <DirectoryPathField
      key="dir"
      dropTargetId={DropTargetIds.pathOutputDir}
      setting={outputDir}
      placeholder="输入或浏览选择目录"
      browseVariant="icon"
      browseLabel="浏览输出目录"
    />
  ) : (
    <Field key="dir" label="自定义目录">
      <DirectoryPathField
        dropTargetId={DropTargetIds.pathOutputDir}
        setting={outputDir}
        placeholder="输入或浏览选择目录"
      />
    </Field>
  );

  const deleteSwitch = (
    <Switch
      key="delete"
      label={compact ? '完成后删除' : '转换完成删除原文件'}
      checked={deleteSource.value}
      onChange={(_, data) => void deleteSource.commit(Boolean(data.checked))}
    />
  );

  const existsField = (
    <Field key="exists" label={compact ? '文件存在时' : '文件已存在时'} className={fieldClass}>
      <Dropdown
        className={fillClass}
        listbox={compact ? { className: styles.existsListbox } : undefined}
        positioning={positioning}
        value={existingOutputMode.value}
        onOptionSelect={(_, data) => {
          if (data.optionValue) {
            void existingOutputMode.commit(data.optionValue as ExistingOutputMode);
          }
        }}
      >
        {EXISTING_OUTPUT_MODES.map((item) => (
          <Option key={item.value} value={item.value} text={item.text}>
            <DropdownOptionLabel text={item.text} hint={item.hint} />
          </Option>
        ))}
      </Dropdown>
    </Field>
  );

  return (
    <>
      {formatField}
      {qualityField}
      {compact ? deleteSwitch : null}
      {compact ? existsField : null}
      {targetField}
      {dirField}
      {compact ? null : deleteSwitch}
      {compact ? null : existsField}
    </>
  );
}
