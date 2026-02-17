"use client";

import { signOut } from "next-auth/react";

export default function UnauthorisedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-updraft-deep via-updraft-bar to-updraft-bright-purple">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl text-center">
        <div className="mb-6 flex flex-col items-center">
          <img
            src="/logo-mark.png"
            alt="Updraft"
            className="mb-4 h-16 w-16"
          />
          <h1 className="font-poppins text-xl font-bold text-updraft-deep">
            Access Denied
          </h1>
        </div>

        <p className="mb-2 text-sm text-gray-600">
          Your Google account is not linked to an authorised user.
        </p>
        <p className="mb-6 text-xs text-gray-400">
          Contact the CCRO team to request access.
        </p>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full rounded-lg bg-updraft-bright-purple px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-updraft-deep"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
