# 🤖 Mechana-Clash

A family robot card battle for 2–4 players that sneaks in math and science.
You can play on one device (with CPU opponents or pass-and-play) or across phones and tablets.

## How to play
- A shared deck holds **30 unique robots**: 10 ⚔️ Blade, 10 ⚡ Volt and 10 🛡️ Iron.
- **Type triangle:** Blade beats Volt, Volt beats Iron, and Iron beats Blade. Hitting a weakness does **2× damage**.
- **Setup:** everyone starts with 1 robot.
- **Each turn:**
  1. Draw 1 robot. Your team holds at most 5.
  2. Optionally swap your battling robot with a bench robot, once per turn.
  3. Attack. Only your battling robot attacks; bench robots do nothing.
- **Scoring:** a KO earns **2 points**. The first player to **10** wins (6 and 14 are also options).
- **Fair robots:** every robot follows HP + 2 × Attack = 140, and an ability costs 20 HP.

## Learning features
- 🧠 **Brain Boost:** answer a question before attacking to get +10 damage. Levels are Junior (4–6), Explorer (7–9) and Pro (10+).
- 🧮 **Damage math:** every hit shows its equation, e.g. `(30 + 10) × 2 = 80`.
- 🔴 **Health tokens:** each chip counts 10 damage.
- 💡 **Facts:** every card carries a true science or machine fact.

## Run locally
ES modules need a web server (opening the file directly won't work):
```bash
npm start            # or: python3 -m http.server 8080
npm test             # rules, AI, quiz and art tests
npm run art          # export all 30 cards + back + logo as SVG into assets/cards/
```

## Deploy to GitHub Pages
1. Create a new GitHub repo, then:
   ```bash
   git init && git add . && git commit -m "Mechana-Clash v1"
   git branch -M main
   git remote add origin https://github.com/<you>/mechana-clash.git
   git push -u origin main
   ```
2. In the repo, go to **Settings → Pages → Build and deployment → Source** and pick **GitHub Actions**.
3. Each push to `main` runs the tests, builds `dist/` and deploys it to `https://<you>.github.io/mechana-clash/`.
   Pull requests run tests only.

## Online multiplayer
- The host taps **Host online game** and shares the 4-letter code or invite link. Other players tap **Join**.
- Devices connect directly over WebRTC using the free public PeerJS signalling server.
- The host's browser runs the rules. If a player drops out, a CPU takes over their seat.
- Some school or office networks block WebRTC. If so, use a home network or play on one device.
- To use your own PeerServer, pass `{ host, port, path }` to `new Peer(...)` in `js/net.js`.

## Art
All robot art is original and drawn from code in `js/art.js`. Each card has its own 7-part body plan (`dna`), colour and type background.
- Edit a robot by changing its `dna` digits or `color` in `js/cards.js`.
- Print a physical deck from **Robot gallery → Print deck**.

## Project structure
```
index.html          app shell
css/style.css       styles, animations, print layout
js/cards.js         30 robots, types, abilities (balance rule lives here)
js/art.js           procedural SVG robot art, logo, card back
js/engine.js        pure game rules (shared by host, local play and tests)
js/ai.js            Easy / Hard CPU opponents
js/quiz.js          Brain Boost questions
js/net.js           PeerJS host/join wrapper
js/sound.js         WebAudio sound effects (no audio files)
js/main.js          screens, input, animations, online lobby
tools/              art export + build scripts
tests/              node:test suite (runs in CI)
.github/workflows/  test → build → deploy pipeline
```

## License
MIT