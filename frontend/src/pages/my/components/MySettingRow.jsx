import arrowIcon from '../../../assets/icons/arrow.svg'

export default function MySettingRow({
  icon,
  label,
  status,
  statusTone,
  checked,
  disabled,
  onClick,
  type = 'action',
}) {
  const isToggle = type === 'toggle'

  return (
    <button
      type="button"
      className="mypage-setting-row"
      onClick={onClick}
      disabled={disabled}
      role={isToggle ? 'switch' : undefined}
      aria-checked={isToggle ? checked : undefined}
    >
      <img
        className="mypage-setting-icon"
        src={icon}
        alt=""
        aria-hidden="true"
      />
      <span className="mypage-setting-label">{label}</span>

      {isToggle ? (
        <span
          className={`mypage-switch${checked ? ' is-on' : ''}`}
          aria-hidden="true"
        >
          <span className="mypage-switch-knob" />
        </span>
      ) : (
        <>
          {status && (
            <span className={`mypage-setting-status is-${statusTone}`}>
              {status}
            </span>
          )}
          <img
            className="mypage-setting-chevron"
            src={arrowIcon}
            alt=""
            aria-hidden="true"
          />
        </>
      )}
    </button>
  )
}
