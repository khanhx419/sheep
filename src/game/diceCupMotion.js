// Lift the bowl before its rim can pass through a die while dragging.
export function bowlPosition(offset, viewportHeight) {
 const scale=8/Math.max(1,viewportHeight);
 const x=offset.x*scale,z=offset.y*scale;
 return {x,y:Math.min(.9,Math.hypot(x,z)*1.5),z};
}
