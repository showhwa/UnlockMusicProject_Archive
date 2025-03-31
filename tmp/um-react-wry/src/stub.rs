#![windows_subsystem = "windows"]

use std::collections::HashMap;
use std::fs::File;
use std::io::{BufReader, Read};
use std::io::{Cursor, Seek};
use std::path::Path;

#[cfg(target_os = "windows")]
use tao::platform::windows::WindowBuilderExtWindows;

use tao::{
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoop},
    window::{Icon, WindowBuilder},
};
use wry::{http::header::CONTENT_TYPE, WebContext, WebViewBuilder};
use zip::ZipArchive;

static APP_UUID: &str = "39abaebb-57b1-4c12-ab88-321fd7a93354";

fn parse_zip<R: Read + Seek>(reader: R) -> HashMap<String, Vec<u8>> {
    let mut archive = ZipArchive::new(reader).expect("Failed to open ZIP archive");
    let mut result = HashMap::new();

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .expect("Failed to get file from ZIP archive");
        let mut content = Vec::new();
        file.read_to_end(&mut content)
            .expect("Failed to read file content");
        result.insert(file.name().to_string(), content);
    }

    result
}

fn parse_external_zip(path: &Path) -> std::io::Result<HashMap<String, Vec<u8>>> {
    let file = File::open(path)?;
    let buf_reader = BufReader::new(file);
    Ok(parse_zip(buf_reader))
}

fn parse_tail_zip(path: &Path) -> std::io::Result<HashMap<String, Vec<u8>>> {
    let mut file = File::open(path)?;
    file.seek(std::io::SeekFrom::End(-4))?;
    let mut buffer = [0u8; 4];
    file.read_exact(&mut buffer)?;
    let zip_len: i64 = u32::from_le_bytes(buffer).into();
    file.seek(std::io::SeekFrom::End(-4 - zip_len))?;
    let mut zip_buffer = vec![0u8; 0];
    file.take(zip_len as u64).read_to_end(&mut zip_buffer)?;
    Ok(parse_zip(Cursor::new(zip_buffer)))
}

fn load_icon(bytes: &[u8]) -> Icon {
    let (icon_rgba, icon_width, icon_height) = {
        let image = image::load_from_memory(bytes).unwrap();
        let image = image.into_rgba8();
        let (width, height) = image.dimensions();
        let rgba = image.into_raw();
        (rgba, width, height)
    };
    Icon::from_rgba(icon_rgba, icon_width, icon_height).expect("Failed to open icon")
}

fn main() -> wry::Result<()> {
    let tmp_data_dir = dirs::cache_dir()
        .unwrap()
        .join(format!("um-react!{}", APP_UUID));
    let exe_path = std::env::current_exe().unwrap();
    let um_react_external = exe_path.parent().unwrap().join("um-react.zip");
    let zip_content = if cfg!(debug_assertions) && um_react_external.exists() {
        // debug/prod: override by reading from external zip archive
        parse_external_zip(&um_react_external).unwrap()
    } else {
        parse_tail_zip(&exe_path).unwrap()
    };

    let version_suffix = if let Some(version_txt) = zip_content.get("version.txt") {
        format!("v{}", String::from_utf8_lossy(version_txt).trim())
    } else {
        "未知版本".into()
    };

    let event_loop = EventLoop::new();
    let window = WindowBuilder::new()
        .with_title(format!("um-react-wry 桌面客户端 - {}", version_suffix))
        .with_maximized(true);

    #[cfg(target_os = "windows")]
    let window = window.with_taskbar_icon(Some(load_icon(include_bytes!("um-react@192.webp"))));

    let window = window.build(&event_loop).unwrap();

    #[cfg(any(target_os = "windows", target_os = "linux"))]
    window.set_window_icon(Some(load_icon(include_bytes!("um-react@16.webp"))));

    #[cfg(any(
        target_os = "windows",
        target_os = "macos",
        target_os = "ios",
        target_os = "android"
    ))]
    let builder = WebViewBuilder::new(&window);

    #[cfg(not(any(
        target_os = "windows",
        target_os = "macos",
        target_os = "ios",
        target_os = "android"
    )))]
    let builder = {
        use tao::platform::unix::WindowExtUnix;
        use wry::WebViewBuilderExtUnix;
        let vbox = window.default_vbox().unwrap();
        WebViewBuilder::new_gtk(vbox)
    };

    let mut web_ctx = WebContext::new(Some(tmp_data_dir));
    let _webview = builder
        .with_web_context(&mut web_ctx)
        .with_url("umr://app/index.html")?
        .with_custom_protocol("umr".into(), move |request| {
            match get_umr_resource(request, &zip_content) {
                Ok(r) => r.map(Into::into),
                Err(e) => http::Response::builder()
                    .header(CONTENT_TYPE, "text/plain")
                    .status(500)
                    .body(e.to_string().as_bytes().to_vec())
                    .unwrap()
                    .map(Into::into),
            }
        })
        .build()?;

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;

        if let Event::WindowEvent {
            event: WindowEvent::CloseRequested,
            ..
        } = event
        {
            *control_flow = ControlFlow::Exit
        }
    });
}

fn get_umr_resource(
    request: wry::http::Request<Vec<u8>>,
    zip_content: &HashMap<String, Vec<u8>>,
) -> Result<http::Response<Vec<u8>>, Box<dyn std::error::Error>> {
    let path = request.uri().path();
    let path = if path == "/" {
        "index.html"
    } else {
        &path[1..]
    };

    println!("GET {}", path);
    let file_body = zip_content
        .get(path)
        .or_else(|| zip_content.get("index.html"))
        .ok_or("file not found in zip")?;

    let mimetype = if path.ends_with(".html") || path.ends_with("/") {
        "text/html"
    } else if path.ends_with(".js") {
        "application/javascript"
    } else if path.ends_with(".wasm") {
        "application/wasm"
    } else if path.ends_with(".ico") {
        "image/vnd.microsoft.icon"
    } else {
        "application/octet-stream"
    };

    http::Response::builder()
        .header(CONTENT_TYPE, mimetype)
        .body(file_body.clone())
        .map_err(Into::into)
}
