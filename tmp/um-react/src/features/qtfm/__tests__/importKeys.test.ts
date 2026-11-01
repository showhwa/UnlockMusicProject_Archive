import { parseQtfmDeviceInfoFromText, parseQtfmDeviceSecretFromText } from '../importKeys';
import { sanitizeQtfmAndroidKey } from '../types';

describe('qtfm import / sanitize', () => {
  test('parseQtfmDeviceSecretFromText extracts DEVICE_SECRET line', () => {
    const text = 'foo\nDEVICE_SECRET: aBcD1234\nbar';
    expect(parseQtfmDeviceSecretFromText(text)).toBe('aBcD1234');
    expect(parseQtfmDeviceSecretFromText('no secret here')).toBeNull();
  });

  test('parseQtfmDeviceInfoFromText requires all fields', () => {
    const full = ['PRODUCT: p', 'DEVICE: d', 'MANUFACTURER: m', 'BRAND: b', 'BOARD: board', 'MODEL: model'].join('\n');
    expect(parseQtfmDeviceInfoFromText(full)).toEqual({
      product: 'p',
      device: 'd',
      manufacturer: 'm',
      brand: 'b',
      board: 'board',
      model: 'model',
    });
    expect(parseQtfmDeviceInfoFromText('PRODUCT: p\nDEVICE: d')).toBeNull();
  });

  test('sanitizeQtfmAndroidKey strips non-hex', () => {
    expect(sanitizeQtfmAndroidKey('de-ad_be ef!!')).toBe('deadbeef');
  });
});
