#!/bin/sh

echo '补丁中…'

patch_count=0

patch_qqmusic() {
    SUDO="$1"
    APP="$2"

    if [ ! -d "$APP" ]; then
        echo "路径不存在，跳过 $APP..."
        return
    fi

    echo "修补 $APP..."
    $SUDO sed -i.bak 's#<string>8.8.0</string>#<string>88.8.0</string>#' \
        "$APP/Contents/Info.plist"
    $SUDO codesign --force --deep --sign - "$APP"
    $SUDO xattr -d com.apple.quarantine "$APP"

    patch_count=$((patch_count + 1))
}

patch_qqmusic sudo "/Applications/QQMusic.app"
patch_qqmusic ""   "$HOME/Applications/QQMusic.app"

echo "完成，已修补 $patch_count 个 QQ 音乐安装"
