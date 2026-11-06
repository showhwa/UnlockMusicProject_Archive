tiny_aes_project = subproject('tiny-aes-c')
tiny_aes_dep = tiny_aes_project.get_variable('tiny_aes_dep')

md5_project = subproject('md5-c')
md5_dep = md5_project.get_variable('md5_dep')

stc_project = subproject(
    'stc',
    default_options: [
        'tests=disabled',
        'examples=disabled',
        'checkscoped=disabled',
    ],
)
stc_dep = stc_project.get_variable('stc_dep')
