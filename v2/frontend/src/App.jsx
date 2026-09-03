import React, { Component, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import CitizenDashboard from './pages/CitizenDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import CommissionerDashboard from './pages/CommissionerDashboard';
import AdminDashboard from './pages/AdminDashboard';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{color: 'red', padding: '2rem'}}>
            <h1>Something went wrong.</h1>
            <pre>{this.state.error.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);
    if (loading) return <div style={{color:'white'}}>Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    return children;
};

const RoleRouter = () => {
    const { user, loading } = useContext(AuthContext);
    
    if (loading) return <div style={{color:'white'}}>Loading routing...</div>;
    if (!user) return <Navigate to="/login" replace />;
    
    switch (user.role) {
        case 'CITIZEN': return <CitizenDashboard />;
        case 'OFFICER_L1': return <OfficerDashboard />;
        case 'COMMISSIONER_L2': return <CommissionerDashboard />;
        case 'ADMIN': return <AdminDashboard />;
        default: return <div>Unknown Role {user.role}</div>;
    }
};

function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route 
                            path="/*" 
                            element={
                                <ProtectedRoute>
                                    <RoleRouter />
                                </ProtectedRoute>
                            } 
                        />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
