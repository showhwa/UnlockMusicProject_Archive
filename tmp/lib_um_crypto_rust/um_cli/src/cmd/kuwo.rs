use crate::buffered_decrypt::buffered_decrypt;
use crate::Cli;
use anyhow::{bail, Result};
use clap::Args;
use serde::Serialize;
use std::fs::File;
use std::io::Read;
use std::path::PathBuf;
use umc_kuwo::{Decipher, Header, DATA_START_OFFSET};

/// Decrypt a KWM file (Kuwo Music)
#[derive(Args)]
pub struct ArgsKuwo {
    /// Path to output file, e.g. /export/Music/song.flac
    #[arg(short, long)]
    output: Option<PathBuf>,

    /// Path to input file, e.g. /export/Music/song.kwm
    #[arg(name = "input")]
    input: PathBuf,

    /// EKey required for KWM v2 files
    #[arg(short = 'K', long)]
    ekey: Option<String>,

    /// Print header info as JSON and do not decrypt.
    #[arg(short = 'I', long, action=clap::ArgAction::SetTrue, default_value_t=false)]
    info_only: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct KwmFileInfo {
    magic: String,
    version: u32,
    unknown_1: u32,
    resource_id: u32,
    unknown_2: String,
    format_name: String,
}

impl KwmFileInfo {
    fn from_header(header: &Header) -> Self {
        Self {
            magic: header_bytes_to_string(&header.magic),
            version: header.version,
            unknown_1: header.unknown_1,
            resource_id: header.resource_id,
            unknown_2: header_bytes_to_string(&header.unknown_2),
            format_name: header_bytes_to_string(&header.format_name),
        }
    }
}

/// Map raw header bytes to a string so `serde_json` emits them as JSON characters.
/// Trailing NUL bytes are dropped. Each remaining byte becomes U+00XX, which
/// serializes as itself or as `\u00XX` (for example `[0, 1, 2]` → `"\u0000\u0001\u0002"`).
fn header_bytes_to_string(bytes: &[u8]) -> String {
    let end = bytes
        .iter()
        .rposition(|&b| b != 0)
        .map(|i| i + 1)
        .unwrap_or(0);
    bytes[..end].iter().copied().map(char::from).collect()
}

impl ArgsKuwo {
    pub fn run(&self, cli: &Cli) -> Result<i32> {
        let mut file_input = File::open(&self.input)?;
        let mut header = [0u8; DATA_START_OFFSET];
        file_input.read_exact(&mut header)?;
        let header = Header::from_bytes(header)?;

        if self.info_only {
            let info = KwmFileInfo::from_header(&header);
            println!("{}", serde_json::to_string(&info)?);
            return Ok(0);
        }

        let decipher = Decipher::new(&header, self.ekey.as_deref())?;
        let output = match &self.output {
            None => bail!("--output is required"),
            Some(output) => output,
        };
        let mut file_output = File::create(output)?;
        buffered_decrypt(
            &mut file_input,
            &mut file_output,
            cli.buffer_size,
            |buffer, offset| decipher.decrypt(buffer, offset),
        )?;

        Ok(0)
    }
}

#[cfg(test)]
mod tests {
    use super::header_bytes_to_string;

    #[test]
    fn serializes_raw_bytes_as_json_string() {
        let json = serde_json::to_string(&header_bytes_to_string(&[0, 1, 2])).unwrap();
        assert_eq!(json, r#""\u0000\u0001\u0002""#);

        let parsed: String = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.chars().map(|c| c as u8).collect::<Vec<_>>(), vec![0, 1, 2]);

        assert_eq!(
            serde_json::to_string(&header_bytes_to_string(b"a\\b\0\0")).unwrap(),
            r#""a\\b""#
        );
        assert_eq!(
            serde_json::to_string(&header_bytes_to_string(&[0, 0, 0])).unwrap(),
            r#""""#
        );
    }
}
