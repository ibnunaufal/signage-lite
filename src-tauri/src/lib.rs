use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

#[cfg(windows)]
#[link(name = "kernel32")]
extern "system" {
    fn SetThreadExecutionState(flags: u32) -> u32;
}

/// Cegah layar sleep/screensaver selama signage tampil (dipanggil dari main thread).
fn keep_awake(on: bool) {
    #[cfg(windows)]
    unsafe {
        // ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED
        let flags: u32 = if on { 0x8000_0003 } else { 0x8000_0000 };
        SetThreadExecutionState(flags);
    }
    #[cfg(not(windows))]
    let _ = on;
}

/// Buka display window fullscreen.
/// - Extend (>1 monitor): di monitor lain selain tempat control window berada.
/// - Single/duplicate: di monitor yang sama dengan control window.
#[tauri::command]
async fn open_display(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("display") {
        let _ = w.set_focus();
        return Ok(());
    }

    let main = app.get_webview_window("main").ok_or("Control window tidak ditemukan")?;
    let monitors = main.available_monitors().map_err(|e| e.to_string())?;
    let current = main.current_monitor().map_err(|e| e.to_string())?;
    let cur_pos = current.as_ref().map(|m| (m.position().x, m.position().y));
    let extended = monitors.len() > 1;

    let other = if extended {
        monitors
            .iter()
            .find(|m| Some((m.position().x, m.position().y)) != cur_pos)
            .cloned()
    } else {
        None
    };
    let target = other
        .or(current)
        .or_else(|| monitors.first().cloned())
        .ok_or("Monitor tidak ditemukan")?;

    let win = WebviewWindowBuilder::new(&app, "display", WebviewUrl::App("display.html".into()))
        .title("Signage")
        .decorations(false)
        .resizable(false)
        .visible(false)
        .build()
        .map_err(|e| e.to_string())?;

    win.set_position(*target.position()).map_err(|e| e.to_string())?;
    win.set_size(*target.size()).map_err(|e| e.to_string())?;
    win.set_fullscreen(true).map_err(|e| e.to_string())?;
    win.show().map_err(|e| e.to_string())?;
    let _ = win.set_focus();

    let _ = app.run_on_main_thread(|| keep_awake(true));
    Ok(())
}

#[tauri::command]
async fn close_display(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("display") {
        w.destroy().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![open_display, close_display])
        .on_window_event(|window, event| match event {
            WindowEvent::Destroyed if window.label() == "display" => {
                keep_awake(false);
                if let Err(e) = window.app_handle().emit("display-closed", ()) {
                    eprintln!("Gagal memperbarui status tampilan: {e}");
                }
                if let Some(m) = window.app_handle().get_webview_window("main") {
                    let _ = m.show();
                    let _ = m.set_focus();
                }
            }
            WindowEvent::CloseRequested { .. } if window.label() == "main" => {
                window.app_handle().exit(0);
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running Signage Pin Sesi");
}
