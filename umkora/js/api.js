/**
 * UMKORA — Frontend API Client (Supabase)
 * Antarmuka AuthAPI / FormAPI / DashboardAPI dipertahankan
 * agar auth.js, form.js, dan main.js tidak perlu diubah.
 */
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cache sinkron untuk cek status login (sesi asli dikelola Supabase)
const TokenStore = {
  get()       { return localStorage.getItem('umkora_token'); },
  set(t)      { localStorage.setItem('umkora_token', t); },
  clear()     { localStorage.removeItem('umkora_token'); },
  getUser()   { try { return JSON.parse(localStorage.getItem('umkora_user') || 'null'); } catch { return null; } },
  setUser(u)  { localStorage.setItem('umkora_user', JSON.stringify(u)); },
  clearUser() { localStorage.removeItem('umkora_user'); },
};

sb.auth.onAuthStateChange((event, session) => {
  if (session) TokenStore.set(session.access_token);
  else { TokenStore.clear(); TokenStore.clearUser(); }
});

const fail = (message, status = 400, data = null) => ({ ok: false, status, message, data });
const ok   = (data, message = '') => ({ ok: true, status: 200, message, data });

function toUser(session, p) {
  return {
    token: session?.access_token, user_id: p.id, email: p.email, role: p.role,
    umkm_name: p.umkm_name, lokasi: p.lokasi || '', sektor: p.sektor || '', omzet: p.omzet ?? null,
  };
}

function authError(error) {
  const m = (error.message || '').toLowerCase();
  if (m.includes('invalid login'))      return 'Email atau kata sandi salah.';
  if (m.includes('already registered')) return 'Email sudah terdaftar.';
  if (m.includes('password'))           return 'Kata sandi minimal 6 karakter.';
  if (m.includes('email not confirmed')) return 'Email belum dikonfirmasi. Cek kotak masuk Anda.';
  return error.message || 'Terjadi kesalahan.';
}

const AuthAPI = {
  async register(p) {
    const name = (p.umkm_name || '').trim();
    const role = p.role || 'owner';

    if (role === 'owner') {
      const { data: exists } = await sb.rpc('owner_exists', { p_umkm_name: name });
      if (exists) return fail(`UMKM "${name}" sudah memiliki Owner terdaftar.`, 409);
    }

    const { data, error } = await sb.auth.signUp({
      email: (p.email || '').trim().toLowerCase(),
      password: p.password,
      options: { data: { umkm_name: name, role, lokasi: p.lokasi || null, sektor: p.sektor || null, omzet: p.omzet || null } },
    });
    if (error) return fail(authError(error), 422);
    if (!data.session) return fail('Akun dibuat. Silakan konfirmasi email Anda, lalu masuk.', 202);

    const { data: prof } = await sb.from('profiles').select('*').eq('id', data.user.id).single();
    const user = toUser(data.session, prof || { id: data.user.id, email: p.email, role, umkm_name: name });
    TokenStore.set(user.token); TokenStore.setUser(user);
    return ok(user, 'Registrasi berhasil.');
  },

  async login(p) {
    const { data, error } = await sb.auth.signInWithPassword({
      email: (p.email || '').trim().toLowerCase(), password: p.password,
    });
    if (error) return fail(authError(error), 401);

    const { data: prof } = await sb.from('profiles').select('*').eq('id', data.user.id).single();
    if (!prof || prof.is_active === false) { await sb.auth.signOut(); return fail('Akun tidak aktif. Hubungi admin.', 403); }
    if (p.role && p.role !== prof.role) {
      await sb.auth.signOut();
      return fail(`Akun ini terdaftar sebagai ${prof.role}, bukan ${p.role}.`, 403);
    }
    const user = toUser(data.session, prof);
    TokenStore.set(user.token); TokenStore.setUser(user);
    return ok(user, 'Login berhasil.');
  },

  logout()     { sb.auth.signOut(); TokenStore.clear(); TokenStore.clearUser(); },
  getUser()    { return TokenStore.getUser(); },
  isLoggedIn() { return !!TokenStore.get(); },
};

const FormAPI = {
  async submit(answers) {
    const { data, error } = await sb.rpc('submit_assessment', { p_answers: answers });
    if (error) return fail(error.message, 422);
    return ok(data, 'Formulir berhasil disimpan.');
  },
};

const DashboardAPI = {
  async getUmkmList({ limit = 15, offset = 0, q = '' } = {}) {
    let query = sb.from('v_umkm_list').select('*', { count: 'exact' }).order('submitted_at', { ascending: true });
    if (q) {
      const s = q.replace(/[%,()]/g, '');
      query = query.or(`umkm_name.ilike.%${s}%,lokasi.ilike.%${s}%,sektor.ilike.%${s}%`);
    }
    const { data, count, error } = await query.range(offset, offset + limit - 1);
    if (error) return fail(error.message);
    return ok({ rows: data, total: count ?? data.length, limit, offset });
  },
  async getMe() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return fail('Tidak terautentikasi.', 401);
    const { data, error } = await sb.from('profiles').select('*').eq('id', user.id).single();
    return error ? fail(error.message) : ok(data);
  },
};
