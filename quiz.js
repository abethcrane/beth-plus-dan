(() => {
  const questions = [
    {
      prompt: "Pick a Saturday morning",
      options: [
        { text: "Farmer's market at 8am", scores: { location: 1, quiet: -1 } },
        { text: "Sleeping in, dead silent", scores: { quiet: 1, soul: 1 } },
        { text: "Coffee shop with a book", scores: { location: 1, soul: 1 } },
        { text: "Brunch with 8 people", scores: { location: 1, quiet: -1, efficiency: 1 } },
      ],
    },
    {
      prompt: "Pick a subway line",
      options: [
        { text: "The G", scores: { soul: 1, quiet: 1 } },
        { text: "The L", scores: { location: 1, quiet: -1 } },
        { text: "The M", scores: { soul: 1, location: 1 } },
        { text: "The C", scores: { space: 1, quiet: 1 } },
      ],
    },
    {
      prompt: "Pick a pizza order",
      options: [
        { text: "Oh we're making this from scratch", scores: { efficiency: -1, quiet: 1 } },
        { text: "Grandma slice", scores: { soul: 1, space: 1 } },
        { text: "Whatever Panina's special is", scores: { soul: 1, quiet: -1 } },
        { text: "Dollar slice — it's fuel", scores: { efficiency: 1, location: 1 } },
      ],
    },
    {
      prompt: "Pick a color",
      options: [
        { text: "Warm white", scores: { efficiency: 1, quiet: 1 } },
        { text: "Sage green", scores: { soul: 1, quiet: 1 } },
        { text: "Exposed brick red", scores: { soul: 1, quiet: -1 } },
        { text: "Matte black", scores: { efficiency: 1, location: 1 } },
      ],
    },
    {
      prompt: "Pick a window",
      options: [
        { text: "Bay window with a seat", scores: { soul: 1, space: 1 } },
        { text: "Floor-to-ceiling glass", scores: { efficiency: 1, location: 1 } },
        { text: "Skylight", scores: { soul: 1, quiet: 1, space: 1 } },
        { text: "One that opens onto a fire escape", scores: { soul: 1, quiet: -1 } },
      ],
    },
    {
      prompt: "Pick a plant",
      options: [
        { text: "Monstera", scores: { soul: 1, space: 1 } },
        { text: "Pothos (they have the will to live)", scores: { efficiency: 1 } },
        { text: "Fire escape herbs", scores: { soul: 1, quiet: -1 } },
        { text: "I'll pass", scores: { efficiency: 1, location: 1 } },
      ],
    },
    {
      prompt: "Pick a sound",
      options: [
        { text: "Rain on a skylight", scores: { quiet: 1, soul: 1, space: 1 } },
        { text: "Nothing at all", scores: { quiet: 1, efficiency: 1 } },
        { text: "Street noise from below", scores: { quiet: -1, location: 1 } },
        { text: "Music from next door", scores: { quiet: -1, soul: 1 } },
      ],
    },
    {
      prompt: "Pick a morning drink",
      options: [
        { text: "Pour-over, the ritual matters", scores: { soul: 1, quiet: 1 } },
        { text: "Oat latte from the spot downstairs", scores: { location: 1, quiet: -1 } },
        { text: "Orange juice - it's also breakfast!", scores: { efficiency: 1 } },
        { text: "Tea on the fire escape", scores: { soul: 1, space: 1 } },
      ],
    },
    {
      prompt: "Pick a vibe for your block",
      options: [
        { text: "Tree-lined, nobody around", scores: { quiet: 1, space: 1 } },
        { text: "Bodega, laundromat, life", scores: { quiet: -1, location: 1, soul: 1 } },
        { text: "One good restaurant, otherwise calm", scores: { quiet: 1, location: 1 } },
        { text: "You can hear the bar from your window", scores: { quiet: -1, location: 1 } },
      ],
    },
    {
      prompt: "Pick a weekend project",
      options: [
        { text: "Rearranging furniture for the 4th time", scores: { space: 1, soul: 1 } },
        { text: "Finally organizing the closet system", scores: { efficiency: 1, space: 1 } },
        { text: "Exploring a new neighborhood", scores: { location: 1, quiet: -1 } },
        { text: "Reading by the window all day", scores: { quiet: 1, soul: 1 } },
      ],
    },
  ];

  // Axes: space vs location, efficiency vs soul, quiet vs stimulation
  // Positive space = space-oriented, negative = location-oriented
  // Positive efficiency = efficiency, positive soul = soul
  // Positive quiet = quiet, negative = stimulation

  const archetypes = [
    {
      id: "prewar-top-floor",
      name: "A Prewar Top-Floor With a Skylight",
      description: "You're hardwood floors that creak in all the right places, morning light that moves across the wall, and a kitchen with one perfect cast iron pan. Quiet street, big rooms, and a landlord who waves from the garden.",
      axes: { space: 1, soul: 1, quiet: 1 },
    },
    {
      id: "sunny-walkup",
      name: "A Sunny Walkup on a Bustling Corner",
      description: "You're a third-floor window cracked open to street sounds, a bay window full of plants, and the bodega guy who knows your order. The apartment has character and so does the block.",
      axes: { space: 1, soul: 1, quiet: -1 },
    },
    {
      id: "hidden-gem",
      name: "A Hidden Gem on a Tree-Lined Block",
      description: "You're that apartment people can't believe exists — great location, dead quiet somehow, and everything just works. Small building, good light, the kind of place you never want to leave.",
      axes: { location: 1, soul: 1, quiet: 1 },
    },
    {
      id: "lively-railroad",
      name: "A Character Railroad off the L Train",
      description: "You're exposed brick, a record player in the living room, and the sound of the neighborhood coming alive on Friday night. Compact but full of soul, and everything you need is on the block.",
      axes: { location: 1, soul: 1, quiet: -1 },
    },
    {
      id: "modern-retreat",
      name: "A Renovated 2BR With In-Unit Laundry",
      description: "You're clean lines, great water pressure, and a dishwasher that actually works. Quiet block, everything is new, and you never have to think about the apartment — it just works for you.",
      axes: { space: 1, efficiency: 1, quiet: 1 },
    },
    {
      id: "new-build",
      name: "A New Build With a Rooftop",
      description: "You're floor-to-ceiling windows, a gym in the basement, and a rooftop where you watch the sunset with a drink. The apartment is a tool for living well — modern, efficient, and close to everything.",
      axes: { location: 1, efficiency: 1, quiet: -1 },
    },
    {
      id: "big-quiet-spot",
      name: "A Huge Apartment Nobody Knows About",
      description: "You're that place 15 minutes further on the train where suddenly you have a dining room, a guest room, and actual counter space. Your friends visit and say 'wait, how much do you pay for THIS?'",
      axes: { space: 1, efficiency: 1, quiet: 1 },
    },
    {
      id: "doorman-building",
      name: "A Quiet Doorman Building in a Great Spot",
      description: "You're the kind of person whose packages are always safe, whose heat always works, and who never hears their neighbors. Prime location, zero hassle, and you'd rather spend energy on life outside the apartment.",
      axes: { location: 1, efficiency: 1, quiet: 1 },
    },
  ];

  function computeResult(answers) {
    let space = 0, location = 0, efficiency = 0, soul = 0, quiet = 0;

    for (const answer of answers) {
      const s = answer.scores;
      space += s.space || 0;
      location += s.location || 0;
      efficiency += s.efficiency || 0;
      soul += s.soul || 0;
      quiet += s.quiet || 0;
    }

    const target = {
      space: space - location,   // positive = space, negative = location
      soul: soul - efficiency,   // positive = soul, negative = efficiency
      quiet: quiet,              // positive = quiet, negative = stimulation
    };

    let bestMatch = archetypes[0];
    let bestScore = -Infinity;

    for (const arch of archetypes) {
      let score = 0;
      const a = arch.axes;

      // space vs location axis
      if (a.space) score += target.space * a.space;
      if (a.location) score += -target.space * a.location;

      // soul vs efficiency axis
      if (a.soul) score += target.soul * a.soul;
      if (a.efficiency) score += -target.soul * a.efficiency;

      // quiet axis
      score += target.quiet * (a.quiet || 0);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = arch;
      }
    }

    return bestMatch;
  }

  // DOM
  const section = document.getElementById('quiz');
  if (!section) return;

  const container = section.querySelector('.quiz-container');
  const cardEl = container.querySelector('.quiz-card');
  const promptEl = cardEl.querySelector('.quiz-prompt');
  const optionsEl = cardEl.querySelector('.quiz-options');
  const progressEl = container.querySelector('.quiz-progress');
  const resultEl = container.querySelector('.quiz-result');
  const resultName = resultEl.querySelector('.quiz-result-name');
  const resultDesc = resultEl.querySelector('.quiz-result-desc');
  const restartBtn = resultEl.querySelector('.quiz-restart');

  let currentQ = 0;
  let answers = [];

  function showQuestion(idx) {
    const q = questions[idx];
    promptEl.textContent = q.prompt;
    optionsEl.innerHTML = '';
    progressEl.textContent = `${idx + 1} / ${questions.length}`;

    q.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';
      btn.textContent = opt.text;
      btn.addEventListener('click', () => pickAnswer(opt));
      optionsEl.appendChild(btn);
    });

    cardEl.classList.remove('quiz-card-exit');
    cardEl.classList.add('quiz-card-enter');
    setTimeout(() => cardEl.classList.remove('quiz-card-enter'), 300);
  }

  let transitioning = false;

  function pickAnswer(opt) {
    if (transitioning) return;
    answers.push(opt);
    currentQ++;

    if (currentQ >= questions.length) {
      showResult();
    } else {
      transitioning = true;
      cardEl.classList.add('quiz-card-exit');
      setTimeout(() => {
        showQuestion(currentQ);
        transitioning = false;
      }, 200);
    }
  }

  function showResult() {
    const result = computeResult(answers);
    cardEl.style.display = 'none';
    progressEl.style.display = 'none';
    resultName.textContent = result.name;
    resultDesc.textContent = result.description;
    resultEl.hidden = false;
    resultEl.classList.add('quiz-result-enter');
  }

  function restart() {
    currentQ = 0;
    answers = [];
    resultEl.hidden = true;
    resultEl.classList.remove('quiz-result-enter');
    cardEl.style.display = '';
    progressEl.style.display = '';
    showQuestion(0);
  }

  restartBtn.addEventListener('click', restart);
  showQuestion(0);
})();
