"use client";

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';

export default function Home() {
  const [authorized, setAuthorized] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('light'); // Default to light theme
  const correctPasscode = '2025';

  // Check if user was previously authorized (from localStorage)
  useEffect(() => {
    const auth = localStorage.getItem('compensatorAuthorized');
    if (auth === 'true') {
      setAuthorized(true);
    }

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('compensatorTheme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Handle theme toggle
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('compensatorTheme', newTheme);
  };

  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    // Simulate a small delay for better UX
    setTimeout(() => {
      if (passcode === correctPasscode) {
        setAuthorized(true);
        localStorage.setItem('compensatorAuthorized', 'true');
        setError('');
      } else {
        setError('Invalid passcode. Please try again.');
        setPasscode('');
      }
      setLoading(false);
    }, 600);
  };

  return (
    <>
      <Head>
        <link href="https://fonts.cdnfonts.com/css/neue-haas-grotesk-display-pro" rel="stylesheet" />
        <title>Home | Compensator</title>
        <meta name="description" content="Access the Compound delegate marketplace for decentralized finance" />
      </Head>
      <div className={`${theme === 'dark' ? 'dark' : ''} grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-white dark:bg-gray-900`}>
        {authorized ? (
          <main className="flex flex-col gap-4 row-start-2 items-center text-lg font-bold sm:items-start">
            <div className="flex items-center gap-1">
              <Image
                src={theme === 'dark' ? "/logo-white.png" : "/logo.png"}
                alt="Compensator Logo"
                width={48}
                height={48}
                className="mb-3 mx-auto rounded-lg ml-[-12px]"
              />
              <h1 className="text-2xl text-gray-900 dark:text-white mb-2 ml-[-8px]">Compensator</h1>
              <span className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 text-xs font-medium px-2.5 py-0.5 rounded-full">Beta</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400">Coming Soon</p>
            <button
              onClick={() => {
                localStorage.removeItem('compensatorAuthorized');
                setAuthorized(false);
              }}
              className="text-sm text-gray-500 dark:text-gray-400 underline mt-8 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Sign out
            </button>
          </main>
        ) : (
          // Passcode gate - shown until correct passcode is entered
          <main className="flex flex-col row-start-2 items-center text-center max-w-md w-full">
            <div className="mb-2">
              <Image
                src={theme === 'dark' ? "/logo-white.png" : "/logo.png"}
                alt="Compensator Logo"
                width={54}
                height={54}
                className="mb-3 mx-auto rounded-lg"
              />
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Compensator</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Compound delegate marketplace</p>
            </div>

            <div className="rounded-xl w-full">
              <form onSubmit={handlePasscodeSubmit} className="flex flex-col gap-3 w-full">
                <div>
                  <label htmlFor="passcode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-left mb-1">
                    Passcode
                  </label>
                  <input
                    id="passcode"
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter passcode"
                    className="p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-100 dark:focus:ring-emerald-500 transition-all bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-start">
                    <svg className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                    </svg>
                    <div>
                      {error}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className={`${
                    loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-600'
                  } bg-emerald-500 text-white py-3 px-6 rounded-full font-medium transition-colors flex justify-center items-center`}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </>
                  ) : (
                    'Unlock'
                  )}
                </button>
              </form>
            </div>

            <div className="flex flex-col gap-2 mt-4 text-xs text-gray-500 dark:text-gray-400 max-w-xs">
              <p>
                First time here? This is an invite-only beta. Please contact your Compound delegate for access.
              </p>
            </div>
          </main>
        )}

        {/* Footer content */}
        <footer className="row-start-3 flex gap-2 flex-wrap items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          © 2025 compensator.io
          <button
            onClick={toggleTheme}
            className="text-sm text-gray-500 dark:text-gray-400 underline hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </footer>
      </div>
    </>
  );
}