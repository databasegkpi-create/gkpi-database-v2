
  // Fungsi Pemuat Pustaka PDF Secara Dinamis
window.muatLibraryPDF = async function() {
    if (typeof window.jspdf !== 'undefined') return true; 
    
    Swal.fire({ title: 'Menyiapkan Cetak PDF...', text: 'Mengunduh pustaka (hanya sekali)...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    try {
        await new Promise((res, rej) => { const s = document.createElement('script'); s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
        await new Promise((res, rej) => { const s = document.createElement('script'); s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
        Swal.close();
        return true;
    } catch(err) {
        Swal.fire('Error', 'Gagal memuat pustaka PDF. Periksa koneksi internet Anda.', 'error');
        return false;
    }
};

  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxYnIaYGBjpKR8efmRqOGu9FPbydSTh1FeN6im856IWRXdC1QvHDDY8Kp5w3lU0p9T6/exec";
  const SECRET_API_KEY = "GKPI_HUB_SECURE_2026";

// TAMBAHKAN TEPAT DI SINI (Di luar dari fungsi apapun)
const supabaseUrl = 'https://qhvfrcriptbyunmduizu.supabase.co';
const supabaseKey = 'sb_publishable_WThfxNW0WuJww3EMOOljXA_aro1-pB4';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

  let DATA_MASTER = { majelis: [], gereja: [], jabatan: [], jemaat: [], petugas: [], log: [] };
  let EDIT_MODE_ID = null;
  let USER_NOW = null;
  let chartWilayahInstance = null, chartJabatanInstance = null;
  let leafletMap = null;
  let currentPageMajelis = 1; let currentPageGereja = 1; let currentPageIndividu = 1; let currentPageJemaat = 1; let currentPageLog = 1;
  let currentTreeData = {}; 
  const itemsPerPage = 20; const itemsPerLogPage = 15;
  // FUNGSI BARU: Injeksi skrip berat secara diam-diam setelah login
  let isLibrariesLoaded = false;
  function muatLibraryBerat(callback) {
      if (isLibrariesLoaded) { if(callback) callback(); return; }
      
      Swal.fire({ title: 'Menyiapkan Workspace...', text: 'Memuat modul grafik dan dokumen...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      
      const scripts = [
          "https://cdn.jsdelivr.net/npm/chart.js",
          "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js",
          "https://cdn.jsdelivr.net/npm/tom-select@2.3.1/dist/js/tom-select.complete.min.js",
          "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
          "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js",
          "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js",
          "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      ];
      
      let loadedCount = 0;
      scripts.forEach(src => {
          let s = document.createElement('script');
          s.src = src;
          s.onload = () => {
              loadedCount++;
              if (loadedCount === scripts.length) {
                  isLibrariesLoaded = true;
                  Swal.close();
                  if(callback) callback();
              }
          };
          document.body.appendChild(s);
      });
  }

  function safeSetText(id, text) { const el = document.getElementById(id); if (el) el.innerText = text; }
  function safeSetHTML(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }
  function safeSetValue(id, val) { const el = document.getElementById(id); if (el) el.value = val; }

  window.parseDateSafe = function(tgl) {
      if (!tgl) return null;
      if (tgl instanceof Date && !isNaN(tgl.getTime())) return tgl;
      if (typeof tgl === 'string' && tgl.includes('T') && tgl.includes('Z')) { let d = new Date(tgl); if (!isNaN(d.getTime())) return d; }
      let numTgl = Number(tgl);
      if (!isNaN(numTgl) && String(tgl).trim() !== "") return new Date(Math.round((numTgl - 25569) * 86400 * 1000));
      let str = String(tgl).trim().substring(0, 10); let parts = str.split(/[-/]/); 
      if (parts.length >= 3) {
          let p0 = parseInt(parts[0], 10); let p1 = parseInt(parts[1], 10); let p2 = parseInt(parts[2], 10);
          if (String(parts[0]).length === 4) return new Date(p0, p1 - 1, p2);
          else if (String(parts[2]).length === 4) return new Date(p2, p1 - 1, p0);
      }
      let d = new Date(tgl); if (!isNaN(d.getTime())) return d; return null;
  };
  function hitungUmur(tgl) {
      if(!tgl) return "-"; let d = window.parseDateSafe(tgl);
      if(!d || isNaN(d.getTime())) return "-"; return Math.abs(new Date(Date.now() - d.getTime()).getUTCFullYear() - 1970) + " Thn";
  }

  // --- FUNGSI JEMBATAN API (TANGGUH & ANTI BADAI GOOGLE) ---
 async function apiCall(action, payload = {}) {
    try {
        // --- SISTEM LOGIN & ADMIN ---
        if (action === 'checkLogin') {
            const { data, error } = await supabase.from('petugas').select('*').eq('username', payload.username).eq('password_hash', payload.password).single();
            if (error || !data) return { status: 'fail' };
            return { status: 'success', nama: data.nama_lengkap, role: data.role, username: data.username };
        }
        if (action === 'getListPetugas') {
            const { data, error } = await supabase.from('petugas').select('*');
            if (error) throw error; return data.map(p => ({ Nama: p.nama_lengkap, Username: p.username, Role: p.role }));
        }

        // --- MAJELIS ---
        if (action === 'simpanMajelis') {
            const { error } = await supabase.from('majelis').insert([{ id_majelis: "M" + Date.now().toString().slice(-6), nama_lengkap: payload.Nama_Lengkap, jabatan: payload.Jabatan, nama_gereja: payload.Nama_Gereja, resort: payload.Resort, wilayah: payload.Wilayah, no_hp: payload.No_HP }]);
            if (error) throw error; return { status: 'success' };
        }
        if (action === 'updateMajelis') {
            const { error } = await supabase.from('majelis').update({ nama_lengkap: payload.Nama_Lengkap, jabatan: payload.Jabatan, nama_gereja: payload.Nama_Gereja, resort: payload.Resort, wilayah: payload.Wilayah, no_hp: payload.No_HP }).eq('id_majelis', payload.ID_Majelis);
            if (error) throw error; return { status: 'success' };
        }
        if (action === 'mutasiPersonil') {
            const { error } = await supabase.from('majelis').update({ nama_gereja: payload.Nama_Gereja_Baru, resort: payload.Resort_Baru, wilayah: payload.Wilayah_Baru }).eq('id_majelis', payload.ID_Majelis);
            if (error) throw error; return { status: 'success', message: 'Personil dimutasi' };
        }
        if (action === 'hapusMajelis') {
            const { error } = await supabase.from('majelis').delete().eq('id_majelis', payload.id);
            if (error) throw error; return { status: 'success' };
        }
        if (action === 'importMajelisMassal') {
            const arr = payload.excelData.map(m => ({ id_majelis: "M" + Math.floor(Math.random()*1000000), nama_lengkap: m.Nama_Lengkap, jabatan: m.Jabatan, nama_gereja: m.Nama_Gereja, resort: m.Resort, wilayah: m.Wilayah, no_hp: m.No_HP }));
            const { error } = await supabase.from('majelis').insert(arr);
            if (error) throw error; return { status: 'success', added: arr.length };
        }

        // --- JEMAAT ---
        if (action === 'simpanJemaat') {
            const { error } = await supabase.from('jemaat').insert([{ id_jemaat: "J" + Date.now(), no_kk: payload.No_KK, nama_lengkap: payload.Nama_Lengkap, status_keluarga: payload.Status_Keluarga, jenis_kelamin: payload.Jenis_Kelamin, tanggal_lahir: payload.Tanggal_Lahir, pekerjaan: payload.Pekerjaan, kondisi: payload.Kondisi, nama_gereja: payload.Nama_Gereja, resort: payload.Resort, wilayah: payload.Wilayah }]);
            if (error) throw error; return { status: 'success' };
        }
        if (action === 'updateJemaat') {
            const { error } = await supabase.from('jemaat').update({ no_kk: payload.No_KK, nama_lengkap: payload.Nama_Lengkap, status_keluarga: payload.Status_Keluarga, jenis_kelamin: payload.Jenis_Kelamin, tanggal_lahir: payload.Tanggal_Lahir, pekerjaan: payload.Pekerjaan, kondisi: payload.Kondisi, nama_gereja: payload.Nama_Gereja, resort: payload.Resort, wilayah: payload.Wilayah }).eq('id_jemaat', payload.ID_Jemaat);
            if (error) throw error; return { status: 'success' };
        }
        if (action === 'hapusJemaat') {
            const { error } = await supabase.from('jemaat').delete().eq('id_jemaat', payload.id);
            if (error) throw error; return { status: 'success' };
        }
        if (action === 'hapusKeluarga') {
            const { error } = await supabase.from('jemaat').delete().eq('no_kk', payload.no_kk);
            if (error) throw error; return { status: 'success' };
        }

        // --- KORWIL ---
        if (action === 'simpanKorwil') {
            const { error } = await supabase.from('korwil').insert([{ id_korwil: "W" + payload.Wilayah + Date.now().toString().slice(-4), nama_korwil: payload.Nama_Korwil, wilayah: payload.Wilayah, no_hp: payload.No_HP, status: payload.Status, keterangan: payload.Keterangan }]);
            if (error) throw error; return { status: 'success' };
        }
        if (action === 'updateKorwil') {
            const { error } = await supabase.from('korwil').update({ nama_korwil: payload.Nama_Korwil, wilayah: payload.Wilayah, no_hp: payload.No_HP, status: payload.Status, keterangan: payload.Keterangan }).eq('id_korwil', payload.ID_Korwil);
            if (error) throw error; return { status: 'success' };
        }
        if (action === 'hapusKorwil') {
            const { error } = await supabase.from('korwil').delete().eq('id_korwil', payload.id);
            if (error) throw error; return { status: 'success' };
        }

        // --- GEREJA ---
        if (action === 'updateDataGereja') {
            const { error } = await supabase.from('gereja').update({
                nama_gereja: payload.obj.Nama_Gereja_Baru, status_gereja: payload.obj.Status_Gereja, induk_resort: payload.obj.Induk_Resort, total_rt: payload.obj.Total_RT, total_jiwa: payload.obj.Total_Jiwa, latitude: payload.obj.Latitude, longitude: payload.obj.Longitude, no_register: payload.obj.No_Register, tanggal_berdiri: payload.obj.Tanggal_Berdiri
            }).eq('nama_gereja', payload.obj.Nama_Gereja_Lama);
            if (error) throw error;
            if (payload.obj.Nama_Gereja_Lama !== payload.obj.Nama_Gereja_Baru) {
                await supabase.from('majelis').update({nama_gereja: payload.obj.Nama_Gereja_Baru}).eq('nama_gereja', payload.obj.Nama_Gereja_Lama);
                await supabase.from('jemaat').update({nama_gereja: payload.obj.Nama_Gereja_Baru}).eq('nama_gereja', payload.obj.Nama_Gereja_Lama);
            }
            return { status: 'success' };
        }

        // --- LOG AKTIVITAS ---
        if (action === 'catatLogEvent') {
            await supabase.from('log_aktivitas').insert([{ username: USER_NOW ? USER_NOW.nama : 'Sistem', role: USER_NOW ? USER_NOW.role : '', aksi: payload.aksi, detail: payload.detail }]);
            return { status: 'success' };
        }

        return { status: 'success', message: 'Tindakan selesai' };
    } catch (error) {
        console.error("Supabase Error (" + action + "):", error);
        throw new Error(error.message || "Gagal memproses data.");
    }
}
  function toggleDarkMode() { document.documentElement.classList.toggle('dark'); localStorage.setItem('gkpi_dark_mode', document.documentElement.classList.contains('dark')); updateDarkModeIcon(); }
  function updateDarkModeIcon() { const btn = document.getElementById('btnDarkMode'); const icon = btn.querySelector('i'); if(document.documentElement.classList.contains('dark')) { icon.className = 'fas fa-sun text-amber-400'; } else { icon.className = 'fas fa-moon'; } }

function handleLogin(e) {
    // Pastikan default form submission dicegah
    if(e && e.preventDefault) e.preventDefault(); 
    
    const u = document.getElementById('user').value.trim(); 
    const p = document.getElementById('pass').value.trim(); 
    const btn = document.getElementById('btnLogin');
    
    // Simpan teks asli jika tombol ada
    const originalText = btn ? btn.innerHTML : 'Sign in <i class="fas fa-arrow-right text-xs pointer-events-none"></i>';
    
    // Validasi Kosong
    if (!u || !p) {
        Swal.fire({
            icon: 'warning',
            title: 'Perhatian!',
            text: 'Username dan Password tidak boleh kosong.',
            confirmButtonColor: '#4f46e5'
        });
        return;
    }

    // Jika elemen tombol ditemukan, ubah statusnya
    if (btn) {
        btn.disabled = true; 
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> MEMERIKSA...';
    }
    
    apiCall('checkLogin', {username: u, password: p}).then(res => { 
        if (res.status === 'success') { 
            USER_NOW = res; 
            localStorage.setItem('si_majelis_user', JSON.stringify(res)); 
            
            // Catat log (jangan hentikan proses jika gagal)
            apiCall('catatLogEvent', { aksi: "LOGIN", sumber: "Sistem Auth", detail: "Akun berhasil masuk: " + res.nama }).catch(e=>{ console.log("Gagal catat log"); });
            
            showMainApp(); 
muatLibraryBerat(() => { loadData(); });

          
        } else if (res.status === 'fail') { 
            Swal.fire('Gagal Login', 'Username atau Password salah!', 'error'); 
            if(btn) { btn.disabled = false; btn.innerHTML = originalText; }
        } else { 
            Swal.fire('Error Server', res.message || 'Database Petugas bermasalah.', 'error'); 
            if(btn) { btn.disabled = false; btn.innerHTML = originalText; }
        }
      }).catch(err => { 
          Swal.fire('Error Koneksi', String(err), 'error'); 
          if(btn) { btn.disabled = false; btn.innerHTML = originalText; }
      });
  }

  function handleLogout() { 
      Swal.fire({ title: 'Keluar dari sistem?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#4f46e5', confirmButtonText: 'Ya, Keluar!' }).then((result) => { 
          if (result.isConfirmed) { 
              Swal.fire({ title: 'Menutup sesi...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
              // PERBAIKAN: Bersihkan localStorage
              if(USER_NOW) { apiCall('catatLogEvent', { aksi: "LOGOUT", sumber: "Sistem Auth", detail: "Akun keluar: " + USER_NOW.nama }).finally(() => { localStorage.removeItem('si_majelis_user'); location.reload(); });
              } else { localStorage.removeItem('si_majelis_user'); location.reload(); }
          } 
      }); 
  }

  function showMainApp() {
    if(document.getElementById('loginPage')) document.getElementById('loginPage').classList.add('hidden'); 
    if(document.getElementById('mainApp')) document.getElementById('mainApp').classList.remove('hidden'); 
    safeSetText('userNameLabel', USER_NOW.nama || 'Pengguna');
    const roleSafe = String(USER_NOW.role).toLowerCase(); 
    const btnAdmin = document.getElementById('btnAdmin'); if (btnAdmin) { if (roleSafe.includes('admin')) btnAdmin.classList.remove('hidden'); else btnAdmin.classList.add('hidden'); }
    const btnLog = document.getElementById('btnLog'); if (btnLog) { if (roleSafe.includes('admin')) btnLog.classList.remove('hidden'); else btnLog.classList.add('hidden'); }
    const elemenDilarangUntukViewer = ['btnTopTambah', 'btnTabTambahJemaat', 'btnTabImportJemaat', 'btnTabImportMajelis', 'btnTabBlastWA'];
    if (roleSafe === 'viewer') { elemenDilarangUntukViewer.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; }); } 
    else { elemenDilarangUntukViewer.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'flex'; }); }
  }

  // MESIN 1: Menarik & Menyimpan Data (Versi Big Data IndexedDB)
  async function loadData(forceRefresh = false) {
      if (!forceRefresh) {
          try {
              // Membaca dari IndexedDB (Mampu menampung ratusan MB data instan)
              const cachedData = await localforage.getItem('gkpi_data_cache');
              if (cachedData && cachedData.gereja && cachedData.gereja.length > 0) {
                  DATA_MASTER = cachedData;
                  eksekusiRenderEstafet(); 
                  tarikDariServer(false); // Update siluman di latar belakang
                  return;
              }
          } catch(e) { console.log("Cache kosong, menarik data baru..."); }
      }

      Swal.fire({ title: 'Menyinkronkan Data...', html: 'Mengunduh puluhan ribu data...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      if(document.getElementById('majelisAccordionContainer')) document.getElementById('majelisAccordionContainer').innerHTML = Array(6).fill(`<div class="skeleton h-24 w-full rounded-[1.5rem]"></div>`).join('');
      
      tarikDariServer(true);
  }
async function tarikDariServer(tutupLoadingScreen) {
    try {
        // Menarik 5 Tabel Utama secara Paralel (Meningkatkan Kecepatan Load)
        const [rGereja, rMajelis, rJemaat, rKorwil, rLog] = await Promise.all([
            supabase.from('gereja').select('*'),
            supabase.from('majelis').select('*'),
            supabase.from('jemaat').select('*'),
            supabase.from('korwil').select('*'),
            supabase.from('log_aktivitas').select('*').order('waktu', { ascending: false }).limit(200)
        ]);

        if (rGereja.error) throw rGereja.error;

        // Jembatan Penerjemah: Mengubah format Supabase ke format Kapital aplikasi Anda
        DATA_MASTER = {
            gereja: rGereja.data.map(g => ({ Id_Gereja: g.id_gereja, Wilayah: g.wilayah, Induk_Resort: g.induk_resort, Resort: g.induk_resort, Nama_Gereja: g.nama_gereja, Status_Gereja: g.status_gereja, Tipe_Gereja: g.status_gereja, Total_RT: g.total_rt, Total_Jiwa: g.total_jiwa, Latitude: g.latitude, Longitude: g.longitude, No_Register: g.no_register, Tanggal_Berdiri: g.tanggal_berdiri })),
            majelis: rMajelis.data.map(m => ({ ID_Majelis: m.id_majelis, Nama_Lengkap: m.nama_lengkap, Jabatan: m.jabatan, Nama_Gereja: m.nama_gereja, Resort: m.resort, Wilayah: m.wilayah, No_HP: m.no_hp })),
            jemaat: rJemaat.data.map(j => ({ ID_Jemaat: j.id_jemaat, No_KK: j.no_kk, Nama_Lengkap: j.nama_lengkap, Status_Keluarga: j.status_keluarga, Jenis_Kelamin: j.jenis_kelamin, Tanggal_Lahir: j.tanggal_lahir, Pekerjaan: j.pekerjaan, Kondisi: j.kondisi, Nama_Gereja: j.nama_gereja, Resort: j.resort, Wilayah: j.wilayah })),
            korwil: rKorwil.data.map(k => ({ ID_Korwil: k.id_korwil, Nama_Korwil: k.nama_korwil, Wilayah: k.wilayah, No_HP: k.no_hp, Status: k.status, Keterangan: k.keterangan })),
            log: rLog.data.map(l => ({ Waktu: l.waktu, Aksi: l.aksi, Sumber: "Dashboard Pusat", Detail: l.detail })),
            jabatan: [...new Set((rMajelis.data||[]).map(m => m.jabatan))].map(j => ({ Nama_Jabatan: j })),
            petugas: [] 
        };

        try { await localforage.setItem('gkpi_data_cache', DATA_MASTER); } catch(e) {}
        eksekusiRenderEstafet();

        if(tutupLoadingScreen) { Swal.close(); const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }); Toast.fire({ icon: 'success', title: 'Data Supabase Tersinkronisasi!' }); }
    } catch (err) {
        if(tutupLoadingScreen) { setTimeout(() => { Swal.fire({ icon: 'error', title: 'Koneksi Database Gagal', html: String(err.message) }); }, 500); }
    }
}

// MESIN 2: Rendering Bertahap (Anti-Freeze & Auto-Refresh Checklist)
function eksekusiRenderEstafet() {
    const curW = document.getElementById('filterWilayah')?.value || ""; const curR = document.getElementById('filterResort')?.value || "";
    const curG = document.getElementById('filterGereja')?.value || ""; const curJ = document.getElementById('filterJabatan')?.value || "";
    const curWJ = document.getElementById('f_wil_j')?.value || "";
    
    // Tahap 1: Filter & Statistik (Langsung)
    setTimeout(() => { 
        renderHomeStats(); setupFilters(); 
        if(curW) safeSetValue('filterWilayah', curW); syncFilterResort();
        if(curR) safeSetValue('filterResort', curR); syncFilterGereja();
        if(curG) safeSetValue('filterGereja', curG);
        if(curJ) safeSetValue('filterJabatan', curJ);
        if(curWJ) safeSetValue('f_wil_j', curWJ); syncResortJemaatPage();
    }, 0);

    // Tahap 2: Tabel Majelis & KORWIL (Jeda 50ms)
      setTimeout(() => { 
          filterTabel(); 
          
          // ---> TAMBAHAN BARU: Cek tab mana yang aktif, lalu render data Korwil
          const tabKorwilAktif = document.getElementById('kontenKorwil') && !document.getElementById('kontenKorwil').classList.contains('hidden');
          
          if (tabKorwilAktif && typeof renderDataKorwil === 'function') {
              renderDataKorwil(); 
          }
      }, 50);

// Tahap 3: Tabel Jemaat & Keluarga (Jeda 150ms)
// setTimeout(() => { filterTabelJemaat(); }, 150);

    // Tahap 4: Log Aktivitas, Admin, CHECKLIST & E-ARSIP (Jeda 250ms)
    setTimeout(() => { 
        renderTabelLogAktivitas(); 
        if(document.getElementById('pageAdmin') && !document.getElementById('pageAdmin').classList.contains('hidden')) loadListPetugas(); 
        if(document.getElementById('pageChecklist') && !document.getElementById('pageChecklist').classList.contains('hidden')) { if(typeof window.renderTabelChecklist === 'function') window.renderTabelChecklist(false); }

        if(typeof renderRakArsip === 'function') renderRakArsip();
        tarikArsipDariServer();
    }, 250);
}

  // TAMBAHKAN FUNGSI INI DI BAWAHNYA:
  function tarikArsipDariServer() {
      apiCall('getArsipDatabase').then(res => {
          if (res && res.status === 'success' && res.data) {
              DATA_ARSIP = res.data; // Sinkronkan data memori dengan server
              localStorage.setItem('gkpi_arsip_db', JSON.stringify(DATA_ARSIP));
              
              // Segarkan tampilan rak & brankas jika sedang dibuka
              if(!document.getElementById('pageArsip').classList.contains('hidden')) renderRakArsip();
              if(!document.getElementById('pageBrankas').classList.contains('hidden')) renderDataBrankas();
          }
      }).catch(e => console.log("Gagal tarik arsip:", e));
  }
  window.bukaAboutApp = function() {
      const modal = document.getElementById('modalAboutApp');
      if(modal) {
          modal.classList.remove('hidden');
          modal.style.zIndex = "999999"; // Memastikan pop-up menimpa layar paling depan
      }
  };
  
  function renderMap() {
    try {
      if (leafletMap !== null) leafletMap.remove();
      if (!document.getElementById('mapWilayah')) return;
      
      leafletMap = L.map('mapWilayah').setView([2.5, 99.1], 7); 
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(leafletMap);

      let markerCount = 0; let latSum = 0, lngSum = 0;

      // =======================================================
      // PALET WARNA WILAYAH (1 sampai 12)
      // Menggunakan kombinasi warna berkelas (Border & Fill)
      // =======================================================
      const warnaWilayah = {
          1: { border: '#e11d48', fill: '#fb7185' }, // W1: Rose (Merah Muda)
          2: { border: '#ea580c', fill: '#fb923c' }, // W2: Orange (Jingga)
          3: { border: '#d97706', fill: '#fbbf24' }, // W3: Amber (Kuning Emas)
          4: { border: '#059669', fill: '#34d399' }, // W4: Emerald (Hijau Zamrud)
          5: { border: '#0d9488', fill: '#2dd4bf' }, // W5: Teal (Hijau Tosca)
          6: { border: '#0891b2', fill: '#22d3ee' }, // W6: Cyan (Biru Muda)
          7: { border: '#2563eb', fill: '#60a5fa' }, // W7: Blue (Biru Laut)
          8: { border: '#4f46e5', fill: '#818cf8' }, // W8: Indigo (Nila)
          9: { border: '#7c3aed', fill: '#a78bfa' }, // W9: Violet (Ungu Cerah)
          10:{ border: '#c026d3', fill: '#e879f9' }, // W10: Fuchsia (Merah Keunguan)
          11:{ border: '#db2777', fill: '#f472b6' }, // W11: Pink (Merah Jambu)
          12:{ border: '#475569', fill: '#94a3b8' }  // W12: Slate (Abu-abu Biru)
      };
      
      DATA_MASTER.gereja.forEach(g => {
        let rawLat = String(g.Latitude || g.latitude || '').replace(/,/g, '.'); 
        let rawLng = String(g.Longitude || g.longitude || '').replace(/,/g, '.');
        
        let lat = parseFloat(rawLat); 
        let lng = parseFloat(rawLng);

        // Pastikan format kordinat wajar
        if (!isNaN(lat) && !isNaN(lng) && lat >= -15 && lat <= 15 && lng >= 90 && lng <= 150) {
          markerCount++; latSum += lat; lngSum += lng;
          
          // Ambil angka wilayah dan pilih warnanya
          let noWilayah = parseInt(String(g.Wilayah).replace(/\D/g, ''));
          let warna = warnaWilayah[noWilayah] || { border: '#4f46e5', fill: '#3b82f6' }; // Default Biru jika kosong/salah
          
          L.circleMarker([lat, lng], { 
              color: warna.border, 
              fillColor: warna.fill, 
              fillOpacity: 0.85, 
              radius: 8, 
              weight: 2 
          }).addTo(leafletMap).bindPopup(
              `<div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 180px;">
                  <div style="background:${warna.border}; color:white; font-size:9px; font-weight:900; padding:3px 8px; border-radius:6px; display:inline-block; margin-bottom:6px; text-transform:uppercase; letter-spacing:1px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">Wilayah ${noWilayah || '-'}</div>
                  <h4 style="font-weight: 800; color: #1e293b; margin: 0 0 3px 0; font-size: 13px; line-height:1.2;">${g.Nama_Gereja||'Unit'}</h4>
                  <p style="margin: 0; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">${g.Induk_Resort || g.Resort || 'Jemaat Khusus'}</p>
              </div>`
          );
        }
      });

      if (markerCount > 0) {
          leafletMap.setView([latSum / markerCount, lngSum / markerCount], markerCount === 1 ? 12 : 7);
      }
    } catch (e) { console.error("Gagal memuat peta:", e); }
  }
  function renderHomeStats() {
    let totRT = 0, totJiwa = 0; DATA_MASTER.gereja.forEach(g => { totRT += parseInt(g.Total_RT)||0; totJiwa += parseInt(g.Total_Jiwa)||0; });
    safeSetText('statTotalGereja', DATA_MASTER.gereja.length); safeSetText('statTotalMajelis', DATA_MASTER.majelis.length);
    safeSetText('statTotalRT', totRT.toLocaleString('id-ID')); safeSetText('statTotalJiwa', totJiwa.toLocaleString('id-ID'));
    safeSetText('pdfTotalGereja', DATA_MASTER.gereja.length); safeSetText('pdfTotalMajelis', DATA_MASTER.majelis.length);
    safeSetText('pdfTotalKK', totRT.toLocaleString('id-ID')); safeSetText('pdfTotalJiwa', totJiwa.toLocaleString('id-ID'));
    safeSetText('previewDate', "Diperbarui: " + new Date().toLocaleString('id-ID'));

    let TARGET_MAJELIS = DATA_MASTER.gereja.length * DATA_MASTER.jabatan.filter(j => j.Nama_Jabatan).length;
    if(TARGET_MAJELIS === 0) TARGET_MAJELIS = 1; 
    let persentase = (DATA_MASTER.majelis.length / TARGET_MAJELIS) * 100; if(persentase > 100) persentase = 100; 

    // --- TAMBAHAN UNTUK UPDATE STATISTIK KORWIL DI DASHBOARD PUSAT ---
    if (DATA_MASTER.korwil) {
        const korwilAktif = DATA_MASTER.korwil.filter(k => k.Status === 'Aktif').length;
        safeSetText('statTotalKorwil', DATA_MASTER.korwil.length);
        safeSetText('statKorwilAktif', `(${korwilAktif} Aktif)`);
    }

    if(document.getElementById('persentaseData')) document.getElementById('persentaseData').innerText = persentase.toFixed(1) + "%";
    if(document.getElementById('barProgressData')) document.getElementById('barProgressData').style.width = persentase + "%";
    if(document.getElementById('labelTerkumpul')) document.getElementById('labelTerkumpul').innerText = DATA_MASTER.majelis.length.toLocaleString('id-ID');
    if(document.getElementById('labelTarget')) document.getElementById('labelTarget').innerText = TARGET_MAJELIS.toLocaleString('id-ID');

    const statsJ = {}; DATA_MASTER.jabatan.forEach(j => { if(j.Nama_Jabatan) statsJ[j.Nama_Jabatan] = 0; }); DATA_MASTER.majelis.forEach(m => { if(m.Jabatan && statsJ[m.Jabatan] !== undefined) statsJ[m.Jabatan]++; });
    if(document.getElementById('jobStatsGrid')) safeSetHTML('jobStatsGrid', Object.keys(statsJ).map(k => `<div class="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow"><p class="text-[10px] font-bold text-slate-500 uppercase leading-tight w-2/3">${k}</p><p class="text-xl font-black text-indigo-600 bg-indigo-50 w-10 h-10 rounded-xl flex items-center justify-center">${statsJ[k]}</p></div>`).join(''));
    const statsW = Array(12).fill(0); DATA_MASTER.majelis.forEach(m => { const w = parseInt(m.Wilayah); if(w >= 1 && w <= 12) statsW[w-1]++; });
    initCharts(statsW, statsJ); renderMap();
  }

  function initCharts(dataW, statsJ) {
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif"; Chart.defaults.animation = false; 
    if(document.getElementById('chartWilayah')) {
       const ctxW = document.getElementById('chartWilayah').getContext('2d'); if(chartWilayahInstance) chartWilayahInstance.destroy();
       chartWilayahInstance = new Chart(ctxW, { type: 'bar', data: { labels: Array.from({length: 12}, (_, i) => `W-${i+1}`), datasets: [{ data: dataW, backgroundColor: '#6366f1', borderRadius: 6, barPercentage: 0.6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { display: false } } } });
    }
    if(document.getElementById('chartJabatan')) {
       const ctxJ = document.getElementById('chartJabatan').getContext('2d'); if(chartJabatanInstance) chartJabatanInstance.destroy();
       chartJabatanInstance = new Chart(ctxJ, { type: 'doughnut', data: { labels: Object.keys(statsJ), datasets: [{ data: Object.values(statsJ), backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'], borderWidth: 2, borderColor: '#ffffff' }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false } } } });
    }
  }


 // 1. UPDATE FUNGSI SWITCH TAB UNTUK MENAMPUNG KORWIL
  function switchDataTab(tabName) {
    ['kontenMajelis', 'kontenIndividu', 'kontenGereja', 'kontenKorwil'].forEach(p => { 
        if(document.getElementById(p)) document.getElementById(p).classList.add('hidden'); 
    });
    
    if(document.getElementById('konten' + tabName.charAt(0).toUpperCase() + tabName.slice(1))) {
        document.getElementById('konten' + tabName.charAt(0).toUpperCase() + tabName.slice(1)).classList.remove('hidden');
    }
    
    ['Majelis', 'Individu', 'Gereja', 'Korwil'].forEach(t => { 
        const btn = document.getElementById('tabBtn'+t); 
        if(btn) btn.className = "px-6 py-3 font-bold text-sm text-slate-400 border-b-2 border-transparent hover:text-slate-600 focus:outline-none whitespace-nowrap transition-all"; 
    });
    
    const activeBtn = document.getElementById('tabBtn'+ (tabName.charAt(0).toUpperCase() + tabName.slice(1)));
    if(activeBtn) { 
        activeBtn.classList.remove('text-slate-400', 'border-transparent'); 
        activeBtn.classList.add('text-indigo-600', 'border-indigo-600'); 
    }

    const wrapJabatan = document.getElementById('filterJabatan')?.parentElement; 
    const wrapSort = document.getElementById('sortData')?.parentElement;
    
    if (tabName === 'majelis' || tabName === 'korwil') { 
        if(wrapJabatan) wrapJabatan.style.display = 'none'; 
        if(wrapSort) wrapSort.style.display = 'none'; 
    } else { 
        if(wrapJabatan) wrapJabatan.style.display = 'block'; 
        if(wrapSort) wrapSort.style.display = 'block'; 
    }
    
    if (tabName === 'korwil') {
        renderDataKorwil(); // Panggil fungsi render korwil saat tab diklik
    } else {
        filterTabel();
    }
  }

window.renderDataKorwil = function() {
    const wadah = document.getElementById('listDataKorwil');
    if (!wadah) return;
    
    const role = USER_NOW ? String(USER_NOW.role).toLowerCase() : 'viewer';
    let dataKorwil = DATA_MASTER.korwil || [];

    // Filter baris kosong dari Google Sheet
    dataKorwil = dataKorwil.filter(k => k.ID_Korwil && k.Nama_Korwil);

    // Urutkan berdasarkan angka wilayahnya (1 sampai 12)
    dataKorwil.sort((a, b) => {
        let wilA = parseInt(String(a.Wilayah).replace(/\D/g, '')) || 999;
        let wilB = parseInt(String(b.Wilayah).replace(/\D/g, '')) || 999;
        return wilA - wilB;
    });

    if (dataKorwil.length === 0) {
        wadah.innerHTML = '<div class="col-span-full py-10 text-center text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-xl">Data Koordinator Wilayah belum tersedia.</div>';
        return;
    }

    wadah.innerHTML = dataKorwil.map(k => {
        let statusBadge = k.Status === 'Aktif' 
            ? '<span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase tracking-widest border border-emerald-200">Aktif</span>'
            : '<span class="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[9px] font-black uppercase tracking-widest border border-rose-200">Non-Aktif</span>';

        let btnEdit = (role.includes('admin') || role.includes('editor')) 
            ? `<button onclick="editDataKorwil('${k.ID_Korwil}'); event.stopPropagation();" class="w-8 h-8 rounded-full bg-amber-50 text-amber-500 hover:bg-amber-500 hover:text-white transition-colors flex items-center justify-center shadow-sm" title="Edit"><i class="fas fa-edit text-xs"></i></button>` 
            : '';
            
        let btnHapus = role.includes('admin') 
            ? `<button onclick="konfirmasiHapusKorwil('${k.ID_Korwil}'); event.stopPropagation();" class="w-8 h-8 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors flex items-center justify-center shadow-sm" title="Hapus"><i class="fas fa-trash-alt text-xs"></i></button>` 
            : '';

        let hpClean = String(k.No_HP || '').replace(/\D/g, ''); 
        if (hpClean.startsWith("0")) hpClean = "62" + hpClean.slice(1);
        if (hpClean.startsWith("8")) hpClean = "62" + hpClean;
        
        // FITUR BARU: Tombol WA Selalu Tampil. Jika Kosong, Muncul Peringatan Swal.
        let btnWA = (hpClean.length >= 9) 
            ? `<a href="https://wa.me/${hpClean}" target="_blank" onclick="event.stopPropagation();" title="Chat WA" class="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors flex items-center justify-center shadow-sm"><i class="fab fa-whatsapp text-sm"></i></a>` 
            : `<button onclick="Swal.fire('Data Tidak Lengkap', 'Nomor WhatsApp belum diisi atau tidak valid.', 'info'); event.stopPropagation();" title="WA Kosong" class="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors flex items-center justify-center shadow-sm"><i class="fab fa-whatsapp text-sm"></i></button>`;

        return `
        <div onclick="bukaProfil('${k.ID_Korwil}')" class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col hover:border-indigo-400 hover:-translate-y-1 hover:shadow-md transition-all group cursor-pointer">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shadow-inner shrink-0 text-xl">
                        <i class="fas fa-map-marked-alt"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-widest border border-slate-200">W-${k.Wilayah || '-'}</span>
                            ${statusBadge}
                        </div>
                        <h4 class="font-bold text-slate-800 text-sm leading-tight group-hover:text-indigo-600 transition-colors">${k.Nama_Korwil || '-'}</h4>
                    </div>
                </div>
            </div>
            ${k.Keterangan ? `<p class="text-[10px] text-slate-500 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100 flex-1">${k.Keterangan}</p>` : '<div class="flex-1"></div>'}
            
            <div class="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                <div class="text-[10px] font-bold text-slate-400 font-mono tracking-widest">UID: ${k.ID_Korwil || '-'}</div>
                <div class="flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    ${btnWA}
                    ${btnEdit}
                    ${btnHapus}
                </div>
            </div>
        </div>`;
    }).join('');
};
  
  function dapatkanBobotJabatan(jabatan) {
    let j = String(jabatan).toLowerCase(); if (j.includes('pendeta') || j.includes('pemimpin jemaat')) return 1; if (j.includes('guru') || j.includes('penginjil')) return 2; if (j.includes('penatua') || j.includes('sintua')) return 3; return 4;
  }
window.setupFilters = function() { 
    let htmlW = '<option value="">Seluruh Wilayah</option>'; let htmlJW = '<option value="">Pilih Wilayah</option>'; 
    for(let i=1; i<=12; i++) { htmlW+=`<option value="${i}">WILAYAH ${i}</option>`; htmlJW+=`<option value="${i}">WILAYAH ${i}</option>`; } 
    safeSetHTML('filterWilayah', htmlW); safeSetHTML('f_wil_j', htmlW); safeSetHTML('formWilayah', htmlJW); safeSetHTML('bk_wilayah', htmlJW); safeSetHTML('j_wilayah', htmlJW);
    
    // PERBAIKAN: Kosongkan opsi formJ agar jadi placeholder bayangan
    let htmlJ = '<option value="">Semua Jabatan</option>'; let formJ = '<option value=""></option>'; 
    DATA_MASTER.jabatan.forEach(j => { if (j.Nama_Jabatan) { htmlJ += `<option value="${j.Nama_Jabatan}">${j.Nama_Jabatan}</option>`; formJ += `<option value="${j.Nama_Jabatan}">${j.Nama_Jabatan}</option>`; } }); 
    safeSetHTML('filterJabatan', htmlJ); safeSetHTML('formJabatan', formJ); 
    
    if(window.tsInst['m']) { window.tsInst['m'].destroy(); window.tsInst['m'] = null; }
    
 if(document.getElementById('formJabatan')) {
        window.tsInst['m'] = new TomSelect('#formJabatan', { 
            create: false, 
            dropdownParent: 'body', 
            placeholder: 'Ketik atau pilih jabatan...', 
            onChange: function() { cekJabatan(); },
            // Tambahkan 3 baris ini agar teks langsung raib saat diklik
            onFocus: function() {
                if (this.getValue() === "") { this.clear(true); }
            }
        }); 
    }
    
    syncFilterResort(); syncResortJemaatPage(); syncFormResortMajelis(); syncFormResortJemaatEdit();
  };

  function syncFilterResort() { 
    const w = document.getElementById('filterWilayah')?.value || ''; const cleanW = String(w).trim().toLowerCase();
    const fr = document.getElementById('filterResort'); if(!fr) return; fr.innerHTML = '<option value="">Semua Resort / JK</option>'; 
    const resorts = [...new Set(DATA_MASTER.gereja.filter(g => (!w || String(g.Wilayah).trim().toLowerCase() === cleanW) && String(g.Tipe_Gereja || g.Status_Gereja || '').toUpperCase() !== "JEMAAT KHUSUS" && (g.Induk_Resort || g.Resort)).map(g => String(g.Induk_Resort || g.Resort).trim()))].sort(); 
    const khusus = DATA_MASTER.gereja.filter(g => (!w || String(g.Wilayah).trim().toLowerCase() === cleanW) && String(g.Tipe_Gereja || g.Status_Gereja || '').toUpperCase() === "JEMAAT KHUSUS").map(g => String(g.Nama_Gereja).trim()).sort(); 
    resorts.forEach(r => fr.innerHTML += `<option value="${r}" data-tipe="RESORT">${r}</option>`); khusus.forEach(k => fr.innerHTML += `<option value="${k}" data-tipe="JK">JK - ${k}</option>`); 
    syncFilterGereja(); 
  }
  function syncFilterGereja() { 
    const res = document.getElementById('filterResort'); const fg = document.getElementById('filterGereja'); if(!fg || !res) return; 
    const val = res.value; const tipe = res.options[res.selectedIndex]?.getAttribute('data-tipe'); fg.innerHTML = '<option value="">Seluruh Gereja & PHR</option>'; 
    if (tipe === "RESORT" || (!tipe && val)) { 
        fg.innerHTML += `<option value="Pengurus Harian Resort (PHR)" class="font-bold text-indigo-700 bg-indigo-50">🏢 PENGURUS HARIAN RESORT (PHR)</option>`;
        DATA_MASTER.gereja.filter(g => String(g.Induk_Resort || g.Resort || '').trim() === val).forEach(g => fg.innerHTML += `<option value="${g.Nama_Gereja}">${g.Nama_Gereja}</option>`); 
        fg.disabled = false; 
    } else if (tipe === "JK") { fg.innerHTML = `<option value="${val}">${val}</option>`; fg.value = val; fg.disabled = false; } else { fg.disabled = false; } 
    filterTabel(); 
  }

  function syncResortJemaatPage() { 
    const w = document.getElementById('f_wil_j')?.value || ''; const cleanW = String(w).trim().toLowerCase();
    const fr = document.getElementById('f_res_j'); if(!fr) return; fr.innerHTML = '<option value="">Semua Resort / JK</option>'; 
    const resorts = [...new Set(DATA_MASTER.gereja.filter(g => (!w || String(g.Wilayah).trim().toLowerCase() === cleanW) && String(g.Tipe_Gereja || g.Status_Gereja || '').toUpperCase() !== "JEMAAT KHUSUS" && (g.Induk_Resort || g.Resort)).map(g => String(g.Induk_Resort || g.Resort).trim()))].sort(); 
    const khusus = DATA_MASTER.gereja.filter(g => (!w || String(g.Wilayah).trim().toLowerCase() === cleanW) && String(g.Tipe_Gereja || g.Status_Gereja || '').toUpperCase() === "JEMAAT KHUSUS").map(g => String(g.Nama_Gereja).trim()).sort(); 
    resorts.forEach(r => fr.innerHTML += `<option value="${r}" data-tipe="RESORT">${r}</option>`); khusus.forEach(k => fr.innerHTML += `<option value="${k}" data-tipe="JK">JK - ${k}</option>`); 
    syncGerejaJemaatPage(); 
  }
  function syncGerejaJemaatPage() { 
    const res = document.getElementById('f_res_j'); const fg = document.getElementById('f_ger_j'); if(!fg || !res) return; 
    const val = res.value; const tipe = res.options[res.selectedIndex]?.getAttribute('data-tipe'); fg.innerHTML = '<option value="">Seluruh Gereja</option>'; 
    if (tipe === "RESORT" || (!tipe && val)) { DATA_MASTER.gereja.filter(g => String(g.Induk_Resort || g.Resort || '').trim() === val).forEach(g => fg.innerHTML += `<option value="${g.Nama_Gereja}">${g.Nama_Gereja}</option>`); fg.disabled = false; } else if (tipe === "JK") { fg.innerHTML = `<option value="${val}">${val}</option>`; fg.value = val; fg.disabled = false; } else { fg.disabled = false; } 
// filterTabelJemaat();
  }
  
  function syncFormResortBulk() { 
    const w = document.getElementById('bk_wilayah')?.value || ''; const cleanW = String(w).trim().toLowerCase();
    const fr = document.getElementById('bk_resort'); if(!fr) return; fr.innerHTML = '<option value="">Pilih Resort / JK</option>'; 
    const resorts = [...new Set(DATA_MASTER.gereja.filter(g => (!w || String(g.Wilayah).trim().toLowerCase() === cleanW) && String(g.Tipe_Gereja || g.Status_Gereja || '').toUpperCase() !== "JEMAAT KHUSUS" && (g.Induk_Resort || g.Resort)).map(g => String(g.Induk_Resort || g.Resort).trim()))].sort(); 
    const khusus = DATA_MASTER.gereja.filter(g => (!w || String(g.Wilayah).trim().toLowerCase() === cleanW) && String(g.Tipe_Gereja || g.Status_Gereja || '').toUpperCase() === "JEMAAT KHUSUS").map(g => String(g.Nama_Gereja).trim()).sort(); 
    resorts.forEach(r => { const opt = document.createElement('option'); opt.value = r; opt.text = r; opt.setAttribute('data-tipe', 'RESORT'); fr.appendChild(opt); }); khusus.forEach(k => { const opt = document.createElement('option'); opt.value = k; opt.text = "JK - " + k; opt.setAttribute('data-tipe', 'JK'); fr.appendChild(opt); }); 
    syncFormGerejaBulk(); 
  }
  function syncFormGerejaBulk() { 
    const resSelect = document.getElementById('bk_resort'); const fg = document.getElementById('bk_gereja'); if(!fg || !resSelect) return; 
    const val = resSelect.value, tipe = resSelect.options[resSelect.selectedIndex]?.getAttribute('data-tipe'); fg.innerHTML = '<option value="">Pilih Nama Gereja / PHR</option>'; 
    if (tipe === "RESORT" || (!tipe && val)) { 
        fg.innerHTML += `<option value="Pengurus Harian Resort (PHR)" class="font-bold text-indigo-700 bg-indigo-50">🏢 PENGURUS HARIAN RESORT (PHR)</option>`;
        DATA_MASTER.gereja.filter(g => String(g.Induk_Resort || g.Resort || '').trim() === val).forEach(g => { const opt = document.createElement('option'); opt.value = g.Nama_Gereja; opt.text = g.Nama_Gereja; fg.appendChild(opt); }); 
        fg.disabled = false; fg.classList.remove('bg-slate-200'); 
    } else if (tipe === "JK") { const opt = document.createElement('option'); opt.value = val; opt.text = val; fg.appendChild(opt); fg.value = val; fg.disabled = false; fg.classList.add('bg-slate-200'); } else { fg.disabled = false; fg.classList.remove('bg-slate-200'); } 
  }

  function syncFormResortMajelis() { 
    const w = document.getElementById('formWilayah')?.value || document.getElementById('m_wilayah')?.value || ''; const cleanW = String(w).trim().toLowerCase();
    const fr = document.getElementById('formResort'); if(!fr) return; fr.innerHTML = '<option value="">Pilih Resort / JK</option>'; 
    const resorts = [...new Set(DATA_MASTER.gereja.filter(g => (!w || String(g.Wilayah).trim().toLowerCase() === cleanW) && String(g.Tipe_Gereja || g.Status_Gereja || '').toUpperCase() !== "JEMAAT KHUSUS" && (g.Induk_Resort || g.Resort)).map(g => String(g.Induk_Resort || g.Resort).trim()))].sort(); 
    const khusus = DATA_MASTER.gereja.filter(g => (!w || String(g.Wilayah).trim().toLowerCase() === cleanW) && String(g.Tipe_Gereja || g.Status_Gereja || '').toUpperCase() === "JEMAAT KHUSUS").map(g => String(g.Nama_Gereja).trim()).sort(); 
    resorts.forEach(r => { const opt = document.createElement('option'); opt.value = r; opt.text = r; opt.setAttribute('data-tipe', 'RESORT'); fr.appendChild(opt); }); khusus.forEach(k => { const opt = document.createElement('option'); opt.value = k; opt.text = "JK - " + k; opt.setAttribute('data-tipe', 'JK'); fr.appendChild(opt); }); 
    syncFormGerejaMajelis(); 
  }
  function syncFormGerejaMajelis() { 
    const resSelect = document.getElementById('formResort'); const fg = document.getElementById('formGereja'); if(!fg || !resSelect) return; 
    const val = resSelect.value, tipe = resSelect.options[resSelect.selectedIndex]?.getAttribute('data-tipe'); fg.innerHTML = '<option value="">Pilih Nama Gereja / PHR</option>'; 
    if (tipe === "RESORT" || (!tipe && val)) { 
        fg.innerHTML += `<option value="Pengurus Harian Resort (PHR)" class="font-bold text-indigo-700 bg-indigo-50">🏢 PENGURUS HARIAN RESORT (PHR)</option>`;
        DATA_MASTER.gereja.filter(g => String(g.Induk_Resort || g.Resort || '').trim() === val).forEach(g => { const opt = document.createElement('option'); opt.value = g.Nama_Gereja; opt.text = g.Nama_Gereja; fg.appendChild(opt); }); 
        fg.disabled = false; fg.classList.remove('bg-slate-200'); 
    } else if (tipe === "JK") { const opt = document.createElement('option'); opt.value = val; opt.text = val; fg.appendChild(opt); fg.value = val; fg.disabled = false; fg.classList.add('bg-slate-200'); } else { fg.disabled = false; fg.classList.remove('bg-slate-200'); } 
  }

  function syncFormResortJemaatEdit() { 
    const w = document.getElementById('j_wilayah')?.value || ''; const cleanW = String(w).trim().toLowerCase();
    const fr = document.getElementById('j_resort'); if(!fr) return; fr.innerHTML = '<option value="">Pilih Resort / JK</option>'; 
    const resorts = [...new Set(DATA_MASTER.gereja.filter(g => (!w || String(g.Wilayah).trim().toLowerCase() === cleanW) && String(g.Tipe_Gereja || g.Status_Gereja || '').toUpperCase() !== "JEMAAT KHUSUS" && (g.Induk_Resort || g.Resort)).map(g => String(g.Induk_Resort || g.Resort).trim()))].sort(); 
    const khusus = DATA_MASTER.gereja.filter(g => (!w || String(g.Wilayah).trim().toLowerCase() === cleanW) && String(g.Tipe_Gereja || g.Status_Gereja || '').toUpperCase() === "JEMAAT KHUSUS").map(g => String(g.Nama_Gereja).trim()).sort(); 
    resorts.forEach(r => { const opt = document.createElement('option'); opt.value = r; opt.text = r; opt.setAttribute('data-tipe', 'RESORT'); fr.appendChild(opt); }); khusus.forEach(k => { const opt = document.createElement('option'); opt.value = k; opt.text = "JK - " + k; opt.setAttribute('data-tipe', 'JK'); fr.appendChild(opt); }); 
    syncFormGerejaJemaatEdit(); 
  }
  function syncFormGerejaJemaatEdit() { 
    const resSelect = document.getElementById('j_resort'); const fg = document.getElementById('j_gereja'); if(!fg || !resSelect) return; 
    const val = resSelect.value, tipe = resSelect.options[resSelect.selectedIndex]?.getAttribute('data-tipe'); fg.innerHTML = '<option value="">Pilih Nama Gereja / PHR</option>'; 
    if (tipe === "RESORT" || (!tipe && val)) { 
        fg.innerHTML += `<option value="Pengurus Harian Resort (PHR)" class="font-bold text-indigo-700 bg-indigo-50">🏢 PENGURUS HARIAN RESORT (PHR)</option>`;
        DATA_MASTER.gereja.filter(g => String(g.Induk_Resort || g.Resort || '').trim() === val).forEach(g => { const opt = document.createElement('option'); opt.value = g.Nama_Gereja; opt.text = g.Nama_Gereja; fg.appendChild(opt); }); 
        fg.disabled = false; fg.classList.remove('bg-slate-200'); 
    } else if (tipe === "JK") { const opt = document.createElement('option'); opt.value = val; opt.text = val; fg.appendChild(opt); fg.value = val; fg.disabled = false; fg.classList.add('bg-slate-200'); } else { fg.disabled = false; fg.classList.remove('bg-slate-200'); } 
  }

let searchTimeout; 
  if(document.getElementById('searchTerm')) { 
      document.getElementById('searchTerm').addEventListener('input', function() { 
          clearTimeout(searchTimeout); 
          // Jeda 800ms agar browser tidak freeze saat mengetik nama di Big Data
          searchTimeout = setTimeout(filterTabel, 800); 
      }); 
  }
  if(document.getElementById('search_j')) { 
      document.getElementById('search_j').addEventListener('input', function() { 
          clearTimeout(searchTimeout); 
          searchTimeout = setTimeout(filterTabelJemaat, 800); 
      }); 
  }

  function filterTabel() {
    const w = document.getElementById('filterWilayah') ? document.getElementById('filterWilayah').value.trim().toLowerCase() : ''; 
    const r = document.getElementById('filterResort') ? document.getElementById('filterResort').value.trim().toLowerCase() : ''; 
    const g = document.getElementById('filterGereja') ? document.getElementById('filterGereja').value.trim().toLowerCase() : ''; 
    const j = document.getElementById('filterJabatan') ? document.getElementById('filterJabatan').value.trim().toLowerCase() : ''; 
    const s = document.getElementById('searchTerm') ? document.getElementById('searchTerm').value.trim().toLowerCase() : ''; 
    const modeSort = document.getElementById('sortData') ? document.getElementById('sortData').value : 'nama_az';
    const isTabMajelis = document.getElementById('kontenMajelis') && !document.getElementById('kontenMajelis').classList.contains('hidden');

    let filteredMajelis = DATA_MASTER.majelis.filter(m => {
      const safeG = String(m.Nama_Gereja || '').trim().toLowerCase(); const safeR = String(m.Resort || '').trim().toLowerCase(); 
      if (isTabMajelis) {
          return (!w || String(m.Wilayah || '').trim().toLowerCase() === w) && (!r || safeR === r || safeG === r) && (!g || safeG === g) && (!s || safeG.includes(s) || safeR.includes(s));
      } else {
          return (!w || String(m.Wilayah || '').trim().toLowerCase() === w) && (!r || safeR === r || safeG === r) && (!g || safeG === g) && (!j || String(m.Jabatan || '').trim().toLowerCase() === j) && (!s || String(m.Nama_Lengkap || '').toLowerCase().includes(s));
      }
    });

    // KUNCI PERBAIKAN: Logika Pengurutan (Sorting) Majelis
    filteredMajelis.sort((a, b) => { 
        // 1. Ekstrak angka wilayah untuk memastikan urutan matematika (1, 2, 3.. 12)
        let wilA = parseInt(String(a.Wilayah).replace(/\D/g, '')) || 999;
        let wilB = parseInt(String(b.Wilayah).replace(/\D/g, '')) || 999;

        if (modeSort === 'hierarki') { 
            // Urutkan Jabatan dulu
            let diff = dapatkanBobotJabatan(a.Jabatan) - dapatkanBobotJabatan(b.Jabatan); 
            if(diff !== 0) return diff; 
            
            // JIKA JABATAN SAMA (Misal: Sama-sama Pimpinan Jemaat), URUTKAN BERDASARKAN WILAYAH
            if(wilA !== wilB) return wilA - wilB; 
            
            // Jika Wilayah juga sama, baru urutkan sesuai Abjad Nama
            return String(a.Nama_Lengkap).localeCompare(String(b.Nama_Lengkap)); 
            
        } else if (modeSort === 'wilayah') {
            // Urutkan Wilayah sebagai prioritas paling tinggi
            if(wilA !== wilB) return wilA - wilB; 
            
            // Jika Wilayah sama, urutkan Jabatan
            let diff = dapatkanBobotJabatan(a.Jabatan) - dapatkanBobotJabatan(b.Jabatan); 
            if(diff !== 0) return diff; 
            
            return String(a.Nama_Lengkap).localeCompare(String(b.Nama_Lengkap)); 
        }
        
        // Default: modeSort === 'nama_az'
        return String(a.Nama_Lengkap).localeCompare(String(b.Nama_Lengkap)); 
    });
    
    window.currentFilteredList = filteredMajelis;
    renderTabelReal(filteredMajelis, true); renderTabelIndividu(filteredMajelis, true); 

    let filteredGereja = DATA_MASTER.gereja.filter(grj => { const safeR = String(grj.Induk_Resort || grj.Resort || '').trim().toLowerCase(); const safeG = String(grj.Nama_Gereja || '').trim().toLowerCase(); return (!w || String(grj.Wilayah || '').trim().toLowerCase() === w) && (!r || (safeR && safeR === r) || (!safeR && safeG === r)) && (!g || safeG === g) && (!s || safeG.includes(s) || safeR.includes(s)); });
    
    // Logika Pengurutan Unit Gereja
    filteredGereja.sort((a, b) => { 
        let wilA = parseInt(String(a.Wilayah).replace(/\D/g, '')) || 999;
        let wilB = parseInt(String(b.Wilayah).replace(/\D/g, '')) || 999;
        
        if (modeSort === 'wilayah') return wilA - wilB;
        if (modeSort === 'nama_az' || modeSort === 'hierarki') return String(a.Nama_Gereja).localeCompare(String(b.Nama_Gereja)); 
        return wilA - wilB; 
    });
    
    renderTabelGereja(filteredGereja, true); window.currentFilteredGereja = filteredGereja;
  }

// --- TABEL MAJELIS HIERARKI (TREE VIEW GRID CARD) ---
  function renderTabelReal(data, resetPage = true) {
    if (resetPage) currentPageMajelis = 1; 
    const tree = {};
    const w = document.getElementById('filterWilayah') ? document.getElementById('filterWilayah').value.trim().toLowerCase() : '';
    const selectedResort = document.getElementById('filterResort') ? document.getElementById('filterResort').value.trim().toLowerCase() : '';
    const selectedGereja = document.getElementById('filterGereja') ? document.getElementById('filterGereja').value.trim().toLowerCase() : '';
    const s = document.getElementById('searchTerm') ? document.getElementById('searchTerm').value.trim().toLowerCase() : '';
    const role = USER_NOW ? String(USER_NOW.role).toLowerCase() : 'viewer';

    DATA_MASTER.gereja.forEach(g => {
        let gWil = String(g.Wilayah).trim().toLowerCase(); if (w && gWil !== w) return;
        let resortNameRaw = String(g.Induk_Resort || g.Resort || '').trim(); let gerejaNameRaw = String(g.Nama_Gereja).trim();
        let isJK = String(g.Status_Gereja || g.Tipe_Gereja || '').toLowerCase() === 'jemaat khusus' || resortNameRaw.toLowerCase() === 'jemaat khusus' || !resortNameRaw;
        let key = isJK ? gerejaNameRaw : resortNameRaw;
        if (!key) return;
        if (selectedResort && key.toLowerCase() !== selectedResort) return;

        if (!tree[key]) tree[key] = { isJK: isJK, wilayah: g.Wilayah, totalRT: 0, totalJiwa: 0, phr: [], pagaran: {} };
        tree[key].totalRT += parseInt(g.Total_RT) || 0; tree[key].totalJiwa += parseInt(g.Total_Jiwa) || 0;
        if (!isJK && gerejaNameRaw && gerejaNameRaw !== resortNameRaw) { if (!tree[key].pagaran[gerejaNameRaw]) tree[key].pagaran[gerejaNameRaw] = []; }
    });

    DATA_MASTER.majelis.forEach(m => {
        let mWil = String(m.Wilayah).trim().toLowerCase(); if (w && mWil !== w) return;
        let resortNameRaw = String(m.Resort).trim(); let gerejaNameRaw = String(m.Nama_Gereja).trim();
        let isJK = (!resortNameRaw || resortNameRaw.toLowerCase() === 'jemaat khusus' || gerejaNameRaw === resortNameRaw);
        let key = isJK ? gerejaNameRaw : resortNameRaw;
        if (!key || !tree[key]) return; 

        let isPhr = (!gerejaNameRaw || gerejaNameRaw === 'Tingkat Resort' || gerejaNameRaw.includes('PHR'));
        if (isJK) { tree[key].phr.push(m); } 
        else {
            if (isPhr) tree[key].phr.push(m);
            else {
                if (!tree[key].pagaran[gerejaNameRaw]) tree[key].pagaran[gerejaNameRaw] = [];
                tree[key].pagaran[gerejaNameRaw].push(m);
            }
        }
    });

  let keysToDelete = [];
          Object.keys(tree).forEach(key => {
              let node = tree[key];
              let infoG_Parent = DATA_MASTER.gereja.find(x => String(x.Nama_Gereja).trim() === key || String(x.Induk_Resort || x.Resort).trim() === key);
              
              if (node.isJK && infoG_Parent) { 
                  node.totalRT = parseInt(infoG_Parent.Total_RT) || 0; 
                  node.totalJiwa = parseInt(infoG_Parent.Total_Jiwa) || 0; 
              } 
              else if (!node.isJK) { 
                  // KUNCI PERBAIKAN: Reset (kosongkan) ke angka Nol dulu sebelum dihitung ulang!
                  node.totalRT = 0; 
                  node.totalJiwa = 0; 
                  
                  let childGrj = DATA_MASTER.gereja.filter(x => String(x.Induk_Resort || x.Resort).trim() === key); 
                  childGrj.forEach(c => { 
                      node.totalRT += parseInt(c.Total_RT) || 0; 
                      node.totalJiwa += parseInt(c.Total_Jiwa) || 0; 
                  }); 
              }

          if (s) { // JIKA ADA TEKS PENCARIAN
              let keyMatches = key.toLowerCase().includes(s);
              node.phr = node.phr.filter(m => keyMatches || String(m.Nama_Lengkap).toLowerCase().includes(s));
              
              let hasPagaranMatch = false;
              Object.keys(node.pagaran).forEach(pk => {
                  let pkMatches = pk.toLowerCase().includes(s);
                  node.pagaran[pk] = node.pagaran[pk].filter(m => keyMatches || pkMatches || String(m.Nama_Lengkap).toLowerCase().includes(s));
                  if (node.pagaran[pk].length === 0 && !keyMatches && !pkMatches) { delete node.pagaran[pk]; } 
                  else { hasPagaranMatch = true; }
              });
              
              // Hapus dari layar JIKA nama tidak cocok & personil di dalamnya tidak ada yang cocok
              if (!keyMatches && node.phr.length === 0 && !hasPagaranMatch) { keysToDelete.push(key); }
          }

          if (selectedGereja) {
              if (selectedGereja === 'pengurus harian resort (phr)') { node.pagaran = {}; } 
              else { node.phr = []; Object.keys(node.pagaran).forEach(pk => { if (pk.toLowerCase() !== selectedGereja) delete node.pagaran[pk]; }); }
          }

          const sortMajelis = (arr) => arr.sort((a,b) => { let diff = dapatkanBobotJabatan(a.Jabatan) - dapatkanBobotJabatan(b.Jabatan); if (diff !== 0) return diff; return String(a.Nama_Lengkap).localeCompare(String(b.Nama_Lengkap)); }); 
          sortMajelis(node.phr); Object.keys(node.pagaran).forEach(pk => sortMajelis(node.pagaran[pk])); 
      });
      
      // Eksekusi penghapusan gereja yang tidak sesuai pencarian
      keysToDelete.forEach(k => delete tree[k]);
    window.currentTreeData = tree;
    const groupArray = Object.keys(tree).map(k => ({ name: k, ...tree[k] })).sort((a,b) => a.name.localeCompare(b.name));
    const paginatedGroups = groupArray.slice((currentPageMajelis - 1) * 12, ((currentPageMajelis - 1) * 12) + 12);
    const container = document.getElementById('majelisAccordionContainer');

    if (paginatedGroups.length === 0) { 
        container.className = "p-5 bg-slate-50/50";
        container.innerHTML = `<div class="text-center p-10 text-slate-400 font-semibold border-2 border-dashed border-slate-200 rounded-xl">Unit Gereja Tidak Ditemukan</div>`; 
        if(typeof renderPaginationUI === 'function') renderPaginationUI(groupArray.length, currentPageMajelis, 'paginationMajelis', 'majelis', 12); return; 
    }

    container.className = "p-6 bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6";
    container.innerHTML = paginatedGroups.map(g => {
        let totPersonil = g.phr.length + Object.values(g.pagaran).reduce((acc, curr) => acc + curr.length, 0);
        let badgeCol = g.isJK ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
        let bgGrad = g.isJK ? 'from-purple-100 to-fuchsia-50' : 'from-indigo-100 to-blue-50';
        
        // Penanda Visual Jika Gereja Masih Kosong
        let warn = totPersonil === 0 ? '<span class="text-rose-500 font-black ml-1 text-[10px] bg-rose-100 px-2 py-0.5 rounded">(KOSONG)</span>' : '';

        return `
        <div onclick="bukaDetailUnit('${g.name}')" class="bg-white rounded-[1.5rem] p-6 border border-slate-200 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-xl hover:-translate-y-1 hover:border-indigo-300 transition-all cursor-pointer group flex flex-col h-full relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${bgGrad} rounded-bl-full -mr-6 -mt-6 z-0 transition-transform duration-500 group-hover:scale-125 opacity-70"></div>
            <div class="relative z-10 flex-1">
                <div class="flex justify-between items-start mb-4"><span class="px-2.5 py-1 ${badgeCol} text-[9px] font-black uppercase tracking-widest rounded-lg shadow-sm border border-white">${g.isJK ? 'Jemaat Khusus' : 'Resort Induk'}</span><span class="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100"><i class="fas fa-map-marker-alt text-indigo-400"></i> W-${g.wilayah}</span></div>
                <h3 class="text-xl font-black text-slate-800 leading-tight mb-2 group-hover:text-indigo-600 transition-colors drop-shadow-sm pr-4">${g.name}</h3>
                <p class="text-xs font-semibold text-slate-500 mb-6 flex items-center gap-1.5"><i class="fas fa-users text-slate-300"></i> ${totPersonil} Personil Terdaftar ${warn}</p>
            </div>
            <div class="relative z-10 pt-4 border-t border-slate-100 flex justify-between items-center mt-auto bg-white/50 backdrop-blur-sm -mx-2 px-2 -mb-2 pb-2 rounded-xl">
                <div class="flex gap-4"><div><p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total RT</p><p class="text-sm font-black text-slate-700">${g.totalRT.toLocaleString('id-ID')}</p></div><div class="border-l border-slate-200 pl-4"><p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Jiwa</p><p class="text-sm font-black text-slate-700">${g.totalJiwa.toLocaleString('id-ID')}</p></div></div>
                <div class="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center text-slate-400 transition-colors shadow-sm"><i class="fas fa-arrow-right text-sm"></i></div>
            </div>
        </div>`;
    }).join('');
    if(typeof renderPaginationUI === 'function') renderPaginationUI(groupArray.length, currentPageMajelis, 'paginationMajelis', 'majelis', 12);
  }
  function renderTabelJemaat(data, resetPage = true) {
     if(resetPage) currentPageJemaat = 1; const container = document.getElementById('jemaatAccordionContainer'); if(!container) return;
     const groupedKK = {}; 
     data.forEach(j => { 
        let nokk = String(j.No_KK).trim(); 
        if(!groupedKK[nokk]) { groupedKK[nokk] = { kpl: null, anggota: [], wil: j.Wilayah, res: j.Resort, grj: j.Nama_Gereja }; } 
        if(String(j.Status_Keluarga).toLowerCase() === 'kepala keluarga') { groupedKK[nokk].kpl = j; } else { groupedKK[nokk].anggota.push(j); } 
     });
     
     let arr = Object.keys(groupedKK).map(k => ({ kk: k, ...groupedKK[k] })).sort((a,b) => (a.kpl?a.kpl.Nama_Lengkap:a.kk).localeCompare(b.kpl?b.kpl.Nama_Lengkap:b.kk));
     safeSetText('labelTotalKK', arr.length.toLocaleString('id-ID') + " KK");
     const paginated = arr.slice((currentPageJemaat - 1) * 10, ((currentPageJemaat - 1) * 10) + 10);
     const role = USER_NOW ? String(USER_NOW.role).toLowerCase() : 'viewer';
     
     if(paginated.length===0) { container.innerHTML = `<div class="text-center p-8 text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-xl">Data Jemaat Kosong</div>`; renderPaginationUI(arr.length, currentPageJemaat, 'paginationJemaat', 'jemaat', 10); return; }
     
     container.innerHTML = paginated.map(g => {
         let nKK = g.kpl ? g.kpl.Nama_Lengkap : "Tanpa Nama KK"; let idKpl = g.kpl ? g.kpl.ID_Jemaat : '';
         let jkKpl = g.kpl ? (g.kpl.Jenis_Kelamin === 'Laki-laki' ? '<i class="fas fa-mars text-blue-500 ml-1"></i>' : '<i class="fas fa-venus text-rose-500 ml-1"></i>') : '';
         let btnEditKpl = (idKpl && (role.includes('admin') || role.includes('editor'))) ? `<button onclick="editDataJemaatItem('${idKpl}'); event.stopPropagation();" class="text-amber-500 hover:text-amber-700 ml-3" title="Edit KK"><i class="fas fa-edit"></i></button>` : '';
         let btnHapusKpl = (idKpl && role.includes('admin')) ? `<button onclick="konfirmasiHapusKeluarga('${g.kk}'); event.stopPropagation();" class="text-rose-500 hover:text-rose-700 ml-2" title="Hapus Seluruh Keluarga"><i class="fas fa-trash"></i></button>` : '';
         let btnCetakPDF = `<button onclick="bukaPreviewCetakKeluarga('${g.kk}'); event.stopPropagation();" class="text-indigo-500 hover:text-indigo-700 ml-3" title="Cetak Kartu Keluarga PDF"><i class="fas fa-print"></i></button>`;
         let btnTambahAnggota = (role.includes('admin') || role.includes('editor')) ? `<button onclick="tambahAnggotaKeluarga('${g.kk}', '${g.wil}', '${g.res}', '${g.grj}'); event.stopPropagation();" class="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold shadow-sm border border-emerald-200 hover:bg-emerald-500 hover:text-white transition-colors ml-3"><i class="fas fa-plus mr-1"></i> Anggota</button>` : '';

         let trs = g.anggota.map(a => {
             let jkA = a.Jenis_Kelamin === 'Laki-laki' ? '<i class="fas fa-mars text-blue-400"></i>' : '<i class="fas fa-venus text-rose-400"></i>';
             let badgeKondisi = String(a.Kondisi).toLowerCase() === 'meninggal' ? '<span class="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[9px] font-bold uppercase ml-2">Meninggal</span>' : '';
             let btnAksi = (role.includes('admin') || role.includes('editor')) ? `<button onclick="editDataJemaatItem('${a.ID_Jemaat}')" class="text-amber-500 hover:text-amber-700 mr-2"><i class="fas fa-edit"></i></button>` : '';
             if (role.includes('admin')) btnAksi += `<button onclick="konfirmasiHapusJemaat('${a.ID_Jemaat}')" class="text-rose-500 hover:text-rose-700"><i class="fas fa-trash"></i></button>`;
             return `<tr class="border-b border-slate-100 bg-white hover:bg-slate-50"><td class="p-3 text-xs font-bold text-slate-700">${a.Nama_Lengkap||'-'} ${badgeKondisi}</td><td class="p-3 text-xs text-emerald-600 font-bold">${a.Status_Keluarga||'-'}</td><td class="p-3 text-xs text-center">${jkA}</td><td class="p-3 text-xs text-slate-500 text-center">${hitungUmur(a.Tanggal_Lahir)}</td><td class="p-3 text-xs text-center">${btnAksi}</td></tr>`;
         }).join('');
         
         let tab = g.anggota.length > 0 ? `<div class="border-t border-emerald-100"><table class="w-full text-left whitespace-nowrap"><thead class="bg-emerald-50"><tr><th class="p-3 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Nama Anggota</th><th class="p-3 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Hubungan</th><th class="p-3 text-[10px] font-bold text-emerald-700 uppercase tracking-wider text-center">L/P</th><th class="p-3 text-[10px] font-bold text-emerald-700 uppercase tracking-wider text-center">Umur</th><th class="p-3 text-[10px] font-bold text-emerald-700 uppercase tracking-wider text-center">Aksi</th></tr></thead><tbody>${trs}</tbody></table></div>` : `<div class="p-4 text-center text-[10px] text-slate-400 font-bold uppercase">Tidak ada tanggungan lainnya</div>`;
         return `<details class="bg-white border border-slate-200 rounded-xl shadow-sm mb-3 group"><summary class="p-4 cursor-pointer flex justify-between items-center group-open:bg-emerald-50 transition-colors hover:bg-slate-50"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center group-open:bg-emerald-500 group-open:text-white group-open:rotate-90 transition-all"><i class="fas fa-chevron-right text-xs"></i></div><div><p class="font-extrabold text-sm text-slate-800">${nKK} ${jkKpl}</p><p class="text-[10px] text-slate-500 font-semibold mt-1"><span class="bg-slate-200 px-1.5 rounded text-slate-700">${g.kk}</span> ${g.grj} • W-${g.wil}</p></div></div><div class="flex items-center"><span class="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full shadow-sm">${g.anggota.length + (g.kpl?1:0)} Jiwa</span>${btnTambahAnggota}${btnCetakPDF}${btnEditKpl}${btnHapusKpl}</div></summary>${tab}</details>`;
     }).join('');
     renderPaginationUI(arr.length, currentPageJemaat, 'paginationJemaat', 'jemaat', 10);
  }

  function renderTabelLogAktivitas(resetPage = true) {
      if (resetPage) currentPageLog = 1;
      const tbody = document.getElementById('tableLogAktivitas'); if(!tbody) return;
      if(!DATA_MASTER.log || DATA_MASTER.log.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="p-10 text-center text-slate-400 font-bold border-2 border-dashed border-slate-100 rounded-xl">Data log masih kosong.</td></tr>'; document.getElementById('paginationLog').innerHTML = ''; return; }
      let allLogs = [...DATA_MASTER.log].reverse();
      let startIndex = (currentPageLog - 1) * itemsPerLogPage; let paginatedLogs = allLogs.slice(startIndex, startIndex + itemsPerLogPage);
      tbody.innerHTML = paginatedLogs.map(L => {
          let aksi = String(L.Aksi || L.aksi || '').toUpperCase(); let badgeWarna = 'bg-slate-100 text-slate-600';
          if(aksi.includes('TAMBAH') || aksi.includes('INPUT')) badgeWarna = 'bg-emerald-100 text-emerald-700 border-emerald-200';
          else if(aksi.includes('EDIT') || aksi.includes('UPDATE')) badgeWarna = 'bg-amber-100 text-amber-700 border-amber-200';
          else if(aksi.includes('HAPUS') || aksi.includes('DELETE')) badgeWarna = 'bg-rose-100 text-rose-700 border-rose-200';
          let sumberRaw = String(L.Sumber || L.Lokasi_Input || L.sumber || 'Pusat Aplikasi').trim().toUpperCase();
          let ikonSumber = sumberRaw.includes('DAERAH') ? '<i class="fas fa-mobile-alt text-indigo-400 w-4 text-center"></i>' : '<i class="fas fa-desktop text-blue-400 w-4 text-center"></i>';
          let waktuRaw = L.Waktu || L.Timestamp || L.tanggal || '-'; let waktuFormatted = waktuRaw;
          if(waktuRaw.includes('T') && waktuRaw.includes('Z')) { let d = new Date(waktuRaw); if(!isNaN(d.getTime())) waktuFormatted = d.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' }); }
          return `<tr class="hover:bg-slate-50 transition-colors"><td class="p-4 text-[11px] font-mono font-bold text-slate-500">${waktuFormatted}</td><td class="p-4 text-xs font-bold text-slate-700 flex items-center gap-2">${ikonSumber} ${sumberRaw}</td><td class="p-4 text-center"><span class="px-2.5 py-1 border ${badgeWarna} rounded-md text-[9px] font-black tracking-widest">${aksi}</span></td><td class="p-4 text-xs font-semibold text-slate-700 max-w-md truncate whitespace-normal">${L.Detail || L.Keterangan || '-'}</td></tr>`;
      }).join('');
      renderPaginationLogUI(allLogs.length);
  }
  function renderPaginationLogUI(totalItems) {
      const totalPages = Math.ceil(totalItems / itemsPerLogPage); const container = document.getElementById('paginationLog'); if(!container) return;
      if (totalPages <= 1) { container.innerHTML = ''; return; }
      let html = `<span class="text-xs text-slate-400 font-bold tracking-widest uppercase mr-4">Hal. ${currentPageLog} / ${totalPages} <span class="ml-2 px-2 py-1 bg-slate-100 rounded-md border border-slate-200">${totalItems} Log</span></span><div class="flex items-center gap-1">`;
      if (currentPageLog > 1) html += `<button onclick="ubahHalamanLog(${currentPageLog - 1})" class="page-btn inactive"><i class="fas fa-chevron-left"></i></button>`;
      for (let i = Math.max(1, currentPageLog - 2); i <= Math.min(totalPages, currentPageLog + 2); i++) html += `<button onclick="ubahHalamanLog(${i})" class="page-btn ${i===currentPageLog?'active':'inactive'}">${i}</button>`;
      if (currentPageLog < totalPages) html += `<button onclick="ubahHalamanLog(${currentPageLog + 1})" class="page-btn inactive"><i class="fas fa-chevron-right"></i></button>`;
      container.innerHTML = html + `</div>`;
  }
  function ubahHalamanLog(page) { currentPageLog = page; renderTabelLogAktivitas(false); }
  window.konfirmasiHapusLog = function() {
      const role = USER_NOW ? String(USER_NOW.role).toLowerCase() : ''; if (!role.includes('admin')) return Swal.fire('Akses Ditolak', 'Hanya Admin yang dapat membersihkan log.', 'error');
      Swal.fire({ title: 'Bersihkan Log?', text: 'Riwayat akan dihapus permanen!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Ya, Bersihkan!' }).then((result) => {
          if (result.isConfirmed) { Swal.fire({ title: 'Membersihkan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() }); apiCall('bersihkanLog', { userRole: USER_NOW ? USER_NOW.role : '' }).then(res => { if (res && res.status === 'success') { DATA_MASTER.log = []; renderTabelLogAktivitas(); Swal.fire('Berhasil!', 'Log dibersihkan.', 'success'); } else { Swal.fire('Gagal', res.message || 'Terjadi kesalahan sistem.', 'error'); } }).catch(err => Swal.fire('Error Server', String(err), 'error')); }
      });
  };

 // 1. STATE PAGINASI UNTUK ULANG TAHUN
window.ultahState = {
    results: [],
    currentPage: 1,
    itemsPerPage: 6 // Tampilkan 6 kotak gereja per halaman
};

// 2. FUNGSI PENCARIAN UTAMA
window.cariUlangTahunGereja = function() {
    const startVal = document.getElementById('ultahStart').value; 
    const endVal = document.getElementById('ultahEnd').value; 
    const container = document.getElementById('ultahResultGrid');
    
    if(!startVal || !endVal) return Swal.fire('Perhatian', 'Silakan pilih rentang tanggal mulai dan sampai terlebih dahulu.', 'warning');
    
    container.innerHTML = `<div class="p-6 text-center text-slate-400 font-medium text-sm col-span-full"><i class="fas fa-spinner fa-spin mr-2"></i>Mencari data gereja...</div>`;
    
    setTimeout(() => {
        const d1 = new Date(startVal); d1.setHours(0,0,0,0); 
        const d2 = new Date(endVal); d2.setHours(23,59,59,999); 
        const sTime = d1.getTime(); const eTime = d2.getTime(); 
        let results = [];
        
        if(!DATA_MASTER || !DATA_MASTER.gereja || DATA_MASTER.gereja.length === 0) { 
            container.innerHTML = `<div class="p-6 text-center text-rose-500 font-bold text-sm col-span-full border-2 border-dashed border-rose-200 rounded-2xl">Data Gereja belum termuat. Silakan klik tombol Refresh.</div>`; 
            return; 
        }
        
        DATA_MASTER.gereja.forEach(g => {
            let tgl = g.Tanggal_Berdiri || g['Tanggal Berdiri'] || g['Tanggal_berdiri']; if(!tgl) return;
            let bDate = window.parseDateSafe(tgl); if(!bDate || isNaN(bDate.getTime())) return;
            
            let month = bDate.getMonth(); let date = bDate.getDate(); let bYear = bDate.getFullYear();
            let anniv1 = new Date(d1.getFullYear(), month, date); let anniv2 = new Date(d2.getFullYear(), month, date);
            let isMatch = false; let matchAnniv = null;
            
            if(anniv1.getTime() >= sTime && anniv1.getTime() <= eTime) { isMatch = true; matchAnniv = anniv1; } 
            else if(anniv2.getTime() >= sTime && anniv2.getTime() <= eTime) { isMatch = true; matchAnniv = anniv2; }
            
            if(isMatch) { 
                let age = matchAnniv.getFullYear() - bYear; 
                if (age >= 0) results.push({ gereja: g.Nama_Gereja || g['Nama Gereja'], resort: g.Induk_Resort || g.Resort || 'Jemaat Khusus', tglBerdiriAsli: bDate, tglUltahTahunIni: matchAnniv, usia: age }); 
            }
        });
        
        results.sort((a,b) => a.tglUltahTahunIni.getTime() - b.tglUltahTahunIni.getTime());
        
        // Simpan hasil ke State lalu render halaman 1
        window.ultahState.results = results;
        window.ultahState.currentPage = 1;
        window.renderUltahPage();
        
    }, 50); 
};

// 3. FUNGSI RENDER HALAMAN (PAGINASI)
window.renderUltahPage = function() {
    const container = document.getElementById('ultahResultGrid');
    const state = window.ultahState;
    
    if(state.results.length === 0) { 
        container.innerHTML = `<div class="p-6 text-center text-slate-400 font-medium text-sm col-span-full border-2 border-dashed border-slate-200 rounded-2xl">Tidak ada unit gereja yang berulang tahun di rentang tanggal tersebut.</div>`; 
        return; 
    }
    
    const totalPages = Math.ceil(state.results.length / state.itemsPerPage);
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    const currentData = state.results.slice(startIndex, endIndex);
    
    let htmlContent = currentData.map(r => {
        let tglStr = r.tglBerdiriAsli.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}); 
        let ultahStr = r.tglUltahTahunIni.toLocaleDateString('id-ID', {day:'numeric', month:'long'});
        return `<div class="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden animate-zoom"><div class="absolute -right-4 -top-4 text-rose-50 opacity-50 text-7xl"><i class="fas fa-birthday-cake"></i></div><div class="relative z-10"><span class="px-2 py-1 bg-rose-100 text-rose-700 text-[9px] font-black rounded uppercase tracking-wider mb-2 inline-block">${ultahStr}</span><h4 class="font-bold text-slate-800 text-sm leading-tight mb-1 truncate" title="${r.gereja}">${r.gereja}</h4><p class="text-[10px] text-slate-500 font-semibold mb-3 truncate">${r.resort}</p><div class="flex items-end justify-between border-t border-slate-100 pt-3"><div><p class="text-[9px] text-slate-400 uppercase font-bold">Berdiri Sejak</p><p class="text-[11px] font-bold text-slate-700">${tglStr}</p></div><div class="text-right"><p class="text-[9px] text-rose-400 uppercase font-bold">Ulang Tahun Ke</p><p class="text-lg font-black text-rose-600 leading-none">${r.usia} <span class="text-[10px]">Thn</span></p></div></div></div></div>`;
    }).join('');
    
    // Injeksi Tombol Paginasi jika lebih dari 1 halaman
    if (totalPages > 1) {
        let btnPrev = state.currentPage > 1 ? `<button onclick="window.gantiPageUltah(${state.currentPage - 1})" class="px-4 py-2 text-xs font-semibold bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100 transition-colors">Sebelumnya</button>` : `<div class="w-[90px]"></div>`;
        let btnNext = state.currentPage < totalPages ? `<button onclick="window.gantiPageUltah(${state.currentPage + 1})" class="px-4 py-2 text-xs font-semibold bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100 transition-colors">Selanjutnya</button>` : `<div class="w-[90px]"></div>`;
        
        htmlContent += `<div class="col-span-full flex items-center justify-between pt-4 border-t border-slate-100 mt-2">
            ${btnPrev}
            <span class="text-xs font-bold text-slate-500">Halaman ${state.currentPage} / ${totalPages}</span>
            ${btnNext}
        </div>`;
    }
    
    container.innerHTML = htmlContent;
};

// 4. FUNGSI KLIK PINDAH HALAMAN
window.gantiPageUltah = function(pageNumber) {
    window.ultahState.currentPage = pageNumber;
    window.renderUltahPage();
};

// 5. FUNGSI RESET
window.resetUlangTahunGereja = function() { 
    document.getElementById('ultahStart').value = ""; 
    document.getElementById('ultahEnd').value = ""; 
    window.ultahState.results = [];
    window.ultahState.currentPage = 1;
    document.getElementById('ultahResultGrid').innerHTML = `<div class="p-6 text-center text-slate-400 font-medium text-sm col-span-full border-2 border-dashed border-slate-200 rounded-2xl">Pilih rentang tanggal untuk melihat gereja yang berulang tahun.</div>`; 
};
  // Fungsi Pengubah Format Tanggal (ISO ke Lokal)
  window.formatTanggalIndo = function(tgl) {
      if (!tgl) return '-';
      let d = window.parseDateSafe(tgl);
      if (!d || isNaN(d.getTime())) return String(tgl).split('T')[0];
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  window.bukaPreviewCetakKeluarga = function(noKK) {
      let members = DATA_MASTER.jemaat.filter(j => String(j.No_KK).trim() === String(noKK).trim());
      if (members.length === 0) return Swal.fire('Error', 'Data keluarga tidak ditemukan', 'error');
      let kpl = members.find(m => String(m.Status_Keluarga).toLowerCase() === 'kepala keluarga') || members[0];
      safeSetText('judulCetakPdf', 'KARTU KELUARGA JEMAAT'); safeSetText('tglCetakPdf', 'No. KK: ' + noKK);
      safeSetHTML('infoFilterCetak', `<div><b>Kepala Keluarga:</b> ${kpl.Nama_Lengkap}</div><div><b>Unit Gereja:</b> ${kpl.Nama_Gereja}</div><div><b>Resort:</b> ${kpl.Resort} (W-${kpl.Wilayah})</div>`);
      safeSetHTML('headTabelCetak', `<tr><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">No</th><th style="border: 1px solid #cbd5e1; padding: 6px;">Nama Lengkap</th><th style="border: 1px solid #cbd5e1; padding: 6px;">Status Hubungan</th><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">L/P</th><th style="border: 1px solid #cbd5e1; padding: 6px;">Tgl Lahir</th><th style="border: 1px solid #cbd5e1; padding: 6px;">Pekerjaan</th></tr>`);
      
      // Menggunakan formatTanggalIndo di sini
      safeSetHTML('bodyTabelCetak', members.map((m, i) => `<tr><td style="border: 1px solid #cbd5e1; padding: 5px; text-align:center;">${i+1}</td><td style="border: 1px solid #cbd5e1; padding: 5px; font-weight:bold;">${m.Nama_Lengkap||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${m.Status_Keluarga||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px; text-align:center;">${m.Jenis_Kelamin||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${formatTanggalIndo(m.Tanggal_Lahir)}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${m.Pekerjaan||'-'}</td></tr>`).join(''));
      
      persiapkanModalCetak(); document.getElementById('modalCetakData').classList.remove('hidden');
  };

window.generateTableHtmlTree = function(majelisList) {
      if(!majelisList || majelisList.length === 0) return `<div class="p-6 text-center text-xs text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-xl">Belum ada personil terdaftar.</div>`;
      const role = USER_NOW ? String(USER_NOW.role).toLowerCase() : 'viewer';
      let trs = majelisList.map((m, idx) => {
          let hpClean = String(m.No_HP || '').replace(/\D/g, ''); if (hpClean.startsWith("0")) hpClean = "62" + hpClean.slice(1);
          let btnP = (role.includes('admin') || role.includes('editor')) ? `<button onclick="bukaProfil('${m.ID_Majelis}'); event.stopPropagation();" class="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white transition-all"><i class="fas fa-id-badge"></i></button>` : '';
          let btnW = (role.includes('admin') || role.includes('editor')) ? ((hpClean.length >= 9) ? `<a href="https://wa.me/${hpClean}" target="_blank" onclick="event.stopPropagation();" class="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"><i class="fab fa-whatsapp"></i></a>` : `<button onclick="Swal.fire('Data Tidak Lengkap', 'Nomor WA tidak valid.', 'info'); event.stopPropagation();" class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200"><i class="fab fa-whatsapp"></i></button>`) : '';
          let btnE = (role.includes('admin') || role.includes('editor')) ? `<button onclick="editDataMajelis('${m.ID_Majelis}'); event.stopPropagation();" class="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition-all"><i class="fas fa-pen"></i></button>` : '';
          let btnH = (role.includes('admin')) ? `<button onclick="konfirmasiHapus('${m.ID_Majelis}'); event.stopPropagation();" class="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white transition-all"><i class="fas fa-trash"></i></button>` : '';
          
          // ---> PENAMBAHAN TOMBOL MUTASI DI SINI
          let id = m.ID_Majelis;
          let btnMutasi = (role.includes('admin') || role.includes('editor')) ? `<button onclick="bukaMutasi('${id}'); event.stopPropagation();" class="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all" title="Mutasi Personil"><i class="fas fa-exchange-alt"></i></button>` : '';

          // ---> PENAMBAHAN ${btnMutasi} KE DALAM WADAH INLINE-FLEX
          return `<tr class="hover:bg-slate-50 transition-colors border-b border-slate-100"><td class="p-3.5 text-center text-slate-400 font-bold text-xs w-10">${idx + 1}</td><td class="p-3.5"><div class="font-bold text-slate-800 text-sm">${m.Nama_Lengkap||'-'}</div><div class="text-[10px] text-slate-400 font-mono mt-0.5">UID: ${m.ID_Majelis||''}</div></td><td class="p-3.5"><span class="px-2.5 py-1 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-600 uppercase tracking-wider">${m.Jabatan || '-'}</span></td><td class="p-3.5 text-center w-36"><div class="inline-flex gap-1.5">${btnP}${btnW}${btnMutasi}${btnE}${btnH}</div></td></tr>`;
      }).join('');
      return `<div class="overflow-x-auto rounded-xl border border-slate-200 shadow-sm"><table class="w-full text-left whitespace-nowrap"><thead class="bg-slate-100/80 border-b border-slate-200"><tr><th class="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">No</th><th class="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Lengkap</th><th class="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jabatan</th><th class="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Aksi</th></tr></thead><tbody class="bg-white">${trs}</tbody></table></div>`;
  };

 window.bukaDetailUnit = function(unitName) {
      const data = window.currentTreeData[unitName]; if(!data) return;
      const header = document.getElementById('headerModalStruktur'); const body = document.getElementById('bodyModalStruktur');
      
      // MENCARI NAMA KORWIL BERDASARKAN WILAYAH GEREJA INI
      let infoKorwil = "Korwil Belum Terdaftar";
      let gerejaWilayah = parseInt(String(data.wilayah).replace(/\D/g, ''));
      
      if (!isNaN(gerejaWilayah) && DATA_MASTER.korwil) {
          let temuanKorwil = DATA_MASTER.korwil.find(k => {
              let mWil = parseInt(String(k.Wilayah).replace(/\D/g, ''));
              return mWil === gerejaWilayah && k.Status === 'Aktif'; // Ambil yang aktif saja
          });
          
          if (temuanKorwil) {
              infoKorwil = `Korwil: ${temuanKorwil.Nama_Korwil}`;
          }
      }

      header.className = `px-8 py-6 flex flex-col md:flex-row justify-between items-center text-white z-10 shrink-0 shadow-sm border-b border-white/20 ${data.isJK ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600' : 'bg-gradient-to-r from-indigo-600 to-blue-600'}`;
      
      // PERBAIKAN: Mengubah ukuran font nama gereja (text-xl md:text-2xl) dan menambahkan baris Korwil
      header.innerHTML = `
      <div class="text-center md:text-left w-full md:w-auto">
          <span class="px-3 py-1 bg-white/20 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 inline-block shadow-sm text-white">${data.isJK ? 'Jemaat Khusus' : 'Resort Induk'} • Wilayah ${data.wilayah}</span>
          <h3 class="text-xl md:text-2xl font-black flex items-center justify-center md:justify-start drop-shadow-md tracking-tight truncate max-w-[500px]">
              <i class="fas ${data.isJK ? 'fa-church' : 'fa-map-marked-alt'} mr-3 opacity-90 text-2xl shrink-0"></i> 
              <span class="truncate" title="${unitName}">${unitName}</span>
          </h3>
          <div class="text-xs font-bold text-white/80 mt-1 uppercase tracking-widest ml-9"><i class="fas fa-user-tie mr-1 opacity-70"></i> ${infoKorwil}</div>
          
          <div class="flex gap-4 mt-3 justify-center md:justify-start ml-9">
              <span class="text-xs font-bold text-white/90 bg-black/10 px-3 py-1.5 rounded-lg backdrop-blur-sm"><i class="fas fa-users-cog mr-1.5 opacity-70"></i> ${data.totalRT.toLocaleString('id-ID')} RT</span>
              <span class="text-xs font-bold text-white/90 bg-black/10 px-3 py-1.5 rounded-lg backdrop-blur-sm"><i class="fas fa-user-friends mr-1.5 opacity-70"></i> ${data.totalJiwa.toLocaleString('id-ID')} Jiwa</span>
          </div>
      </div>
      <div class="mt-6 md:mt-0 flex gap-3 w-full md:w-auto">
          <button onclick="cetakPdfUnitLokal('${unitName}')" class="flex-1 md:flex-none px-6 py-3.5 bg-white ${data.isJK ? 'text-purple-700' : 'text-indigo-700'} hover:bg-slate-50 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 border-b-2 border-slate-200"><i class="fas fa-print text-base"></i> Cetak Seluruh Unit</button>
          <button onclick="document.getElementById('modalStrukturUnit').classList.add('hidden')" class="w-12 h-12 flex items-center justify-center bg-white/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all border border-white/30 text-white shrink-0"><i class="fas fa-times text-lg"></i></button>
      </div>`;

      let html = '';
      if(data.isJK) {
          html += `<div class="mb-4 flex items-center justify-between bg-white py-3 px-4 rounded-xl shadow-sm border border-slate-200"><h4 class="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center"><i class="fas fa-sitemap text-purple-500 mr-3 text-lg"></i> Susunan Majelis Jemaat</h4></div>`;
          html += generateTableHtmlTree(data.phr);
      } else {
          html += `<div class="mb-4 flex items-center justify-between bg-white py-3 px-4 rounded-xl shadow-sm border border-slate-200"><h4 class="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center"><i class="fas fa-sitemap text-amber-500 mr-3 text-lg"></i> Pengurus Harian Resort (PHR)</h4><button onclick="cetakPdfSpesifik('${unitName}', 'PHR')" class="bg-amber-50 hover:bg-amber-500 text-amber-600 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors shadow-sm"><i class="fas fa-print mr-1"></i> Cetak PHR</button></div>`;
          html += generateTableHtmlTree(data.phr);

          let pagaranKeys = Object.keys(data.pagaran).sort();
          if(pagaranKeys.length > 0) {
              html += `<div class="mt-8 mb-4"><h4 class="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center bg-white py-3 px-4 rounded-xl shadow-sm border border-slate-200"><i class="fas fa-church text-indigo-500 mr-3 text-lg"></i> Susunan Majelis Pagaran</h4></div>`;
              html += pagaranKeys.map(pk => `
                  <details class="bg-white border border-indigo-100 rounded-2xl overflow-hidden group mb-4 shadow-sm">
                      <summary class="p-5 font-bold cursor-pointer flex justify-between items-center transition-colors hover:bg-slate-50 group-open:bg-indigo-50/50">
                          <div class="flex items-center gap-4"><div class="w-8 h-8 rounded-full bg-indigo-50 text-indigo-400 flex items-center justify-center group-open:bg-indigo-500 group-open:text-white group-open:rotate-90 transition-all shadow-inner"><i class="fas fa-caret-right text-sm"></i></div><div class="text-[15px] font-bold text-slate-800 flex items-center">${pk}</div></div>
                          <div class="flex items-center gap-4"><span class="text-xs bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full font-black tracking-widest">${data.pagaran[pk].length} Personil</span><button onclick="cetakPdfSpesifik('${unitName}', '${pk}'); event.stopPropagation();" class="bg-white hover:bg-indigo-600 text-indigo-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-indigo-200 transition-colors shadow-sm"><i class="fas fa-print"></i> Cetak</button></div>
                      </summary>
                      <div class="border-t border-indigo-100 bg-slate-50/80 p-5">${generateTableHtmlTree(data.pagaran[pk])}</div>
                  </details>`).join('');
          }
      }
      body.innerHTML = html; document.getElementById('modalStrukturUnit').classList.remove('hidden');
  }
  function persiapkanModalCetak() { document.getElementById('modalCetakData').style.zIndex = "110"; }
  window.cetakPdfUnitLokal = function(unitName) {
      const data = window.currentTreeData[unitName]; if(!data) return;
      safeSetText('judulCetakPdf', data.isJK ? 'Susunan Majelis Jemaat Khusus' : 'Susunan Majelis Resort'); safeSetText('tglCetakPdf', "Dicetak pada: " + new Date().toLocaleDateString('id-ID')); 
      safeSetHTML('infoFilterCetak', `<div><b>Unit:</b> ${unitName}</div><div><b>Wilayah:</b> W-${data.wilayah}</div><div><b>Total RT:</b> ${data.totalRT.toLocaleString('id-ID')}</div><div><b>Total Jiwa:</b> ${data.totalJiwa.toLocaleString('id-ID')}</div>`);
      safeSetHTML('headTabelCetak', `<tr><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 5%;">No</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 35%;">Nama Lengkap</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 25%;">Jabatan</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 20%;">No. WA</th><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 15%;">Wilayah</th></tr>`); 
      let pdfHtml = '';
      if (data.phr.length > 0) {
          pdfHtml += `<tr style="background-color: #1e293b; color: white; font-weight: bold; page-break-after: avoid;"><td colspan="5" style="border: 1px solid #cbd5e1; padding: 8px;"><span style="font-size: 11px;">${data.isJK ? '⛪ Jemaat Khusus' : '🏢 Pengurus Harian Resort (PHR)'}</span></td></tr>`;
          pdfHtml += data.phr.map((m, i) => `<tr style="page-break-inside: avoid;"><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${i+1}</td><td style="border: 1px solid #cbd5e1; padding: 5px; font-weight: bold; color: #0f172a;">${m.Nama_Lengkap||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${m.Jabatan||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${m.No_HP||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">W-${m.Wilayah||'-'}</td></tr>`).join('');
      }
      if (!data.isJK) {
          Object.keys(data.pagaran).sort().forEach(pk => {
              pdfHtml += `<tr style="background-color: #f1f5f9; font-weight: bold; page-break-after: avoid;"><td colspan="5" style="border: 1px solid #cbd5e1; padding: 8px; color: #4338ca;"><span style="font-size: 11px;">⛪ Pagaran: ${pk}</span></td></tr>`;
              pdfHtml += data.pagaran[pk].map((m, i) => `<tr style="page-break-inside: avoid;"><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${i+1}</td><td style="border: 1px solid #cbd5e1; padding: 5px; font-weight: bold; color: #0f172a;">${m.Nama_Lengkap||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${m.Jabatan||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${m.No_HP||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">W-${m.Wilayah||'-'}</td></tr>`).join('');
          });
      }
      safeSetHTML('bodyTabelCetak', pdfHtml); persiapkanModalCetak(); document.getElementById('modalCetakData').classList.remove('hidden');
  }

  window.cetakPdfSpesifik = function(unitName, targetName) {
      const data = window.currentTreeData[unitName]; if(!data) return;
      let majelisCetak = []; let isCetakPHR = (targetName === 'PHR');
      if (isCetakPHR) majelisCetak = data.phr; else majelisCetak = data.pagaran[targetName];
      if (!majelisCetak || majelisCetak.length === 0) return Swal.fire('Data Kosong', 'Tidak ada personil terdaftar di grup ini.', 'info');

      safeSetText('judulCetakPdf', isCetakPHR ? 'Pengurus Harian Resort' : 'Susunan Majelis Pagaran'); safeSetText('tglCetakPdf', "Dicetak pada: " + new Date().toLocaleDateString('id-ID')); 
      safeSetHTML('infoFilterCetak', `<div><b>Resort Induk:</b> ${unitName}</div><div><b>Cetak Area:</b> ${isCetakPHR ? 'PHR' : targetName}</div><div><b>Wilayah:</b> W-${data.wilayah}</div>`);
      safeSetHTML('headTabelCetak', `<tr><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 5%;">No</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 35%;">Nama Lengkap</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 25%;">Jabatan</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 20%;">No. WA</th><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 15%;">Wilayah</th></tr>`); 
      
      let pdfHtml = `<tr style="background-color: #1e293b; color: white; font-weight: bold; page-break-after: avoid;"><td colspan="5" style="border: 1px solid #cbd5e1; padding: 10px; font-size: 14px;">${isCetakPHR ? '🏢 PENGURUS HARIAN RESORT' : '⛪ GEREJA PAGARAN: ' + targetName} <span style="font-weight:normal; font-size:10px; color:#cbd5e1; float:right;">(${unitName})</span></td></tr>`;
      pdfHtml += majelisCetak.map((m, i) => `<tr style="page-break-inside: avoid;"><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${i+1}</td><td style="border: 1px solid #cbd5e1; padding: 5px; font-weight: bold; color: #0f172a;">${m.Nama_Lengkap||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${m.Jabatan||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${m.No_HP||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">W-${m.Wilayah||'-'}</td></tr>`).join('');
      
      safeSetHTML('bodyTabelCetak', pdfHtml); persiapkanModalCetak(); document.getElementById('modalCetakData').classList.remove('hidden');
  }

  
window.bukaPreviewCetakData = async function() { 
    // Tunggu pustaka selesai diunduh
    const siap = await window.muatLibraryPDF();
    if (!siap) return;
    const isJemaat = document.getElementById('pageJemaat') && !document.getElementById('pageJemaat').classList.contains('hidden'); 
    const isMajelis = document.getElementById('pageSearch') && !document.getElementById('pageSearch').classList.contains('hidden') && !document.getElementById('kontenMajelis').classList.contains('hidden'); 
    const isIndividu = document.getElementById('pageSearch') && !document.getElementById('pageSearch').classList.contains('hidden') && !document.getElementById('kontenIndividu').classList.contains('hidden'); 
    const isKorwil = document.getElementById('pageSearch') && !document.getElementById('pageSearch').classList.contains('hidden') && !document.getElementById('kontenKorwil').classList.contains('hidden');
    const isGereja = document.getElementById('pageSearch') && !document.getElementById('pageSearch').classList.contains('hidden') && !document.getElementById('kontenGereja').classList.contains('hidden');

    let dataList = [];
    if(isJemaat) { dataList = window.currentFilteredJemaat || []; }
    else if(isMajelis || isIndividu) { dataList = window.currentFilteredList || []; }
    else if(isKorwil) { dataList = DATA_MASTER.korwil || []; }
    else { dataList = window.currentFilteredGereja || []; }
    
    let judul = "Data Jemaat & Unit Gereja"; 
    if (isMajelis) judul = "Struktur Majelis Per Gereja"; 
    if (isIndividu) judul = "Direktori Personil Majelis"; 
    if (isJemaat) judul = "Data Keluarga Jemaat"; 
    if (isKorwil) judul = "Daftar Koordinator Wilayah (Korwil)";
    
    if (!isMajelis && (!dataList || dataList.length === 0)) { 
        return Swal.fire('Data Kosong', 'Tidak ada data untuk dicetak saat ini.', 'info'); 
    } 

    safeSetText('judulCetakPdf', judul); 
    safeSetText('tglCetakPdf', "Dicetak pada: " + new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })); 

    let fwText = "-", frText = "-", fgText = "-", fjText = "-";
    try {
        if(isJemaat) {
            const fw = document.getElementById('f_wil_j'); const fr = document.getElementById('f_res_j'); const fg = document.getElementById('f_ger_j'); 
            fwText = (fw && fw.selectedIndex >= 0) ? fw.options[fw.selectedIndex].text : '-'; 
            frText = (fr && fr.selectedIndex >= 0) ? fr.options[fr.selectedIndex].text : '-'; 
            fgText = (fg && fg.selectedIndex >= 0) ? fg.options[fg.selectedIndex].text : '-';
            safeSetHTML('infoFilterCetak', `<div><b>Wilayah:</b> ${fwText}</div><div><b>Resort / JK:</b> ${frText}</div><div><b>Unit Gereja:</b> ${fgText}</div>`); 
        } else if (isKorwil) {
            // Filter info khusus untuk Korwil
            safeSetHTML('infoFilterCetak', `<div><b>Kategori Data:</b> Seluruh Koordinator Wilayah</div><div><b>Status:</b> Aktif & Non-Aktif</div>`); 
        } else {
            const fw = document.getElementById('filterWilayah'); const fr = document.getElementById('filterResort'); const fg = document.getElementById('filterGereja'); const fj = document.getElementById('filterJabatan'); 
            fwText = (fw && fw.selectedIndex >= 0) ? fw.options[fw.selectedIndex].text : '-'; 
            frText = (fr && fr.selectedIndex >= 0) ? fr.options[fr.selectedIndex].text : '-'; 
            fgText = (fg && fg.selectedIndex >= 0) ? fg.options[fg.selectedIndex].text : '-'; 
            fjText = (fj && fj.selectedIndex >= 0) ? fj.options[fj.selectedIndex].text : '-';
            safeSetHTML('infoFilterCetak', `<div><b>Wilayah:</b> ${fwText}</div><div><b>Resort / JK:</b> ${frText}</div><div><b>Unit Gereja:</b> ${fgText}</div>${(isMajelis || isIndividu) ? `<div><b>Jabatan:</b> ${fjText}</div>` : ''}`); 
        }
    } catch(e) {}

    const areaTabel = document.querySelector('#areaCetakDokumen table');
    if (areaTabel) areaTabel.style.fontSize = "9px"; 

    const docArea = document.getElementById('areaCetakDokumen');
    if (docArea) {
      if (isIndividu || isJemaat || isKorwil || (!isMajelis && !isGereja)) {
          docArea.setAttribute('data-orientation', 'landscape');
      } else {
          docArea.setAttribute('data-orientation', 'portrait');
      }
    }

    if(isKorwil) {
        safeSetHTML('headTabelCetak', `<tr><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 5%;">No</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 30%;">Nama Lengkap Korwil</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 10%; text-align: center;">Wilayah</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 10%; text-align: center;">Status</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 15%;">No. WA</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 30%;">Keterangan</th></tr>`); 
        
        let korwilTerurut = [...dataList].sort((a,b) => (parseInt(String(a.Wilayah).replace(/\D/g, ''))||999) - (parseInt(String(b.Wilayah).replace(/\D/g, ''))||999));
        
        safeSetHTML('bodyTabelCetak', korwilTerurut.map((k, i) => `<tr style="page-break-inside: avoid;"><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${i+1}</td><td style="border: 1px solid #cbd5e1; padding: 5px; font-weight: bold; color: #0f172a;">${k.Nama_Korwil||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">W-${k.Wilayah||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${k.Status||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${k.No_HP||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${k.Keterangan||'-'}</td></tr>`).join('')); 

    } else if(isJemaat) { 
        safeSetHTML('headTabelCetak', `<tr><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 5%;">No</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 15%;">No KK</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 25%;">Nama Lengkap</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 15%;">Status</th><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 10%;">L/P</th><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 15%;">Umur</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 15%;">Pekerjaan</th></tr>`); 
        safeSetHTML('bodyTabelCetak', dataList.map((j, i) => `<tr style="page-break-inside: avoid;"><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${i+1}</td><td style="border: 1px solid #cbd5e1; padding: 5px; font-weight: bold;">${j.No_KK||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${j.Nama_Lengkap||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${j.Status_Keluarga||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${j.Jenis_Kelamin||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${hitungUmur(j.Tanggal_Lahir)}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${j.Pekerjaan||'-'}</td></tr>`).join('')); 
    } else if (isMajelis) { 
        safeSetHTML('headTabelCetak', `<tr><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 5%;">No</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 35%;">Nama Lengkap</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 25%;">Jabatan</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 20%;">No. WA</th><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 15%;">Wilayah</th></tr>`); 
        
        let pdfTree = window.currentTreeData;
        const groupArray = Object.keys(pdfTree).map(k => ({ name: k, ...pdfTree[k] })).sort((a,b) => a.name.localeCompare(b.name));

        if (groupArray.length === 0) {
             return Swal.fire('Data Kosong', 'Tidak ada data majelis untuk dicetak pada filter yang Anda pilih saat ini.', 'info');
        }
        
        let pdfHtml = groupArray.map(g => {
            let htmlBlock = `<tr style="background-color: #1e293b; color: white; font-weight: bold; page-break-after: avoid;"><td colspan="5" style="border: 1px solid #cbd5e1; padding: 10px; font-size: 14px;">${g.isJK ? '⛪ JEMAAT KHUSUS: ' : '🏢 RESORT: '} ${g.name} <span style="font-weight:normal; font-size:10px; color:#cbd5e1; float:right;">(Wilayah ${g.wilayah})</span></td></tr>`;
            
            if (g.phr.length > 0) {
                htmlBlock += `<tr style="background-color: #f1f5f9; font-weight: bold; page-break-after: avoid;"><td colspan="5" style="border: 1px solid #cbd5e1; padding: 8px; color: #b45309;"><span style="font-size: 11px;">${g.isJK ? 'Susunan Majelis Jemaat Khusus' : 'Pengurus Harian Resort (PHR)'}</span></td></tr>`;
                htmlBlock += g.phr.map((m, i) => `<tr style="page-break-inside: avoid;"><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${i+1}</td><td style="border: 1px solid #cbd5e1; padding: 5px; font-weight: bold; color: #0f172a;">${m.Nama_Lengkap||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${m.Jabatan||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${m.No_HP||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">W-${m.Wilayah||'-'}</td></tr>`).join('');
            }
            
            if (!g.isJK) {
                Object.keys(g.pagaran).sort().forEach(pk => {
                    htmlBlock += `<tr style="background-color: #f8fafc; font-weight: bold; page-break-after: avoid;"><td colspan="5" style="border: 1px solid #cbd5e1; padding: 8px; color: #4338ca;"><span style="font-size: 11px;">⛪ Gereja Pagaran: ${pk}</span></td></tr>`;
                    htmlBlock += g.pagaran[pk].map((m, i) => `<tr style="page-break-inside: avoid;"><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${i+1}</td><td style="border: 1px solid #cbd5e1; padding: 5px; font-weight: bold; color: #0f172a;">${m.Nama_Lengkap||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${m.Jabatan||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${m.No_HP||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">W-${m.Wilayah||'-'}</td></tr>`).join('');
                });
            }
            return htmlBlock;
        }).join('');

        safeSetHTML('bodyTabelCetak', pdfHtml);

    } else if (isIndividu) { 
        safeSetHTML('headTabelCetak', `<tr><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 4%;">No</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 22%;">Nama Lengkap</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 16%;">Jabatan</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 28%;">Penempatan Unit</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 15%;">Resort/Wilayah</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 15%;">No. WA</th></tr>`); 
        safeSetHTML('bodyTabelCetak', dataList.map((m, i) => { let infoGereja = m.Nama_Gereja ? String(m.Nama_Gereja).toUpperCase() : 'TINGKAT RESORT'; let infoResort = m.Resort ? String(m.Resort).toUpperCase() : 'JEMAAT KHUSUS'; return `<tr style="page-break-inside: avoid;"><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${i+1}</td><td style="border: 1px solid #cbd5e1; padding: 5px; font-weight: bold; color: #0f172a;">${m.Nama_Lengkap||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${m.Jabatan||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${infoGereja}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${infoResort} (W-${m.Wilayah||'-'})</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${m.No_HP||'-'}</td></tr>`; }).join('')); 
    } else { 
        safeSetHTML('headTabelCetak', `<tr><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 4%;">No</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 25%;">Nama Unit Gereja</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 14%;">Status</th><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 8%;">Wilayah</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 25%;">Induk Resort / JK</th><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 12%;">Total RT</th><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 12%;">Total Jiwa</th></tr>`); 
        let totRT = 0, totJiwa = 0; 
        safeSetHTML('bodyTabelCetak', dataList.map((g, i) => { let rt = parseInt(g.Total_RT) || 0; let jiwa = parseInt(g.Total_Jiwa) || 0; totRT += rt; totJiwa += jiwa; return `<tr style="page-break-inside: avoid;"><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${i+1}</td><td style="border: 1px solid #cbd5e1; padding: 5px; font-weight: bold; color: #0f172a;">${g.Nama_Gereja||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${g.Status_Gereja || g.Tipe_Gereja || 'Pagaran'}</td><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${g.Wilayah||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${g.Induk_Resort || g.Resort || 'Jemaat Khusus'}</td><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${rt}</td><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${jiwa}</td></tr>`; }).join('') + `<tr style="background-color: #f1f5f9; font-weight: bold; font-size: 10px; page-break-inside: avoid;"><td colspan="5" style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">TOTAL KESELURUHAN:</td><td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; color: #b45309;">${totRT}</td><td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; color: #15803d;">${totJiwa}</td></tr>`); 
    } 
    
    persiapkanModalCetak();
    document.getElementById('modalCetakData').classList.remove('hidden'); 
}

  // --- KONTROL DASAR ---
  function tutupPreviewCetakData() { if(document.getElementById('modalCetakData')) document.getElementById('modalCetakData').classList.add('hidden'); }
  function closePdfPreview() { const modal = document.getElementById('modalPdfPreview'); if(modal) { modal.classList.add('hidden'); modal.style.zIndex = "80"; } }
  
window.eksekusiCetakTabelPDF = function() {
    const isMajelis = document.getElementById('kontenMajelis') && !document.getElementById('kontenMajelis').classList.contains('hidden'); 
    const isIndividu = document.getElementById('kontenIndividu') && !document.getElementById('kontenIndividu').classList.contains('hidden'); 
    const isJemaat = document.getElementById('pageJemaat') && !document.getElementById('pageJemaat').classList.contains('hidden'); 
    const isKorwil = document.getElementById('kontenKorwil') && !document.getElementById('kontenKorwil').classList.contains('hidden');
    
    let namaFile = 'Laporan_Data_Gereja_GKPI.pdf'; 
    if (isMajelis) namaFile = 'Laporan_Struktur_Majelis_GKPI.pdf'; 
    if (isIndividu) namaFile = 'Laporan_Direktori_Personil_GKPI.pdf'; 
    if (isJemaat) namaFile = 'Laporan_Keluarga_Jemaat_GKPI.pdf';
    if (isKorwil) namaFile = 'Laporan_Koordinator_Wilayah_GKPI.pdf';

    const isDark = document.documentElement.classList.contains('dark'); 
    if (isDark) document.documentElement.classList.remove('dark');

    const docArea = document.getElementById('areaCetakDokumen');
    let targetOrientation = 'portrait';
    if (docArea && docArea.getAttribute('data-orientation') === 'landscape') {
        targetOrientation = 'landscape';
    }

    Swal.fire({ title: 'Menyusun PDF...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    
    html2pdf()
      .set({ 
          margin: [0.4, 0.3, 0.4, 0.3], 
          filename: namaFile, 
          image: { type: 'jpeg', quality: 1 }, 
          html2canvas: { scale: 2, useCORS: true }, 
          jsPDF: { unit: 'in', format: 'a4', orientation: targetOrientation }, 
          pagebreak: { mode: 'avoid-all', avoid: 'tr' } 
      })
      .from(docArea)
      .save()
      .then(() => { 
          if (isDark) document.documentElement.classList.add('dark'); 
          tutupPreviewCetakData(); 
          Swal.fire('Berhasil!', 'File PDF siap dicetak!', 'success'); 
      });
}

 function renderTabelIndividu(data, resetPage = true) {
    if (resetPage) currentPageIndividu = 1;
    if(document.getElementById('totalIndividu')) document.getElementById('totalIndividu').innerText = data.length + " Orang";
    const startIndex = (currentPageIndividu - 1) * itemsPerPage; const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);
    const body = document.getElementById('individuTableBody'); if(!body) return; const role = USER_NOW ? String(USER_NOW.role).toLowerCase() : 'viewer';
    body.innerHTML = paginatedData.length ? paginatedData.map((m, idx) => {
        const no = startIndex + idx + 1; const hp = m.No_HP || m['No-HP'] || m['No HP'] || m.No_Hp || ''; const id = m.ID_Majelis || ''; const nama = m.Nama_Lengkap || '-'; 
        let hpClean = String(hp).replace(/\D/g, ''); if (hpClean.startsWith("0")) hpClean = "62" + hpClean.slice(1); if (hpClean.startsWith("8")) hpClean = "62" + hpClean;
        let btnProfil = (role.includes('admin') || role.includes('editor')) ? `<button onclick="bukaProfil('${id}')" class="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white transition-all"><i class="fas fa-id-badge"></i></button>` : '';
        let btnWA = (role.includes('admin') || role.includes('editor')) ? ((hpClean.length >= 9) ? `<a href="https://wa.me/${hpClean}" target="_blank" title="Chat WA" class="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"><i class="fab fa-whatsapp"></i></a>` : `<button onclick="Swal.fire('Data Tidak Lengkap', 'Nomor WhatsApp tidak valid.', 'info')" title="WA Kosong" class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200 transition-all"><i class="fab fa-whatsapp"></i></button>`) : '';
        let btnEdit = (role.includes('admin') || role.includes('editor')) ? `<button onclick="editDataMajelis('${id}')" class="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition-all"><i class="fas fa-pen"></i></button>` : '';
        let btnHapus = (role.includes('admin')) ? `<button onclick="konfirmasiHapus('${id}')" class="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white transition-all"><i class="fas fa-trash"></i></button>` : '';
        
        // ---> PENAMBAHAN TOMBOL MUTASI DI SINI
        let btnMutasi = (role.includes('admin') || role.includes('editor')) ? `<button onclick="bukaMutasi('${id}'); event.stopPropagation();" class="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all" title="Mutasi Personil"><i class="fas fa-exchange-alt"></i></button>` : '';

        let infoGereja = m.Nama_Gereja ? String(m.Nama_Gereja).toUpperCase() : 'TINGKAT RESORT'; let infoResort = m.Resort ? String(m.Resort).toUpperCase() : 'JEMAAT KHUSUS';
        
        // ---> PENAMBAHAN ${btnMutasi} KE DALAM WADAH INLINE-FLEX
        return `<tr class="hover:bg-slate-50 transition-colors group border-b border-slate-50"><td class="p-5 text-center text-slate-400 font-bold text-xs">${no}</td><td class="p-5"><div class="font-bold text-slate-800 text-sm">${nama}</div><div class="text-[10px] text-slate-400 font-mono mt-0.5">UID: ${id}</div></td><td class="p-5"><span class="px-2 py-1 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 uppercase">${m.Jabatan || '-'}</span></td><td class="p-5"><div class="text-[11px] font-bold text-slate-700"><i class="fas fa-church text-indigo-400 w-4"></i> ${infoGereja}</div><div class="text-[10px] text-slate-500 tracking-wider mt-1 uppercase">${infoResort} • Wilayah ${m.Wilayah || '-'}</div></td><td class="p-5 text-center"><div class="inline-flex gap-2">${btnProfil}${btnWA}${btnMutasi}${btnEdit}${btnHapus}</div></td></tr>`;
    }).join('') : `<tr><td colspan="5" class="p-10 text-center text-slate-400 font-medium">Data Personil Tidak Ditemukan</td></tr>`;
    renderPaginationUI(data.length, currentPageIndividu, 'paginationIndividu', 'individu', itemsPerPage);
  }

function renderTabelGereja(dataGereja, resetPage = true) {
    if (resetPage) currentPageGereja = 1; 
    const paginatedData = dataGereja.slice((currentPageGereja - 1) * itemsPerPage, ((currentPageGereja - 1) * itemsPerPage) + itemsPerPage);
    const body = document.getElementById('gerejaTableBody'); if(!body) return; 
    const role = USER_NOW ? String(USER_NOW.role).toLowerCase() : 'viewer'; 
    let filterRT = 0; let filterJiwa = 0; 
    dataGereja.forEach(g => { filterRT += parseInt(g.Total_RT) || 0; filterJiwa += parseInt(g.Total_Jiwa) || 0; });

    body.innerHTML = paginatedData.length ? paginatedData.map(g => {
        const namaG = g.Nama_Gereja || g['Nama Gereja'] || '-'; 
        const res = g.Induk_Resort || g.Resort || 'Jemaat Khusus'; 
        const wil = g.Wilayah || '-'; 
        const rt = parseInt(g.Total_RT) || 0; 
        const jiwa = parseInt(g.Total_Jiwa) || 0; 
        const statusGrj = g.Status_Gereja || g['Status Gereja'] || g.Tipe_Gereja || g['Tipe Gereja'] || 'Pagaran';
      
        let badgeText = "PAGARAN"; let badgeColor = "bg-slate-100 text-slate-500"; 
        if (String(statusGrj).toLowerCase().includes('jemaat khusus') || String(res).toLowerCase() === 'jemaat khusus') { badgeText = "JEMAAT KHUSUS"; badgeColor = "bg-purple-100 text-purple-700"; } 
        else if (String(statusGrj).toLowerCase().includes('sabungan') || String(statusGrj).toLowerCase().includes('resort')) { badgeText = "SABUNGAN / RESORT"; badgeColor = "bg-indigo-100 text-indigo-700"; }
      
        // --- LOGIKA PENCARIAN SUPER CLEANER (Buang kata pengganggu) ---
        const cleanCore = (str) => String(str || '').toLowerCase().replace(/resort|jemaat khusus|jk |phr|pengurus harian/g, '').replace(/[^a-z0-9]/g, '');
        const tGereja = cleanCore(namaG);
        const tResort = cleanCore(res);
        const isJK = badgeText === "JEMAAT KHUSUS";
      
        let pdt = DATA_MASTER.majelis.find(m => {
            let jab = String(m.Jabatan || '').toLowerCase();
            // Masukkan kata 'pemimpin' karena JK sering pakai jabatan Pemimpin Jemaat
            if (!(jab.includes('pendeta') || jab.includes('pdt') || jab.includes('pemimpin'))) return false;
            
            let mGer = cleanCore(m.Nama_Gereja);
            let mRes = cleanCore(m.Resort || m.Induk_Resort);
            
            if (isJK) return (mGer === tGereja && tGereja !== '') || (mRes === tGereja && tGereja !== '');
            return (mGer === tGereja && tGereja !== '') || (mRes === tResort && tResort !== '') || (mGer === tResort && tResort !== '');
        });

        let gr = DATA_MASTER.majelis.find(m => {
            let jab = String(m.Jabatan || '').toLowerCase();
            if (!(jab.includes('guru') || jab.includes('gr.'))) return false;
            let mGer = cleanCore(m.Nama_Gereja);
            return (mGer === tGereja && tGereja !== '');
        });
        // ------------------------------------------

        const clickName = `<a href="javascript:void(0)" onclick="window.showDetailGereja('${encodeURIComponent(namaG)}')" class="text-indigo-600 hover:text-indigo-800 transition-colors font-bold flex items-center gap-1.5" title="Klik untuk lihat info gereja">${namaG} <i class="fas fa-info-circle text-[10px] opacity-60"></i></a>`;
        let btnEdit = (role.includes('admin') || role.includes('editor')) ? `<button onclick="editDataGerejaItem('${namaG.replace(/'/g, "\\'")}')" class="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white transition-all"><i class="fas fa-edit"></i></button>` : '';
      
        return `<tr class="hover:bg-slate-50 transition-colors group border-b border-slate-50"><td class="p-5"><div class="font-bold text-slate-800 text-sm flex items-center">${clickName} <span class="${badgeColor} px-2 py-0.5 rounded text-[9px] font-bold uppercase ml-2">${badgeText}</span></div><div class="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-1">${res} • Wilayah ${wil}</div></td><td class="p-5"><div class="text-[11px] text-slate-700 mb-1"><i class="fas fa-user-tie text-indigo-400 w-4"></i> <span class="font-bold text-indigo-600">Pendeta:</span> ${pdt?pdt.Nama_Lengkap:'-'}</div><div class="text-[11px] text-slate-700"><i class="fas fa-chalkboard-teacher text-emerald-400 w-4"></i> <span class="font-bold text-emerald-600">Guru Jmt:</span> ${gr?gr.Nama_Lengkap:'-'}</div></td><td class="p-5 text-center"><span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">${rt} RT</span></td><td class="p-5 text-center"><span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">${jiwa} Jiwa</span></td><td class="p-5 text-center"><div class="inline-flex gap-2">${btnEdit}</div></td></tr>`;
    }).join('') : `<tr><td colspan="5" class="p-10 text-center text-slate-400">Data Gereja Tidak Ditemukan</td></tr>`;
    
    if(document.getElementById('filterTotalRT')) document.getElementById('filterTotalRT').innerText = filterRT.toLocaleString('id-ID'); 
    if(document.getElementById('filterTotalJiwa')) document.getElementById('filterTotalJiwa').innerText = filterJiwa.toLocaleString('id-ID');
    renderPaginationUI(dataGereja.length, currentPageGereja, 'paginationGereja', 'gereja', itemsPerPage);
}

 function renderPaginationUI(totalItems, currentPg, containerId, type, perPage) {
    const totalPages = Math.ceil(totalItems / perPage) || 1; 
    const container = document.getElementById(containerId); if(!container) return;
    
    // Baris if (totalPages <= 1) { return; } dihapus agar selalu tampil
    let html = `<span class="text-xs text-slate-400 font-bold tracking-widest uppercase mr-4 hidden md:inline">Hal. ${currentPg} / ${totalPages} <span class="ml-2 px-2 py-1 bg-slate-100 rounded-md border border-slate-200">${totalItems} Data</span></span><div class="flex items-center gap-1">`;
    if (currentPg > 1) html += `<button onclick="ubahHalaman('${type}', ${currentPg - 1})" class="page-btn inactive"><i class="fas fa-chevron-left"></i></button>`;
    
    for (let i = Math.max(1, currentPg - 2); i <= Math.min(totalPages, currentPg + 2); i++) {
        html += `<button onclick="ubahHalaman('${type}', ${i})" class="page-btn ${i===currentPg?'active':'inactive'}">${i}</button>`;
    }
    
    if (currentPg < totalPages) html += `<button onclick="ubahHalaman('${type}', ${currentPg + 1})" class="page-btn inactive"><i class="fas fa-chevron-right"></i></button>`;
    container.innerHTML = html + `</div>`;
  }

 function ubahHalaman(type, page) { 
    // Mengembalikan layar ke atas tabel secara mulus
    const targetContainer = document.getElementById('mainContent');
    if(targetContainer) targetContainer.scrollTo({ top: 0, behavior: 'smooth' });


    if (type === 'majelis') { currentPageMajelis = page; renderTabelReal(window.currentFilteredList, false); } 
    else if (type === 'individu') { currentPageIndividu = page; renderTabelIndividu(window.currentFilteredList, false); }
    else if (type === 'jemaat') { currentPageJemaat = page; renderTabelJemaat(window.currentFilteredJemaat, false); }
    else { currentPageGereja = page; renderTabelGereja(window.currentFilteredGereja, false); } 
  }

// --- FUNGSI CEK JABATAN & AUTO-SELECT PHR ---
window.cekJabatan = function() { 
    const jSelect = document.getElementById('formJabatan');
    let j = '';
    
    // Tarik nilai jabatan dari TomSelect (jika aktif) atau select standar
    if (window.tsInst && window.tsInst['m']) {
        j = window.tsInst['m'].getValue().toLowerCase();
    } else if (jSelect) {
        j = jSelect.value.toLowerCase();
    }
    
    const wadah = document.getElementById('wadahGereja'); 
    const g = document.getElementById('formGereja');
    
    if (wadah) wadah.classList.remove('hidden'); 
    
    if (g) {
        g.required = true; 
        
        // FITUR PINTAR: Jika jabatan untuk Resort atau Pendeta, otomatis kunci ke PHR
        const isResortLeader = j.includes('resort') || j.includes('pendeta resort') || j.includes('pemimpin jemaat') || j.includes('pendeta diperbantukan');
        
        if (isResortLeader) {
            let options = Array.from(g.options);
            let phrOption = options.find(opt => opt.value.includes('PHR'));
            
            if (phrOption) {
                g.value = phrOption.value; // Set ke PHR
            } else {
                // Jika belum ada opsi PHR (mungkin karena delay), paksakan tambahkan opsi PHR
                g.innerHTML += `<option value="Pengurus Harian Resort (PHR)" class="font-bold text-amber-700 bg-amber-50" selected>🏢 PENGURUS HARIAN RESORT (PHR)</option>`;
                g.value = "Pengurus Harian Resort (PHR)";
            }
        }
    }
};
 window.openModalSmart = function() {
      const isHome = !document.getElementById('pageHome').classList.contains('hidden');
      if (isHome) {
          Swal.fire({ 
              title: 'Tambah Data Baru', text: 'Pilih jenis data yang ingin ditambahkan:', 
              showCancelButton: true, showDenyButton: true, 
              confirmButtonText: '<i class="fas fa-users-cog"></i> Data Jemaat', 
              denyButtonText: '<i class="fas fa-id-badge"></i> Data Majelis', 
              cancelButtonText: 'Batal', confirmButtonColor: '#10b981', denyButtonColor: '#4f46e5' 
          }).then((result) => { 
              if (result.isConfirmed) { openFormJemaatBulk(); } 
              else if (result.isDenied) { tampilkanPilihanMajelis(); } 
          });
      } else {
          const isJemaat = !document.getElementById('pageJemaat').classList.contains('hidden');
          if(isJemaat) { openFormJemaatBulk(); } else { tampilkanPilihanMajelis(); }
      }
  };

  window.tampilkanPilihanMajelis = function() {
      Swal.fire({
          title: 'Mode Input Majelis', text: 'Pilih metode pengetikan data:',
          showCancelButton: true, showDenyButton: true,
          confirmButtonText: '<i class="fas fa-user"></i> Satuan',
          denyButtonText: '<i class="fas fa-users"></i> Multi / Scan',
          cancelButtonText: 'Batal',
          confirmButtonColor: '#3b82f6', denyButtonColor: '#10b981'
      }).then((res) => {
          if(res.isConfirmed) openFormMajelis();
          else if(res.isDenied) openFormMajelisMulti();
      });
  };
  function openFormJemaatBulk() {
    if(document.getElementById('formKeluargaBulk')) document.getElementById('formKeluargaBulk').reset(); 
    document.getElementById('containerAnggotaKeluarga').innerHTML = ''; counterAnggota = 0; syncFormResortBulk(); 
    if(document.getElementById('modalTambahKeluarga')) document.getElementById('modalTambahKeluarga').classList.remove('hidden'); 
  }

  function openFormMajelis() {
    if(document.getElementById('formInputMajelis')) document.getElementById('formInputMajelis').reset();
    safeSetValue('m_id', ''); EDIT_MODE_ID = null;
    safeSetHTML('modalTitle', '<i class="fas fa-id-badge text-indigo-500 mr-2"></i> Form Majelis'); safeSetHTML('btnSubmit', '<i class="fas fa-save mr-2"></i> Simpan Majelis');
    cekJabatan(); syncFormResortMajelis(); 
    if(document.getElementById('modalForm')) document.getElementById('modalForm').classList.remove('hidden'); 
  }
  
  function closeModal(modalId) { if(document.getElementById(modalId)) document.getElementById(modalId).classList.add('hidden'); }

  let counterAnggota = 0;
window.tambahBarisAnggota = function() {
      counterAnggota++; const div = document.createElement('div');
      
      // Didesain menyamping (Flex Horizontal) dengan rapi
      div.className = "flex flex-col md:flex-row items-center gap-2 p-3 bg-slate-50/50 border border-slate-200 rounded-xl relative shadow-sm hover:bg-white transition-all"; 
      div.id = `barisAnggota_${counterAnggota}`;
      
      div.innerHTML = `
          <div class="w-full md:flex-1"><input type="text" class="input-nama w-full h-[46px] px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm" placeholder="Nama Lengkap" required></div>
          <div class="w-full md:w-32"><select class="input-hub w-full h-[46px] px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm" required><option value="Istri">Istri</option><option value="Anak">Anak</option><option value="Tanggungan">Tanggungan</option></select></div>
          <div class="w-full md:w-28"><select class="input-jk w-full h-[46px] px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm" required><option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option></select></div>
          <div class="w-full md:w-40"><input type="date" class="input-tgl w-full h-[46px] px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm" required></div>
          <div class="w-full md:flex-1"><input type="text" class="input-pek w-full h-[46px] px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm" placeholder="Pekerjaan"></div>
          <button type="button" onclick="this.parentElement.remove()" class="w-full md:w-10 h-[46px] rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors shadow-sm shrink-0"><i class="fas fa-trash-alt text-sm"></i></button>`;
          
      document.getElementById('containerAnggotaKeluarga').appendChild(div);
  };

  window.simpanKeluargaBulk = function(e) {
      e.preventDefault();

      Swal.fire({
          title: 'Simpan Data Keluarga?',
          text: "Pastikan identitas Kepala Keluarga dan seluruh anggotanya sudah sesuai.",
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#1e293b',
          cancelButtonColor: '#ef4444',
          confirmButtonText: '<i class="fas fa-save mr-1"></i> Ya, Simpan!',
          cancelButtonText: 'Periksa Lagi'
      }).then((result) => {
          if (result.isConfirmed) {
              const no_kk = document.getElementById('bk_kk').value; const wil = document.getElementById('bk_wilayah').value; const res = document.getElementById('bk_resort').value; const ger = document.getElementById('bk_gereja').value;
              const tipeGereja = document.getElementById('bk_resort').options[document.getElementById('bk_resort').selectedIndex]?.getAttribute('data-tipe');
              let finalGer = ger; let finalRes = res; if (tipeGereja === "JK") { finalGer = res; finalRes = ""; }
              
              let arrData = [];
              arrData.push({ No_KK: no_kk, Wilayah: wil, Resort: finalRes, Nama_Gereja: finalGer, Nama_Lengkap: document.getElementById('bk_nama_kk').value, Status_Keluarga: 'Kepala Keluarga', Jenis_Kelamin: document.getElementById('bk_jk_kk').value, Tanggal_Lahir: document.getElementById('bk_tgl_kk').value, Pekerjaan: document.getElementById('bk_pek_kk').value, Kondisi: "Hidup" });

              const anggotaRows = document.getElementById('containerAnggotaKeluarga').children;
              for(let i=0; i<anggotaRows.length; i++) {
                  const row = anggotaRows[i];
                  arrData.push({ No_KK: no_kk, Wilayah: wil, Resort: finalRes, Nama_Gereja: finalGer, Nama_Lengkap: row.querySelector('.input-nama').value, Status_Keluarga: row.querySelector('.input-hub').value, Jenis_Kelamin: row.querySelector('.input-jk').value, Tanggal_Lahir: row.querySelector('.input-tgl').value, Pekerjaan: row.querySelector('.input-pek').value, Kondisi: "Hidup" });
              }

              const btn = document.getElementById('btnSubmitKeluarga'); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> MENYIMPAN...';
              Swal.fire({ title: 'Menyimpan Keluarga...', didOpen: () => Swal.showLoading() });
              
              apiCall('importJemaatMassal', {excelData: arrData, userRole: USER_NOW.role}).then(res => {
                    if(res.status === 'success') { Swal.fire('Berhasil', 'Keluarga berhasil disimpan!', 'success'); closeModal('modalTambahKeluarga'); loadData(true); } 
                    else { Swal.fire('Gagal', res.message, 'error'); }
                    btn.disabled = false; btn.innerHTML = '<i class="fas fa-save mr-2"></i> Simpan Data Keluarga';
                }).catch(err => { Swal.fire('Error', String(err), 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-save mr-2"></i> Simpan Data Keluarga'; });
          }
      });
  };

  function editDataJemaatItem(id) {
    const j = DATA_MASTER.jemaat.find(i => i.ID_Jemaat == id); if (!j) return; 
    safeSetValue('j_id', id); safeSetValue('j_kk', j.No_KK || ''); safeSetValue('j_nama', j.Nama_Lengkap || ''); safeSetValue('j_status', j.Status_Keluarga || ''); safeSetValue('j_jk', j.Jenis_Kelamin || '');
    let tgl = j.Tanggal_Lahir;
    if (tgl) { let d = window.parseDateSafe(tgl); if(d && !isNaN(d.getTime())) { let y = d.getFullYear(); let m = String(d.getMonth() + 1).padStart(2, '0'); let d_day = String(d.getDate()).padStart(2, '0'); safeSetValue('j_tgl', `${y}-${m}-${d_day}`); } }
    
    safeSetValue('j_kondisi', j.Kondisi || ''); safeSetValue('j_pekerjaan', j.Pekerjaan || ''); safeSetValue('j_wilayah', j.Wilayah || ''); syncFormResortJemaatEdit(); 
    setTimeout(() => { safeSetValue('j_resort', j.Resort ? String(j.Resort).trim() : String(j.Nama_Gereja).trim()); syncFormGerejaJemaatEdit(); setTimeout(() => { safeSetValue('j_gereja', String(j.Nama_Gereja || '').trim()); }, 50); }, 50);
    safeSetHTML('modalTitleJemaat', '<i class="fas fa-user-edit text-amber-500 mr-2"></i> Edit Data Jemaat'); safeSetHTML('btnEditJemaatIndividu', '<i class="fas fa-save"></i> Simpan Data');
    if(document.getElementById('modalFormJemaat')) document.getElementById('modalFormJemaat').classList.remove('hidden');
  }

  function handleSimpanJemaat(e) {
      e.preventDefault(); const payload = Object.fromEntries(new FormData(e.target)); const btn = document.getElementById('btnEditJemaatIndividu'); const originalText = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>MENYIMPAN...'; 
      let fr = document.getElementById('j_resort'); const tipeGereja = fr.options[fr.selectedIndex]?.getAttribute('data-tipe');
      if (tipeGereja === "JK") { payload.Nama_Gereja = fr.value; payload.Resort = ""; } 
      payload.userRole = USER_NOW ? USER_NOW.role : 'Viewer'; payload.sumberAsal = "Dashboard Pusat";
      const action = payload.ID_Jemaat ? 'updateJemaat' : 'simpanJemaat';
      Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading() });
      apiCall(action, payload).then(res => { 
          closeModal('modalFormJemaat'); 
          btn.disabled = false; 
          btn.innerHTML = originalText; 
          loadData(true); // <-- PERBAIKAN: Memaksa sinkronisasi ke server
      }).catch(err => { 
          Swal.fire('Error', String(err), 'error'); 
          btn.disabled = false; 
          btn.innerHTML = originalText; 
      });
  }

  function tambahAnggotaKeluarga(noKK, wilayah, resort, gereja) {
    if(document.getElementById('formEditJemaat')) document.getElementById('formEditJemaat').reset(); 
    safeSetValue('j_id', ''); safeSetValue('j_kk', noKK); safeSetValue('j_status', 'Anak'); safeSetValue('j_wilayah', wilayah); syncFormResortJemaatEdit(); 
    setTimeout(() => { safeSetValue('j_resort', resort); syncFormGerejaJemaatEdit(); setTimeout(() => { safeSetValue('j_gereja', gereja); }, 50); }, 50);
    safeSetHTML('modalTitleJemaat', '<i class="fas fa-user-plus text-amber-500 mr-2"></i> Tambah Anggota (KK: ' + noKK + ')'); safeSetHTML('btnEditJemaatIndividu', '<i class="fas fa-save"></i> Simpan Anggota Baru');
    if(document.getElementById('modalFormJemaat')) document.getElementById('modalFormJemaat').classList.remove('hidden'); 
  }

  window.handleSimpan = function(e, tipe) {
      e.preventDefault(); 
      const formTarget = e.target; // Amankan target form sebelum pop-up
      
      Swal.fire({
          title: 'Simpan Data Personil?',
          text: "Pastikan nama, jabatan, dan penempatan unit sudah benar.",
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#4f46e5',
          cancelButtonColor: '#ef4444',
          confirmButtonText: '<i class="fas fa-save mr-1"></i> Ya, Simpan!',
          cancelButtonText: 'Periksa Lagi'
      }).then((result) => {
          if (result.isConfirmed) {
              const payload = Object.fromEntries(new FormData(formTarget)); 
              const btn = formTarget.querySelector('button[type="submit"]'); 
              const originalText = btn.innerHTML;
              
              btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>MENYIMPAN...';
              let fr = document.getElementById('formResort') || document.getElementById('m_resort');
              let tipeGereja = fr ? fr.options[fr.selectedIndex]?.getAttribute('data-tipe') : '';
              if (tipeGereja === "JK") { payload.Nama_Gereja = fr.value; payload.Resort = ""; }
              payload.userRole = USER_NOW ? USER_NOW.role : 'Viewer'; payload.sumberAsal = "Dashboard Pusat";
              
              const inputNama = String(payload.Nama_Lengkap).trim().toLowerCase();
              const inputJabatan = String(payload.Jabatan).trim().toLowerCase();
              const inputGereja = String(payload.Nama_Gereja || payload.Resort).trim().toLowerCase();

              const isDuplicate = DATA_MASTER.majelis.some(m => { 
                  const existingNama = String(m.Nama_Lengkap || '').trim().toLowerCase(); 
                  const existingJabatan = String(m.Jabatan || '').trim().toLowerCase();
                  const existingGereja = String(m.Nama_Gereja || m.Resort || '').trim().toLowerCase();
                  if (EDIT_MODE_ID && String(m.ID_Majelis) === String(EDIT_MODE_ID)) return false; 
                  return existingNama === inputNama && existingJabatan === inputJabatan && existingGereja === inputGereja; 
              });

              if (isDuplicate) { 
                  Swal.fire({ icon: 'warning', title: 'Data Ganda!', text: 'Personil dengan nama dan jabatan ini sudah terdaftar di unit tersebut!', confirmButtonColor: '#f59e0b' }); 
                  btn.disabled = false; btn.innerHTML = originalText; return; 
              }
              
              if (EDIT_MODE_ID) payload.ID_Majelis = EDIT_MODE_ID;
              let action = payload.ID_Majelis ? 'updateMajelis' : 'simpanMajelis'; 
              
              Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading() });
              apiCall(action, payload).then(res => { 
                  closeModal('modalForm'); 
                  Swal.fire('Sukses', 'Data tersimpan dengan aman.', 'success'); 
                  btn.disabled = false; btn.innerHTML = originalText; 
                  loadData(true); 
              }).catch(err => { 
                  Swal.fire('Error', String(err), 'error'); 
                  btn.disabled = false; btn.innerHTML = originalText; 
              });
          }
      });
  };
window.editDataMajelis = function(id) {
    const m = DATA_MASTER.majelis.find(i => i.ID_Majelis == id); 
    if (!m) return; 
    
    EDIT_MODE_ID = id; 
    safeSetValue('m_id', id);
    
    const inputNama = document.querySelector('#formInputMajelis [name="Nama_Lengkap"]'); 
    if(inputNama) inputNama.value = m.Nama_Lengkap || ''; 
    
    // Set nilai Jabatan
    if (window.tsInst && window.tsInst['m']) {
        window.tsInst['m'].setValue(m.Jabatan || '');
    } else {
        safeSetValue('formJabatan', m.Jabatan || ''); 
    }
    
    safeSetValue('formWilayah', m.Wilayah || ''); 
    syncFormResortMajelis(); 
    
    const formResort = document.getElementById('formResort'); 
    if(formResort) formResort.value = m.Resort ? String(m.Resort).trim() : String(m.Nama_Gereja).trim(); 
    
    syncFormGerejaMajelis(); 
    
    // MENCEGAH ERROR "PILIH ITEM PADA DAFTAR" UNTUK PENDETA RESORT
    setTimeout(() => {
        const formGereja = document.getElementById('formGereja'); 
        if(formGereja) {
            let targetGereja = String(m.Nama_Gereja || '').trim();
            let jabatan = String(m.Jabatan || '').toLowerCase();
            
            // Jika dia pimpinan tingkat Resort, paksa pilih opsi PHR
            if (targetGereja === "Tingkat Resort" || targetGereja.includes('PHR') || jabatan.includes('resort') || jabatan.includes('pemimpin jemaat')) {
                let options = Array.from(formGereja.options);
                let phrOption = options.find(opt => opt.value.includes('PHR'));
                if (phrOption) {
                    formGereja.value = phrOption.value;
                } else {
                     formGereja.innerHTML += `<option value="Pengurus Harian Resort (PHR)" class="font-bold text-amber-700 bg-amber-50" selected>🏢 PENGURUS HARIAN RESORT (PHR)</option>`;
                     formGereja.value = "Pengurus Harian Resort (PHR)";
                }
            } else {
                formGereja.value = targetGereja; 
            }
        }
    }, 50); // Jeda 50ms untuk memastikan dropdown Unit Gereja sudah digambar ulang
    
    let hp = m.No_HP || m['No-HP'] || m['No HP'] || m.No_Hp || ''; 
    const inputHp = document.querySelector('#formInputMajelis [name="No_HP"]'); 
    if(inputHp) inputHp.value = hp;
    
    safeSetHTML('modalTitle', '<i class="fas fa-id-badge text-amber-500 mr-2"></i> Edit Personil'); 
    safeSetHTML('btnSubmit', '<i class="fas fa-save mr-2"></i> Simpan Perubahan'); 
    
    const modalForm = document.getElementById('modalForm');
    if(modalForm) {
        modalForm.classList.remove('hidden');
        modalForm.style.setProperty('z-index', '999999', 'important');
    }
};

function konfirmasiHapus(id) { 
      Swal.fire({ title: 'Hapus data permanen?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' }).then((result) => { 
          if (result.isConfirmed) { 
              Swal.fire({ title: 'Menghapus...', didOpen: () => Swal.showLoading() }); 
              apiCall('hapusMajelis', {id: id, userRole: USER_NOW.role, sumberAsal: "Dashboard Pusat"}).then(() => { 
                  // 1. Hapus Instan dari Memori Layar (Real-time Majelis)
                  DATA_MASTER.majelis = DATA_MASTER.majelis.filter(m => String(m.ID_Majelis) !== String(id));
                  try { localStorage.setItem('gkpi_data_cache', JSON.stringify(DATA_MASTER)); } catch(e) {}
                  
                  // 2. Render ulang layar tanpa loading
                  filterTabel();
                  Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success'); 
              }).catch(err => Swal.fire('Error Server', String(err), 'error'));
          } 
      }); 
  }

  function konfirmasiHapusJemaat(id) { 
      Swal.fire({ title: 'Hapus data jemaat?', text: 'Tindakan ini permanen!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' }).then((result) => { 
          if (result.isConfirmed) { 
              Swal.fire({ title: 'Menghapus...', didOpen: () => Swal.showLoading() }); 
              apiCall('hapusJemaat', {id: id, userRole: USER_NOW.role, sumberAsal: "Dashboard Pusat"}).then(() => { 
                  // 1. Hapus Instan dari Memori Layar (Real-time Jemaat)
                  DATA_MASTER.jemaat = DATA_MASTER.jemaat.filter(j => String(j.ID_Jemaat) !== String(id));
                  try { localStorage.setItem('gkpi_data_cache', JSON.stringify(DATA_MASTER)); } catch(e) {}
                  
                  // 2. Render ulang layar tanpa loading
                  filterTabelJemaat();
                  Swal.fire('Terhapus!', 'Data dihapus.', 'success'); 
              }).catch(err => Swal.fire('Error Server', String(err), 'error'));
          } 
      }); 
  }

  // FUNGSI BARU: Hapus 1 Keluarga Sekaligus (Real-time)
  window.konfirmasiHapusKeluarga = function(noKK) {
      Swal.fire({ title: 'Hapus 1 Keluarga?', text: 'Seluruh anggota di dalam No KK ini akan dihapus permanen!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' }).then((result) => {
          if (result.isConfirmed) {
              Swal.fire({ title: 'Menghapus Keluarga...', didOpen: () => Swal.showLoading() });
              apiCall('hapusKeluarga', {no_kk: noKK, userRole: USER_NOW.role, sumberAsal: "Dashboard Pusat"}).then(() => {
                  // Hapus seluruh anggota dengan No KK tersebut dari memori
                  DATA_MASTER.jemaat = DATA_MASTER.jemaat.filter(j => String(j.No_KK).trim() !== String(noKK).trim());
                  try { localStorage.setItem('gkpi_data_cache', JSON.stringify(DATA_MASTER)); } catch(e) {}
                  
                  filterTabelJemaat();
                  Swal.fire('Terhapus!', 'Satu keluarga berhasil dihapus.', 'success');
              }).catch(err => Swal.fire('Error Server', String(err), 'error'));
          }
      });
  };

  function downloadTemplateImport() { 
      const isJemaat = !document.getElementById('pageJemaat').classList.contains('hidden');
      if (isJemaat) {
         const templateData = [{"No_KK": "KK00001 (Kosongkan jika KK Baru)", "Nama_Lengkap": "Budi Santoso", "Status_Keluarga": "Kepala Keluarga", "Jenis_Kelamin": "Laki-laki", "Tanggal_Lahir": "12/05/1980", "Pekerjaan": "Pegawai Swasta", "Kondisi": "Hidup", "Wilayah": "1", "Resort": "Medan", "Nama_Gereja": "GKPI Medan Kota"}];
         const ws = XLSX.utils.json_to_sheet(templateData); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Template_Jemaat"); XLSX.writeFile(wb, "Template_Import_Jemaat.xlsx"); 
      } else {
         const templateData = [{"Nama_Lengkap": "Contoh: Budi Santoso", "Jenis_Kelamin": "Laki-laki", "Jabatan": "Penatua", "Status_Aktif": "Aktif", "Tgl_Tahbisan": "12/05/2010", "Wilayah": "1", "Resort": "Medan", "Nama_Gereja": "GKPI Medan Kota", "No_HP": "081234567890"}]; 
         const ws = XLSX.utils.json_to_sheet(templateData); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Template_Majelis"); XLSX.writeFile(wb, "Template_Import_Majelis.xlsx"); 
      }
  }

  function klikImportExcelSmart() { 
      const role = USER_NOW ? String(USER_NOW.role).toLowerCase() : 'viewer'; 
      if (!role.includes('admin') && !role.includes('editor')) return Swal.fire('Akses Ditolak', 'Hanya Admin & Editor yang bisa import.', 'error'); 
      Swal.fire({ title: 'Import Excel Massal', text: "Pilih file Excel, atau unduh template terlebih dahulu.", icon: 'question', showCancelButton: true, showDenyButton: true, confirmButtonText: '<i class="fas fa-upload mr-2"></i> Upload File', denyButtonText: '<i class="fas fa-download mr-2"></i> Download Template', cancelButtonText: 'Batal', confirmButtonColor: '#4f46e5', denyButtonColor: '#10b981' }).then((result) => { if (result.isConfirmed) { document.getElementById('inputExcelImport').click(); } else if (result.isDenied) { downloadTemplateImport(); } }); 
  }
  function klikImportJemaatExcelSmart() { 
      const role = USER_NOW ? String(USER_NOW.role).toLowerCase() : 'viewer'; 
      if (!role.includes('admin') && !role.includes('editor')) return Swal.fire('Akses Ditolak', 'Hanya Admin yang bisa import.', 'error'); 
      Swal.fire({ title: 'Import Jemaat Massal', text: "Pilih file Excel, atau unduh template terlebih dahulu.", icon: 'question', showCancelButton: true, showDenyButton: true, confirmButtonText: '<i class="fas fa-upload mr-2"></i> Upload File', denyButtonText: '<i class="fas fa-download mr-2"></i> Download Template', cancelButtonText: 'Batal', confirmButtonColor: '#059669', denyButtonColor: '#10b981' }).then((result) => { if (result.isConfirmed) { document.getElementById('inputExcelImportJemaat').click(); } else if (result.isDenied) { downloadTemplateImport(); } }); 
  }

  function prosesImportExcel(event) { 
    const file = event.target.files[0]; if (!file) return; 
    Swal.fire({ title: 'Membaca Excel...', didOpen: () => { Swal.showLoading() } }); const reader = new FileReader(); 
    reader.onload = function(e) { 
        try { 
            const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, {type: 'array'}); const excelData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]); 
            if(excelData.length === 0) return Swal.fire('Kosong', 'Excel kosong.', 'warning'); 
            Swal.fire({ title: 'Menyuntikkan API...', didOpen: () => Swal.showLoading() }); 
            apiCall('importMajelisMassal', {excelData: excelData, userRole: USER_NOW.role}).then(res => { 
                document.getElementById('inputExcelImport').value = ""; 
                if (res.status === 'success') { Swal.fire('Selesai!', `<b>${res.added}</b> data ditambah.`, 'success'); loadData(); } else { Swal.fire('Gagal', res.message, 'error'); } 
            }).catch(err => Swal.fire('Error', String(err), 'error')); 
        } catch(error) { document.getElementById('inputExcelImport').value = ""; Swal.fire('Error', 'Gagal membaca format Excel.', 'error'); } 
    }; reader.readAsArrayBuffer(file); 
  }

  function prosesImportJemaatExcel(event) { 
    const file = event.target.files[0]; if (!file) return; 
    Swal.fire({ title: 'Membaca Excel...', didOpen: () => { Swal.showLoading() } }); const reader = new FileReader(); 
    reader.onload = function(e) { 
        try { 
            const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, {type: 'array'}); const excelData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]); 
            if(excelData.length === 0) return Swal.fire('Kosong', 'Excel kosong.', 'warning'); 
            Swal.fire({ title: 'Menyuntikkan API...', didOpen: () => Swal.showLoading() }); 
            apiCall('importJemaatMassal', {excelData: excelData, userRole: USER_NOW.role}).then(res => { 
                document.getElementById('inputExcelImportJemaat').value = ""; 
                if (res.status === 'success') { Swal.fire('Selesai!', `<b>${res.added}</b> data ditambah.`, 'success'); loadData(); } else { Swal.fire('Gagal', res.message, 'error'); } 
            }).catch(err => Swal.fire('Error', String(err), 'error')); 
        } catch(error) { document.getElementById('inputExcelImportJemaat').value = ""; Swal.fire('Error', 'Gagal membaca format Excel.', 'error'); } 
    }; reader.readAsArrayBuffer(file); 
  }

window.exportToExcel = function() { 
      const isJemaat = document.getElementById('pageJemaat') && !document.getElementById('pageJemaat').classList.contains('hidden');
      const isGereja = document.getElementById('kontenGereja') && !document.getElementById('kontenGereja').classList.contains('hidden');
      const isKorwil = document.getElementById('kontenKorwil') && !document.getElementById('kontenKorwil').classList.contains('hidden');
      
      let dataToExport = [];
      let namaFile = "Data_Export.xlsx";

      if (isJemaat) {
          dataToExport = window.currentFilteredJemaat;
          namaFile = "Data_Keluarga_Jemaat_GKPI.xlsx";
      } else if (isGereja) {
          dataToExport = window.currentFilteredGereja;
          namaFile = "Data_Unit_Gereja_GKPI.xlsx";
      } else if (isKorwil) {
          dataToExport = DATA_MASTER.korwil || [];
          namaFile = "Data_Koordinator_Wilayah_GKPI.xlsx";
      } else {
          dataToExport = window.currentFilteredList;
          namaFile = "Data_Personil_Majelis_GKPI.xlsx";
      }

      if (!dataToExport || dataToExport.length === 0) return Swal.fire('Data Kosong', 'Tidak ada data untuk diekspor.', 'info');
      Swal.fire({ icon: 'success', title: 'Menyusun Excel...', timer: 1500, showConfirmButton: false });
      
      try { 
          const ws = XLSX.utils.json_to_sheet(dataToExport); 
          const wb = XLSX.utils.book_new(); 
          XLSX.utils.book_append_sheet(wb, ws, "Data_Export"); 
          XLSX.writeFile(wb, namaFile); 
      } catch (error) { 
          console.error(error); 
          Swal.fire('Gagal', 'Terjadi kesalahan saat membuat file Excel.', 'error'); 
      }
}

function bukaProfil(id) { 
    // Cari di data Majelis terlebih dahulu
    let m = DATA_MASTER.majelis.find(x => x.ID_Majelis === id); 
    
    // Jika tidak ketemu di Majelis, cari di data KORWIL
    if (!m) {
        let k = (DATA_MASTER.korwil || []).find(x => x.ID_Korwil === id);
        if (!k) return; // Jika tidak ada di keduanya, berhenti
        
        safeSetText('profNama', k.Nama_Korwil || '-'); 
        safeSetText('profJabatan', 'Koordinator Wilayah'); 
        safeSetText('profGereja', 'Tingkat Wilayah'); 
        safeSetText('profWilayah', `Wilayah ${k.Wilayah || '-'}`); 
        let hpK = k.No_HP || '-'; 
        safeSetText('profWA', hpK); 
        safeSetText('profID', id); 
        
        let hpCleanK = String(hpK).replace(/\D/g, ''); 
        if (hpCleanK.startsWith("0")) hpCleanK = "62" + hpCleanK.slice(1); 
        if (hpCleanK.startsWith("8")) hpCleanK = "62" + hpCleanK; 
        
        const btnChatK = document.getElementById('btnChatProf'); 
        if (hpCleanK.length >= 9) { 
            btnChatK.href = "https://wa.me/" + hpCleanK; 
            btnChatK.style.display = "flex"; 
        } else { 
            btnChatK.style.display = "none"; 
        } 
        
        if (document.getElementById('modalProfil')) document.getElementById('modalProfil').classList.remove('hidden'); 
        return;
    }

    // Jika ketemu di data Majelis, jalankan logika aslinya
    safeSetText('profNama', m.Nama_Lengkap || '-'); 
    safeSetText('profJabatan', m.Jabatan || '-'); 
    safeSetText('profGereja', m.Nama_Gereja || 'Tingkat Resort'); 
    safeSetText('profWilayah', m.Resort ? `${m.Resort} (W-${m.Wilayah||'-'})` : `Wilayah ${m.Wilayah||'-'}`); 
    let hp = m.No_HP || m['No-HP'] || m['No HP'] || m.No_Hp || '-'; 
    safeSetText('profWA', hp); 
    safeSetText('profID', id); 
    
    let hpClean = String(hp).replace(/\D/g, ''); 
    if (hpClean.startsWith("0")) hpClean = "62" + hpClean.slice(1); 
    if (hpClean.startsWith("8")) hpClean = "62" + hpClean; 
    
    const btnChat = document.getElementById('btnChatProf'); 
    if (hpClean.length >= 9) { 
        btnChat.href = "https://wa.me/" + hpClean; 
        btnChat.style.display = "flex"; 
    } else { 
        btnChat.style.display = "none"; 
    } 
    
    if (document.getElementById('modalProfil')) document.getElementById('modalProfil').classList.remove('hidden'); 
}

function tutupProfil() { if(document.getElementById('modalProfil')) document.getElementById('modalProfil').classList.add('hidden'); }
  

window.showDetailGereja = function(encNama) {
    try {
        let nama = decodeURIComponent(encNama); 
        
        if (!DATA_MASTER || !DATA_MASTER.gereja || !DATA_MASTER.majelis) {
            Swal.fire('Loading...', 'Data sedang dimuat, mohon tunggu sebentar.', 'info');
            return;
        }

        let g = DATA_MASTER.gereja.find(x => String(x.Nama_Gereja || '').trim() === nama.trim() || String(x['Nama Gereja'] || '').trim() === nama.trim());
        
        if(!g) { Swal.fire('Error', 'Data detail gereja tidak ditemukan di database.', 'error'); return; }
        
        let tgl = g.Tanggal_Berdiri || g['Tanggal Berdiri'] || g['Tanggal_berdiri'] || '-'; 
        let noReg = g.No_Register || g['No Register'] || g['No_register'] || 'Belum Ada Data';
        
        let d = (typeof window.parseDateSafe === 'function') ? window.parseDateSafe(tgl) : new Date(tgl); 
        let umur = (typeof window.hitungUmur === 'function') ? window.hitungUmur(tgl) : '-'; 
        let tglStr = (!d || isNaN(d.getTime())) ? tgl : d.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});
        
        // FUNGSI PEMBERSIH SUPER (Disamakan dengan Tabel Utama)
        const cleanCore = (str) => String(str || '').toLowerCase().replace(/resort|jemaat khusus|jk |phr|pengurus harian/g, '').replace(/[^a-z0-9]/g, '');
        
        const bacaWilayah = (str) => {
            let s = String(str || '').toLowerCase().replace(/wilayah|korwil|koordinator|daerah|\s/g, '');
            const romawi = { 'i':'1', 'ii':'2', 'iii':'3', 'iv':'4', 'v':'5', 'vi':'6', 'vii':'7', 'viii':'8', 'ix':'9', 'x':'10', 'xi':'11', 'xii':'12' };
            return romawi[s] || s.replace(/[^0-9]/g, ''); 
        };

        let targetGereja = cleanCore(g.Nama_Gereja || g['Nama Gereja']);
        let rawResort = String(g.Induk_Resort || g.Resort || '').trim();
        
        let isJemaatKhusus = rawResort.toLowerCase() === 'jemaat khusus' || rawResort === '' || String(g.Status_Gereja || g.Tipe_Gereja).toLowerCase() === 'jemaat khusus';
        let targetResort = cleanCore(rawResort);
        
        let targetWilayah = bacaWilayah(g.Wilayah);

        // --- PENDETA ---
        let infoPendeta = `<div class="text-xs text-slate-400 italic mb-1">Pendeta: -</div>`;
        let pdtLangsung = g.Pendeta || g['Nama Pendeta'] || g.Nama_Pendeta;

        if (pdtLangsung) {
            infoPendeta = `<div class="text-xs text-slate-700 font-medium mb-1"><span class="text-slate-500 font-normal">Pendeta:</span> <span class="font-bold">${pdtLangsung}</span></div>`;
        } else {
            let pdtDitemukan = DATA_MASTER.majelis.find(m => {
                let jab = String(m.Jabatan || '').toLowerCase();
                if (!(jab.includes('pendeta') || jab.includes('pdt') || jab.includes('pemimpin'))) return false;
                
                let mGereja = cleanCore(m.Nama_Gereja || m['Nama Gereja']);
                let mResort = cleanCore(m.Resort || m.Induk_Resort);
                
                if (isJemaatKhusus) {
                    return (mGereja === targetGereja && targetGereja !== '') || (mResort === targetGereja && targetGereja !== '');
                }
                
                return (mGereja === targetGereja && targetGereja !== '') || (mResort === targetResort && targetResort !== '') || (mGereja === targetResort && targetResort !== '');
            });

            if (pdtDitemukan) {
                let namaPdt = pdtDitemukan.Nama_Lengkap || pdtDitemukan.Nama || 'Tidak diketahui';
                infoPendeta = `<div class="text-xs text-slate-700 font-medium mb-1"><span class="text-slate-500 font-normal">Pendeta:</span> <span class="font-bold">${namaPdt}</span> <span class="text-[9px] text-indigo-400 ml-1">(Pdt. Resort)</span></div>`;
            }
        }

        // --- GURU JEMAAT ---
        let infoGuruJmt = `<div class="text-xs text-slate-400 italic mb-1">Guru Jmt: -</div>`;
        let grLangsung = g.Guru_Jemaat || g['Guru Jemaat'] || g['Guru Jmt'];

        if (grLangsung) {
            infoGuruJmt = `<div class="text-xs text-slate-700 font-medium mb-1"><span class="text-slate-500 font-normal">Guru Jmt:</span> <span class="font-bold">${grLangsung}</span></div>`;
        } else {
            let grDitemukan = DATA_MASTER.majelis.find(m => {
                let jab = String(m.Jabatan || '').toLowerCase();
                if (!(jab.includes('guru') || jab.includes('gr.'))) return false;
                let mGereja = cleanCore(m.Nama_Gereja || m['Nama Gereja']);
                return (mGereja === targetGereja && targetGereja !== '');
            });

            if (grDitemukan) {
                let namaGr = grDitemukan.Nama_Lengkap || grDitemukan.Nama || 'Tidak diketahui';
                infoGuruJmt = `<div class="text-xs text-slate-700 font-medium mb-1"><span class="text-slate-500 font-normal">Guru Jmt:</span> <span class="font-bold">${namaGr}</span></div>`;
            }
        }

        // --- KORWIL ---
        let infoKorwil = `<div class="text-sm font-semibold text-slate-400 italic">Korwil Belum Terdaftar</div>`;

        if (targetWilayah !== '') {
            let korwilDitemukan = null;
            
            if (DATA_MASTER.korwil && DATA_MASTER.korwil.length > 0) {
                 korwilDitemukan = DATA_MASTER.korwil.find(k => {
                     let mWilayah = bacaWilayah(k.Wilayah);
                     return mWilayah === targetWilayah && k.Status === 'Aktif'; 
                 });
            }
            
            if (!korwilDitemukan && DATA_MASTER.majelis) {
                 korwilDitemukan = DATA_MASTER.majelis.find(m => {
                    let jab = String(m.Jabatan || '').toLowerCase();
                    if (!jab.includes('korwil') && !jab.includes('koordinator')) return false;
                    
                    let mWilayah = bacaWilayah(m.Wilayah);
                    let mJabatanWilayah = bacaWilayah(m.Jabatan);
                    
                    return (mWilayah === targetWilayah) || (mJabatanWilayah === targetWilayah);
                });
            }

            if (korwilDitemukan) {
                let namaKorwil = korwilDitemukan.Nama_Korwil || korwilDitemukan.Nama_Lengkap || korwilDitemukan.Nama || '-';
                let jabKorwil = korwilDitemukan.Jabatan || 'Koordinator Wilayah';
                infoKorwil = `<div class="font-bold text-slate-800 text-sm">${namaKorwil}</div>
                              <div class="text-[9px] text-slate-500 uppercase tracking-widest">${jabKorwil}</div>`;
            }
        }

        Swal.fire({ 
            title: 'Informasi Unit Gereja', 
            html: `
            <div class="text-left space-y-4">
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                    <div class="w-10 h-10 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center shrink-0">
                        <i class="fas fa-map-marked-alt text-lg"></i>
                    </div>
                    <div>
                        <p class="text-[9px] text-indigo-500 font-black uppercase mb-0.5 tracking-widest">Koordinator Wilayah ${g.Wilayah || '-'}</p>
                        ${infoKorwil}
                    </div>
                </div>
                <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <p class="text-[10px] text-slate-500 font-bold uppercase mb-1 tracking-widest">Nama Gereja / Unit</p>
                    <p class="text-xl font-black text-slate-800 leading-tight">${g.Nama_Gereja || g['Nama Gereja']}</p>
                    <p class="text-xs text-slate-500 font-bold mt-1 uppercase mb-3 border-b border-slate-100 pb-3">${g.Induk_Resort || g.Resort || 'Jemaat Khusus'}</p>
                    <div class="mt-2">${infoPendeta}${infoGuruJmt}</div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-center shadow-inner">
                        <p class="text-[10px] text-indigo-500 font-bold uppercase mb-1">Nomor Register</p>
                        <p class="text-sm font-bold text-indigo-900">${noReg}</p>
                    </div>
                    <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center shadow-inner">
                        <p class="text-[10px] text-emerald-500 font-bold uppercase mb-1">Berdiri Sejak</p>
                        <p class="text-sm font-bold text-emerald-900">${tglStr}</p>
                        <p class="text-[10px] text-emerald-600 font-bold mt-1">Usia: ${umur}</p>
                    </div>
                </div>
            </div>`, 
            confirmButtonColor: '#4f46e5' 
        });
    } catch (err) {
        console.error("Error pada showDetailGereja:", err);
        Swal.fire('Terjadi Kesalahan', 'Error: ' + err.message, 'error');
    }
};



 window.editDataGerejaItem = function(namaLama) {
    let g = DATA_MASTER.gereja.find(x => x.Nama_Gereja === namaLama || x['Nama Gereja'] === namaLama);
    if(!g) return;
    
    safeSetText('g_nama_title', namaLama); 
    safeSetValue('g_nama_lama', namaLama); 
    safeSetValue('g_nama_baru', namaLama); // Isi dengan nama saat ini agar bisa diubah
    
    // Deteksi Status Gereja
    let statusG = String(g.Status_Gereja || g.Tipe_Gereja || 'Pagaran').toLowerCase();
    if (statusG.includes('jemaat khusus') || String(g.Induk_Resort || g.Resort).toLowerCase() === 'jemaat khusus') {
        safeSetValue('g_status', 'Jemaat Khusus');
    } else if (statusG.includes('resort') || statusG.includes('sabungan')) {
        safeSetValue('g_status', 'Resort');
    } else {
        safeSetValue('g_status', 'Pagaran');
    }

    // Isi Dropdown Resort
    let resSelect = document.getElementById('g_induk_resort');
    if (resSelect) {
        let resorts = [...new Set(DATA_MASTER.gereja.filter(x => (x.Induk_Resort || x.Resort) && String(x.Tipe_Gereja || x.Status_Gereja).toUpperCase() !== "JEMAAT KHUSUS").map(x => String(x.Induk_Resort || x.Resort).trim()))].sort();
        resSelect.innerHTML = '<option value="">Pilih Resort Induk</option>' + resorts.map(r => `<option value="${r}">${r}</option>`).join('');
        
        let curResort = String(g.Induk_Resort || g.Resort || '').trim();
        if (curResort !== 'Jemaat Khusus') resSelect.value = curResort;
    }
    
    if(typeof toggleResortIndukEdit === 'function') toggleResortIndukEdit();

    // Isi Data Lainnya
    safeSetValue('g_rt', parseInt(g.Total_RT) || 0); 
    safeSetValue('g_jiwa', parseInt(g.Total_Jiwa) || 0); 
    safeSetValue('g_lat', g.Latitude || g.latitude || ''); 
    safeSetValue('g_lng', g.Longitude || g.longitude || ''); 
    safeSetValue('g_reg', g.No_Register || g['No Register'] || ''); 
    
    let tglFormatForm = ''; let tglBerdiri = g.Tanggal_Berdiri || g['Tanggal Berdiri'] || '';
    if(tglBerdiri) { let d = window.parseDateSafe(tglBerdiri); if(d && !isNaN(d.getTime())) { let y = d.getFullYear(); let m = String(d.getMonth() + 1).padStart(2, '0'); let d_day = String(d.getDate()).padStart(2, '0'); tglFormatForm = `${y}-${m}-${d_day}`; } }
    safeSetValue('g_tgl', tglFormatForm);

    if(document.getElementById('modalFormGereja')) document.getElementById('modalFormGereja').classList.remove('hidden');
};
// Fungsi pendukung untuk menyembunyikan/menampilkan kolom Resort
window.toggleResortIndukEdit = function() {
    let status = document.getElementById('g_status').value;
    let wadah = document.getElementById('wadahResortIndukEdit');
    let select = document.getElementById('g_induk_resort');
    if (status === 'Jemaat Khusus' || status === 'Resort') { 
        wadah.style.display = 'none';
        select.required = false;
    } else {
        wadah.style.display = 'block';
        select.required = true;
    }
};
// ==============================================================
// 3. FUNGSI SIMPAN & SINKRONISASI CASCADE KE BACKEND
// ==============================================================
window.handleSimpanGereja = function(e) {
    e.preventDefault(); 
    const payload = Object.fromEntries(new FormData(e.target)); 
    
    // Konfigurasi Mandiri untuk Resort dan JK
    let status = payload.Status_Gereja;
    if (status === 'Jemaat Khusus') {
        payload.Induk_Resort = 'Jemaat Khusus';
    } else if (status === 'Resort') {
        payload.Induk_Resort = payload.Nama_Gereja_Baru; // Resort adalah induk bagi dirinya sendiri
    }
    
    payload.userRole = USER_NOW ? USER_NOW.role : 'Viewer'; 
    payload.sumberAsal = "Dashboard Pusat";

    const btn = document.getElementById('btnEditGereja'); const originalText = btn.innerHTML;
    btn.disabled = true;  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>MENYINKRONKAN DATABASE...';
    
    Swal.fire({ title: 'Sinkronisasi Super...', html: 'Mengubah nama dan memperbarui ribuan riwayat data Majelis & Jemaat secara otomatis...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    // PERBAIKAN DI SINI: Bungkus payload ke dalam "obj" agar sesuai dengan doPost Anda
    apiCall('updateDataGereja', { obj: payload, userRole: payload.userRole }).then(res => { 
        if (res.status === 'success') { 
            closeModal('modalFormGereja'); 
            Swal.fire('Sinkronisasi Sukses!', res.message || 'Data unit, majelis, dan jemaat berhasil disinkronisasi.', 'success'); 
            loadData(true); 
        } else { 
            Swal.fire('Gagal', res.message, 'error'); 
        }
    }).catch(err => {
        Swal.fire('Error', String(err), 'error');
    }).finally(() => { 
        btn.disabled = false; 
        btn.innerHTML = originalText; 
    });
};

  function loadListPetugas() { 
      const container = document.getElementById('adminTablePetugas'); 
      container.innerHTML = '<div class="col-span-1 md:col-span-2 text-center p-6 text-slate-400"><i class="fas fa-circle-notch fa-spin mr-2"></i>Memuat API Admin...</div>'; 
      
      apiCall('getListPetugas').then(res => { 
          if (!res || res.length === 0) { 
              container.innerHTML = '<div class="col-span-1 md:col-span-2 text-center p-6 text-slate-400 font-medium">Belum ada data petugas terdaftar.</div>'; 
              return; 
          } 

          // =========================================================
          // FILTER SAPU JAGAT: Bersihkan Data Resort & Baris Kosong
          // =========================================================
          const petugasPusat = res.filter(p => {
              const roleLower = String(p.Role || p.Level || p.role || '').toLowerCase();
              const namaLower = String(p.Nama || p.nama || '').toLowerCase();
              const userLower = String(p.Username || p.username || '').toLowerCase();

           const isResort = roleLower.includes('resort') || roleLower.includes('daerah') || roleLower.includes('pos') ||
                 namaLower.includes('resort') || namaLower.includes('daerah') || namaLower.includes('pos') ||
                 userLower.includes('resort') || userLower.includes('daerah') || userLower.includes('pos');

              // 2. Cek apakah ini baris kosong / junk data (Username hanya "-" atau kosong)
              const isJunk = userLower === '-' || userLower === '' || userLower === 'undefined';

              // Loloskan HANYA JIKA BUKAN resort dan BUKAN baris kosong
              return !isResort && !isJunk;
          });

          // Jika setelah disaring ternyata kosong
          if (petugasPusat.length === 0) {
              container.innerHTML = '<div class="col-span-1 md:col-span-2 text-center p-6 text-slate-400 font-medium">Belum ada admin khusus Pusat yang terdaftar.</div>'; 
              return;
          }

          container.innerHTML = petugasPusat.map(p => { 
              const nama = p.Nama || p.nama || 'Petugas';
              const user = p.Username || p.username || '-';
              const role = p.Role || p.Level || p.role || 'Viewer';
              const inisial = nama ? String(nama).charAt(0).toUpperCase() : 'U'; 
              
              return `
              <div class="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 transition-colors shadow-sm hover:shadow-md">
                  <div class="flex items-center gap-4">
                      <div class="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-lg font-bold">${inisial}</div>
                      <div>
                          <p class="font-bold text-slate-800 text-sm leading-tight">${nama}</p>
                          <p class="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">${role} • @${user}</p>
                      </div>
                  </div>
                  <button onclick="hapusAkun('${user}')" title="Hapus Petugas" class="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                      <i class="fas fa-trash-alt"></i>
                  </button>
              </div>`; 
          }).join(''); 
          
      }).catch(err => { 
          container.innerHTML = `<div class="col-span-1 md:col-span-2 text-center p-4 text-rose-500 font-medium">Gagal API: ${err}</div>`; 
      }); 
  }
  
  function handleSavePetugas(e) { e.preventDefault(); Swal.fire({ title: 'Mengirim...', didOpen: () => { Swal.showLoading() } }); apiCall('simpanPetugas', Object.fromEntries(new FormData(e.target))).then(msg => { Swal.fire('Sukses', msg.message, 'success'); e.target.reset(); loadListPetugas(); }); }
  function hapusAkun(un) { Swal.fire({ title: 'Cabut akses petugas?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' }).then((r) => { if (r.isConfirmed) { Swal.fire({ title: 'Mencabut...', didOpen: () => { Swal.showLoading() } }); apiCall('hapusPetugas', {username: un}).then(() => { Swal.fire('Dihapus!', 'Akses telah dicabut.', 'success'); loadListPetugas(); }); } }); }

  let deferredPrompt; window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
  function promptInstallPWA() { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then((c) => { deferredPrompt = null; }); } else { Swal.fire({ title: 'Install Aplikasi', html: 'Gunakan fitur Add to Home Screen pada browser Anda.', confirmButtonColor: '#10b981' }); } }
  // ========================================================
  // MESIN CETAK PDF UTAMA (Tombol Header Atas)
  // ========================================================
  function bukaPreviewCetakData() { 
    const isJemaat = document.getElementById('pageJemaat') && !document.getElementById('pageJemaat').classList.contains('hidden'); 
    const isMajelis = document.getElementById('pageSearch') && !document.getElementById('pageSearch').classList.contains('hidden') && !document.getElementById('kontenMajelis').classList.contains('hidden'); 
    const isIndividu = document.getElementById('pageSearch') && !document.getElementById('pageSearch').classList.contains('hidden') && !document.getElementById('kontenIndividu').classList.contains('hidden'); 
    
    let dataList = [];
    if(isJemaat) { dataList = window.currentFilteredJemaat || []; }
    else if(isMajelis || isIndividu) { dataList = window.currentFilteredList || []; }
    else { dataList = window.currentFilteredGereja || []; }
    
    let judul = "Data Jemaat & Unit Gereja"; 
    if (isMajelis) judul = "Struktur Majelis Per Gereja"; 
    if (isIndividu) judul = "Direktori Personil Majelis"; 
    if (isJemaat) judul = "Data Keluarga Jemaat"; 
    
    // Khusus isMajelis (Tree Grid) dataList dibiarkan masuk dulu agar bisa diproses Pohon Hierarkinya
    if (!isMajelis && (!dataList || dataList.length === 0)) { 
        return Swal.fire('Data Kosong', 'Tidak ada data untuk dicetak saat ini.', 'info'); 
    } 

    safeSetText('judulCetakPdf', judul); 
    safeSetText('tglCetakPdf', "Dicetak pada: " + new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })); 

    let fwText = "-"; let frText = "-"; let fgText = "-"; let fjText = "-";
    try {
        if(isJemaat) {
            const fw = document.getElementById('f_wil_j'); const fr = document.getElementById('f_res_j'); const fg = document.getElementById('f_ger_j'); 
            fwText = (fw && fw.selectedIndex >= 0) ? fw.options[fw.selectedIndex].text : '-'; 
            frText = (fr && fr.selectedIndex >= 0) ? fr.options[fr.selectedIndex].text : '-'; 
            fgText = (fg && fg.selectedIndex >= 0) ? fg.options[fg.selectedIndex].text : '-';
            safeSetHTML('infoFilterCetak', `<div><b>Wilayah:</b> ${fwText}</div><div><b>Resort / JK:</b> ${frText}</div><div><b>Unit Gereja:</b> ${fgText}</div>`); 
        } else {
            const fw = document.getElementById('filterWilayah'); const fr = document.getElementById('filterResort'); const fg = document.getElementById('filterGereja'); const fj = document.getElementById('filterJabatan'); 
            fwText = (fw && fw.selectedIndex >= 0) ? fw.options[fw.selectedIndex].text : '-'; 
            frText = (fr && fr.selectedIndex >= 0) ? fr.options[fr.selectedIndex].text : '-'; 
            fgText = (fg && fg.selectedIndex >= 0) ? fg.options[fg.selectedIndex].text : '-'; 
            fjText = (fj && fj.selectedIndex >= 0) ? fj.options[fj.selectedIndex].text : '-';
            safeSetHTML('infoFilterCetak', `<div><b>Wilayah:</b> ${fwText}</div><div><b>Resort / JK:</b> ${frText}</div><div><b>Unit Gereja:</b> ${fgText}</div>${(isMajelis || isIndividu) ? `<div><b>Jabatan:</b> ${fjText}</div>` : ''}`); 
        }
    } catch(e) {}

    const areaTabel = document.querySelector('#areaCetakDokumen table');
    if (areaTabel) areaTabel.style.fontSize = "9px"; 

    if(isJemaat) { 
        safeSetHTML('headTabelCetak', `<tr><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 5%;">No</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 15%;">No KK</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 25%;">Nama Lengkap</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 15%;">Status</th><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 10%;">L/P</th><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 15%;">Umur</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 15%;">Pekerjaan</th></tr>`); 
        safeSetHTML('bodyTabelCetak', dataList.map((j, i) => `<tr style="page-break-inside: avoid;"><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${i+1}</td><td style="border: 1px solid #cbd5e1; padding: 5px; font-weight: bold;">${j.No_KK||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${j.Nama_Lengkap||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${j.Status_Keluarga||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${j.Jenis_Kelamin||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${hitungUmur(j.Tanggal_Lahir)}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${j.Pekerjaan||'-'}</td></tr>`).join('')); 
    } else if (isMajelis) { 
        safeSetHTML('headTabelCetak', `<tr><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 5%;">No</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 35%;">Nama Lengkap</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 25%;">Jabatan</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 20%;">No. WA</th><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 15%;">Wilayah</th></tr>`); 
        
        let pdfTree = window.currentTreeData;
        const groupArray = Object.keys(pdfTree).map(k => ({ name: k, ...pdfTree[k] })).sort((a,b) => a.name.localeCompare(b.name));

        if (groupArray.length === 0) {
             return Swal.fire('Data Kosong', 'Tidak ada data majelis untuk dicetak pada filter yang Anda pilih saat ini.', 'info');
        }
        
        let pdfHtml = groupArray.map(g => {
            let htmlBlock = `<tr style="background-color: #1e293b; color: white; font-weight: bold; page-break-after: avoid;"><td colspan="5" style="border: 1px solid #cbd5e1; padding: 10px; font-size: 14px;">${g.isJK ? '⛪ JEMAAT KHUSUS: ' : '🏢 RESORT: '} ${g.name} <span style="font-weight:normal; font-size:10px; color:#cbd5e1; float:right;">(Wilayah ${g.wilayah})</span></td></tr>`;
            
            if (g.phr.length > 0) {
                htmlBlock += `<tr style="background-color: #f1f5f9; font-weight: bold; page-break-after: avoid;"><td colspan="5" style="border: 1px solid #cbd5e1; padding: 8px; color: #b45309;"><span style="font-size: 11px;">${g.isJK ? 'Susunan Majelis Jemaat Khusus' : 'Pengurus Harian Resort (PHR)'}</span></td></tr>`;
                htmlBlock += g.phr.map((m, i) => `<tr style="page-break-inside: avoid;"><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${i+1}</td><td style="border: 1px solid #cbd5e1; padding: 5px; font-weight: bold; color: #0f172a;">${m.Nama_Lengkap||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${m.Jabatan||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${m.No_HP||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">W-${m.Wilayah||'-'}</td></tr>`).join('');
            }
            
            if (!g.isJK) {
                Object.keys(g.pagaran).sort().forEach(pk => {
                    htmlBlock += `<tr style="background-color: #f8fafc; font-weight: bold; page-break-after: avoid;"><td colspan="5" style="border: 1px solid #cbd5e1; padding: 8px; color: #4338ca;"><span style="font-size: 11px;">⛪ Gereja Pagaran: ${pk}</span></td></tr>`;
                    htmlBlock += g.pagaran[pk].map((m, i) => `<tr style="page-break-inside: avoid;"><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${i+1}</td><td style="border: 1px solid #cbd5e1; padding: 5px; font-weight: bold; color: #0f172a;">${m.Nama_Lengkap||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${m.Jabatan||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${m.No_HP||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">W-${m.Wilayah||'-'}</td></tr>`).join('');
                });
            }
            return htmlBlock;
        }).join('');

        safeSetHTML('bodyTabelCetak', pdfHtml);

    } else if (isIndividu) { 
        safeSetHTML('headTabelCetak', `<tr><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 5%;">No</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 25%;">Nama Lengkap</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 15%;">Jabatan</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 25%;">Penempatan Unit</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 15%;">Resort/Wilayah</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 15%;">No. WA</th></tr>`); 
        safeSetHTML('bodyTabelCetak', dataList.map((m, i) => { let infoGereja = m.Nama_Gereja ? String(m.Nama_Gereja).toUpperCase() : 'TINGKAT RESORT'; let infoResort = m.Resort ? String(m.Resort).toUpperCase() : 'JEMAAT KHUSUS'; return `<tr style="page-break-inside: avoid;"><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${i+1}</td><td style="border: 1px solid #cbd5e1; padding: 5px; font-weight: bold; color: #0f172a;">${m.Nama_Lengkap||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${m.Jabatan||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${infoGereja}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${infoResort} (W-${m.Wilayah||'-'})</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${m.No_HP||'-'}</td></tr>`; }).join('')); 
    } else { 
        safeSetHTML('headTabelCetak', `<tr><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 5%;">No</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 25%;">Nama Unit Gereja</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 15%;">Status</th><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 10%;">Wilayah</th><th style="border: 1px solid #cbd5e1; padding: 6px; width: 25%;">Induk Resort / JK</th><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 10%;">Total RT</th><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 10%;">Total Jiwa</th></tr>`); 
        let totRT = 0, totJiwa = 0; 
        safeSetHTML('bodyTabelCetak', dataList.map((g, i) => { let rt = parseInt(g.Total_RT) || 0; let jiwa = parseInt(g.Total_Jiwa) || 0; totRT += rt; totJiwa += jiwa; return `<tr style="page-break-inside: avoid;"><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${i+1}</td><td style="border: 1px solid #cbd5e1; padding: 5px; font-weight: bold; color: #0f172a;">${g.Nama_Gereja||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${g.Status_Gereja || g.Tipe_Gereja || 'Pagaran'}</td><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${g.Wilayah||'-'}</td><td style="border: 1px solid #cbd5e1; padding: 5px;">${g.Induk_Resort || g.Resort || 'Jemaat Khusus'}</td><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${rt}</td><td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center;">${jiwa}</td></tr>`; }).join('') + `<tr style="background-color: #f1f5f9; font-weight: bold; font-size: 10px; page-break-inside: avoid;"><td colspan="5" style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">TOTAL KESELURUHAN:</td><td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; color: #b45309;">${totRT}</td><td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; color: #15803d;">${totJiwa}</td></tr>`); 
    } 
    
    // Pastikan Z-Index Modal berada paling atas (110)
    persiapkanModalCetak();
    document.getElementById('modalCetakData').classList.remove('hidden'); 
  }
  
  window.addEventListener('resize', () => { if(window.innerWidth >= 768) { document.getElementById('sidebarOverlay').classList.add('hidden'); } });


window.openBlastModal = function() { 
      const isKorwil = document.getElementById('kontenKorwil') && !document.getElementById('kontenKorwil').classList.contains('hidden');
      
      let listPenerima = [];
      
      if (isKorwil) {
          // Ambil semua Korwil yang AKTIF saja
          listPenerima = (DATA_MASTER.korwil || []).filter(k => k.Status === 'Aktif').map(k => ({
              Nama_Lengkap: k.Nama_Korwil,
              No_HP: k.No_HP,
              Jabatan: 'Koordinator Wilayah',
              Wilayah: k.Wilayah
          }));
      } else {
          // Ambil data personil (dari tab Majelis/Individu)
          listPenerima = window.currentFilteredList;
      }
      
      if(!listPenerima || listPenerima.length === 0) {
          return Swal.fire('Data Kosong', 'Tidak ada personil/Korwil yang sesuai dengan filter saat ini.', 'info'); 
      }
      
      // Sembunyikan filter ganda di dalam Pop-up agar tidak membingungkan
      const filterW = document.getElementById('blastOptWilayah');
      const filterJ = document.getElementById('blastOptJabatan');
      if (filterW && filterW.parentElement) filterW.parentElement.style.display = 'none';
      if (filterJ && filterJ.parentElement) filterJ.parentElement.style.display = 'none';

      window.currentBlastList = listPenerima;
      safeSetText('countPenerima', listPenerima.length.toLocaleString('id-ID'));
      document.getElementById('modalBlastFonte').classList.remove('hidden'); 
};
  
  window.closeBlastModal = function() { 
      document.getElementById('modalBlastFonte').classList.add('hidden'); 
  };

  // Mencegah error jika select bawaan HTML lama tidak sengaja terklik
  window.hitungTargetBlast = function() {};

  window.kirimBlastSekarang = function() { 
      const list = window.currentBlastList; 
      const pesan = document.getElementById('pesanFonte').value; 
      const fileInput = document.getElementById('fileBlast'); 
      
      if(!list || list.length === 0) return Swal.fire('Data Kosong', 'Tidak ada target personil.', 'warning'); 
      if(!pesan) return Swal.fire('Pesan Kosong', 'Mohon ketik isi pesan WhatsApp terlebih dahulu.', 'warning'); 
      
      const btn = document.getElementById('btnEksekusiBlast'); 
      btn.disabled = true; 
      Swal.fire({ title: 'Kirim via API...', text: 'Memproses pengiriman pesan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } }); 
      
      if(fileInput && fileInput.files.length > 0) { 
        const reader = new FileReader(); 
        reader.onload = function(e) { 
          const f = { content: e.target.result.split(',')[1], name: fileInput.files[0].name, type: fileInput.files[0].type }; 
          apiCall('processBlastFonteWithFile', {list: list, pesan: pesan, fileObj: f})
            .then(msg => { Swal.fire('Berhasil', msg.message || 'Pesan Blast terkirim', 'success'); closeBlastModal(); btn.disabled=false; fileInput.value=''; })
            .catch(err => { Swal.fire('Error API', String(err), 'error'); btn.disabled=false; }); 
        }; 
        reader.readAsDataURL(fileInput.files[0]); 
      } else { 
        apiCall('processBlastFonteWithFile', {list: list, pesan: pesan, fileObj: null})
            .then(msg => { Swal.fire('Berhasil', msg.message || 'Pesan Blast terkirim', 'success'); closeBlastModal(); btn.disabled=false; })
            .catch(err => { Swal.fire('Error API', String(err), 'error'); btn.disabled=false; }); 
      } 
  };

  // ====================================================================
  // FUNGSI MULTI PERSONIL & OCR SCAN
  // ====================================================================
  window.tsInst = window.tsInst || {};
  window.barisPersonilCount = 0;

  window.openFormMajelisMulti = function() {
      if(document.getElementById('formMultiMajelis')) document.getElementById('formMultiMajelis').reset();
      document.getElementById('wadahPersonilMulti').innerHTML = ''; window.barisPersonilCount = 0;
      let htmlJW = '<option value="">Pilih Wilayah</option>'; for(let i=1; i<=12; i++) htmlJW+=`<option value="${i}">WILAYAH ${i}</option>`;
      safeSetHTML('mul_wilayah', htmlJW); syncFormResortBulk(); // Menggunakan fungsi sinkronisasi yang sudah ada
      tambahBarisPersonil(); 
      document.getElementById('modalFormMulti').classList.remove('hidden'); 
  };




  window.prosesScanSK = function(event) {
      const file = event.target.files[0]; if (!file) return; document.getElementById('inputScanSK').value = '';
      Swal.fire({ title: 'Memindai SK...', html: '<div class="text-sm mt-2">Mengekstrak teks...<br><b id="ocrProgress" class="text-emerald-600 text-lg">0%</b></div>', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
      Tesseract.recognize(file, 'ind', { logger: m => { if (m.status === 'recognizing text' && document.getElementById('ocrProgress')) document.getElementById('ocrProgress').innerText = Math.round(m.progress * 100) + '%'; }
      }).then(({ data: { text } }) => {
          let lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
          let hasilScanIndividual = []; let activeSection = ""; let stopParsing = false; 
          let validJabatans = DATA_MASTER.jabatan.map(j => j.Nama_Jabatan).filter(j => j);

          lines.forEach(line => {
              if (stopParsing) return; 
              let upperLine = line.toUpperCase(); let lowerLine = line.toLowerCase();
              if (["ditetapkan di", "sekretaris jenderal", "kantor sinode"].some(kw => lowerLine.includes(kw)) || upperLine.match(/\bNRP\b/)) { stopParsing = true; return; }
              if (/^I[\.\,]\s+PENGURUS/.test(upperLine)) { activeSection = "PENGURUS"; return; }
              if (/^II[\.\,]\s+SEKSI/.test(upperLine)) { activeSection = "SEKSI"; return; }
              if (/^III[\.\,]\s+PENASEHAT/.test(upperLine)) { activeSection = "PENASEHAT"; return; }
              if (/^IV[\.\,]\s+PENGAWAS/.test(upperLine) || upperLine.includes("PHBK")) { activeSection = "PHB"; return; }
              if (/^V[\.\,]\s+PENATUA/.test(upperLine)) { activeSection = "PENATUA"; return; }

              if (activeSection === "PENGURUS" || activeSection === "SEKSI") {
                  let splitLine = line.split(/[:;]/); let sisiKiri = splitLine[0].toLowerCase(); let sisiKanan = splitLine.length > 1 ? splitLine.slice(1).join(':').trim() : "";
                  let matchedJabatan = cariJabatanSistem(sisiKiri, activeSection, validJabatans);
                  if (matchedJabatan) {
                      let rawNama = sisiKanan !== "" ? sisiKanan : line.toLowerCase().replace(sisiKiri, '').trim(); 
                      if (rawNama.length > 3 && !rawNama.toLowerCase().includes("sesuai sk")) {
                          rawNama.split(/\bdan\b|&/i).forEach(n => { let nBersih = n.replace(/^[\d\.\)\:\s]+|[\.\:\-\s_=|~;\?]+$/g, '').trim(); if(nBersih.length > 3) hasilScanIndividual.push({ jabatan: matchedJabatan, nama: nBersih }); });
                      }
                  }
              } 
              else if (activeSection === "PENASEHAT" || activeSection === "PHB" || activeSection === "PENATUA") {
                  let roleTarget = activeSection === "PHB" ? "pengawas harta benda" : (activeSection === "PENASEHAT" ? "penasehat" : "penatua");
                  let matchedRole = validJabatans.find(v => v.toLowerCase().includes(roleTarget)) || activeSection; 
                  line.split(/(?=\b\d+[\.\)]\s)/g).forEach(part => {
                      let cleanName = part.replace(/^[\d\.\)\:\s]+|[\.\:\-\s_=|~;\?]+$/g, '').trim();
                      if (cleanName.length > 3 && !cleanName.toLowerCase().includes('sesuai sk') && !cleanName.toLowerCase().includes('aktif')) hasilScanIndividual.push({ jabatan: matchedRole, nama: cleanName });
                  });
              }
          });

          if(hasilScanIndividual.length === 0) return Swal.fire('Gagal Membaca', 'Pastikan foto terbaca jelas.', 'error');
          document.getElementById('wadahPersonilMulti').innerHTML = ''; window.barisPersonilCount = 0;
          hasilScanIndividual.forEach(personil => {
              tambahBarisPersonil(); let selectId = 'mul_jabatan_' + window.barisPersonilCount;
              document.getElementById('personil_row_' + window.barisPersonilCount).querySelector('input[name="mul_nama[]"]').value = personil.nama; 
              if (window.tsInst[selectId]) window.tsInst[selectId].setValue(personil.jabatan); 
          });
          Swal.fire('Auto-Isi Berhasil!', `${hasilScanIndividual.length} personil diuraikan.`, 'success');
      }).catch(err => Swal.fire('Error Scan', err.message, 'error'));
  }

  function cariJabatanSistem(rawKiri, section, validJabatans) {
      let text = rawKiri.toLowerCase(); let keywords = [];
      if (section === "PENGURUS") { if (text.includes("pemimpin")) keywords = ["pemimpin", "pendeta jemaat"]; else if (text.includes("sekretaris")) keywords = ["sekretaris"]; else if (text.includes("bendahara")) keywords = ["bendahara"]; } 
      else if (section === "SEKSI") { if (text.includes("rohani") || text.includes("pembinaan")) keywords = ["rohani", "pembinaan"]; else if (text.includes("injil")) keywords = ["injil", "zending"]; else if (text.includes("diakoni")) keywords = ["diakoni"]; else if (text.includes("musik") || text.includes("koor")) keywords = ["musik", "koor"]; else if (text.includes("sekolah minggu")) keywords = ["sekolah minggu"]; else if (text.includes("remaja")) keywords = ["remaja"]; else if (text.includes("pemuda") || text.includes("pp")) keywords = ["pemuda"]; else if (text.includes("perempuan") || text.includes("pr")) keywords = ["perempuan"]; else if (text.includes("pria")) keywords = ["pria"]; else if (text.includes("lansia")) keywords = ["lansia"]; }
      if (keywords.length > 0) { for (let jbt of validJabatans) { if (keywords.some(kw => jbt.toLowerCase().includes(kw))) return jbt; } } return null;
  }

  // =========================================================================
  // PATCH PERBAIKAN: MODAL MULTI MAJELIS, SMART DROPDOWN & AI SCAN
  // =========================================================================

  window.tsInst = window.tsInst || {};
  window.barisPersonilCount = 0;

  // 1. Memaksa Dropdown Wilayah dan Resort Multi agar terhubung (Tidak Blank)
  window.openFormMajelisMulti = function() {
      if(document.getElementById('formMultiMajelis')) document.getElementById('formMultiMajelis').reset();
      document.getElementById('wadahPersonilMulti').innerHTML = ''; 
      window.barisPersonilCount = 0;
      
      // Mengarahkan HTML ke Fungsi yang Benar secara Otomatis
      const selWil = document.getElementById('mul_wilayah');
      const selRes = document.getElementById('mul_resort');
      const selGer = document.getElementById('mul_gereja');
      
      if(selWil) selWil.setAttribute('onchange', 'syncResortMulti()');
      if(selRes) selRes.setAttribute('onchange', 'syncGerejaMulti()');
      if(selGer) selGer.setAttribute('onchange', 'updateJabatanOptionsModal("mul")');

      // Memasukkan Daftar Wilayah
      let htmlJW = '<option value="">Pilih Wilayah</option>'; 
      for(let i=1; i<=12; i++) { htmlJW += `<option value="${i}">WILAYAH ${i}</option>`; }
      if(selWil) selWil.innerHTML = htmlJW;

      syncResortMulti(); 
      tambahBarisPersonil(); 
      document.getElementById('modalFormMulti').classList.remove('hidden'); 
  };

  window.syncResortMulti = function() { 
      const w = document.getElementById('mul_wilayah')?.value || ''; const cleanW = String(w).trim().toLowerCase();
      const fr = document.getElementById('mul_resort'); if(!fr) return; fr.innerHTML = '<option value="">Pilih Resort / JK</option>'; 
      const resorts = [...new Set(DATA_MASTER.gereja.filter(g => (!w || String(g.Wilayah).trim().toLowerCase() === cleanW) && String(g.Tipe_Gereja || g.Status_Gereja || '').toUpperCase() !== "JEMAAT KHUSUS" && (g.Induk_Resort || g.Resort)).map(g => String(g.Induk_Resort || g.Resort).trim()))].sort(); 
      const khusus = DATA_MASTER.gereja.filter(g => (!w || String(g.Wilayah).trim().toLowerCase() === cleanW) && String(g.Tipe_Gereja || g.Status_Gereja || '').toUpperCase() === "JEMAAT KHUSUS").map(g => String(g.Nama_Gereja).trim()).sort(); 
      resorts.forEach(r => { const opt = document.createElement('option'); opt.value = r; opt.text = r; opt.setAttribute('data-tipe', 'RESORT'); fr.appendChild(opt); }); khusus.forEach(k => { const opt = document.createElement('option'); opt.value = k; opt.text = "JK - " + k; opt.setAttribute('data-tipe', 'JK'); fr.appendChild(opt); }); 
      syncGerejaMulti(); 
  };
  
  window.syncGerejaMulti = function() { 
      const resSelect = document.getElementById('mul_resort'); const fg = document.getElementById('mul_gereja'); if(!fg || !resSelect) return; 
      const val = resSelect.value, tipe = resSelect.options[resSelect.selectedIndex]?.getAttribute('data-tipe'); fg.innerHTML = '<option value="">Pilih Nama Gereja / PHR</option>'; 
      if (tipe === "RESORT" || (!tipe && val)) { 
          fg.innerHTML += `<option value="Pengurus Harian Resort (PHR)" class="font-bold text-emerald-700 bg-emerald-50">🏢 PENGURUS HARIAN RESORT (PHR)</option>`;
          DATA_MASTER.gereja.filter(g => String(g.Induk_Resort || g.Resort || '').trim() === val).forEach(g => { const opt = document.createElement('option'); opt.value = g.Nama_Gereja; opt.text = g.Nama_Gereja; fg.appendChild(opt); }); 
          fg.disabled = false; fg.classList.remove('bg-slate-200'); 
      } else if (tipe === "JK") { const opt = document.createElement('option'); opt.value = val; opt.text = val; fg.appendChild(opt); fg.value = val; fg.disabled = false; fg.classList.add('bg-slate-200'); } else { fg.disabled = false; fg.classList.remove('bg-slate-200'); } 
      updateJabatanOptionsModal('mul');
  };

window.tambahBarisPersonil = function() {
      if (!window.barisPersonilCount) window.barisPersonilCount = 0;
      window.barisPersonilCount++; 
      const wadah = document.getElementById('wadahPersonilMulti');
      const rowId = 'personil_row_' + window.barisPersonilCount; 
      
      // Membuat ID Datalist yang unik untuk setiap baris
      const listId = 'list_jabatan_' + window.barisPersonilCount;
      
      let jHtml = '';
      DATA_MASTER.jabatan.forEach(j => { if(j.Nama_Jabatan) jHtml += `<option value="${j.Nama_Jabatan}">`; });

      const div = document.createElement('div'); div.id = rowId; 
      div.className = "bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative group";
      
      // Tombol X sekarang tidak menggunakan 'absolute', melainkan akan masuk ke dalam flexbox
      let btnHapus = window.barisPersonilCount > 1 ? `<button type="button" onclick="hapusBarisPersonil('${rowId}', null)" class="w-6 h-6 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-slate-100 transition-colors"><i class="fas fa-times text-[10px]"></i></button>` : '';

      div.innerHTML = `
          <!-- Header Baris: Menyejajarkan Judul dan Tombol X -->
          <div class="flex justify-between items-center mb-3">
              <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Personil #${window.barisPersonilCount}</div>
              ${btnHapus}
          </div>
          
          <div class="grid grid-cols-2 gap-3">
              <div class="col-span-2">
                  <label class="text-[10px] font-semibold text-slate-500 mb-1 block">Nama Lengkap*</label>
                  <input type="text" name="mul_nama[]" required autocomplete="off" class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 placeholder-slate-300" placeholder="Contoh: Pdt. Andi, S.Th">
              </div>
              <div>
                  <label class="text-[10px] font-semibold text-slate-500 mb-1 block">Jabatan*</label>
                  <!-- Kombinasi Input Text & Datalist (Bisa diketik manual & bisa dipilih) -->
                  <input type="text" name="mul_jabatan[]" list="${listId}" required autocomplete="off" class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 placeholder-slate-300 bg-white" placeholder="Ketik atau pilih...">
                  <datalist id="${listId}">
                      ${jHtml}
                  </datalist>
              </div>
              <div>
                  <label class="text-[10px] font-semibold text-slate-500 mb-1 block">Nomor HP</label>
                  <input type="text" name="mul_hp[]" autocomplete="off" class="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 placeholder-slate-300" placeholder="0812...">
              </div>
          </div>`;
      wadah.appendChild(div);
      
      if(typeof updateLabelPersonil === 'function') updateLabelPersonil();
  };
  
  window.hapusBarisPersonil = function(rowId, selectId) { document.getElementById(rowId).remove(); if(window.tsInst[selectId]) { window.tsInst[selectId].destroy(); delete window.tsInst[selectId]; } updateLabelPersonil(); };
  window.updateLabelPersonil = function() { const rows = document.getElementById('wadahPersonilMulti').children; for(let i=0; i<rows.length; i++) { const badge = rows[i].querySelector('.label-personil'); if(badge) badge.innerText = "PERSONIL #" + (i+1); } };

  window.updateJabatanOptionsModal = function(prefix = 'form') {
      let isPHR = false; 
      let idGereja = (prefix === 'mul') ? 'mul_gereja' : 'formGereja';
      const gSelect = document.getElementById(idGereja);
      if (gSelect) { const gerejaVal = gSelect.value.toLowerCase(); isPHR = gerejaVal.includes('phr'); }

      const allowedPHR = ["pengurus harian jemaat resort", "pendeta diperbantukan", "kordinator sekolah minggu resort", "kordinator pemuda/i resort", "kordinator perempuan resort", "kordinator pria resort", "perwakilan penatua resort", "pengawas harta benda keuangan", "sekretaris resort", "bendahara resort", "pendeta resort", "pendeta", "pemimpin jemaat"];
      
      // PERBAIKAN: Kosongkan text opsi pertama
      let options = [{value: "", text: ""}];

      DATA_MASTER.jabatan.forEach(j => {
          if(j.Nama_Jabatan) {
              if (isPHR) { 
                  if(allowedPHR.some(phr => j.Nama_Jabatan.toLowerCase().includes(phr))) options.push({value: j.Nama_Jabatan, text: j.Nama_Jabatan});
              } else { options.push({value: j.Nama_Jabatan, text: j.Nama_Jabatan}); }
          }
      });

      if (prefix === 'form' && window.tsInst['m']) { 
          let currentVal = window.tsInst['m'].getValue(); window.tsInst['m'].clearOptions(); window.tsInst['m'].addOptions(options); 
          if (options.some(o => o.value === currentVal)) window.tsInst['m'].setValue(currentVal); 
      } else if (prefix === 'mul') {
          Object.keys(window.tsInst).forEach(key => {
              if (key.startsWith('mul_jabatan_')) { 
                  let currentVal = window.tsInst[key].getValue(); window.tsInst[key].clearOptions(); window.tsInst[key].addOptions(options); 
                  if (options.some(o => o.value === currentVal)) window.tsInst[key].setValue(currentVal); 
              }
          });
      }
  };

 window.simpanMultiMajelis = function(e) {
      e.preventDefault(); 
      
      const namaInputs = document.getElementsByName('mul_nama[]');
      const jabatanInputs = document.getElementsByName('mul_jabatan[]'); 
      const hpInputs = document.getElementsByName('mul_hp[]');
      
      const wilayah = document.getElementById('mul_wilayah').value; 
      let resort = document.getElementById('mul_resort').value; 
      let gereja = document.getElementById('mul_gereja').value;
      const fr = document.getElementById('mul_resort'); 
      if(fr.options[fr.selectedIndex]?.getAttribute('data-tipe') === 'JK') { gereja = resort; resort = ""; }

      let arrData = [];
      let countIsi = 0;
      
      // Membuat list HTML untuk ditampilkan di dalam Pop-Up
      let htmlListPreview = `<div class="mt-3 max-h-48 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-3 text-left shadow-inner custom-scrollbar space-y-2">`;

      for(let i=0; i<namaInputs.length; i++) {
          let jbt = jabatanInputs[i].value; 
          let grjRow = gereja;
          if(jbt.toLowerCase().includes('pendeta') || jbt.toLowerCase().includes('pemimpin') || jbt.toLowerCase().includes('resort')) { 
              grjRow = "Tingkat Resort"; 
          }
          
          let rawNames = namaInputs[i].value; 
          let nameArray = rawNames.split(';').map(n => n.trim()).filter(n => n !== "");
          let rawHPs = hpInputs[i].value; 
          let hpArray = rawHPs.split(';').map(h => h.trim());
          
          nameArray.forEach((namaSatu, index) => { 
              let hpSatu = hpArray[index] || ""; 
              arrData.push({ "Nama_Lengkap": namaSatu, "Jabatan": jbt, "Wilayah": wilayah, "Resort": resort, "Nama_Gereja": grjRow, "No_HP": hpSatu }); 
              
              // Tambahkan nama ke dalam List Preview
              htmlListPreview += `
              <div class="flex items-center justify-between border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                  <div class="text-xs font-bold text-slate-700 truncate w-2/3"><i class="fas fa-user-check text-emerald-500 mr-1.5"></i>${namaSatu}</div>
                  <div class="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded truncate w-1/3 text-right uppercase">${jbt}</div>
              </div>`;
              countIsi++;
          });
      }
      htmlListPreview += `</div>`;

      if(arrData.length === 0) return Swal.fire('Kosong', 'Tidak ada personil yang ditambahkan.', 'warning');

      Swal.fire({
          title: 'Simpan ' + countIsi + ' Personil?',
          html: '<p class="text-sm text-slate-500 font-medium">Periksa kembali daftar personil berikut:</p>' + htmlListPreview,
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#10b981',
          cancelButtonColor: '#ef4444',
          confirmButtonText: '<i class="fas fa-cloud-upload-alt mr-1"></i> Ya, Simpan Semua!',
          cancelButtonText: 'Batal'
      }).then((result) => {
          if (result.isConfirmed) {
              const btn = document.getElementById('btnSubmitMulti'); 
              const originalText = btn.innerHTML;

              btn.disabled = true; 
              btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>MENYIMPAN...';
              Swal.fire({ title: 'Menyimpan...', html: 'Mengirim '+arrData.length+' data...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

              apiCall('importMajelisMassal', {excelData: arrData, userRole: USER_NOW.role, sumberAsal: "Dashboard Pusat"}).then(res => {
                  if (res === true || res.status === 'success' || res.added !== undefined) {
                      let count = parseInt(res.added); if (isNaN(count)) count = arrData.length; 
                      if (count === 0) { Swal.fire({ title: 'Ditolak!', html: 'Semua nama tersebut <b>sudah terdaftar</b> di database.', icon: 'info' }); } 
                      else { Swal.fire('Berhasil!', `<b>${count}</b> personil baru didaftarkan.`, 'success'); closeModal('modalFormMulti'); loadData(true); }
                  } else { Swal.fire('Gagal', res.message || 'Terjadi kesalahan server.', 'error'); }
                  btn.disabled = false; btn.innerHTML = originalText;
              }).catch(err => { Swal.fire('Error', String(err), 'error'); btn.disabled = false; btn.innerHTML = originalText; });
          }
      });
  };

  
  // 5. Mesin OCR / Scan SK AI Tesseract
  window.prosesScanSK = function(event) {
      const file = event.target.files[0]; if (!file) return; document.getElementById('inputScanSK').value = '';
      if (typeof Tesseract === 'undefined') {
          Swal.fire({ title: 'Menyiapkan AI...', text: 'Mengunduh modul kamera cerdas (hanya pada penggunaan pertama)...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
          script.onload = () => { Swal.close(); jalankanTesseract(file); };
          document.head.appendChild(script);
      } else { jalankanTesseract(file); }
  };

  function jalankanTesseract(file) {
      Swal.fire({ title: 'Memindai SK...', html: '<div class="text-sm mt-2 text-slate-500">Mengekstrak baris per baris...<br><b id="ocrProgress" class="text-emerald-600 text-lg">0%</b></div>', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
      Tesseract.recognize(file, 'ind', { logger: m => { if (m.status === 'recognizing text' && document.getElementById('ocrProgress')) { document.getElementById('ocrProgress').innerText = Math.round(m.progress * 100) + '%'; } }
      }).then(({ data: { text } }) => {
          let lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
          let hasilScanIndividual = []; let activeSection = ""; let stopParsing = false; 
          let validJabatans = DATA_MASTER.jabatan.map(j => j.Nama_Jabatan).filter(j => j);

          lines.forEach(line => {
              if (stopParsing) return; 
              let upperLine = line.toUpperCase(); let lowerLine = line.toLowerCase();
              const stopKeywords = ["ditetapkan di", "sekretaris jenderal", "kantor sinode", "tembusan"];
              if (stopKeywords.some(keyword => lowerLine.includes(keyword)) || upperLine.match(/\bNRP\b/)) { stopParsing = true; return; }
              if (lowerLine.includes("pdt. dr. humala") || lowerLine.includes("pdt. parsaoran") || lowerLine.includes("pimpinan sinode gkpi")) { return; }

              if (/^I[\.\,]\s+PENGURUS/.test(upperLine)) { activeSection = "PENGURUS"; return; }
              if (/^II[\.\,]\s+SEKSI/.test(upperLine)) { activeSection = "SEKSI"; return; }
              if (/^III[\.\,]\s+PENASEHAT/.test(upperLine)) { activeSection = "PENASEHAT"; return; }
              if (/^IV[\.\,]\s+PENGAWAS/.test(upperLine) || upperLine.includes("PHBK")) { activeSection = "PHB"; return; }
              if (/^V[\.\,]\s+PENATUA/.test(upperLine)) { activeSection = "PENATUA"; return; }
              if (/^[IVX]+[\.\,]\s+[A-Z\s\/]+(:)?$/.test(upperLine)) return;

              if (activeSection === "PENGURUS" || activeSection === "SEKSI") {
                  let splitLine = line.split(/[:;]/); let sisiKiri = splitLine[0].toLowerCase(); let sisiKanan = splitLine.length > 1 ? splitLine.slice(1).join(':').trim() : "";
                  let matchedJabatan = cariJabatanSistem(sisiKiri, activeSection, validJabatans);
                  if (matchedJabatan) {
                      let rawNama = sisiKanan !== "" ? sisiKanan : line.toLowerCase().replace(sisiKiri, '').trim(); let namaBersih = bersihkanNama(rawNama);
                      if (namaBersih.length > 3 && !namaBersih.toLowerCase().includes("sesuai sk")) {
                          let namaBanyak = namaBersih.split(/\bdan\b|&/i);
                          namaBanyak.forEach(n => { let nBersih = bersihkanNama(n); if(nBersih.length > 3) hasilScanIndividual.push({ jabatan: matchedJabatan, nama: nBersih }); });
                      }
                  }
              } 
              else if (activeSection === "PENASEHAT" || activeSection === "PHB" || activeSection === "PENATUA") {
                  let parts = line.split(/(?=\b\d+[\.\)]\s)/g);
                  let roleTarget = activeSection === "PHB" ? "pengawas harta benda" : (activeSection === "PENASEHAT" ? "penasehat" : "penatua");
                  let matchedRole = validJabatans.find(v => v.toLowerCase().includes(roleTarget)) || validJabatans.find(v => v.toLowerCase().includes("sintua"));
                  if (!matchedRole) matchedRole = activeSection; 
                  parts.forEach(part => {
                      let cleanName = bersihkanNama(part);
                      if (cleanName.length > 3 && !cleanName.toLowerCase().includes('sesuai sk') && !cleanName.toLowerCase().includes('aktif') && !cleanName.toLowerCase().includes('periode')) {
                          hasilScanIndividual.push({ jabatan: matchedRole, nama: cleanName });
                      }
                  });
              }
          });

          if(hasilScanIndividual.length === 0) { return Swal.fire('Gagal Membaca', 'Sistem tidak menemukan format jabatan yang sesuai database.', 'error'); }

          document.getElementById('wadahPersonilMulti').innerHTML = ''; window.barisPersonilCount = 0;
          hasilScanIndividual.forEach(personil => {
              tambahBarisPersonil(); let selectId = 'mul_jabatan_' + window.barisPersonilCount; let rowEl = document.getElementById('personil_row_' + window.barisPersonilCount);
              let namaInput = rowEl.querySelector('input[name="mul_nama[]"]'); namaInput.value = personil.nama; 
              setTimeout(() => { if (window.tsInst[selectId]) { window.tsInst[selectId].setValue(personil.jabatan); } }, 100);
          });
          Swal.fire({ title: 'Auto-Isi Berhasil!', text: `${hasilScanIndividual.length} personil berhasil diuraikan secara rapi.`, icon: 'success' });
      }).catch(err => { Swal.fire('Error Scan', 'Sistem gagal memproses: ' + err.message, 'error'); });
  }

  function cariJabatanSistem(rawKiri, section, validJabatans) {
      let text = rawKiri.toLowerCase(); let keywords = [];
      if (section === "PENGURUS") {
          if (text.includes("pemimpin")) keywords = ["pemimpin", "pendeta jemaat"]; else if (text.includes("sekretaris")) keywords = ["sekretaris"]; else if (text.includes("bendahara")) keywords = ["bendahara"];
      } else if (section === "SEKSI") {
          if (text.includes("rohani") || text.includes("pembinaan")) keywords = ["rohani", "pembinaan"]; else if (text.includes("injil") || text.includes("pekabaran")) keywords = ["injil", "zending"]; else if (text.includes("diakoni")) keywords = ["diakoni"]; else if (text.includes("musik") || text.includes("koor")) keywords = ["musik", "koor"]; else if (text.includes("sekolah minggu")) keywords = ["sekolah minggu"]; else if (text.includes("remaja")) keywords = ["remaja"]; else if (text.includes("pemuda") || text.includes("pp")) keywords = ["pemuda"]; else if (text.includes("perempuan") || text.includes("pr")) keywords = ["perempuan"]; else if (text.includes("pria")) keywords = ["pria"]; else if (text.includes("lansia")) keywords = ["lansia"]; else if (text.includes("kesehatan")) keywords = ["kesehatan"]; else if (text.includes("pendidikan")) keywords = ["pendidikan"]; else if (text.includes("sarana") || text.includes("pembangunan")) keywords = ["sarana", "pembangunan"]; else if (text.includes("usaha") || text.includes("sdm")) keywords = ["usaha", "sdm"]; else if (text.includes("keamanan")) keywords = ["keamanan"];
      }
      if (keywords.length > 0) { for (let jbt of validJabatans) { let jbtLower = jbt.toLowerCase(); if (keywords.some(kw => jbtLower.includes(kw))) return jbt; } }
      return null;
  }

  function bersihkanNama(text) {
      let bersih = text; bersih = bersih.replace(/^[\d\.\)\:\s]+/, ''); bersih = bersih.replace(/[\.\:\-\s_=|~;\?]+$/, ''); return bersih.trim();
  }

  // =========================================================================
  // PATCH PERBAIKAN: NAVIGASI TAB MENU CHECK LIST
  // =========================================================================
  window.currentPageChecklist = 1; 
  window.itemsPerChecklistPage = 15;
  window.sortColChecklist = 'status'; 
  window.sortDescChecklist = false;


  window.sortChecklist = function(col) {
      if (window.sortColChecklist === col) { window.sortDescChecklist = !window.sortDescChecklist; } 
      else { window.sortColChecklist = col; window.sortDescChecklist = (col === 'progress' || col === 'personil') ? true : false; }
      window.renderTabelChecklist(true);
  };

  window.renderTabelChecklist = function(resetPage = true) {
      try {
          if (resetPage) window.currentPageChecklist = 1;
          const tbody = document.getElementById('tableChecklist'); 
          if(!tbody) return;

          const totalJabatanStandar = (DATA_MASTER.jabatan || []).filter(j => j && j.Nama_Jabatan).length;
          let listUnit = [];
          
          const listResort = [...new Set((DATA_MASTER.gereja || []).filter(g => g.Induk_Resort || g.Resort).map(g => String(g.Induk_Resort || g.Resort).trim()))];
          
          listResort.forEach(r => { 
              if (r.toLowerCase() !== 'jemaat khusus') { 
                  let infoWilayah = (DATA_MASTER.gereja || []).find(g => (g.Induk_Resort || g.Resort) === r)?.Wilayah || '-'; 
                  listUnit.push({ namaUnit: "Pengurus Harian Resort (PHR)", resort: r, wilayah: infoWilayah, isPHR: true }); 
              } 
          });
          
          (DATA_MASTER.gereja || []).forEach(g => { 
              listUnit.push({ namaUnit: g.Nama_Gereja || g['Nama Gereja'], resort: g.Induk_Resort || g.Resort || 'Jemaat Khusus', wilayah: g.Wilayah || '-', isPHR: false }); 
          });
          
          let stats = { total: listUnit.length, lengkap: 0, belum: 0 };
          let wilayahStats = Array.from({length: 13}, () => ({ total: 0, lengkap: 0 })); 

          listUnit.forEach(unit => {
              // PERBAIKAN LOGIKA PENCOCOKAN DATA
              let personilDiUnit = (DATA_MASTER.majelis || []).filter(m => {
                  let mResort = String(m.Resort || '').trim().toLowerCase();
                  let uResort = String(unit.resort || '').trim().toLowerCase();
                  
                  // Normalisasi mutlak untuk Jemaat Khusus
                  if (mResort === '' || mResort.includes('jemaat khusus')) mResort = 'jemaat khusus';
                  if (uResort === '' || uResort.includes('jemaat khusus')) uResort = 'jemaat khusus';
                  
                  let isMatchResort = mResort === uResort; 
                  
                  let mGereja = String(m.Nama_Gereja || '').trim().toLowerCase();
                  let uGereja = String(unit.namaUnit || '').trim().toLowerCase();
                  let isMatchGereja = mGereja === uGereja; 
                  
                  // Deteksi segala bentuk penulisan PHR
                  let isUnitPHR = mGereja.includes('phr') || mGereja === 'tingkat resort' || mGereja === 'pengurus harian resort';
                  
                  if (unit.isPHR) return isMatchResort && isUnitPHR; 
                  else return isMatchResort && isMatchGereja;
              });
              
              let uniqueJabatan = new Set(personilDiUnit.map(m => String(m.Jabatan || '').trim().toLowerCase())).size; 
              let targetMinimal = unit.isPHR ? 5 : (totalJabatanStandar > 0 ? 5 : 1); 
              
              unit.personilTertulis = personilDiUnit.length; 
              unit.jabatanTerisi = uniqueJabatan; 
              unit.targetJabatan = unit.isPHR ? 10 : totalJabatanStandar;
              unit.persen = Math.min(100, Math.round((unit.jabatanTerisi / unit.targetJabatan) * 100)); 
              unit.isLengkap = unit.persen >= 100 || unit.jabatanTerisi >= targetMinimal; 
              
              if (unit.isLengkap) stats.lengkap++; else stats.belum++;

              let w = parseInt(String(unit.wilayah).replace(/\D/g, ''));
              if (!isNaN(w) && w >= 1 && w <= 12) {
                  wilayahStats[w].total++;
                  if (unit.isLengkap) wilayahStats[w].lengkap++;
              }
          });
          
          window.globalListUnitChecklist = listUnit; 

          safeSetText('chkTotalUnit', stats.total.toLocaleString('id-ID')); 
          safeSetText('chkLengkap', stats.lengkap.toLocaleString('id-ID')); 
          safeSetText('chkBelum', stats.belum.toLocaleString('id-ID'));
          
          let wHtml = '';
          for(let i=1; i<=12; i++) {
              let ws = wilayahStats[i];
              let progress = ws.total > 0 ? Math.round((ws.lengkap / ws.total) * 100) : 0;
              let color = progress === 100 ? 'bg-emerald-500' : (progress > 0 ? 'bg-amber-500' : 'bg-rose-500');
              let textCol = progress === 100 ? 'text-emerald-600' : (progress > 0 ? 'text-amber-600' : 'text-rose-600');
              let bgWrap = progress === 100 ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100 bg-slate-50';
              
              wHtml += `
              <div onclick="bukaDetailWilayah(${i})" class="border ${bgWrap} p-4 rounded-2xl hover:bg-white hover:shadow-lg transition-all relative overflow-hidden group cursor-pointer hover:border-indigo-400 hover:-translate-y-1">
                  <div class="flex justify-between items-center mb-2.5">
                      <h5 class="text-[10px] font-black text-slate-600 uppercase tracking-widest"><i class="fas fa-map-marker-alt text-slate-400 mr-1"></i> W-${i}</h5>
                      <span class="text-xs font-black ${textCol}">${progress}%</span>
                  </div>
                  <div class="w-full bg-slate-200 rounded-full h-2 mb-2.5 overflow-hidden shadow-inner">
                      <div class="${color} h-2 rounded-full transition-all duration-1000" style="width: ${progress}%"></div>
                  </div>
                  <div class="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                      <span>Selesai</span>
                      <span class="text-slate-600">${ws.lengkap} / ${ws.total} Unit</span>
                  </div>
              </div>`;
          }
          if(document.getElementById('progressWilayahContainer')) document.getElementById('progressWilayahContainer').innerHTML = wHtml;

          listUnit.sort((a, b) => {
              let valA, valB;
              if (window.sortColChecklist === 'nama') { valA = String(a.namaUnit).toLowerCase(); valB = String(b.namaUnit).toLowerCase(); } 
              else if (window.sortColChecklist === 'personil') { valA = a.personilTertulis; valB = b.personilTertulis; } 
              else if (window.sortColChecklist === 'progress') { valA = a.persen; valB = b.persen; } 
              else if (window.sortColChecklist === 'status') { valA = a.isLengkap ? 1 : 0; valB = b.isLengkap ? 1 : 0; }
              else { valA = a.isLengkap ? 1 : 0; valB = b.isLengkap ? 1 : 0; }
              if (valA < valB) return window.sortDescChecklist ? 1 : -1; 
              if (valA > valB) return window.sortDescChecklist ? -1 : 1;
              if (window.sortColChecklist !== 'nama') return String(a.namaUnit).localeCompare(String(b.namaUnit)); 
              return 0;
          });
          
          setTimeout(() => { ['nama', 'personil', 'progress', 'status'].forEach(col => { let el = document.getElementById('iconSort_' + col); if(el) { el.className = 'ml-1 fas ' + (window.sortColChecklist === col ? (window.sortDescChecklist ? 'fa-sort-down text-indigo-600 text-[13px]' : 'fa-sort-up text-indigo-600 text-[13px]') : 'fa-sort text-slate-300'); } }); }, 50);
          
          let startIndex = (window.currentPageChecklist - 1) * window.itemsPerChecklistPage; 
          let paginatedData = listUnit.slice(startIndex, startIndex + window.itemsPerChecklistPage);
          if (paginatedData.length === 0) {
              tbody.innerHTML = `<tr><td colspan="5" class="p-10 text-center text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-xl">Belum ada unit yang terdaftar.</td></tr>`;
              window.renderPaginationChecklistUI(listUnit.length); return;
          }

          tbody.innerHTML = paginatedData.map((item, idx) => {
              let badge = item.isLengkap ? `<span class="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-[9px] font-black tracking-widest rounded-lg uppercase shadow-sm"><i class="fas fa-check-circle mr-1"></i> Selesai</span>` : `<span class="px-3 py-1.5 bg-rose-100 text-rose-600 text-[9px] font-black tracking-widest rounded-lg uppercase shadow-sm border border-rose-200"><i class="fas fa-times-circle mr-1"></i> Kurang</span>`;
              let colorBar = item.isLengkap ? 'bg-emerald-500' : (item.persen > 50 ? 'bg-amber-500' : 'bg-rose-500');
              return `<tr class="hover:bg-slate-50 transition-colors"><td class="p-4 text-center text-xs font-bold text-slate-400">${startIndex + idx + 1}</td><td class="p-4"><div class="font-bold text-slate-800 text-sm flex items-center gap-2"><i class="fas ${item.isPHR ? 'fa-sitemap text-amber-500' : 'fa-church text-indigo-400'}"></i> ${item.namaUnit}</div><div class="text-[10px] font-semibold text-slate-500 tracking-wider mt-1 uppercase">${item.resort} • W-${item.wilayah}</div></td><td class="p-4 text-center"><div class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-black text-xs shadow-inner">${item.personilTertulis}</div><div class="text-[9px] font-bold text-slate-400 uppercase mt-1">Orang</div></td><td class="p-4 align-middle"><div class="flex items-center gap-3"><div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner"><div class="${colorBar} h-full rounded-full transition-all duration-1000" style="width: ${item.persen}%"></div></div><span class="text-[10px] font-black text-slate-600 w-8 text-right">${item.persen}%</span></div><div class="text-[9px] font-bold text-slate-400 mt-1.5 text-center tracking-widest">${item.jabatanTerisi} JABATAN TERISI DARI TOTAL TARGET</div></td><td class="p-4 text-center">${badge}</td></tr>`;
          }).join('');
          
          window.renderPaginationChecklistUI(listUnit.length);
      } catch (error) {}
  };
  
  window.renderPaginationChecklistUI = function(totalItems) {
      const totalPages = Math.ceil(totalItems / window.itemsPerChecklistPage); 
      const container = document.getElementById('paginationChecklist'); 
      if(!container) return;
      if (totalPages <= 1) { container.innerHTML = ''; return; }
      
      let html = `<span class="text-xs text-slate-400 font-bold tracking-widest uppercase mr-4">Hal. ${window.currentPageChecklist} / ${totalPages} <span class="ml-2 px-2 py-1 bg-slate-100 rounded-md border border-slate-200">${totalItems} Unit</span></span><div class="flex items-center gap-1">`;
      if (window.currentPageChecklist > 1) html += `<button onclick="ubahHalamanChecklist(${window.currentPageChecklist - 1})" class="page-btn inactive"><i class="fas fa-chevron-left"></i></button>`;
      for (let i = Math.max(1, window.currentPageChecklist - 2); i <= Math.min(totalPages, window.currentPageChecklist + 2); i++) html += `<button onclick="ubahHalamanChecklist(${i})" class="page-btn ${i===window.currentPageChecklist?'active':'inactive'}">${i}</button>`;
      if (window.currentPageChecklist < totalPages) html += `<button onclick="ubahHalamanChecklist(${window.currentPageChecklist + 1})" class="page-btn inactive"><i class="fas fa-chevron-right"></i></button>`;
      container.innerHTML = html + `</div>`;
  };

  window.ubahHalamanChecklist = function(page) { 
      window.currentPageChecklist = page; 
      window.renderTabelChecklist(false); 
  };

  // =========================================================================
  // MESIN CETAK PDF DASHBOARD PUSAT
  // =========================================================================
  window.openPdfPreview = function() {
      const modal = document.getElementById('modalPdfPreview');
      if (modal) {
          if(chartWilayahInstance) document.getElementById('prevChartW').src = chartWilayahInstance.toBase64Image();
          if(chartJabatanInstance) document.getElementById('prevChartJ').src = chartJabatanInstance.toBase64Image();
          
          const statsJ = {}; DATA_MASTER.jabatan.forEach(j => { if(j.Nama_Jabatan) statsJ[j.Nama_Jabatan] = 0; });
          DATA_MASTER.majelis.forEach(m => { if(m.Jabatan && statsJ[m.Jabatan] !== undefined) statsJ[m.Jabatan]++; });
          let htmlJ = ''; for(let k in statsJ) { htmlJ += `<tr><td class="border border-slate-200 p-2">${k}</td><td class="border border-slate-200 p-2 text-center">${statsJ[k]}</td></tr>`; }
          safeSetHTML('prevJobTableBody', htmlJ);

          let wilStats = {}; for(let i=1; i<=12; i++) wilStats[i] = { g:0, rt:0, jw:0 };
          DATA_MASTER.gereja.forEach(g => { let w = parseInt(g.Wilayah); if(w >= 1 && w <= 12) { wilStats[w].g++; wilStats[w].rt += parseInt(g.Total_RT)||0; wilStats[w].jw += parseInt(g.Total_Jiwa)||0; } });
          let htmlW = ''; for(let i=1; i<=12; i++) { htmlW += `<tr><td class="border border-slate-200 p-2 font-bold text-slate-700">Wilayah ${i}</td><td class="border border-slate-200 p-2 text-center">${wilStats[i].g}</td><td class="border border-slate-200 p-2 text-center">${wilStats[i].rt.toLocaleString('id-ID')}</td><td class="border border-slate-200 p-2 text-center">${wilStats[i].jw.toLocaleString('id-ID')}</td></tr>`; }
          safeSetHTML('prevWilayahTableBody', htmlW);

          modal.classList.remove('hidden'); modal.style.zIndex = "9999";
      }
  };
  
  window.executePdfDownload = function() {
       const isDark = document.documentElement.classList.contains('dark'); if (isDark) document.documentElement.classList.remove('dark');
       Swal.fire({ title: 'Menyusun Laporan PDF...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
       html2pdf().set({ margin: 0.4, filename: 'Laporan_Statistik_Dashboard_Pusat.pdf', image: { type: 'jpeg', quality: 1 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } }).from(document.getElementById('pdfDocumentArea')).save().then(() => { 
           if (isDark) document.documentElement.classList.add('dark'); 
           closePdfPreview(); Swal.fire('Berhasil!', 'Laporan PDF Dashboard berhasil diunduh!', 'success'); 
       });
  };

  window.bukaDetailWilayah = function(wilayahId) {
      // Cek apakah data global sudah siap
      if(!window.globalListUnitChecklist) {
          Swal.fire('Memproses', 'Data checklist sedang disiapkan, silakan coba beberapa detik lagi.', 'info');
          return;
      }
      
      // Filter: Hanya cari gereja di wilayah yg diklik DAN personilnya DI BAWAH 5 orang
      const units = window.globalListUnitChecklist.filter(u => parseInt(String(u.wilayah).replace(/\D/g, '')) === wilayahId && u.personilTertulis < 5);
      
      safeSetHTML('titleDetailWilayah', `<i class="fas fa-exclamation-circle text-rose-500 mr-3 text-2xl"></i> Unit Belum Lengkap (W-${wilayahId})`);
      const container = document.getElementById('listDetailWilayah');
      
      if(units.length === 0) {
          container.innerHTML = `
          <div class="p-8 text-center border-2 border-dashed border-emerald-200 rounded-2xl bg-emerald-50">
              <i class="fas fa-check-circle text-emerald-500 text-5xl mb-4"></i>
              <h4 class="text-sm font-bold text-emerald-700 uppercase tracking-widest">Luar Biasa!</h4>
              <p class="text-xs font-semibold text-emerald-600 mt-2">Seluruh unit gereja di Wilayah ${wilayahId} sudah memiliki minimal 5 personil majelis.</p>
          </div>`;
      } else {
          // Urutkan dari yang paling parah (0 personil) ke atas
          units.sort((a,b) => a.personilTertulis - b.personilTertulis);
          
          container.innerHTML = units.map(u => {
              let badge = u.personilTertulis === 0 
                  ? `<span class="bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-rose-200 shadow-sm">Kosong (0)</span>` 
                  : `<span class="bg-amber-100 text-amber-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-200 shadow-sm">Hanya ${u.personilTertulis} Org</span>`;
                  
              return `
              <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center hover:border-indigo-300 hover:shadow-md transition-all">
                  <div class="flex items-center gap-4">
                      <div class="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center shadow-inner text-lg">
                          <i class="fas ${u.isPHR ? 'fa-sitemap' : 'fa-church'}"></i>
                      </div>
                      <div>
                          <h4 class="text-sm font-bold text-slate-800">${u.namaUnit}</h4>
                          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">${u.resort}</p>
                      </div>
                  </div>
                  <div>${badge}</div>
              </div>`;
          }).join('');
      }
      
      // Panggil dan tampilkan modalnya
      const modal = document.getElementById('modalDetailWilayah');
      if (modal) {
          modal.classList.remove('hidden');
      } else {
          Swal.fire('Error', 'Kode HTML Modal tidak ditemukan!', 'error');
      }
  };

 window.toggleChatBox = function() {
      const box = document.getElementById('chatBox');
      const trigger = document.getElementById('chatTriggerBtn');
      const icon = trigger.querySelector('i');
      
      if (box.classList.contains('scale-0')) {
          // BUKA CHAT: Tampilkan kotak dan aktifkan klik
          box.classList.remove('scale-0', 'opacity-0', 'pointer-events-none');
          box.classList.add('scale-100', 'opacity-100', 'pointer-events-auto');
          
          icon.className = "fas fa-chevron-down relative z-10 text-2xl drop-shadow-md transition-transform duration-300";
          setTimeout(() => document.getElementById('chatInput').focus(), 300);
      } else {
          // TUTUP CHAT: Sembunyikan kotak dan MATIKAN klik agar tidak menghalangi tombol login
          box.classList.remove('scale-100', 'opacity-100', 'pointer-events-auto');
          box.classList.add('scale-0', 'opacity-0', 'pointer-events-none');
          
          icon.className = "fas fa-comments relative z-10 text-2xl md:text-3xl drop-shadow-md transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110";
      }
  };

  window.kirimPesanChat = function() {
      const input = document.getElementById('chatInput');
      const pesan = input.value.trim();
      if (!pesan) return;

      const area = document.getElementById('chatMessages');

      // 1. Munculkan pesan User
      area.innerHTML += `
          <div class="flex gap-2 items-end w-[85%] self-end justify-end relative z-10 animate-fade">
              <div class="bg-gradient-to-bl from-emerald-500 to-teal-500 text-white p-3.5 rounded-2xl rounded-br-sm shadow-sm text-[13px] font-medium leading-relaxed">${pesan}</div>
          </div>`;
      
      input.value = '';
      input.disabled = true; // Kunci input sementara AI "mengetik"
      input.placeholder = "AI sedang mengetik...";
      area.scrollTop = area.scrollHeight; // Auto-scroll ke bawah

      // 2. Tampilkan indikator mengetik (Typing indicator)
      const idTyping = 'typing_' + Date.now();
      area.innerHTML += `
          <div id="${idTyping}" class="flex gap-2.5 items-end w-[85%] relative z-10 animate-fade">
              <div class="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm border border-emerald-200"><i class="fas fa-robot text-[10px]"></i></div>
              <div class="bg-white px-4 py-3.5 rounded-2xl rounded-bl-sm shadow-sm border border-slate-200 flex gap-1 items-center h-[42px]">
                  <div class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                  <div class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                  <div class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
              </div>
          </div>`;
      area.scrollTop = area.scrollHeight;

      // 3. Simulasi Jeda AI Membalas (1.5 detik)
      setTimeout(() => {
          // Hapus indikator mengetik
          const typingEl = document.getElementById(idTyping);
          if (typingEl) typingEl.remove();

          const jamSekarang = new Date().getHours();
          // Jam operasional: 08:00 - 17:00
          const isJamKerja = (jamSekarang >= 8 && jamSekarang < 17);
          
          let balasan = "";
          if (!isJamKerja) {
              balasan = "Mohon maaf, saat ini Admin Infokom sedang <b>tidak tersedia / di luar jam operasional (08:00 - 17:00)</b>. 😴<br><br>Pesan Anda telah kami rekam dengan aman. Admin kami akan membalas segera setelah kembali bertugas.";
          } else {
              balasan = "Terima kasih atas pesan Anda! ✨<br><br>Kami telah meneruskan pertanyaan ini ke layar Admin. Mohon tunggu sebentar, Admin akan membalas langsung di ruang obrolan ini. ⏳";
          }

          // Munculkan balasan AI
          area.innerHTML += `
              <div class="flex gap-2.5 items-end w-[85%] relative z-10 animate-fade">
                  <div class="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm border border-emerald-200"><i class="fas fa-robot text-[10px]"></i></div>
                  <div class="bg-white p-3.5 rounded-2xl rounded-bl-sm shadow-sm border border-slate-200 text-[13px] leading-relaxed text-slate-700">${balasan}</div>
              </div>`;
          
          // Buka kembali input
          input.disabled = false;
          input.placeholder = "Ketik pesan di sini...";
          setTimeout(() => input.focus(), 100);
          area.scrollTop = area.scrollHeight;

          // NANTINYA: Di sinilah Bapak menyisipkan fungsi kirim ke Fonnte
          // apiCall('kirimPesanCS', { pesan: pesan });

      }, 1500);
  };

  window.toggleSidebar = function() {
      const sidebar = document.getElementById('sidebar'); 
      const overlay = document.getElementById('sidebarOverlay'); 
      const isMobile = window.innerWidth < 768;
      
      if (isMobile) {
          if (sidebar.classList.contains('-translate-x-full')) { 
              sidebar.classList.remove('-translate-x-full'); 
              overlay.classList.remove('hidden'); 
              setTimeout(() => overlay.classList.remove('opacity-0'), 10); 
          } else { 
              sidebar.classList.add('-translate-x-full'); 
              overlay.classList.add('opacity-0'); 
              setTimeout(() => overlay.classList.add('hidden'), 300); 
          }
      } else { 
          sidebar.classList.toggle('md:-ml-[280px]'); 
      }
  };

window.switchTab = function(tab) {
      // 1. Sembunyikan semua halaman & matikan warna tombol (TERMASUK BRANKAS)
      ['pageHome', 'pageSearch', 'pageJemaat', 'pageAdmin', 'pageLog', 'pageChecklist', 'pageArsip', 'pageBrankas'].forEach(p => { if(document.getElementById(p)) document.getElementById(p).classList.add('hidden'); }); 
      ['btnHome', 'btnSearch', 'btnJemaat', 'btnAdmin', 'btnLog', 'btnChecklist', 'btnArsip', 'btnBrankas'].forEach(b => { if(document.getElementById(b)) document.getElementById(b).classList.remove('nav-active'); });
      
      // 2. Tampilkan halaman yang diklik
      if(document.getElementById('page' + tab.charAt(0).toUpperCase() + tab.slice(1))) document.getElementById('page' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.remove('hidden'); 
      if(document.getElementById('btn' + tab.charAt(0).toUpperCase() + tab.slice(1))) document.getElementById('btn' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('nav-active');
      
      // 3. Atur Judul Header Atas
      let title = 'Dashboard Pusat'; 
      if(tab === 'search') title = 'Data Internal'; 
      if(tab === 'jemaat') title = 'Data Jemaat'; 
      if(tab === 'admin') title = 'Akses Admin';
      if(tab === 'log') title = 'Log Aktivitas';
      if(tab === 'checklist') { title = 'Check List Input'; if(typeof window.renderTabelChecklist === 'function') window.renderTabelChecklist(true); } 
      if(tab === 'arsip') { title = 'E-Arsip Dokumen'; if(typeof renderRakArsip === 'function') renderRakArsip(); }

  
      // KHUSUS BRANKAS ASET: Judul dikosongkan/disamarkan demi privasi
      if(tab === 'brankas') {
          title = 'Vault System (Terenkripsi)';
          renderDataBrankas(); // Panggil fungsi render isi brankas
      }
      
      safeSetText('pageTitle', title); 
      if(tab === 'admin') loadListPetugas(); 
      if(tab === 'home' && leafletMap) setTimeout(() => { leafletMap.invalidateSize(); }, 300);

      // Scroll ke atas
      const scrollArea = document.getElementById('scrollableArea');
      if (scrollArea) scrollArea.scrollTo({ top: 0, behavior: 'smooth' });

      // Auto-Hide Sidebar Mobile
      if (window.innerWidth < 768) {
          const sidebar = document.getElementById('sidebar');
          const overlay = document.getElementById('sidebarOverlay');
          sidebar.classList.add('-translate-x-full');
          overlay.classList.add('opacity-0');
          setTimeout(() => overlay.classList.add('hidden'), 300);
      }
  };

// =========================================================================
  // MESIN E-ARSIP (SISTEM RAK & FOLDER DENGAN FILTER & PAGINASI)
  // =========================================================================
  
  // 1. FUNGSI DINAMIS PENARIK DATA MEMORI (Solusi Anti-Hilang di Incognito)
  function getArsipData() {
      try {
          let saved = localStorage.getItem('gkpi_arsip_db');
          if(saved) return JSON.parse(saved);
      } catch(e) {}
      return [];
  }

  let globalRakResort = []; 
  let currentPageArsip = 1;
  const itemsPerArsipPage = 15; 
  let fileArsipTerpilih = null;

  function renderRakArsip() {
      if(document.getElementById('filterWilayahArsip') && document.getElementById('filterWilayahArsip').options.length <= 1) {
          let htmlW = '<option value="">Semua Wilayah</option>'; 
          for(let i=1; i<=12; i++) { htmlW += `<option value="${i}">Wilayah ${i}</option>`; }
          document.getElementById('filterWilayahArsip').innerHTML = htmlW;
      }

      const mapResort = {};
      DATA_MASTER.gereja.forEach(g => {
          let res = String(g.Induk_Resort || g.Resort || g.Nama_Gereja || '').trim();
          if(res && !mapResort[res]) { mapResort[res] = { nama: res, wilayah: parseInt(String(g.Wilayah).replace(/\D/g, '')) || 0 }; }
      });
      globalRakResort = Object.values(mapResort).sort((a, b) => a.nama.localeCompare(b.nama));
      
      const optHtml = `<option value="">-- Pilih Lemari Resort Tujuan --</option>` + 
                      globalRakResort.map(r => `<option value="${r.nama}">${r.nama}</option>`).join('');
      if(document.getElementById('arsipResortTarget')) document.getElementById('arsipResortTarget').innerHTML = optHtml;

      filterRakArsip(true); 
  }

  function filterRakArsip(resetPage = true) {
      if (resetPage === true || resetPage instanceof Event) currentPageArsip = 1;
      const kataKunci = document.getElementById('cariRakArsip') ? document.getElementById('cariRakArsip').value.toLowerCase() : '';
      const filterWil = document.getElementById('filterWilayahArsip') ? document.getElementById('filterWilayahArsip').value : '';

      let rakFiltered = globalRakResort.filter(r => {
          return (!filterWil || String(r.wilayah) === String(filterWil)) && (!kataKunci || r.nama.toLowerCase().includes(kataKunci));
      });

      const totalItems = rakFiltered.length;
      const totalPages = Math.ceil(totalItems / itemsPerArsipPage) || 1;
      if(currentPageArsip > totalPages) currentPageArsip = totalPages;

      const startIndex = (currentPageArsip - 1) * itemsPerArsipPage;
      const paginatedRak = rakFiltered.slice(startIndex, startIndex + itemsPerArsipPage);

      const container = document.getElementById('rakArsipContainer');
      if(!container) return;

      if (paginatedRak.length === 0) {
          container.innerHTML = `<div class="col-span-full py-16 text-center text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50"><i class="fas fa-folder-open text-4xl mb-3 text-slate-300"></i><br>Lemari Resort Tidak Ditemukan.</div>`;
          document.getElementById('paginationArsip').innerHTML = '';
          return;
      }

      // TARIK DATA TERBARU DARI MEMORI
      let currentArsip = getArsipData(); 

      container.innerHTML = paginatedRak.map(resortObj => {
          let resort = resortObj.nama;
          let w = resortObj.wilayah;
          let jmlDokumen = currentArsip.filter(a => a.resort === resort).length;
          let badge = jmlDokumen > 0 
                      ? `<span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black">${jmlDokumen} File</span>` 
                      : `<span class="bg-slate-100 text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold">Kosong</span>`;

          return `
          <div onclick="bukaFolderResort('${resort.replace(/'/g, "\\'")}')" class="bg-white border border-slate-200 rounded-2xl p-5 hover:border-amber-400 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden flex flex-col h-full text-center">
              <div class="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-amber-100 to-transparent rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-125 transition-transform"></div>
              <div class="absolute top-3 left-3 text-[9px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md border border-slate-100">W-${w}</div>
              <div class="w-16 h-16 mx-auto bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:bg-amber-500 group-hover:text-white transition-colors shadow-sm mt-3"><i class="fas fa-folder"></i></div>
              <h4 class="text-xs font-bold text-slate-800 leading-tight mb-2 flex-1">${resort}</h4>
              <div class="mt-auto pt-3 border-t border-slate-100">${badge}</div>
          </div>`;
      }).join('');
      renderPaginationArsipUI(totalItems);
  }

  function renderPaginationArsipUI(totalItems) {
      const totalPages = Math.ceil(totalItems / itemsPerArsipPage); 
      const container = document.getElementById('paginationArsip'); 
      if(!container) return;
      if (totalPages <= 1) { container.innerHTML = ''; return; }
      let html = `<span class="text-xs text-slate-400 font-bold tracking-widest uppercase mr-4 hidden md:inline">Hal. ${currentPageArsip} / ${totalPages} <span class="ml-2 px-2 py-1 bg-slate-50 rounded-md border border-slate-200 shadow-inner">${totalItems} Lemari</span></span><div class="flex items-center gap-1">`;
      if (currentPageArsip > 1) html += `<button onclick="ubahHalamanArsip(${currentPageArsip - 1})" class="page-btn inactive"><i class="fas fa-chevron-left"></i></button>`;
      for (let i = Math.max(1, currentPageArsip - 2); i <= Math.min(totalPages, currentPageArsip + 2); i++) html += `<button onclick="ubahHalamanArsip(${i})" class="page-btn ${i===currentPageArsip?'active':'inactive'}">${i}</button>`;
      if (currentPageArsip < totalPages) html += `<button onclick="ubahHalamanArsip(${currentPageArsip + 1})" class="page-btn inactive"><i class="fas fa-chevron-right"></i></button>`;
      container.innerHTML = html + `</div>`;
  }
  function ubahHalamanArsip(page) { currentPageArsip = page; filterRakArsip(false); const containerRak = document.getElementById('rakArsipContainer').parentElement; if(containerRak) containerRak.scrollTo({ top: 0, behavior: 'smooth' }); }

  // --- FUNGSI BUKA FOLDER DENGAN TAB FILTER AKTIF ---
  function bukaFolderResort(resortName, filterKategori = 'Semua') {
      let currentArsip = getArsipData(); // SELALU TARIK DATA DARI MEMORI
      document.getElementById('judulFolderResort').innerHTML = `<i class="fas fa-folder-open mr-3 opacity-90 text-amber-100"></i> ${resortName}`;
      
      let fileResortIni = currentArsip.filter(a => a.resort === resortName);
      
      // Proses Navigasi Tab
      if(filterKategori !== 'Semua') {
          fileResortIni = fileResortIni.filter(a => a.kategori.includes(filterKategori));
      }
      const tabContainer = document.querySelector('#modalFolderArsip .overflow-x-auto');
      if(tabContainer) {
          tabContainer.innerHTML = `
              <button onclick="bukaFolderResort('${resortName.replace(/'/g, "\\'")}', 'Semua')" class="px-5 py-2.5 ${filterKategori==='Semua' ? 'bg-white text-amber-600 border-amber-500' : 'bg-slate-50 text-slate-500 border-slate-200'} border-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap shadow-sm"><i class="fas fa-layer-group mr-2"></i>Semua</button>
              <button onclick="bukaFolderResort('${resortName.replace(/'/g, "\\'")}', 'SK')" class="px-5 py-2.5 ${filterKategori==='SK' ? 'bg-white text-blue-600 border-blue-500' : 'bg-slate-50 text-slate-500 border-slate-200'} border-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap shadow-sm"><i class="fas fa-file-signature mr-2 text-blue-400"></i>SK & Legal</button>
              <button onclick="bukaFolderResort('${resortName.replace(/'/g, "\\'")}', 'Tanah')" class="px-5 py-2.5 ${filterKategori==='Tanah' ? 'bg-white text-emerald-600 border-emerald-500' : 'bg-slate-50 text-slate-500 border-slate-200'} border-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap shadow-sm"><i class="fas fa-map mr-2 text-emerald-400"></i>Surat Tanah</button>
              <button onclick="bukaFolderResort('${resortName.replace(/'/g, "\\'")}', 'Bangunan')" class="px-5 py-2.5 ${filterKategori==='Bangunan' ? 'bg-white text-indigo-600 border-indigo-500' : 'bg-slate-50 text-slate-500 border-slate-200'} border-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap shadow-sm"><i class="fas fa-building mr-2 text-indigo-400"></i>IMB/Izin</button>
          `;
      }

      const container = document.getElementById('isiDokumenContainer');
      if (fileResortIni.length === 0) {
          container.innerHTML = `<div class="col-span-full py-16 text-center text-slate-400 font-bold border-2 border-dashed border-slate-300 rounded-2xl bg-white"><i class="fas fa-box-open text-5xl mb-4 text-slate-300"></i><br>Belum ada dokumen untuk kategori ini.<br><button onclick="closeModal('modalFolderArsip'); setTimeout(()=>bukaModalUploadArsip('${resortName.replace(/'/g, "\\'")}'), 300)" class="mt-4 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors">Unggah Dokumen Baru</button></div>`;
      } else {
          container.innerHTML = fileResortIni.map(file => {
              const iconCat = file.kategori.includes('SK') ? 'fa-file-signature text-blue-500' : (file.kategori.includes('Tanah') ? 'fa-map text-emerald-500' : 'fa-building text-indigo-500');
              
              // PERBAIKAN: Mengganti kelas ukuran gambar (object-contain w-14 h-14) agar layout terkunci & aman dari tanda kutip
              return `
              <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all group relative cursor-pointer" onclick="bukaPreviewArsip('${file.url}', '${file.judul.replace(/'/g, "\\'")}', '${file.kategori}', '${file.tgl}')">
                  <div class="h-28 bg-slate-100 relative overflow-hidden flex items-center justify-center p-4">
                      <img src="${file.url}" onerror="this.onerror=null; this.src='https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg'" class="object-contain w-14 h-14 opacity-90 group-hover:scale-110 transition-transform duration-500">
                      <div class="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors flex items-center justify-center">
                          <div class="w-10 h-10 bg-white/90 backdrop-blur rounded-full text-slate-800 flex items-center justify-center scale-0 group-hover:scale-100 transition-transform shadow-md"><i class="fas fa-search-plus"></i></div>
                      </div>
                  </div>
                  <div class="p-3 bg-white">
                      <div class="flex items-start gap-2 mb-1.5">
                          <i class="fas ${iconCat} text-[10px] mt-0.5"></i>
                          <h4 class="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2">${file.judul}</h4>
                      </div>
                      <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">${file.tgl}</p>
                  </div>
              </div>`;
          }).join('');
      }
      document.getElementById('modalFolderArsip').classList.remove('hidden');
  }

  // --- FUNGSI BUKA MODAL UPLOAD PINTAR ---
  function bukaModalUploadArsip(mode = '') {
      document.getElementById('arsipJudulBaru').value = '';
      document.getElementById('modeUploadArsip').value = mode;
      fileArsipTerpilih = null;
      const boxUpload = document.getElementById('fileUploadArsipBaru');
      if (boxUpload) { boxUpload.parentElement.innerHTML = `<div class="w-16 h-16 bg-slate-50 rounded-full shadow-inner flex items-center justify-center text-slate-400 group-hover:text-amber-500 mx-auto mb-3 transition-colors"><i class="fas fa-file-upload text-3xl"></i></div><p class="text-sm font-bold text-slate-600" id="labelUploadArsip">Klik atau Tarik dokumen ke sini</p><p class="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Maksimal 5MB (JPG, PNG, PDF)</p><input type="file" id="fileUploadArsipBaru" class="hidden" accept=".jpg,.jpeg,.png,.pdf" onchange="previewUploadArsip(event)">`; }

      if (mode === 'BRANKAS') {
          document.getElementById('modalTitleArsip').innerHTML = '<i class="fas fa-vault text-amber-500 mr-2"></i> Tambah Master Aset';
          document.getElementById('modalSubtitleArsip').innerText = 'Unggah dokumen aset milik pusat (Tanpa penempatan unit)';
          document.getElementById('areaLokasiArsip').classList.add('hidden');
          document.getElementById('areaKeteranganAset').classList.remove('hidden');
          document.getElementById('arsipKeteranganAset').value = '';
          document.getElementById('arsipWilayah').required = false; document.getElementById('arsipResort').required = false;
      } else {
          document.getElementById('modalTitleArsip').innerHTML = '<i class="fas fa-cloud-upload-alt text-amber-500 mr-2"></i> Unggah Dokumen Baru';
          document.getElementById('modalSubtitleArsip').innerText = 'Pilih penempatan wilayah, resort & kategori';
          document.getElementById('areaLokasiArsip').classList.remove('hidden');
          document.getElementById('areaKeteranganAset').classList.add('hidden');
          document.getElementById('arsipWilayah').required = true; document.getElementById('arsipResort').required = true;

          let htmlW = '<option value="">Pilih Wilayah</option>'; for(let i=1; i<=12; i++) { htmlW += `<option value="${i}">WILAYAH ${i}</option>`; }
          document.getElementById('arsipWilayah').innerHTML = htmlW;
          let preselectResort = (mode !== 'BRANKAS') ? mode : '';
          if(preselectResort) {
              let foundGereja = DATA_MASTER.gereja.find(g => (g.Induk_Resort || g.Resort) === preselectResort || g.Nama_Gereja === preselectResort);
              if(foundGereja && foundGereja.Wilayah) document.getElementById('arsipWilayah').value = parseInt(String(foundGereja.Wilayah).replace(/\D/g, ''));
          }
          syncArsipResort(preselectResort);
      }
      document.getElementById('modalUploadArsip').classList.remove('hidden');
  }

  function syncArsipResort(preselectResort = '') {
      const w = document.getElementById('arsipWilayah').value || ''; const cleanW = String(w).trim().toLowerCase();
      const fr = document.getElementById('arsipResort'); if(!fr) return; 
      fr.innerHTML = '<option value="">Pilih Resort / JK</option>'; 
      const resorts = [...new Set(DATA_MASTER.gereja.filter(g => (!w || String(g.Wilayah).trim().toLowerCase() === cleanW) && String(g.Tipe_Gereja || g.Status_Gereja || '').toUpperCase() !== "JEMAAT KHUSUS" && (g.Induk_Resort || g.Resort)).map(g => String(g.Induk_Resort || g.Resort).trim()))].sort(); 
      const khusus = DATA_MASTER.gereja.filter(g => (!w || String(g.Wilayah).trim().toLowerCase() === cleanW) && String(g.Tipe_Gereja || g.Status_Gereja || '').toUpperCase() === "JEMAAT KHUSUS").map(g => String(g.Nama_Gereja).trim()).sort(); 
      resorts.forEach(r => { const opt = document.createElement('option'); opt.value = r; opt.text = r; opt.setAttribute('data-tipe', 'RESORT'); fr.appendChild(opt); }); 
      khusus.forEach(k => { const opt = document.createElement('option'); opt.value = k; opt.text = "JK - " + k; opt.setAttribute('data-tipe', 'JK'); fr.appendChild(opt); }); 
      if(preselectResort) fr.value = preselectResort;
      syncArsipGereja();
  }

  function syncArsipGereja() {
      const resSelect = document.getElementById('arsipResort'); const fg = document.getElementById('arsipGerejaTarget'); const wadah = document.getElementById('wadahArsipGereja');
      if(!fg || !resSelect) return; const val = resSelect.value; const tipe = resSelect.options[resSelect.selectedIndex]?.getAttribute('data-tipe'); 
      fg.innerHTML = '<option value="">Pilih Unit Gereja</option>'; 
      if (tipe === "RESORT" || (!tipe && val)) { 
          wadah.style.display = 'block'; fg.innerHTML += `<option value="Pengurus Harian Resort (PHR)" class="font-bold text-amber-700 bg-amber-50">🏢 DOKUMEN TINGKAT RESORT (PHR)</option>`;
          DATA_MASTER.gereja.filter(g => String(g.Induk_Resort || g.Resort || '').trim() === val).forEach(g => { const opt = document.createElement('option'); opt.value = g.Nama_Gereja; opt.text = g.Nama_Gereja; fg.appendChild(opt); }); 
          fg.required = true;
      } else if (tipe === "JK") { 
          wadah.style.display = 'none'; fg.innerHTML = `<option value="${val}">${val}</option>`; fg.value = val; fg.required = false;
      } else { wadah.style.display = 'block'; } 
  }

  function previewUploadArsip(event) {
      const file = event.target.files[0]; if (!file) return; fileArsipTerpilih = file;
      const box = event.target.parentElement;
      box.innerHTML = `<div class="w-16 h-16 bg-emerald-100 rounded-full shadow-inner flex items-center justify-center text-emerald-500 mx-auto mb-3 transition-colors"><i class="fas fa-check text-3xl"></i></div><p class="text-sm font-bold text-slate-800 truncate px-4 w-full" id="labelUploadArsip">${file.name}</p><p class="text-[10px] font-bold text-emerald-600 mt-1 uppercase tracking-widest">Dokumen Siap Diunggah</p><input type="file" id="fileUploadArsipBaru" class="hidden" accept=".jpg,.jpeg,.png,.pdf" onchange="previewUploadArsip(event)">`;
  }

// --- FUNGSI SIMPAN PINTAR ---
  function simpanDokumenArsip(e) {
      e.preventDefault();
      if (!fileArsipTerpilih) return Swal.fire('Perhatian', 'Pilih file dokumen terlebih dahulu.', 'warning');
      
      const mode = document.getElementById('modeUploadArsip').value;
      const judul = document.getElementById('arsipJudulBaru').value;
      const kategori = document.getElementById('arsipKategoriBaru').value;
      let resort = "", gerejaTarget = "", keterangan = "";

      if (mode === 'BRANKAS') { resort = "ASET_PUSAT"; gerejaTarget = "SINODE"; keterangan = document.getElementById('arsipKeteranganAset').value; } 
      else { resort = document.getElementById('arsipResort').value.trim(); gerejaTarget = document.getElementById('arsipGerejaTarget').value.trim() || resort; }
      
      const btn = document.getElementById('btnSimpanArsip');
      btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> MENGUNGGAH KE DRIVE...';
      
      const reader = new FileReader();
      reader.onload = function(event) {
          const base64Data = event.target.result.split(',')[1];
          const fileName = judul.replace(/[^a-zA-Z0-9]/g, '_') + "_" + fileArsipTerpilih.name;

          // PAYLOAD SUDAH LENGKAP: Mengirim judul dan keterangan ke Google Sheet
          const payload = { 
              fileName: fileName, mimeType: fileArsipTerpilih.type, fileData: base64Data, 
              judul: judul, kategori: kategori, unit: resort, unit_gereja: gerejaTarget, keterangan: keterangan
          };

          apiCall('uploadArsip', payload).then(res => {
              if (res.status === 'success') {
                  DATA_ARSIP.push({ id: res.id, url: res.url, judul: judul, kategori: kategori, resort: resort, unit_gereja: gerejaTarget, keterangan: keterangan, tgl: new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}) });
                  localStorage.setItem('gkpi_arsip_db', JSON.stringify(DATA_ARSIP));
                  
                  closeModal('modalUploadArsip');
                  if (mode === 'BRANKAS') { Swal.fire('Berhasil!', 'Aset berhasil diarsipkan ke Brankas Pusat.', 'success'); renderDataBrankas(); } 
                  else { Swal.fire('Berhasil!', 'Dokumen berhasil tersimpan di Lemari Resort.', 'success'); renderRakArsip(); if(!document.getElementById('modalFolderArsip').classList.contains('hidden')) bukaFolderResort(resort); }
              } else { Swal.fire('Gagal Unggah', res.message, 'error'); }
          }).catch(err => Swal.fire('Koneksi Error', String(err), 'error')).finally(() => { btn.disabled = false; btn.innerHTML = '<i class="fas fa-cloud-upload-alt text-sm"></i> Mulai Unggah ke Drive'; });
      };
      reader.readAsDataURL(fileArsipTerpilih);
  }

 // =========================================================================
  // FITUR KEAMANAN: VIRTUAL DATA ROOM (BRANKAS INTERNAL)
  // =========================================================================
  window.bukaBrankasAset = function() {
      Swal.fire({
          title: '<i class="fas fa-shield-alt text-slate-800 text-5xl mb-3 drop-shadow-md"></i><br><span class="font-black text-2xl tracking-tight text-slate-800">Otorisasi Brankas</span>',
          html: '<p class="text-xs text-slate-500 font-medium mb-2">Akses ke Ruang Aset dilindungi. Masukkan Sandi Inti:</p>',
          input: 'password',
          inputPlaceholder: 'Ketik sandi...',
          inputAttributes: { autocapitalize: 'off', autocorrect: 'off', autocomplete: 'new-password' },
          showCancelButton: true,
          confirmButtonText: '<i class="fas fa-key mr-2"></i> Buka',
          cancelButtonText: 'Batal',
          confirmButtonColor: '#1e293b',
          customClass: { input: 'text-center font-mono font-bold tracking-widest text-sm border-2 focus:border-slate-800 rounded-xl' }
      }).then((result) => {
          if (result.isConfirmed) {
              
              // ===========================================
              // SANDI BRANKAS BAPAK
              // ===========================================
              const sandiKuat = "gkpiaset123"; 
              
              if (result.value === sandiKuat) {
                  Swal.fire({
                      icon: 'success', title: 'Akses Diberikan!', text: 'Membuka Brankas Terenkripsi...',
                      timer: 1500, showConfirmButton: false, backdrop: `rgba(15, 23, 42, 0.95)`
                  });
                  setTimeout(() => {
                      switchTab('brankas');
                  }, 1200);
              } else {
                  Swal.fire({ icon: 'error', title: 'Akses Ditolak', text: 'Sandi keamanan tidak valid.' });
              }
          }
      });
  };

  // --- RENDER ISI BRANKAS ---
  function renderDataBrankas() {
      const wadah = document.getElementById('gridBrankasAset'); if (!wadah) return;
      let currentArsip = getArsipData(); 
      const asetPusat = currentArsip.filter(a => a.resort === 'ASET_PUSAT');
      
      if (asetPusat.length === 0) {
          wadah.innerHTML = `<div class="col-span-full py-20 text-center flex flex-col items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200"><div class="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center text-4xl mb-4 shadow-inner"><i class="fas fa-box-open"></i></div><h3 class="text-sm font-black text-slate-700 uppercase tracking-widest mb-1">Brankas Masih Kosong</h3><p class="text-xs text-slate-500 font-medium max-w-sm">Klik tombol "Tambah Aset" di atas untuk mulai mendigitalkan Sertifikat Tanah, IMB, BPKB, dan Aset Sinode.</p></div>`;
      } else {
          wadah.innerHTML = asetPusat.map(file => {
              const iconCat = file.kategori.includes('Tanah') ? 'fa-map text-emerald-400' : (file.kategori.includes('BPKB') || file.kategori.includes('Kendaraan') ? 'fa-car text-blue-400' : (file.kategori.includes('Keuangan') ? 'fa-file-invoice-dollar text-rose-400' : 'fa-building text-amber-400'));
              
              // PERBAIKAN: Tambah replace tanda kutip pada file.judul dan gambar standar PDF Anti-Ngebuck
              return `
              <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all group relative cursor-pointer flex flex-col h-full" onclick="bukaPreviewArsip('${file.url}', '${file.judul.replace(/'/g, "\\'")}', '${file.kategori}', '${file.tgl}')">
                  <div class="h-32 bg-slate-800 relative overflow-hidden flex items-center justify-center shrink-0">
                      <img src="${file.url}" onerror="this.onerror=null; this.src='https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg'; this.className='object-contain w-16 h-16 opacity-90 group-hover:scale-110 transition-all duration-500';" class="object-cover w-full h-full opacity-60 group-hover:opacity-90 group-hover:scale-110 transition-all duration-500">
                      <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                      <div class="absolute bottom-2 left-2 right-2">
                          <span class="bg-white/20 backdrop-blur text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-white/30 shadow-sm"><i class="fas ${iconCat} mr-1"></i> ${file.kategori}</span>
                      </div>
                      <div class="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/20 transition-colors flex items-center justify-center">
                          <div class="w-12 h-12 bg-white/90 backdrop-blur rounded-full text-amber-600 flex items-center justify-center scale-0 group-hover:scale-100 transition-transform shadow-lg"><i class="fas fa-search-plus text-xl"></i></div>
                      </div>
                  </div>
                  <div class="p-4 flex-1 flex flex-col bg-white">
                      <h4 class="text-sm font-black text-slate-800 leading-tight mb-2 group-hover:text-amber-600 transition-colors">${file.judul}</h4>
                      <p class="text-[10px] text-slate-500 font-medium leading-relaxed flex-1 line-clamp-3">${file.keterangan || 'Tidak ada catatan khusus.'}</p>
                      <div class="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                          <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest"><i class="fas fa-calendar-alt mr-1"></i> ${file.tgl}</p>
                          <i class="fas fa-shield-alt text-emerald-500" title="Terenkripsi"></i>
                      </div>
                  </div>
              </div>`;
          }).join('');
      }

      if(document.getElementById('statSertifikat')) document.getElementById('statSertifikat').innerText = asetPusat.filter(a => a.kategori.includes('Tanah')).length;
      if(document.getElementById('statGedung')) document.getElementById('statGedung').innerText = asetPusat.filter(a => a.kategori.includes('IMB') || a.kategori.includes('Bangunan')).length;
      if(document.getElementById('statKendaraan')) document.getElementById('statKendaraan').innerText = asetPusat.filter(a => a.kategori.includes('BPKB') || a.kategori.includes('Kendaraan')).length;
      if(document.getElementById('statFinansial')) document.getElementById('statFinansial').innerText = asetPusat.filter(a => a.kategori.includes('Keuangan') || a.kategori.includes('Finansial')).length;
  }
  // =========================================================================
  // FUNGSI PREVIEW PDF & KEAMANAN DOWNLOAD (YANG SEMPAT TERHAPUS)
  // =========================================================================
  let currentDownloadUrl = "";

  window.bukaPreviewArsip = function(imgSrc, judul, kategori, tgl) {
      let previewUrl = imgSrc;
      // Konversi link download Drive menjadi link Preview cerdas
      if(imgSrc.includes('drive.google.com')) {
          let fileId = '';
          if(imgSrc.includes('id=')) fileId = new URL(imgSrc).searchParams.get('id');
          else if(imgSrc.includes('/d/')) fileId = imgSrc.split('/d/')[1].split('/')[0];
          
          if(fileId) previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      }

      document.getElementById('iframeArsipPreview').src = previewUrl;
      document.getElementById('previewArsipTitle').innerText = judul;
      document.getElementById('previewArsipMeta').innerText = `${kategori} • Diunggah pada: ${tgl}`;
      currentDownloadUrl = imgSrc; 
      
      document.getElementById('modalPreviewArsip').classList.remove('hidden');
  };

  window.downloadAman = function() {
      Swal.fire({
          title: 'Keamanan Dokumen',
          text: 'Masukkan 6 Digit PIN Otorisasi:',
          input: 'password',
          inputPlaceholder: '••••••',
          inputAttributes: { autocapitalize: 'off', autocorrect: 'off', maxlength: 6 },
          showCancelButton: true,
          confirmButtonText: '<i class="fas fa-unlock"></i> Verifikasi',
          cancelButtonText: 'Batal',
          confirmButtonColor: '#10b981',
          inputValidator: (value) => { if (!value) return 'PIN tidak boleh kosong!'; }
      }).then((result) => {
          if (result.isConfirmed) {
              // ===========================================
              // GANTI PIN RAHASIA DI SINI (Contoh: 123456)
              // ===========================================
              if (result.value === '123456') {  
                  Swal.fire({ icon: 'success', title: 'Akses Diberikan', text: 'Membuka dokumen...', timer: 1500, showConfirmButton: false });
                  setTimeout(() => { window.open(currentDownloadUrl, '_blank'); }, 1200);
              } else {
                  Swal.fire('Akses Ditolak', 'PIN Otorisasi salah.', 'error');
              }
          }
      });
  };

  // Mendaftarkan Mesin Service Worker untuk fitur Instal Aplikasi (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js');
  });
}

window.cetakPDFGereja = function(tipeLaporan) {
    try {
        let jsPDF_Constructor = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;
        if (!jsPDF_Constructor) {
            alert("Mesin PDF belum siap. Tunggu 3 detik dan coba lagi."); return;
        }
        const doc = new jsPDF_Constructor();
        if (typeof doc.autoTable !== 'function') {
            alert("Library AutoTable belum terpasang di HTML Bapak."); return;
        }

        // Ambil Data Gereja dan Data Majelis dari sistem
        let sumberGereja = (typeof DATA_MASTER !== 'undefined' && DATA_MASTER.gereja) ? DATA_MASTER.gereja : [];
        let sumberMajelis = (typeof DATA_MASTER !== 'undefined' && DATA_MASTER.majelis) ? DATA_MASTER.majelis : [];

        if (sumberGereja.length === 0) {
            alert("Data Gereja belum termuat!"); return;
        }

        // 1. Kumpulkan & Hitung Jumlah Majelis Asli
        let dataDiproses = [];
        sumberGereja.forEach(g => {
            let namaGerejaG = String(g.Nama_Gereja || g.Nama_Jemaat || g.Gereja || "").trim().toUpperCase();
            
            // Hitung ada berapa orang majelis di gereja ini yang terekam di database aplikasi
            let jumlahMajelisNyata = 0;
            if (sumberMajelis.length > 0 && namaGerejaG !== "") {
                jumlahMajelisNyata = sumberMajelis.filter(m => {
                    let namaGerejaM = String(m.Nama_Gereja || m.Nama_Jemaat || m.Gereja || "").trim().toUpperCase();
                    return namaGerejaM === namaGerejaG;
                }).length;
            }

            // Aturan Filter: Jika tombol evaluasi ditekan, buang gereja yang majelisnya 3 atau lebih
            if (tipeLaporan === 'evaluasi' && jumlahMajelisNyata >= 3) return;

            dataDiproses.push({
                ...g,
                jumlahMajelisNyata: jumlahMajelisNyata
            });
        });

        if (dataDiproses.length === 0) {
            alert(tipeLaporan === 'evaluasi' ? "Hebat! Semua gereja sudah memiliki 3 atau lebih data majelis." : "Tidak ada data untuk dicetak.");
            return;
        }

        // 2. Kelompokkan berdasarkan Wilayah
        let grupWilayah = {};
        dataDiproses.forEach(g => {
            // Ambil angka dari teks wilayah
            let teksWilayah = String(g.Wilayah || "0").trim();
            let angkaWilayah = parseInt(teksWilayah.replace(/\D/g, '')) || 0;
            
            let namaWilayah = angkaWilayah > 0 ? "WILAYAH " + angkaWilayah : "WILAYAH TIDAK DIKETAHUI";
            
            if (!grupWilayah[namaWilayah]) grupWilayah[namaWilayah] = [];
            grupWilayah[namaWilayah].push(g);
        });

        // 3. SORTING CERDAS: Urutkan Wilayah 1 sampai 12 secara berurutan
        let daftarWilayahTerurut = Object.keys(grupWilayah).sort((a, b) => {
            let angkaA = parseInt(a.replace(/\D/g, '')) || 999;
            let angkaB = parseInt(b.replace(/\D/g, '')) || 999;
            return angkaA - angkaB;
        });

        // 4. Mulai Menggambar PDF
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42); // Warna teks gelap
        
        let judul = tipeLaporan === 'evaluasi' ? "LAPORAN EVALUASI INPUT DATA MAJELIS" : "LAPORAN KESELURUHAN DATA GEREJA";
        let subJudul = tipeLaporan === 'evaluasi' ? "Kualifikasi: Gereja dengan jumlah majelis terinput di bawah 3 orang" : "Daftar lengkap status input data personil/majelis tiap gereja";
        let namaFile = tipeLaporan === 'evaluasi' ? "Laporan_Evaluasi_Majelis_Kurang.pdf" : "Laporan_Full_Gereja.pdf";

        doc.text(judul, 14, 15);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(subJudul, 14, 21);
        
        // --- FITUR BARU: Menampilkan Total Gereja Keseluruhan ---
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        if (tipeLaporan === 'evaluasi') {
            doc.setTextColor(225, 29, 72); // Warna Merah untuk menarik perhatian
            doc.text(`Total Gereja Butuh Perhatian: ${dataDiproses.length} Gereja`, 14, 28);
        } else {
            doc.setTextColor(37, 99, 235); // Warna Biru
            doc.text(`Total Keseluruhan Gereja: ${dataDiproses.length} Gereja`, 14, 28);
        }
        
        // Garis Pembatas
        doc.setLineWidth(0.5);
        doc.setDrawColor(200, 200, 200); // Warna garis abu-abu
        doc.line(14, 32, 196, 32);

        let finalY = 40; // Menurunkan titik awal tabel agar tidak menabrak tulisan Total

        // 5. Loop untuk menggambar tabel tiap wilayah
        daftarWilayahTerurut.forEach(wilayah => {
            if (finalY > 250) { 
                doc.addPage(); 
                finalY = 20; 
            }

            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(15, 23, 42); // Hitam tegas untuk judul wilayah
            doc.text(`${wilayah} ( ${grupWilayah[wilayah].length} Gereja )`, 14, finalY); // Menambahkan jumlah gereja per wilayah juga!
            finalY += 5;

            // Masukkan data baris
            let tableData = grupWilayah[wilayah].map((g, index) => [
                index + 1,
                g.Induk_Resort || g.Resort || g.Nama_Resort || "-",
                g.Nama_Gereja || g.Nama_Jemaat || g.Gereja || "-",
                g.jumlahMajelisNyata + " Terinput" 
            ]);

            doc.autoTable({
                startY: finalY,
                head: [['No', 'Induk Resort', 'Nama Gereja', 'Majelis Terinput']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: tipeLaporan === 'evaluasi' ? [225, 29, 72] : [15, 23, 42] },
                styles: { fontSize: 9 },
                columnStyles: { 
                    0: { cellWidth: 10, halign: 'center' },
                    3: { cellWidth: 35, halign: 'center', fontStyle: 'bold' }
                }
            });

            finalY = doc.lastAutoTable.finalY + 15; 
        });

        doc.save(namaFile);

    } catch (error) {
        alert("Terjadi Error: " + error.message);
        console.error(error);
    }
};

// =========================================================================
// FITUR KOORDINATOR WILAYAH (KORWIL)
// =========================================================================

// 1. Fungsi Pembuka Modal Bawaan (Generic) yang sebelumnya hilang
window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
};

// =========================================================
// 1. Fungsi Tambah Baru (Reset Form & Teks Tombol)
// =========================================================
window.openFormKorwil = function() {
    if(document.getElementById('formInputKorwil')) {
        document.getElementById('formInputKorwil').reset();
    }
    // Kosongkan ID untuk mode tambah
    safeSetValue('k_id', '');
    
    // Kembalikan teks tombol menjadi Simpan
    const btn = document.getElementById('btnSimpanKorwil');
    if (btn) btn.innerHTML = '<i class="fas fa-save mr-2"></i> Simpan Data Korwil';
    
    openModal('modalFormKorwil');
};

window.handleSimpanKorwil = function(e) {
    e.preventDefault();
    const form = e.target;
    const btn = document.getElementById('btnSimpanKorwil');
    const originalText = btn.innerHTML;

    Swal.fire({
        title: 'Simpan Data Korwil?',
        text: "Pastikan data sudah benar dan lengkap.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        confirmButtonText: '<i class="fas fa-save mr-1"></i> Ya, Simpan!',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>MENYIMPAN...';

            const formData = new FormData(form);
            const idKorwil = formData.get('ID_Korwil');
            
            // PAYLOAD MURNI UNTUK SHEET KORWIL
            const payload = {
                ID_Korwil: idKorwil,
                Nama_Korwil: formData.get('Nama_Korwil'),
                Wilayah: formData.get('Wilayah'),
                No_HP: formData.get('No_HP'),
                Status: formData.get('Status'),
                Keterangan: formData.get('Keterangan'),
                userRole: USER_NOW ? USER_NOW.role : 'Viewer',
                sumberAsal: "Dashboard Pusat"
            };

            // ACTION HARUS simpanKorwil BUKAN simpanMajelis
            let action = idKorwil ? 'updateKorwil' : 'simpanKorwil';

            Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading() });
            
            apiCall(action, payload).then(res => {
                btn.disabled = false;
                btn.innerHTML = originalText;
                
                if (res && res.status === 'success') {
                    closeModal('modalFormKorwil');
                    Swal.fire({
                        title: 'Sukses', 
                        text: res.message || 'Data Koordinator Wilayah berhasil disimpan ke Sheet KORWIL.', 
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: true
                    }).then(() => {
                        loadData(true); 
                    });
                } else {
                    Swal.fire('Gagal Menyimpan', res.message || 'Terjadi kesalahan di server.', 'error');
                }
            }).catch(err => {
                btn.disabled = false;
                btn.innerHTML = originalText;
                Swal.fire('Error Server', String(err), 'error');
            });
        }
    });
};

window.editDataKorwil = function(id) {
    // Cari data berdasarkan ID di memori browser
    const k = (DATA_MASTER.korwil || []).find(i => i.ID_Korwil == id);
    if (!k) {
        Swal.fire('Error', 'Data Korwil tidak ditemukan di memori.', 'error');
        return;
    }
    
    // Suntikkan data ke dalam input form
    safeSetValue('k_id', id);
    safeSetValue('k_wilayah', parseInt(String(k.Wilayah).replace(/\D/g, '')) || '');
    safeSetValue('k_nama', k.Nama_Korwil || '');
    safeSetValue('k_hp', k.No_HP || '');
    safeSetValue('k_status', k.Status || 'Aktif');
    safeSetValue('k_keterangan', k.Keterangan || '');
    
    // Ubah teks tombol menjadi Update
    const btn = document.getElementById('btnSimpanKorwil');
    if (btn) btn.innerHTML = '<i class="fas fa-edit mr-2"></i> Perbarui Data Korwil';
    
    openModal('modalFormKorwil');
}
window.konfirmasiHapusKorwil = function(id) {
    Swal.fire({ 
        title: 'Hapus data Korwil?', 
        text: 'Data yang dihapus dari server tidak bisa dikembalikan!',
        icon: 'warning', 
        showCancelButton: true, 
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: '<i class="fas fa-trash-alt mr-2"></i> Ya, Hapus!',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Menghapus Data...', didOpen: () => Swal.showLoading() });
            
            // Ambil role pengguna yang sedang login dengan aman
            const roleUser = typeof USER_NOW !== 'undefined' && USER_NOW ? USER_NOW.role : 'Viewer';

            // Eksekusi API hapus ke Google Apps Script
            apiCall('hapusKorwil', { id: id, userRole: roleUser, sumberAsal: "Dashboard Pusat" }).then((res) => {
                if (res && res.status === 'success') {
                    Swal.fire({
                        title: 'Terhapus!', 
                        text: res.message || 'Data Korwil berhasil dihapus.', 
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: true
                    }).then(() => {
                        // Paksa tarik data terbaru dari server agar tabel langsung bersih
                        loadData(true); 
                    });
                } else {
                    Swal.fire('Gagal', res.message || 'Gagal menghapus data di server.', 'error');
                }
            }).catch(err => {
                Swal.fire('Error Server', String(err), 'error');
            });
        }
    });
};


// 2. Fungsi Pembuka Modal Mutasi
window.bukaMutasi = function(id) {
    const m = DATA_MASTER.majelis.find(i => i.ID_Majelis == id); 
    if (!m) return; 

    // Info Asal
    safeSetValue('mut_id', id);
    safeSetValue('mut_nama_hidden', m.Nama_Lengkap);
    safeSetText('mut_nama', m.Nama_Lengkap);
    safeSetText('mut_jabatan', m.Jabatan);
    
    let infoGerejaAsal = m.Nama_Gereja ? String(m.Nama_Gereja).toUpperCase() : 'TINGKAT RESORT'; 
    let infoResortAsal = m.Resort ? String(m.Resort).toUpperCase() : 'JEMAAT KHUSUS';
    safeSetText('mut_asal_gereja', `${infoGerejaAsal} (${infoResortAsal} - W-${m.Wilayah})`);
    safeSetValue('mut_asal_resort', infoResortAsal);

    // Isi Opsi Tujuan Baru
    let htmlW = '<option value="">Pilih Wilayah</option>'; 
    for(let i=1; i<=12; i++) { htmlW += `<option value="${i}">WILAYAH ${i}</option>`; }
    safeSetHTML('mut_wilayah', htmlW);
    
    document.getElementById('formMutasi').reset();
    syncFormResortMutasi();

    document.getElementById('modalMutasi').classList.remove('hidden');
    document.getElementById('modalMutasi').style.setProperty('z-index', '999999', 'important');
};

// 3. Fungsi Sinkronisasi Dropdown Mutasi
window.syncFormResortMutasi = function() { 
    const w = document.getElementById('mut_wilayah')?.value || ''; const cleanW = String(w).trim().toLowerCase();
    const fr = document.getElementById('mut_resort'); if(!fr) return; fr.innerHTML = '<option value="">Pilih Resort / JK Tujuan</option>'; 
    const resorts = [...new Set(DATA_MASTER.gereja.filter(g => (!w || String(g.Wilayah).trim().toLowerCase() === cleanW) && String(g.Tipe_Gereja || g.Status_Gereja || '').toUpperCase() !== "JEMAAT KHUSUS" && (g.Induk_Resort || g.Resort)).map(g => String(g.Induk_Resort || g.Resort).trim()))].sort(); 
    const khusus = DATA_MASTER.gereja.filter(g => (!w || String(g.Wilayah).trim().toLowerCase() === cleanW) && String(g.Tipe_Gereja || g.Status_Gereja || '').toUpperCase() === "JEMAAT KHUSUS").map(g => String(g.Nama_Gereja).trim()).sort(); 
    resorts.forEach(r => { const opt = document.createElement('option'); opt.value = r; opt.text = r; opt.setAttribute('data-tipe', 'RESORT'); fr.appendChild(opt); }); khusus.forEach(k => { const opt = document.createElement('option'); opt.value = k; opt.text = "JK - " + k; opt.setAttribute('data-tipe', 'JK'); fr.appendChild(opt); }); 
    syncFormGerejaMutasi(); 
};

window.syncFormGerejaMutasi = function() { 
    const resSelect = document.getElementById('mut_resort'); const fg = document.getElementById('mut_gereja'); if(!fg || !resSelect) return; 
    const val = resSelect.value, tipe = resSelect.options[resSelect.selectedIndex]?.getAttribute('data-tipe'); fg.innerHTML = '<option value="">Pilih Unit Gereja Tujuan</option>'; 
    if (tipe === "RESORT" || (!tipe && val)) { 
        fg.innerHTML += `<option value="Pengurus Harian Resort (PHR)" class="font-bold text-emerald-700 bg-emerald-50">🏢 PENGURUS HARIAN RESORT (PHR)</option>`;
        DATA_MASTER.gereja.filter(g => String(g.Induk_Resort || g.Resort || '').trim() === val).forEach(g => { const opt = document.createElement('option'); opt.value = g.Nama_Gereja; opt.text = g.Nama_Gereja; fg.appendChild(opt); }); 
        fg.disabled = false; fg.classList.remove('bg-slate-200'); 
    } else if (tipe === "JK") { 
        const opt = document.createElement('option'); opt.value = val; opt.text = val; fg.appendChild(opt); fg.value = val; fg.disabled = false; fg.classList.add('bg-slate-200'); 
    } else { fg.disabled = false; fg.classList.remove('bg-slate-200'); } 
};

// 4. Fungsi Kirim Data Mutasi ke Server
window.handleSimpanMutasi = function(e) {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target)); 
    
    // Perbaikan untuk Jemaat Khusus
    let fr = document.getElementById('mut_resort');
    let tipeGereja = fr.options[fr.selectedIndex]?.getAttribute('data-tipe');
    if (tipeGereja === "JK") { 
        payload.Nama_Gereja_Baru = fr.value; 
        payload.Resort_Baru = ""; 
    }
    
    payload.userRole = USER_NOW ? USER_NOW.role : 'Viewer'; 
    payload.sumberAsal = "Dashboard Pusat";

    const btn = document.getElementById('btnSimpanMutasi'); const originalText = btn.innerHTML;
    btn.disabled = true;  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>MEMPROSES MUTASI...';
    
    Swal.fire({ title: 'Memproses Mutasi...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    apiCall('mutasiPersonil', payload).then(res => { 
        if (res.status === 'success') { 
            closeModal('modalMutasi'); 
            Swal.fire('Mutasi Berhasil!', res.message, 'success'); 
            loadData(true); 
        } else { Swal.fire('Gagal', res.message, 'error'); }
    }).catch(err => Swal.fire('Error', String(err), 'error'))
      .finally(() => { btn.disabled = false; btn.innerHTML = originalText; });
};

// Memaksa SweetAlert tampil di lapisan absolut teratas
document.head.insertAdjacentHTML('beforeend', '<style>.swal2-container { z-index: 9999999 !important; }</style>');
