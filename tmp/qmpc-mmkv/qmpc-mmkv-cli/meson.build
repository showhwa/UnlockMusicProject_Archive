cli = executable(
  'qmpc-mmkv-cli',
  'src/main.c',
  'src/commands/system-id.c',
  'src/commands/dump.c',
  'src/utils/file_writer.c',
  'src/utils/mmkv_reader_adapter.c',
  c_args: [
    '-DQMPC_VERSION="@0@"'.format(meson.project_version()),
    '-DQMPC_COMMIT="@0@"'.format(get_option('commit')),
  ],
  include_directories: [include_directories('src')],
  dependencies: [libqmpc_dep],
  gnu_symbol_visibility: 'hidden',
  install: true,
)