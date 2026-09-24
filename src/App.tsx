import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactFlowProvider } from '@xyflow/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider } from './i18n/I18nContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TreeListPage from './pages/TreeListPage';
import TreeEditorPage from './pages/TreeEditorPage';
import ShareViewPage from './pages/ShareViewPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import FeedbackPage from './pages/FeedbackPage';
import FeaturesPage from './pages/FeaturesPage';
import ProfilePage from './pages/ProfilePage';
import ViewTracker from './components/ViewTracker';

const queryClient = new QueryClient();

/**
 * The home page.
 *
 * Signed-in visitors go straight to their trees; everyone else — including
 * search-engine crawlers, which never hold a session — gets the public
 * landing page. This used to be an unconditional redirect to /trees, which
 * bounced crawlers on to /login and left the site with nothing to index.
 */
function HomeRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return user ? <Navigate to="/trees" replace /> : <FeaturesPage />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <I18nProvider>
          <AuthProvider>
            <ViewTracker />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/features" element={<FeaturesPage />} />
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
                    <ReactFlowProvider>
                      <TreeEditorPage />
                    </ReactFlowProvider>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              {/* Public landing for visitors & crawlers; /trees for members */}
              <Route path="/" element={<HomeRoute />} />
              <Route path="/share/:id" element={<ShareViewPage />} />
              <Route path="*" element={<HomeRoute />} />
            </Routes>
          </AuthProvider>
        </I18nProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
