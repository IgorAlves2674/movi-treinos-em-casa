/**
 * Ajuda para criar poses: cinemática inversa de 2 segmentos no plano lateral.
 * Uso: npx tsx scripts/pose-lab.ts  (imprime ângulos prontos para o JSON)
 */
type P2 = [number, number];
const DEG = 180 / Math.PI;
/** Ângulo no padrão do boneco: dir = [-sin θ, -cos θ] */
const ang = (dx: number, dy: number) => Math.atan2(-dx, -dy) * DEG;

/**
 * Junta intermediária entre `root` e `target`.
 * bend: 1 = junta para a frente (+x), -1 = para trás, 'up' = para cima, 'down' = para baixo.
 */
export function ik(root: P2, target: P2, l1: number, l2: number, bend: 1 | -1 | 'up' | 'down') {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  let d = Math.hypot(dx, dy);
  d = Math.min(d, l1 + l2 - 0.01);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(l1 * l1 - a * a, 0));
  const ux = dx / d, uy = dy / d;
  // perpendicular escolhida para que a junta fique do lado pedido em x
  let px = -uy, py = ux;
  const wrongSide =
    bend === 'up' ? py < 0 : bend === 'down' ? py > 0 : Math.sign(px || 1) !== bend;
  if (wrongSide) { px = -px; py = -py; }
  const j: P2 = [root[0] + ux * a + px * h, root[1] + uy * a + py * h];
  return { joint: j, a1: ang(j[0] - root[0], j[1] - root[1]), a2: ang(target[0] - j[0], target[1] - j[1]) };
}
const r = (n: number) => Math.round(n * 10) / 10;

// ---- Flexão: corpo reto girando em volta dos pés; mãos presas em (0, 8)
function plank(shoulderY: number, pivot: P2, len: number, label: string, pivotIsKnee = false) {
  const dy = shoulderY - pivot[1];
  const tilt = Math.asin(dy / len);
  const S: P2 = [pivot[0] + len * Math.cos(tilt), shoulderY];
  const torso = 90 - tilt * DEG; // mesmo ângulo para tronco e coxa
  const arm = ik(S, [0, 8], 55, 56, 'up');
  console.log(label, { torso: r(torso), thigh: r(torso), arm: r(arm.a1 - torso), fore: r(arm.a2 - arm.a1), shoulderX: r(S[0]), elbow: arm.joint.map(r) , pivotIsKnee});
}
const px = -Math.sqrt(285 * 285 - (119 - 30) ** 2);
console.log('--- flexao_padrao (pés em y=30; âncora mão 0,8)');
plank(119, [px, 30], 285, 'topo');
plank(36, [px, 30], 285, 'baixo');
console.log('--- flexao_joelhos (joelho em x=-163,y=12; âncora mão 0,8)');
plank(119, [-163, 12], 195, 'topo', true);
plank(36, [-163, 12], 195, 'baixo', true);

// ---- Afundo: pé da frente (direita) preso em (0,10); pé de trás em (-175, 30)
function lunge(hip: P2, label: string) {
  const front = ik(hip, [0, 10], 95, 90, 1);
  const backKneeTarget = ik(hip, [-175, 30], 95, 90, 1);
  console.log(label, {
    right: { thigh: r(front.a1), shin: r(front.a2 - front.a1), foot: r(0 - front.a2) },
    left: { thigh: r(backKneeTarget.a1), shin: r(backKneeTarget.a2 - backKneeTarget.a1), foot: r(60 - backKneeTarget.a2) },
    backKnee: backKneeTarget.joint.map(r),
  });
}
console.log('--- afundo (âncora tornozelo direito 0,10)');
lunge([-80, 170], 'topo');
lunge([-85, 112], 'baixo');
