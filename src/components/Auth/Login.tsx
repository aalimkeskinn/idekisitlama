import React, { useState } from 'react';
import { School } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Input from '../UI/Input';
import Button from '../UI/Button';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, password);
    
    if (!result.success) {
      setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ide-gray-50 to-ide-primary-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-ide-2xl p-8 border border-ide-gray-200">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            {/* FIXED: Logo background stays white */}
            <div className="p-4 bg-white rounded-full shadow-ide-lg border border-gray-100">
              <img 
                src="https://cv.ide.k12.tr/images/ideokullari_logo.png" 
                alt="İDE Okulları Logo"
                className="w-16 h-16 object-contain"
                onError={(e) => {
                  // Fallback if logo fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="w-12 h-12 text-blue-600 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>';
                  }
                }}
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-ide-gray-900 mb-2">İDE Okulları</h1>
          <h2 className="text-xl font-semibold text-ide-primary-600 mb-2">Ders Planlama Sistemi</h2>
          <p className="text-ide-gray-600">Yönetici Girişi</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="E-posta"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="email@ide.k12.tr"
            required
          />
          
          <Input
            label="Şifre"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            required
          />

          {error && (
            <div className="p-4 bg-ide-accent-50 border border-ide-accent-200 rounded-lg">
              <p className="text-ide-accent-800 text-sm font-medium">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            variant="ide-primary"
            size="lg"
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="ide-loading w-5 h-5 mr-3"></div>
                Giriş yapılıyor...
              </div>
            ) : (
              'Giriş Yap'
            )}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-ide-gray-500">
            Firebase Authentication ile güvenli giriş
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;