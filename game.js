(() => {
  const ball = document.getElementById('eightBall');
  const textEl = document.getElementById('eightBallText');
  const windowEl = document.getElementById('eightBallWindow');
  const promptEl = document.getElementById('eightBallPrompt');

  const answers = [
    // positive
    { text: "Skylight confirmed", mood: "good" },
    { text: "The vibes are immaculate", mood: "good" },
    { text: "Bay windows in your future", mood: "good" },
    { text: "The landlord will love you", mood: "good" },
    { text: "Clawfoot tub energy", mood: "good" },
    { text: "The M train is two blocks away", mood: "good" },
    { text: "Hardwood floors, obviously", mood: "good" },
    { text: "Your plants will thrive", mood: "good" },
    { text: "This one has character", mood: "good" },
    // neutral
    { text: "Ask the broker again", mood: "neutral" },
    { text: "The listing photos are... aspirational", mood: "neutral" },
    { text: "Check back after the open house", mood: "neutral" },
    { text: "It's rent stabilized (in your dreams)", mood: "neutral" },
    { text: "The floor plan is... creative", mood: "neutral" },
    // negative
    { text: "That's a closet, not a bedroom", mood: "bad" },
    { text: "The roaches have seniority", mood: "bad" },
    { text: "Broker fee says no", mood: "bad" },
    { text: "NO PETS (or plants)", mood: "bad" },
    { text: "The shower is in the kitchen", mood: "bad" },
    { text: "Street noise level: airplane", mood: "bad" },
    { text: "\"Cozy\" = you can touch both walls", mood: "bad" },
    { text: "The stove has one working burner", mood: "bad" },
  ];

  const prompts = [
    "will we find a skylight?",
    "is this the one?",
    "should we go to the open house?",
    "will the broker ghost us?",
    "does it have bay windows?",
    "is the bathroom nice?",
    "will we get the place?",
    "are the appliances decent?",
    "is it near the subway?",
    "does it have character?",
    "is the kitchen real?",
    "will our plants survive?",
  ];

  let shaking = false;
  let promptIndex = 0;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  shuffle(prompts);

  function shake() {
    if (shaking) return;
    shaking = true;

    ball.classList.add('shaking');
    textEl.style.opacity = '0';

    promptEl.textContent = prompts[promptIndex % prompts.length];
    promptEl.style.fontStyle = 'italic';
    promptIndex++;

    setTimeout(() => {
      const answer = answers[Math.floor(Math.random() * answers.length)];

      ball.classList.remove('shaking');
      textEl.textContent = answer.text;
      textEl.style.opacity = '1';

      windowEl.className = 'eight-ball-window mood-' + answer.mood;

      setTimeout(() => {
        promptEl.textContent = 'tap to ask another';
        promptEl.style.fontStyle = '';
        shaking = false;
      }, 300);
    }, 1200);
  }

  ball.addEventListener('click', shake);
  ball.addEventListener('touchstart', (e) => {
    e.preventDefault();
    shake();
  }, { passive: false });
})();
