import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const COUNT = 30

function spawnParticle() {
  return {
    x: 0, y: 0, z: 0,
    vx: (Math.random() - 0.5) * 0.08,
    vy: 0.25 + Math.random() * 0.2,
    vz: (Math.random() - 0.5) * 0.08,
    age: Math.random() * 3,
    maxAge: 1 + Math.random() * 1.5,
  }
}

export default function Smoke({ position }: { position: [number, number, number] }) {
  const pointsRef = useRef<THREE.Points>(null)
  const particles = useRef(Array.from({ length: COUNT }, spawnParticle))
  const positions = useMemo(() => new Float32Array(COUNT * 3), [])

  useFrame((_, delta) => {
    for (let i = 0; i < COUNT; i++) {
      const p = particles.current[i]
      p.age += delta
      if (p.age >= p.maxAge) Object.assign(p, spawnParticle())

      p.x += p.vx * delta
      p.y += p.vy * delta
      p.z += p.vz * delta

      positions[i * 3]     = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
    }

    if (pointsRef.current)
      (pointsRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
  })

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  return (
    <points ref={pointsRef} position={position} geometry={geometry}>
      <pointsMaterial size={0.02} color="white" transparent opacity={0.4} depthWrite={false} />
    </points>
  )
}
