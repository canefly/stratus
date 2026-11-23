use tauri_plugin_shell::ShellExt;

#[tauri::command]
async fn parse_document(
    app: tauri::AppHandle,
    path: String,
    image_path: Option<String>,
) -> Result<String, String> {
    let sidecar_command = app.shell().sidecar("parser").map_err(|e| e.to_string())?;
    let mut cmd = sidecar_command.arg(&path);
    if let Some(ipath) = image_path {
        if !ipath.is_empty() {
            cmd = cmd.arg(&ipath);
        }
    }
    let output = cmd.output().await.map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
        // Fallback to stdout if the script dumped JSON error to stdout but exited fine (though Python sys.exit(1) returns error status)
        if output.stdout.len() > 0 {
            return Ok(String::from_utf8_lossy(&output.stdout).to_string());
        }
        Err(err_msg)
    }
}

#[tauri::command]
async fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            parse_document,
            read_file_bytes
        ])
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
