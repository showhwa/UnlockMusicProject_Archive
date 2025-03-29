use wasm_bindgen::JsError;

#[derive(Debug)]
pub struct WasmError {
    error: anyhow::Error,
}

impl From<anyhow::Error> for WasmError {
    fn from(err: anyhow::Error) -> WasmError {
        WasmError { error: err }
    }
}

impl From<WasmError> for JsError {
    fn from(error: WasmError) -> Self {
        JsError::new(&error.error.to_string())
    }
}

pub fn map_js_error(error: anyhow::Error) -> wasm_bindgen::JsError {
    JsError::new(&error.to_string())
}
