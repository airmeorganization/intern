import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Internship Engine</h1>
          <nav className="flex space-x-4">
            <Link href="/login" className="text-gray-500 hover:text-gray-900">Login</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
          Find your perfect internship with AI
        </h2>
        <p className="mt-4 text-xl text-gray-500 max-w-2xl">
          Upload your resume, and our semantic search engine will match you with the best opportunities.
        </p>
        <div className="mt-8 flex space-x-4">
          <Link href="/login" className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700">
            Get Started as a Student
          </Link>
          <Link href="/login?role=company" className="bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-md font-medium hover:bg-gray-50">
            Post an Internship
          </Link>
        </div>
      </main>
    </div>
  );
}
