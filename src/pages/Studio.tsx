import Workspace from "../features/studio-next/Workspace";
import BrandIcon from "../components/BrandIcon";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getStudioLibrary, type Book, type Episode } from "../data/library";
import { isConfigured, supabase } from "../data/supabase";
import { useUiTheme, type UiTheme, type AppThemePreference } from "../hooks/useUiTheme";
import ThemeToggle from "../components/ThemeToggle";
import ThemeLoading from "../components/ThemeLoading";
import { forgetOperation } from "../data/manuscriptImport";
import { B, errMsg } from "../features/studio/components/StudioShared";
function Busy({ text = "Memuat Studio..." }: { text?: string }) {
  return <ThemeLoading context="studio" text={text} />;
}
function Login({
  onSuccess,
  theme,
  preference,
  onPreferenceChange,
}: {
  onSuccess: () => void;
  theme: UiTheme;
  preference: AppThemePreference;
  onPreferenceChange: (next: AppThemePreference) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      onSuccess();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="writer-login">
      <div className="writer-login-tools">
        <ThemeToggle theme={theme} preference={preference} onPreferenceChange={onPreferenceChange} />
      </div>
      <B to="/" className="studio-backlink">
        <BrandIcon name="arrow-left" size={17} /> Kembali ke Library
      </B>
      <form className="writer-login-form" onSubmit={submit}>
        <div className="writer-login-icon">
          <img src="/brand/app-icon.png" width="33" height="33" alt="" />
        </div>
        <span className="studio-kicker">RUANG PRIBADI PENULIS</span>
        <h1>
          Tempat cerita
          <br />
          bertumbuh.
        </h1>
        <p>Masuk ke ruang menulismu. Mulai dari satu kalimat, lanjutkan sebuah dunia.</p>
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@contoh.com"
          />
        </label>
        <label>
          Kata sandi
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>
        {error && (
          <div className="studio-error" role="alert">
            {error}
          </div>
        )}
        <button className="studio-primary" disabled={busy} type="submit">
          {busy ? "Masuk…" : "Masuk ke Studio"} <BrandIcon name="arrow-right" size={17} />
        </button>
        <small>
          <BrandIcon name="lock" size={13} /> Hanya akun penulis yang diizinkan.
        </small>
      </form>
    </div>
  );
}
export default function Studio({ path }: { path: string }) {
  const { theme, preference, setPreference } = useUiTheme();
  const authSequence = useRef(0);
  const userIdRef = useRef<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const ticket = generation.current;
    try {
      const result = await getStudioLibrary();
      if (ticket !== generation.current) return;
      setBooks(result.books);
      setEpisodes(result.episodes);
      setError("");
    } catch (e) {
      if (ticket === generation.current) setError(errMsg(e));
    } finally {
      if (ticket === generation.current) setLoading(false);
    }
  }, []);
  // Do not remount the Studio on tab navigation or refresh credentials every time
  // Chrome Android opens its document picker. Auth is verified on entry/sign-in;
  // token refreshes do not replace the file importer or its File object.
  const checkAuth = useCallback(async () => {
    const ticket = ++authSequence.current;
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.auth.getUser();
      if (ticket !== authSequence.current) return;
      if (error || !data.user) {
        setUser(null);
        setAuthorized(false);
        return;
      }
      const { data: member, error: memberErr } = await supabase
        .from("qr_author_members")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (ticket !== authSequence.current) return;
      if (memberErr) {
        setError(`Gagal memeriksa izin penulis: ${memberErr.message}`);
        setAuthorized(false);
        return;
      }
      userIdRef.current = data.user.id;
      setUser(data.user);
      setAuthorized(Boolean(member));
    } catch (e) {
      setError(`Pemeriksaan akun gagal: ${errMsg(e)}`);
      setAuthorized(false);
    } finally {
      setAuthLoading(false);
    }
  }, []);
  useEffect(() => {
    let mounted = true;
    void checkAuth();
    const { data } = supabase?.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT") {
        authSequence.current++;
        generation.current++;
        setBooks([]);
        setEpisodes([]);
        forgetOperation();
        userIdRef.current = null;
        setUser(null);
        setAuthorized(false);
        setAuthLoading(false);
      } else if (event === "SIGNED_IN" && userIdRef.current === null) {
        // Defer async auth calls outside Supabase's synchronous callback.
        window.setTimeout(() => {
          if (mounted) void checkAuth();
        }, 0);
      }
      // INITIAL_SESSION and TOKEN_REFRESHED must not reset the mobile importer.
    }) ?? { data: null };
    return () => {
      mounted = false;
      data?.subscription.unsubscribe();
    };
  }, [checkAuth]);
  useEffect(() => {
    if (authorized) {
      setLoading(true);
      void refresh();
    } else {
      generation.current++;
      setBooks([]);
      setEpisodes([]);
    }
  }, [authorized, refresh]);
  if (!isConfigured)
    return (
      <div className="studio-unavailable">
        <BrandIcon name="pen" size={36} />
        <h1>Hubungkan Studio ke Supabase</h1>
        <p>
          Untuk mengaktifkan login dan publikasi, isi variabel VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY, lalu
          jalankan migrasi V2 dan daftarkan akun penulis.
        </p>
        <B to="/" className="studio-primary">
          Kembali ke Library
        </B>
      </div>
    );
  if (authLoading) return <Busy text="Memverifikasi akses Studio…" />;
  if (!user)
    return (
      <Login
        theme={theme}
        preference={preference}
        onPreferenceChange={setPreference}
        onSuccess={() => void checkAuth()}
      />
    );
  if (!authorized)
    return (
      <div className="studio-unavailable">
        <BrandIcon name="lock" size={35} />
        <h1>Akun belum memiliki izin penulis</h1>
        <p>
          Masuk dengan akun yang sudah terdaftar di tabel qr_author_members. Keanggotaan harus diberikan oleh admin
          database, bukan lewat browser.
        </p>
        {error && <p className="studio-error">{error}</p>}
        <button className="studio-light-button" onClick={() => void supabase?.auth.signOut()}>
          Keluar akun
        </button>
      </div>
    );
  if (loading) return <Busy />;
  return (
    <Workspace
      path={path}
      user={user}
      books={books}
      episodes={episodes}
      refresh={refresh}
      theme={theme}
      preference={preference}
      onPreferenceChange={setPreference}
    />
  );
}
