import { configureStore } from '@reduxjs/toolkit';

import {
  commitStagingChange,
  discardStagingChanges,
  productionToStaging,
  qmc2AddKey,
  qmc2ImportKeys,
  qmc2UpdateKey,
  settingsSlice,
  stagingToProduction,
  type ProductionSettings,
  type StagingSettings,
} from '../settingsSlice';
import { mergeSettings } from '../persistSettings';
import { productionKeyToStaging, stagingKeyToProduction } from '../keyFormats';
import {
  qmc2ProductionToStaging,
  qmc2StagingToProductionKey,
  qmc2StagingToProductionValue,
} from '~/features/qmc/types';
import { kwm2StagingToProductionKey } from '~/features/kwm/types';

function createSettingsStore(preloaded?: ReturnType<typeof settingsSlice.getInitialState>) {
  return configureStore({
    reducer: { settings: settingsSlice.reducer },
    preloadedState: preloaded ? { settings: preloaded } : undefined,
  });
}

describe('stagingToProduction / productionToStaging', () => {
  test('stagingToProduction maps qmc2/kwm2/kugou keys and copies scalars', () => {
    const staging: StagingSettings = {
      general: {
        batchDownload: {
          directoryPicker: false,
          rememberDirectory: false,
          streamingZip: true,
          blobZip: false,
        },
        directWrite: {
          outputMode: 'fixedDirectory',
          fixedDirectoryPath: '/out',
          deleteSourceAfterDecrypt: true,
        },
      },
      qmc2: {
        allowFuzzyNameSearch: false,
        keys: [{ id: 'q1', name: 'a.mflac', ekey: '  ek1  ' }],
      },
      kwm2: {
        keys: [{ id: 'k1', rid: '123', quality: '2000k', ekey: 'kw' }],
      },
      kugou: {
        keys: [{ id: 'g1', audioHash: 'hash1', ekey: 'kg' }],
      },
      qtfm: { android: 'abcd' },
    };

    expect(stagingToProduction(staging)).toEqual({
      general: {
        batchDownload: {
          directoryPicker: false,
          rememberDirectory: false,
          streamingZip: true,
          blobZip: false,
        },
        directWrite: {
          outputMode: 'fixedDirectory',
          fixedDirectoryPath: '/out',
          deleteSourceAfterDecrypt: true,
        },
      },
      qmc2: {
        allowFuzzyNameSearch: false,
        keys: { 'a.mflac': 'ek1' },
      },
      kwm2: {
        keys: { [kwm2StagingToProductionKey(staging.kwm2.keys[0])]: 'kw' },
      },
      kugou: {
        keys: { hash1: 'kg' },
      },
      qtfm: { android: 'abcd' },
    });
  });

  test('productionToStaging round-trips values via keyFormats helpers', () => {
    const production: ProductionSettings = {
      general: settingsSlice.getInitialState().production.general,
      qmc2: { allowFuzzyNameSearch: true, keys: { 'song.mflac': 'ek' } },
      kwm2: { keys: { '42-2000': 'kw' } },
      kugou: { keys: { abcd: 'kg' } },
      qtfm: { android: 'ff00' },
    };

    const staging = productionToStaging(production);
    expect(staging.qmc2.allowFuzzyNameSearch).toBe(true);
    expect(staging.qmc2.keys).toHaveLength(1);
    expect(staging.qmc2.keys[0]).toMatchObject({ name: 'song.mflac', ekey: 'ek' });
    expect(staging.qmc2.keys[0].id).toEqual(expect.any(String));

    expect(staging.kwm2.keys).toEqual([expect.objectContaining({ rid: '42', quality: '2000', ekey: 'kw' })]);
    expect(staging.kugou.keys).toEqual([expect.objectContaining({ audioHash: 'abcd', ekey: 'kg' })]);
    expect(staging.qtfm.android).toBe('ff00');

    // Same mapping as productionKeyToStaging for qmc2
    expect(staging.qmc2.keys.map(({ name, ekey }) => ({ name, ekey }))).toEqual(
      productionKeyToStaging(production.qmc2.keys, qmc2ProductionToStaging).map(({ name, ekey }) => ({ name, ekey })),
    );
  });

  test('stagingKeyToProduction matches stagingToProduction for qmc2 keys', () => {
    const keys = [{ id: '1', name: 'x.mflac', ekey: ' e ' }];
    expect(stagingKeyToProduction(keys, qmc2StagingToProductionKey, qmc2StagingToProductionValue)).toEqual(
      stagingToProduction({
        ...settingsSlice.getInitialState().staging,
        qmc2: { allowFuzzyNameSearch: true, keys },
      }).qmc2.keys,
    );
  });
});

describe('commitStagingChange', () => {
  test('does not regenerate staging key ids', () => {
    const store = createSettingsStore();
    store.dispatch(qmc2AddKey());
    const id = store.getState().settings.staging.qmc2.keys[0].id;

    store.dispatch(qmc2UpdateKey({ id, field: 'name', value: 'track.mflac' }));
    store.dispatch(qmc2UpdateKey({ id, field: 'ekey', value: 'secret' }));
    store.dispatch(commitStagingChange());

    const { dirty, staging, production } = store.getState().settings;
    expect(dirty).toBe(false);
    expect(staging.qmc2.keys[0].id).toBe(id);
    expect(production.qmc2.keys).toEqual({ 'track.mflac': 'secret' });
  });

  test('keeps ids stable across multiple commits', () => {
    const store = createSettingsStore();
    store.dispatch(qmc2ImportKeys([{ name: 'a.mflac', ekey: '1' }]));
    const id = store.getState().settings.staging.qmc2.keys[0].id;

    store.dispatch(commitStagingChange());
    store.dispatch(qmc2UpdateKey({ id, field: 'ekey', value: '2' }));
    store.dispatch(commitStagingChange());

    expect(store.getState().settings.staging.qmc2.keys[0].id).toBe(id);
    expect(store.getState().settings.production.qmc2.keys).toEqual({ 'a.mflac': '2' });
  });
});

describe('discardStagingChanges', () => {
  test('restores staging from production (ids may change)', () => {
    const store = createSettingsStore();
    store.dispatch(qmc2ImportKeys([{ name: 'a.mflac', ekey: '1' }]));
    store.dispatch(commitStagingChange());

    store.dispatch(
      qmc2UpdateKey({ id: store.getState().settings.staging.qmc2.keys[0].id, field: 'ekey', value: 'dirty' }),
    );
    expect(store.getState().settings.dirty).toBe(true);

    store.dispatch(discardStagingChanges());

    expect(store.getState().settings.dirty).toBe(false);
    expect(store.getState().settings.staging.qmc2.keys).toEqual([
      expect.objectContaining({ name: 'a.mflac', ekey: '1' }),
    ]);
    expect(store.getState().settings.production.qmc2.keys).toEqual({ 'a.mflac': '1' });
  });
});

describe('mergeSettings', () => {
  test('fills defaults and keeps valid production keys', () => {
    const merged = mergeSettings({
      qmc2: { allowFuzzyNameSearch: false, keys: { 'a.mflac': 'ek' } },
      kwm2: { keys: { '1-2000': 'kw', bad: 'x', '2-hi': 'y' } },
      kugou: { keys: { hash: 'kg', nested: { nope: true } } },
      qtfm: { android: 'zz11!!aa' },
    } as unknown as ProductionSettings);

    expect(merged.general.batchDownload).toEqual(settingsSlice.getInitialState().production.general.batchDownload);
    expect(merged.general.directWrite).toEqual(settingsSlice.getInitialState().production.general.directWrite);
    expect(merged.qmc2).toEqual({ allowFuzzyNameSearch: false, keys: { 'a.mflac': 'ek' } });
    // only keys matching /^(\d+)-(\w+)$/
    expect(merged.kwm2.keys).toEqual({ '1-2000': 'kw', '2-hi': 'y' });
    expect(merged.kugou.keys).toEqual({ hash: 'kg' });
    // non-hex stripped (`z` is not hex)
    expect(merged.qtfm.android).toBe('11aa');
  });

  test('merged production round-trips through productionToStaging → stagingToProduction', () => {
    const merged = mergeSettings({
      general: {
        batchDownload: {
          directoryPicker: false,
          rememberDirectory: true,
          streamingZip: false,
          blobZip: true,
        },
        directWrite: {
          outputMode: 'fixedDirectory',
          fixedDirectoryPath: '/music/out',
          deleteSourceAfterDecrypt: true,
        },
      },
      qmc2: { allowFuzzyNameSearch: true, keys: { 'song.mflac': 'ek' } },
      kwm2: { keys: { '9-1000': 'kw' } },
      kugou: { keys: { h1: 'kg' } },
      qtfm: { android: 'abc' },
    });

    const roundTrip = stagingToProduction(productionToStaging(merged));
    expect(roundTrip.general).toEqual(merged.general);
    expect(roundTrip.qmc2).toEqual(merged.qmc2);
    expect(roundTrip.kwm2).toEqual(merged.kwm2);
    expect(roundTrip.kugou).toEqual(merged.kugou);
    expect(roundTrip.qtfm).toEqual(merged.qtfm);
  });

  test('mergeSettings fills directWrite defaults and ignores invalid fields', () => {
    const merged = mergeSettings({
      general: {
        directWrite: {
          outputMode: 'nope',
          fixedDirectoryPath: 42,
          deleteSourceAfterDecrypt: 'yes',
        },
      },
    } as unknown as ProductionSettings);

    expect(merged.general.directWrite).toEqual({
      outputMode: 'besideSource',
      fixedDirectoryPath: null,
      deleteSourceAfterDecrypt: false,
    });
  });

  test('mergeSettings keeps valid directWrite values when batchDownload omitted', () => {
    const merged = mergeSettings({
      general: {
        directWrite: {
          outputMode: 'fixedDirectory',
          fixedDirectoryPath: null,
          deleteSourceAfterDecrypt: true,
        },
      },
    } as unknown as ProductionSettings);

    expect(merged.general.directWrite).toEqual({
      outputMode: 'fixedDirectory',
      fixedDirectoryPath: null,
      deleteSourceAfterDecrypt: true,
    });
    expect(merged.general.batchDownload).toEqual(settingsSlice.getInitialState().production.general.batchDownload);
  });
});
