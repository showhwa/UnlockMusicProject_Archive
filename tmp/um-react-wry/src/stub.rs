#![windows_subsystem = "windows"]

use std::collections::HashMap;
use std::fs::File;
use std::io::{BufReader, Read};
use std::io::{Cursor, Seek};
use std::path::Path;

#[cfg(target_os = "windows")]
use tao::platform::windows::WindowBuilderExtWindows;

use http::header::{CONTENT_LENGTH, CONTENT_TYPE};
use once_cell::sync::Lazy;
use tao::{
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoop},
    window::{Icon, WindowBuilder},
};
use wry::{WebContext, WebViewBuilder};
use zip::ZipArchive;

static APP_UUID: &str = "39abaebb-57b1-4c12-ab88-321fd7a93354";

static COMMON_MIMETYPES: Lazy<HashMap<&'static str, &'static str>> = Lazy::new(|| {
    let mut m = HashMap::new();
    m.insert("html", "text/html");
    m.insert("htm", "text/html");
    m.insert("js", "application/javascript");
    m.insert("mjs", "application/javascript");
    m.insert("json", "application/json");
    m.insert("jpg", "image/jpeg");
    m.insert("jpeg", "image/jpeg");
    m.insert("png", "image/png");
    m.insert("gif", "image/gif");
    m.insert("svg", "image/svg+xml");
    m.insert("webp", "image/webp");
    m.insert("woff", "font/woff");
    m.insert("woff2", "font/woff2");
    m.insert("avif", "image/avif");
    m.insert("ttf", "font/ttf");
    m.insert("otf", "font/otf");
    m.insert("eot", "application/vnd.ms-fontobject");
    m.insert("css", "text/css");
    m.insert("wasm", "application/wasm");
    m.insert("ico", "image/vnd.microsoft.icon");
    m
});

fn get_mimetype(ext: &str) -> &'static str {
    COMMON_MIMETYPES
        .get(ext)
        .unwrap_or(&"application/octet-stream")
}

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

    let window_builder = WindowBuilder::new()
        .with_title(format!("um-react-wry 桌面客户端 - {}", version_suffix))
        .with_maximized(true);

    #[cfg(target_os = "windows")]
    let window_builder = window_builder.with_taskbar_icon(Some(load_icon(include_bytes!("um-react@192.webp"))));

    let window = window_builder.build(&event_loop).unwrap();

    #[cfg(any(target_os = "windows", target_os = "linux"))]
    window.set_window_icon(Some(load_icon(include_bytes!("um-react@16.webp"))));

    let mut web_ctx = WebContext::new(Some(tmp_data_dir));
    #[cfg(any(target_os = "windows", target_os = "macos"))]
    let builder = WebViewBuilder::new_with_web_context(&mut web_ctx);

    let _webview = builder
        .with_url("umr://app/")
        .with_custom_protocol("umr".into(), move |_id, request| {
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
        .build(&window)
        .unwrap();

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

    let mimetype = if path.ends_with("/") {
        "text/html"
    } else {
        let ext = path.rsplit('.').next().unwrap_or("bin").to_lowercase();
        get_mimetype(&ext)
    };

    http::Response::builder()
        .header(CONTENT_TYPE, mimetype)
        .header(CONTENT_LENGTH, file_body.len())
        .header("X-Server", "um-react-wry-stub")
        .body(file_body.clone())
        .map_err(Into::into)
}
