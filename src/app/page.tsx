import { redirect } from 'next/navigation';

// The middleware sends signed-in users to /dashboard and everyone else to /login; this is a fallback.
export default function Home() {
  redirect('/dashboard');
}
