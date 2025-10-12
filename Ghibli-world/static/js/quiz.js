document.addEventListener("DOMContentLoaded", () => {
  const quizCard = document.getElementById('quizCard');
  const resultCard = document.getElementById('resultCard');
  const resultInner = document.getElementById('resultInner');
  const recEl = document.getElementById('recommendations');
  const nextBtn = document.getElementById('nextBtn');
  const backBtn = document.getElementById('backBtn');
  const pNow = document.getElementById('pNow');
  const pTotal = document.getElementById('pTotal');
  const qText = document.getElementById('qText');
  const choices = document.getElementById('choices');
  const retryBtn = document.getElementById('retryBtn');
  const shareBtn = document.getElementById('shareBtn');
  const confetti = document.getElementById('confetti');

  const QUESTIONS = [
    { q: "Pick a cozy setting:", opts: [
      { label: "Mossy forest path", val: "calm" },
      { label: "Windy seaside cliff", val: "curious" },
      { label: "Floating above the town", val: "romantic" },
      { label: "Hidden alley with lanterns", val: "mysterious" },
    ]},
    { q: "What calls to you right now?", opts: [
      { label: "A small adventure", val: "curious" },
      { label: "Helping someone quietly", val: "kind" },
      { label: "Trying something a bit scary", val: "brave" },
      { label: "Finishing a promise", val: "determined" },
    ]},
    { q: "Pick a companion:", opts: [
      { label: "Forest spirit", val: "calm" },
      { label: "Talking cat", val: "curious" },
      { label: "Fire demon", val: "romantic" },
      { label: "Soot sprite", val: "mysterious" },
    ]},
    { q: "A sound you love:", opts: [
      { label: "Bamboo leaves in the wind", val: "calm" },
      { label: "Waves and gulls", val: "curious" },
      { label: "Distant music", val: "romantic" },
      { label: "Night city hum", val: "determined" },
    ]},
    { q: "Choose a treat:", opts: [
      { label: "Steamy onigiri", val: "kind" },
      { label: "Warm bread from a tiny bakery", val: "romantic" },
      { label: "Street food under paper lanterns", val: "curious" },
      { label: "Tea on a porch in the rain", val: "calm" },
    ]},
    { q: "What energy do you want to carry this week?", opts: [
      { label: "Gentle and steady", val: "kind" },
      { label: "Brave and bright", val: "brave" },
      { label: "Curious and open", val: "curious" },
      { label: "Dreamy and warm", val: "romantic" },
    ]},
  ];

  const total = QUESTIONS.length;
  pTotal.textContent = total;

  let step = 0;
  let answers = [];
  let selected = null;

  function renderStep() {
    const data = QUESTIONS[step];
    pNow.textContent = String(step + 1);
    qText.textContent = data.q;
    backBtn.style.display = step > 0 ? 'inline-block' : 'none';
    nextBtn.textContent = step === total - 1 ? 'See my result' : 'Next';
    choices.innerHTML = '';
    selected = null;
    data.opts.forEach((o, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'button';
      btn.style.margin = '6px 8px 6px 0';
      btn.textContent = o.label;
      btn.addEventListener('click', () => {
        selected = o.val;
        Array.from(choices.children).forEach(c => c.style.outline = 'none');
        btn.style.outline = '3px solid var(--accent-2)';
      });
      choices.appendChild(btn);
    });
  }

  async function submitAnswers() {
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });
      if(!res.ok) throw new Error('Failed to get result');
      const data = await res.json();
      showResult(data);
    } catch (err) {
      resultInner.innerHTML = '<p>something went wrong. Try again later.</p>';
      resultCard.style.display = 'block';
      console.error(err);
    }
  }

  function boomConfetti() {
    const ctx = confetti.getContext('2d');
    const W = confetti.width = window.innerWidth;
    const H = confetti.height = window.innerHeight;
    confetti.style.display = 'block';
    const pieces = Array.from({length: 80}, () => ({
      x: Math.random()*W,
      y: -20 - Math.random()*H/2,
      r: 3+Math.random()*4,
      c: ['#ffd1dc','#a2cdb0','#f7e1ae','#9ed0ff'][Math.floor(Math.random()*4)],
      s: 1 + Math.random()*2
    }));
    let t = 0;
    const tick = () => {
      ctx.clearRect(0,0,W,H);
      pieces.forEach(p => {
        p.y += p.s*2;
        p.x += Math.sin((p.y+p.r)/30);
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fill();
      });
      t++;
      if (t < 180) requestAnimationFrame(tick); else confetti.style.display = 'none';
    };
    tick();
  }

  function showResult(data) {
    quizCard.style.display = 'none';
    const imgSrc = data.image || data.film_image || '';
    resultInner.innerHTML = `
      <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
        ${imgSrc ? `<img src="${imgSrc}" alt="${data.name}" style="width:140px;height:140px;object-fit:cover;border-radius:12px">` : ''}
        <div>
          <h3 style="margin:0">${data.name || 'Your Ghibli Match'}</h3>
          <small style="color:var(--muted)">${data.film || ''}</small>
          ${data.quote ? `<p style="margin:10px 0 0">“${data.quote}”</p>` : ''}
        </div>
      </div>
    `;

    if (Array.isArray(data.recommended) && data.recommended.length){
      recEl.innerHTML = '<h4 style="margin:0 0 8px">You might also like</h4>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px">' +
        data.recommended.map(r => `
          <div class="card" style="padding:0;overflow:hidden">
            ${r.image ? `<img src="${r.image}" alt="${r.title}" style="width:100%;height:120px;object-fit:cover">` : ''}
            <div style="padding:10px">
              <div style="font-weight:700">${r.title}</div>
              <small style="color:var(--muted)">${r.year || ''} ${r.director ? '• '+r.director : ''}</small>
            </div>
          </div>
        `).join('') +
        '</div>';
    } else {
      recEl.innerHTML = '';
    }

    resultCard.style.display = 'block';
    boomConfetti();

    shareBtn?.addEventListener('click', () => {
      const text = `I got ${data.name} (${data.film}) on Ghibli World!`;
      if (navigator.share) {
        navigator.share({ text }).catch(()=>{});
      } else {
        navigator.clipboard.writeText(text);
        alert('Result copied to clipboard!');
      }
    });
  }

  nextBtn.addEventListener('click', () => {
    if (selected == null) return; // require a pick
    answers.push(selected);
    if (step === total - 1) {
      submitAnswers();
      return;
    }
    step++;
    renderStep();
  });

  backBtn.addEventListener('click', () => {
    if (step === 0) return;
    step--;
    answers.pop();
    renderStep();
  });

  retryBtn.addEventListener('click', () => {
    resultCard.style.display = 'none';
    quizCard.style.display = 'block';
    step = 0;
    answers = [];
    renderStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  renderStep();
});
