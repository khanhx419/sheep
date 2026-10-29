import { bowlPosition } from './diceCupMotion.js';
import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
const PIPS = {1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
export function buildDiceTable(faces=[1,1,1]) {
 const root=new T.Group(), bowl=new T.Group(), dice=new T.Group();
 const porcelain=new T.MeshStandardMaterial({color:0xf6f1e6,roughness:.24,metalness:.08});
 const blue=new T.MeshStandardMaterial({color:0x31598b,roughness:.3,metalness:.12});
 const gold=new T.MeshStandardMaterial({color:0xc3a16b,roughness:.3,metalness:.55});
 const ivory=new T.MeshStandardMaterial({color:0xfff4d9,roughness:.34});
 const black=new T.MeshStandardMaterial({color:0x26324a,roughness:.6}), red=new T.MeshStandardMaterial({color:0xa13429,roughness:.5});
 function mesh(geometry,material,parent=root){const part=new T.Mesh(geometry,material);part.castShadow=true;part.receiveShadow=true;parent.add(part);return part;}
 const profile=[[0,.1],[1.65,.1],[1.95,.17],[2.18,.24],[2.48,.28],[2.56,.23],[2.58,.12],[2.4,.04],[0,.02]].reverse().map(([x,y])=>new T.Vector2(x,y));
 mesh(new T.LatheGeometry(profile,96),porcelain);
 function ring(radius,height,material,parent=root,tube=.025){const r=mesh(new T.TorusGeometry(radius,tube,10,96),material,parent);r.rotation.x=Math.PI/2;r.position.y=height;return r;}
 ring(2.35,.275,blue);ring(2.46,.28,gold);ring(1.95,.18,blue);
 const bowlProfile=[[0,1.22],[.57,1.22],[.62,1.32],[.76,1.32],[.8,1.2],[1.1,1.09],[1.42,.8],[1.62,.48],[1.7,.29],[1.69,.23],[1.59,.23],[1.5,.47],[1.3,.76],[1.0,.98],[.6,1.1],[0,1.1]].reverse().map(([x,y])=>new T.Vector2(x,y));
 mesh(new T.LatheGeometry(bowlProfile,96),porcelain,bowl);ring(.69,1.33,blue,bowl,.028);ring(1.69,.28,blue,bowl,.035);ring(1.62,.44,blue,bowl,.025);
 for(let i=0;i<12;i++){const petal=mesh(new T.SphereGeometry(.045,8,6),blue,bowl);const angle=i*Math.PI/6;petal.position.set(Math.cos(angle)*.91,1.18,Math.sin(angle)*.91);petal.scale.set(1,.3,2);petal.rotation.y=-angle;}
 const faceDisk=mesh(new T.CylinderGeometry(.5,.5,.012,48),porcelain,bowl);faceDisk.position.y=1.225;
 const stamp=mesh(new T.TorusGeometry(.2,.018,6,40),blue,bowl);stamp.rotation.x=Math.PI/2;stamp.position.y=1.24;
 const box=new RoundedBoxGeometry(.62,.62,.62,3,.07), dot=new T.CylinderGeometry(.046,.04,.014,14);
 faces.forEach((face,index)=>{
  const die=new T.Group();die.position.set((index-1)*.73,.45,index===1?-.36:.29);die.rotation.y=[-.2,.18,-.12][index];dice.add(die);
  mesh(box,ivory,die);
  for(const p of PIPS[face]){const pip=mesh(dot,face===1||face===4?red:black,die);pip.position.set((p%3-1)*.16,.318,(Math.floor(p/3)-1)*.16);}
 });
 root.add(dice,bowl);
 return {root,bowl,dice,dispose(){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.removeFromParent();}};
}
export default function DiceCupScene({faces,offset,rolling,covered}) {
 const host=useRef(null),live=useRef({offset,rolling,covered}),[failed,setFailed]=useState(false);
 live.current={offset,rolling,covered};
 useEffect(()=>{
  let renderer,observer,frame,table;const scene=new T.Scene();let dead=false;
  try {
   renderer=new T.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;host.current.appendChild(renderer.domElement);
   const camera=new T.OrthographicCamera(-4,4,4,-4,.1,30);camera.position.set(0,12,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);
   scene.add(new T.HemisphereLight(0xffffff,0x62738c,1.1));const key=new T.DirectionalLight(0xfff3d9,3.5);key.position.set(-4,6,-3);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5});key.shadow.bias=-.0004;key.shadow.normalBias=.025;scene.add(key);
   const floor=new T.Mesh(new T.PlaneGeometry(20,20),new T.ShadowMaterial({opacity:.18}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.position.y=-.02;scene.add(floor);
   table=buildDiceTable(faces);scene.add(table.root);let width=1,height=1;
   observer=new ResizeObserver(()=>{const rect=host.current?.getBoundingClientRect();if(!rect?.width||!rect.height)return;width=rect.width;height=rect.height;renderer.setSize(width,height);camera.left=-4*width/height;camera.right=4*width/height;camera.updateProjectionMatrix();});observer.observe(host.current);
   const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   function tick(time){if(dead)return;const state=live.current;const position=bowlPosition(state.offset,height);
    table.bowl.visible=state.covered;table.bowl.position.set(position.x,position.y,position.z);
    table.bowl.rotation.z=0;
    table.dice.children.forEach((die,i)=>{die.rotation.x=0;die.rotation.z=0;die.position.y=.45; if(state.rolling&&!reduced){die.rotation.x=Math.sin(time*.025+i)*.5;die.rotation.z=Math.cos(time*.021+i)*.5;die.position.y=.55+Math.abs(Math.sin(time*.02+i))*.15;}});
    if(state.rolling&&!reduced){table.bowl.position.x=Math.sin(time*.045)*.12;table.bowl.position.z=Math.cos(time*.04)*.1;table.bowl.rotation.z=Math.sin(time*.035)*.035;}
    renderer.render(scene,camera);frame=requestAnimationFrame(tick);
   }
   frame=requestAnimationFrame(tick);
   return ()=>{dead=true;cancelAnimationFrame(frame);observer.disconnect();table.dispose();floor.geometry.dispose();floor.material.dispose();renderer.dispose();renderer.domElement.remove();};
  } catch {setFailed(true);observer?.disconnect();table?.dispose();renderer?.dispose();renderer?.domElement.remove();}
 },[faces.join(',')]);
 return <div className="dice-webgl" ref={host} aria-hidden="true">{failed&&<span className="dice-webgl-fallback">{covered?'◉':faces.map(face=>['⚀','⚁','⚂','⚃','⚄','⚅'][face-1]).join(' ')}</span>}</div>;
}
