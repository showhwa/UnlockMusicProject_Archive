use crate::buffered_decrypt::buffered_decrypt;
use crate::Cli;
use anyhow::{bail, Result};
use clap::Args;
use serde::Serialize;
use std::fs;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::PathBuf;
use umc_kgm::header::{Header, KGM_HEADER, VPR_HEADER};
use umc_kgm::{is_db_encrypted, Decipher, KugouError};

/// Decrypt a KGM/VPR file (Kugou Music)
#[derive(Args)]
pub struct ArgsKGM {
    /// Path to output file, e.g. /export/Music/song.flac
    #[arg(short, long)]
    output: Option<PathBuf>,

    /// Path to input file, e.g. /export/Music/song.kgm
    #[arg(name = "input")]
    input: PathBuf,

    /// File mode, one of "kgm" or "db", default to "kgm"
    #[arg(short, long, default_value = "kgm")]
    file_mode: String,

    /// EKey for KGM v5.
    /// Prefix with "@" to read ekey from an external file.
    #[arg(short = 'K', long = "ekey")]
    ekey: Option<String>,

    /// Print file info as JSON and do not decrypt.
    /// With --file-mode=kgm, prints the KGM header.
    /// With --file-mode=db, prints path, and encrypted.
    #[arg(short = 'I', long, action=clap::ArgAction::SetTrue, default_value_t=false)]
    info_only: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct KgmFileInfo {
    format: String,
    crypto_version: u32,
    offset_to_data: u64,
    key_slot: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    audio_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    ekey: Option<String>,
}

fn resolve_ekey(ekey: &str) -> Result<Option<String>> {
    let ekey = if let Some(path) = ekey.strip_prefix('@') {
        fs::read_to_string(path)?
    } else {
        ekey.to_string()
    };
    let ekey = ekey.trim();
    if ekey.is_empty() {
        Ok(None)
    } else {
        Ok(Some(ekey.to_string()))
    }
}

#[derive(Serialize)]
struct DbFileInfo {
    path: String,
    encrypted: bool,
}

fn header_format(header: &Header) -> Result<&'static str> {
    if header.magic == KGM_HEADER {
        Ok("kgm")
    } else if header.magic == VPR_HEADER {
        Ok("vpr")
    } else {
        bail!("Not a KGM/VPR file");
    }
}

impl ArgsKGM {
    pub fn run(&self, cli: &Cli) -> Result<i32> {
        match self.file_mode.as_str() {
            "kgm" => self.decrypt_kgm_file(cli),
            "db" => self.decrypt_db_file(),
            _ => bail!("Invalid file mode: {}", self.file_mode),
        }
    }

    fn output_path(&self) -> Result<&PathBuf> {
        match &self.output {
            None => bail!("--output is required"),
            Some(output) => Ok(output),
        }
    }

    fn decrypt_db_file(&self) -> Result<i32> {
        let mut file_input = File::open(&self.input)?;
        let mut buffer = Vec::new();
        file_input.read_to_end(&mut buffer)?;

        let encrypted = is_db_encrypted(&buffer);
        if !encrypted {
            eprintln!("[warn] database file is not encrypted");
        }

        if self.info_only {
            let info = DbFileInfo {
                path: self.input.display().to_string(),
                encrypted,
            };
            println!("{}", serde_json::to_string(&info)?);
            return Ok(0);
        }

        umc_kgm::decrypt_db(&mut buffer)?;
        let output = self.output_path()?;
        let mut file_output = File::create(output)?;
        file_output.write_all(&buffer)?;

        Ok(0)
    }

    fn decrypt_kgm_file(&self, cli: &Cli) -> Result<i32> {
        let mut file_input = File::open(&self.input)?;
        let header = Header::from_reader(&mut file_input)?;
        let ekey = match &self.ekey {
            Some(ekey) => resolve_ekey(ekey)?,
            None => None,
        };
        let audio_hash = if header.crypto_version == 5 && !header.audio_hash.is_empty() {
            Some(header.audio_hash.clone())
        } else {
            None
        };
        let info = KgmFileInfo {
            format: header_format(&header)?.to_string(),
            crypto_version: header.crypto_version,
            offset_to_data: header.offset_to_data as u64,
            key_slot: header.key_slot,
            audio_hash,
            ekey: ekey.clone(),
        };

        if self.info_only {
            println!("{}", serde_json::to_string(&info)?);
            return Ok(0);
        }

        let output = self.output_path()?;
        let decipher = match Decipher::new_v5(&header, ekey) {
            Err(KugouError::V5EKeyRequired) => bail!("--ekey is required for KGM v5."),
            result => result?,
        };
        file_input.seek(SeekFrom::Start(header.offset_to_data as u64))?;

        let mut file_output = File::create(output)?;
        buffered_decrypt(
            &mut file_input,
            &mut file_output,
            cli.buffer_size,
            |buffer, offset| {
                decipher.decrypt(buffer, offset);
            },
        )?;

        Ok(0)
    }
}
