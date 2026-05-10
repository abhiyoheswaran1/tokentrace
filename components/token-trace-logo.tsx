import * as React from "react";

export function TokenTraceLogo({
  className,
  label = "TokenTrace logo"
}: {
  className?: string;
  label?: string;
}) {
  return (
    <svg
      aria-label={label}
      role="img"
      viewBox="0 0 64 64"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="14" fill="#147b74" />
      <path
        d="M17 42h11V29h12V18h8"
        fill="none"
        stroke="#fcfaf8"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5"
      />
      <circle cx="17" cy="42" r="5" fill="#fbd041" />
      <circle cx="40" cy="29" r="5" fill="#fcfaf8" />
      <circle cx="48" cy="18" r="5" fill="#f2742c" />
      <path
        d="M17 19h12"
        stroke="#fcfaf8"
        strokeLinecap="round"
        strokeWidth="4"
        opacity="0.72"
      />
      <path
        d="M17 29h7"
        stroke="#fcfaf8"
        strokeLinecap="round"
        strokeWidth="4"
        opacity="0.48"
      />
    </svg>
  );
}
