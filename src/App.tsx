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
  const { isLoading } = useAuth();
  if (isLoading) return null;
  // The home page is the product tour for EVERYONE, signed in or not — it is
  // the page search engines and shared links land on. FeaturesPage already
  // swaps its own CTAs (builder links for guests, "My Trees" for members), so
  // bouncing members straight to their list only hid the tour from them.
  return <FeaturesPage />;
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
              {/* /features was folded into the home page — the server sends a
                  301, this covers in-app navigation */}
              <Route path="/features" element={<Navigate to="/" replace />} />
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
              {/* Guest builder — no account, everything stays in the browser */}
              <Route
                path="/try"
                element={
                  <ReactFlowProvider>
                    <TreeEditorPage />
                  </ReactFlowProvider>
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
