import './NavigationPageLayout.css'

export default function NavigationPageLayout({
  title,
  content,
  className = '',
  onBack,
  backLabel = '뒤로가기',
  children,
}) {
  const pageClassName = ['navigation-page-layout', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={pageClassName}>
      <header className="navigation-page-header">
        {onBack ? (
          <button
            type="button"
            className="navigation-page-back"
            onClick={onBack}
            aria-label={backLabel}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        ) : null}
        <h1>{title}</h1>
        <p>{content}</p>
      </header>

      {children}
    </div>
  )
}
