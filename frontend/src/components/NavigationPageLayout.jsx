import './NavigationPageLayout.css'

export default function NavigationPageLayout({
  title,
  content,
  className = '',
  children,
}) {
  const pageClassName = ['navigation-page-layout', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={pageClassName}>
      <header className="navigation-page-header">
        <h1>{title}</h1>
        <p>{content}</p>
      </header>

      {children}
    </div>
  )
}
