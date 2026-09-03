import React, { createContext, useState, useEffect } from 'react';
import api from '../api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.get('/auth/me')
                .then(res => setUser(res.data))
                .catch(() => {
                    localStorage.removeItem('token');
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (username, password) => {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        
        const res = await api.post('/auth/token', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        localStorage.setItem('token', res.data.access_token);
        setUser({ role: res.data.role, name: res.data.name });
        
        // Fetch full profile
        const profile = await api.get('/auth/me');
        setUser(profile.data);
    };

    const register = async (userData) => {
        const res = await api.post('/auth/signup', userData);
        localStorage.setItem('token', res.data.access_token);
        setUser({ role: res.data.role, name: res.data.name, username: res.data.username });
        
        // Fetch full profile
        const profile = await api.get('/auth/me');
        setUser(profile.data);
        return profile.data;
    };

    const updateProfile = async (profileData) => {
        await api.put('/auth/profile', profileData);
        const profile = await api.get('/auth/me');
        setUser(profile.data);
        return profile.data;
    };

    const refreshUser = async () => {
        const profile = await api.get('/auth/me');
        setUser(profile.data);
        return profile.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, updateProfile, refreshUser, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
