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
  authCreateUser,
  onAuthUsersList,
  onAuthUserUpdated,
  onAuthUserDeleted,
  onAuthReady,
  isAuthReady,
} from '../game/multiplayer';
import { uploadAvatar } from '../game/auth';
import { ACHIEVEMENTS } from '../game/constants';
import { Icon } from '@iconify/react';
import { ICONS, ACHIEVEMENT_ICON_KEYS, type IconKey } from '../game/icons';

interface UserEntry {
  login: string;
  name: string;
  charId: string;
  role: string;
  avatar: string;
  admin: boolean;
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

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'users' | 'players' | 'money' | 'achievements'>('users');
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [players, setPlayers] = useState<PlayerEntry[]>([]);
  const [customAchs, setCustomAchs] = useState<CustomAchievement[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newLogin, setNewLogin] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
  const [newCharId, setNewCharId] = useState('');
  const [newAdmin, setNewAdmin] = useState(false);

  const [editUser, setEditUser] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPass, setEditPass] = useState('');
  const [editCharId, setEditCharId] = useState('');
  const [editAdmin, setEditAdmin] = useState(false);

  const [moneyTarget, setMoneyTarget] = useState('');
  const [moneyAmount, setMoneyAmount] = useState('');

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

    // Wait for auth reconnect to complete before requesting users
    const fetchUsers = () => authGetUsers();
    if (isAuthReady()) {
      fetchUsers();
    }
    onAuthReady(fetchUsers);

    // Fallback retries in case auth ready fires before listener is set
    const t1 = setTimeout(fetchUsers, 1000);
    const t2 = setTimeout(fetchUsers, 3000);
    adminGetPlayers();
    adminGetAchievements();
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadAvatar(file);
    if (result) {
      setNewAvatar(result.url);
      setNewCharId(result.charId);
    }
  };

  const handleAddUser = () => {
    if (!newLogin.trim()) return showError('Введите email');
    if (!newCharId) return showError('Загрузите спрайт');
    authCreateUser({
      login: newLogin.trim(),
      charId: newCharId,
      avatar: newAvatar,
      admin: newAdmin,
    });
    showSuccess(`Игрок "${newLogin}" создан — ждём первый вход`);
    setNewLogin(''); setNewAvatar(''); setNewCharId(''); setNewAdmin(false);
    // Server sends auth:users-list after create, but retry just in case
    setTimeout(() => authGetUsers(), 500);
    setTimeout(() => authGetUsers(), 1500);
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
      charId: editCharId || undefined,
      avatar: newAvatar || undefined,
      password: editPass.length > 0 ? editPass : undefined,
      admin: editAdmin,
    });
    setEditUser(null);
  };

  const handleEditAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadAvatar(file);
    if (result) {
      setNewAvatar(result.url);
      setEditCharId(result.charId);
    }
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
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon icon={ICONS.admin} width={20} height={20} />
            ADMIN PANEL
          </span>
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={onClose} className="win-btn" style={{ fontWeight: 'bold' }}>X</button>
          </div>
        </div>
        <div style={{ padding: 16, maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
            <button onClick={() => setTab('users')} className={`px-btn small${tab === 'users' ? ' accent' : ''}`} style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon icon={ICONS.users} width={20} height={20} />
              USERS ({users.length})
            </button>
            <button onClick={() => setTab('players')} className={`px-btn small${tab === 'players' ? ' accent' : ''}`} style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon icon={ICONS.players} width={20} height={20} />
              PLAYERS ({players.length})
            </button>
            <button onClick={() => setTab('money')} className={`px-btn small${tab === 'money' ? ' accent' : ''}`} style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon icon={ICONS.coins} width={20} height={20} />
              MONEY
            </button>
            <button onClick={() => setTab('achievements')} className={`px-btn small${tab === 'achievements' ? ' accent' : ''}`} style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon icon={ICONS.trophy} width={20} height={20} />
              ACHIEVEMENTS
            </button>
          </div>

          {/* Error/Success */}
          {error && <div style={{ padding: '6px 10px', marginBottom: 10, background: 'var(--px-panel)', border: '1px solid var(--px-danger)', color: 'var(--px-danger)', fontSize: 9 }}>{error}</div>}
          {success && <div style={{ padding: '6px 10px', marginBottom: 10, background: 'var(--px-panel)', border: '1px solid var(--px-accent)', color: 'var(--px-accent)', fontSize: 9 }}>{success}</div>}

          {/* === USERS TAB === */}
          {tab === 'users' && (
            <div>
              <div className="px-panel" style={{ padding: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 8 }}>ДОБАВИТЬ ИГРОКА</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input className="px-input" placeholder="Email игрока" value={newLogin} onChange={e => setNewLogin(e.target.value)} style={{ fontSize: 10, flex: 1 }} />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label className="px-btn small" style={{ fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon icon={ICONS.camera} width={18} height={18} />
                    ЗАГРУЗИТЬ СПРАЙТ
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                  </label>
                  {newAvatar && <img src={newAvatar} alt="" style={{ width: 40, height: 80, objectFit: 'contain', imageRendering: 'pixelated', border: '1px solid var(--px-border-dark)' }} />}
                  <label style={{ fontSize: 9, color: 'var(--px-text-dim)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', marginLeft: 8 }}>
                    <input type="checkbox" checked={newAdmin} onChange={e => setNewAdmin(e.target.checked)} />
                      <Icon icon={ICONS.star} width={18} height={18} style={{ color: 'var(--px-accent)' }} />
                    ADMIN
                  </label>
                  <div style={{ flex: 1 }} />
                  <button onClick={handleAddUser} className="px-btn accent small" style={{ fontSize: 10 }} disabled={!newLogin.trim() || !newCharId}>ADD PLAYER</button>
                </div>
              </div>

              <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 6 }}>ВСЕ ПОЛЬЗОВАТЕЛИ</div>
              {users.length === 0 && <div style={{ fontSize: 10, color: 'var(--px-text-dim)', padding: 20, textAlign: 'center' }}>No users</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {users.map(u => (
                  <div key={u.login} className="px-panel" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    {u.avatar ? (
                      <img src={u.avatar} alt="" style={{ width: 32, height: 32, objectFit: 'cover', objectPosition: 'center', imageRendering: 'pixelated', border: '1px solid var(--px-border-dark)' }} />
                    ) : (
                      <div style={{ width: 32, height: 32, background: 'var(--px-panel-header)', border: '1px solid var(--px-border-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>?</div>
                    )}
                    <div style={{ minWidth: 80 }}>
                      <div style={{ fontSize: 10, color: 'var(--px-title)' }}>{u.name || '—'}</div>
                      <div style={{ fontSize: 8, color: 'var(--px-text-dim)' }}>{u.login}</div>
                    </div>
                    <div style={{ fontSize: 8, color: 'var(--px-text-dim)' }}>{u.charId}</div>
                    <div style={{ fontSize: 8, color: 'var(--px-text-dim)' }}>{u.role || '—'}</div>
                    {u.admin && (
                      <div style={{ fontSize: 8, color: 'var(--px-accent)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon icon={ICONS.star} width={16} height={16} />
                        ADMIN
                      </div>
                    )}
                    {!u.name && <div style={{ fontSize: 8, color: 'var(--px-accent)' }}>ожидает входа</div>}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                      <button onClick={() => { setEditUser(u.login); setEditName(u.name); setEditRole(u.role); setEditPass(''); setEditCharId(u.charId); setEditAdmin(u.admin); }} className="px-btn small" style={{ fontSize: 8, padding: '3px 8px' }}>EDIT</button>
                      <button onClick={() => handleDeleteUser(u.login)} className="px-btn danger small" style={{ fontSize: 8, padding: '3px 8px' }}>DEL</button>
                    </div>
                  </div>
                ))}
              </div>

              {editUser && (
                <div className="px-panel" style={{ padding: 10, marginTop: 12, borderColor: 'var(--px-accent)' }}>
                  <div style={{ fontSize: 9, color: 'var(--px-accent)', marginBottom: 8 }}>EDIT: {editUser}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <input className="px-input" placeholder="Name" value={editName} onChange={e => { const v = e.target.value; setEditName(v.charAt(0).toUpperCase() + v.slice(1)); }} style={{ flex: 1, fontSize: 10 }} />
                    <input className="px-input" placeholder="Role" value={editRole} onChange={e => { const v = e.target.value; setEditRole(v.charAt(0).toUpperCase() + v.slice(1)); }} style={{ flex: 1, fontSize: 10 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <input className="px-input" type="password" placeholder="New pass (optional)" value={editPass} onChange={e => setEditPass(e.target.value)} style={{ flex: 1, fontSize: 10 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontSize: 9, color: 'var(--px-text-dim)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input type="checkbox" checked={editAdmin} onChange={e => setEditAdmin(e.target.checked)} />
                    <Icon icon={ICONS.star} width={18} height={18} style={{ color: 'var(--px-accent)' }} />
                      ADMIN
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <label className="px-btn small" style={{ fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon icon={ICONS.camera} width={18} height={18} />
                      НОВЫЙ СПРАЙТ
                      <input type="file" accept="image/*" onChange={handleEditAvatarUpload} style={{ display: 'none' }} />
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setEditUser(null)} className="px-btn small" style={{ fontSize: 9 }}>CANCEL</button>
                      <button onClick={() => handleUpdateUser(editUser)} className="px-btn accent small" style={{ fontSize: 9 }}>SAVE</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === PLAYERS TAB === */}
          {tab === 'players' && (
            <div>
              {players.length === 0 && <div style={{ fontSize: 10, color: 'var(--px-text-dim)', padding: 20, textAlign: 'center' }}>No player data yet</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {players.map(p => (
                  <div key={p.key} className="px-panel" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--px-title)', minWidth: 100 }}>{p.name}</div>
                    <div style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>{p.charId}</div>
                    <div style={{ fontSize: 9, color: 'var(--px-accent)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon icon={ICONS.coin} width={18} height={18} />
                      {p.coins}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--px-text-dim)' }}>Lv.{p.level}</div>
                    <div style={{ fontSize: 9, color: 'var(--px-text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon icon={ICONS.trophy} width={18} height={18} />
                      {p.achievements.length}
                    </div>
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
                    {players.map(p => <option key={p.key} value={p.key}>{p.name} ({p.coins})</option>)}
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
                  <div key={p.key} onClick={() => setMoneyTarget(p.key)} className="px-panel" style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 10, borderColor: moneyTarget === p.key ? 'var(--px-accent)' : undefined, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--px-text)' }}>{p.name}</span>
                    <span style={{ color: 'var(--px-accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon icon={ICONS.coin} width={16} height={16} />
                      {p.coins}
                    </span>
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
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 8, color: 'var(--px-text-dim)', marginBottom: 4 }}>ICON</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, padding: 8, background: 'var(--px-panel)', border: '1px solid var(--px-border-dark)', borderRadius: 6 }}>
                      {ACHIEVEMENT_ICON_KEYS.map((key) => (
                        <div
                          key={key}
                          onClick={() => setAchIcon(key)}
                          style={{
                            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: achIcon === key ? 'var(--px-accent)' : 'transparent',
                            border: `2px solid ${achIcon === key ? 'var(--px-accent)' : 'var(--px-border-dark)'}`,
                            borderRadius: 4, cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          <Icon icon={ICONS[key]} width={22} height={22} style={{ color: achIcon === key ? 'white' : 'var(--px-text)' }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'var(--px-panel)', border: '1px solid var(--px-border-dark)', borderRadius: 4 }}>
                      <span style={{ fontSize: 8, color: 'var(--px-text-dim)' }}>Selected:</span>
                        <Icon icon={ICONS[achIcon as IconKey] || achIcon} width={20} height={20} />
                      <span style={{ fontSize: 9, color: 'var(--px-text)' }}>{achIcon}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 8, color: 'var(--px-text-dim)', marginBottom: 4 }}>NAME</div>
                      <input className="px-input" placeholder="Achievement name" value={achName} onChange={(e) => setAchName(e.target.value)} style={{ width: '100%', fontSize: 10 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 8, color: 'var(--px-text-dim)', marginBottom: 4 }}>DESCRIPTION</div>
                      <input className="px-input" placeholder="Achievement description" value={achDesc} onChange={(e) => setAchDesc(e.target.value)} style={{ width: '100%', fontSize: 10 }} />
                    </div>
                    <button onClick={handleCreateAchievement} className="px-btn accent small" style={{ fontSize: 10, marginTop: 8, width: '100%' }} disabled={!achName.trim() || !achDesc.trim()}>CREATE</button>
                  </div>
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
                    {allAchs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <button onClick={handleGrantAchievement} className="px-btn accent small" style={{ fontSize: 10 }}>GRANT</button>
                </div>
              </div>

              <div style={{ fontSize: 9, color: 'var(--px-text-dim)', marginBottom: 6 }}>ALL ACHIEVEMENTS ({allAchs.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {allAchs.map(a => (
                  <div key={a.id} className="px-panel" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
                    <Icon icon={ICONS[a.icon as IconKey] || a.icon} width={22} height={22} />
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
