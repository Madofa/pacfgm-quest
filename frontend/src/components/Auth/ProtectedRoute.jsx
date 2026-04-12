import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { usuari, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-game)',
        fontSize: 'var(--font-size-game-md)',
        color: 'var(--color-neon-green)',
      }}>
        CARGANDO...
      </div>
    );
  }

  return usuari ? children : <Navigate to="/login" replace />;
}
