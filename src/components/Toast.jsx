import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Toast() {
  const { toastMessage, toastVisible } = useAuth();

  return (
    <div
      id="toast"
      role="status"
      className={toastVisible ? 'show' : ''}
    >
      {toastMessage}
    </div>
  );
}
