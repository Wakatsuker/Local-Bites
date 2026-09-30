import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProfileModal() {
  const {
    isProfileModalOpen,
    closeProfile,
    currentProfile,
    currentFarm,
    selectedRole,
    logout,
    updateProfileData,
  } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [farmName, setFarmName] = useState('');
  const [location, setLocation] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentProfile) {
      setFullName(currentProfile.full_name || '');
      setPhone(currentProfile.phone || '');
    }
    if (currentFarm) {
      setFarmName(currentFarm.farm_name || '');
      setLocation(currentFarm.location || '');
    }
  }, [currentProfile, currentFarm, isProfileModalOpen]);

  if (!isProfileModalOpen) return null;

  const accountRole = currentProfile?.role === 'seller' ? 'Seller' : 'Buyer';
  const portalRole = selectedRole === 'seller' ? 'Seller' : 'Buyer';
  const roleDisplay = `${accountRole} account • ${portalRole} portal`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage('');

    try {
      await updateProfileData(fullName, phone, farmName, location);
      setStatusMessage('Profile saved.');
      setTimeout(() => {
        closeProfile();
      }, 700);
    } catch (err) {
      setStatusMessage(err.message || 'Error updating profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="profile-modal open">
      <div className="profile-card">
        <div className="checkout-heading">
          <h2>Edit profile</h2>
          <button
            className="close-cart profile-close"
            type="button"
            onClick={closeProfile}
          >
            &times;
          </button>
        </div>

        <form className="profile-form" id="profile-form" onSubmit={handleSubmit}>
          <label>
            Display name
            <input
              name="full_name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>

          <label>
            Phone number
            <input
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <label>
            Account type
            <input name="role" readOnly value={roleDisplay} />
          </label>

          {currentFarm && (
            <div id="farm-fields">
              <label>
                Farm name
                <input
                  name="farm_name"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                />
              </label>
              <label>
                Farm location
                <input
                  name="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </label>
            </div>
          )}

          {statusMessage && (
            <div className="profile-message" id="profile-message">
              {statusMessage}
            </div>
          )}

          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save profile'}
          </button>
          <button
            type="button"
            className="profile-logout clear-cart"
            onClick={logout}
          >
            Log out
          </button>
        </form>
      </div>
    </section>
  );
}
