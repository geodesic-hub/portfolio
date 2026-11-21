const SKILLS: [string, string[]][] = [
  ['ENGINEERING', ['.NET', 'Angular', 'React', 'Microservices', 'CQRS', 'CI/CD']],
  ['DATA & CLOUD', ['Kafka', 'Snowflake', 'Redshift', 'SQL Server', 'Docker', 'Kubernetes']],
  ['AI', ['LLM apps', 'Local inference', 'GPT from scratch', 'AI code review']],
  ['CREATIVE', ['Blender', '3D / React Three Fiber', 'Sketching', 'Visual design']],
  ['MOBILE', ['Native Android']],
]

export default function AboutView() {
  return (
    <div className="hud-view">
      <div className="hud-label">
        ABOUT - HARSH
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {SKILLS.map(([group, items]) => (
          <div key={group} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <span className="hud-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: 1, width: 104, flexShrink: 0 }}>{group}</span>
            {items.map(s => (
              <span key={s} className="hud-chip">{s}</span>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, lineHeight: 1.7 }}>
        <p style={{ margin: 0 }}>
          I'm a software and data engineer who enjoys building things at the intersection of technology, creativity, and human experience. Over the years, I've worked across modern web platforms, cloud systems, microservices, AI-assisted development workflows, and large-scale enterprise applications using technologies like Angular, .NET Core, React, Docker, Kubernetes, and SQL.
        </p>
        <p className="hud-muted" style={{ margin: 0 }}>
          At my core, I'm someone who genuinely loves learning - not just within software engineering, but across almost anything that sparks curiosity. Whether it's astronomy, philosophy, electronics, business, psychology, design, or emerging technologies, I enjoy exploring new ideas and understanding how different systems connect together.
        </p>
        <p className="hud-muted" style={{ margin: 0 }}>
          Outside of engineering, I spend a lot of time working with 3D design and digital art using Blender and React Three Fiber, experimenting with lighting, texture baking, environments, and sci-fi inspired experiences. I also enjoy sketching and visual design as a creative outlet beyond code.
        </p>
        <p className="hud-muted" style={{ margin: 0 }}>
          I'm driven by curiosity and the belief that learning should never stop. For me, technology is not just a career - it's one part of a much bigger passion for understanding the world, creating meaningful things, and continuously growing both technically and creatively.
        </p>
      </div>
    </div>
  )
}
