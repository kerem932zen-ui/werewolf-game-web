import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

export default function LobbyScene() {
    return (
        <div style={{ width: '100%', height: '100%', background: '#000' }}>
            <Canvas camera={{ position: [0, 0, 1] }}>
                <color attach="background" args={['#050505']} />

                {/* Sadece Hareketli Yıldızlar (Arka Plan) */}
                <Stars radius={50} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                <ambientLight intensity={0.5} />
            </Canvas>
        </div>
    );
}
