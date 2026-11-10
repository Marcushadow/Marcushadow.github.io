(() => {
  'use strict';
  const essay = document.querySelector('.science-essay');
  if (!essay) return;
  const byId = id => document.getElementById(id);
  essay.querySelectorAll('[data-enhanced]').forEach(element => { element.hidden = false; });

  // The deliberately simple answer machine runs locally, with no model request.
  const observations = [{ input: 3, output: 12 }];
  byId('rule-form').addEventListener('submit', event => {
    event.preventDefault();
    const input = byId('rule-number').valueAsNumber;
    if (!Number.isInteger(input) || input < -20 || input > 20) {
      byId('rule-error').textContent = 'Choose a whole number between −20 and 20.';
      return;
    }
    byId('rule-error').textContent = '';
    const output = input * (input + 1);
    byId('rule-result').textContent = output;
    observations.push({ input, output });
    if (observations.length > 6) observations.shift();
    byId('rule-history').replaceChildren(...observations.map(observation => {
      const item = document.createElement('li');
      item.textContent = `${observation.input} → ${observation.output}`;
      return item;
    }));
  });
  byId('prediction-form').addEventListener('submit', event => {
    event.preventDefault();
    const guess = byId('rule-guess').valueAsNumber;
    if (!Number.isInteger(guess)) return;
    byId('prediction-feedback').textContent = guess === 132
      ? '132 is right. Could you explain the rule to someone else? Open the machine to compare your reasoning.'
      : `${guess} is not the machine's answer. Try a few more inputs, or open the machine to see the rule. An unexpected result is useful evidence.`;
  });

  function showDetail(target, heading, body, headingTag = 'h4') {
    const title = document.createElement(headingTag);
    title.textContent = heading;
    const paragraph = document.createElement('p');
    paragraph.textContent = body;
    target.replaceChildren(title, paragraph);
  }

  const proteinDetails = {
    high: ['More confidence in the local structure.', 'Blue indicates a more confident prediction of this region’s structure. Confidence is useful evidence, but it is not experimental confirmation or a guarantee of biological function.'],
    low: ['Uncertainty is part of the result.', 'Orange indicates lower confidence in this region’s predicted structure. The region may be flexible or disordered, or the model may be uncertain. A lower-confidence region is not automatically unimportant or a mistake.'],
    lab: ['A prediction gives you something to test.', 'Experiments can probe structure, interactions and function in relevant conditions. Researchers still need to ask whether the predicted shape matches the evidence and what the protein actually does. The appropriate test depends on the question.']
  };
  essay.querySelectorAll('[data-protein]').forEach(button => {
    button.addEventListener('click', () => {
      const selected = button.dataset.protein;
      essay.querySelectorAll('[data-protein]').forEach(option => {
        const active = option.dataset.protein === selected;
        option.setAttribute('aria-pressed', String(active));
        option.classList.toggle('is-selected', active);
      });
      showDetail(byId('protein-detail'), ...proteinDetails[selected]);
    });
  });

  const creditDetails = {
    question: ['A similar approach, a question of provenance.', 'Buckmaster raised concerns about the relationship between his private work and OpenAI’s result. His account is one side of a disputed attribution story, not proof that ideas were taken.'],
    response: ['OpenAI says private prompts had no influence.', 'In its September 10 update, OpenAI said its investigation found Buckmaster’s prompts could not have influenced the system, including through training. It also distinguished the mathematical results and recognised the priority of Alpöge and Buckmaster’s forced-Euler work.'],
    lesson: ['Keep a trail people can inspect.', 'A record of contributions, experiments and AI use makes credit easier to examine. Confidential records need not all be public. The broader concern about transparency remains separate from whether any particular allegation is true.']
  };
  essay.querySelectorAll('[data-credit]').forEach(button => {
    button.addEventListener('click', () => {
      essay.querySelectorAll('[data-credit]').forEach(option => {
        const active = option === button;
        option.setAttribute('aria-pressed', String(active));
        option.classList.toggle('is-selected', active);
      });
      showDetail(byId('credit-detail'), ...creditDetails[button.dataset.credit], 'h3');
    });
  });

  byId('load-interview').addEventListener('click', () => {
    const player = document.createElement('iframe');
    player.src = 'https://www.youtube-nocookie.com/embed/Mzbtj5nkMXI?autoplay=1&rel=0';
    player.title = 'The Buckmaster Interview (Navier-Stokes) — Numberphile';
    player.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    player.allowFullscreen = true;
    player.referrerPolicy = 'strict-origin-when-cross-origin';
    byId('interview-stage').replaceChildren(player);
    player.focus();
  }, { once: true });

  const defaultTeam = { data: 'ai', code: 'ai', question: 'human', explain: 'human', check: 'human', sign: 'human' };
  let team = { ...defaultTeam };
  const concerns = {
    question: 'Research direction: if AI chooses the question, who decides whether it is worth asking and whose interests it serves?',
    explain: 'Understanding: someone must be able to explain the central claim, including its limits, rather than repeat an output.',
    check: 'Verification: generated evidence needs independent checking. A system reviewing its own work can repeat its mistakes.',
    sign: 'Accountability: AI cannot accept responsibility for a paper. ICMJE authorship guidance keeps this obligation with humans.'
  };
  function updateTeam() {
    essay.querySelectorAll('[data-task]').forEach(button => {
      const active = team[button.dataset.task] === button.dataset.owner;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-selected', active);
    });
    const delegatedJudgement = Object.keys(concerns).filter(task => team[task] === 'ai');
    const allHuman = Object.values(team).every(owner => owner === 'human');
    const target = byId('team-feedback');
    if (delegatedJudgement.length) {
      showDetail(target, team.sign === 'ai' ? 'Who will put their name to this?' : 'Some judgement has left human hands.', 'This is where I would ask for more human involvement. Your choices raise these questions:');
      const list = document.createElement('ul');
      delegatedJudgement.forEach(task => {
        const item = document.createElement('li');
        item.textContent = concerns[task];
        list.append(item);
      });
      target.append(list);
    } else if (allHuman) {
      showDetail(target, 'People lead every step.', 'You have kept every task with humans. That preserves direct involvement, but it can also leave researchers doing repetitive work that useful tools could assist with. Human work still needs checking.');
    } else {
      showDetail(target, 'Assistance with a human at the helm.', 'Your team delegates routine work while keeping explanation, checking and responsibility with people. Even the delegated work still needs review.');
    }
  }
  essay.querySelectorAll('[data-task]').forEach(button => {
    button.addEventListener('click', () => {
      team[button.dataset.task] = button.dataset.owner;
      updateTeam();
    });
  });
  byId('reset-team').addEventListener('click', () => {
    team = { ...defaultTeam };
    updateTeam();
  });

  // Use the reader's current chapter for quiet orientation, without moving focus.
  const chapterLinks = [...essay.querySelectorAll('.science-chapters a')];
  const chapters = [...essay.querySelectorAll('.science-section')];
  let chapterUpdatePending = false;
  function updateChapter() {
    chapterUpdatePending = false;
    const current = chapters.filter(section => section.getBoundingClientRect().top <= 180).pop();
    chapterLinks.forEach(link => {
      if (current && link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function scheduleChapterUpdate() {
    if (chapterUpdatePending) return;
    chapterUpdatePending = true;
    requestAnimationFrame(updateChapter);
  }
  window.addEventListener('scroll', scheduleChapterUpdate, { passive: true });
  window.addEventListener('resize', scheduleChapterUpdate);
  updateChapter();

  // A stylised vector field, not a fluid solver or a depiction of a proof.
  const canvas = byId('flow-canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    essay.querySelector('.flow-controls').hidden = true;
    return;
  }
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motionPreference.matches;
  let visible = true;
  let frame = null;
  let lastTime = 0;
  let width = 1;
  let height = 1;
  let curl = Number(byId('flow-curl').value) / 100;
  let pointer = null;
  let particles = [];
  const colours = ['#8ecfc4', '#b5d7ca', '#e6ad7a', '#72aaa0'];
  function newParticle(scattered = true) {
    return { x: Math.random() * width, y: Math.random() * height * .76, age: scattered ? Math.random() * 180 : 0, colour: colours[Math.floor(Math.random() * colours.length)] };
  }
  function advance(step = 1) {
    context.fillStyle = 'rgba(25, 46, 45, 0.055)';
    context.fillRect(0, 0, width, height);
    particles.forEach((particle, index) => {
      const dx = particle.x - width * .5;
      const dy = particle.y - height * .36;
      const radius = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) + Math.PI / 2 + Math.sin(radius / 70 + curl * 4) * (.25 + curl * .65);
      let vx = Math.cos(angle) * (1.2 + curl * 2);
      let vy = Math.sin(angle) * (1.2 + curl * 2);
      if (pointer) {
        const px = particle.x - pointer.x;
        const py = particle.y - pointer.y;
        const influence = Math.max(0, 1 - Math.hypot(px, py) / 110);
        vx += -py * influence * .025;
        vy += px * influence * .025;
      }
      context.beginPath();
      context.moveTo(particle.x, particle.y);
      particle.x += vx * step;
      particle.y += vy * step;
      context.lineTo(particle.x, particle.y);
      context.strokeStyle = particle.colour;
      context.lineWidth = .85;
      context.stroke();
      particle.age += step;
      if (particle.age > 210 || particle.x < 0 || particle.x > width || particle.y < 0 || particle.y > height * .79) particles[index] = newParticle(false);
    });
  }
  function staticField() {
    context.fillStyle = '#192e2d';
    context.fillRect(0, 0, width, height);
    particles = Array.from({ length: width < 350 ? 170 : 260 }, () => newParticle());
    for (let index = 0; index < 70; index++) advance();
  }
  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    staticField();
  }
  function animate(time) {
    frame = null;
    if (paused || !visible || document.hidden) return;
    const step = lastTime ? Math.min((time - lastTime) / 16.67, 2) : 1;
    lastTime = time;
    advance(step);
    frame = requestAnimationFrame(animate);
  }
  function syncMotion() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastTime = 0;
    byId('flow-pause').textContent = paused ? 'Play motion' : 'Pause motion';
    byId('flow-pause').setAttribute('aria-pressed', String(paused));
    if (!paused && visible && !document.hidden) frame = requestAnimationFrame(animate);
  }
  byId('flow-pause').addEventListener('click', () => { paused = !paused; syncMotion(); });
  byId('flow-curl').addEventListener('input', event => {
    curl = Number(event.target.value) / 100;
    if (paused) staticField();
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const bounds = canvas.getBoundingClientRect();
    pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  });
  canvas.addEventListener('pointerleave', () => { pointer = null; });
  motionPreference.addEventListener('change', event => { paused = event.matches; syncMotion(); });
  document.addEventListener('visibilitychange', syncMotion);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncMotion(); }).observe(canvas);
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  resize();
  syncMotion();
})();
