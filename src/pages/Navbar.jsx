// Navbar.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const UserIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export default function Navbar({ userName = 'مستخدم', role = 'student' }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const nameParts = userName.trim().split(/\s+/);
  let displayName = nameParts[0];
  if (nameParts.length > 1) {
    const lastIdx = nameParts.length - 1;
    const secondToLast = nameParts[lastIdx - 1];
    const compoundPrefixes = ['أبو', 'ابو'];
    if (compoundPrefixes.includes(secondToLast) && nameParts.length > 2) {
      displayName = `${nameParts[0]} ${secondToLast} ${nameParts[lastIdx]}`;
    } else {
      displayName = `${nameParts[0]} ${nameParts[lastIdx]}`;
    }
  }

  return (
    <>
      <header className="dashboard-header">
        <button onClick={handleLogout} className="logout-button">
          <span className="logout-text">خروج</span>
          <span className="logout-icon"><LogoutIcon /></span>
        </button>

        <div className="logo-section">
          <div className="logo-wrapper-dash">
            <div className="logo-glow"></div>
            <img src="https://i.imgur.com/VAjkMeH.png" alt="شعار المركز" className="logo-img-dash" />
          </div>
        </div>

        <div className="user-section">
          <div className="user-info">
            <div className="user-text">
              <span className="user-name">{displayName}</span>
            </div>
            <div className="user-avatar">
              <UserIcon />
            </div>
          </div>
        </div>
      </header>

      <style>{`
        .dashboard-header {
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 12px 32px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          border-radius: 0 0 32px 32px;
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 8px 32px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6);
          position: sticky;
          top: 0;
          z-index: 1000;
          direction: rtl;
        }

        .logo-section { justify-self: center; display: flex; align-items: center; justify-content: center; }
        .logo-img-dash { height: 65px; width: auto; object-fit: contain; position: relative; z-index: 2; }

        .user-section { justify-self: end; display: flex; align-items: center; gap: 20px; }
        .user-info { display: flex; align-items: center; gap: 12px; }

        .user-name {
          font-weight: 700;
          color: #1e293b;
          font-size: 0.95rem;
          font-family: 'Cairo', sans-serif;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 150px;
        }

        .user-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border: 2px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          flex-shrink: 0;
        }

        .logout-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          color: #475569;
          padding: 10px 22px;
          border-radius: 30px;
          font-family: 'Cairo', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          justify-self: start;
          width: fit-content;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
        }

        .logout-button:hover {
          background-color: #fef2f2;
          color: #dc2626;
          border-color: #fecaca;
          box-shadow: 0 4px 16px rgba(220, 38, 38, 0.12);
          transform: translateY(-1px);
        }

        .logout-icon { display: flex; align-items: center; justify-content: center; }

        /* ========== Responsive - Mobile ========== */
        @media (max-width: 768px) {
          .dashboard-header {
            padding: 10px 12px;
            border-radius: 0 0 24px 24px;
          }

          .logo-img-dash { height: 44px; }

          /* إخفاء نص "خروج" في الموبايل */
          .logout-text { display: none; }

          /* تحويل الزر لشكل أيقونة دائري */
          .logout-button {
            padding: 10px;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            justify-content: center;
            gap: 0;
          }

          /* تقليل مساحة الاسم لتوفير مساحة أكبر للشعار */
          .user-name {
            font-size: 0.8rem;
            max-width: 70px;
          }
          
          .user-avatar {
            width: 38px;
            height: 38px;
          }

          .user-section { gap: 10px; }
          .user-info { gap: 8px; }
        }
      `}</style>
    </>
  );
}
