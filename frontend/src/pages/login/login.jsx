import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Preloader from '../../components/preloader.jsx';
import ConfirmModal from '../../components/confirm-modal.jsx';
import { post } from '../../services/api.js';

const REMEMBERED_EMAIL_KEY = 'rememberedLoginEmail';

function Login(){
    // state for form inputs
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
  const [rememberAccount, setRememberAccount] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStatus, setForgotStatus] = useState('idle');

  useEffect(() => {
    try {
      const rememberedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberAccount(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const passwordInputType = useMemo(() => (showPassword ? 'text' : 'password'), [showPassword]);

    // state for loading and errors
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // get login function from AuthContext
    const { login } = useAuth();

    const navigate = useNavigate();

    const handleForgotPasswordRequest = async () => {
      try {
        if (forgotStatus === 'sending') return;

        const normalizedEmail = String(email || '').trim();
        if (!normalizedEmail) {
          setError('Please enter your email first.');
          return;
        }

        setForgotStatus('sending');
        await post('/auth/password-reset-request', { email: normalizedEmail }, false);
        setForgotStatus('sent');
      } catch (err) {
        console.error(err);
        setError(err?.message || 'Failed to send request. Please try again.');
        setForgotStatus('idle');
      }
    };

    // handle form submission
    const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');

      if (!email || !password) {
        setError('Please enter both email and password');
        return;
      }

      try {
        setLoading(true);

        try {
          if (rememberAccount) {
            window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
          } else {
            window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
          }
        } catch {
          // ignore storage errors
        }

        // get login function from AuthContext
        await login(email, password);
        navigate('/dashboard');

      } catch (err) {
        setError(err.message || 'Login failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const startRevealPassword = (e) => {
        e.preventDefault();
        if (loading) return;
        setShowPassword(true);
    };

    const endRevealPassword = () => {
        setShowPassword(false);
    };
    
    return(
      <div>
        {loading ? <Preloader fullScreen text="LOGGING IN…" /> : null}
            <div className="md:flex md:flex-row h-screen">

                {/* RIGHT SIDE */}

                <div className="lg:basis-8/15 md:bg-[#EDEDED] flex items-center justify-center md:h-screen md:basis-3/7 lg:order-2 md:order-2 order-1 w-full ">

                    <img className = "lg:w-[400px] lg:h-[300px] md:w-[300px] md:h-[200px] w-[150px] h-[100px] md:mt-0 md:mb-0 mt-20 mb-15" src="arise-logo-login-clear-bg.png" alt="Arise Logo" />
                </div>

                {/* LEFT SIDE */}

                <div className="lg:basis-7/15 flex items-center justify-center md:basis-4/7 lg:order-1 md:order-1 order-2">
                    <div>

                        <h1 className="lg:text-4xl md:text-3xl text-2xl font-bold text-[#483D3D] pb-[10px]">SIGN IN</h1>
                        <p className="lg:text-lg md:text-md text-sm pb-[30px]">LOGIN TO YOUR ACCOUNT</p>

                        {/* Error message display */}
                        { error && (
													<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
														{error}
													</div>
                        )}

												{/* Login Form */}
												<form onSubmit={handleSubmit}>
													<p className="lg:text-lg md:text-md text-sm font-bold text-[#483D3D] pb-2">EMAIL</p>
                        	<input type="email" name="email" placeholder='Enter Email' className="bg-[#ffffff] rounded-lg border border-black focus:border-gray-300 focus:bg-white focus:ring-2 focus:ring-gray-200 md:h-11 h-10 lg:w-95 md:w-75 w-70 text-base outline-none text-gray-900 py-1 px-3 resize-none leading-6 shadow-lg" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} required />

													<p className="lg:text-lg md:text-md text-sm font-bold text-[#483D3D] pt-5 pb-2">PASSWORD</p>
                          <div className="relative">
                            <input
                              type={passwordInputType}
                              name="password"
                              placeholder='Enter Password'
                              className="bg-[#ffffff] rounded-lg border border-black focus:border-gray-300 focus:bg-white focus:ring-2 focus:ring-gray-200 md:h-11 h-10 lg:w-95 md:w-75 w-70 text-base outline-none text-gray-900 py-1 px-3 pr-11 resize-none leading-6 shadow-lg"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              disabled={loading}
                              required
                            />
                            <button
                              type="button"
                              aria-label="Hold to show password"
                              onPointerDown={startRevealPassword}
                              onPointerUp={endRevealPassword}
                              onPointerLeave={endRevealPassword}
                              onPointerCancel={endRevealPassword}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') startRevealPassword(e);
                              }}
                              onKeyUp={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') endRevealPassword();
                              }}
                              disabled={loading}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#990100] hover:text-[#ad3332] disabled:opacity-60"
                            >
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M2 12C4.5 7 8 4.5 12 4.5C16 4.5 19.5 7 22 12C19.5 17 16 19.5 12 19.5C8 19.5 4.5 17 2 12Z"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                />
                              </svg>
                            </button>
                          </div>

                          <div className="pt-3 flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="rememberAccount"
                              checked={rememberAccount}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setRememberAccount(checked);
                                if (!checked) {
                                  try {
                                    window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
                                  } catch {
                                    // ignore storage errors
                                  }
                                }
                              }}
                              disabled={loading}
                              className="h-4 w-4"
                            />
                            <label htmlFor="rememberAccount" className="md:text-md text-sm text-[#483D3D]">
                              Always remember this account
                            </label>
                          </div>

													<br />

													<div className="pt-8 flex gap-6 pb-3">
                            <button type="submit" 
                                className="text-white lg:text-lg md:text-md text-sm bg-[#990100] border-0 py-[6px] px-6 lg:w-95 md:w-75 w-70 focus:outline-none hover:bg-[#ad3332] rounded text-lg contact-btn transform hover:scale-105 transition duration-300 ease-in-out hover:shadow-lg text-center rounded-3xl font-bold cursor-pointer">
                                {loading ? 'LOGGING IN ...' : 'LOGIN'}
                            </button>
                       	 	</div>
												</form>

                        <button
                          type="button"
                          className="underline font-bold text-[#483D3D] hover:text-[#7e7777] md:text-md text-sm"
                          onClick={() => setForgotOpen(true)}
                        >
                          Forgot Password?
                        </button>	                     
                            <ConfirmModal
                              open={forgotOpen}
                              title="Forgot Password"
                              message={
                                forgotStatus === 'sent'
                                  ? 'Request sent. Admin/HR will contact you to reset your password.'
                                  : 'For security, password resets are handled by Admin/HR. You can send a request to notify Admin/HR now.'
                              }
                              confirmText={forgotStatus === 'sent' ? 'OK' : 'Send Request'}
                              cancelText={forgotStatus === 'sent' ? null : 'Cancel'}
                              confirmDisabled={forgotStatus === 'sending'}
                              onConfirm={() => {
                                if (forgotStatus === 'sent') {
                                  setForgotOpen(false);
                                  setForgotStatus('idle');
                                  return;
                                }
                                handleForgotPasswordRequest();
                              }}
                              onCancel={() => {
                                setForgotOpen(false);
                                setForgotStatus('idle');
                              }}
                            />
                    </div>
                </div>

                
            </div>
            
        </div>
    );
}
 
export default Login;

