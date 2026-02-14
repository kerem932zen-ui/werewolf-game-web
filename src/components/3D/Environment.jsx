import React, { useMemo } from 'react';
import { useGLTF, Instances, Instance, Text } from '@react-three/drei';
import * as THREE from 'three';

// ─── MEDIEVAL KIT ASSETS ───
const KIT_PATH = '/models/medieval';

// Sadece Zemin
const FLOOR_TILE = 'Floor_UnevenBrick.gltf';

// Preload
useGLTF.preload(`${KIT_PATH}/${FLOOR_TILE}`);

// ─── HELPER: INSTANCED MODEL ───
const InstancedModel = React.memo(({ file, instanceData, scale = 1, shadow = true }) => {
    const { scene } = useGLTF(`${KIT_PATH}/${file}`);
    const mesh = useMemo(() => {
        let found = null;
        scene.traverse((child) => {
            if (!found && child.isMesh) found = child;
        });
        return found;
    }, [scene]);

    if (!mesh) return null;

    return (
        <Instances range={instanceData.length} geometry={mesh.geometry} material={mesh.material} castShadow={shadow} receiveShadow>
            {instanceData.map((data, i) => (
                <Instance
                    key={i}
                    position={data.position}
                    rotation={data.rotation || [0, 0, 0]}
                    scale={data.scale || [scale, scale, scale]}
                />
            ))}
        </Instances>
    );
});

// ─── TABELA (BILLBOARD) ───
export function Billboard() {
    return (
        <group position={[0, 0, -15]}>
            <mesh position={[-3, 2.5, 0]} castShadow>
                <boxGeometry args={[0.3, 5, 0.3]} />
                <meshStandardMaterial color="#3e2723" />
            </mesh>
            <mesh position={[3, 2.5, 0]} castShadow>
                <boxGeometry args={[0.3, 5, 0.3]} />
                <meshStandardMaterial color="#3e2723" />
            </mesh>
            <mesh position={[0, 4, 0]} receiveShadow castShadow>
                <boxGeometry args={[8, 3, 0.2]} />
                <meshStandardMaterial color="#5d4037" />
            </mesh>
            <Text position={[0, 4.5, 0.15]} fontSize={0.8} color="#ffff00" anchorX="center" anchorY="middle" outlineWidth={0.05} outlineColor="#000">
                APEXMATCH
            </Text>
            <Text position={[0, 3.5, 0.15]} fontSize={0.6} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.04} outlineColor="#000">
                VAMPİR KÖYLÜ
            </Text>
        </group>
    );
}

// ─── SADECE ZEMİN (Düz ve Temiz) ───
export function Ground() {
    // Zemin Taşları (Geniş Alan)
    const instances = useMemo(() => {
        const temp = [];
        const count = 30; // Alanı biraz daha genişlettim
        const spacing = 2.0;
        for (let x = -count / 2; x < count / 2; x++) {
            for (let z = -count / 2; z < count / 2; z++) {
                // Kare yerine yuvarlak bir alan olsun
                if (x * x + z * z > 200) continue;

                temp.push({
                    position: [x * spacing, -0.05, z * spacing],
                    rotation: [0, (Math.floor(Math.random() * 4) * Math.PI) / 2, 0],
                    scale: [1, 1, 1]
                });
            }
        }
        return temp;
    }, []);

    return (
        <group>
            {/* Zemin Taşları */}
            <InstancedModel file={FLOOR_TILE} instanceData={instances} shadow={false} />

            {/* O kırmızı işaretli havada duran kahverengi zemin KALDIRILDI */}
        </group>
    );
}

// Boş Fonksiyon (Hata vermemesi için)
export function Fence() { return null; }

// ─── GÖKYÜZÜ (AYDINLIK) ───
export function Sky() {
    return (
        <mesh>
            <sphereGeometry args={[100, 32, 32]} />
            <meshBasicMaterial color="#87CEEB" side={THREE.BackSide} />
        </mesh>
    );
}

// ─── IŞIKLANDIRMA ───
export function Lighting() {
    return (
        <group>
            <ambientLight intensity={1.0} color="#ffffff" />
            <directionalLight
                position={[50, 80, 50]}
                color="#fff5cc"
                intensity={2.0}
                castShadow
                shadow-bias={-0.0005}
                shadow-mapSize={[1024, 1024]}
                shadow-camera-left={-60}
                shadow-camera-right={60}
                shadow-camera-top={60}
                shadow-camera-bottom={-60}
            />
            <hemisphereLight skyColor="#87CEEB" groundColor="#5d4037" intensity={0.6} />
        </group>
    );
}
