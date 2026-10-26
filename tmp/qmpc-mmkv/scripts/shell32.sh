#!/bin/sh
set -eu

if [ "$#" -ne 5 ]; then
    printf '%s\n' 'usage: gen-payload32.sh AS OBJCOPY NAME INPUT OUTPUT' >&2
    exit 1
fi

as="$1"
objcopy="$2"
name="$3"
input="$4"
output="$5"

tmp_dir=$(mktemp -d "${name}.libqmpc.XXXXXX")

cleanup() {
    rm -rf "$tmp_dir"
}

trap cleanup EXIT

"$as" --32 -mnaked-reg "$input" -o "$tmp_dir/s32.o"
"$objcopy" -O binary -j .text "$tmp_dir/s32.o" "$tmp_dir/s32.bin"

cat > "$output" <<EOF
#pragma once

static unsigned char ${name}[] = {
$(xxd -i < "$tmp_dir/s32.bin")
};

static unsigned int ${name}_len = sizeof($name);
EOF
