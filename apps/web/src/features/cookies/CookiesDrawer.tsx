import { api } from "../../services/api";
import { Drawer } from "../../components/Drawer";
import { useCookiesStore } from "../../store/cookiesStore";
import { useLayoutStore } from "../../store/layoutStore";

export function CookiesDrawer() {
  const open = useLayoutStore((state) => state.showCookies);
  const toggle = useLayoutStore((state) => state.toggleCookies);
  const cookies = useCookiesStore((state) => state.cookies);
  const fetchCookies = useCookiesStore((state) => state.fetchCookies);

  const grouped = cookies.reduce<Record<string, typeof cookies>>((accumulator, cookie) => {
    accumulator[cookie.domain] = accumulator[cookie.domain] ?? [];
    accumulator[cookie.domain].push(cookie);
    return accumulator;
  }, {});

  return (
    <Drawer title="Cookie Jar" open={open} onClose={toggle}>
      <div className="drawer-stack">
        {Object.entries(grouped).map(([domain, domainCookies]) => (
          <div className="drawer-card" key={domain}>
            <div className="drawer-card__header">
              <strong>{domain}</strong>
              <button
                className="button button-subtle"
                onClick={async () => {
                  await api.cookies.clearDomain(domain);
                  await fetchCookies();
                }}
                type="button"
              >
                Clear Domain
              </button>
            </div>

            <div className="drawer-list">
              {domainCookies.map((cookie) => (
                <div className="drawer-list__row" key={cookie.id}>
                  <div>
                    <div>{cookie.name}</div>
                    <small>
                      {cookie.path} {cookie.value}
                    </small>
                  </div>
                  <button
                    className="button button-subtle"
                    onClick={async () => {
                      await api.cookies.delete(cookie.id);
                      await fetchCookies();
                    }}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Drawer>
  );
}
