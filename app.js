const SUPABASE_URL = 'https://yutyxcfqjawykxooarji.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1dHl4Y2ZxamF3eWt4b29hcmppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODYxNzgsImV4cCI6MjA5MzY2MjE3OH0.5OqO8bBObN22DxR1Mxdj8rCOsFDBaSvl8dSmAKJtuok'; 
const _db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.app = {
    userRole: null,
    mode: 'view',

    showWindow: (id) => {
        document.querySelectorAll('.window').forEach(w => w.style.display = 'none');
        document.getElementById(id).style.display = 'block';
        // Pencere değişince modu sıfırla ki takılı kalmasın
        if(id === 'win-main') {
            app.mode = 'view';
            document.querySelectorAll('#admin-tools button').forEach(b => b.style.outline = "none");
        }
    },

    login: async () => {
        const email = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value.trim();
        const { data: users } = await _db.from('users').select('*').eq('email', email).eq('password', pass);

        if (users?.length > 0) {
            app.userRole = String(users[0].role_id) === "1" ? 'admin' : 'user';
            alert(`Hoş geldin ${users[0].full_name}!`);
            app.initApp();
        } else { alert("Hatalı giriş!"); }
    },

    initApp: () => {
        app.showWindow('win-main');
        document.getElementById('admin-tools').style.display = app.userRole === 'admin' ? 'flex' : 'none';
        app.loadMovies();
    },

    setAdminMode: (m) => {
        // Toggle mantığı: Aynı butona basarsan modu kapatır
        if (app.mode === m) {
            app.mode = 'view';
            alert("Normal Mod Aktif");
        } else {
            app.mode = m;
            alert(`Mod Aktif: ${m.toUpperCase()}`);
        }

        document.querySelectorAll('#admin-tools button').forEach(b => b.style.outline = "none");
        if (app.mode !== 'view') {
            const btnClass = app.mode === 'delete' ? '.btn-del' : '.btn-upd';
            const target = document.querySelector(btnClass);
            if(target) target.style.outline = "3px solid yellow";
        }
    },

    loadMovies: async (filter = '') => {
        let { data: movies } = await _db.from('movies').select('*');
        if (filter) movies = movies.filter(m => m.title.toLowerCase().includes(filter.toLowerCase()));
        
        const grid = document.getElementById('movie-grid');
        grid.innerHTML = movies.map(m => `
            <div class="movie-card" onclick='app.onCardClick(${JSON.stringify(m)})'>
                <img src="${m.poster_url || 'https://via.placeholder.com/200x300'}">
                <p><strong>${m.title}</strong></p>
                <span>${m.release_year}</span>
            </div>`).join('');
    },

    onCardClick: (movie) => {
        if (app.mode === 'delete') {
            if (confirm(`${movie.title} silinsin mi?`)) app.executeDelete(movie.movie_id);
        } else {
            app.showUpdateForm(movie);
        }
    },

    // SATIR EKLEME
    addCastRow: (actor = '', char = '') => {
        const row = document.createElement('div');
        row.className = 'dynamic-row cast-row';
        row.innerHTML = `<input type="text" placeholder="Aktör" value="${actor}" class="actor-name">
                         <input type="text" placeholder="Rol" value="${char}" class="char-name">
                         <button type="button" onclick="this.parentElement.remove()" style="background:#e74c3c">X</button>`;
        document.getElementById('cast-inputs-container').appendChild(row);
    },

    addLocationRow: (loc = '', scene = '') => {
        const row = document.createElement('div');
        row.className = 'dynamic-row location-row';
        row.innerHTML = `<input type="text" placeholder="Mekan" value="${loc}" class="loc-name">
                         <input type="text" placeholder="Sahne" value="${scene}" class="scene-desc">
                         <button type="button" onclick="this.parentElement.remove()" style="background:#e74c3c">X</button>`;
        document.getElementById('location-inputs-container').appendChild(row);
    },

    addExpenseRow: (group = '', cost = '') => {
        const row = document.createElement('div');
        row.className = 'dynamic-row expense-row';
        row.innerHTML = `<input type="text" placeholder="Grup" value="${group}" class="expense-group">
                         <input type="number" placeholder="Maliyet" value="${cost}" class="expense-cost">
                         <button type="button" onclick="this.parentElement.remove()" style="background:#e74c3c">X</button>`;
        document.getElementById('expense-inputs-container').appendChild(row);
    },

    // KAYDETME
    handleDataOperation: async () => {
        const id = document.getElementById('f-id').value;
        const movieData = {
            title: document.getElementById('f-title').value,
            director: document.getElementById('f-director').value,
            budget: document.getElementById('f-budget').value,
            release_year: document.getElementById('f-date').value,
            poster_url: document.getElementById('f-poster').value
        };

        const res = id 
            ? await _db.from('movies').update(movieData).eq('movie_id', id).select()
            : await _db.from('movies').insert([movieData]).select();

        if (res.error) return alert(res.error.message);
        const movieId = res.data[0].movie_id;

        await _db.from('movie_cast').delete().eq('movie_id', movieId);
        await _db.from('movie_locations').delete().eq('movie_id', movieId);
        await _db.from('expenses').delete().eq('movie_id', movieId);

        const casts = Array.from(document.querySelectorAll('.cast-row')).map(r => ({
            movie_id: movieId, actor_name: r.querySelector('.actor-name').value, character_name: r.querySelector('.char-name').value
        })).filter(c => c.actor_name);
        if(casts.length > 0) await _db.from('movie_cast').insert(casts);

        const locs = Array.from(document.querySelectorAll('.location-row')).map(r => ({
            movie_id: movieId, location_name: r.querySelector('.loc-name').value, scene_description: r.querySelector('.scene-desc').value
        })).filter(l => l.location_name);
        if(locs.length > 0) await _db.from('movie_locations').insert(locs);

        const exps = Array.from(document.querySelectorAll('.expense-row')).map(r => ({
            movie_id: movieId, expense_group: r.querySelector('.expense-group').value, total_cost_usd: r.querySelector('.expense-cost').value
        })).filter(e => e.expense_group);
        if(exps.length > 0) await _db.from('expenses').insert(exps);

        alert("Başarıyla kaydedildi!");
        app.initApp();
    },

    showUpdateForm: async (m) => {
    app.showWindow('win-form');
    
    // Yetki kontrolü (Admin mi?)
    const isAdmin = app.userRole === 'admin';
    
    // Form başlığını ve Kaydet butonunu ayarla
    document.getElementById('form-title').innerText = isAdmin ? "Film Yönetimi" : "Film Detayları";
    document.getElementById('submit-btn').style.display = isAdmin ? 'block' : 'none';

    // Ana inputları admin değilse kilitle
    const mainInputs = document.querySelectorAll('.input-fields input');
    mainInputs.forEach(input => {
        input.readOnly = !isAdmin;
    });

    // Film bilgilerini doldur
    document.getElementById('f-id').value = m.movie_id;
    document.getElementById('f-title').value = m.title;
    document.getElementById('f-director').value = m.director;
    document.getElementById('f-budget').value = m.budget;
    document.getElementById('f-date').value = m.release_year;
    document.getElementById('f-poster').value = m.poster_url || "";
    document.getElementById('f-preview').src = m.poster_url || "https://via.placeholder.com/150";

    // Kapları temizle
    document.getElementById('cast-inputs-container').innerHTML = "";
    document.getElementById('location-inputs-container').innerHTML = "";
    document.getElementById('expense-inputs-container').innerHTML = "";

    // Verileri çek ve satırları ekle
    const { data: c } = await _db.from('movie_cast').select('*').eq('movie_id', m.movie_id);
    c?.forEach(x => app.addCastRow(x.actor_name, x.character_name));

    const { data: l } = await _db.from('movie_locations').select('*').eq('movie_id', m.movie_id);
    l?.forEach(x => app.addLocationRow(x.location_name, x.scene_description));

    const { data: e } = await _db.from('expenses').select('*').eq('movie_id', m.movie_id);
    e?.forEach(x => app.addExpenseRow(x.expense_group, x.total_cost_usd));

    // --- KRİTİK KISIM: NORMAL KULLANICI İÇİN BUTONLARI VE INPUTLARI GİZLE/KİLİTLE ---
    if (!isAdmin) {
        // Tüm "+ Add" butonlarını gizle
        document.querySelectorAll('#relation-sections button').forEach(btn => {
            if (btn.innerText.includes('+')) btn.style.display = 'none';
        });

        // Dinamik satırlardaki "X" (silme) butonlarını gizle
        document.querySelectorAll('.dynamic-row button').forEach(btn => {
            btn.style.display = 'none';
        });

        // Dinamik satırlardaki tüm inputları readonly yap
        document.querySelectorAll('.dynamic-row input').forEach(input => {
            input.readOnly = true;
        });
    }
},

    showAddForm: () => {
        app.showWindow('win-form');
        document.getElementById('f-id').value = "";
        document.querySelectorAll('.input-fields input').forEach(i => i.value = "");
        document.getElementById('cast-inputs-container').innerHTML = "";
        document.getElementById('location-inputs-container').innerHTML = "";
        document.getElementById('expense-inputs-container').innerHTML = "";
        app.addCastRow(); app.addLocationRow(); app.addExpenseRow();
    },

    executeDelete: async (id) => {
        const { error } = await _db.from('movies').delete().eq('movie_id', id);
        if (!error) app.loadMovies();
    },

    showArchive: async () => {
        app.showWindow('win-archive');
        const { data } = await _db.from('expenses_archive').select('*').order('deletion_date', {ascending: false});
        document.getElementById('archive-body').innerHTML = data.map(e => `
            <tr><td>${e.movie_name}</td><td>$${Number(e.total_cost_usd).toLocaleString()}</td><td>${new Date(e.deletion_date).toLocaleDateString()}</td></tr>
        `).join('');
    },

    search: () => app.loadMovies(document.getElementById('search-input').value)
};