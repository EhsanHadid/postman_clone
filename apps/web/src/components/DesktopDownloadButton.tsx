import { useEffect, useState } from "react";
import { useAppConfigStore } from "../store/appConfigStore";
import { isDesktopRenderer } from "../services/runtime";

type DesktopDownloadButtonProps = {
  className: string;
  label: string;
};

export function DesktopDownloadButton({ className, label }: DesktopDownloadButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const desktopDownloadUrl = useAppConfigStore((state) => state.desktopDownloadUrl);
  const desktopDownloadUrls = useAppConfigStore((state) => state.desktopDownloadUrls);
  const fetchAppConfig = useAppConfigStore((state) => state.fetchAppConfig);
  const windowsUrl = desktopDownloadUrls.windows || desktopDownloadUrl;
  const linuxUrl = desktopDownloadUrls.linux;
  const hasDownload = Boolean(windowsUrl || linuxUrl);

  useEffect(() => {
    void fetchAppConfig();
  }, [fetchAppConfig]);

  if (isDesktopRenderer() || !hasDownload) {
    return null;
  }

  return (
    <>
      <button className={className} onClick={() => setDialogOpen(true)} type="button">
        {label}
      </button>

      {dialogOpen ? (
        <div className="dialog-backdrop" role="presentation">
          <section
            aria-labelledby="desktop-download-title"
            aria-modal="true"
            className="dialog card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="dialog__header">
              <div className="dialog__title-wrap">
                <h3 id="desktop-download-title">Download Desktop App</h3>
                <div className="dialog__description">Choose the installer for your computer.</div>
              </div>
              <button
                aria-label="Close download dialog"
                className="icon-button"
                onClick={() => setDialogOpen(false)}
                type="button"
              >
                x
              </button>
            </header>

            <div className="dialog__content">
              <div className="desktop-download-grid">
                {windowsUrl ? (
                  <a
                    className="desktop-download-option"
                    href={windowsUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>Windows</span>
                    <strong>.exe</strong>
                  </a>
                ) : (
                  <div className="desktop-download-option desktop-download-option--disabled">
                    <span>Windows</span>
                    <strong>.exe unavailable</strong>
                  </div>
                )}

                {linuxUrl ? (
                  <a
                    className="desktop-download-option"
                    href={linuxUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>Debian / Ubuntu</span>
                    <strong>.deb</strong>
                  </a>
                ) : (
                  <div className="desktop-download-option desktop-download-option--disabled">
                    <span>Debian / Ubuntu</span>
                    <strong>.deb unavailable</strong>
                  </div>
                )}
              </div>
            </div>

            <footer className="dialog__footer">
              <button
                className="button button-subtle"
                onClick={() => setDialogOpen(false)}
                type="button"
              >
                Cancel
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
