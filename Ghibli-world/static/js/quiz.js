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
  const answers = Array.from({ length: total }, () => null);
  let selected = null;
  let latestResult = null;

  shareBtn.disabled = true;

  function setSelected(value) {
    selected = value;
    answers[step] = value;
    Array.from(choices.children).forEach(btn => {
      btn.classList.toggle('is-selected', btn.dataset.value === value);
    });
    nextBtn.disabled = selected == null;
  }

  function renderStep() {
    const data = QUESTIONS[step];
    pNow.textContent = String(step + 1);
    qText.textContent = data.q;
    backBtn.style.display = step > 0 ? 'inline-flex' : 'none';
    nextBtn.textContent = step === total - 1 ? 'See my result' : 'Next';
    choices.innerHTML = '';
    selected = answers[step];
    data.opts.forEach((o) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'button choice-button';
      btn.dataset.value = o.val;
      btn.textContent = o.label;
      btn.addEventListener('click', () => setSelected(o.val));
      if (selected === o.val) {
        btn.classList.add('is-selected');
      }
      choices.appendChild(btn);
    });
    nextBtn.disabled = selected == null;
  }

  async function submitAnswers() {
    if (answers.some(value => value == null)) {
      return;
    }
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
      resultInner.innerHTML = '<p>Something went wrong. Try again later.</p>';
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

  nextBtn.addEventListener('click', () => {
    if (selected == null) return; // require a pick
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
    renderStep();
  });

  retryBtn.addEventListener('click', () => {
    resultCard.style.display = 'none';
    quizCard.style.display = 'block';
    step = 0;
    answers.fill(null);
    latestResult = null;
    shareBtn.disabled = true;
    shareBtn.textContent = 'Download keepsake';
    renderStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  async function waitForImages(container) {
    const imgs = Array.from(container.querySelectorAll('img'))
      .filter(img => !img.complete || img.naturalWidth === 0);
    if (!imgs.length) return;
    await Promise.all(imgs.map(img => new Promise(resolve => {
      const done = () => {
        img.removeEventListener('load', done);
        img.removeEventListener('error', done);
        resolve();
      };
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    })));
  }

  shareBtn.addEventListener('click', async (event) => {
    event.preventDefault();
    if (!latestResult) return;
    if (typeof html2canvas !== 'function') {
      alert('Image capture not supported right now.');
      return;
    }
    shareBtn.disabled = true;
    const originalText = shareBtn.textContent;
    shareBtn.textContent = 'Preparing image…';
    try {
      await waitForImages(resultCard);
      const canvas = await html2canvas(resultCard, {
        backgroundColor: '#f0f6f9',
        scale: Math.min(window.devicePixelRatio || 1, 2),
        useCORS: true,
        allowTaint: false,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      const filename = `ghibli-world-${latestResult.type || 'result'}.png`;
      link.download = filename;
      link.click();
    } catch (err) {
      console.error('Failed to capture result', err);
      alert('Could not create an image. Please try again.');
    } finally {
      shareBtn.disabled = false;
      shareBtn.textContent = originalText;
    }
  });

  function buildRecommendations(list) {
    recEl.innerHTML = '';
    if (!Array.isArray(list) || !list.length) {
      return;
    }

    const heading = document.createElement('h4');
    heading.className = 'result-subheading';
    heading.textContent = 'You might also like';
    recEl.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'recommendation-grid';

    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card recommendation-card';

      if (item.image) {
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.title || 'Film poster';
        img.className = 'recommendation-image';
        img.crossOrigin = 'anonymous';
        img.referrerPolicy = 'no-referrer';
        card.appendChild(img);
      }

      const body = document.createElement('div');
      body.className = 'recommendation-body';

      const title = document.createElement('div');
      title.className = 'recommendation-title';
      title.textContent = item.title || 'Untitled';
      body.appendChild(title);

      const metaParts = [item.year, item.director].filter(Boolean);
      if (metaParts.length) {
        const meta = document.createElement('small');
        meta.className = 'recommendation-meta';
        meta.textContent = metaParts.join(' • ');
        body.appendChild(meta);
      }

      card.appendChild(body);
      grid.appendChild(card);
    });

    recEl.appendChild(grid);
  }

  function showResult(data) {
    latestResult = data;
    quizCard.style.display = 'none';

    const header = document.createElement('div');
    header.className = 'result-header';

    const avatarSrc = data.image || data.film_image;
    if (avatarSrc) {
      const img = document.createElement('img');
      img.src = avatarSrc;
      img.alt = data.name || 'Result';
      img.className = 'result-avatar';
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      header.appendChild(img);
    }

    const textWrap = document.createElement('div');
    textWrap.className = 'result-text';

    const title = document.createElement('h3');
    title.className = 'result-title';
    title.textContent = data.name || 'Your Ghibli Match';
    textWrap.appendChild(title);

    if (data.film) {
      const film = document.createElement('small');
      film.className = 'result-film';
      film.textContent = data.film;
      textWrap.appendChild(film);
    }

    if (data.quote) {
      const quote = document.createElement('p');
      quote.className = 'result-quote';
      quote.textContent = `“${data.quote}”`;
      textWrap.appendChild(quote);
    }

    header.appendChild(textWrap);
    resultInner.innerHTML = '';
    resultInner.appendChild(header);

    buildRecommendations(data.recommended);

    shareBtn.textContent = 'Download keepsake';
    shareBtn.disabled = false;

    resultCard.style.display = 'block';
    boomConfetti();
  }

  renderStep();
});
