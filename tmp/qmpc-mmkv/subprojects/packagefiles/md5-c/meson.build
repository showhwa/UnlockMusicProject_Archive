project('md5-c', 'c', default_options: ['c_std=c23'])

md5_inc = include_directories('.')
md5_lib = library('md5-c', 'md5.c', include_directories: md5_inc)
md5_dep = declare_dependency(link_with: md5_lib, include_directories: md5_inc)
