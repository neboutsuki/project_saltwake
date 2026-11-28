/* SALTWAKE NPC voices (v0.31): personality and memory for the harbor's people.
 * - Memory (save.npcMem): how often you have talked to each story NPC, which of their personal stories they have told
 *   you, and your last expedition (extracted or failed, where, kills, apex slain, the Elder).
 * - Story NPCs greet you in character: about your last expedition the first time they see you after it, otherwise
 *   about the hour, the weather, the story so far and how well they know you. A new "How are you holding up?" choice
 *   tells their personal lines in order, never repeating until all are told.
 * - Story NPCs turn to face you when you come near (characters.js) and now and then call out a line as you pass.
 * - Townsfolk (hublife.js): lines that fit the moment and what they are doing; greetings; two-person conversations,
 *   some about your deeds.
 * window.saltwakeVoice exposes the line pickers and memory helpers for QA.
 */
(() => {
  const P = Game.prototype;
  const V = window.saltwakeVoice = { stats: { greetings: 0, chats: 0, calls: 0, eventGreets: 0 } };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const mem = g => { const m = g.save.npcMem ||= {}; m.talks ||= {}; m.chat ||= {}; m.seen ||= {}; m.calls ||= {}; return m; };
  V.mem = mem;
  const clock = g => (g.save?.environment?.clock || 0) % 1440;
  const phase = g => { const m = clock(g); return m < 330 || m >= 1290 ? 'night' : m < 480 ? 'dawn' : m < 1080 ? 'day' : 'evening'; };
  const weather = g => g.climateWeather?.(g.save?.environment?.clock || 0)?.id || '';
  const wet = g => /rain|squall|storm/.test(weather(g));
  const done = (g, id) => g.quest?.state?.(id)?.status === 'done';
  const pname = g => g.save?.profile?.name || g.save?.name || 'Ren';
  const fill = (g, s) => String(s).replace(/\{name\}/g, pname(g)).replace(/\{apex\}/g, mem(g).last?.apex || 'that beast').replace(/\{dest\}/g, mem(g).last?.destName || 'the coast');

  // ---- remember the last expedition --------------------------------------------------------------------------------
  const end = P.endRaid;
  P.endRaid = function (success) {
    const r = this.raid;
    if (r) try {
      const m = mem(this), dead = (r.enemies || []).filter(e => e.dead), apex = dead.find(e => e.apex), IS = window.saltwakeIsle;
      m.stamp = (m.stamp || 0) + 1;
      m.last = { ok: !!success, dest: this.save.destination || 'quays', destName: IS?.DEST_INFO?.[this.save.destination]?.name || 'the Outer Quays', kills: dead.length,
        apex: apex ? (IS?.APEX?.[apex.apex]?.name || apex.name || 'an apex') : null, elder: dead.some(e => e.elder), stamp: m.stamp };
      if (success) m.wins = (m.wins || 0) + 1; else m.losses = (m.losses || 0) + 1;
    } catch (e) { }
    return end.apply(this, arguments);
  };
  // the newest thing worth mentioning that this person has not commented on yet
  function event(g, who) {
    const m = mem(g), L = m.last; if (!L || (m.seen[who] || 0) >= L.stamp) return null;
    return L.elder ? 'elder' : L.apex ? 'apex' : L.ok ? (L.kills >= 8 ? 'bigwin' : 'ok') : 'fail';
  }
  const markSeen = (g, who) => { const m = mem(g); if (m.last) m.seen[who] = m.last.stamp; };

  // ---- story NPCs ----------------------------------------------------------------------------------------------------
  // greet: first | ok | bigwin | fail | apex | elder | dawn | day | evening | night | rain | familiar ; chat: told in order ; call: passing remarks
  const NPC = {
    n_dockmaster: { // Mara Fen: brisk, protective of every crew that leaves her docks
      greet: { first: ['Mara Fen, dockmaster. If it floats, I log it. If it doesn’t come back, I log that too.'],
        ok: ['Back on the tide and on time. That’s how I like my crews.', 'You came home from {dest}. Good. Logbook stays happy.'],
        bigwin: ['Half the coast is talking about your last run. Don’t let it go to your head.'],
        fail: ['You came back without your pack. You came back. I’ll take it.', 'Rough run at {dest}. Sit a while before you sign out again.'],
        apex: ['The {apex}? Dead? I’ll have the bell rung. The crews will sleep better.'],
        elder: ['The Maw is quiet. Forty years I’ve watched that water. Quiet. Thank you, {name}.'],
        dawn: ['Early tide. Best time to slip out unseen.'], day: ['Busy docks today. Mind the cargo lines.'], evening: ['Last boats are coming in. Count them with me.'],
        night: ['Docks are closed to fools at night. You’re not a fool, are you?'], rain: ['Rain like this hides the Brineworn singing. I hate it.'],
        familiar: ['{name}. Good. I was about to send someone looking.', 'There you are. Tide charts are on the post.'] },
      chat: ['I keep a list of every crew that never came back. It’s longer than the harbor wall.', 'My father ran these docks before me. He said the sea gives back one thing in three. He was generous.',
        'I lost a locket out there once. Silly thing to miss, with so much else gone.', 'Teren thinks the sea talks. I think it just takes. Maybe that’s the same thing.',
        'If you ever see a skiff drifting with no one aboard, don’t board it alone. Promise me.', 'You remind me of my first crew. Too brave. Most of them aren’t here any more.'],
      call: ['Tide’s turning, {name}!', 'Sign out before you go, salvager.', 'Keep your boots dry and your bolts drier.'] },
    n_clerk: { // Edda Voss: dry wit, lives by the ledger
      greet: { first: ['Edda Voss. Ledgers, contracts, debts. Mostly debts.'], ok: ['A successful return. I’ll write it in ink instead of pencil.'], bigwin: ['Your kill tally broke my column width. I had to rule a new page.'],
        fail: ['A loss. I’ve marked it lightly. Pencil can be erased.'], apex: ['Bounty on the {apex}: paid. I’ve never enjoyed signing a voucher more.'],
        elder: ['There is no line in the ledger for what you did at the Maw. I made one.'], dawn: ['You’re early. The ink hasn’t dried on yesterday.'], day: ['Contracts are on the board, duplicates in my drawer.'],
        evening: ['I close the books at dusk. Talk fast.'], night: ['The ledger never sleeps. Neither, apparently, do you.'], rain: ['Damp ruins paper. Damp ruins everything.'],
        familiar: ['Ah, my most profitable entry.', 'Back again. Your account is in good order.'] },
      chat: ['Every name in this book is a person. I try to remember that when the numbers get ugly.', 'The Guild audits me twice a year. I audit them every day. Quietly.',
        'I used to write poetry. Now I write manifests. Some days I can’t tell the difference.', 'Someone has been paying the Wreckers out of harbor funds. I will find the column.',
        'Neral owes me three scrip from a card game in the spring. Don’t tell him I said so. Tell him I said so.'],
      call: ['Contracts posted, {name}.', 'Don’t forget your bounty vouchers!', 'Mind the ink, it’s wet.'] },
    n_quartermaster: { // Neral Brin: gruff trader, haggles, secretly soft
      greet: { first: ['Neral Brin. Quartermaster. Everything here costs scrip, including my time.'], ok: ['Back with salvage? Good. Show me before you show the buyer.'],
        bigwin: ['Big haul, eh? Prices go up when you’re rich. That’s economics.'], fail: ['Lost your pack? I’ll give you a fair price on a new one. Fair-ish.'],
        apex: ['A {apex} hide... no, don’t tell me what you want for it. I’ll cry.'], elder: ['Free rations for you this week. Don’t tell anyone. Ruins my reputation.'],
        dawn: ['Shop’s not open. It is for you. Don’t spread it around.'], day: ['Buying, selling, complaining. Pick one.'], evening: ['Stock’s low, prices are high. Same as always.'],
        night: ['I’m counting the till. Make it quick.'], rain: ['Rain’s bad for business and worse for my knees.'], familiar: ['My best customer. Don’t let it go to your head.', 'You again. Good. I need the scrip.'] },
      chat: ['Lost my spectacles twice this month. The second time they were on my head.', 'I was a sailor once. Then a boat sank under me. Now I sell the boats’ insides.',
        'People think I’m greedy. I’m careful. Careful keeps the harbor fed in winter.', 'Edda says I owe her three scrip. Edda cheats at cards.', 'If you ever see a crate marked with a blue anchor, bring it to me. No questions.'],
      call: ['Fresh stock, {name}! Well. Stock.', 'Rations! Bandages! Rope!', 'Good prices today. Don’t check.'] },
    n_mechanic: { // Iven Rusk: proud craftsman, gruff
      greet: { first: ['Iven Rusk. I make launchers that don’t explode. Usually.'], ok: ['Bring the launcher here. Let me hear how it sounds after a run.'],
        bigwin: ['Your barrel’s warm from all that shooting. Good. Steel likes work.'], fail: ['Weapon came home even if you nearly didn’t. My work holds.'],
        apex: ['A {apex}... Bring me its parts. I’ll make something that remembers it.'], elder: ['Tidemaw steel from the Elder. Nobody’s ever forged that. I will.'],
        dawn: ['Forge is warming. Give it a minute, like me.'], day: ['Hammer’s hot. What do you need?'], evening: ['Last heat of the day. Make it count.'], night: ['I bank the coals at night. Unless you bring me something interesting.'],
        rain: ['Rain hisses on the forge roof. Like the whole sky wants a quench.'], familiar: ['The salvager who actually maintains their gear. Rare breed.', 'Back. Let me see that edge.'] },
      chat: ['Ola thinks I don’t notice when she uses my good hammer. I notice. I let her.', 'The first launcher I built threw its bolt backwards. Taught me humility.',
        'Tidemaw sinew makes the best bowstring there is. It also smells like a drowned dog.', 'My brother runs a forge in Saltwatch. He makes horseshoes. I make history.',
        'People ask why I never go out on the water. Somebody has to be here when you come back with broken things.'],
      call: ['Bring me parts, {name}!', 'That edge needs work. Come see me.', 'Don’t let rust near my launchers!'] },
    n_medic: { // Sera Moll: caring, scolds
      greet: { first: ['Sera Moll, harbor medic. Sit down. You’re bleeding somewhere, I can tell.'], ok: ['You walked in on your own feet. That’s my favorite kind of patient.'],
        bigwin: ['That many fights and you’re still in one piece? Let me check. Humor me.'], fail: ['Sit. Breathe. Whatever happened out there, you’re home now.'],
        apex: ['You fought a {apex} and you’re grinning. I’ll never understand salvagers.'], elder: ['People are sleeping through the night for the first time in years. That’s medicine too.'],
        dawn: ['Dawn shift. Tea’s on, if you want some.'], day: ['Bandages are on the shelf. Use them before you need me.'], evening: ['Long day. Let me see your hands.'],
        night: ['Can’t sleep either? Sit. The night is long out here.'], rain: ['Rain brings fevers. Keep warm, keep dry, keep away from the gutters.'], familiar: ['{name}. Let me guess. Something hurts.', 'My favorite reckless patient.'] },
      chat: ['I trained in Saltwatch. They taught me to heal people, not how to watch them leave again.', 'Ash-grown herbs work better than anything from the city. Don’t ask me why.',
        'I keep a jar of the bolts I’ve pulled out of people. It’s getting full.', 'Talla still has nightmares. Don’t mention her crew unless she does.', 'Eat something warm today. That’s a medical order.'],
      call: ['Bandage that, {name}!', 'Drink water, salvager!', 'Don’t come back in pieces!'] },
    n_guard: { // Orin Hale: dutiful, wary of the Brineworn
      greet: { first: ['Orin Hale, harbor guard. Keep your weapon slung inside the walls.'], ok: ['Back through the gate. I’ll mark you safe.'], bigwin: ['Heard you thinned them out. Fewer to come knocking at my gate.'],
        fail: ['Glad you made it back. Some don’t. I stand here and count who doesn’t.'], apex: ['The {apex} is dead? Then my watch just got a little lighter.'],
        elder: ['I heard the singing stop. The whole wall heard it. Thank you.'], dawn: ['Dawn watch. Coldest hour, quietest hour.'], day: ['All quiet on the wall.'], evening: ['Lighting the lanterns. Brineworn hate the light.'],
        night: ['Stay in the lit streets at night. That’s not advice.'], rain: ['Rain on the wall. Can’t hear a thing out there. I hate that.'], familiar: ['Salvager. Good to see you whole.', '{name}. Any sign of them out there?'] },
      chat: ['The Brineworn were people once. Sometimes I recognize a coat. That’s the worst part.', 'I’ve stood this post eleven years. The wall’s been patched more times than my boots.',
        'If you hear singing in the fog, turn around. I don’t care what you came for.', 'Gull feathers make fine fletching. I trade them with the hunters for news.', 'My daughter wants to be a salvager. I want her to be anything else.'],
      call: ['Keep to the lit roads, {name}.', 'Gate’s open. For now.', 'Stay sharp out there.'] },
    n_salvager: { // Talla Cor: veteran, lost her crew, dark humor
      greet: { first: ['Talla Cor. Licensed salvager. Last of a crew of six. Don’t ask.'], ok: ['You came back. That’s the whole job, really. The rest is just weight.'],
        bigwin: ['Look at you. Rich and alive. Pick one next time, it’s less suspicious.'], fail: ['Lost the haul? Everyone does. Only lose the haul.'], apex: ['A {apex}. Huh. My old crew would’ve bought you a drink. Several.'],
        elder: ['If my crew could see this... They’d say we should have done it ourselves. They’d be wrong.'], dawn: ['Can’t sleep. Never could, since.'], day: ['Salvage is honest work. The people paying for it aren’t.'],
        evening: ['Evening’s when I count my crew. Takes a second now.'], night: ['Night’s for drinking and not thinking. I’m doing one of those.'], rain: ['Rain on the water. Same sound as the night we lost them.'],
        familiar: ['{name}. Still breathing. Good habit.', 'There’s my favorite competition.'] },
      chat: ['My crew’s compass never pointed north. It pointed home. Lost it the night we sank.', 'The Wreckers aren’t monsters. They’re what we become when the Guild stops paying.',
        'I keep my crew’s names carved on my oar. I don’t row with it any more.', 'Never salvage a wreck that still has its lantern lit. Someone’s waiting for it.', 'You’re good at this. That scares me a little. Good people are the ones the sea wants.'],
      call: ['Don’t die out there, {name}.', 'Bring me something shiny.', 'Watch the waterline.'] },
    n_ropewright: { // Mira Vale: cheerful, sings, proud of her rope
      greet: { first: ['Mira Vale! I make the rope that brings boats home. Sounds grand, doesn’t it?'], ok: ['Home again! I knew my knots would hold!'], bigwin: ['They’re singing about you on the docks. Badly. I’ll teach them the tune.'],
        fail: ['Oh, you’re back. You’re back! That’s what matters. Hug? No? Fine.'], apex: ['A {apex}! I’m making a song. It rhymes with “rope”, somehow.'], elder: ['I’m braiding a rope from every color in the harbor. For you. For the Maw.'],
        dawn: ['Morning! Best light for splicing.'], day: ['Twist, tuck, pull! Want to try?'], evening: ['Rope’s stretched, sun’s set, tea’s on.'], night: ['I hum when I can’t sleep. Sorry if you heard.'], rain: ['Wet rope is heavy rope. Heavy rope is honest rope.'],
        familiar: ['{name}! My favorite customer who never buys rope.', 'You again! Good. I wanted company.'] },
      chat: ['My grandmother taught me knots before letters. I still spell badly.', 'Every rope I make has one red thread inside. For luck. Don’t tell the Guild, it’s not regulation.',
        'I sing the old harbor songs while I work. The gulls hate them. The gulls hate everything.', 'Dry rope is the best rope. Brineworn hate dry things, did you know?', 'Someday I’ll make a rope long enough to reach Saltwatch. Then we’ll see who’s laughing.'],
      call: ['Good rope, good luck, {name}!', 'Want a knot lesson?', 'La la la... oh! Hello!'] },
    n_tidepilot: { // Teren Sull: old, mystic about the sea, charted the Maw
      greet: { first: ['Teren Sull. I read the tide the way others read letters. It writes badly, but often.'], ok: ['The water let you go. It doesn’t always.'],
        bigwin: ['The sea noticed you. That is either very good or very bad.'], fail: ['The tide took your pack and gave you back. A fair trade, some days.'], apex: ['The {apex} has gone under for good. The currents feel lighter.'],
        elder: ['I charted the Maw for forty years and never dared it. You did. The sea is quiet. It has never been quiet.'], dawn: ['Dawn tide. Gentle. Deceiving.'], day: ['Slack water at noon. Good hour to sail.'],
        evening: ['Evening tide runs west. Something runs with it.'], night: ['Listen. The water is talking tonight.'], rain: ['Rain on salt water. It sounds like whispering, doesn’t it?'],
        familiar: ['Ah. The one the tide keeps returning.', '{name}. The buoys told me you were coming.'] },
      chat: ['I have a chart of the Maw in my coat. I have never shown it to anyone sane.', 'Every buoy bell has its own voice. When one goes silent, I go look.',
        'Mara thinks I am mad. Mara has never heard the deep tide sing.', 'The Brineworn were drowned and came back wrong. The sea did not mean to. I think it is sorry.', 'When I die, put me in a boat with no oars. I know where I am going.'],
      call: ['The tide is listening, {name}.', 'Mind the undertow.', 'Bells are ringing out west.'] },
    n_apprentice: { // Ola Marr: eager, admires the player
      greet: { first: ['I’m Ola! Apprentice! I fix things! Mostly I hand Iven things.'], ok: ['You’re back! Can I see your weapon? Please?'], bigwin: ['How many?! Iven, did you hear? Iven!'],
        fail: ['It’s okay! Iven says the best smiths learn from broken things. Maybe salvagers too.'], apex: ['A real {apex}?! Did it roar? Was it huge? It was huge, wasn’t it?'],
        elder: ['When I’m a master smith I’m going to forge a statue of you. A big one.'], dawn: ['I lit the forge myself today!'], day: ['Iven lets me sharpen things now! Small things.'], evening: ['I swept the whole forge. Twice.'],
        night: ['I can’t sleep. I keep thinking about Tidemaw steel.'], rain: ['Rain makes the forge smoke go sideways. It’s kind of pretty.'], familiar: ['{name}! You came to see me!', 'Hi hi hi! Anything need fixing?'] },
      chat: ['I lost Iven’s good hammer once. I found it. Please don’t tell him.', 'I want to go out on an expedition someday. Iven says I need to grow first. I’m growing!',
        'I made a knife all by myself. It bent. But it bent nicely.', 'Do monsters have names? Like real names? I think the big ones should.', 'You’re the best salvager in the harbor. Everybody says. Well. I say.'],
      call: ['Hi {name}!', 'Iven! Look who it is!', 'Bring me something to fix!'] },
    n_crewhand: { // Senn Bri: dock worker, jokes, counts crates
      greet: { first: ['Senn Bri. I count crates. Sometimes they count back.'], ok: ['You’re back! Good, I need someone to lift the heavy end.'], bigwin: ['You fought how many? I can’t even fight the cargo net.'],
        fail: ['Lost your pack, huh? I lost a crate once. Turned out I was sitting on it.'], apex: ['A {apex}?! I’d have run. I’d still be running.'], elder: ['Drinks are on me. Well. On Neral. He doesn’t know yet.'],
        dawn: ['Too early. The crates aren’t awake either.'], day: ['Forty-one, forty-two... hi! ...forty... ugh.'], evening: ['Last crate of the day! Then the first drink.'], night: ['Night shift. The crates are spookier at night.'],
        rain: ['Rain means wet crates, wet crates mean heavy crates, heavy crates mean my back.'], familiar: ['{name}! Help me lift this? No? Worth asking.', 'My favorite person who doesn’t make me count anything.'] },
      chat: ['I lost my tally book once. Had to count everything twice. Then three times, to be sure.', 'Neral says I count slow. I say I count carefully.',
        'A gull stole my lunch this morning. Looked me in the eye while it did it.', 'Someday I’ll go out there like you. Then I’ll come right back. Quickly.', 'Mira is teaching me knots. I can do one. It’s called “the mess”.'],
      call: ['Hey {name}!', 'Mind the crates!', 'Forty-three... wait, where was I?'] },
  };
  V.NPC = NPC;
  function greeting(g, n) {
    const P = NPC[n.id]; if (!P) return null;
    const m = mem(g), talks = m.talks[n.id] || 0, ev = event(g, n.id);
    if (talks === 0 && P.greet.first) return { text: pick(P.greet.first), ev: null };
    if (ev && P.greet[ev]) return { text: fill(g, pick(P.greet[ev])), ev };
    const ph = phase(g), opts = [];
    if (wet(g) && P.greet.rain) opts.push(...P.greet.rain, ...P.greet.rain);
    if (P.greet[ph]) opts.push(...P.greet[ph]);
    if (talks >= 4 && P.greet.familiar) opts.push(...P.greet.familiar, ...P.greet.familiar);
    return opts.length ? { text: fill(g, pick(opts)), ev: null } : null;
  }
  V.greeting = greeting;
  function nextChat(g, n) {
    const P = NPC[n.id]; if (!P?.chat?.length) return null; const m = mem(g), k = m.chat[n.id] || 0;
    m.chat[n.id] = k + 1;
    if (k < P.chat.length) return fill(g, P.chat[k]);
    return fill(g, pick(['You’ve heard all my stories now. ', 'Ask me again in a week. ', 'Still here. Still talking. ']) + P.chat[k % P.chat.length]);
  }
  V.nextChat = nextChat;

  // dialogue: context greeting + "How are you holding up?" (personal lines in order)
  const talk = P.talk;
  P.talk = function (n) {
    const out = talk.apply(this, arguments), d = this.dialogue;
    try {
      if (!d || !n || !NPC[n.id] || d.node !== d.dialogue.startNode || String(d.node).startsWith('_')) return out;   // story scenes (e.g. the ledger choice) stay as written
      const m = mem(this), gr = greeting(this, n), dl = JSON.parse(JSON.stringify(d.dialogue)), start = dl.nodes.find(x => x.id === dl.startNode);
      if (!start) return out;
      if (gr) { start.text = (m.talks[n.id] || 0) === 0 ? gr.text + ' ' + start.text : gr.text; if (gr.ev) { markSeen(this, n.id); V.stats.eventGreets++; } V.stats.greetings++; }   // first meeting keeps the original introduction
      m.talks[n.id] = (m.talks[n.id] || 0) + 1;
      start.choices = start.choices || [];
      if (!start.choices.some(c => c.next === '_swchat')) {
        const bye = start.choices.findIndex(c => !c.next && !c.action), at = bye < 0 ? start.choices.length : bye;
        start.choices.splice(at, 0, { text: 'How are you holding up?', next: '_swchat', action: { type: 'sw_chat' } });
        dl.nodes.push({ id: '_swchat', text: '…', choices: [{ text: 'Thanks for telling me.', next: dl.startNode }, { text: 'Take care.' }] });
      }
      d.dialogue = dl; this.dialogueView();
    } catch (e) { }
    return out;
  };
  const choose = P.choose;
  P.choose = function (i) {
    const d = this.dialogue, node = d?.dialogue.nodes.find(x => x.id === d.node), ch = node?.choices?.[i];
    if (ch?.action?.type === 'sw_chat') {
      const t = nextChat(this, d.npc), cn = d.dialogue.nodes.find(x => x.id === '_swchat'); if (cn && t) cn.text = t;
      V.stats.chats++; d.node = '_swchat'; this.store?.(); this.dialogueView(); return;
    }
    return choose.apply(this, arguments);
  };

  // story NPCs call out as you pass (hub only, not during conversations)
  const upd = P.update;
  P.update = function (dt) {
    const out = upd.apply(this, arguments);
    try {
      const L = window.saltwakeHubLife; if (!L?.say || this.mapId !== 'hub' || this.raid || this.mode !== 'play' || this.panel || this.isPaused?.()) return out;
      V.cd = (V.cd ?? 6) - Math.min(.1, dt || 0); if (V.cd > 0) return out;
      const p = this.player;
      for (const n of this.world.content.npcs) {
        if (n.mapId !== 'hub' || !NPC[n.id]) continue; const at = this.npcLocation?.(n); if (!at) continue;
        const d = Math.hypot(at.x - p.x, at.y - p.y); if (d > 150 || d < 40) continue;
        const last = V.lastCall?.[n.id] || -1e9; if (performance.now() - last < 90000) continue;
        (V.lastCall ||= {})[n.id] = performance.now(); V.cd = 9;
        const ev = event(this, n.id), P = NPC[n.id], line = ev && Math.random() < .5 && P.greet[ev] ? pick(P.greet[ev]) : pick(P.call);
        L.say({ x: at.x, y: at.y }, fill(this, line), 3.4); V.stats.calls++; break;
      }
    } catch (e) { }
    return out;
  };

  // ---- townsfolk -----------------------------------------------------------------------------------------------------
  const TOWN = {
    dawn: ['Cold one this morning.', 'First boats are going out.', 'Who rang the bell so early?', 'Smell that? Bread. Finally.'],
    day: ['Rope’s gone up two scrip.', 'Fresh catch! Mostly fresh.', 'Mind the salt on the steps.', 'Busy day at the docks.', 'Ash on the wind today.', 'Another skiff came back empty.'],
    evening: ['Lanterns before dusk, they said.', 'Long day. Longer night.', 'Supper’s fish again.', 'Keep to the lit roads.'],
    night: ['The Brineworn were singing again.', 'Can’t sleep with that wind.', 'Don’t go near the water tonight.', 'Did you hear that? Out past the buoys?'],
    rain: ['Soaked through.', 'This rain won’t quit.', 'Get under the awning!', 'Rain like this, the boats stay in.'],
    squall: ['Red squall coming in! Tie everything down!', 'Hold onto your hat!'],
    read: ['Another missing boat on the board.', 'Bounties are up again.', 'Somebody posted a reward for a lost goat. Out here?'],
    water: ['Well water tastes like salt again.', 'Heavy bucket today.'], fountain: ['Make a wish. Wish for dry boots.', 'They say the fountain was here before the town.'],
    pray: ['Tide keep them. Tide bring them home.', 'For the ones still out there.'], shop: ['How much for the dried fish?', 'Robbery, this price. I’ll take two.', 'Got any rope that isn’t wet?'],
    forge: ['Iven’s working late again.', 'Listen to that hammer.', 'Ola burned her sleeve again.'], work: ['Lift on three!', 'Who tied this knot? Mira didn’t.', 'Mend the nets before dark.'],
    sea: ['Calm water. Don’t trust it.', 'There! Something moved out there.', 'My brother’s boat is due today.'], fire: ['Pass the kettle.', 'Tell the one about the Tidemaw again.', 'Warm hands, full belly.'],
    shelter: ['We’ll wait it out here.', 'Squeeze in, there’s room.'], watch: ['All quiet... for now.', 'Lantern’s low. Bring oil.'], rest: ['My feet are done for the day.', 'Just a minute’s sit.'],
  };
  const DEEDS = {
    apex: ['They say the {apex} is dead. {name} did it!', 'Did you hear? Someone finally killed the {apex}.', 'The {apex}... gone. I can hardly believe it.'],
    elder: ['The Maw’s gone quiet. Because of {name}.', 'No singing last night. First time in years.'],
    fail: ['Heard {name} came back with nothing. Sea’s cruel.', 'Rough run out there, I hear.'],
    bigwin: ['{name} cleared half the coast, they say.', 'The hunters can’t stop talking about {name}.'],
    q_tidemaw: ['No more thing under the slip. The kids fish there again.'], q_empty_skiff: ['They found out what happened to the empty skiff. Grim.'],
    q_lost_crew: ['Talla smiled today. First time in a year.'], q_rope_for_mira: ['Mira’s rope held through the squall. Good rope.'],
  };
  function deedLine(g) {
    const m = mem(g), L = m.last, out = [];
    if (L && (m.stamp || 0) - L.stamp < 3) { if (L.elder) out.push(...DEEDS.elder); else if (L.apex) out.push(...DEEDS.apex); else if (!L.ok) out.push(...DEEDS.fail); else if (L.kills >= 8) out.push(...DEEDS.bigwin); }
    for (const q of ['q_tidemaw', 'q_empty_skiff', 'q_lost_crew', 'q_rope_for_mira']) if (done(g, q)) out.push(...DEEDS[q]);
    return out.length ? fill(g, pick(out)) : null;
  }
  V.townLine = function (g, w, kind) {
    if (Math.random() < .22) { const d = deedLine(g); if (d) return d; }
    const ph = phase(g), wid = weather(g);
    const pool = [...(TOWN[kind] || []), ...(TOWN[kind] || []), ...(TOWN[ph] || [])];
    if (/squall|storm/.test(wid)) pool.push(...TOWN.squall, ...TOWN.squall); else if (/rain/.test(wid)) pool.push(...TOWN.rain, ...TOWN.rain);
    return fill(g, pick(pool));
  };
  const GREET = { dawn: ['Morning, {name}.', 'Up early, salvager?'], day: ['Afternoon, {name}.', 'Salvager.', 'Good day to you.', 'Mind yourself out there.'],
    evening: ['Evening, {name}.', 'Heading out this late?'], night: ['Careful in the dark, {name}.', 'Late for a walk.'], rain: ['Wet enough for you?', 'Get out of the rain, {name}!'] };
  V.greet = function (g, w) {
    const m = mem(g), L = m.last, ph = phase(g);
    if (L && (m.stamp || 0) - L.stamp < 2 && Math.random() < .4) {
      if (L.elder) return fill(g, pick(['Thank you, {name}. For the Maw.', 'You’re the one! The Maw!']));
      if (L.apex) return fill(g, pick(['You killed the {apex}? Thank you!', 'The {apex} hunter! Hello!']));
      if (!L.ok) return fill(g, pick(['Glad you made it back.', 'Rest a bit, {name}.']));
      return fill(g, pick(['Welcome back, {name}.', 'Good haul?']));
    }
    return fill(g, pick([...(wet(g) ? GREET.rain : []), ...(GREET[ph] || GREET.day)]));
  };
  const CHATS = [
    { when: 'any', lines: [['Price of rope’s up again.'], ['Blame the Wreckers. They strip everything that floats.']] },
    { when: 'any', lines: [['How’s your boy?'], ['Signed with the hunters. Won’t listen to me.'], ['They never do.']] },
    { when: 'any', lines: [['Neral shorted me on salt.'], ['Neral shorts everyone. It’s tradition.']] },
    { when: 'day', lines: [['Good weather for drying fish.'], ['Good weather for gulls stealing it.']] },
    { when: 'day', lines: [['Did you see the new notices?'], ['Three boats missing. Three!'], ['Tide keep them.']] },
    { when: 'evening', lines: [['Coming to the fire tonight?'], ['If Senn doesn’t sing.'], ['Senn always sings.']] },
    { when: 'night', lines: [['Did you hear singing out on the water?'], ['Don’t. Don’t talk about it.']] },
    { when: 'night', lines: [['Lock your shutters tonight.'], ['I always do. Always.']] },
    { when: 'rain', lines: [['Soaked to the bone.'], ['Better wet than Brineworn.']] },
    { when: 'rain', lines: [['Boats won’t go out in this.'], ['Good. One night everyone comes home.']] },
    { when: 'apex', lines: [['You heard? The {apex} is dead.'], ['Saw the trophy myself. Size of a cart.'], ['Maybe the boats can go further now.']] },
    { when: 'elder', lines: [['The Maw... it’s really over?'], ['Teren cried. Teren never cries.'], ['Then it’s over.']] },
    { when: 'fail', lines: [['{name} came back empty-handed.'], ['Came back, though. That counts.']] },
    { when: 'q_tidemaw', lines: [['The slip’s safe again.'], ['My nets came back whole for once.']] },
  ];
  V.chat = function (g, a, b) {
    const ph = phase(g), m = mem(g), L = m.last, fresh = L && (m.stamp || 0) - L.stamp < 3;
    const ok = CHATS.filter(c => c.when === 'any' || c.when === ph || c.when === 'rain' && wet(g) || fresh && (c.when === 'apex' && L.apex || c.when === 'elder' && L.elder || c.when === 'fail' && !L.ok) || c.when.startsWith('q_') && done(g, c.when));
    const special = ok.filter(c => !['any', 'day', 'evening', 'night', 'dawn'].includes(c.when)), c = special.length && Math.random() < .55 ? pick(special) : pick(ok);
    V.stats.townChats = (V.stats.townChats || 0) + 1;
    return c.lines.map((l, i) => [i % 2, fill(g, l[0])]);
  };
})();
