(() => {
  const ball = document.getElementById('eightBall');
  const textEl = document.getElementById('eightBallText');
  const windowEl = document.getElementById('eightBallWindow');
  const promptEl = document.getElementById('eightBallPrompt');

  const questions = [
    {
      q: "will we find a skylight?",
      answers: [
        { text: "Skylight confirmed", mood: "good" },
        { text: "The sun will find you", mood: "good" },
        { text: "Does a sun lamp count?", mood: "neutral" },
        { text: "You'll get a ceiling, at least", mood: "bad" },
      ],
    },
    {
      q: "is this the one?",
      answers: [
        { text: "This is home", mood: "good" },
        { text: "You'll know when you see the windows", mood: "good" },
        { text: "Keep scrolling StreetEasy", mood: "bad" },
        { text: "The right one is still out there", mood: "neutral" },
      ],
    },
    {
      q: "should we see this in person?",
      answers: [
        { text: "Absolutely, text the broker now", mood: "good" },
        { text: "There's an open house, so it'll be competitive", mood: "neutral" },
        { text: "The photos are AI, so it's the only way to know....", mood: "bad" },
      ],
    },
    {
      q: "does it have bay windows?",
      answers: [
        { text: "On both sides!", mood: "good" },
        { text: "Your plants will be so happy", mood: "good" },
        { text: "No but the windows are still nice!", mood: "neutral" },
        { text: "Bay windows are a state of mind", mood: "bad" },
      ],
    },
    {
      q: "is the bathroom nice?",
      answers: [
        { text: "There's a window and great shower pressure!", mood: "good" },
        { text: "The extractor fan seems solid", mood: "neutral" },
        { text: "The shower is in the kitchen", mood: "bad" },
      ],
    },
    {
      q: "will we get the place?",
      answers: [
        { text: "The landlord already loves you", mood: "good" },
        { text: "Your application is golden", mood: "good" },
        { text: "It's between you and one other", mood: "neutral" },
        { text: "They went with the couple who offered 6 months upfront", mood: "bad" },
      ],
    },
    {
      q: "are the appliances decent?",
      answers: [
        { text: "Gas stove, full-size fridge, yes", mood: "good" },
        { text: "They're all functional!", mood: "neutral" },
        { text: "The stove has one working burner", mood: "bad" },
      ],
    },
    {
      q: "is it near the subway?",
      answers: [
        { text: "M train, two blocks", mood: "good" },
        { text: "10 minute walk, that's solid", mood: "neutral" },
        { text: "There's a bus... somewhere", mood: "bad" },
        { text: "Hope you like cycling", mood: "bad" },
      ],
    },
    {
      q: "does it have character?",
      answers: [
        { text: "Yes! Look at the pocket doors and stained glass", mood: "good" },
        { text: "It has... potential", mood: "neutral" },
        { text: "If you mean character like a villain, yes", mood: "bad" },
      ],
    },
    {
      q: "is the kitchen real?",
      answers: [
        { text: "Counter space AND a dishwasher", mood: "good" },
        { text: "You could actually cook in here", mood: "good" },
        { text: "It's cozy but it works", mood: "neutral" },
        { text: "The microwave IS the kitchen", mood: "bad" },
      ],
    },
    {
      q: "will our plants survive?",
      answers: [
        { text: "Your plants will thrive", mood: "good" },
        { text: "South-facing windows, they'll love it", mood: "good" },
        { text: "Buy grow lights", mood: "bad" },
      ],
    },
    {
      q: "what about the neighbors?",
      answers: [
        { text: "They'll bring you cookies", mood: "good" },
        { text: "Quiet and friendly", mood: "good" },
        { text: "You'll nod in the hallway", mood: "neutral" },
        { text: "They have a drum kit", mood: "bad" },
      ],
    },
    {
      q: "is the rent worth it?",
      answers: [
        { text: "For this place? Absolutely", mood: "good" },
        { text: "Below market, somehow", mood: "good" },
        { text: "That's a closet, not a bedroom", mood: "bad" },
      ],
    },
    {
      q: "will the landlord be chill?",
      answers: [
        { text: "They live downstairs and trust you", mood: "good" },
        { text: "They'll text about the thermostat", mood: "bad" },
      ],
    },
  ];

  let shaking = false;
  let questionOrder = [];
  let questionIndex = 0;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function resetOrder() {
    questionOrder = shuffle([...Array(questions.length).keys()]);
    questionIndex = 0;
  }

  resetOrder();

  function shake() {
    if (shaking) return;
    shaking = true;

    if (questionIndex >= questionOrder.length) resetOrder();

    const q = questions[questionOrder[questionIndex]];
    questionIndex++;

    ball.classList.add('shaking');
    textEl.style.opacity = '0';

    promptEl.textContent = q.q;
    promptEl.style.fontStyle = 'italic';

    setTimeout(() => {
      const answer = q.answers[Math.floor(Math.random() * q.answers.length)];

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
