import Link from "next/link";
import { Home, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4]">
      <div className="text-center space-y-6 px-6 max-w-md">
        {/* Brand icon */}
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-updraft-pale-purple/40">
            <AlertTriangle className="h-8 w-8 text-updraft-bright-purple" />
          </div>
        </div>

        {/* Heading */}
        <div>
          <p className="text-6xl font-bold font-poppins text-updraft-deep">404</p>
          <h1 className="mt-2 text-xl font-semibold text-gray-800">Page not found</h1>
          <p className="mt-2 text-sm text-gray-500">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Return link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-updraft-bright-purple px-5 py-2.5 text-sm font-medium text-white hover:bg-updraft-deep transition-colors"
        >
          <Home size={16} />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
