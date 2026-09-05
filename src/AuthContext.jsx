import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId, email) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw error;

      // Enforce web-admin-only access: if this profile's role isn't
      // 'admin' (e.g. it's a resident account from the mobile app), don't
      // let them into the dashboard — sign them straight back out.
      if (data?.role && data.role !== "admin") {
        await rejectNonAdmin();
        return;
      }

      setProfile({ ...data, email: data?.email || email });
    } catch {
      // profiles row may not exist yet (e.g. brand new account) — fall back
      // to whatever we know from the auth session itself.
      setProfile({ id: userId, email, name: email });
    }
  };

  // Called any time we discover the signed-in account isn't an admin
  // account (e.g. a resident's mobile-app account). Kicks them out
  // immediately rather than leaving them on an admin page.
  const rejectNonAdmin = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id, session.user.email);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          loadProfile(newSession.user.id, newSession.user.email);
        } else {
          setProfile(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Enforce web-admin-only access right away, before returning success,
    // so a resident's mobile-app account can't get into the dashboard even
    // for a moment.
    const userId = data.user?.id;
    if (userId) {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (profileRow?.role && profileRow.role !== "admin") {
        await supabase.auth.signOut();
        throw new Error(
          "This account doesn't have admin access. Please use the Maylaud mobile app instead."
        );
      }
    }

    return data;
  };

  // Creates a real Supabase auth user AND a row in the same `profiles`
  // table the mobile app reads/writes, so this account is a first-class
  // citizen of the same backend (not a separate "web-only" login).
  //
  // NOTE: `profiles` only has SELECT/UPDATE policies, no INSERT policy —
  // rows are created by a database trigger on auth.users, not by the
  // client. So we pass name/phone as auth metadata (the trigger reads
  // this) instead of trying to insert/upsert a profiles row ourselves,
  // which would fail RLS.
  const signUp = async ({ name, email, phone, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone } },
    });
    if (error) throw error;

    // If email confirmation is off, we already have a session and can set
    // this account's role to admin right now (the trigger's inserted row
    // defaults to role 'resident'), and mark it verified since there's no
    // separate OTP step in this case. If confirmation IS required instead,
    // there's no session yet — completeSignupProfile() handles both of
    // these after the OTP step, once we're actually authenticated as this
    // user.
    if (data.session && data.user?.id) {
      const { error: roleError } = await supabase
        .from("profiles")
        .update({ role: "admin", is_verified: true })
        .eq("id", data.user.id);
      if (roleError) console.warn("Could not set admin role:", roleError.message);
    }

    return data;
  };

  // Matches the mobile app's registration_otp_screen.dart exactly: a 6-digit
  // code sent to the user's email, verified via type "signup".
  const verifySignupOtp = async (email, token) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });
    if (error) throw error;
    return data;
  };

  // After OTP verification the user is confirmed and has a real session, so
  // auth.uid() now resolves and the existing "Users update own profile"
  // policy allows this. The row itself already exists (created by the
  // auth.users trigger) — we UPDATE it, not upsert/insert, since there's no
  // insert policy on profiles for the client to use. Successfully verifying
  // the OTP is exactly what `is_verified` exists to track, so flip it here.
  const completeSignupProfile = async ({ userId, name, phone }) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name, phone, role: "admin", is_verified: true })
        .eq("id", userId);
      if (error) console.warn("Profile update after OTP failed:", error.message);
    } catch (err) {
      console.warn("Profile update after OTP failed:", err.message);
    }
  };

  const resendSignupOtp = async (email) => {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) throw error;
  };

  // Same pattern, for password-reset codes (type "recovery"), mirroring
  // forgot_password_otp_screen.dart on mobile.
  const requestPasswordReset = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  const verifyRecoveryOtp = async (email, token) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "recovery",
    });
    if (error) throw error;
    return data;
  };

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || null,
        profile,
        loading,
        isAuthenticated: !!session,
        signIn,
        signUp,
        signOut,
        verifySignupOtp,
        resendSignupOtp,
        completeSignupProfile,
        requestPasswordReset,
        verifyRecoveryOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
