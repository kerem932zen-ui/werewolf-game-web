import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';
import { getModelName } from '../../utils/models';

const MOVE_SPEED = 6;
const BOUNDS = 25;
const MOUSE_SENSITIVITY = 0.003;
const TOUCH_SENSITIVITY = 0.005; // Telefondaki hassasiyet
const JUMP_FORCE = 0.4;
const GRAVITY = 0.02;

export default function Player({ joystickInput, color = '#44aaff', startPos = [0, 0, 5], username = 'Sen', onPositionUpdate, shouldJump, onJumpReset, isReady = false }) {
    const groupRef = useRef();
    const { camera, gl } = useThree();
    const [chatBubble, setChatBubble] = useState(null);
    const cameraAngleRef = useRef({ theta: 0, phi: 0.5 });

    const positionRef = useRef(new THREE.Vector3(startPos[0], startPos[1], startPos[2]));
    const rotationYRef = useRef(0);
    const velocityYRef = useRef(0);
    const isJumpingRef = useRef(false);

    const keysRef = useRef({ w: false, a: false, s: false, d: false });
    const mouseRef = useRef({ isDown: false, lastX: 0, lastY: 0 });
    const touchRef = useRef({ isDown: false, id: null, lastX: 0, lastY: 0 }); // Dokunmatik kontrol
    const currentAnimRef = useRef('Idle');

    const modelName = useMemo(() => getModelName(username), [username]);
    const { scene, animations } = useGLTF(modelName);
    const { actions } = useAnimations(animations, groupRef);

    const getAction = (name) => {
        if (!actions) return null;
        return actions[name] ||
            actions[name.toLowerCase()] ||
            actions[`Armature|${name}`] ||
            actions[`abc|${name}`] ||
            null;
    };

    const fadeToAction = (newAnimName, duration = 0.2) => {
        if (!actions) return;

        const prevAnimName = currentAnimRef.current;
        if (prevAnimName === newAnimName && newAnimName !== 'Wave') return;

        const prevAction = getAction(prevAnimName);
        const newAction = getAction(newAnimName);

        if (prevAction && prevAction !== newAction) prevAction.fadeOut(duration);

        if (newAction) {
            newAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(duration).play();

            // Tek seferlik animasyonlar
            if (newAnimName === 'Jump' || newAnimName === 'Wave') {
                newAction.setLoop(THREE.LoopOnce);
                newAction.clampWhenFinished = true;

                // Animasyon bitince Idle'a dön (Eğer hareket etmiyorsa)
                const clipDuration = newAction.getClip().duration;
                setTimeout(() => {
                    if (currentAnimRef.current === newAnimName) {
                        fadeToAction('Idle', 0.2);
                    }
                }, clipDuration * 1000);
            } else {
                newAction.setLoop(THREE.LoopRepeat);
            }
        }
        currentAnimRef.current = newAnimName;
    };

    useEffect(() => {
        if (!scene) return;
        scene.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }, [scene]);

    // Başlangıç Animasyonu
    useEffect(() => {
        const idle = getAction('Idle') || getAction(Object.keys(actions || {})[0]);
        if (idle) {
            idle.reset().play();
            currentAnimRef.current = 'Idle';
        }
    }, [actions]);

    // Hazır olunca el salla
    useEffect(() => {
        if (isReady) fadeToAction('Wave');
    }, [isReady]);

    // Chat Balonu
    const messages = useGameStore((s) => s.messages);
    useEffect(() => {
        if (messages.length > 0) {
            const last = messages[messages.length - 1];
            if (last.type === 'chat' && last.username === username) {
                setChatBubble(last.text);
                const timer = setTimeout(() => setChatBubble(null), 4000);
                return () => clearTimeout(timer);
            }
        }
    }, [messages.length]);

    // Zıplama Tetikleyicisi
    useEffect(() => {
        if (shouldJump) {
            if (!isJumpingRef.current) {
                velocityYRef.current = JUMP_FORCE;
                isJumpingRef.current = true;
                fadeToAction('Jump', 0.1);
            }
            onJumpReset?.(); // Her durumda sinyali kapat (stuck olmasın)
        }
    }, [shouldJump]);

    // ─── KLAVYE KONTROLÜ ───
    useEffect(() => {
        const handleKeyDown = (e) => {
            const key = e.key.toLowerCase();
            if (key in keysRef.current) keysRef.current[key] = true;
            if (e.code === 'Space' && !isJumpingRef.current) {
                velocityYRef.current = JUMP_FORCE;
                isJumpingRef.current = true;
                fadeToAction('Jump', 0.1);
            }
        };
        const handleKeyUp = (e) => {
            const key = e.key.toLowerCase();
            if (key in keysRef.current) keysRef.current[key] = false;
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [actions]);

    // ─── KAMERA KONTROLÜ (Mouse & Touch) ───
    useEffect(() => {
        const canvas = gl.domElement;

        // --- MOUSE ---
        const handleMouseDown = (e) => {
            if (e.button === 2) {
                mouseRef.current.isDown = true;
                mouseRef.current.lastX = e.clientX;
                mouseRef.current.lastY = e.clientY;
            }
        };
        const handleMouseMove = (e) => {
            if (!mouseRef.current.isDown) return;
            const dx = e.clientX - mouseRef.current.lastX;
            const dy = e.clientY - mouseRef.current.lastY;
            mouseRef.current.lastX = e.clientX;
            mouseRef.current.lastY = e.clientY;
            cameraAngleRef.current.theta -= dx * MOUSE_SENSITIVITY;
            cameraAngleRef.current.phi = Math.max(0.1, Math.min(1.4, cameraAngleRef.current.phi + dy * MOUSE_SENSITIVITY));
        };
        const handleMouseUp = () => { mouseRef.current.isDown = false; };
        const handleContextMenu = (e) => e.preventDefault();

        // --- TOUCH (Mobil) ---
        const handleTouchStart = (e) => {
            // Çoklu dokunmayı yönet: Sadece ilk yakalanan parmağı kamera için kullan (Joystick olmayan)
            // Not: Joystick `preventDefault` yaparsa events buraya gelmez.
            // Biz sadece "boş" alana dokunulanı alalım.
            const touch = e.changedTouches[0];
            touchRef.current.id = touch.identifier;
            touchRef.current.lastX = touch.clientX;
            touchRef.current.lastY = touch.clientY;
            touchRef.current.isDown = true;
        };

        const handleTouchMove = (e) => {
            if (!touchRef.current.isDown) return;

            // Bizim takip ettiğimiz parmak mı hareket etti?
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchRef.current.id) {
                    const t = e.changedTouches[i];
                    const dx = t.clientX - touchRef.current.lastX;
                    const dy = t.clientY - touchRef.current.lastY;
                    touchRef.current.lastX = t.clientX;
                    touchRef.current.lastY = t.clientY;

                    cameraAngleRef.current.theta -= dx * TOUCH_SENSITIVITY;
                    cameraAngleRef.current.phi = Math.max(0.1, Math.min(1.4, cameraAngleRef.current.phi + dy * TOUCH_SENSITIVITY));
                    break;
                }
            }
        };

        const handleTouchEnd = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchRef.current.id) {
                    touchRef.current.isDown = false;
                    touchRef.current.id = null;
                    break;
                }
            }
        };

        canvas.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('contextmenu', handleContextMenu);

        // Touch Listeners
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        // Touch move için window kullanıyoruz ki parmak canvas dışına kaysa da (ancak bu scroll'u bozabilir, o yüzden dikkat)
        // Oyun full screen olacağı için canvas üzerinde kalsa daha iyi, ama 'window' daha smooth olur.
        // Ancak preventDefault için 'passive: false' önemli.
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);


        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('contextmenu', handleContextMenu);

            canvas.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [gl]);

    // ─── HAREKET MANTIĞI & UPDATE ───
    const lastUpdateRef = useRef(0);

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        // Joystick Input'u Oku
        let inputX = joystickInput.current?.x || 0;
        let inputY = joystickInput.current?.y || 0;

        // Klavye Input'u Ekle
        if (keysRef.current.w) inputY += 1;
        if (keysRef.current.s) inputY -= 1;
        if (keysRef.current.a) inputX -= 1;
        if (keysRef.current.d) inputX += 1;

        // Normalize
        const len = Math.sqrt(inputX * inputX + inputY * inputY);
        let moving = false;

        if (len > 0.1) {
            moving = true;
            if (len > 1) { inputX /= len; inputY /= len; }
        }

        // Yerçekimi & Zıplama
        let newY = positionRef.current.y + velocityYRef.current;
        if (isJumpingRef.current) {
            velocityYRef.current -= GRAVITY; // Yerçekimi uygula
        } else if (newY > 0) {
            velocityYRef.current -= GRAVITY; // Düşüyor
        }

        if (newY <= 0) {
            newY = 0;
            if (isJumpingRef.current) {
                isJumpingRef.current = false;
                velocityYRef.current = 0;
                fadeToAction(moving ? 'Run' : 'Idle', 0.1);
            }
        }
        positionRef.current.y = newY;


        // -- HAREKET HESAPLAMA --
        if (moving) {
            const speed = MOVE_SPEED * delta;

            // Kamera açısına göre yön belirle
            const camTheta = cameraAngleRef.current.theta;

            // Kamera Yön Vektörleri (XZ düzlemi)
            const forwardX = -Math.sin(camTheta);
            const forwardZ = -Math.cos(camTheta);
            const rightX = Math.cos(camTheta);
            const rightZ = -Math.sin(camTheta);

            // Hareket Vektörü
            const moveX = (forwardX * inputY) + (rightX * inputX);
            const moveZ = (forwardZ * inputY) + (rightZ * inputX);

            // Pozisyon Güncelle
            positionRef.current.x += moveX * speed;
            positionRef.current.z += moveZ * speed;

            // Sınır Kontrolü
            positionRef.current.x = Math.max(-BOUNDS, Math.min(BOUNDS, positionRef.current.x));
            positionRef.current.z = Math.max(-BOUNDS, Math.min(BOUNDS, positionRef.current.z));

            // Rotasyon (Gittiği yöne dön)
            const targetAngle = Math.atan2(moveX, moveZ);

            // Yumuşak Dönüş (Lerp Angle)
            let diff = targetAngle - rotationYRef.current;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            rotationYRef.current += diff * 10 * delta;

            groupRef.current.rotation.y = rotationYRef.current;

            if (!isJumpingRef.current) fadeToAction('Run', 0.1);
        } else {
            if (!isJumpingRef.current) fadeToAction('Idle', 0.2);
        }

        // Model güncelle
        groupRef.current.position.copy(positionRef.current);

        // Kamera Takip Logic
        const camDist = 5;
        const theta = cameraAngleRef.current.theta;
        const phi = cameraAngleRef.current.phi; // Phi: Dikey açı (0=tepe, PI=alt)

        // Kamera yüksekliği ve uzaklığı spherical coordinates ile hesaplanır
        // Math.sin(phi) -> Yatay düzlem izdüşümü
        // Math.cos(phi) -> Dikey yükseklik

        const camX = positionRef.current.x + camDist * Math.sin(theta) * Math.sin(phi);
        const camY = positionRef.current.y + camDist * Math.cos(phi) + 2; // +2 karakterin kafasına odaklanması için
        const camZ = positionRef.current.z + camDist * Math.cos(theta) * Math.sin(phi);

        // Kamera biraz yumuşak takip etsin
        state.camera.position.lerp(new THREE.Vector3(camX, Math.max(0.5, camY), camZ), 0.1);
        state.camera.lookAt(positionRef.current.x, positionRef.current.y + 1.2, positionRef.current.z);

        // -- SOCKET BROADCAST (Throttled: 50ms) --
        const now = Date.now();
        if (onPositionUpdate && (moving || isJumpingRef.current) && now - lastUpdateRef.current > 50) {
            lastUpdateRef.current = now;
            onPositionUpdate( // GameWorld3D -> broadcastPosition
                { x: positionRef.current.x, y: positionRef.current.y, z: positionRef.current.z },
                rotationYRef.current
            );
        }
    });

    return (
        <group ref={groupRef} position={[0, 0, 5]} dispose={null}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <circleGeometry args={[0.3, 16]} />
                <meshBasicMaterial color="black" transparent opacity={0.3} />
            </mesh>
            <primitive object={scene} scale={0.65} />

            <Html position={[0, 2.2, 0]} center>
                <div style={{ textAlign: 'center', pointerEvents: 'none', userSelect: 'none', fontFamily: 'Arial, sans-serif' }}>
                    {isReady && (
                        <div style={{
                            color: '#4ade80', fontSize: '14px', fontWeight: '900',
                            textShadow: '0 2px 4px rgba(0,0,0,0.8)', marginBottom: '2px',
                            animation: 'bounce 1s infinite'
                        }}>HAZIR</div>
                    )}
                    <div style={{
                        color: 'white', fontSize: '13px', fontWeight: 'bold',
                        textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.5)',
                        letterSpacing: '0.5px'
                    }}>
                        {username}
                    </div>
                </div>
            </Html>

            {chatBubble && (
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
                        {chatBubble}
                    </div>
                </Html>
            )}
        </group>
    );
}
