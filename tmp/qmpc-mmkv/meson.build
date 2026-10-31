project(
  'qmpc-mmkv',
  'c',
  version: '1.0.1',
  meson_version: '>=1.3.0',
  default_options: ['c_std=c23', 'warning_level=3', 'default_library=static'],
)

cc = meson.get_compiler('c')
is_release = get_option('buildtype') == 'release'
is_gcc = cc.get_id() == 'gcc'
disable_all_logging = get_option('disable_all_logging')

# Keep source files and narrow string literals in UTF-8.
if cc.get_argument_syntax() == 'msvc'
  add_project_arguments('/utf-8', language: 'c')
else
  add_project_arguments(
    cc.get_supported_arguments('-finput-charset=UTF-8', '-fexec-charset=UTF-8'),
    language: 'c',
  )
endif

if disable_all_logging
  message('Disabling all logging')
  add_project_arguments('-DQMPC_DISABLE_ALL_LOGGING', language: 'c')
endif

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

shell32_script = files('scripts/shell32.sh')

subdir('libqmpc')
subdir('qmpc-mmkv-cli')
if host_machine.system() == 'windows'
  subdir('qmpc-mmkv-gui')
endif
