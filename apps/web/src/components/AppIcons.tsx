import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function createIcon(children: ReactNode) {
  return function Icon(props: IconProps) {
    return (
      <svg
        aria-hidden="true"
        className={`icon ${props.className ?? ""}`.trim()}
        fill="none"
        height="16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        viewBox="0 0 16 16"
        width="16"
        {...props}
      >
        {children}
      </svg>
    );
  };
}

export const PlusIcon = createIcon(<path d="M8 3.25v9.5M3.25 8h9.5" />);

export const CloseIcon = createIcon(<path d="M4 4l8 8M12 4l-8 8" />);

export const SearchIcon = createIcon(
  <>
    <circle cx="7" cy="7" r="3.75" />
    <path d="M9.7 9.7l2.8 2.8" />
  </>,
);

export const SettingsIcon = createIcon(
  <>
    <circle cx="8" cy="8" r="2.1" />
    <path d="M8 2.5v1.1M8 12.4v1.1M12.4 8h1.1M2.5 8h1.1M11.9 4.1l-.8.8M4.9 11.1l-.8.8M11.9 11.9l-.8-.8M4.9 4.9l-.8-.8" />
  </>,
);

export const SaveIcon = createIcon(
  <>
    <path d="M3.2 3.2h7.8l1.8 1.8v7.8H3.2Z" />
    <path d="M5.2 3.2v3.1h4.5V3.2M5.4 12h5.2" />
  </>,
);

export const HistoryIcon = createIcon(
  <>
    <path d="M3 5.2A5.2 5.2 0 1 1 3.8 11" />
    <path d="M3 2.9v2.7h2.7" />
    <path d="M8 5.2V8l2 1.2" />
  </>,
);

export const EnvironmentIcon = createIcon(
  <>
    <circle cx="8" cy="8" r="5.4" />
    <path d="M2.8 8h10.4M8 2.6c1.3 1.4 2 3.3 2 5.4s-.7 4-2 5.4M8 2.6C6.7 4 6 5.9 6 8s.7 4 2 5.4" />
  </>,
);

export const CookieIcon = createIcon(
  <>
    <path d="M10.9 3.3a2.3 2.3 0 0 0 1.8 2.4 2.4 2.4 0 0 0-1.6 3 2.2 2.2 0 0 0 .9 4.2A5.2 5.2 0 1 1 10.9 3.3Z" />
    <circle cx="6.1" cy="6.2" r=".4" fill="currentColor" stroke="none" />
    <circle cx="7.9" cy="8.4" r=".4" fill="currentColor" stroke="none" />
    <circle cx="5.3" cy="9.4" r=".4" fill="currentColor" stroke="none" />
  </>,
);

export const CollectionIcon = createIcon(
  <>
    <rect height="2.4" rx="0.8" width="9.2" x="3.4" y="3.1" />
    <rect height="2.4" rx="0.8" width="9.2" x="3.4" y="6.8" />
    <rect height="2.4" rx="0.8" width="9.2" x="3.4" y="10.5" />
  </>,
);

export const FolderIcon = createIcon(
  <>
    <path d="M2.7 4.4h3l1.2 1.2h6.4v5.4a1.2 1.2 0 0 1-1.2 1.2H3.9A1.2 1.2 0 0 1 2.7 11V4.4Z" />
  </>,
);

export const RequestIcon = createIcon(
  <>
    <path d="M4.2 2.8h5l2.6 2.6v7.8H4.2Z" />
    <path d="M9.2 2.8v2.6h2.6M5.7 8h4.6M5.7 10.1h3.2" />
  </>,
);

export const HttpIcon = createIcon(
  <>
    <path d="M8 2.6c2.9 0 5.2 2.3 5.2 5.2S10.9 13 8 13 2.8 10.7 2.8 7.8 5.1 2.6 8 2.6Z" />
    <path d="M2.8 7.8h10.4M8 2.8c1.2 1.2 1.8 3 1.8 5S9.2 11.6 8 12.8M8 2.8c-1.2 1.2-1.8 3-1.8 5S6.8 11.6 8 12.8" />
  </>,
);

export const TrpcIcon = createIcon(
  <>
    <circle cx="4" cy="4.2" r="1.1" />
    <circle cx="12" cy="4.2" r="1.1" />
    <circle cx="8" cy="11.8" r="1.1" />
    <path d="M4.9 4.9 7.2 10M11.1 4.9 8.8 10M5.1 4.2h5.8" />
  </>,
);

export const LoaderIcon = createIcon(
  <>
    <path d="M8 2.6a5.4 5.4 0 1 1-3.8 1.6" />
    <path d="M8 2.6V1.6" />
  </>,
);

export const DownloadIcon = createIcon(
  <>
    <path d="M8 2.8v6.1M5.6 6.8L8 9.2l2.4-2.4" />
    <path d="M3.2 11.8h9.6" />
  </>,
);

export const UploadIcon = createIcon(
  <>
    <path d="M8 9.3V3.2M5.6 5.6L8 3.2l2.4 2.4" />
    <path d="M3.2 11.8h9.6" />
  </>,
);

export const RestoreIcon = createIcon(
  <>
    <path d="M3 5.1V2.9h2.2" />
    <path d="M3.2 5.1A5.2 5.2 0 1 1 8 13.2" />
  </>,
);

export const LogoutIcon = createIcon(
  <>
    <path d="M6.2 3.2H3.6v9.6h2.6" />
    <path d="M8.1 5.4l2.7 2.6-2.7 2.6M10.8 8H5.7" />
  </>,
);

export const ChevronDownIcon = createIcon(<path d="M4.2 6.1L8 9.9l3.8-3.8" />);

export const ChevronRightIcon = createIcon(<path d="M6.1 4.2L9.9 8l-3.8 3.8" />);
