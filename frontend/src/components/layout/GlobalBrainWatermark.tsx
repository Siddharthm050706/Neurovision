import { useEffect, useRef } from 'react';
import type * as THREE from 'three';
import type { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import brainModelUrl from '../../assets/brain-model/brain-watermark.glb?url';

const ROTATION_PERIOD_MS = 54_000;
const MAX_PIXEL_RATIO = 1.25;

function fitBrainModel(three: typeof import('three'), model: THREE.Group) {
  model.updateMatrixWorld(true);
  const bounds = new three.Box3().setFromObject(model);
  const center = bounds.getCenter(new three.Vector3());
  const size = bounds.getSize(new three.Vector3());
  const scale = 2.2 / Math.max(size.x, size.y, size.z);
  const brain = new three.Group();

  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  brain.add(model);
  return brain;
}

function disposeObjectResources(three: typeof import('three'), root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  root.traverse((object) => {
    if (!(object instanceof three.Mesh)) return;
    geometries.add(object.geometry);
    const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
    meshMaterials.forEach((material) => {
      materials.add(material);
      Object.values(material).forEach((value) => {
        if (value instanceof three.Texture) textures.add(value);
      });
    });
  });

  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}

function setupWatermark(
  mount: HTMLDivElement,
  three: typeof import('three'),
  GLTFLoaderConstructor: typeof GLTFLoader,
) {
  const scene = new three.Scene();
  const camera = new three.PerspectiveCamera(32, 1, 0.1, 20);
  camera.position.set(0, 0, 4.9);
  let brain: THREE.Group | undefined;
  let disposed = false;
  scene.add(new three.HemisphereLight('#e7eef3', '#536777', 0.85));

  const keyLight = new three.DirectionalLight('#ffffff', 1.35);
  keyLight.position.set(-3.5, 4, 5);
  scene.add(keyLight);

  const fillLight = new three.DirectionalLight('#b7c8d3', 0.45);
  fillLight.position.set(4, 0.5, -3);
  scene.add(fillLight);

  const renderer = new three.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = three.SRGBColorSpace;
  mount.appendChild(renderer.domElement);

  new GLTFLoaderConstructor().load(
    brainModelUrl,
    (gltf) => {
      if (disposed) {
        disposeObjectResources(three, gltf.scene);
        return;
      }

      brain = fitBrainModel(three, gltf.scene);
      scene.add(brain);
      renderer.render(scene, camera);
    },
    undefined,
    (error) => console.error('Failed to load the global brain watermark model.', error),
  );

  let frameId = 0;
  let lastFrameTime = 0;
  let lastRenderTime = 0;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

  const resize = () => {
    const width = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };

  const renderFrame = (time: number) => {
    if (time - lastRenderTime >= 1000 / 30) {
      if (brain && lastFrameTime) {
        brain.rotation.y += ((time - lastFrameTime) / ROTATION_PERIOD_MS) * Math.PI * 2;
      }
      renderer.render(scene, camera);
      lastRenderTime = time;
    }
    lastFrameTime = time;
    frameId = window.requestAnimationFrame(renderFrame);
  };

  const syncMotionPreference = () => {
    window.cancelAnimationFrame(frameId);
    frameId = 0;
    lastFrameTime = 0;
    if (motionPreference.matches) {
      renderer.render(scene, camera);
    } else {
      frameId = window.requestAnimationFrame(renderFrame);
    }
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(mount);
  resize();
  motionPreference.addEventListener('change', syncMotionPreference);
  syncMotionPreference();

  return () => {
    disposed = true;
    motionPreference.removeEventListener('change', syncMotionPreference);
    resizeObserver.disconnect();
    window.cancelAnimationFrame(frameId);
    disposeObjectResources(three, scene);
    renderer.dispose();
    renderer.domElement.remove();
  };
}

export const GlobalBrainWatermark = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let disposeRenderer: (() => void) | undefined;
    void Promise.all([
      import('three'),
      import('three/addons/loaders/GLTFLoader.js'),
    ]).then(([three, { GLTFLoader }]) => {
      if (!disposed) disposeRenderer = setupWatermark(mount, three, GLTFLoader);
    }).catch((error: unknown) => {
      console.error('Failed to initialize the global brain watermark.', error);
    });

    return () => {
      disposed = true;
      disposeRenderer?.();
    };
  }, []);

  return <div ref={mountRef} className="global-brain-watermark" aria-hidden="true" />;
};
