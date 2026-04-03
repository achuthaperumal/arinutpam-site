(function () {
  const canvas = document.getElementById('neuralCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height, nodes, pulses, mouse, animId, time = 0;

  mouse = { x: -1000, y: -1000 };

  function resize() {
    const hero = canvas.closest('.hero__canvas') || canvas.parentElement;
    width = canvas.width = hero.offsetWidth;
    height = canvas.height = hero.offsetHeight;
  }

  function createNodes() {
    const count = Math.min(Math.floor((width * height) / 18000), 50);
    nodes = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: 2 + Math.random() * 3,
        baseAlpha: 0.4 + Math.random() * 0.5,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
        hue: Math.random() > 0.5 ? 187 : 260, // cyan or violet
      });
    }
  }

  function createPulses() {
    pulses = [];
  }

  function spawnPulse() {
    if (nodes.length < 2) return;
    const a = Math.floor(Math.random() * nodes.length);
    let b = Math.floor(Math.random() * nodes.length);
    if (a === b) b = (b + 1) % nodes.length;

    const dx = nodes[b].x - nodes[a].x;
    const dy = nodes[b].y - nodes[a].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = Math.min(width, height) * 0.45;

    if (dist > maxDist) return;

    pulses.push({
      fromIdx: a,
      toIdx: b,
      progress: 0,
      speed: 0.008 + Math.random() * 0.015,
      alpha: 0.7 + Math.random() * 0.3,
      size: 6 + Math.random() * 6,
    });
  }

  function getEdges() {
    const edges = [];
    const maxDist = Math.min(width, height) * 0.4;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          edges.push({ i, j, dist, opacity: 1 - dist / maxDist });
        }
      }
    }
    return edges;
  }

  function update() {
    time += 0.016;

    // Move nodes
    for (const node of nodes) {
      node.x += node.vx;
      node.y += node.vy;
      node.pulsePhase += node.pulseSpeed;

      // Gentle drift variation
      node.vx += (Math.random() - 0.5) * 0.02;
      node.vy += (Math.random() - 0.5) * 0.02;
      node.vx = Math.max(-0.8, Math.min(0.8, node.vx));
      node.vy = Math.max(-0.8, Math.min(0.8, node.vy));

      // Mouse repulsion
      const dx = node.x - mouse.x;
      const dy = node.y - mouse.y;
      const mouseDist = Math.sqrt(dx * dx + dy * dy);
      if (mouseDist < 120) {
        const force = (120 - mouseDist) / 120 * 0.3;
        node.vx += (dx / mouseDist) * force;
        node.vy += (dy / mouseDist) * force;
      }

      // Bounce off edges
      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;
      node.x = Math.max(0, Math.min(width, node.x));
      node.y = Math.max(0, Math.min(height, node.y));
    }

    // Update pulses
    for (let i = pulses.length - 1; i >= 0; i--) {
      pulses[i].progress += pulses[i].speed;
      if (pulses[i].progress >= 1) {
        // Chance to chain — arriving pulse spawns new one from destination
        if (Math.random() < 0.4) {
          const dest = pulses[i].toIdx;
          const next = Math.floor(Math.random() * nodes.length);
          if (next !== dest) {
            const dx = nodes[next].x - nodes[dest].x;
            const dy = nodes[next].y - nodes[dest].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < Math.min(width, height) * 0.45) {
              pulses.push({
                fromIdx: dest,
                toIdx: next,
                progress: 0,
                speed: 0.008 + Math.random() * 0.015,
                alpha: 0.6 + Math.random() * 0.3,
                size: 5 + Math.random() * 5,
              });
            }
          }
        }
        pulses.splice(i, 1);
      }
    }

    // Spawn new pulses more frequently
    if (Math.random() < 0.08 && pulses.length < 15) {
      spawnPulse();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    const edges = getEdges();

    // Draw edges with animated shimmer
    for (const edge of edges) {
      const n1 = nodes[edge.i];
      const n2 = nodes[edge.j];
      const shimmer = 0.5 + 0.5 * Math.sin(time * 1.5 + edge.i * 0.5);
      const edgeAlpha = edge.opacity * 0.2 * (0.7 + 0.3 * shimmer);

      ctx.beginPath();
      ctx.moveTo(n1.x, n1.y);
      ctx.lineTo(n2.x, n2.y);
      ctx.strokeStyle = `rgba(6, 182, 212, ${edgeAlpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw pulse trails and heads
    for (const pulse of pulses) {
      const from = nodes[pulse.fromIdx];
      const to = nodes[pulse.toIdx];
      const x = from.x + (to.x - from.x) * pulse.progress;
      const y = from.y + (to.y - from.y) * pulse.progress;

      // Trail line
      const trailLen = 0.15;
      const trailStart = Math.max(0, pulse.progress - trailLen);
      const tx = from.x + (to.x - from.x) * trailStart;
      const ty = from.y + (to.y - from.y) * trailStart;
      const trailGrad = ctx.createLinearGradient(tx, ty, x, y);
      trailGrad.addColorStop(0, 'rgba(6, 182, 212, 0)');
      trailGrad.addColorStop(1, `rgba(6, 182, 212, ${pulse.alpha * 0.5})`);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(x, y);
      ctx.strokeStyle = trailGrad;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Pulse glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, pulse.size);
      gradient.addColorStop(0, `rgba(6, 182, 212, ${pulse.alpha * 0.9})`);
      gradient.addColorStop(0.4, `rgba(139, 92, 246, ${pulse.alpha * 0.4})`);
      gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.beginPath();
      ctx.arc(x, y, pulse.size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Bright core
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${pulse.alpha})`;
      ctx.fill();
    }

    // Draw nodes
    for (const node of nodes) {
      const pulseFactor = 0.5 + 0.5 * Math.sin(node.pulsePhase);
      const alpha = node.baseAlpha * (0.6 + 0.4 * pulseFactor);

      // Mouse proximity glow
      const dx = mouse.x - node.x;
      const dy = mouse.y - node.y;
      const mouseDist = Math.sqrt(dx * dx + dy * dy);
      const mouseGlow = Math.max(0, 1 - mouseDist / 180);

      const r = node.radius * (1 + 0.3 * pulseFactor + 0.4 * mouseGlow);
      const finalAlpha = Math.min(1, alpha + mouseGlow * 0.6);

      // Outer glow
      const glowSize = r * (4 + mouseGlow * 3);
      const cyanOrViolet = node.hue === 187
        ? `rgba(6, 182, 212, ${finalAlpha * 0.35})`
        : `rgba(139, 92, 246, ${finalAlpha * 0.25})`;
      const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowSize);
      glow.addColorStop(0, cyanOrViolet);
      glow.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.beginPath();
      ctx.arc(node.x, node.y, glowSize, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      const coreColor = node.hue === 187
        ? `rgba(6, 182, 212, ${finalAlpha})`
        : `rgba(139, 92, 246, ${finalAlpha})`;
      ctx.fillStyle = coreColor;
      ctx.fill();

      // Bright center
      ctx.beginPath();
      ctx.arc(node.x, node.y, r * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${finalAlpha * 0.7})`;
      ctx.fill();
    }
  }

  function animate() {
    if (document.hidden) {
      animId = requestAnimationFrame(animate);
      return;
    }
    update();
    draw();
    animId = requestAnimationFrame(animate);
  }

  function init() {
    resize();
    createNodes();
    createPulses();
    // Start with a few pulses already in flight
    for (let i = 0; i < 5; i++) spawnPulse();
    animate();
  }

  // Event listeners
  window.addEventListener('resize', () => {
    resize();
    createNodes();
  });

  document.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  document.addEventListener('mouseleave', () => {
    mouse.x = -1000;
    mouse.y = -1000;
  });

  // Allow pointer events for mouse tracking
  canvas.parentElement.style.pointerEvents = 'auto';
  canvas.style.pointerEvents = 'none';

  init();
})();
