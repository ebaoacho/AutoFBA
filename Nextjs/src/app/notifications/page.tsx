'use client';

import { useState } from 'react';

export default function NotificationsPage() {
  const [chatworkRoomId, setChatworkRoomId] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('https://autofba.net/notify/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ room_id: chatworkRoomId }),
      });

      if (res.ok) {
        setMessage(`✅ Chatwork通知先（Room ID: ${chatworkRoomId}）を保存しました`);
      } else {
        const error = await res.text();
        setMessage(`❌ 保存に失敗しました: ${error}`);
      }
    } catch (err) {
      console.error(err);
      setMessage('❌ 通信エラーが発生しました');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#3c4043] font-sans">
      <main className="py-12 px-6">
        <div className="max-w-xl md:max-w-3xl mx-auto bg-white border border-[#dadce0] rounded-lg shadow-sm p-6 md:p-10">
          <h1 className="text-2xl md:text-3xl font-semibold text-center mb-6 text-[#202124]">
            Chatwork 通知設定
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6 text-sm md:text-base">
            <div className="text-left">
              <label className="block text-[#5f6368] mb-1 font-medium">Chatwork ルームID</label>
              <input
                type="text"
                value={chatworkRoomId}
                onChange={(e) => setChatworkRoomId(e.target.value)}
                placeholder="例: 123456789"
                className="w-full px-4 py-2 md:py-3 border border-[#dadce0] rounded focus:ring-2 focus:ring-[#1a73e8] focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full md:w-auto px-6 py-2 md:py-3 bg-[#1a73e8] text-white rounded hover:bg-[#1967d2] transition-colors"
            >
              設定を保存
            </button>

            {message && (
              <p
                className={`font-medium mt-2 ${
                  message.startsWith('✅') ? 'text-green-700' : 'text-red-600'
                }`}
              >
                {message}
              </p>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
