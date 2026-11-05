// Every station on the path, in order, east to west.
// Source: Wabanaki_and_Wampum_Unit_Review.docx (built from Woven Words, The Canoe That Grew
// in the Woods, and Made by Hand, Chosen Together). Questions are reworded on purpose so
// students learn the idea instead of memorizing the quiz's wording.
//
// Task types (see src/tasks.js):
//   choice  one right answer; every wrong option carries a `why`
//   multi   select all that apply
//   order   put items in order (items are listed in the correct order here)
//   match   give each item one of the choices; `pick` links an item to a named 3D part
//   answer3 build a three-part written answer: claim, detail, why it matters
//   mapdrop drag each name onto its homeland on a map of the Maritimes (src/map-data.js)
//
// `quiz` is the quiz question number a station or task prepares for (from the review's quiz map).

export const STATIONS = [
  {
    id: 'dawn',
    title: 'People of the Dawn',
    place: 'Passamaquoddy Bay, at sunrise',
    intro:
      'The sun comes up over the bay. This is Peskotomuhkati homeland, where St. George sits today. ' +
      'The people who governed this land long before Europeans arrived are the Wabanaki.',
    tasks: [
      {
        type: 'choice',
        quiz: 8,
        prompt: 'Wabanaki (wah-bah-NAH-kee) is a name with a meaning. What does it mean?',
        options: [
          { text: 'People of the Dawn', correct: true },
          { text: 'People of the Longhouse', why: 'That is the Haudenosaunee, a different people. You will meet them later on the path.' },
          { text: 'People of the River', why: 'Rivers mattered a lot to the Wabanaki, but that is not what the name means.' },
          { text: 'Keepers of the Fire', why: 'That is the Onondaga, one of the Haudenosaunee nations.' },
        ],
        explain: 'Wabanaki means People of the Dawn. Look where you are standing: the far east, where the sun rises first.',
      },
      {
        type: 'mapdrop',
        prompt: 'Three Wabanaki nations have homelands in what is now New Brunswick. Put each name on its homeland.',
        items: [
          { id: 'mikmaq', label: 'Mi’kmaq' },
          { id: 'wolastoqewiyik', label: 'Wolastoqewiyik' },
          { id: 'peskotomuhkatiyik', label: 'Peskotomuhkatiyik' },
        ],
        // `at` is where the name sits once placed, as [longitude, latitude]
        regions: {
          mikmaq: {
            at: [-65.15, 47.05],
            hint: 'The big homeland in the east and north takes in eastern New Brunswick, Nova Scotia, PEI and the Gaspé.',
          },
          wolastoqewiyik: {
            at: [-67.35, 46.9],
            hint: 'The homeland in western New Brunswick follows the Wolastoq, the Saint John River.',
          },
          peskotomuhkatiyik: {
            at: [-67.15, 45.5],
            hint: 'The small homeland in the southwest wraps around Passamaquoddy Bay, where St. George is.',
          },
        },
        explain:
          'St. George sits in Peskotomuhkati (Passamaquoddy) homeland. The Wolastoqewiyik (also spelled Wolastoqiyik) live along the Wolastoq, the Saint John River. ' +
          'The Mi’kmaq homeland is the biggest of the three.',
      },
      {
        type: 'choice',
        prompt: 'This unit keeps asking about empowerment. What does it mean?',
        options: [
          { text: 'Having control over your own life', correct: true },
          { text: 'Having more money than your neighbours', why: 'Money is not part of the definition. Control is.' },
          { text: 'Being the strongest fighter', why: 'The unit’s stories are about the opposite: peace, sharing decisions and making things yourself.' },
          { text: 'Following the rules someone else made', why: 'That is close to the opposite. Empowerment means having a real say.' },
        ],
        explain: 'Empowerment is having control over your own life. The longer version: a real say in the decisions that shape your life, and the strength to protect it.',
      },
    ],
  },

  {
    id: 'canoe',
    title: 'The canoe that grew in the woods',
    place: 'A beach at the river mouth',
    intro:
      'Every part of this canoe came from the forest around it. Right now it is in pieces. ' +
      'Give each part its material and the canoe will put itself back together. Click a part, or pick it from the list.',
    tasks: [
      {
        type: 'match',
        quiz: 10,
        prompt: 'What is each part made of?',
        items: [
          { id: 'skin', label: 'Outside skin', pick: 'part_skin', answer: 'birch' },
          { id: 'frame', label: 'Frame and ribs', pick: 'part_frame', answer: 'cedar' },
          { id: 'lashing', label: 'Stitching', pick: 'part_lashing', answer: 'roots' },
          { id: 'gum', label: 'Seal on the seams', pick: 'part_gum', answer: 'gum' },
        ],
        choices: [
          { id: 'birch', label: 'Birch bark' },
          { id: 'cedar', label: 'White cedar' },
          { id: 'roots', label: 'Spruce roots' },
          { id: 'gum', label: 'Spruce gum' },
          { id: 'nails', label: 'Iron nails', why: 'A birch bark canoe had no nails at all. The bark was sewn to the frame.' },
          { id: 'boards', label: 'Pine boards', why: 'The frame was split white cedar, not sawn boards.' },
        ],
        explain:
          'Birch bark outside, white cedar inside, spruce roots for stitching and spruce gum on the seams. ' +
          '(One reading says white birch and spruce or pine gum. Those count too.)',
      },
      {
        type: 'match',
        prompt: 'How was each material made ready?',
        items: [
          { id: 'birch', label: 'Birch bark', pick: 'part_skin', answer: 'peel' },
          { id: 'cedar', label: 'White cedar', pick: 'part_frame', answer: 'split' },
          { id: 'roots', label: 'Spruce roots', pick: 'part_lashing', answer: 'dig' },
          { id: 'gum', label: 'Spruce gum', pick: 'part_gum', answer: 'heat' },
        ],
        choices: [
          { id: 'peel', label: 'Peeled in big sheets in early summer' },
          { id: 'split', label: 'Split along the grain, soaked in hot water to bend' },
          { id: 'dig', label: 'Dug up and split into long thin strands' },
          { id: 'heat', label: 'Heated, mixed with animal fat, smeared on' },
        ],
        explain: 'Each material was chosen for a job: light bark that bends, cedar that doesn’t rot, roots like thread, gum that keeps water out.',
      },
    ],
  },

  {
    id: 'repair',
    title: 'A leak on the riverbank',
    place: 'Rocks below the rapids',
    intro:
      'Two canoes hit the same rock. Both are leaking. One is birch bark. One is plastic from a store. ' +
      'You are three days’ paddle from the nearest town.',
    tasks: [
      {
        type: 'match',
        quiz: 12,
        prompt: 'Sort each fact to the right canoe.',
        items: [
          { id: 'a', label: 'Heat gum and reseal the seam on the riverbank', answer: 'birch' },
          { id: 'b', label: 'Needs duct tape or a repair kit you packed', answer: 'plastic' },
          { id: 'c', label: 'Repair supplies come from the forest around you', answer: 'birch' },
          { id: 'd', label: 'Repair supplies come from a store', answer: 'plastic' },
          { id: 'e', label: 'Made of plastic, aluminum or fiberglass', answer: 'plastic' },
        ],
        choices: [
          { id: 'birch', label: 'Birch bark canoe' },
          { id: 'plastic', label: 'Store-bought canoe' },
        ],
        explain: 'Paddlers carried extra gum. If they needed more bark, roots or gum, the trees were right there.',
      },
      {
        type: 'choice',
        prompt: 'You forgot the repair kit. What is the real problem with the plastic canoe?',
        options: [
          { text: 'Nothing in the forest can patch plastic, so you are stuck', correct: true },
          { text: 'Plastic canoes break more easily than bark ones', why: 'Plastic is actually tough. The problem is what happens after it breaks.' },
          { text: 'Plastic canoes are too heavy to carry', why: 'Weight isn’t the issue here. Think about where the fix has to come from.' },
          { text: 'Plastic canoes cannot go in rapids', why: 'They can. The trouble starts when one cracks far from a store.' },
        ],
        explain: 'A plastic canoe can only be fixed with supplies from a store. If you didn’t pack them, you depend on someone else, far away.',
      },
    ],
  },

  {
    id: 'camp',
    title: 'Made by hand',
    place: 'A fall camp, inland',
    intro:
      'In fall and late winter, families moved inland to hunt. Hunters made their own bows and arrows from the land around them. ' +
      'Right now this one is in pieces. Give each part its material and it will put itself back together.',
    tasks: [
      {
        // The bow materials come from the teacher (2026-11-05), not the review doc.
        type: 'match',
        prompt: 'What is each part of the bow and arrow made of?',
        items: [
          { id: 'wood', label: 'Bow and arrow shaft', pick: 'bow_wood', answer: 'wood' },
          { id: 'string', label: 'Bowstring', pick: 'bow_sinew', answer: 'sinew' },
          { id: 'head', label: 'Arrowhead', pick: 'bow_flint', answer: 'flint' },
          { id: 'glue', label: 'Glue that holds the head on', pick: 'bow_gum', answer: 'gum' },
        ],
        choices: [
          { id: 'wood', label: 'Wood' },
          { id: 'sinew', label: 'Sinew from a deer’s tendon' },
          { id: 'flint', label: 'Flint' },
          { id: 'gum', label: 'Spruce gum' },
          { id: 'iron', label: 'Iron', why: 'Iron came later, from European traders.' },
          { id: 'store', label: 'Store-bought string', why: 'There were no stores. The string came from a deer the hunter had already caught.' },
        ],
        explain:
          'Every part came from the land, or from an animal the hunter had already caught. If a string snapped, the hunter made a new one. ' +
          'That is self-sufficient: able to make or find what you need yourself.',
      },
      {
        type: 'choice',
        prompt: 'After Europeans arrived, hunters traded furs for guns. Why does the reading call this a turning point?',
        options: [
          { text: 'No hunter could make his own gunpowder or bullets, so a family’s winter depended on someone else', correct: true },
          { text: 'Guns were weaker than bows', why: 'A gun was a powerful tool. Power was not the problem.' },
          { text: 'Guns were not allowed in the Wabanaki Confederacy', why: 'The reading says nothing like that. Think about supplies.' },
          { text: 'Guns took too long to learn', why: 'The reading’s point is about where the supplies came from.' },
        ],
        explain:
          'A bow could be made and fixed from the land. A gun needed powder and bullets from a trader. ' +
          'It is the same lesson as the plastic canoe: a strong tool you cannot supply or fix yourself.',
      },
    ],
  },

  {
    id: 'messengers',
    title: 'Messengers by canoe',
    place: 'A wide pool on the river',
    intro:
      'A chief has died, and a new one must be chosen. The Peskotomuhkati kept their laws on wampum, and the law says one nation ' +
      'can’t choose alone. So messengers set out by canoe to the other nations of the Wabanaki Confederacy.',
    tasks: [
      {
        type: 'choice',
        prompt: 'The messengers paddle to the other nations of the Wabanaki Confederacy. What is a confederacy?',
        options: [
          { text: 'A group of nations that join as allies, while each still runs its own affairs', correct: true },
          { text: 'One big nation with one ruler', why: 'In a confederacy, each nation still runs its own affairs.' },
          { text: 'A meeting held once a year', why: 'The leaders do meet, but the confederacy is the nations themselves, joined as allies.' },
          { text: 'A group of traders', why: 'Trade happened, but a confederacy is nations joined as allies.' },
        ],
        explain: 'Nations like the Mi’kmaq, Wolastoqiyik and Peskotomuhkati joined as allies in the Wabanaki Confederacy. Each nation still ran its own affairs.',
      },
      {
        type: 'choice',
        prompt: 'Why does the law send messengers to every nation, instead of letting one nation choose the new chief?',
        options: [
          { text: 'Every nation needs a say, so no one nation can take that power for itself', correct: true },
          { text: 'Because the dead chief’s family was not allowed to help', why: 'The reading doesn’t say that. Think about who holds the power.' },
          { text: 'Because the messengers choose the chief', why: 'The messengers carry word. The councillors decide, together.' },
          { text: 'To trade furs on the way', why: 'Canoes did carry trade, but this trip had a different job.' },
        ],
        explain:
          'The wampum law says it: one tribe alone may not decide on the new chief. Every nation had a real say in the decision, ' +
          'and that is empowerment. The canoes made it possible.',
      },
      {
        type: 'choice',
        prompt: 'The councillors talked until the whole group agreed. What is that kind of decision called?',
        options: [
          { text: 'Consensus', correct: true },
          { text: 'A majority vote', why: 'In a majority vote, some people lose. Consensus means the whole group agrees.' },
          { text: 'A confederacy', why: 'A confederacy is nations joined as allies. The decision itself is consensus.' },
          { text: 'Oral tradition', why: 'Oral tradition is how knowledge is passed down by speaking and listening.' },
        ],
        explain:
          'Consensus is a decision the whole group agrees on, not one person or a majority deciding for everyone. ' +
          'When they agreed, a chief placed his own medal on the new chief.',
      },
    ],
  },

  {
    id: 'portage',
    title: 'The portage',
    place: 'Where the river ends',
    intro:
      'The river runs out. Paddlers lift the canoe and carry it over land to the next lake. That is a portage. ' +
      'Before you carry on, put together a strong written answer about the canoe.',
    tasks: [
      {
        type: 'answer3',
        quiz: 13,
        prompt: 'How did the canoe give people control over their own lives?',
        claims: [
          {
            claim: 'Nobody could cut off their supply.',
            detail: 'Every part came from the forest nearby: bark, cedar, roots and gum.',
            why: 'They didn’t depend on a store, a factory or anyone else.',
          },
          {
            claim: 'They could fix it themselves.',
            detail: 'Paddlers carried extra gum and resealed leaks on the riverbank.',
            why: 'One leak didn’t strand them far from home.',
          },
          {
            claim: 'They could go where they chose.',
            detail: 'By paddling and portaging, the Wolastoq connected to rivers reaching the St. Lawrence.',
            why: 'They could reach food, trade and other nations on their own.',
          },
          {
            claim: 'It connected the nations.',
            detail: 'Messengers went out in canoes to the other nations when a chief died.',
            why: 'Big decisions could be made together, so no one nation took control.',
          },
        ],
        wrongDetails: ['Canoes were held together with iron nails.', 'Canoes were bought from traders each spring.'],
        explain: 'A strong answer has three parts: how it gave control, a detail from the reading, and why that detail matters.',
      },
    ],
  },

  {
    id: 'crossing',
    title: 'Two peoples',
    place: 'The height of land',
    intro:
      'From the top of the portage you can see back east to the bay, and west toward the lands of the Haudenosaunee ' +
      '(hoh-dee-noh-SHOH-nee), the People of the Longhouse, in what is now New York State. They are a different people.',
    tasks: [
      {
        type: 'match',
        quiz: 1,
        prompt: 'Which people does each fact belong to?',
        items: [
          { id: 'a', label: 'People of the Dawn', answer: 'w' },
          { id: 'b', label: 'People of the Longhouse', answer: 'h' },
          { id: 'c', label: 'The Hiawatha story is theirs', answer: 'h' },
          { id: 'd', label: 'Mi’kmaq and Wolastoqiyik', answer: 'w' },
          { id: 'e', label: 'Mohawk, Oneida, Onondaga, Cayuga, Seneca', answer: 'h' },
          { id: 'f', label: 'St. George sits in their homeland', answer: 'w' },
        ],
        choices: [
          { id: 'w', label: 'Wabanaki' },
          { id: 'h', label: 'Haudenosaunee' },
        ],
        explain: 'They sit side by side in this unit, so they are easy to mix up. Hiawatha is Haudenosaunee, not Wabanaki.',
      },
    ],
  },

  {
    id: 'story',
    title: 'The story of the Great Peace',
    place: 'Haudenosaunee country',
    intro:
      'This Haudenosaunee story is told in many versions. Five nations were trapped in a cycle of war. A messenger, the Peacemaker, ' +
      'brought a law of peace, but he could not do it alone. Each stone lights up as the story goes on.',
    // one short name per story stone, in order (src/stations.js lights them as the questions are answered)
    stones: ['War', 'The Peacemaker', 'Grief', 'The strings', 'Condolence', 'The message', 'Tadodaho', 'Tree of Peace'],
    tasks: [
      {
        type: 'choice',
        quiz: 2,
        prompt: 'Why did Hiawatha leave home and wander the forest?',
        options: [
          { text: 'His seven daughters died, and no one came to comfort him', correct: true },
          { text: 'He was sent away by Tadodaho', why: 'Tadodaho resisted the peace, but that is not why Hiawatha left.' },
          { text: 'He was looking for shells to make wampum', why: 'He gathered shells later, by the lake. Grief is what sent him away.' },
          { text: 'He went to find the Peacemaker', why: 'The Peacemaker found him, not the other way around.' },
        ],
        explain: 'Hiawatha was a respected Onondaga leader. Grief took him away from his people.',
      },
      {
        type: 'choice',
        quiz: 3,
        prompt: 'When the Peacemaker found Hiawatha, what did he do first?',
        options: [
          { text: 'Held the strings one at a time and spoke words of comfort', correct: true },
          { text: 'Asked Hiawatha to fight Tadodaho', why: 'No one fought Tadodaho. That is the point of the story.' },
          { text: 'Buried weapons under a white pine', why: 'That is the Tree of Peace, the last part of the story.' },
          { text: 'Gave him a wampum belt with letters on it', why: 'Wampum is not an alphabet. Beads don’t stand for letters.' },
        ],
        explain: 'He cleared Hiawatha’s eyes so he could see, his ears so he could hear, and his throat so he could speak again. This was the first condolence.',
      },
      {
        type: 'choice',
        prompt: 'What does condolence mean?',
        options: [
          { text: 'Comfort for someone who is grieving', correct: true },
          { text: 'A promise between two nations', why: 'Wampum can record promises, but condolence means comfort.' },
          { text: 'A decision the whole group agrees on', why: 'That is consensus.' },
          { text: 'A message carried by canoe', why: 'That is a messenger’s job, not condolence.' },
        ],
        explain:
          'For the Haudenosaunee, the condolence ceremony clears grief so a person can lead again. It is still held today when a chief dies and a new one is raised. ' +
          'Healed, Hiawatha became the Peacemaker’s voice. Watch for the mix-up: the first condolence comes long before the Tree of Peace.',
      },
    ],
  },

  {
    id: 'fire',
    title: 'The council fire',
    place: 'Onondaga, at the centre',
    intro:
      'Tadodaho of the Onondaga refused the peace. He was so twisted by hate that snakes grew in his hair. ' +
      'The peacemakers did not fight him.',
    tasks: [
      {
        type: 'choice',
        quiz: 4,
        prompt: 'How did they win Tadodaho over?',
        options: [
          { text: 'They combed the snakes from his hair and gave him the council fire to keep', correct: true },
          { text: 'They defeated him in battle', why: 'They did not fight him at all.' },
          { text: 'They left the Onondaga out of the peace', why: 'The peace needed all five nations. He was the last one out.' },
          { text: 'They waited until he died', why: 'He agreed. They offered him the most important job.' },
        ],
        explain: 'The Onondaga became the Keepers of the Fire, at the centre of the confederacy.',
      },
      {
        type: 'multi',
        quiz: 11,
        prompt: 'Why not just fight Tadodaho? Pick the two reasons from the story.',
        options: [
          { text: 'Killing him would restart the cycle of revenge the peace was meant to end', correct: true },
          { text: 'The peace needed all five nations, and he was the last one out', correct: true },
          { text: 'He was too strong to beat', why: 'The story never says that. The reason is about what fighting would do.' },
          { text: 'The Peacemaker was afraid of the snakes', why: 'Nothing in the story says so.' },
        ],
        explain: 'Giving him the council fire turned the strongest enemy of the peace into its keeper.',
      },
      {
        type: 'match',
        prompt: 'Each nation had a place in the confederacy. Match them.',
        items: [
          { id: 'mohawk', label: 'Mohawk', answer: 'east' },
          { id: 'onondaga', label: 'Onondaga', answer: 'fire' },
          { id: 'seneca', label: 'Seneca', answer: 'west' },
          { id: 'tuscarora', label: 'Tuscarora', answer: 'sixth' },
        ],
        choices: [
          { id: 'east', label: 'Keepers of the Eastern Door' },
          { id: 'fire', label: 'Keepers of the Fire, at the centre' },
          { id: 'west', label: 'Keepers of the Western Door' },
          { id: 'sixth', label: 'Joined in the early 1700s, making Five Nations into Six' },
        ],
        explain: 'Like a longhouse: a door at each end and the fire in the middle.',
      },
    ],
  },

  {
    id: 'shells',
    title: 'From shell to bead',
    place: 'A bead maker’s bench',
    intro:
      'Wampum is white and purple shell beads, strung or woven into belts. Both colours come from the sea. ' +
      'Click a shell to look closer.',
    tasks: [
      {
        type: 'choice',
        quiz: 5,
        prompt: 'Which shell gives the rare purple beads?',
        options: [
          { text: 'The quahog, a hard-shell clam', correct: true, pick: 'shell_quahog' },
          { text: 'The whelk, a large sea snail', why: 'The whelk’s twisted centre makes white beads.', pick: 'shell_whelk' },
        ],
        explain: 'Purple comes only from a dark patch along the inside edge of the quahog (KO-hog) shell. That is why purple was rarer.',
      },
      {
        type: 'choice',
        prompt: 'Before Europeans arrived, most wampum was on strings. Why did big woven belts become common in the 1600s?',
        options: [
          { text: 'Metal drills made beads faster to produce', correct: true },
          { text: 'Shells became easier to find', why: 'The shells didn’t change. The tools did.' },
          { text: 'People stopped telling the stories aloud', why: 'The words were still spoken. Belts helped hold them.' },
          { text: 'Beads were dyed purple for the first time', why: 'Purple was never dyed. It came from the quahog shell.' },
        ],
        explain: 'Every bead was ground smooth on stone and drilled by hand. Metal drills sped that up.',
      },
    ],
  },

  {
    id: 'belt',
    title: 'Read the belt',
    place: 'Inside the longhouse',
    intro:
      'This is the Hiawatha Belt. Belt makers used simple shapes for big ideas. Held with the tree pointing north, ' +
      'it reads east to west, like the path of the sun.',
    tasks: [
      {
        type: 'choice',
        prompt: 'Start with the four squares. What does each square stand for?',
        options: [
          { text: 'A nation', correct: true },
          { text: 'A longhouse', why: 'Good guess, but belt makers used a square for a whole nation.' },
          { text: 'A letter of the alphabet', why: 'Wampum is not an alphabet. Each shape stands for a big idea.' },
          { text: 'A season of the year', why: 'There are four, but they are not seasons. Each square is a nation.' },
        ],
        explain: 'Four squares for four nations: Mohawk, Oneida, Cayuga and Seneca. The fifth nation is in the centre.',
      },
      {
        type: 'multi',
        prompt: 'Now the tree in the centre. What does it stand for?',
        options: [
          { text: 'The Onondaga nation, Keepers of the Fire', correct: true },
          { text: 'The Tree of Peace, where the nations buried their weapons', correct: true },
          { text: 'A forest the five nations shared', why: 'The tree is a symbol, not a real forest.' },
          { text: 'The Peacemaker', why: 'He is part of the story, but the tree stands for a nation and for the peace.' },
          { text: 'The eastern door', why: 'The tree is in the centre, where the fire is kept. The Mohawk kept the eastern door.' },
        ],
        explain: 'The tree is the Onondaga, keeping the council fire at the centre, and it is the Tree of Peace the nations gathered under.',
      },
      {
        type: 'choice',
        quiz: 7,
        prompt: 'A white line joins the shapes and runs out past both ends. What does it mean?',
        options: [
          { text: 'A path of peace, left open so other nations can follow it', correct: true, pick: 'belt_line' },
          { text: 'A river the nations shared', why: 'Belt makers used a line for a path between peoples.' },
          { text: 'The border no one could cross', why: 'It is the opposite: it is left open on purpose.' },
          { text: 'A line of writing', why: 'A belt is not writing. Its shapes remind a trained reader of a speech.' },
        ],
        explain: 'Belt makers used simple shapes for big ideas: a square for a nation, a line for a path between peoples.',
      },
      {
        type: 'choice',
        quiz: 6,
        prompt: 'Without a trained reader, this belt is just beautiful. Why?',
        options: [
          { text: 'Each belt is tied to one speech, and its pattern only reminds a reader what the speech says', correct: true },
          { text: 'The beads are a secret alphabet only readers know', why: 'Wampum is not an alphabet. A bead doesn’t stand for a letter or word.' },
          { text: 'The colours fade, so only readers remember them', why: 'The pattern stays. What it needs is someone who knows the speech.' },
          { text: 'Belts were kept hidden from everyone else', why: 'They came out at gatherings, and the words were spoken for everyone to hear.' },
        ],
        explain: 'Without the reader, a belt is just beautiful. With one, it speaks. Each time a belt came out, a new generation heard the words.',
      },
    ],
  },

  {
    id: 'council',
    title: 'What wampum keeps',
    place: 'The council',
    intro:
      'A family story can change a little with each telling. A peace agreement can’t. So nations built memory on purpose: ' +
      'trained speakers, speeches repeated at every gathering, witnesses, and objects that held the words in place.',
    tasks: [
      {
        type: 'multi',
        quiz: 9,
        prompt: 'What was wampum used for? Pick every use from the reading.',
        options: [
          { text: 'Keeping laws, agreements and council decisions', correct: true },
          { text: 'Reciting history at gatherings', correct: true },
          { text: 'Comforting grief in the condolence ceremony', correct: true },
          { text: 'Spelling out words, one bead per letter', why: 'Wampum is not an alphabet.' },
          { text: 'Sealing the seams of a canoe', why: 'That was spruce gum.' },
          { text: 'Replacing the speaker, so no one had to remember the words', why: 'The belt needed a reader. It held the words in place; it didn’t replace the speaker.' },
        ],
        explain:
          'Wampum keepers recited the laws at council, holding the belts as they spoke. ' +
          'Even the law for choosing a new chief, from the messenger stop, was kept on wampum.',
      },
      {
        type: 'choice',
        prompt: 'The Mi’kmaw council had a Putus. What was his job?',
        options: [
          { text: 'Wampum keeper, messenger and storyteller, so everyone heard the same words', correct: true },
          { text: 'Grand chief who made decisions alone', why: 'Decisions were talked through in a circle until the group agreed.' },
          { text: 'Canoe builder for the council', why: 'His job was keeping the words, not building canoes.' },
          { text: 'Trader who bought wampum from Europeans', why: 'The reading describes him as a keeper and messenger.' },
        ],
        explain: 'Because everyone heard the same words, no leader could quietly change a decision later.',
      },
      {
        type: 'choice',
        prompt: 'Knowledge passed down by speaking and listening instead of writing is called…',
        options: [
          { text: 'Oral tradition', correct: true },
          { text: 'Governance', why: 'Governance is how a group makes decisions.' },
          { text: 'Condolence', why: 'Condolence is comfort for someone grieving.' },
          { text: 'Confederacy', why: 'A confederacy is nations acting together.' },
        ],
        explain: 'Oral tradition plus wampum is how nations kept control of their agreements.',
      },
    ],
  },

  {
    id: 'tree',
    title: 'The Tree of Peace',
    place: 'The end of the path, for now',
    intro:
      'The five nations buried their weapons under a great white pine. Its roots spread out so other nations could follow them to shelter. ' +
      'An eagle on top watches for danger. The laws they agreed to became the Great Law of Peace.',
    tasks: [
      {
        type: 'choice',
        prompt: 'What does the eagle at the top of the tree do?',
        options: [
          { text: 'Watches for danger', correct: true },
          { text: 'Carries messages to other nations', why: 'In this unit, messengers travelled by canoe. The eagle watches.' },
          { text: 'Guards the buried weapons', why: 'Close, but the reading says it watches for danger.' },
          { text: 'Stands for the Onondaga', why: 'On the belt, the tree stands for the Onondaga. The eagle watches for danger.' },
        ],
        explain: 'Weapons buried below, roots reaching out, an eagle watching above.',
      },
      {
        type: 'choice',
        lead:
          'The Great Peace was made long ago, but no one wrote down the year. The story was told aloud for centuries, then written in English around 1900. ' +
          'So historians hunt for clues. One team matched a dark sky in the story to a solar eclipse in 1142. Others say 1451.',
        prompt: 'Why can’t historians agree on the year?',
        options: [
          { text: 'No one wrote the year down at the time, and the written versions disagree', correct: true },
          { text: 'The wampum belts record two different dates', why: 'Belts don’t record dates like writing does.' },
          { text: 'Nobody has studied it', why: 'People have. One team even matched it to an eclipse.' },
          { text: 'The Haudenosaunee kept the story secret', why: 'It was told aloud, again and again, for centuries.' },
        ],
        explain: 'The story was kept by oral tradition, not written records. Historians have to work the year out from clues, so they can disagree.',
      },
      {
        type: 'match',
        prompt: 'Last one. Match each word to its meaning.',
        items: [
          { id: 'wampum', label: 'wampum', answer: 'beads' },
          { id: 'confederacy', label: 'confederacy', answer: 'allies' },
          { id: 'council', label: 'council', answer: 'meet' },
          { id: 'governance', label: 'governance', answer: 'how' },
          { id: 'self', label: 'self-sufficient', answer: 'make' },
          { id: 'portage', label: 'portage', answer: 'carry' },
        ],
        choices: [
          { id: 'beads', label: 'Shell beads that record and remember important words' },
          { id: 'allies', label: 'Nations acting together, each keeping its own leaders' },
          { id: 'meet', label: 'Leaders who meet to talk a problem through and decide' },
          { id: 'how', label: 'How a group makes decisions' },
          { id: 'make', label: 'Able to make or find what you need yourself' },
          { id: 'carry', label: 'Carrying a canoe over land between waters' },
        ],
        explain: 'You walked the whole path: from the People of the Dawn to the Tree of Peace.',
      },
    ],
  },
];

// The unit's big question, shown on the title screen and the finish.
export const BIG_IDEA =
  'How did people keep control over their own lives before Europeans arrived?';
