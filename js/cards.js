// Mechana-Clash card data: 30 unique robots, 10 per type.
// Balance rule ("equal & balanced power"): HP + 2 × Attack = 140. A special ability costs 20 HP.
export const POWER = 140;

export const TYPES = {
  blade: { name: 'Blade', icon: '⚔️', color: '#ff5a3c', beats: 'volt' },
  volt:  { name: 'Volt',  icon: '⚡', color: '#ffc61a', beats: 'iron' },
  iron:  { name: 'Iron',  icon: '🛡️', color: '#3fa3ff', beats: 'blade' },
};
export const weakTo = (type) => Object.keys(TYPES).find((k) => TYPES[k].beats === type);

export const EFFECTS = {
  strike: { icon: '👊', label: 'Strike',  text: 'A solid, reliable hit. Extra-tough robot.' },
  spin:   { icon: '🌀', label: 'Spin',    text: 'Hits the battling robot of EVERY opponent.' },
  zap:    { icon: '💫', label: 'Zap',     text: 'Stuns the target: it skips its next attack.' },
  repair: { icon: '🔧', label: 'Repair',  text: 'After attacking, repairs 20 of its own damage.' },
  shield: { icon: '🧱', label: 'Shield',  text: 'After attacking, blocks 20 damage from the next hit.' },
  lucky:  { icon: '🪙', label: 'Lucky',   text: 'Flip a coin: heads = double damage!' },
  boost:  { icon: '🤝', label: 'Team Up', text: '+10 damage per benched teammate (max +20).' },
};

// dna = legs, body, arms, head, eyes, mouth, antenna (drives the procedural art)
const R = (id, type, name, atk, effect, move, color, dna, fact) => ({
  id, type, name, atk, effect, move, color, dna, fact,
  hp: POWER - 2 * atk - (effect === 'strike' ? 0 : 20),
});

export const CARDS = [
  R('b01', 'blade', 'Sawtooth', 30, 'strike', 'Buzz Saw', '#e8452c', '0010010', "A saw's teeth bend a little left and right, so the cut is wider than the blade and it doesn't get stuck."),
  R('b02', 'blade', 'Spinnerette', 20, 'spin', 'Spin Attack', '#ff7a1a', '2310101', 'A spinning top stays upright because spinning things resist being tipped over.'),
  R('b03', 'blade', 'Drillbit', 20, 'strike', 'Deep Drill', '#c9302c', '1141203', 'The spiral grooves on a drill bit carry chips out of the hole as it spins.'),
  R('b04', 'blade', 'Snipsy', 30, 'repair', 'Snip & Fix', '#ff5e78', '0202130', 'Scissors are two levers joined at a pivot. Cutting near the pivot takes less effort!'),
  R('b05', 'blade', 'Razorback', 40, 'strike', 'Razor Rush', '#d4380d', '4114022', 'A wedge is a simple machine. Axes and knives are wedges that push things apart.'),
  R('b06', 'blade', 'Pinchy', 20, 'zap', 'Pinch Shock', '#ff8f6b', '1000312', 'Tweezers are levers too: you push in the middle and the tips do the gripping.'),
  R('b07', 'blade', 'Cutlass-7', 30, 'shield', 'Parry Slash', '#b81d3c', '0414234', 'Blacksmiths harden steel by heating it red-hot, then cooling it fast in water or oil.'),
  R('b08', 'blade', 'Shredda', 20, 'lucky', 'Wild Shred', '#ff6a00', '3341313', 'Recycling machines shred plastic bottles into flakes that can be melted into new things.'),
  R('b09', 'blade', 'Clawbert', 20, 'boost', 'Claw Crew', '#e0533d', '2003404', 'Robot arms have joints like yours: a shoulder, an elbow and a wrist.'),
  R('b10', 'blade', 'Bladewing', 30, 'spin', 'Whirlwind', '#ff9b3d', '3110023', 'Helicopter blades are spinning wings. They push air down to lift the helicopter up.'),

  R('v01', 'volt', 'Sparky', 30, 'strike', 'Spark Punch', '#ffd21f', '0220014', 'A lightning bolt is hotter than the surface of the Sun!'),
  R('v02', 'volt', 'Zapling', 20, 'zap', 'Electric Zap', '#f7e13b', '2321104', 'Electricity flows easily through metal. Rubber and plastic block it, so they are called insulators.'),
  R('v03', 'volt', 'Voltina', 30, 'shield', 'Static Shield', '#ffb000', '3123231', 'Rub a balloon on your hair and static electricity lets it stick to a wall.'),
  R('v04', 'volt', 'Coil Jr.', 20, 'strike', 'Coil Whip', '#e6f04a', '1424122', 'Send electricity through a coil of wire and it becomes a magnet: an electromagnet.'),
  R('v05', 'volt', 'Ampster', 30, 'repair', 'Recharge', '#29d3c4', '4202303', 'Batteries store energy in chemicals and turn it into electricity when you need it.'),
  R('v06', 'volt', 'Static Stan', 20, 'lucky', 'Wild Static', '#b5ff3b', '0322420', 'Volts measure how hard electricity is pushed. A AA battery gives 1.5 volts.'),
  R('v07', 'volt', 'Ohmie', 20, 'boost', 'Circuit Party', '#ffe066', '2023311', 'Electricity only flows around a complete loop called a circuit. A switch opens or closes the loop.'),
  R('v08', 'volt', 'Fluxy', 20, 'spin', 'Thunder Spin', '#9be7ff', '3220214', 'Solar panels turn sunlight straight into electricity.'),
  R('v09', 'volt', 'Watt-Knot', 40, 'strike', 'Mega Watt', '#ffc93c', '1242011', 'Watts measure power. An LED bulb uses far fewer watts than an old bulb for the same light.'),
  R('v10', 'volt', 'Neuronix', 30, 'zap', 'Brain Buzz', '#c6a8ff', '4421432', 'Your brain and nerves send messages using tiny electrical signals.'),

  R('i01', 'iron', 'Rivet', 30, 'strike', 'Rivet Gun', '#3fa3ff', '1030023', 'The Eiffel Tower is held together by about 2.5 million rivets.'),
  R('i02', 'iron', 'Anvil', 20, 'strike', 'Anvil Drop', '#6c8aa8', '1131110', 'Hot metal is softer, so blacksmiths heat it before hammering it into shape on an anvil.'),
  R('i03', 'iron', 'Gearhart', 20, 'boost', 'Gear Team', '#4bc0a0', '0333002', 'When a big gear turns a small gear, the small one spins faster.'),
  R('i04', 'iron', 'Clank', 20, 'shield', 'Iron Wall', '#5b7cfa', '1331330', 'Steel is mostly iron with a little carbon mixed in, which makes it much stronger.'),
  R('i05', 'iron', 'Bulwark', 30, 'repair', 'Weld Patch', '#2f6fd1', '4334201', 'Iron rusts when it meets water and oxygen. Paint helps keep them out.'),
  R('i06', 'iron', 'Tankette', 20, 'spin', 'Tread Spin', '#7a9a5a', '1432113', "Tracks spread a machine's weight over a big area, so it doesn't sink into mud or snow."),
  R('i07', 'iron', 'Magnetta', 20, 'zap', 'Magnet Snap', '#e14b8a', '2332424', 'Magnets pull on iron and steel, but not on aluminum cans.'),
  R('i08', 'iron', 'Cogby', 20, 'lucky', 'Gear Gamble', '#8fb3c9', '0431030', 'Ball bearings let wheels spin smoothly by reducing friction.'),
  R('i09', 'iron', 'Boulder', 40, 'strike', 'Boulder Bash', '#4a5d7a', '1004231', 'A ramp is a simple machine: pushing something up a ramp is easier than lifting it straight up.'),
  R('i10', 'iron', 'Liftor', 30, 'shield', 'Hydraulic Guard', '#36c5f0', '3434314', 'Diggers use hydraulics: liquid pushed through pipes moves their heavy arms.'),
];

export const CARD_MAP = Object.fromEntries(CARDS.map((c) => [c.id, c]));