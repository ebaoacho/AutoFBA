'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/app/components/Header';
import { meApi } from '@/app/lib/authApi';
import { checkSPAPIConnection, startSPAPIAuthorization } from '@/app/lib/spapiApi';

type Me = { id: number; username: string; email: string; first_name?: string };

function ConnectAmazonContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authChecked, setAuthChecked] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [hasRefreshToken, setHasRefreshToken] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextPath = searchParams.get('next') || '/products';

  useEffect(() => {
    const status = searchParams.get('status');
    const statusMessage = searchParams.get('message');
    if (status === 'success' && statusMessage) {
      setMessage(statusMessage);
      setError('');
    } else if (status === 'error' && statusMessage) {
      setError(statusMessage);
      setMessage('');
    }
  }, [searchParams]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const user = await meApi();
        const status = await checkSPAPIConnection();
        if (!cancel) {
          setMe(user);
          setHasRefreshToken(status.has_refresh_token);
          setAuthChecked(true);
        }
      } catch {
        if (!cancel) router.replace('/login');
      }
    })();
    return () => {
      cancel = true;
    };
  }, [router]);

  const handleAuthorize = async () => {
    setError('');
    setMessage('');
    setIsSubmitting(true);
    try {
      const data = await startSPAPIAuthorization();
      window.location.href = data.authorization_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Amazon authorization could not be started.');
      setIsSubmitting(false);
    }
  };

  if (!authChecked) return null;

  const displayName = me?.first_name?.trim() || me?.username || 'User';

  return (
    <div className="min-h-screen bg-white text-[#3c4043] font-sans">
      <Header />
      <main className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-semibold text-[#202124] mb-4">Amazon SP-API Connection</h1>
          <p className="text-sm text-[#5f6368] mb-8">
            {displayName} can connect this account to Amazon Seller Central. The refresh token is
            acquired through Amazon authorization and stored encrypted on the server.
          </p>

          <div className="bg-[#f8f9fa] border border-[#dadce0] rounded-lg p-6 mb-8 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-[#202124]">Current connection</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  hasRefreshToken
                    ? 'bg-green-100 text-green-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {hasRefreshToken ? 'Connected' : 'Not connected'}
              </span>
            </div>
            <p className="text-sm text-[#5f6368]">
              Clicking the button below sends you to Seller Central. After approval, the callback
              stores the refresh token and returns you to this page.
            </p>
          </div>

          <div className="bg-[#f1f3f4] border border-[#dadce0] rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-[#202124] mb-4">Flow</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-[#3c4043]">
              <li>Log in to the Amazon seller account you want to connect.</li>
              <li>Click `Connect with Amazon` below.</li>
              <li>Approve the application on Seller Central.</li>
              <li>Return to this page and verify that the status changed to `Connected`.</li>
            </ol>
          </div>

          {message && (
            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleAuthorize}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-[#1a73e8] text-white text-base rounded-lg shadow-md hover:bg-[#1967d2] transition-colors disabled:bg-[#dadce0] disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Redirecting...' : 'Connect with Amazon'}
            </button>
            <button
              type="button"
              onClick={() => router.push(nextPath)}
              className="px-6 py-3 border border-[#dadce0] text-[#3c4043] text-base rounded-lg hover:bg-[#f1f3f4] transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ConnectAmazonPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ConnectAmazonContent />
    </Suspense>
  );
}
