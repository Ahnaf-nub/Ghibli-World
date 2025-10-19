document.addEventListener('DOMContentLoaded', () => {
  const moodContainer = document.getElementById('moodChips');
  const realmContainer = document.getElementById('realmGrid');
  const resultCard = document.getElementById('fortuneResult');
  const lightBtn = document.getElementById('lightBtn');
  const clearBtn = document.getElementById('clearBtn');

  if(!moodContainer || !realmContainer || !resultCard || !lightBtn || !clearBtn){
    return;
  }

  const MOODS = [
    { key: 'calm', label: 'Calm breeze', blessing: 'A hush settles over your heart, like moss on an old stone.', ritual: 'Light a candle and stretch slowly while breathing in for four counts.' },
    { key: 'brave', label: 'Brave spark', blessing: 'Courage flickers like a silent ember waiting to leap.', ritual: 'Write down one fear and fold it into a paper plane to release.' },
    { key: 'playful', label: 'Playful tide', blessing: 'Laughter ripples outward, calling curious spirits to your side.', ritual: 'Hum your favorite tune while brewing tea; sip when the melody ends.' },
    { key: 'wise', label: 'Wise wind', blessing: 'Ideas ride the breeze, ready to settle into something new.', ritual: 'Copy a favorite quote by hand and pin it near your window.' },
    { key: 'kind', label: 'Kind ember', blessing: 'Warmth curls around you, reminding others to soften too.', ritual: 'Share a quiet compliment with someone who needs it today.' },
    { key: 'mysterious', label: 'Mysterious glow', blessing: 'The unseen tilts closer, eager to show you its hidden paths.', ritual: 'Take a twilight walk and collect three small found treasures.' },
  ];

  const REALMS = [
    {
      key: 'forest',
      label: 'Whispering Forest',
      description: 'Fern-soft trails, soot sprites, and Totoro’s patient grin.',
      films: ['My Neighbor Totoro', 'Princess Mononoke', 'When Marnie Was There'],
      aura: 'rgba(124,197,179,0.45)',
      lanternGradient: 'linear-gradient(180deg, rgba(124,197,179,0.92), rgba(96,155,126,0.72))',
      lanternGlow: '0 28px 46px rgba(96,155,126,0.42)',
    },
    {
      key: 'sky',
      label: 'Sky Harbor',
      description: 'Floating docks, gliders, and dreamers chasing the wind.',
      films: ['Castle in the Sky', 'The Wind Rises', 'Porco Rosso'],
      aura: 'rgba(148,183,226,0.45)',
      lanternGradient: 'linear-gradient(180deg, rgba(148,183,226,0.9), rgba(96,134,198,0.7))',
      lanternGlow: '0 30px 50px rgba(96,134,198,0.5)',
    },
    {
      key: 'town',
      label: 'Lantern Town',
      description: 'Paper lantern markets, tinkering shops, and late-night bread.',
      films: ['Kiki\'s Delivery Service', 'Whisper of the Heart', 'From Up on Poppy Hill'],
      aura: 'rgba(244,212,140,0.45)',
      lanternGradient: 'linear-gradient(180deg, rgba(244,212,140,0.92), rgba(212,169,96,0.72))',
      lanternGlow: '0 28px 46px rgba(212,169,96,0.48)',
    },
    {
      key: 'sea',
      label: 'Moonlit Sea',
      description: 'Gentle waves, Nashida’s songs, and luminous jellyfish.',
      films: ['Ponyo', 'Spirited Away', 'Ocean Waves'],
      aura: 'rgba(126,188,220,0.5)',
      lanternGradient: 'linear-gradient(180deg, rgba(126,188,220,0.92), rgba(64,148,184,0.7))',
      lanternGlow: '0 30px 52px rgba(64,148,184,0.5)',
    },
  ];

  const SECONDARY_STRINGS = {
    playful: 'A mischievous ripple promises delight if you follow the first whim that arrives.',
    wise: 'A breeze of clarity follows, urging you to sketch the idea before it drifts away.',
    kind: 'Let your softness spill outward; the world is parched for gentleness.',
    mysterious: 'Keep an eye on liminal doorways—tonight one might linger open.',
    brave: 'Step forward even if you still tremble; the lantern spirits applaud.',
    calm: 'Stillness is your compass; trust the way it points.',
  };

  const DEFAULT_AURA = 'rgba(148,183,226,0.28)';

  let selectedMoods = [];
  let selectedRealm = null;

  function renderMoods(){
    moodContainer.innerHTML = '';
    MOODS.forEach(mood => {
      const btn = document.createElement('button');
      btn.className = 'fortune-chip';
      btn.type = 'button';
      btn.textContent = mood.label;
      btn.dataset.key = mood.key;
      if(selectedMoods.includes(mood.key)){
        btn.classList.add('is-active');
      }
      btn.addEventListener('click', () => toggleMood(mood.key));
      moodContainer.appendChild(btn);
    });
  }

  function renderRealms(){
    realmContainer.innerHTML = '';
    REALMS.forEach(realm => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'fortune-realm-card';
      card.dataset.key = realm.key;
      card.innerHTML = `<h4>${realm.label}</h4><p>${realm.description}</p>`;
      if(selectedRealm === realm.key){
        card.classList.add('is-active');
      }
      card.addEventListener('click', () => selectRealm(realm.key));
      realmContainer.appendChild(card);
    });
  }

  function toggleMood(key){
    const idx = selectedMoods.indexOf(key);
    if(idx >= 0){
      selectedMoods.splice(idx, 1);
    } else {
      if(selectedMoods.length >= 2){
        selectedMoods.shift();
      }
      selectedMoods.push(key);
    }
    renderMoods();
  }

  function selectRealm(key){
    selectedRealm = selectedRealm === key ? null : key;
    renderRealms();
  }

  function pickRandom(list){
    return list[Math.floor(Math.random() * list.length)];
  }

  function buildFortune(){
    if(selectedMoods.length === 0 || !selectedRealm){
      resultCard.innerHTML = '<div class="fortune-placeholder"><p>Pick at least one mood and a realm to receive a fortune.</p></div>';
      resultCard.classList.remove('is-lit');
      resultCard.removeAttribute('data-theme');
      resultCard.style.removeProperty('--fortune-aura');
      return;
    }

    const primaryMoodKey = selectedMoods[0];
    const secondaryMoodKey = selectedMoods[1] || null;
    const primaryMood = MOODS.find(m => m.key === primaryMoodKey);
    const realm = REALMS.find(r => r.key === selectedRealm);

    if(!primaryMood || !realm){
      return;
    }

    const filmSuggestion = pickRandom(realm.films);
    const container = document.createElement('div');
    container.className = 'fortune-output';

    const lantern = document.createElement('div');
    lantern.className = 'fortune-lantern';
    lantern.dataset.realm = realm.key;
    if(realm.lanternGradient){
      lantern.style.background = realm.lanternGradient;
    }
    if(realm.lanternGlow){
      lantern.style.boxShadow = realm.lanternGlow;
    }
    const flame = document.createElement('div');
    flame.className = 'fortune-flame';
    lantern.appendChild(flame);
    container.appendChild(lantern);

    const textWrap = document.createElement('div');
    textWrap.className = 'fortune-text';
    const heading = document.createElement('h3');
    heading.textContent = `${realm.label} beckons`;
    textWrap.appendChild(heading);

    const blessing = document.createElement('p');
    blessing.className = 'fortune-blessing';
    blessing.textContent = primaryMood.blessing;
    textWrap.appendChild(blessing);

    if(secondaryMoodKey){
      const secondary = document.createElement('p');
      secondary.className = 'fortune-secondary';
      secondary.textContent = SECONDARY_STRINGS[secondaryMoodKey];
      textWrap.appendChild(secondary);
    }

    const filmLine = document.createElement('div');
    filmLine.className = 'fortune-film';
    filmLine.innerHTML = `Tonight, watch <strong>${filmSuggestion}</strong>.`;
    textWrap.appendChild(filmLine);

    const ritual = document.createElement('div');
    ritual.className = 'fortune-ritual';
    const ritualLabel = document.createElement('span');
    ritualLabel.textContent = 'Small ritual:';
    const ritualText = document.createElement('p');
    ritualText.textContent = primaryMood.ritual;
    ritual.appendChild(ritualLabel);
    ritual.appendChild(ritualText);
    textWrap.appendChild(ritual);

    container.appendChild(textWrap);

    resultCard.innerHTML = '';
    resultCard.appendChild(container);
    resultCard.setAttribute('data-theme', realm.key);
    resultCard.style.setProperty('--fortune-aura', realm.aura || DEFAULT_AURA);
    requestAnimationFrame(() => {
      resultCard.classList.add('is-lit');
    });
  }

  lightBtn.addEventListener('click', () => {
    buildFortune();
  });

  clearBtn.addEventListener('click', () => {
    selectedMoods = [];
    selectedRealm = null;
    renderMoods();
    renderRealms();
    resultCard.innerHTML = '<div class="fortune-placeholder"><p>Light a lantern to receive your fortune.</p></div>';
    resultCard.classList.remove('is-lit');
    resultCard.removeAttribute('data-theme');
    resultCard.style.removeProperty('--fortune-aura');
  });

  renderMoods();
  renderRealms();
});
