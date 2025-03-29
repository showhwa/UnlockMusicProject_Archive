use anyhow::Result;

mod constants;
mod core;
mod helper;
use core::{KuwoDes, Mode};
use umc_utils::base64;

/// Decrypt string content
pub fn decrypt_ksing<T: AsRef<[u8]>>(data: T, key: &[u8; 8]) -> Result<String> {
    let mut decoded = base64::decode(data)?;

    let des = KuwoDes::new(key, Mode::Decrypt);
    des.transform(&mut decoded[..])?;

    let result = String::from_utf8_lossy(&decoded[..])
        .trim_end_matches('\x00')
        .to_string();

    Ok(result)
}

pub fn encrypt_ksing<T: AsRef<[u8]>>(data: T, key: &[u8; 8]) -> Result<String> {
    let mut data = Vec::from(data.as_ref());
    let padded_len = ((data.len() + 7) / 8) * 8;
    data.resize(padded_len, 0u8);

    let des = KuwoDes::new(key, Mode::Encrypt);
    des.transform(&mut data[..])?;
    Ok(base64::encode(data))
}

pub fn decode_ekey<T: AsRef<[u8]>>(data: T, key: &[u8; 8]) -> Result<String> {
    let decoded = decrypt_ksing(data, key)?;
    Ok(decoded[16..].to_string())
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_ksing_decode() {
        let expected = "hello world";
        let decoded =
            decrypt_ksing("tx5ct5ilzeLs7pN1C4RI6w==", b"12345678").expect("decrypt failed");
        assert_eq!(decoded, expected);
    }
}
