export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="mb-4 text-3xl font-bold">Welcome to the Gallery</h1>
      <p className="mb-6 max-w-md text-center text-sm text-gray-600">
        Sign in with Google to view your Supabase-hosted images in the protected
        gallery.
      </p>
      <a
        href="/login"
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
      >
        Sign in with Google
      </a>
    </main>
  );
}
