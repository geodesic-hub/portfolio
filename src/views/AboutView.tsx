import { useTypewriter } from '../hooks/useTypewriter'

const SCRIPT = [
  { text: `I'm a full-stack software engineer who enjoys building things at the intersection of technology, creativity, and human experience. Over the years, I've worked across modern web platforms, cloud systems, microservices, AI-assisted development workflows, and large-scale enterprise applications using technologies like Angular, .NET Core, React, Docker, Kubernetes, and SQL. I enjoy solving complex engineering problems, improving system architecture, and creating software that is both technically strong and intuitive for people to use.`, pauseBefore: 0, speed: 8 },
  { text: `At my core, I'm someone who genuinely loves learning — not just within software engineering, but across almost anything that sparks curiosity. Whether it's astronomy, philosophy, electronics, business, psychology, design, or emerging technologies, I enjoy exploring new ideas and understanding how different systems connect together. I'm naturally drawn toward deep learning, experimentation, and creative problem-solving.`, pauseBefore: 400, speed: 8 },
  { text: `Outside of engineering, I spend a lot of time working with 3D design and digital art using Blender and React Three Fiber, experimenting with lighting, texture baking, environments, and sci-fi inspired experiences. I also enjoy sketching and visual design as a creative outlet beyond code.`, pauseBefore: 400, speed: 8 },
  { text: `I'm driven by curiosity and the belief that learning should never stop. For me, technology is not just a career — it's one part of a much bigger passion for understanding the world, creating meaningful things, and continuously growing both technically and creatively.`, pauseBefore: 400, speed: 8 },
]

export default function AboutView() {
  const { displayed, activeIdx } = useTypewriter(SCRIPT)

  return (
    <div style={{ color: '#00ff41', textShadow: '0 0 6px rgba(0,255,65,0.5)' }}>
      <div style={{ fontFamily: '"Courier New", monospace', fontSize: 9, letterSpacing: 5, opacity: 0.5, marginBottom: 12 }}>
        ABOUT — HARSH
      </div>
      <div style={{ fontFamily: '"Segoe UI", system-ui, sans-serif', display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, lineHeight: 1.75, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
        {SCRIPT.map((_, i) => {
          if (i > activeIdx && !displayed[i]) return null
          const isActive = activeIdx === i
          return (
            <p key={i} style={{ margin: 0, opacity: isActive ? 1 : 0.85 }}>
              {displayed[i]}
              {isActive && <span className="hud-cursor">▌</span>}
            </p>
          )
        })}
      </div>
    </div>
  )
}
