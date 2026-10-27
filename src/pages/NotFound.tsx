import { Link } from "react-router";

export default function NotFound({ message = "We couldn't find that page." }: { message?: string }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <div className="text-5xl" aria-hidden>
        🧭
      </div>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Lost?</h1>
      <p className="mt-2 text-slate-600">{message}</p>
      <Link to="/" className="mt-6 inline-block rounded-xl bg-slate-900 px-5 py-2.5 font-semibold text-white">
        Back to dashboard
      </Link>
    </div>
  );
}
