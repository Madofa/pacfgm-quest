import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Login from './components/Auth/Login';
import ResetPassword from './components/Auth/ResetPassword';
import VerificacioEmail from './components/Auth/VerificacioEmail';
import Dashboard from './components/Dashboard/Dashboard';
import SkillTree from './components/SkillTree/SkillTree';
import BattleScreen from './components/Battle/BattleScreen';
import Leaderboard from './components/Leaderboard/Leaderboard';
import MonitorPanel from './components/Monitor/MonitorPanel';
import RepasPanel from './components/Repas/RepasPanel';
import FeedbackWidget from './components/Feedback/FeedbackWidget';

// Redirigeix monitors al panel corresponent
function HomeRoute() {
  const { usuari } = useAuth();
  if (usuari?.rol === 'monitor') return <Navigate to="/monitor" replace />;
  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"           element={<Login />} />
          <Route path="/reset-password"  element={<ResetPassword />} />
          <Route path="/verificar-email" element={<VerificacioEmail />} />
          <Route path="/" element={<ProtectedRoute><HomeRoute /></ProtectedRoute>} />
          <Route path="/skill-tree" element={<ProtectedRoute><SkillTree /></ProtectedRoute>} />
          <Route path="/battle/:nodeId" element={<ProtectedRoute><BattleScreen /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/monitor" element={<ProtectedRoute><MonitorPanel /></ProtectedRoute>} />
          <Route path="/repas"   element={<ProtectedRoute><RepasPanel /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <FeedbackWidget />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App
