import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [currentFarm, setCurrentFarm] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null); // 'buyer' | 'seller' | null
  
  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authRoleTarget, setAuthRoleTarget] = useState('buyer');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('localbites-dark') === '1';
  });

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('localbites-dark', darkMode ? '1' : '0');
  }, [darkMode]);

  const toggleTheme = () => setDarkMode((prev) => !prev);

  const showToast = (message, duration = 2400) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, duration);
  };

  const openAuth = (role = 'buyer') => {
    setAuthRoleTarget(role);
    setIsAuthModalOpen(true);
  };

  const closeAuth = () => {
    setIsAuthModalOpen(false);
  };

  const openProfile = () => {
    setIsProfileModalOpen(true);
  };

  const closeProfile = () => {
    setIsProfileModalOpen(false);
  };

  // Ensure user profile in DB
  const ensureProfile = async (user, role) => {
    const { data: existing, error: fetchErr } = await supabase
      .from('profiles')
      .select('id, full_name, phone, role')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (existing) return existing;

    const fullName = user.email?.split('@')[0] || 'LocalBites User';
    const { data: created, error: insertErr } = await supabase
      .from('profiles')
      .insert({ id: user.id, full_name: fullName, role })
      .select('id, full_name, phone, role')
      .single();

    if (insertErr) throw insertErr;
    return created;
  };

  // Ensure seller farm in DB
  const ensureSellerFarm = async (user, profile) => {
    const { data: existing, error: fetchErr } = await supabase
      .from('farms')
      .select('id, farm_name, location')
      .eq('seller_id', user.id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (existing) return existing;

    const { data: created, error: insertErr } = await supabase
      .from('farms')
      .insert({
        seller_id: user.id,
        farm_name: `${profile.full_name}'s Farm`,
        location: 'Digos Valley',
      })
      .select('id, farm_name, location')
      .single();

    if (insertErr) throw insertErr;
    return created;
  };

  const login = async (email, password, role) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (data?.user) {
      const profile = await ensureProfile(data.user, role);
      setCurrentUser(data.user);
      setCurrentProfile(profile);

      if (role === 'seller' || profile.role === 'seller') {
        const farm = await ensureSellerFarm(data.user, profile);
        setCurrentFarm(farm);
      }
      setSelectedRole(role);
      closeAuth();
      showToast(`Welcome back, ${profile.full_name}!`);
    }
  };

  const signup = async (email, password, role) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (!data.session) {
      throw new Error('Account created! Please confirm your email, then sign in.');
    }

    if (data.user) {
      const profile = await ensureProfile(data.user, role);
      setCurrentUser(data.user);
      setCurrentProfile(profile);

      if (role === 'seller') {
        const farm = await ensureSellerFarm(data.user, profile);
        setCurrentFarm(farm);
      }
      setSelectedRole(role);
      closeAuth();
      showToast(`Welcome to LocalBites, ${profile.full_name}!`);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setCurrentProfile(null);
    setCurrentFarm(null);
    setSelectedRole(null);
    closeAuth();
    closeProfile();
    showToast('Signed out successfully');
  };

  const updateProfileData = async (fullName, phone, farmName, location) => {
    if (!currentUser) return;

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentUser.id);

    if (profileErr) throw profileErr;

    if (currentFarm) {
      const { error: farmErr } = await supabase
        .from('farms')
        .update({
          farm_name: farmName.trim(),
          location: location.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('seller_id', currentUser.id);

      if (farmErr) throw farmErr;
      setCurrentFarm((prev) => ({ ...prev, farm_name: farmName, location }));
    }

    setCurrentProfile((prev) => ({ ...prev, full_name: fullName, phone }));
    showToast('Profile saved successfully');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentProfile,
        currentFarm,
        selectedRole,
        setSelectedRole,
        isAuthModalOpen,
        authRoleTarget,
        openAuth,
        closeAuth,
        isProfileModalOpen,
        openProfile,
        closeProfile,
        toastMessage,
        toastVisible,
        showToast,
        darkMode,
        toggleTheme,
        login,
        signup,
        logout,
        updateProfileData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
