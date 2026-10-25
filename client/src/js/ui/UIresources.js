class ResourcesUI {
  static collectionCooldownTimer = null;
  static initialized = false;

  static init() {
    if (ResourcesUI.initialized) return;
    Resources.load();

    const collectButton = document.getElementById('collect-wood-btn');
    if (collectButton) {
      collectButton.addEventListener('click', () => {
        if (!DemoGame.canExploreForest()) {
          return;
        }
        const axeEquipped = Inventory.getEquippedItems()
          .some(item => Number(item.catalogId ?? item.id) === 4);
        const amount = axeEquipped ? 5 : 1;
        if (Resources.collectWood(amount)) {
          ResourcesUI.render();
          ResourcesUI.scheduleCollectionReady();
        }
      });
    }

    ResourcesUI.initialized = true;
    ResourcesUI.render();
    ResourcesUI.scheduleCollectionReady();
  }

  static scheduleCollectionReady() {
    if (ResourcesUI.collectionCooldownTimer !== null) {
      clearTimeout(ResourcesUI.collectionCooldownTimer);
      ResourcesUI.collectionCooldownTimer = null;
    }

    const remaining = Resources.getCollectionCooldownRemaining();
    if (remaining > 0) {
      ResourcesUI.collectionCooldownTimer = setTimeout(() => {
        ResourcesUI.collectionCooldownTimer = null;
        ResourcesUI.render();
      }, remaining);
    }
  }

  static render() {
    const woodCount = document.getElementById('wood-count');
    if (woodCount) woodCount.textContent = String(Resources.wood);

    const woodYield = document.getElementById('wood-yield');
    if (woodYield) {
      const axeEquipped = Inventory.getEquippedItems().some(
        item => Number(item.catalogId ?? item.id) === 4
      );
      woodYield.textContent = `(+${axeEquipped ? 5 : 1})`;
    }

    const collectButton = document.getElementById('collect-wood-btn');
    if (collectButton) {
      collectButton.disabled =
        !DemoGame.canExploreForest() ||
        Resources.getCollectionCooldownRemaining() > 0;
    }
  }
}
