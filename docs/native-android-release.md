# APK Android native — pemasangan berdampingan

Branch `native-android` membangun aplikasi Android Kotlin dan Jetpack Compose. Nama aplikasi pada launcher tetap **KataKecil**, dan nama berkas release adalah **KataKecil.apk**.

| Bagian | APK native | APK Capacitor |
| --- | --- | --- |
| Application ID | `id.karisyono.katakecil.nativeapp` | `id.karisyono.katakecil` |
| Label launcher | KataKecil | KataKecil |
| Berkas | `KataKecil.apk` | `KataKecil-<versi>-Karisyono.apk` |
| Metadata rilis | `KataKecil-native-release-info.json` | `KataKecil-release-info.json` |
| Penanda tangan | Kunci Karisyono yang sudah ada | Kunci Karisyono yang sudah ada |

ID paket yang berbeda memungkinkan keduanya dipasang bersamaan. Data dan pengaturan tersimpan di sandbox masing-masing aplikasi; APK native tidak mengambil alih atau menghapus data Capacitor. Pemindahan data melalui fitur backup/restore perlu diperiksa pengguna dan tidak berlangsung otomatis. Kedua aplikasi memakai logo dan label launcher yang sama sesuai permintaan pemilik.

Updater native hanya memilih aset `KataKecil.apk` beserta checksum-nya dari rilis repo ini. Nama itu tidak cocok dengan pola `KataKecil-...-Karisyono.apk` milik updater Capacitor. Pemeriksaan identitas paket dan sertifikat tetap berlaku. Untuk rilis berikutnya, naikkan versi/build serta unggah aset native yang sesuai pada rilis tersebut.

APK native pertama ditambahkan sebagai aset percobaan pada rilis **v1.2.3**. Rilis itu tetap membawa APK Capacitor aslinya. Status stable rilis Capacitor bukan pernyataan bahwa APK native sudah melewati QA perangkat. Metadata native menyatakan status prerelease dan mencatat commit source branch native; tag v1.2.3 sendiri tetap menunjuk source Capacitor yang semula.

## Build

Gunakan JDK21 dan Android SDK36. Kunci penandatanganan tidak berada dalam repo.

```sh
JAVA_HOME=/path/to/jdk21 \
ANDROID_HOME=/path/to/android-sdk \
KATAKECIL_SIGNING_DIR=/private/signing-folder \
node scripts/build-android.mjs --skip-qa
```

Build release, penandatanganan, zip alignment, checksum dan pemeriksaan metadata paket dilakukan untuk menyiapkan artefak. Tidak menjalankan suite QA atau pengujian UI/perangkat. Pemilik melakukan QA aplikasi native, termasuk pembacaan, impor EPUB, catatan, backup/restore dan updater.
