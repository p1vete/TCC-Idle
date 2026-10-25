const STORAGE_KEY_GOLD = 'game_gold';
const STARTING_GOLD = 200;

class UI {
  static gold = STARTING_GOLD;

  static checkGold(cost) {
    return Number.isSafeInteger(cost) && cost >= 0 && UI.gold >= cost;
  }

  static payGold(cost) {
    if (!UI.checkGold(cost)) return false;
    UI.gold -= cost;
    UI.updateGold();
    return true;
  }

  static giveGold(amount) {
    if (!Number.isSafeInteger(amount) || amount < 0) return false;
    UI.gold += amount;
    UI.updateGold();
    return true;
  }

  static updateGold() {
    const goldElement = document.getElementById('gold-display');
    if (goldElement) {
      goldElement.textContent = String(UI.gold);
    }
    try {
      localStorage.setItem(STORAGE_KEY_GOLD, String(UI.gold));
      if (typeof SaveManager !== 'undefined') SaveManager.syncActiveSlot();
    } catch (e) {
      console.warn('Falha ao salvar ouro no localStorage', e);
    }
  }

  static loadGold() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_GOLD);
      if (raw !== null) {
        const value = Number(raw);
        if (Number.isSafeInteger(value) && value >= 0) {
          UI.gold = value;
        }
      }
    } catch (e) {
      console.warn('Falha ao carregar ouro do localStorage', e);
    }
  }
}

class ShopUI {
  static render() {
    const container = document.getElementById('shop-list');
    if (!container || typeof Shop === 'undefined') return;

    container.innerHTML = '';
    Shop.getItems().forEach((item, index) => {
      container.appendChild(ShopUI.createItemElement(item, index));
    });
  }

  static createItemElement(item, index) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'shop-item';
    itemDiv.dataset.itemId = String(item.id);
    itemDiv.dataset.index = String(index);
    itemDiv.tabIndex = 0;
    itemDiv.setAttribute('role', 'button');
    itemDiv.setAttribute('aria-label', `Comprar ${item.name} por ${item.price} ouro`);

    if (item.sprite) {
      const sprite = document.createElement('img');
      sprite.className = 'shop-item-sprite';
      sprite.src = `../../assets/aaa/${encodeURIComponent(item.sprite)}`;
      sprite.alt = '';
      sprite.draggable = false;
      sprite.style.transform =
        `translate(${item.spriteOffsetX || 0}px, ${item.spriteOffsetY || 0}px) ` +
        `rotate(${item.spriteRotation || 0}deg) scale(${item.spriteScale || 1})`;
      itemDiv.appendChild(sprite);
    } else {
      const name = document.createElement('span');
      name.className = 'shop-item-fallback-name';
      name.textContent = item.name;
      itemDiv.appendChild(name);
    }

    const price = document.createElement('span');
    price.className = 'item-price';
    price.textContent = `${item.price} Ouro`;

    const info = document.createElement('div');
    info.className = 'shop-item-info';
    info.appendChild(price);
    itemDiv.appendChild(info);

    const details = document.createElement('div');
    details.className = 'item-details';
    details.setAttribute('role', 'group');

    const detailsName = document.createElement('strong');
    detailsName.className = 'item-details-name';
    detailsName.textContent = item.name;
    details.appendChild(detailsName);

    const stats = item.bonuses && Object.keys(item.bonuses).length
      ? item.bonuses
      : item.attribute && item.att_value
        ? { [item.attribute]: item.att_value }
        : {};
    const statLabels = {
      strength: 'Força',
      hp: 'Vida',
      defense: 'Defesa',
      luck: 'Sorte'
    };
    const statsElement = document.createElement('div');
    statsElement.className = 'item-details-stats';
    Object.entries(stats).forEach(([stat, value]) => {
      if (!statLabels[stat]) return;
      const statElement = document.createElement('span');
      statElement.textContent =
        `${statLabels[stat]} ${value > 0 ? '+' : ''}${value}`;
      statsElement.appendChild(statElement);
    });
    if (statsElement.childElementCount) details.appendChild(statsElement);

    if (item.description) {
      const description = document.createElement('p');
      description.className = 'item-details-description';
      description.textContent = item.description;
      details.appendChild(description);
    }
    itemDiv.appendChild(details);

    itemDiv.addEventListener('click', () => Shop.buyByIndex(index));
    itemDiv.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      Shop.buyByIndex(index);
    });
    return itemDiv;
  }
}
