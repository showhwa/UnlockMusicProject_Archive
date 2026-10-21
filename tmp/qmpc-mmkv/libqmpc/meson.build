qmpc_inc = include_directories('include')
qmpc_private_inc = include_directories('src')
subdir('deps')

cc = meson.get_compiler('c')
is_windows = host_machine.system() == 'windows'

qmpc_sources = [
  'src/crypto/aes_cfb_128.c',
  'src/crypto/crc32.c',
  'src/hwid/hdd/hdd_helper.c',
  'src/mmkv/cipher.c',
  'src/mmkv/reader.c',
  'src/common_function/ordinal_12.c',
]

qmpc_deps = [tiny_aes_dep, md5_dep, stc_dep]
qmpc_link_deps = [stc_dep, tiny_aes_dep]

if is_windows
  netapi32_dep = cc.find_library('netapi32', required: true)
  iphlpapi_dep = cc.find_library('iphlpapi', required: true)
  shell32_dep = cc.find_library('shell32', required: true)
  windows_deps = [netapi32_dep, iphlpapi_dep, shell32_dep]
  qmpc_deps += windows_deps
  qmpc_link_deps += windows_deps

  qmpc_sources += [
    'src/hwid_win/hwid.c',
    'src/hwid_win/hdd/hdd1_read_with_admin.c',
    'src/hwid_win/hdd/hdd3_read_without_admin.c',
    'src/hwid_win/net/netbios_id.c',
    'src/hwid_win/net/ethernet_id.c',
    'src/common_function/ordinal_12_win.c',
    'src/utils/mmap/mmap_win.c',
  ]
else
  qmpc_sources += [
    'src/hwid/hwid_other.c',
    'src/common_function/ordinal_12_other.c',
    'src/utils/mmap/mmap_other.c',
  ]
endif

qmpc_lib = library(
  'qmpc',
  qmpc_sources,
  include_directories: [qmpc_inc, qmpc_private_inc],
  dependencies: qmpc_deps,
  c_args: ['-DQMPC_COMMIT="@0@"'.format(get_option('commit'))],
  c_static_args: ['-DQMPC_STATIC'],
  c_shared_args: ['-DQMPC_BUILDING'],
  gnu_symbol_visibility: 'hidden',
)

# Consumers of a static libqmpc must not use MSVC dllimport.
qmpc_usage_args = []
if get_option('default_library') == 'static'
  qmpc_usage_args += ['-DQMPC_STATIC']
endif

libqmpc_dep = declare_dependency(
  link_with: qmpc_lib,
  include_directories: qmpc_inc,
  dependencies: qmpc_link_deps,
  compile_args: qmpc_usage_args,
)

# Unit tests call non-exported internals; skip when libqmpc is shared (or both).
if get_option('default_library') == 'static'
  subdir('tests')
endif