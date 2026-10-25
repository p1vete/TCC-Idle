let containerInventory = null;

class InventoryUI {
  static isSellMode() {
    return document.body.dataset.page === 'inventory' &&
      new URLSearchParams(window.location.search).get('mode') === 'sell';
  }

  static init() {
    containerInventory = document.getElementById('inventory-grid');
    globalThis.inventoryLocked = false;
  }

  static render() {
    const sellMode = InventoryUI.isSellMode();
    document.body.dataset.mode = sellMode ? 'sell' : 'inventory';
    if (sellMode) {
      document.title = 'Vender itens — Mochileiro';
      const pageTitle = document.querySelector('.game-title');
      const inventoryTitle = document.querySelector('.inventory-title');
      if (pageTitle) pageTitle.textContent = 'Vender itens';
      if (inventoryTitle) inventoryTitle.textContent = 'Vender itens';
    }

    const items = Inventory.getAllItems();
    if (!containerInventory) {
      containerInventory = document.getElementById('inventory-grid');
    }
    if (!containerInventory) return;
    containerInventory.innerHTML = '';

    for (let slotIndex = 0; slotIndex < Inventory.getCapacity(); slotIndex++) {
      const slot = document.createElement('div');
      slot.className = 'inventory-slot';
      slot.setAttribute('aria-label', `Espaço ${slotIndex + 1}`);

      const item = items[slotIndex];
      if (item) {
        slot.classList.add('is-occupied');
        if (item.equipped) slot.classList.add('is-equipped');
        slot.appendChild(InventoryUI.createItemElement(item, slotIndex, sellMode));
      }
      containerInventory.appendChild(slot);
    }

    const slotCountElement = document.getElementById('slot-count');
    if (slotCountElement) {
      slotCountElement.textContent = `${items.length}/${Inventory.getCapacity()}`;
    }
  }

  static createItemElement(item, index, sellMode = false) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'inventory-item';
    itemDiv.dataset.itemId = item.id;
    itemDiv.dataset.index = index;
    const toggleEquipment = event => {
      if (sellMode || event.target.closest('.item-details') || !item.wearable) return;
      event.stopPropagation();
      if (inventoryLocked || !Inventory.canEquipItem(item)) return;
      if (Inventory.toggleEquip(item.id)) InventoryUI.render();
    };
    itemDiv.addEventListener('click', toggleEquipment);
    itemDiv.addEventListener('keydown', event => {
      if (
        event.target !== itemDiv ||
        !['Enter', ' '].includes(event.key)
      ) return;
      event.preventDefault();
      toggleEquipment(event);
    });
    itemDiv.setAttribute(
      'aria-label',
      sellMode ? `${item.name}, ações de venda` : `${item.name}, detalhes e ações`
    );
    itemDiv.tabIndex = 0;

    if (item.sprite) {
      const sprite = document.createElement('img');
      sprite.className = 'item-sprite';
      sprite.src = `../../assets/aaa/${encodeURIComponent(item.sprite)}`;
      sprite.alt = item.name;
      sprite.draggable = false;
      sprite.style.transform =
        `translate(${item.spriteOffsetX || 0}px, ${item.spriteOffsetY || 0}px) ` +
        `rotate(${item.spriteRotation || 0}deg) scale(${item.spriteScale || 1})`;
      itemDiv.appendChild(sprite);
    }

    const info = document.createElement('div');
    info.className = 'item-info';

    if (!item.sprite) {
      const name = document.createElement('span');
      name.className = 'item-name';
      name.textContent = item.name;
      info.appendChild(name);
    }

    const sellValue = sellMode ? Shop.getSellValue(item) : 0;
    if (item.stackable && !sellMode) {
      const quantity = document.createElement('span');
      quantity.className = 'item-quantity';
      quantity.textContent = `x${item.quantity}`;
      info.appendChild(quantity);
    }

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

    if (sellMode) {
      const saleValue = document.createElement('span');
      saleValue.className = 'item-sale-value';
      saleValue.textContent = `Venda: ${sellValue} ouro`;
      details.appendChild(saleValue);
    }

    if (item.description && document.body.dataset.page !== 'combat') {
      const description = document.createElement('p');
      description.className = 'item-details-description';
      description.textContent = item.description;
      details.appendChild(description);
    }

    if (sellMode) {
      const sellBtn = document.createElement('button');
      sellBtn.className = 'item-sell-btn';
      sellBtn.textContent = 'Vender';
      sellBtn.setAttribute('aria-label', `Vender ${item.name} por ${sellValue} ouro`);
      sellBtn.title = `Vender ${item.quantity} por ${sellValue} ouro`;
      sellBtn.onclick = event => {
        event.stopPropagation();
        Shop.sellInventoryItem(index);
      };
      details.appendChild(sellBtn);
    } else {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'item-remove-btn';
      removeBtn.textContent = 'Excluir item';
      removeBtn.setAttribute('aria-label', `Excluir ${item.name}`);
      removeBtn.title = `Excluir ${item.name}`;
      removeBtn.onclick = event => {
        event.stopPropagation();
        InventoryUI.removeItem(index);
      };
      details.appendChild(removeBtn);
    }

    if (!sellMode && item.class === 'consumable') {
      const useBtn = document.createElement('button');
      useBtn.className = 'item-use-btn';
      useBtn.textContent = 'Usar';
      useBtn.setAttribute('aria-label', `Usar ${item.name}`);
      useBtn.title = `Usar ${item.name}`;
      useBtn.disabled = inventoryLocked;
      useBtn.onclick = (e) => {
        e.stopPropagation();
        if (inventoryLocked) return;
        useItem(item.id);
        if (typeof CombatUI !== 'undefined') CombatUI.updatePlayerHp();
      };
      details.appendChild(useBtn);
    }

    itemDiv.appendChild(details);
    return itemDiv;
  }

  static async removeItem(index) {
    Inventory.removeItemByIndex(index);
    InventoryUI.render();
  }
}