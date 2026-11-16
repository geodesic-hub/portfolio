const SKILLS: [string, string[]][] = [
  ['ENGINEERING', ['.NET', 'Angular', 'React', 'Microservices', 'CQRS', 'CI/CD']],
  ['DATA & CLOUD', ['Kafka', 'Snowflake', 'Redshift', 'SQL Server', 'Docker', 'Kubernetes']],
  ['AI', ['LLM apps', 'Local inference', 'GPT from scratch', 'AI code review']],
  ['CREATIVE', ['Blender', '3D / React Three Fiber', 'Sketching', 'Visual design']],
  ['MOBILE', ['Native Android']],
]

export default function AboutView() {
  return (
    <div style={{ fontFamily: '"Courier New", monospace', color: '#f2f5f7', textShadow: '0 0 6px rgba(127,230,255,0.4)', lineHeight: 1.8 }}>
      <div style={{ fontSize: 9, letterSpacing: 5, opacity: 0.5, marginBottom: 14 }}>
        ABOUT - HARSH
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {SKILLS.map(([group, items]) => (
          <div key={group} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 9, letterSpacing: 3, opacity: 0.55, width: 86, flexShrink: 0 }}>{group}</span>
            {items.map(s => (
              <span key={s} style={{ fontSize: 10, letterSpacing: 1, padding: '1px 7px', border: '1px solid rgba(127,230,255,0.3)', borderRadius: 3, background: 'rgba(127,230,255,0.06)' }}>{s}</span>
            ))}
          </div>
        ))}
      </div>
      <div style={{ fontFamily: '"Segoe UI", system-ui, sans-serif', display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, lineHeight: 1.75 }}>
        <p style={{ margin: 0 }}>
          I'm a software and data engineer who enjoys building things at the intersection of technology, creativity, and human experience. Over the years, I've worked across modern web platforms, cloud systems, microservices, AI-assisted development workflows, and large-scale enterprise applications using technologies like Angular, .NET Core, React, Docker, Kubernetes, and SQL.
        </p>
        <p style={{ margin: 0, opacity: 0.85 }}>
          At my core, I'm someone who genuinely loves learning - not just within software engineering, but across almost anything that sparks curiosity. Whether it's astronomy, philosophy, electronics, business, psychology, design, or emerging technologies, I enjoy exploring new ideas and understanding how different systems connect together.
        </p>
        <p style={{ margin: 0, opacity: 0.85 }}>
          Outside of engineering, I spend a lot of time working with 3D design and digital art using Blender and React Three Fiber, experimenting with lighting, texture baking, environments, and sci-fi inspired experiences. I also enjoy sketching and visual design as a creative outlet beyond code.
        </p>
        <p style={{ margin: 0, opacity: 0.85 }}>
          I'm driven by curiosity and the belief that learning should never stop. For me, technology is not just a career - it's one part of a much bigger passion for understanding the world, creating meaningful things, and continuously growing both technically and creatively.
        </p>
      </div>
    </div>
  )
}
