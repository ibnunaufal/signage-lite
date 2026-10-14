# Signage Pin Sesi

Aplikasi signage Windows ringan (Tauri v2 + vanilla JS): jam, tanggal, 1-4 Pin Sesi, running text fade.

## Prasyarat
- Node.js 18+
- Rust (https://rustup.rs) + MSVC Build Tools (Visual Studio Build Tools, workload "Desktop development with C++")
- WebView2 Runtime (sudah ada di Windows 10/11 terbaru)

## Dev
```
npm install
npm run tauri dev
```

## Build installer (NSIS)
```
npm run tauri build
```
Hasil: `src-tauri/target/release/bundle/nsis/`

## Struktur
```
index.html, src/control.*   Control window (form setting, auto-save di localStorage)
display.html, src/display.* Display window (signage)
src/common.js               Default config, load/save
src-tauri/src/lib.rs        Command open_display / close_display, logika multi-monitor, cegah sleep
src-tauri/capabilities      Permission window
```

## Perilaku
- Extend (>1 monitor): signage fullscreen di monitor selain tempat control window; control window tetap tampil.
- Single/duplicate: signage fullscreen di monitor yang sama; control window tetap berjalan dan dapat dipilih kembali dengan Alt+Tab.
- Signage tidak selalu berada di atas aplikasi lain; tombol Tampilkan membawa signage ke depan, sedangkan Sembunyikan menutupnya.
- Exit: tombol kanan atas (semi-transparan, solid saat mouse digerakkan) atau Esc.
- Edit setting di control window saat signage tampil langsung ter-update (live) di mode extend.
- Padding tepi layar dapat diatur dari bagian Tampilan dalam Setting.
- Judul dan tombol Setting tetap terlihat saat halaman control digulir.

## Asumsi
- Setting disimpan di localStorage WebView2 (bukan plugin store) agar dependency minimal.
- Pin Sesi dianggap terisi jika judul atau isi tidak kosong.
- Ukuran font isi Pin Sesi diseragamkan antar Pin Sesi (mengikuti yang terkecil agar tidak overflow).
