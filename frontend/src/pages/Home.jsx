import runnerIllustration from "../assets/home-runner.png";
import "./Home.css";

const serviceHighlights = [
  {
    eyebrow: "SMART INSIGHT",
    title: "AI 소비 분석",
    description: "내 소비 흐름과 새는 지출을 한눈에",
  },
  {
    eyebrow: "PERSONAL COACH",
    title: "맞춤 절약 코칭",
    description: "소비 습관에 꼭 맞는 절약 방법을 추천",
  },
  {
    eyebrow: "DAILY ACTION",
    title: "AI 절약 챌린지",
    description: "작은 실천을 꾸준한 변화로 연결",
  },
  {
    eyebrow: "FUTURE VALUE",
    title: "투자 효과 시뮬레이션",
    description: "오늘의 절약이 만들 미래 가치를 미리 확인",
  },
];

export default function Home({ auth, onNavigate }) {
  const primaryRoute = auth ? "/dashboard" : "/signup";

  return (
    <div className="home-page">
      <section className="home-hero">
        <header className="home-header">
          <a className="home-brand" href="/" aria-label="Kospay 홈">
            <span className="home-brand-mark" aria-hidden="true">
              K
            </span>
            <span>Kospay</span>
          </a>
          <button
            className="home-login-link"
            type="button"
            onClick={() => onNavigate(auth ? "/dashboard" : "/login")}
          >
            {auth ? "내 대시보드" : "로그인"}
          </button>
        </header>

        <div className="home-hero-copy">
          <p className="home-eyebrow">AI FINANCIAL</p>
          <h1>
            아낄수록 가까워지는
            <br />
            나의 다음 목표
          </h1>
          <p>
            소비 분석부터 절약 챌린지, 투자효과까지
            <br />
            Kospay가 한 흐름으로 연결해요
          </p>
        </div>

        <div
          className="home-hero-orbit home-hero-orbit-one"
          aria-hidden="true"
        />
        <div
          className="home-hero-orbit home-hero-orbit-two"
          aria-hidden="true"
        />
        <span className="home-cloud home-cloud-one" aria-hidden="true" />
        <span className="home-cloud home-cloud-two" aria-hidden="true" />

        <div
          className="home-highlight-stage"
          aria-label="Kospay 주요 서비스"
        >
          {serviceHighlights.map((highlight, index) => (
            <article
              className={`home-highlight-card home-highlight-card-${index + 1}`}
              key={highlight.title}
            >
              <span className="home-highlight-symbol" aria-hidden="true">
                ✦
              </span>
              <div>
                <p>{highlight.eyebrow}</p>
                <h2>{highlight.title}</h2>
                <span>{highlight.description}</span>
              </div>
            </article>
          ))}
        </div>

        <button
          className="home-primary-action"
          type="button"
          onClick={() => onNavigate(primaryRoute)}
        >
          {auth ? "대시보드로 이동" : "무료로 시작하기"}
          <span aria-hidden="true">→</span>
        </button>
      </section>
    </div>
  );
}
