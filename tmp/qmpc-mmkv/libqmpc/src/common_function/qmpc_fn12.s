.intel_syntax noprefix

.struct 0
p.res_mmkv_name:  .skip 0x40
p.res_mmkv_key:   .skip 0x40
p.fn12_addr:      .skip 0x04
p.ok:             .skip 0x04

.text
push esi
mov esi, dword ptr[esp + 8]

lea eax, dword ptr[esi + p.res_mmkv_name]
lea ecx, dword ptr[esi + p.res_mmkv_key]

# void fn12(char* mmkv_key, char* mmkv_name);
push eax
push ecx
call dword ptr[esi + p.fn12_addr]

mov dword ptr[esi + p.ok], 1

pop esi
xor eax, eax
ret
