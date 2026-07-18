"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setToken(session.access_token);
        fetchProfile(session.access_token);
      }
    });
  }, [router]);

  const fetchProfile = async (accessToken: string) => {
    try {
      // Use the Cloudflare Worker API
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <button onClick={handleLogout} className="text-gray-500 hover:text-gray-900">Logout</button>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {profile?.role === 'student' ? (
              <StudentDashboard profile={profile} token={token!} />
            ) : (
              <CompanyDashboard profile={profile} token={token!} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StudentDashboard({ profile, token }: { profile: any, token: string }) {
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/recommendations`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setRecommendations(Array.isArray(data) ? data : []))
    .catch(console.error);
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 shadow sm:rounded-lg">
        <h2 className="text-xl font-bold mb-4">Welcome, {profile.full_name}</h2>
        <p className="text-gray-600">Role: Student</p>
      </div>

      <div className="bg-white p-6 shadow sm:rounded-lg">
        <h3 className="text-lg font-medium mb-4">Recommended Internships</h3>
        {recommendations.length === 0 ? (
          <p className="text-gray-500">No recommendations found yet. Try updating your profile.</p>
        ) : (
          <ul className="space-y-4">
            {recommendations.map((internship: any) => (
              <li key={internship.id} className="border p-4 rounded-md">
                <h4 className="font-bold">{internship.title}</h4>
                <p className="text-sm text-gray-500">{internship.companies?.company_name}</p>
                <p className="mt-2 text-gray-700">{internship.description}</p>
                {internship.score && <p className="text-xs text-blue-500 mt-2">Match Score: {internship.score.toFixed(2)}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CompanyDashboard({ profile, token }: { profile: any, token: string }) {
  return (
    <div className="bg-white p-6 shadow sm:rounded-lg">
      <h2 className="text-xl font-bold mb-4">Welcome, {profile.full_name}</h2>
      <p className="text-gray-600">Role: Company Owner</p>
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-4">Your Internships</h3>
        {/* Render company internships and ability to post new ones */}
        <p className="text-sm text-gray-500">Feature coming soon.</p>
      </div>
    </div>
  );
}
