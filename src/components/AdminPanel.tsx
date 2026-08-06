'use client';

import { useState, useEffect } from 'react';
import {
  adminGetPlayers,
  adminAdjustMoney,
  adminGetAchievements,
  adminCreateAchievement,
  adminGrantAchievement,
  onAdminPlayersList,
  onAdminAchievementsList,
  onAdminError,
  onAdminMoneyAdjusted,
  authGetUsers,
  authUpdateUser,
  authDeleteUser,
  onAuthUsersList,
  onAuthUserUpdated,
  onAuthUserDeleted,
} from '../game/multiplayer';
import { uploadAvatar } from '../game/auth';
import { ACHIEVEMENTS } from '../game/constants';

interface UserEntry {
  login: string;
  name: string;
  charId: string;
  color: string;
  role: string;
  avatar: string;
}

interface PlayerEntry {
  key: string;
  name: string;
  charId: string;
  coins: number;
  level: number;
  achievements: string[];
}

interface CustomAchievement {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

const CHAR_OPTIONS = [
  { id: 'pers1', name: 'Олег' },
  { id: 'pers2', name: 'Аня' },
  { id: 'pers3', name: 'Алиса' },
  { id: 'pers4', name: 'Кирилл' },
  { id: 'pers5', name: 'Саша' },
];

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'users' | 'players' | 'money' | 'achievements'>('users');
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [players, setPlayers] = useState<PlayerEntry[]>([]);
  const [customAchs, setCustomAchs] = useState<CustomAchievement[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add user form
  const [newLogin, setNewLogin] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Разработчик');
  const [newAvatar, setNewAvatar] = useState('');

  // Edit user
  const [editUser, setEditUser] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPass, setEditPass] = useState('');

  // Money form
  const [moneyTarget, setMoneyTarget] = useState('');
  const [moneyAmount, setMoneyAmount] = useState('');

  // Achievement form
  const [achName, setAchName] = useState('');
  const [achIcon, setAchIcon] = useState('🏆');
  const [achDesc, setAchDesc] = useState('');
  const [grantTarget, setGrantTarget] = useState('');
  const [grantAchId, setGrantAchId] = useState('');

  const showError = (msg: string) => { setError(msg); setSuccess(''); setTimeout(() => setError(''), 3000); };
  const showSuccess = (msg: string) => { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 3000); };

  useEffect(() => {
    onAdminPlayersList((list) => setPlayers(list));
    onAdminAchievementsList((list) => setCustomAchs(list));
    onAdminError((msg) => showError(msg));
    onAdminMoneyAdjusted((data) => showSuccess(`Money updated: ${data.coins} coins`));
    onAuthUsersList((list) => setUsers(list));
    onAuthUserUpdated(() => showSuccess('User updated'));
    onAuthUserDeleted(() => showSuccess('User deleted'));

    authGetUsers();
    adminGetPlayers();
    adminGetAchievements();
  }, []);

  const handleAddUser = async () => {
    if (!newLogin.trim() || !newPass || !newName.trim()) return showError('Заполни логин, пароль и имя');
    const charId = 'custom_' + Date.now();
    const color = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    // Use socket to register
    const { authRegister } = await import('../game/multiplayer');
    authRegister({
      login: newLogin.trim(),
      password: newPass,
      name: newName.trim(),
      charId,
      color,
      role: newRole,
      avatar: newAvatar,
    });
    showSuccess(`Игрок "${newName}" создан`);
    setNewLogin(''); setNewPass(''); setNewName(''); setNewRole('Разработчик'); setNewAvatar('');
    setTimeout(() => authGetUsers(), 500);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadAvatar(file);
    if (url) setNewAvatar(url);
  };

  const handleDeleteUser = (login: string) => {
    authDeleteUser(login);
    setTimeout(() => authGetUsers(), 500);
  };

  const handleUpdateUser = (login: string) => {
    authUpdateUser({
      login,
      name: editName || undefined,
      role: editRole || undefined,
      password: editPass.length > 0 ? editPass : undefined,
    });
    setEditUser(null);
  };

  const handleAdjustMoney = (amount: number) => {
    if (!moneyTarget) return showError('Select player');
    const num = parseInt(moneyAmount);
    if (isNaN(num) || num <= 0) return showError('Enter valid amount');
    adminAdjustMoney(moneyTarget, amount > 0 ? num : -num);
  };

  const handleCreateAchievement = () => {
    if (!achName.trim() || !achDesc.trim()) return showError('Fill all fields');
    adminCreateAchievement(achName.trim(), achIcon, achDesc.trim());
    setAchName(''); setAchDesc(''); setAchIcon('🏆');
  };

  const handleGrantAchievement = () => {
    if (!grantTarget || !grantAchId) return showError('Select player and achievement');
    adminGrantAchievement(grantTarget, grantAchId);
    showSuccess('Achievement granted');
  };

  const allAchs = [...ACHIEVEMENTS, ...customAchs];

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="px-panel" style={{ width: 640, maxHeight: '85vh', overflow: 'hidden' }}>
        <div className="px-panel-header">
          <span>⚙️ ADMIN PANEL</span>
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={onClose} className="win-btn" style={{ fontWeight: 'bold' }}>X</button>
          </div>
        </div>
        <div style={{ padding: 16, maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
            <button onClick={() => setTab('users')} className={`px-btn small${tab === 'users' ? ' accent' : ''}`} style={{ fontSize: 10 }}>
              👤 USERS ({users.length})
            </button>
            <button onClick={() => setTab('players')} className={`px-btn small${tab === 'players' ? ' accent' : ''}`} style={{ fontSize: 10 }}>
              👥 PLAYERS ({players.length})
            </button>
            <button onClick={() => setTab('money')} className={`px-btn small${tab === 'money' ? ' accent' : ''}`} style={{ fontSize: 10 }}>
              💰 MONEY
            </button>
            <button onClick={() => setTab('achievements')} className={`px-btn small${tab === 'achievements' ? ' accent' : ''}`} style={{ fontSize: 10 }}>
              🏆 ACHIEVEMENTS
            </button>
          </div>

          {/* Error/Success */}
          {error && <div style={{ padding: '6px 10px', marginBottom: 10, background: 'var(--px-panel)', border: '1px solid var(--px-danger)', color: 'var(--px-danger)', fontSize: 9 }}>{error}</div>}
          {success && <div style={{ padding: '6px 10px', marginBottom: 10, background: 'var(--px-panel)', border: '1px solid var(--px-accent)', color: 'var(--px-accent)', fontSize: 9 }}>{success}</div>}

          {/* === USERS TAB === */}
          {tab === 'users' && (
            <div>
              {/* Add new user */}
              <div className="px-panel" style={{ padding: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 8 }}>ДОБАВИТЬ ИГРОКА</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <input className="px-input" placeholder="Login (для входа)" value={newLogin} onChange={e => setNewLogin(e.target.value)} style={{ fontSize: 10 }} />
                  <input className="px-input" type="password" placeholder="Password" value={newPass} onChange={e => setNewPass(e.target.value)} style={{ fontSize: 10 }} />
                  <input className="px-input" placeholder="Name (имя в игре)" value={newName} onChange={e => { const v = e.target.value; setNewName(v.charAt(0).toUpperCase() + v.slice(1)); }} style={{ fontSize: 10 }} />
                  <input className="px-input" placeholder="Role (должность)" value={newRole} onChange={e => { const v = e.target.value; setNewRole(v.charAt(0).toUpperCase() + v.slice(1)); }} style={{ fontSize: 10 }} />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label className="px-btn small" style={{ fontSize: 9, cursor: 'pointer' }}>
                    📷 Аватар
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                  </label>
                  {newAvatar && <img src={newAvatar} alt="" style={{ width: 32, height: 32, objectFit: 'contain', imageRendering: 'pixelated', border: '1px solid var(--px-border-dark)' }} />}
                  <div style={{ flex: 1 }} />
                  <button onClick={handleAddUser} className="px-btn accent small" style={{ fontSize: 10 }}>ADD PLAYER</button>
                </div>
              </div>

              {/* Users list */}
              <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 6 }}>ВСЕ ПОЛЬЗОВАТЕЛИ</div>
              {users.length === 0 && <div style={{ fontSize: 10, color: 'var(--px-text-dim)', padding: 20, textAlign: 'center' }}>No users</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {users.map(u => (
                  <div key={u.login} className="px-panel" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    {u.avatar ? (
                      <img src={u.avatar} alt="" style={{ width: 28, height: 28, objectFit: 'contain', imageRendering: 'pixelated', border: '1px solid var(--px-border-dark)' }} />
                    ) : (
                      <div style={{ width: 28, height: 28, background: u.color, border: '1px solid var(--px-border-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>?</div>
                    )}
                    <div style={{ minWidth: 80 }}>
                      <div style={{ fontSize: 10, color: 'var(--px-title)' }}>{u.name}</div>
                      <div style={{ fontSize: 8, color: 'var(--px-text-dim)' }}>{u.login}</div>
                    </div>
                    <div style={{ fontSize: 8, color: 'var(--px-text-dim)' }}>{u.charId}</div>
                    <div style={{ fontSize: 8, color: 'var(--px-text-dim)' }}>{u.role}</div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                      <button onClick={() => { setEditUser(u.login); setEditName(u.name); setEditRole(u.role); setEditPass(''); }} className="px-btn small" style={{ fontSize: 8, padding: '3px 8px' }}>EDIT</button>
                      <button onClick={() => handleDeleteUser(u.login)} className="px-btn danger small" style={{ fontSize: 8, padding: '3px 8px' }}>DEL</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Edit modal */}
              {editUser && (
                <div className="px-panel" style={{ padding: 10, marginTop: 12, borderColor: 'var(--px-accent)' }}>
                  <div style={{ fontSize: 9, color: 'var(--px-accent)', marginBottom: 8 }}>EDIT: {editUser}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <input className="px-input" placeholder="Name" value={editName} onChange={e => { const v = e.target.value; setEditName(v.charAt(0).toUpperCase() + v.slice(1)); }} style={{ flex: 1, fontSize: 10 }} />
                    <input className="px-input" placeholder="Role" value={editRole} onChange={e => { const v = e.target.value; setEditRole(v.charAt(0).toUpperCase() + v.slice(1)); }} style={{ flex: 1, fontSize: 10 }} />
                    <input className="px-input" type="password" placeholder="New pass (optional)" value={editPass} onChange={e => setEditPass(e.target.value)} style={{ flex: 1, fontSize: 10 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditUser(null)} className="px-btn small" style={{ fontSize: 9 }}>CANCEL</button>
                    <button onClick={() => handleUpdateUser(editUser)} className="px-btn accent small" style={{ fontSize: 9 }}>SAVE</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === PLAYERS TAB (saved game data) === */}
          {tab === 'players' && (
            <div>
              {players.length === 0 && <div style={{ fontSize: 10, color: 'var(--px-text-dim)', padding: 20, textAlign: 'center' }}>No player data yet</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {players.map(p => (
                  <div key={p.key} className="px-panel" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--px-title)', minWidth: 100 }}>{p.name}</div>
                    <div style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>{p.charId}</div>
                    <div style={{ fontSize: 9, color: 'var(--px-accent)', marginLeft: 'auto' }}>🪙 {p.coins}</div>
                    <div style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>Lv.{p.level}</div>
                    <div style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>🏆 {p.achievements.length}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === MONEY TAB === */}
          {tab === 'money' && (
            <div>
              <div className="px-panel" style={{ padding: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 8 }}>ADJUST MONEY</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <select value={moneyTarget} onChange={(e) => setMoneyTarget(e.target.value)} className="px-input" style={{ flex: 1, fontSize: 10 }}>
                    <option value="">Select player...</option>
                    {players.map(p => <option key={p.key} value={p.key}>{p.name} ({p.coins} 🪙)</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="px-input" type="number" placeholder="Amount" value={moneyAmount} onChange={(e) => setMoneyAmount(e.target.value)} style={{ width: 100, fontSize: 10 }} />
                  <button onClick={() => handleAdjustMoney(1)} className="px-btn accent small" style={{ fontSize: 10 }}>+ ADD</button>
                  <button onClick={() => handleAdjustMoney(-1)} className="px-btn danger small" style={{ fontSize: 10 }}>- REMOVE</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {players.map(p => (
                  <div key={p.key} onClick={() => setMoneyTarget(p.key)} className="px-panel" style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 10, borderColor: moneyTarget === p.key ? 'var(--px-accent)' : undefined }}>
                    <span style={{ color: 'var(--px-text)' }}>{p.name}</span>
                    <span style={{ color: 'var(--px-accent)', marginLeft: 6 }}>🪙 {p.coins}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === ACHIEVEMENTS TAB === */}
          {tab === 'achievements' && (
            <div>
              <div className="px-panel" style={{ padding: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 8 }}>CREATE CUSTOM ACHIEVEMENT</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <input className="px-input" placeholder="Icon" value={achIcon} onChange={(e) => setAchIcon(e.target.value)} style={{ width: 60, fontSize: 10, textAlign: 'center' }} />
                  <input className="px-input" placeholder="Name" value={achName} onChange={(e) => setAchName(e.target.value)} style={{ flex: 1, fontSize: 10 }} />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="px-input" placeholder="Description" value={achDesc} onChange={(e) => setAchDesc(e.target.value)} style={{ flex: 1, fontSize: 10 }} />
                  <button onClick={handleCreateAchievement} className="px-btn accent small" style={{ fontSize: 10 }}>CREATE</button>
                </div>
              </div>

              <div className="px-panel" style={{ padding: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 8 }}>GRANT ACHIEVEMENT</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <select value={grantTarget} onChange={(e) => setGrantTarget(e.target.value)} className="px-input" style={{ flex: 1, fontSize: 10 }}>
                    <option value="">Select player...</option>
                    {players.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select value={grantAchId} onChange={(e) => setGrantAchId(e.target.value)} className="px-input" style={{ flex: 1, fontSize: 10 }}>
                    <option value="">Select achievement...</option>
                    {allAchs.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                  </select>
                  <button onClick={handleGrantAchievement} className="px-btn accent small" style={{ fontSize: 10 }}>GRANT</button>
                </div>
              </div>

              <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 6 }}>ALL ACHIEVEMENTS ({allAchs.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {allAchs.map(a => (
                  <div key={a.id} className="px-panel" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
                    <span style={{ fontSize: 14 }}>{a.icon}</span>
                    <span style={{ color: 'var(--px-title)' }}>{a.name}</span>
                    <span style={{ color: 'var(--px-text-dim)', fontSize: 9, marginLeft: 'auto' }}>{a.desc}</span>
                    {a.id.startsWith('custom_') && <span style={{ fontSize: 8, color: 'var(--px-accent)' }}>CUSTOM</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
