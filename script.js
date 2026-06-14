// Konfigurasi Chart.js agar elegan dan sesuai font tema
Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)';
Chart.defaults.plugins.tooltip.titleFont = { size: 14, family: "'Plus Jakarta Sans', sans-serif", weight: 'bold' };
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.cornerRadius = 8;

// Inisialisasi State
let transactions = JSON.parse(localStorage.getItem('fintech_transactions')) || [];
let savings = JSON.parse(localStorage.getItem('fintech_savings')) || null;
let currentTheme = localStorage.getItem('fintech_theme') || 'dark';

// Variabel untuk chart
let chartInOut = null;
let chartCatOut = null;
let chartCatIn = null;

// DOM Elements
const body = document.documentElement;
const loadingScreen = document.getElementById('loading-screen');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menu-toggle');
const navLinks = document.querySelectorAll('.nav-links a');
const sections = document.querySelectorAll('.section-container');
const themeToggle = document.getElementById('theme-toggle');

// Efek Loading Screen
window.addEventListener('load', () => {
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => loadingScreen.style.display = 'none', 500);
        initApp();
    }, 1200); 
});

function initApp() {
    setTheme(currentTheme);
    renderDashboard();
    renderRiwayat();
    renderAnalisis();
    renderCelengan();
    updateGreeting();
}

function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Selamat Malam';
    if (hour >= 5 && hour < 12) greeting = 'Selamat Pagi';
    else if (hour >= 12 && hour < 15) greeting = 'Selamat Siang';
    else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore';
    
    const greetingEl = document.getElementById('greeting-text');
    if(greetingEl) greetingEl.innerText = `${greeting}, Siap Atur Keuangan?`;
}

// Toggle Sidebar Mobile
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('show');
});

// Navigasi
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        navLinks.forEach(l => l.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active-section'));
        
        link.classList.add('active');
        const targetId = link.getAttribute('href').substring(1);
        document.getElementById(targetId).classList.add('active-section');
        
        if(window.innerWidth <= 1024) sidebar.classList.remove('show');
        if(targetId === 'analisis') setTimeout(renderAnalisis, 100); // Re-render untuk chart canvas
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

// Theme System
if(themeToggle) {
    themeToggle.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(currentTheme);
        showToast(`Tema ${currentTheme === 'dark' ? 'Gelap' : 'Terang'} diaktifkan`, 'info');
    });
}

function setTheme(theme) {
    body.setAttribute('data-theme', theme);
    localStorage.setItem('fintech_theme', theme);
    if(themeToggle) {
        const icon = themeToggle.querySelector('i');
        icon.className = theme === 'dark' ? 'fas fa-sun text-yellow' : 'fas fa-moon';
    }
    
    // Update Chart Text Color
    const textColor = theme === 'dark' ? '#94a3b8' : '#64748b';
    Chart.defaults.color = textColor;
    if(document.getElementById('analisis').classList.contains('active-section')) renderAnalisis();
}

// Format Uang
const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

// --- LOGIKA FORM TRANSAKSI ---
document.getElementById('form-pemasukan').addEventListener('submit', (e) => handleTransactionSubmit(e, 'Pemasukan'));
document.getElementById('form-pengeluaran').addEventListener('submit', (e) => handleTransactionSubmit(e, 'Pengeluaran'));

function handleTransactionSubmit(e, type) {
    e.preventDefault();
    const typeLower = type.toLowerCase();
    
    const idEdit = document.getElementById(`edit-id-${typeLower}`).value;
    const nama = document.getElementById(`nama-${typeLower}`).value;
    const nominal = parseFloat(document.getElementById(`nominal-${typeLower}`).value);
    const kategori = document.getElementById(`kategori-${typeLower}`).value;
    const tanggal = document.getElementById(`tanggal-${typeLower}`).value;
    const catatan = document.getElementById(`catatan-${typeLower}`).value;

    const transactionData = {
        id: idEdit ? parseInt(idEdit) : Date.now(),
        type: type,
        nama, nominal, kategori, tanggal, catatan
    };

    if (idEdit) {
        const index = transactions.findIndex(t => t.id === parseInt(idEdit));
        transactions[index] = transactionData;
        showToast('Data transaksi berhasil diupdate', 'success');
        document.getElementById(`edit-id-${typeLower}`).value = '';
    } else {
        transactions.push(transactionData);
        showToast(`Berhasil menambah ${type} baru`, 'success');
    }

    if(type === 'Pengeluaran' && nominal >= 2000000) {
        setTimeout(() => showToast('Wow, pengeluaran yang cukup besar! Hati-hati ya.', 'warning'), 800);
    }

    saveData();
    e.target.reset();
    document.getElementById(`tanggal-${typeLower}`).valueAsDate = new Date();
    updateAllViews();
}

function hapusTransaksi(id) {
    if(confirm('Data transaksi ini akan dihapus permanen. Lanjutkan?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        updateAllViews();
        showToast('Transaksi berhasil dihapus', 'success');
    }
}

function editTransaksi(id) {
    const t = transactions.find(t => t.id === id);
    if(!t) return;
    const typeLower = t.type.toLowerCase();
    
    document.querySelector('a[href="#transaksi"]').click();
    
    document.getElementById(`edit-id-${typeLower}`).value = t.id;
    document.getElementById(`nama-${typeLower}`).value = t.nama;
    document.getElementById(`nominal-${typeLower}`).value = t.nominal;
    document.getElementById(`kategori-${typeLower}`).value = t.kategori;
    document.getElementById(`tanggal-${typeLower}`).value = t.tanggal;
    document.getElementById(`catatan-${typeLower}`).value = t.catatan;

    showToast('Mode Edit: Silakan perbarui data di form', 'info');
}

function saveData() {
    localStorage.setItem('fintech_transactions', JSON.stringify(transactions));
    localStorage.setItem('fintech_savings', JSON.stringify(savings));
}

function updateAllViews() {
    renderDashboard();
    renderRiwayat();
    if(document.getElementById('analisis').classList.contains('active-section')) renderAnalisis();
    renderCelengan();
}

// --- DASHBOARD ---
function renderDashboard() {
    const totalPemasukan = transactions.filter(t => t.type === 'Pemasukan').reduce((acc, curr) => acc + curr.nominal, 0);
    const totalPengeluaran = transactions.filter(t => t.type === 'Pengeluaran').reduce((acc, curr) => acc + curr.nominal, 0);
    const saldo = totalPemasukan - totalPengeluaran;

    document.getElementById('total-pemasukan').innerText = formatRupiah(totalPemasukan);
    document.getElementById('total-pengeluaran').innerText = formatRupiah(totalPengeluaran);
    document.getElementById('saldo-saat-ini').innerText = formatRupiah(saldo);
    document.getElementById('jumlah-transaksi').innerText = `${transactions.length} Transaksi`;

    const statusEl = document.getElementById('status-kesehatan');
    if (totalPemasukan === 0 && totalPengeluaran === 0) statusEl.innerHTML = '⚪ Belum ada data';
    else if (totalPengeluaran > totalPemasukan) statusEl.innerHTML = '🔴 Boros / Defisit';
    else if (totalPemasukan >= totalPengeluaran * 2) statusEl.innerHTML = '🟢 Sangat Baik';
    else if (totalPemasukan > totalPengeluaran * 1.2) statusEl.innerHTML = '🔵 Terkendali';
    else statusEl.innerHTML = '🟡 Perlu Perhatian';
}

// --- RIWAYAT TRANSAKSI ---
document.getElementById('search-transaksi').addEventListener('input', renderRiwayat);
document.getElementById('filter-jenis').addEventListener('change', renderRiwayat);

function renderRiwayat() {
    const tbody = document.getElementById('tabel-riwayat');
    const search = document.getElementById('search-transaksi').value.toLowerCase();
    const filter = document.getElementById('filter-jenis').value;

    let filtered = transactions.filter(t => {
        const matchSearch = t.nama.toLowerCase().includes(search) || t.kategori.toLowerCase().includes(search);
        const matchFilter = filter === 'Semua' || t.type === filter;
        return matchSearch && matchFilter;
    });

    filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    tbody.innerHTML = '';

    if(filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:30px; color:var(--text-muted);">Tidak ada data transaksi</td></tr>`;
        return;
    }

    filtered.forEach(t => {
        const tr = document.createElement('tr');
        const isIncome = t.type === 'Pemasukan';
        tr.innerHTML = `
            <td>${new Date(t.tanggal).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}</td>
            <td style="font-weight:600;">${t.nama}</td>
            <td><span class="badge ${isIncome ? 'badge-in' : 'badge-out'}">${t.kategori}</span></td>
            <td><span style="opacity:0.8; font-size:0.9em;">${t.catatan || '-'}</span></td>
            <td class="${isIncome ? 'text-green' : 'text-red'}" style="font-weight:700;">
                ${isIncome ? '+' : '-'}${formatRupiah(t.nominal)}
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-action btn-edit" onclick="editTransaksi(${t.id})" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="btn-action btn-delete" onclick="hapusTransaksi(${t.id})" title="Hapus"><i class="fas fa-trash-alt"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- ANALISIS & CHARTS ---
function renderAnalisis() {
    if(chartInOut) chartInOut.destroy();
    if(chartCatOut) chartCatOut.destroy();
    if(chartCatIn) chartCatIn.destroy();

    const totalIn = transactions.filter(t => t.type === 'Pemasukan').reduce((a, b) => a + b.nominal, 0);
    const totalOut = transactions.filter(t => t.type === 'Pengeluaran').reduce((a, b) => a + b.nominal, 0);

    // Konfigurasi Umum Chart
    const commonOptions = { 
        responsive: true, maintainAspectRatio: false, 
        plugins: { legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true, pointStyle: 'circle' } } },
        layout: { padding: 10 }
    };

    // Chart In vs Out
    const ctxInOut = document.getElementById('chart-in-vs-out').getContext('2d');
    chartInOut = new Chart(ctxInOut, {
        type: 'doughnut',
        data: {
            labels: ['Pemasukan', 'Pengeluaran'],
            datasets: [{
                data: [totalIn || 1, totalOut || 1], // fallback agar chart tetap bulat saat kosong
                backgroundColor: ['#10b981', '#f43f5e'],
                borderWidth: 0,
                cutout: '75%',
                hoverOffset: 4
            }]
        },
        options: { ...commonOptions, plugins: { ...commonOptions.plugins, tooltip: { callbacks: { label: function(context) { return ' ' + formatRupiah(context.raw === 1 && totalIn===0 && totalOut===0 ? 0 : context.raw); } } } } }
    });

    const getCatData = (type) => {
        const data = transactions.filter(t => t.type === type).reduce((acc, curr) => {
            acc[curr.kategori] = (acc[curr.kategori] || 0) + curr.nominal;
            return acc;
        }, {});
        return { labels: Object.keys(data), values: Object.values(data) };
    };

    const catOutData = getCatData('Pengeluaran');
    const catInData = getCatData('Pemasukan');
    const colors = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ec4899'];

    // Chart Kategori Pengeluaran
    const ctxCatOut = document.getElementById('chart-kategori-pengeluaran').getContext('2d');
    chartCatOut = new Chart(ctxCatOut, {
        type: 'pie',
        data: {
            labels: catOutData.labels.length ? catOutData.labels : ['Belum ada'],
            datasets: [{
                data: catOutData.values.length ? catOutData.values : [1],
                backgroundColor: colors, borderWidth: 0, hoverOffset: 4
            }]
        },
        options: commonOptions
    });

    // Chart Kategori Pemasukan
    const ctxCatIn = document.getElementById('chart-kategori-pemasukan').getContext('2d');
    chartCatIn = new Chart(ctxCatIn, {
        type: 'bar',
        data: {
            labels: catInData.labels.length ? catInData.labels : ['Belum ada'],
            datasets: [{
                label: 'Total Pemasukan',
                data: catInData.values.length ? catInData.values : [0],
                backgroundColor: '#10b981', borderRadius: 6, barPercentage: 0.6
            }]
        },
        options: { 
            responsive: true, maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: { 
                y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.1)', borderDash: [5, 5] }, ticks: { callback: (val) => 'Rp ' + (val/1000) + 'k' } },
                x: { grid: { display: false } }
            }
        }
    });

    // Ranking
    const rankingList = document.getElementById('ranking-pengeluaran');
    rankingList.innerHTML = '';
    
    if(catOutData.labels.length > 0) {
        const combined = catOutData.labels.map((label, i) => ({ label, value: catOutData.values[i] }));
        combined.sort((a, b) => b.value - a.value);

        combined.slice(0, 5).forEach((item, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div style="display:flex; align-items:center;">
                    <div class="ranking-number">${index+1}</div>
                    <span style="font-weight:600;">${item.label}</span>
                </div>
                <span class="text-red" style="font-weight:700;">${formatRupiah(item.value)}</span>
            `;
            rankingList.appendChild(li);
        });

        const top = combined[0];
        const pct = ((top.value / totalOut) * 100).toFixed(1);
        let saran = `Pengeluaran dominan Anda ada pada <strong>${top.label}</strong> (${pct}% dari total). `;
        
        if (totalOut > totalIn) saran += `Status arus kas Anda sedang defisit. Segera rem pengeluaran di sektor ${top.label} ini!`;
        else if (totalIn >= totalOut * 2) saran += `Luar biasa, Anda sangat hemat! Pertimbangkan memindahkan sisa uang ke Celengan atau Instrumen Investasi.`;
        else saran += `Keuangan cukup stabil. Coba kurangi sedikit budget ${top.label} untuk mempercepat target tabungan Anda.`;
        document.getElementById('saran-keuangan').innerHTML = saran;
    } else {
        rankingList.innerHTML = '<li style="justify-content:center; color:var(--text-muted); border:none;">Belum ada riwayat pengeluaran</li>';
        document.getElementById('saran-keuangan').innerHTML = 'Catat transaksi pengeluaran Anda agar AI dapat memberikan saran yang akurat.';
    }
}

// --- TARGET TABUNGAN (CELENGAN) ---
document.getElementById('form-celengan').addEventListener('submit', (e) => {
    e.preventDefault();
    savings = { 
        nama: document.getElementById('celengan-nama').value, 
        target: parseFloat(document.getElementById('celengan-target').value), 
        current: 0 
    };
    saveData(); renderCelengan();
    showToast('Misi menabung dimulai! Semangat!', 'success');
});

document.getElementById('btn-reset-celengan').addEventListener('click', () => {
    if(confirm('Target ini akan dihapus. Yakin ingin mereset?')) {
        savings = null; saveData(); renderCelengan();
    }
});

document.getElementById('btn-tambah-celengan').addEventListener('click', () => updateCelengan('tambah'));
document.getElementById('btn-kurang-celengan').addEventListener('click', () => updateCelengan('kurang'));

function updateCelengan(aksi) {
    if(!savings) return;
    const input = document.getElementById('nominal-celengan-aksi');
    const nominal = parseFloat(input.value);
    
    if(isNaN(nominal) || nominal <= 0) return showToast('Nominal tidak valid', 'error');

    if(aksi === 'tambah') {
        savings.current += nominal;
        showToast(`+${formatRupiah(nominal)} masuk ke celengan`, 'success');
        if(savings.current >= savings.target) {
            setTimeout(() => showToast('🎉 TARGET TERCAPAI! Selamat!', 'success'), 600);
        }
    } else {
        if(savings.current - nominal < 0) return showToast('Saldo tidak cukup untuk ditarik', 'error');
        savings.current -= nominal;
        showToast(`-${formatRupiah(nominal)} diambil dari celengan`, 'warning');
    }

    input.value = ''; saveData(); renderCelengan();
}

function renderCelengan() {
    const setupDiv = document.getElementById('celengan-setup');
    const activeDiv = document.getElementById('celengan-active');
    const btnReset = document.getElementById('btn-reset-celengan');

    if(!savings) {
        setupDiv.classList.remove('hidden'); activeDiv.classList.add('hidden'); btnReset.classList.add('hidden');
        document.getElementById('form-celengan').reset();
    } else {
        setupDiv.classList.add('hidden'); activeDiv.classList.remove('hidden'); btnReset.classList.remove('hidden');

        document.getElementById('display-celengan-nama').innerText = savings.nama;
        document.getElementById('celengan-terkumpul').innerText = formatRupiah(savings.current);
        document.getElementById('celengan-total-target').innerText = `dari ${formatRupiah(savings.target)}`;
        
        let pct = (savings.current / savings.target) * 100;
        if(pct > 100) pct = 100;
        
        document.getElementById('celengan-progress').style.width = `${pct}%`;
        document.getElementById('celengan-persentase').innerText = `${pct.toFixed(1)}%`;
        
        const sisa = savings.target - savings.current;
        document.getElementById('celengan-sisa').innerText = sisa > 0 ? `Kurang: ${formatRupiah(sisa)}` : 'Selesai 🚀';
    }
}

// --- SISTEM TOAST NOTIFICATION ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle text-primary';
    if(type === 'success') icon = 'fa-check-circle text-green';
    if(type === 'error') icon = 'fa-times-circle text-red';
    if(type === 'warning') icon = 'fa-exclamation-triangle text-yellow';

    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 4500);
}

// Setup Date Awal
document.getElementById('tanggal-pemasukan').valueAsDate = new Date();
document.getElementById('tanggal-pengeluaran').valueAsDate = new Date();