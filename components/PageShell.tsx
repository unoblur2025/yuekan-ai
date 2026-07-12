import SiteFooter from "./SiteFooter";
import SiteNav from "./SiteNav";

export default function PageShell({ children }: { children: React.ReactNode }) {
  return <><SiteNav/><main>{children}</main><SiteFooter/></>;
}
