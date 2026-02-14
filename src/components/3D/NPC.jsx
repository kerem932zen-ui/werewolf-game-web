import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { getModelName } from '../../utils/models';

export default function RemotePlayer({ color = '#ff4444', startPos = [0, 0, 0], targetPos, targetRot, username = 'NPC', isAlive = true, messages = [], isReady = false }) {
    const groupRef = useRef();
    const [bubble, setBubble] = useState(null);
    const currentAnimRef = useRef('Idle');

    const modelName = useMemo(() => getModelName(username), [username]);
    const { scene: originalScene, animations: originalAnimations } = useGLTF(modelName);

    // Her oyuncu için unique bir kopya oluştur (SkeletonUtils.clone çok önemli!)
    const scene = useMemo(() => {
        if (!originalScene) return null;
        return SkeletonUtils.clone(originalScene);
    }, [originalScene]);

    const { actions } = useAnimations(originalAnimations, groupRef);

    const fadeToAction = (name, duration = 0.2) => {
        const prev = currentAnimRef.current;
        if (prev === name) return;

        const act = actions[name] || actions['Armature|' + name] || actions['mixamo.com'];
        const old = actions[prev] || actions['Armature|' + prev] || actions['mixamo.com'];

        if (old) old.fadeOut(duration);
        if (act) {
            act.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(duration).play();
            currentAnimRef.current = name;
        }
    };

    // Chat Balonu
    useEffect(() => {
        if (messages.length > 0) {
            const last = messages[messages.length - 1];
            if (last.type === 'chat' && last.username === username) {
                setBubble(last.text);
                const t = setTimeout(() => setBubble(null), 4000); // 4sn sonra gizle
                return () => clearTimeout(t);
            }
        }
    }, [messages, username]);

    // LERP Logic
    useFrame((state, delta) => {
        if (!groupRef.current || !targetPos) return;

        // Hedef pozisyon (Vector3)
        const targetV = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);

        // Şu anki pozisyon
        const currentV = groupRef.current.position;

        // Mesafe (Animasyon kontrolü için)
        const dist = currentV.distanceTo(targetV);

        // HAREKET LOGIĞI
        if (dist > 0.1) {
            // Yumuşak geçiş (Lerp Factor: 10 * delta -> Hızlı ama smooth)
            currentV.lerp(targetV, 10 * delta);

            // Animasyon: Koşuyor
            fadeToAction('Run', 0.2);

            // Dönüş (Rotation) -> Hedefe bakmasın, gönderilen rotasyonu kullansın
            if (typeof targetRot === 'number') {
                // Quaternion slerp daha iyi olurdu ama Y-axis rotasyon yeterli
                // Açısal lerp (en kısa yoldan dönmesi için)
                let diff = targetRot - groupRef.current.rotation.y;
                // -PI ile +PI arasına normalize et
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;

                groupRef.current.rotation.y += diff * 10 * delta;
            }
        } else {
            // Duruyor
            fadeToAction('Idle', 0.2);
        }
    });

    // İlk render'da animasyonu başlat
    useEffect(() => {
        if (actions && actions['Idle']) {
            actions['Idle'].play();
        }
    }, [actions]);

    if (!isAlive || !scene) return null;

    return (
        <group ref={groupRef} position={startPos} dispose={null}>
            <primitive object={scene} scale={0.65} />
            {/* İsim Etiketi */}
            <Html position={[0, 2.5, 0]} center>
                <div style={{
                    textAlign: 'center', pointerEvents: 'none', userSelect: 'none',
                    textShadow: '0 2px 4px rgba(0,0,0,0.8)', whiteSpace: 'nowrap'
                }}>
                    <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>{username}</span>
                </div>
            </Html>

            {/* Chat Balonu */}
            {bubble && (
                <Html position={[0, 2.6, 0]} center>
                    <div style={{
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        color: '#fff',
                        padding: '8px 16px',
                        borderRadius: '16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                        pointerEvents: 'none',
                        border: '1px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}>
                        {bubble}
                    </div>
                </Html>
            )}
        </group>
    );
}
