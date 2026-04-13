import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Login from './components/Auth/Login';
import ResetPassword from './components/Auth/ResetPassword';
import VerificacioEmail from './components/Auth/VerificacioEmail';
import AjudaPanel from './components/Ajuda/AjudaPanel';
import Dashboard from './components/Dashboard/Dashboard';
import SkillTree from './components/SkillTree/SkillTree';
import BattleScreen from './components/Battle/BattleScreen';
import Leaderboard from './components/Leaderboard/Leaderboard';
import MonitorPanel from './components/Monitor/MonitorPanel';
import ParePanel from './components/Pare/ParePanel';
import RepasPanel from './components/Repas/RepasPanel';
import FeedbackWidget from './components/Feedback/FeedbackWidget';

// Redirigeix monitors al panel corresponent
function HomeRoute() {
  const { usuari } = useAuth();
  if (usuari?.rol === 'monitor' && usuari?.subtipus === 'pare') return <Navigate to="/pare" replace />;
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
          <Route path="/pare"    element={<ProtectedRoute><ParePanel /></ProtectedRoute>} />
          <Route path="/repas"   element={<ProtectedRoute><RepasPanel /></ProtectedRoute>} />
          <Route path="/ajuda"   element={<ProtectedRoute><AjudaPanel /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <FeedbackWidget />
        <div style={{
          position: 'fixed', bottom: 6, right: 10,
          fontFamily: 'var(--font-game)', fontSize: '9px',
          color: 'var(--color-text-disabled)', opacity: 0.5,
          letterSpacing: '1px', pointerEvents: 'none', zIndex: 9999,
        }}>
          v{__APP_VERSION__}
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App
