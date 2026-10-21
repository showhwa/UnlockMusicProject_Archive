project(
  'qmpc-mmkv',
  'c',
  version: '0.1.1',
  meson_version: '>=1.3.0',
  default_options: ['c_std=c23', 'warning_level=3', 'default_library=static'],
)

cc = meson.get_compiler('c')
is_release = get_option('buildtype') == 'release'
is_gcc = cc.get_id() == 'gcc'

if is_release and is_gcc
  # Compile: section-per-symbol for --gc-sections; visibility is not a linker flag.
  add_project_arguments(
    '-fdata-sections',
    '-ffunction-sections',
    '-fvisibility=hidden',
    language: 'c',
  )
  add_project_link_arguments(
    '-s',
    '-static-libgcc',
    '-Wl,--gc-sections',
    language: 'c',
  )
endif

subdir('libqmpc')
subdir('qmpc-mmkv-cli')
if host_machine.system() == 'windows'
  subdir('qmpc-mmkv-gui')
endif