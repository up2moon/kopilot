import './MyDataConnectionAnimation.css'

export default function MyDataConnectionAnimation({ compact = false }) {
  return (
    <div
      className={`mydata-animation${compact ? ' is-compact' : ''}`}
      role="img"
      aria-label="카드, 은행, 간편결제 소비 내역을 안전하게 연결하는 중"
    >
      <svg
        className="mydata-animation-svg"
        viewBox="0 0 300 190"
        width="300"
        height="190"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="mydata-core-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5ba4ff" />
            <stop offset="100%" stopColor="#1769e0" />
          </linearGradient>
          <filter id="mydata-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#3182f6" floodOpacity=".22" />
          </filter>
        </defs>

        <g transform="translate(150 98)">
          <ellipse
            cx="0"
            cy="0"
            rx="112"
            ry="72"
            fill="none"
            stroke="#bfdbfe"
            strokeWidth="2"
            strokeDasharray="7 8"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0"
              to="360"
              dur="9s"
              repeatCount="indefinite"
            />
          </ellipse>
        </g>

        <g className="mydata-svg-source" transform="translate(150 13)" filter="url(#mydata-shadow)">
          <rect width="58" height="48" x="-29" rx="15" fill="#fff" stroke="#dbeafe" />
          <text x="0" y="23" textAnchor="middle" fontSize="20">💳</text>
          <text x="0" y="39" textAnchor="middle" fontSize="9" fontWeight="800" fill="#4e5968">카드</text>
          <animateTransform
            attributeName="transform"
            additive="sum"
            type="translate"
            values="0 0; 0 -6; 0 0"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </g>

        <g className="mydata-svg-source" transform="translate(37 117)" filter="url(#mydata-shadow)">
          <rect width="58" height="48" x="-29" rx="15" fill="#fff" stroke="#dbeafe" />
          <text x="0" y="23" textAnchor="middle" fontSize="20">🏦</text>
          <text x="0" y="39" textAnchor="middle" fontSize="9" fontWeight="800" fill="#4e5968">은행</text>
          <animateTransform
            attributeName="transform"
            additive="sum"
            type="translate"
            values="0 0; 0 -6; 0 0"
            begin="-.5s"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </g>

        <g className="mydata-svg-source" transform="translate(263 117)" filter="url(#mydata-shadow)">
          <rect width="58" height="48" x="-29" rx="15" fill="#fff" stroke="#dbeafe" />
          <text x="0" y="23" textAnchor="middle" fontSize="20">📱</text>
          <text x="0" y="39" textAnchor="middle" fontSize="9" fontWeight="800" fill="#4e5968">페이</text>
          <animateTransform
            attributeName="transform"
            additive="sum"
            type="translate"
            values="0 0; 0 -6; 0 0"
            begin="-1s"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </g>

        <g fill="#22c55e" stroke="#fff" strokeWidth="2">
          <circle r="6">
            <animateMotion path="M150 59 L150 98" dur="1.25s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;1;0" dur="1.25s" repeatCount="indefinite" />
          </circle>
          <circle r="6">
            <animateMotion path="M66 126 L150 98" begin=".42s" dur="1.25s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;1;0" begin=".42s" dur="1.25s" repeatCount="indefinite" />
          </circle>
          <circle r="6">
            <animateMotion path="M234 126 L150 98" begin=".84s" dur="1.25s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;1;0" begin=".84s" dur="1.25s" repeatCount="indefinite" />
          </circle>
        </g>

        <g transform="translate(150 98)">
          <rect
            x="-49"
            y="-49"
            width="98"
            height="98"
            rx="34"
            fill="none"
            stroke="#3182f6"
            strokeWidth="3"
          >
            <animate attributeName="x" values="-42;-61" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="y" values="-42;-61" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="width" values="84;122" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="height" values="84;122" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values=".65;0" dur="1.5s" repeatCount="indefinite" />
          </rect>
          <rect
            x="-43"
            y="-43"
            width="86"
            height="86"
            rx="29"
            fill="url(#mydata-core-gradient)"
            stroke="#fff"
            strokeWidth="4"
            filter="url(#mydata-shadow)"
          />
          <text x="0" y="7" textAnchor="middle" fontSize="34">
            👛
            <animateTransform
              attributeName="transform"
              type="scale"
              values="1;1.12;1"
              dur="1.2s"
              repeatCount="indefinite"
            />
          </text>
          <text x="0" y="31" textAnchor="middle" fontSize="9" fontWeight="900" fill="#fff">
            소비 모으는 중
          </text>
        </g>
      </svg>
    </div>
  )
}
