mod metadata;

use std::fmt::Display;
use thiserror::Error;

#[derive(Error, Debug, Clone)]
pub enum AudioError {
    #[error("Require at least {0} bytes of header.")]
    NeedMoreHeader(usize),
}

pub const MASK_LOSSLESS: u32 = 0x80000000;

#[repr(u32)]
#[derive(Debug, PartialEq, Eq)]
pub enum AudioType {
    Unknown = 0,

    // Lossy
    OGG = 1,
    AAC = 2,
    MP3 = 3,
    M4A = 4,
    M4B = 5,
    MP4 = 6,
    WMA = 7, // While possible, it is rare to find a lossless WMA file.
    MKV = 8, // Matroska (mkv, mka, webm etc.; can contain lossy or lossless audio tracks)

    // Lossless
    FLAC = MASK_LOSSLESS | 1,
    DFF = MASK_LOSSLESS | 2,
    WAV = MASK_LOSSLESS | 3,
    APE = MASK_LOSSLESS | 5,
}

impl AudioType {
    pub fn as_str(&self) -> &str {
        match self {
            AudioType::OGG => "ogg",
            AudioType::AAC => "aac",
            AudioType::MP3 => "mp3",
            AudioType::M4A => "m4a",
            AudioType::M4B => "m4b",
            AudioType::MP4 => "mp4",
            AudioType::WMA => "wma",
            AudioType::FLAC => "flac",
            AudioType::DFF => "dff",
            AudioType::WAV => "wav",
            AudioType::APE => "ape",
            AudioType::MKV => "mka",

            _ => "bin",
        }
    }
}

impl Display for AudioType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

fn is_mp3(magic: u32) -> bool {
    // Frame sync should have the first 11 bits set to 1.
    const MP3_AND_MASK: u32 = 0b1111_1111_1110_0000u32 << 16;
    const MP3_EXPECTED: u32 = 0b1111_1111_1110_0000u32 << 16;

    (magic & MP3_AND_MASK) == MP3_EXPECTED
}

fn is_aac(magic: u32) -> bool {
    // Frame sync should have the first 12 bits set to 1.
    const AAC_AND_MASK: u32 = 0b1111_1111_1111_0110u32 << 16;
    const AAC_EXPECTED: u32 = 0b1111_1111_1111_0000u32 << 16;

    (magic & AAC_AND_MASK) == AAC_EXPECTED
}

const MAGIC_FLAC: [u8; 4] = *b"fLaC";
const MAGIC_OGG: [u8; 4] = *b"OggS";
const MAGIC_DFF: [u8; 4] = *b"FRM8";
const MAGIC_WMA: [u8; 4] = [0x30, 0x26, 0xB2, 0x75];
const MAGIC_WAV: [u8; 4] = *b"RIFF";
const MAGIC_APE: [u8; 4] = *b"MAC ";
const MAGIC_MKV: [u8; 4] = [0x1A, 0x45, 0xDF, 0xA3];

pub fn detect_audio_type(buffer: &[u8]) -> Result<AudioType, AudioError> {
    let offset = metadata::get_header_metadata_size(buffer, 0)?;
    if buffer.len() < offset + 0x10 {
        Err(AudioError::NeedMoreHeader(offset + 0x10))?;
    }
    let buffer = &buffer[offset..];
    let mut magic = [0u8; 4];
    magic.copy_from_slice(&buffer[..4]);
    match magic {
        MAGIC_FLAC => return Ok(AudioType::FLAC),
        MAGIC_OGG => return Ok(AudioType::OGG),
        MAGIC_DFF => return Ok(AudioType::DFF),
        MAGIC_WMA => return Ok(AudioType::WMA),
        MAGIC_WAV => return Ok(AudioType::WAV),
        MAGIC_APE => return Ok(AudioType::APE),
        MAGIC_MKV => return Ok(AudioType::MKV),
        _ => {}
    }
    let magic = u32::from_be_bytes(magic);
    if is_aac(magic) {
        return Ok(AudioType::AAC);
    } else if is_mp3(magic) {
        return Ok(AudioType::MP3);
    }

    // MP4 Containers
    if &buffer[0x04..0x08] == b"ftyp" {
        let mut magic = [0u8; 4];
        magic.copy_from_slice(&buffer[0x08..0x0c]);
        match &magic {
            // MSNV: SonyPSP
            // isom / iso2: MP4 (Generic?)
            b"isom" | b"iso2" | b"MSNV" => return Ok(AudioType::MP4),
            b"NDAS" => return Ok(AudioType::M4A), // Nero Digital AAC Audio
            _ => {}
        };

        let mut magic = [0u8; 3];
        magic.copy_from_slice(&buffer[0x08..0x0b]);
        match &magic {
            b"M4A" => return Ok(AudioType::M4A), // iTunes AAC-LC Audio
            b"M4B" => return Ok(AudioType::M4B), // iTunes AAC-LC Audio
            b"mp4" => return Ok(AudioType::MP4), // QQMusic
            _ => {}
        };
    }

    Ok(AudioType::Unknown)
}

#[cfg(test)]
mod tests {
    use crate::{detect_audio_type, AudioType};

    #[test]
    fn test_mp3() {
        let mp3_data = include_bytes!("__fixtures__/mp3_with_id3v2.bin");
        let result = detect_audio_type(mp3_data).expect("failed to parse mp3");
        assert_eq!(result, AudioType::MP3);
    }

    #[test]
    fn test_mp3_multiple_id3() {
        let mp3_data = include_bytes!("__fixtures__/mp3_with_id3v2_x3.bin");
        let result = detect_audio_type(mp3_data).expect("failed to parse mp3");
        assert_eq!(result, AudioType::MP3);
    }
}
