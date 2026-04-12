import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.jsx';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import SkillTree from './components/SkillTree/SkillTree';
import BattleScreen from './components/Battle/BattleScreen';
import Leaderboard from './components/Leaderboard/Leaderboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/skill-tree" element={<ProtectedRoute><SkillTree /></ProtectedRoute>} />
          <Route path="/battle/:nodeId" element={<ProtectedRoute><BattleScreen /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App
