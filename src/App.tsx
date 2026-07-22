import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TreeListPage from './pages/TreeListPage';
import TreeEditorPage from './pages/TreeEditorPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/trees"
              element={
                <ProtectedRoute>
                  <TreeListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trees/:id"
              element={
                <ProtectedRoute>
                  <TreeEditorPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/trees" replace />} />
            <Route path="*" element={<Navigate to="/trees" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
