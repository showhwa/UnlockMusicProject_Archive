pub const SYNC_FRAME_TEST_SIZE: usize = 0xff;

pub fn is_mp3(magic: u32) -> bool {
    // Check for 11-bit sync word, followed by 2 bits of version, and 2 bits of layer.
    // MPEG Version: MPEG Version 2 (ISO/IEC 13818-3) or MPEG Version 1 (ISO/IEC 11172-3)
    const MP3_AND_MASK: u32 = 0b1111_1111_1111_0110u32 << 16;
    const MP3_EXPECTED: u32 = 0b1111_1111_1111_0010u32 << 16;

    if (magic & MP3_AND_MASK) != MP3_EXPECTED {
        return false;
    }

    // Check for bitrate index and sampling rate frequency index.
    let bitrate = ((magic >> 12) & 0b1111) as u8;
    let sampling_rate = ((magic >> 10) & 0b11) as u8;

    // They should not be all 1s.
    bitrate != 0b1111 && sampling_rate != 0b11
}

pub fn is_aac(magic: u32) -> bool {
    // Frame sync should have the first 12 bits set to 1.
    const AAC_AND_MASK: u32 = 0b1111_1111_1111_0110u32 << 16;
    const AAC_EXPECTED: u32 = 0b1111_1111_1111_0000u32 << 16;

    (magic & AAC_AND_MASK) == AAC_EXPECTED
}
