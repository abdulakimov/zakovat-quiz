import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement>;

function base(props: IconProps, children: React.ReactNode) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M20 8v6" />
      <path d="M23 11h-6" />
    </>,
  );
}

export function BoxIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </>,
  );
}

export function PresentationIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M2 3h20" />
      <path d="M4 3v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3" />
      <path d="M12 16v5" />
      <path d="M8 21h8" />
      <path d="m9 9 2 2 4-4" />
    </>,
  );
}

export function ChevronDownIcon(props: IconProps) {
  return base(props, <path d="m6 9 6 6 6-6" />);
}

export function MenuIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </>,
  );
}

export function UserIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </>,
  );
}

export function SettingsIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M12 3a2 2 0 0 1 2 2v.3a7.7 7.7 0 0 1 1.7.7l.2-.2a2 2 0 1 1 2.8 2.8l-.2.2c.3.5.5 1.1.7 1.7H19a2 2 0 1 1 0 4h-.3a7.7 7.7 0 0 1-.7 1.7l.2.2a2 2 0 1 1-2.8 2.8l-.2-.2a7.7 7.7 0 0 1-1.7.7V19a2 2 0 1 1-4 0v-.3a7.7 7.7 0 0 1-1.7-.7l-.2.2a2 2 0 1 1-2.8-2.8l.2-.2a7.7 7.7 0 0 1-.7-1.7H5a2 2 0 1 1 0-4h.3a7.7 7.7 0 0 1 .7-1.7l-.2-.2a2 2 0 1 1 2.8-2.8l.2.2a7.7 7.7 0 0 1 1.7-.7V5a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="12" r="3" />
    </>,
  );
}

export function LogOutIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>,
  );
}

export function UserPlusIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M20 8v6" />
      <path d="M23 11h-6" />
    </>,
  );
}

export function ArrowUpRightIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </>,
  );
}

export function PencilIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>,
  );
}

export function CopyIcon(props: IconProps) {
  return base(
    props,
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>,
  );
}

export function LinkIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 5" />
      <path d="M14 11a5 5 0 0 0-7.07 0L5.52 12.4a5 5 0 1 0 7.07 7.07L14 19" />
    </>,
  );
}

export function MoreHorizontalIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </>,
  );
}

export function TrashIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </>,
  );
}

export function EyeIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>,
  );
}

export function EyeOffIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M10.6 5.1A11.8 11.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.1" />
      <path d="M6.7 6.7C4.1 8.5 2 12 2 12s3.5 7 10 7c1.9 0 3.5-.6 4.9-1.4" />
      <path d="m2 2 20 20" />
      <path d="M14.1 14.1A3 3 0 0 1 9.9 9.9" />
    </>,
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return base(props, <path d="m15 18-6-6 6-6" />);
}

export function ChevronRightIcon(props: IconProps) {
  return base(props, <path d="m9 18 6-6-6-6" />);
}

export function PlayIcon(props: IconProps) {
  return base(props, <path d="m8 5 11 7-11 7V5Z" />);
}

export function PauseIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M10 5v14" />
      <path d="M14 5v14" />
    </>,
  );
}

export function RotateCcwIcon(props: IconProps) {
  return base(
    props,
    <>
      <path d="M3 2v6h6" />
      <path d="M3 8a9 9 0 1 0 3-4.7L3 6" />
    </>,
  );
}

export function HelpCircleIcon(props: IconProps) {
  return base(
    props,
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 1 1 5.2 2c-.6.6-1.3 1-1.8 1.5-.3.3-.5.7-.5 1.5" />
      <path d="M12 17h.01" />
    </>,
  );
}
