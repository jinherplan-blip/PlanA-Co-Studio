import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import { useNotification } from '../../contexts/NotificationProvider';

interface StageSettingsProps {
    currentUser: User;
    users: User[];
    onAddUser: (user: Omit<User, 'id' | 'avatarUrl'>) => void;
    onUpdateUser: (user: User) => void;
    onDeleteUser: (userId: string) => void;
}

const StageSettings: React.FC<StageSettingsProps> = ({ currentUser, users, onAddUser, onUpdateUser, onDeleteUser }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const { showNotification } = useNotification();

    const openAddModal = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleConfirmDelete = (user: User) => {
        if (user.id === currentUser.id) {
            showNotification('您無法刪除自己的帳號。', 'error');
            return;
        }
        setUserToDelete(user);
    };

    const handleDelete = () => {
        if (userToDelete) {
            onDeleteUser(userToDelete.id);
            setUserToDelete(null);
        }
    };

    const handleSaveUser = (user: Omit<User, 'id' | 'avatarUrl'>, id?: string) => {
        if (id) {
            const existingUser = users.find(u => u.id === id);
            if (existingUser) {
                onUpdateUser({ ...existingUser, ...user });
            }
        } else {
            onAddUser(user);
        }
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const roleBadgeClasses: Record<User['role'], string> = {
        '管理員': 'bg-green-100 text-green-800',
        '編輯者': 'bg-blue-100 text-blue-800',
        '訪客': 'bg-gray-100 text-gray-800',
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-[#2C2C2C]">使用者管理</h2>
                        <p className="text-slate-600">新增、編輯或移除使用者帳號。</p>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="bg-[#FF6B6B] text-white font-semibold py-2 px-4 rounded-2xl shadow-sm hover:bg-[#fa5a5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6B6B] flex items-center"
                    >
                        <PlusIcon /> 新增使用者
                    </button>
                </div>
                <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full bg-white">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">使用者</th>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">職稱</th>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">角色</th>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="border-t hover:bg-slate-50">
                                    <td className="py-3 px-4 text-sm font-medium text-gray-900 flex items-center">
                                        <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full mr-3" />
                                        {user.name}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-700">{user.title}</td>
                                    <td className="py-3 px-4 text-sm text-gray-700">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${roleBadgeClasses[user.role]}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-700 space-x-2">
                                        <button onClick={() => openEditModal(user)} className="text-blue-600 hover:text-blue-800 font-medium">編輯</button>
                                        <button onClick={() => handleConfirmDelete(user)} className="text-red-600 hover:text-red-800 font-medium">刪除</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isModalOpen && (
                <UserFormModal
                    user={editingUser}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveUser}
                />
            )}

            {userToDelete && (
                <Modal
                    isOpen={!!userToDelete}
                    onClose={() => setUserToDelete(null)}
                    title="確認刪除"
                >
                    <p>您確定要刪除使用者「{userToDelete.name}」嗎？此操作無法復原。</p>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button onClick={() => setUserToDelete(null)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-2xl hover:bg-slate-200">取消</button>
                        <button onClick={handleDelete} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-2xl shadow-sm hover:bg-red-700">
                            確認刪除
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

interface UserFormModalProps {
    user: User | null;
    onClose: () => void;
    onSave: (user: Omit<User, 'id' | 'avatarUrl'>, id?: string) => void;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ user, onClose, onSave }) => {
    const [name, setName] = useState(user?.name || '');
    const [title, setTitle] = useState(user?.title || '');
    const [role, setRole] = useState<User['role']>(user?.role || '編輯者');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const userData: Omit<User, 'id' | 'avatarUrl'> = { name, title, role };
        if (password) {
            userData.password = password;
        } else if (!user) { // Require password for new users
            alert("新使用者必須設定密碼。");
            return;
        }
        onSave(userData, user?.id);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={user ? '編輯使用者' : '新增使用者'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">使用者名稱</label>
                    <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]" />
                </div>
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">職稱</label>
                    <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]" />
                </div>
                <div>
                    <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">角色</label>
                    <select id="role" value={role} onChange={e => setRole(e.target.value as User['role'])} className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] bg-white">
                        <option value="管理員">管理員</option>
                        <option value="編輯者">編輯者</option>
                        <option value="訪客">訪客</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">密碼</label>
                    <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={user ? '留空表示不變更' : ''} className="w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]" />
                    <p className="text-xs text-slate-500 mt-1">注意：在正式環境中，密碼應由安全的後端服務進行加密處理。</p>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-2xl hover:bg-slate-200">取消</button>
                    <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-[#FF6B6B] rounded-2xl shadow-sm hover:bg-[#fa5a5a]">
                        儲存變更
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const PlusIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2 -ml-1"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg> );

export default StageSettings;