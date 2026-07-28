const colors = ['#3182f6', '#00a661', '#ffb020', '#ff6b6b', '#8b5cf6']

export default function ChallengeConfetti() {
  const pieces = Array.from({ length: 42 }, (_, index) => ({
    id: index,
    left: `${(index * 37) % 100}%`,
    delay: `${(index % 9) * 0.07}s`,
    duration: `${1.8 + (index % 5) * 0.18}s`,
    color: colors[index % colors.length],
    rotation: `${(index * 47) % 180}deg`,
  }))

  return (
    <div className="challenge-confetti" aria-hidden="true">
      {pieces.map((piece) => (
        <i
          key={piece.id}
          style={{
            '--confetti-color': piece.color,
            '--confetti-delay': piece.delay,
            '--confetti-duration': piece.duration,
            '--confetti-left': piece.left,
            '--confetti-rotation': piece.rotation,
          }}
        />
      ))}
    </div>
  )
}
