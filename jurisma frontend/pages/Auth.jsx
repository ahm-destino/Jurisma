import React, { useState } from "react";
import { Scale, Eye, EyeOff, Loader2, Mail, Lock, User, Briefcase } from "lucide-react";
import { Input } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function Auth({ onCancel, onSuccess }) {
  const { login, register, error: authError } = useAuth();
  const { addToast } = useToast();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("student");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setError("");
    setLoading(true);

    const result = await login(email, password);

    setLoading(false);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || "Login failed. Please try again.");
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError("Please fill in all required fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError("");
    setLoading(true);

    const result = await register(name, email, password, role);

    setLoading(false);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || "Registration failed. Please try again.");
    }
  };

  const handleGoogleSignIn = () => {
    // Google OAuth implementation - redirect to Google OAuth endpoint
    // For now, showing an alert as this requires backend setup
    addToast({ type: 'warning', message: "Google Sign-In requires backend OAuth configuration. Please contact your administrator." });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (isLogin) {
        handleLogin();
      } else {
        handleRegister();
      }
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <Scale className="h-10 w-10 text-amber-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-slate-500">
            {isLogin ? "Sign in to your secure portal" : "Join the Jurisma community"}
          </p>
        </div>

        <div className="space-y-4">
          {!isLogin && (
            <>
              <Input
                label="Full Name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
              />

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">I am a</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("student")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${role === "student"
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-slate-300 text-slate-600 hover:border-slate-400"
                      }`}
                  >
                    <User size={18} />
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("lawyer")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${role === "lawyer"
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-slate-300 text-slate-600 hover:border-slate-400"
                      }`}
                  >
                    <Briefcase size={18} />
                    Lawyer
                  </button>
                </div>
              </div>
            </>
          )}

          <Input
            label="Email Address"
            type="email"
            placeholder="attorney@law.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {isLogin && (
            <div className="text-right">
              <button
                type="button"
                className="text-sm text-amber-600 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          )}

          {(error || authError) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error || authError}</p>
            </div>
          )}

          <Button
            onClick={isLogin ? handleLogin : handleRegister}
            className="w-full h-11 flex items-center justify-center"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isLogin ? "Signing in..." : "Creating account..."}
              </>
            ) : (
              isLogin ? "Sign In" : "Create Account"
            )}
          </Button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500">or continue with</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full h-11 flex items-center justify-center gap-3 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-slate-700 font-medium">Google</span>
          </button>

          <div className="text-center mt-6">
            <span className="text-slate-500">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              type="button"
              onClick={switchMode}
              className="text-amber-600 font-medium hover:underline"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </div>

          <Button
            variant="ghost"
            onClick={onCancel}
            className="w-full h-11 text-slate-500 hover:bg-slate-50"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
