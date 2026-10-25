let items = [];

let playerHp = 100;
let playerMaxHp = 100;

const STORAGE_KEY_INVENTORY = 'game_inventory';
const INVENTORY_CAPACITY = 25;

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

function normalizeItem(item) {
  if (!item || !Number.isSafeInteger(Number(item.id)) || Number(item.id) <= 0) {
    return null;
  }

  const catalogItem = typeof itemDatabase === 'object'
    ? Object.values(itemDatabase).find(candidate => candidate.name === item.name) ||
      (Number.isSafeInteger(Number(item.catalogId))
        ? itemDatabase[Number(item.catalogId)]
        : null)
    : null;
  const catalogId = Number(item.catalogId ?? catalogItem?.id ?? item.id);
  const source = catalogItem || item;
  const name = typeof source.name === 'string' ? source.name.trim() : '';
  const quantity = Number(item.quantity ?? 1);
  const price = Number(source.price ?? item.price ?? 0);
  const attValue = Number(source.att_value ?? item.att_value ?? 0);

  if (!name || !Number.isSafeInteger(quantity) || quantity <= 0) return null;
  if (!Number.isSafeInteger(price) || price < 0) return null;
  if (!Number.isFinite(attValue)) return null;

  const rawBonuses = source.bonuses ?? item.bonuses;
  const bonuses = rawBonuses && typeof rawBonuses === 'object'
    ? Object.fromEntries(
      Object.entries(rawBonuses)
        .filter(([stat, value]) =>
          ['strength', 'hp', 'defense', 'luck'].includes(stat) &&
          Number.isFinite(Number(value))
        )
        .map(([stat, value]) => [stat, Number(value)])
    )
    : null;

  return {
    id: Number(item.id),
    catalogId,
    name,
    ...(typeof source.description === 'string'
      ? { description: source.description }
      : {}),
    ...(typeof source.sprite === 'string'
      ? {
        sprite: source.sprite,
        spriteRotation: Number.isFinite(source.spriteRotation)
          ? source.spriteRotation
          : 0,
        spriteScale: Number.isFinite(source.spriteScale)
          ? source.spriteScale
          : 1,
        spriteOffsetX: Number.isFinite(source.spriteOffsetX)
          ? source.spriteOffsetX
          : 0,
        spriteOffsetY: Number.isFinite(source.spriteOffsetY)
          ? source.spriteOffsetY
          : 0
      }
      : {}),
    quantity,
    price,
    stackable: source.stackable !== false,
    wearable: source.wearable === true,
    class: source.class ?? source.item_class ?? null,
    type: source.type ?? null,
    attribute: source.attribute ?? null,
    att_value: attValue,
    ...(bonuses && Object.keys(bonuses).length > 0 ? { bonuses } : {}),
    equipped: item.equipped === true,
    unlimitedStock: item.unlimitedStock === true
  };
}

class Inventory {
  static normalizeItem(item) {
    return normalizeItem(item);
  }

  static addItem(item) {
    const normalizedItem = normalizeItem(item);
    if (!normalizedItem) return false;

    if (
      normalizedItem.equipped &&
      Inventory.getEquippedCountByClass(normalizedItem.class) >=
        (Inventory.equipmentSlots()[normalizedItem.class] ?? 0)
    ) {
      return false;
    }

    const existingItem = items.find(i => i.id === normalizedItem.id);

    if (existingItem && normalizedItem.stackable) {
      const nextQuantity = existingItem.quantity + normalizedItem.quantity;
      if (!Number.isSafeInteger(nextQuantity)) return false;
      existingItem.quantity = nextQuantity;
      Inventory.persist();
      return true;
    }

    if (items.length >= INVENTORY_CAPACITY) return false;
    items.push(normalizedItem);
    Inventory.persist();
    return true;
  }

  static removeItemByIndex(index) {
    if (Number.isInteger(index) && index >= 0 && index < items.length) {
      items.splice(index, 1);
      Inventory.persist();
      return true;
    }
    return false;
  }

  static getAllItems() {
    return items;
  }

  static async loadItems(itemsArray) {
    if (!Array.isArray(itemsArray)) {
      items = [];
      return items;
    }

    items = itemsArray.map(normalizeItem).filter(Boolean);
    Inventory.normalizeEquipmentSlots();
    return items;
  }

  static normalizeEquipmentSlots() {
    const slots = Inventory.equipmentSlots();
    const counts = {};
    let changed = false;

    items.forEach(item => {
      if (!item.equipped || !item.wearable) return;
      const limit = slots[item.class] ?? 0;
      counts[item.class] = counts[item.class] || 0;
      if (counts[item.class] >= limit) {
        item.equipped = false;
        changed = true;
        return;
      }
      counts[item.class]++;
    });

    return changed;
  }

  static persist() {
    try {
      const data = { items, playerHp };
      localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(data));
      if (typeof SaveManager !== 'undefined') SaveManager.syncActiveSlot();
    } catch (e) {
      console.warn('Falha ao salvar inventário no localStorage', e);
    }
  }

  static loadFromLocalStorage(defaultItems) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_INVENTORY);
      if (raw) {
        const parsed = safeParse(raw);
        if (parsed && Array.isArray(parsed.items)) {
          items = parsed.items.map(normalizeItem).filter(Boolean);
          if (typeof parsed.playerHp === 'number' && Number.isFinite(parsed.playerHp)) {
            playerHp = Math.max(0, parsed.playerHp);
          }
          if (Inventory.normalizeEquipmentSlots()) Inventory.persist();
          return items;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar inventário do localStorage', e);
    }

    if (defaultItems) {
      Inventory.loadItems(defaultItems);
    }
    Inventory.persist();
    return items;
  }

  static getItemById(itemId) {
    return items.find(i => i.id === itemId);
  }

  static itemsLength() {
    return items.length;
  }

  static getCapacity() {
    return INVENTORY_CAPACITY;
  }

  static getEquippedItems() {
    return items.filter(item => item.equipped === true && item.wearable === true);
  }

  static equipmentSlots() {
    return {
      weapon: 1,
      shield: 1,
      helmet: 1,
      chestplate: 1,
      pants: 1,
      boots: 1,
      accessory: 3
    };
  }

  static getEquippedCountByClass(itemClass) {
    return Inventory.getEquippedItems().filter(item => item.class === itemClass).length;
  }

  static canEquipItem(item) {
    if (!item || item.wearable !== true) return false;
    const slots = Inventory.equipmentSlots();
    const maxSlots = slots[item.class];
    if (maxSlots === undefined) return false;
    if (item.equipped) return true;
    return Inventory.getEquippedCountByClass(item.class) < maxSlots;
  }

  static equipItem(itemId) {
    const item = Inventory.getItemById(itemId);
    if (!item || item.wearable !== true) return false;

    const slots = Inventory.equipmentSlots();
    if (slots[item.class] === undefined) return false;
    if (item.equipped) return true;
    if (Inventory.getEquippedCountByClass(item.class) >= slots[item.class]) return false;

    item.equipped = true;
    Inventory.persist();
    return true;
  }

  static unequipItem(itemId) {
    const item = Inventory.getItemById(itemId);
    if (!item || item.equipped !== true) return false;
    item.equipped = false;
    Inventory.persist();
    return true;
  }

  static toggleEquip(itemId) {
    const item = Inventory.getItemById(itemId);
    if (!item || item.wearable !== true) return false;
    return item.equipped ? Inventory.unequipItem(itemId) : Inventory.equipItem(itemId);
  }

  static getStats() {
    const stats = {
      strength: 0,
      hp: 100,
      defense: 0,
      luck: 0
    };

    Inventory.getEquippedItems().forEach(item => {
      if (item.bonuses) {
        Object.entries(item.bonuses).forEach(([attribute, value]) => {
          if (stats[attribute] !== undefined) stats[attribute] += value;
        });
      } else if (
        item.attribute &&
        typeof item.att_value === 'number' &&
        stats[item.attribute] !== undefined
      ) {
        stats[item.attribute] += item.att_value;
      }
    });

    return stats;
  }

  static playerStats() {
    const stats = Inventory.getStats();
    return {
      strength: stats.strength,
      hp: stats.hp,
      defense: stats.defense,
      luck: stats.luck
    };
  }

  static getPlayerHp() {
    return playerHp;
  }

  static setPlayerHp(value) {
    if (!Number.isFinite(value)) return false;
    playerHp = Math.max(0, Math.min(value, Inventory.getPlayerMaxHp()));
    Inventory.persist();
    return true;
  }

  static restorePlayerHp() {
    playerMaxHp = Inventory.getStats().hp;
    playerHp = playerMaxHp;
    Inventory.persist();
    return playerHp;
  }

  static getPlayerMaxHp() {
    playerMaxHp = Inventory.getStats().hp;
    playerHp = Math.max(0, Math.min(playerHp, playerMaxHp));
    return playerMaxHp;
  }

  static useItem(itemId) {
    const item = Inventory.getItemById(itemId);
    if (!item || item.quantity <= 0) return false;

    if (item.class === 'consumable') {
      if (item.attribute === 'hp') {
        playerMaxHp = Inventory.getStats().hp;
        playerHp = Math.min(playerMaxHp, playerHp + item.att_value);
        console.log(`+${item.att_value} HP (HP atual: ${playerHp}/${playerMaxHp})`);
      }

      item.quantity--;

      if (item.quantity <= 0) {
        items = items.filter(i => i.id !== itemId);
      }

      Inventory.persist();
      return true;
    }

    return false;
  }
}
