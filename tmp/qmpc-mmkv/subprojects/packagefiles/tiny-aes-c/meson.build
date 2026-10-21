project('tiny-aes-c', 'c', default_options: ['c_std=c23'])

# Private to aes.c only: trim upstream optional modes/key sizes.
# Do not put these on declare_dependency — they must not leak to consumers.
tiny_aes_c_args = ['-DCBC=0', '-DECB=1', '-DCTR=0']
tiny_aes_inc = include_directories('.')
tiny_aes_lib = library(
    'tiny-aes-c',
    'aes.c',
    include_directories: tiny_aes_inc,
    c_args: tiny_aes_c_args,
)
tiny_aes_dep = declare_dependency(
    link_with: tiny_aes_lib,
    include_directories: tiny_aes_inc,
)
