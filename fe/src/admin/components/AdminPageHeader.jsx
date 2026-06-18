import shared from "../AdminShared.module.css";

export default function AdminPageHeader({
  title,
  subtitle,
  children,
}) {
  return (
    <div className={shared.pageHeader}>
      <div className={shared.pageHeaderText}>
        <h1 className={shared.pageTitle}>{title}</h1>
        <p className={shared.pageSubtitle}>{subtitle}</p>
      </div>

      {children && <div className={shared.pageActions}>{children}</div>}
    </div>
  );
}