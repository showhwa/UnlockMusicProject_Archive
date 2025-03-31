use std::{
    fs::File,
    io::{Read, Write},
};

use clap::Parser;

/// Search for a pattern in a file and display the lines that contain it.
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct BuildArgs {
    /// The path to um-react.zip.
    #[arg(short, long, default_value = "um-react.zip")]
    resource: std::path::PathBuf,

    /// The path to stub.
    #[arg(short = 't', long, default_value = "um-react-wry-stub.exe")]
    stub: std::path::PathBuf,

    // The path to final executable
    #[arg(short, long, default_value = "um-react.exe")]
    output: std::path::PathBuf,
}

fn main() {
    let args = BuildArgs::parse();

    let mut file_output = File::create(args.output).unwrap();

    {
        let mut vec_stub = vec![0u8; 0];
        File::open(args.stub)
            .unwrap()
            .read_to_end(&mut vec_stub)
            .unwrap();
        file_output.write_all(&vec_stub).unwrap();
    }

    {
        let mut vec_res = vec![0u8; 0];
        File::open(args.resource)
            .unwrap()
            .read_to_end(&mut vec_res)
            .unwrap();
        file_output.write_all(&mut vec_res).unwrap();

        let tail_payload_len = (vec_res.len() as u32).to_le_bytes();
        file_output.write_all(&tail_payload_len).unwrap();
    }

    println!("done!");
}
