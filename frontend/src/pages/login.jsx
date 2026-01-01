import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Login(){
    // state for form inputs
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // state for loading and errors
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // get login function from AuthContext
    const { login } = useAuth();

    const navigate = useNavigate();

    // handle form submission
    const handleSubmit = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      setError('');

      if (!email || !password) {
        setError('Please enter both email and password');
        return;
      }

      try {
        setLoading(true);
        await login(email, password);
        navigate('/dashboard');
      } catch (err) {
        setError(err.message || 'Login failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    return(
        <div> 
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
												<form onSubmit={handleSubmit} autoComplete="off">
													<p className="lg:text-lg md:text-md text-sm font-bold text-[#483D3D] pb-2">EMAIL</p>
                        	<input type="email" name="email" placeholder='Enter Email' className="bg-[#ffffff] rounded-lg border border-black focus:border-gray-300 focus:bg-white focus:ring-2 focus:ring-gray-200 md:h-11 h-10 lg:w-95 md:w-75 w-70 text-base outline-none text-gray-900 py-1 px-3 resize-none leading-6 shadow-lg" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} required />

													<p className="lg:text-lg md:text-md text-sm font-bold text-[#483D3D] pt-5 pb-2">PASSWORD</p>
                       		<input type="password" name="password" placeholder='Enter Password' className="bg-[#ffffff] rounded-lg border border-black focus:border-gray-300 focus:bg-white focus:ring-2 focus:ring-gray-200 md:h-11 h-10 lg:w-95 md:w-75 w-70 text-base outline-none text-gray-900 py-1 px-3 resize-none leading-6 shadow-lg" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required />

													<br />

													<div className="pt-8 flex gap-6 pb-3">
                            <button type="submit" 
                                className="text-white lg:text-lg md:text-md text-sm bg-[#990100] border-0 py-[6px] px-6 lg:w-95 md:w-75 w-70 focus:outline-none hover:bg-[#ad3332] rounded text-lg contact-btn transform hover:scale-105 transition duration-300 ease-in-out hover:shadow-lg text-center rounded-3xl font-bold cursor-pointer">
                                {loading ? 'LOGGING IN ...' : 'LOGIN'}
                            </button>
                       	 	</div>
												</form>

                        <button type="button" onClick={(e) => e.preventDefault()} className="underline font-bold text-[#483D3D] hover:text-[#7e7777] md:text-md text-sm bg-transparent border-none cursor-pointer p-0">Forgot Password?</button>	                     
                    </div>
                </div>

                
            </div>
            
        </div>
    );
}
 
export default Login;

