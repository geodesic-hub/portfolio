import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

const vertexShader = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */`
uniform float time;
uniform float uOpacity;
varying vec3 vDir;

float hash(vec3 p) {
  p = fract(p * vec3(127.1, 311.7, 74.7));
  p += dot(p, p.yxz + 19.19);
  return fract(p.x * p.y * p.z);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i),               hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z
  );
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p *= 2.1;
    a *= 0.5;
  }
  return v;
}

float stars(vec3 p) {
  vec3 cell = floor(p * 8.0);
  vec3 local = fract(p * 8.0) - 0.5;
  float h = hash(cell);
  float twinkle = 0.6 + 0.4 * sin(time * (1.5 + h * 2.0) + h * 6.28);
  float r = 0.04 + h * 0.06;
  float d = length(local) / r;
  return smoothstep(1.0, 0.0, d) * twinkle * step(0.82, h);
}
`+ `
void main() {
  vec3 p = vDir * 3.0;

  float f1 = fbm(p + time * 0.05);
  float f2 = fbm(p * 1.8 - time * 0.02 + vec3(f1 * 0.5));
  float field = fbm(p + f2);

  float vig = smoothstep(-1.0, -0.4, vDir.y) * smoothstep(1.0, 0.4, vDir.y);
  float lum = field * 0.18 * (0.4 + 0.7 * vig);

  float star = stars(vDir * 0.5 + 0.5) * 0.30;

  vec3 col = vec3(lum + star);
  gl_FragColor = vec4(col, uOpacity);
}
`

export default function PocketDimension({ sceneReady }: { sceneReady: boolean }) {
  const matRef     = useRef<THREE.ShaderMaterial>(null)
  const meshRef    = useRef<THREE.Mesh>(null)
  const uniforms   = useRef({ time: { value: 0 }, uOpacity: { value: 0 } })

  useFrame(({ camera }, delta) => {
    if (!matRef.current) return
    matRef.current.uniforms.time.value += delta
    const targetOpacity = sceneReady ? 1.0 : 0.0
    matRef.current.uniforms.uOpacity.value = THREE.MathUtils.lerp(
      matRef.current.uniforms.uOpacity.value,
      targetOpacity,
      delta * 1.5
    )
    if (meshRef.current) meshRef.current.position.copy(camera.position)
  })

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1000, 10]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms.current}
        side={THREE.BackSide}
        depthWrite={false}
        transparent
      />
    </mesh>
  )
}
