// Faction system
export const FACTIONS = {
  northern_lords: {
    id: 'northern_lords',
    name: 'Northern Lords',
    desc: 'The noble houses that control the northern territories.',
    color: '#4488ff',
    enemies: ['bandits', 'barbarians'],
    allies: ['merchants_guild'],
  },
  merchants_guild: {
    id: 'merchants_guild',
    name: "Merchant's Guild",
    desc: 'A powerful trading organization.',
    color: '#ffaa44',
    enemies: ['bandits'],
    allies: ['northern_lords', 'free_city'],
  },
  free_city: {
    id: 'free_city',
    name: 'Free Cities',
    desc: 'Independent city-states that value trade and freedom.',
    color: '#44ffaa',
    enemies: ['northern_lords'],
    allies: ['merchants_guild'],
  },
  bandits: {
    id: 'bandits',
    name: 'Bandit Brotherhood',
    desc: 'Organized criminal network.',
    color: '#ff4444',
    enemies: ['northern_lords', 'merchants_guild', 'free_city'],
    allies: [],
  },
  barbarians: {
    id: 'barbarians',
    name: 'Barbarian Clans',
    desc: 'Fierce northern warriors who raid settled lands.',
    color: '#aa4444',
    enemies: ['northern_lords', 'merchants_guild'],
    allies: [],
  },
  undead: {
    id: 'undead',
    name: 'Undead Curse',
    desc: 'No living faction – shambling dead.',
    color: '#886688',
    enemies: ['*'],
    allies: [],
  },
  none: {
    id: 'none',
    name: 'Independent',
    desc: 'No faction allegiance.',
    color: '#888',
    enemies: [],
    allies: [],
  }
};

export class FactionSystem {
  constructor() {
    // Player reputation with each faction: -100 to 100
    this.reputation = {};
    for (const id of Object.keys(FACTIONS)) {
      this.reputation[id] = 0;
    }
    // Start neutral with most
    this.reputation.bandits = -20;
    this.reputation.barbarians = -10;
  }

  getReputation(factionId) {
    return this.reputation[factionId] || 0;
  }

  changeReputation(factionId, amount) {
    if (!this.reputation[factionId]) this.reputation[factionId] = 0;
    this.reputation[factionId] = Math.max(-100, Math.min(100, this.reputation[factionId] + amount));

    // Faction relationships cascade
    const faction = FACTIONS[factionId];
    if (faction) {
      // Helping a faction angers enemies
      if (amount > 0) {
        for (const enemyId of (faction.enemies || [])) {
          if (enemyId !== '*' && this.reputation[enemyId] !== undefined) {
            this.reputation[enemyId] = Math.max(-100, this.reputation[enemyId] - Math.floor(amount * 0.3));
          }
        }
      }
      // Harming a faction improves ally relations
      if (amount < 0) {
        for (const allyId of (faction.allies || [])) {
          if (this.reputation[allyId] !== undefined) {
            this.reputation[allyId] = Math.min(100, this.reputation[allyId] + Math.floor(Math.abs(amount) * 0.2));
          }
        }
      }
    }
  }

  getReputationLabel(factionId) {
    const rep = this.getReputation(factionId);
    if (rep >= 75) return 'Honored';
    if (rep >= 50) return 'Liked';
    if (rep >= 25) return 'Friendly';
    if (rep >= -24) return 'Neutral';
    if (rep >= -49) return 'Unfriendly';
    if (rep >= -74) return 'Hostile';
    return 'Enemy';
  }

  getReputationColor(factionId) {
    const rep = this.getReputation(factionId);
    if (rep >= 50) return '#44ff44';
    if (rep >= 0) return '#88ff88';
    if (rep >= -24) return '#ffff44';
    if (rep >= -50) return '#ffaa44';
    return '#ff4444';
  }

  serialize() {
    return { reputation: { ...this.reputation } };
  }

  deserialize(data) {
    if (data.reputation) this.reputation = { ...data.reputation };
  }
}

export default FactionSystem;
