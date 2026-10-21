windows = import('windows')
resources = windows.compile_resources(
  'src/app.rc',
  include_directories: include_directories('src'),
  depend_files: files('src/app.manifest'),
)
executable(
  'qmpc-mmkv-gui',
  'src/main.c',
  resources,
  c_args: ['-DUNICODE', '-D_UNICODE'],
  dependencies: [libqmpc_dep, meson.get_compiler('c').find_library('user32')],
  gnu_symbol_visibility: 'hidden',
  win_subsystem: 'windows',
  install: true,
)
