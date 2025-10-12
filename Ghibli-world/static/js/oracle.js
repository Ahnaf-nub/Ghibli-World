document.addEventListener("DOMContentLoaded", async () => {
  const moodChips = document.querySelectorAll('.mood-chip');
  const generateBtn = document.getElementById('generateSpirit');
  const resetBtn = document.getElementById('resetSpirit');
  const suggestionWrap = document.getElementById('oracleSuggestion');
  const hero = document.querySelector('.oracle-hero');
  const quoteSection = document.getElementById('oracleWhisper');
  const quoteText = document.getElementById('oracleQuote');
  const quoteSource = document.getElementById('oracleSource');

  const moodMap = {
    cozy: {
      title: 'A blanket, some tea, and…',
      blurb: 'Wholesome comfort stories full of warm kitchens, gentle friendships, and sleepy forest naps.',
      picks: ['My Neighbor Totoro', "Kiki's Delivery Service", 'Whisper of the Heart'],
      palette: 'linear-gradient(135deg, rgba(244,212,140,0.45), rgba(124,197,179,0.4))',
      quote: {
        text: 'Whenever someone creates something with all of their heart, then that creation is given a soul.',
        source: '— The Cat Returns'
      }
    },
    adventure: {
      title: 'Pack a satchel for adventure',
      blurb: 'Airships, daring rescues, and windswept horizons await in these adventurous epics.',
      picks: ['Castle in the Sky', 'Nausicaä of the Valley of the Wind', 'Porco Rosso'],
      palette: 'linear-gradient(135deg, rgba(148,183,226,0.55), rgba(124,197,179,0.45))',
      quote: {
        text: 'You cannot change fate. However, you can rise to meet it.',
        source: '— Princess Mononoke'
      }
    },
    whimsical: {
      title: 'Lose yourself in magic',
      blurb: 'Slip into dreamlike worlds where trains run through the sea and castles roam the clouds.',
      picks: ['Spirited Away', "Howl's Moving Castle", 'Ponyo'],
      palette: 'linear-gradient(135deg, rgba(148,183,226,0.6), rgba(219,173,255,0.4))',
      quote: {
        text: 'Life is a winking light in the darkness.',
        source: '— The Tale of the Princess Kaguya'
      }
    },
    melancholy: {
      title: 'Bittersweet reflections',
      blurb: 'Tender, thoughtful stories that linger with you long after the credits roll.',
      picks: ['When Marnie Was There', 'Grave of the Fireflies', 'The Wind Rises'],
      palette: 'linear-gradient(135deg, rgba(148,183,226,0.4), rgba(102,119,163,0.45))',
      quote: {
        text: 'Nothing that happens is ever forgotten, even if you can’t remember it.',
        source: '— Spirited Away'
      }
    },
    uplifting: {
      title: 'Hope takes flight',
      blurb: 'Optimistic tales that celebrate courage, community, and the kindness of small moments.',
      picks: ['From Up on Poppy Hill', 'The Secret World of Arrietty', 'The Tale of the Princess Kaguya'],
      palette: 'linear-gradient(135deg, rgba(124,197,179,0.55), rgba(244,212,140,0.5))',
      quote: {
        text: 'Always believe in yourself. Do this and no matter where you are, you will have nothing to fear.',
        source: '— The Cat Returns'
      }
    }
  };

  let activeMood = 'cozy';
  let films = [];
  let worldSnapshot = null;

  const normalize = str => (str || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  try {
    const [movieRes, worldRes] = await Promise.allSettled([
      fetch('/api/movies'),
      fetch('/api/world')
    ]);
    if (movieRes.status === 'fulfilled' && movieRes.value.ok) {
      films = await movieRes.value.json();
    }
    if (worldRes.status === 'fulfilled' && worldRes.value.ok) {
      worldSnapshot = await worldRes.value.json();
    }
  } catch (err) {
    console.error('Spirit Guide bootstrap failed', err);
  }

  const defaultMessage = () => {
    suggestionWrap.innerHTML = '<div class="oracle-empty">Pick a mood and spin the sky to see what the spirits suggest.</div>';
    if (quoteSection) {
      quoteSection.style.display = 'none';
    }
    if (hero) {
      hero.style.background = '';
    }
  };

  const findFilm = title => {
    const target = normalize(title);
    return films.find(f => normalize(f.title) === target);
  };

  const sparkleBurst = () => {
    if (!hero) return;
    for (let i = 0; i < 12; i += 1) {
      const spr = document.createElement('span');
      spr.className = 'sparkle';
      spr.style.left = `${15 + Math.random() * 70}%`;
      spr.style.top = `${30 + Math.random() * 40}%`;
      spr.style.animationDelay = `${Math.random() * 0.3}s`;
      hero.appendChild(spr);
      setTimeout(() => spr.remove(), 1200);
    }
  };

  const renderMood = moodKey => {
    const data = moodMap[moodKey];
    if (!data || !films.length) {
      defaultMessage();
      return;
    }

    const picks = data.picks
      .map(title => findFilm(title))
      .filter(Boolean);

    // Fill with additional films via keyword search if fewer than 3
    if (picks.length < 3) {
      const keywords = (data.blurb || '').split(/[, ]+/).filter(Boolean).map(normalize);
      const extras = films.filter(f => {
        const desc = normalize(f.description);
        return keywords.some(k => k.length > 5 && desc.includes(k));
      });
      extras.forEach(f => {
        if (picks.length >= 3) return;
        if (!picks.find(p => normalize(p.title) === normalize(f.title))) {
          picks.push(f);
        }
      });
    }

    suggestionWrap.innerHTML = '';

    const note = document.createElement('div');
    note.className = 'oracle-note';
    note.innerHTML = `<h3>${data.title}</h3><p>${data.blurb}</p>`;
    suggestionWrap.appendChild(note);

    picks.slice(0, 3).forEach(film => {
      const card = document.createElement('div');
      card.className = 'oracle-card';
      const chips = [];
      if (film.year) chips.push(`<span class="chip">${film.year}</span>`);
      if (film.director) chips.push(`<span class="chip">Director: ${film.director}</span>`);
      if (film.rt_score) chips.push(`<span class="chip">RT ${film.rt_score}</span>`);
      if (film.running_time) chips.push(`<span class="chip">${film.running_time} min</span>`);
      card.innerHTML = `
        <img src="${film.image || film.poster || film.movie_banner || ''}" alt="${film.title}" onerror="this.style.display='none'" />
        <div class="oracle-card-body">
          <h4>${film.title}</h4>
          <p>${(film.description || '').slice(0, 220)}${(film.description || '').length > 220 ? '…' : ''}</p>
          <div class="chips">${chips.join('')}</div>
        </div>
      `;
      suggestionWrap.appendChild(card);
    });

    if (hero && data.palette) {
      hero.style.background = data.palette;
    }

    const quoteChoice = data.quote || (worldSnapshot?.quotes ? worldSnapshot.quotes[Math.floor(Math.random() * worldSnapshot.quotes.length)] : null);
    if (quoteChoice && quoteText && quoteSection) {
      const qText = quoteChoice.text || quoteChoice.quote || '';
      if (qText) {
        quoteText.textContent = qText.startsWith('“') ? qText : `“${qText}”`;
      }
      if (quoteSource) {
        const src = quoteChoice.source || '';
        quoteSource.textContent = src ? (src.trim().startsWith('—') ? src : `— ${src}`) : '';
      }
      quoteSection.style.display = 'block';
    }

    sparkleBurst();
  };

  moodChips.forEach(chip => {
    chip.addEventListener('click', () => {
      moodChips.forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      activeMood = chip.dataset.mood;
    });
  });

  generateBtn?.addEventListener('click', () => {
    if (!activeMood) {
      activeMood = 'cozy';
      const firstChip = document.querySelector('.mood-chip');
      firstChip?.classList.add('is-active');
    }
    renderMood(activeMood);
  });

  resetBtn?.addEventListener('click', () => {
    moodChips.forEach((chip, idx) => {
      chip.classList.toggle('is-active', idx === 0);
    });
    activeMood = 'cozy';
    defaultMessage();
  });

  defaultMessage();
});
