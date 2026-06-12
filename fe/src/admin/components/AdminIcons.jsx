const Icon = ({ children, size = 20, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const SearchIcon = (props) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);

export const RefreshIcon = (props) => (
  <Icon {...props}>
    <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5" />
    <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5" />
  </Icon>
);

export const DownloadIcon = (props) => (
  <Icon {...props}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </Icon>
);

export const UsersIcon = (props) => (
  <Icon {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
);

export const CheckCircleIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12 2.5 2.5L16 9" />
  </Icon>
);

export const ShieldIcon = (props) => (
  <Icon {...props}>
    <path d="M12 3 4 6v5c0 5 3.4 8.8 8 10 4.6-1.2 8-5 8-10V6l-8-3Z" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
);

export const LockIcon = (props) => (
  <Icon {...props}>
    <rect x="5" y="10" width="14" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </Icon>
);

export const UnlockIcon = (props) => (
  <Icon {...props}>
    <rect x="5" y="10" width="14" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 7.5-2" />
  </Icon>
);

export const EditIcon = (props) => (
  <Icon {...props}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
  </Icon>
);

export const CloseIcon = (props) => (
  <Icon {...props}>
    <path d="m6 6 12 12" />
    <path d="m18 6-12 12" />
  </Icon>
);

export const ChevronLeftIcon = (props) => (
  <Icon {...props}>
    <path d="m15 18-6-6 6-6" />
  </Icon>
);

export const ChevronRightIcon = (props) => (
  <Icon {...props}>
    <path d="m9 18 6-6-6-6" />
  </Icon>
);

export const BookIcon = (props) => (
  <Icon {...props}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
  </Icon>
);

export const FileTextIcon = (props) => (
  <Icon {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8" />
    <path d="M8 17h8" />
  </Icon>
);