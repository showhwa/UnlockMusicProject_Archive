cli_sources = [
  'src/main.c',
  'src/commands/system-id.c',
  'src/commands/dump.c',
  'src/utils/file_writer.c',
  'src/utils/mmkv_reader_adapter.c',
]

if host_machine.system() == 'windows'
  cli_sources += [
    'src/utils/args_u8_win.c',
    'src/utils/terminal_win.c',
  ]
else
  cli_sources += [
    'src/utils/args_u8_other.c',
    'src/utils/terminal_other.c',
  ]
endif

cli = executable(
  'qmpc-mmkv-cli',
  sources: cli_sources,
  c_args: [
    '-DQMPC_VERSION="@0@"'.format(meson.project_version()),
    '-DQMPC_COMMIT="@0@"'.format(get_option('commit')),
  ],
  include_directories: [include_directories('src')],
  dependencies: [libqmpc_dep],
  gnu_symbol_visibility: 'hidden',
  install: true,
)