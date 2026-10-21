# Unit / vector tests for libqmpc.
# Internal helpers need private headers under src/; public API tests use libqmpc_dep.

libqmpc_internal_dep = declare_dependency(
  link_with: qmpc_lib,
  include_directories: [qmpc_inc, qmpc_private_inc],
  dependencies: [stc_dep],
)

crypto_test = executable(
  'crypto-test',
  'crypto_test.c',
  dependencies: libqmpc_dep,
)
test('crypto-aes-vectors', crypto_test, args: ['aes'], suite: ['crypto', 'unit'])
test(
  'crypto-hash-vectors',
  crypto_test,
  args: ['hashes'],
  suite: ['crypto', 'unit'],
)

hdd_helper_test = executable(
  'hdd-helper-test',
  'hwid/hdd/hdd_helper_test.c',
  dependencies: libqmpc_internal_dep,
)
test(
  'hdd-identify-string',
  hdd_helper_test,
  args: ['identify'],
  suite: ['hwid', 'unit'],
)
test(
  'hdd-flip-and-code',
  hdd_helper_test,
  args: ['flip_and_code'],
  suite: ['hwid', 'unit'],
)

if host_machine.system() == 'windows'
  utils_wstr_test = executable(
    'utils-wstr-test',
    'utils/wstr_test.c',
    dependencies: libqmpc_dep,
  )
  test(
    'utils-wstr2utf8',
    utils_wstr_test,
    args: ['wstr2utf8'],
    suite: ['utils', 'unit'],
  )
endif
