; 32-bit shellcode:
;   call CommonFunction.dll ordinal 12 via injected params.
;
; To compile to C header:
;   python3 scripts/asm2c.py libqmpc/src/common_function/qmpc_fn12.asm
bits 32

struc cf12
  .res_mmkv_name: resb 0x40
  .res_mmkv_key:  resb 0x40
  .fn12_addr:     resd 1
  .ok:            resd 1
endstruc

push esi
mov esi, [esp + 8]

lea eax, [esi + cf12.res_mmkv_name]
lea ecx, [esi + cf12.res_mmkv_key]

; void __stdcall fn12(char* mmkv_key, char* mmkv_name);
push eax
push ecx
call dword [esi + cf12.fn12_addr]

mov dword [esi + cf12.ok], 1

pop esi
xor eax, eax
ret
