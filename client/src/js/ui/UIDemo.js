class DemoUI {
  static initialized = false;
  static dialogueTypingTimer = null;
  static sceneTransitionKey = 'scene-transition-enter';

  static startSceneTransition() {
    if (sessionStorage.getItem(DemoUI.sceneTransitionKey) !== 'true') return;
    sessionStorage.removeItem(DemoUI.sceneTransitionKey);
    document.body.classList.add('scene-entering');
    document.body.addEventListener('animationend', () => {
      document.body.classList.remove('scene-entering');
    }, { once: true });
  }

  static transitionTo(action) {
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      action();
      return;
    }

    sessionStorage.setItem(DemoUI.sceneTransitionKey, 'true');
    document.body.classList.add('scene-leaving');
    window.setTimeout(action, 220);
  }

  static init() {
    if (DemoUI.initialized) return;
    DemoUI.startSceneTransition();
    DemoGame.init();
    UI.loadGold();
    Resources.load();

    const titleButton = document.querySelector('.scene-title-button');
    const titleDialog = document.getElementById('title-return-dialog');
    const titleNoButton = titleDialog?.querySelector('.title-return-no');
    const titleYesButton = titleDialog?.querySelector('.title-return-yes');
    if (titleButton && titleDialog) {
      titleButton.addEventListener('click', () => {
        titleDialog.hidden = false;
        titleNoButton?.focus();
      });
    }
    titleNoButton?.addEventListener('click', () => {
      titleDialog.hidden = true;
      titleButton?.focus();
    });
    titleYesButton?.addEventListener('click', () => {
      window.location.href = document.body.dataset.page === 'lobby'
        ? '../src/views/index.html'
        : 'index.html';
    });

    const travelToGuild = document.getElementById('guild-btn');
    if (travelToGuild) {
      travelToGuild.addEventListener('click', () => {
        window.location.href = '../src/views/missions.html';
      });
    }

    const exploreForest = document.getElementById('explore-forest-btn');
    if (exploreForest) {
      exploreForest.addEventListener('click', () => DemoGame.beginTravel('forest'));
    }

    const capitalGate = document.getElementById('capital-gate');
    if (capitalGate) {
      capitalGate.addEventListener('click', () => {
        DemoGame.beginTravel('capital');
      });
    }

    const forestGate = document.getElementById('forest-gate');
    if (forestGate) {
      forestGate.addEventListener('click', () => DemoGame.beginTravel('forest'));
    }

    const travelHome = document.getElementById('return-to-village-btn');
    if (travelHome) {
      travelHome.addEventListener('click', () => {
        DemoUI.transitionTo(() => DemoGame.beginTravel('lobby'));
      });
    }

    const viewPath = document.body.dataset.page === 'lobby'
      ? '../src/views/'
      : '';
    const page = document.body.dataset.page;
    const returnTarget = page === 'lobby'
      ? 'lobby'
      : page === 'missions' || page === 'capital'
        ? 'missions'
        : page === 'collection'
          ? 'collection'
        : 'capital';
    [
      ['inventory-btn', `${viewPath}inventory.html?return=${returnTarget}`],
      ['shop-btn', `${viewPath}shop.html?return=${returnTarget}`]
    ].forEach(([buttonId, path]) => {
      const button = document.getElementById(buttonId);
      if (button) {
        button.addEventListener('click', () => {
          window.location.href = path;
        });
      }
    });

    const acceptMission = document.getElementById('accept-mission-btn');
    if (acceptMission) {
      acceptMission.addEventListener('click', () => {
        const missionId = new URLSearchParams(window.location.search)
          .get('mission') || 'swamp-road';
        if (!DemoGame.canStartMission(missionId)) {
          DemoUI.renderMissionDetails();
          return;
        }
        if (missionId === 'villain-negotiation') {
          DemoUI.showNegotiationDialogue();
          return;
        }
        window.location.href =
          `combat.html?mode=mission&mission=${encodeURIComponent(missionId)}&start=1`;
      });
    }

    const negotiationContinue = document.getElementById('negotiation-continue');
    if (negotiationContinue) {
      negotiationContinue.addEventListener('click', () => {
        const dialog = document.getElementById('negotiation-dialog');
        const speaker = document.getElementById('negotiation-speaker');
        const text = document.getElementById('negotiation-text');
        if (!dialog || !speaker || !text) return;
        if (dialog.dataset.typing === 'true') {
          DemoUI.completeDialogueTyping(dialog, text);
          return;
        }

        const nextLine = Number(dialog.dataset.line || 0) + 1;
        if (nextLine >= DemoUI.negotiationDialogue.length) {
          window.location.href =
            'combat.html?mode=mission&mission=villain-negotiation&start=1';
          return;
        }
        DemoUI.renderNegotiationDialogueLine(nextLine);
      });
    }

    const capitalShop = document.getElementById('capital-shop-btn');
    if (capitalShop) {
      capitalShop.addEventListener('click', () => {
        window.location.href = 'shop.html';
      });
    }

    const capitalVillage = document.getElementById('capital-village-btn');
    if (capitalVillage) {
      capitalVillage.addEventListener('click', () => {
        DemoUI.transitionTo(() => {
          window.location.href = '../../dev/lobbydev.html';
        });
      });
    }

    const shopToGuild = document.getElementById('shop-to-guild-btn');
    if (shopToGuild) {
      shopToGuild.addEventListener('click', () => {
        window.location.href = 'missions.html';
      });
    }

    const sellItems = document.getElementById('sell-items-btn');
    if (sellItems) {
      sellItems.addEventListener('click', () => {
        window.location.href = 'inventory.html?mode=sell&return=shop';
      });
    }

    const shopToVillage = document.getElementById('shop-to-village-btn');
    if (shopToVillage) {
      shopToVillage.addEventListener('click', () => {
        DemoUI.transitionTo(() => {
          window.location.href = '../../dev/lobbydev.html';
        });
      });
    }

    const rebuildButton = document.getElementById('rebuild-btn');
    if (rebuildButton) {
      rebuildButton.addEventListener('click', () => {
        if (DemoGame.rebuildMerchantHouse()) {
          DemoUI.render();
          const rescueButton = document.getElementById('rescue-merchant-btn');
          const rescueRequirement = document.getElementById('rescue-requirement');
          if (rescueButton) rescueButton.hidden = true;
          if (rescueRequirement) rescueRequirement.hidden = true;
          DemoUI.showVillageInteraction(
            '',
            '',
            'Pronto! Quando o Gerson voltar ele vai ter a casa dele de volta!'
          );
        }
      });
    }

    const merchantHouse = document.getElementById('merchant-house');
    if (merchantHouse) {
      merchantHouse.addEventListener('click', () => DemoUI.showMerchantInteraction());
    }

    const villageInteraction = document.getElementById('village-interaction');
    const closeInteraction = villageInteraction?.querySelector('.scene-close');
    if (closeInteraction) {
      closeInteraction.addEventListener('click', () => {
        villageInteraction.hidden = true;
      });
    }

    const introDialog = document.getElementById('village-intro-dialog');
    const closeIntroDialog = document.getElementById('village-intro-continue');
    if (closeIntroDialog) {
      closeIntroDialog.addEventListener('click', () => {
        const introText = document.getElementById('village-intro-text');
        if (!introDialog || !introText) return;
        if (introDialog.dataset.typing === 'true') {
          DemoUI.completeDialogueTyping(introDialog, introText);
          return;
        }
        if (introDialog.dataset.step !== '2') {
          introDialog.dataset.step = '2';
          DemoUI.typeDialogue(
            'Primeiro, é melhor eu me equipar, assim quem sabe a guilda libera uma missão para mim!'
          );
          return;
        }
        introDialog.hidden = true;
      });
    }

    const finishDemoButton = document.getElementById('finish-demo-btn');
    if (finishDemoButton) {
      finishDemoButton.addEventListener('click', () => {
        const endingDialog = document.getElementById('village-ending-dialog');
        const endingText = document.getElementById('village-ending-text');
        if (endingDialog?.dataset.typing === 'true' && endingText) {
          DemoUI.completeDialogueTyping(endingDialog, endingText);
          return;
        }
        DemoGame.state.endingPending = false;
        DemoGame.state.demoCompleted = true;
        DemoGame.save();
        DemoUI.showDemoCompletion();
      });
    }

    document.getElementById('return-to-menu-btn')?.addEventListener('click', () => {
      window.location.href = '../src/views/index.html';
    });

    const collectionDialog = document.getElementById('collection-intro-dialog');
    const closeCollectionDialog = document.getElementById('collection-intro-continue');
    if (closeCollectionDialog) {
      closeCollectionDialog.addEventListener('click', () => {
        const dialogueText = document.getElementById('collection-intro-text');
        if (!collectionDialog || !dialogueText) return;
        if (collectionDialog.dataset.typing === 'true') {
          DemoUI.completeDialogueTyping(collectionDialog, dialogueText);
        } else {
          collectionDialog.hidden = true;
        }
      });
    }

    const rescueButton = document.getElementById('rescue-merchant-btn');
    if (rescueButton) {
      rescueButton.addEventListener('click', () => {
        if (DemoGame.rescueMerchant()) {
          DemoUI.render();
          DemoUI.showVillageInteraction(
            'Fim da demo',
            'O mercador voltou para casa',
            'Você o resgatou e concluiu o ciclo principal da demonstração.'
          );
        }
      });
    }

    const clearStorageButton = document.getElementById('clear-storage-btn');
    if (clearStorageButton) {
      clearStorageButton.addEventListener('click', () => {
        if (!window.confirm('Apagar os dados locais da demo?')) return;
        [
          'game_resources',
          'game_gold',
          'game_inventory',
          'game_shop',
          'game_shop_rotation',
          DEMO_STATE_KEY,
          DEMO_DAY_SNAPSHOT_KEY
        ].forEach(key => localStorage.removeItem(key));
        if (typeof SaveManager !== 'undefined') SaveManager.resetActiveGame();
        window.location.reload();
      });
    }

    const backButton = document.getElementById('back-to-village-btn');
    if (backButton) {
      const returnTarget = new URLSearchParams(window.location.search).get('return');
      if (returnTarget === 'capital') backButton.textContent = 'Voltar à capital';
      if (returnTarget === 'missions') backButton.textContent = 'Voltar às missões';
      if (returnTarget === 'shop') backButton.textContent = 'Voltar à loja';
      backButton.addEventListener('click', () => {
        const destination = returnTarget === 'missions'
          ? 'missions.html'
          : returnTarget === 'shop'
            ? 'shop.html'
            : returnTarget === 'collection'
              ? 'coleta.html'
          : document.body.dataset.page === 'guild' || returnTarget === 'capital'
            ? 'capital.html'
            : '../../dev/lobbydev.html';
        DemoUI.transitionTo(() => {
          window.location.href = destination;
        });
      });
    }

    document.addEventListener('demoStateUpdate', () => DemoUI.render());
    DemoUI.initialized = true;
    DemoUI.render();
    DemoUI.renderMissionDetails();
    DemoUI.showFirstVillageDialogue();
    DemoUI.showFirstCollectionDialogue();
    DemoUI.showFinalScene();
  }

  static showFirstVillageDialogue() {
    const dialog = document.getElementById('village-intro-dialog');
    if (
      document.body.dataset.page !== 'lobby' ||
      !dialog ||
      DemoGame.state.endingPending ||
      DemoGame.state.demoCompleted ||
      DemoGame.state.introShown
    ) return;

    DemoGame.state.introShown = true;
    DemoGame.save();
    DemoGame.saveDaySnapshot();
    dialog.dataset.step = '1';
    dialog.hidden = false;
    DemoUI.typeDialogue(
      document.getElementById('village-intro-text').textContent,
      'village-intro-dialog',
      'village-intro-text'
    );
    document.getElementById('village-intro-continue')?.focus();
  }

  static showFinalScene() {
    if (document.body.dataset.page !== 'lobby') return;
    if (DemoGame.state.demoCompleted) {
      DemoUI.showDemoCompletion();
      return;
    }
    if (!DemoGame.state.endingPending) return;

    const dialog = document.getElementById('village-ending-dialog');
    if (!dialog) return;
    dialog.hidden = false;
    DemoUI.typeDialogue(
      document.getElementById('village-ending-text').textContent,
      'village-ending-dialog',
      'village-ending-text'
    );
    document.getElementById('finish-demo-btn')?.focus();
  }

  static showDemoCompletion() {
    const endingDialog = document.getElementById('village-ending-dialog');
    const completionScreen = document.getElementById('demo-completion-screen');
    const summary = document.getElementById('demo-completion-summary');
    if (!completionScreen || !summary) return;

    if (endingDialog) endingDialog.hidden = true;
    const days = DemoGame.state.day;
    summary.textContent = `Você levou ${days} ${days === 1 ? 'dia' : 'dias'} pra resgatar o mercador, parabéns!`;
    completionScreen.hidden = false;
    document.getElementById('return-to-menu-btn')?.focus();
  }

  static showFirstCollectionDialogue() {
    const dialog = document.getElementById('collection-intro-dialog');
    if (
      document.body.dataset.page !== 'collection' ||
      !dialog ||
      DemoGame.state.collectionIntroShown
    ) return;

    DemoGame.state.collectionIntroShown = true;
    DemoGame.save();
    DemoGame.saveDaySnapshot();
    dialog.hidden = false;
    DemoUI.typeDialogue(
      document.getElementById('collection-intro-text').textContent,
      'collection-intro-dialog',
      'collection-intro-text'
    );
    document.getElementById('collection-intro-continue')?.focus();
  }

  static typeDialogue(text, dialogId = 'village-intro-dialog', textId = 'village-intro-text') {
    const dialog = document.getElementById(dialogId);
    const textElement = document.getElementById(textId);
    if (!dialog || !textElement) return;

    clearInterval(DemoUI.dialogueTypingTimer);
    DemoUI.dialogueTypingTimer = null;
    dialog.dataset.fullText = text;
    textElement.textContent = '';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      textElement.textContent = text;
      dialog.dataset.typing = 'false';
      return;
    }

    const characters = Array.from(text);
    let index = 0;
    dialog.dataset.typing = 'true';
    DemoUI.dialogueTypingTimer = setInterval(() => {
      textElement.textContent += characters[index];
      index++;
      if (index >= characters.length) {
        clearInterval(DemoUI.dialogueTypingTimer);
        DemoUI.dialogueTypingTimer = null;
        dialog.dataset.typing = 'false';
      }
    }, 28);
  }

  static completeDialogueTyping(dialog, textElement) {
    clearInterval(DemoUI.dialogueTypingTimer);
    DemoUI.dialogueTypingTimer = null;
    textElement.textContent = dialog.dataset.fullText;
    dialog.dataset.typing = 'false';
  }

  static negotiationDialogue = [
    {
      speaker: 'Jorge',
      text: 'Como assim o preço vai aumentar? Você sabe o quanto eu ralei pra juntar os primeiros 1500?'
    },
    {
      speaker: 'Vilão',
      text: 'Negócios são negócios, mas sabe, o moral da galera aqui tá meio pra baixo, que tal uma lutinha? se você ganhar, eu não aumento o preço, se você perder... aí eu fico com esses trocados que você trouxe, e esse velho que você quis trazer também.'
    },
    {
      speaker: 'Jorge',
      text: 'mas... tá, se eu não aceitar eu não vou ter dinheiro pra resgatar o gerson, pode mandar meu adversário!'
    }
  ];

  static showNegotiationDialogue() {
    const dialog = document.getElementById('negotiation-dialog');
    if (!dialog) return;
    dialog.hidden = false;
    DemoUI.renderNegotiationDialogueLine(0);
    document.getElementById('negotiation-continue')?.focus();
  }

  static renderNegotiationDialogueLine(index) {
    const dialog = document.getElementById('negotiation-dialog');
    const speaker = document.getElementById('negotiation-speaker');
    const text = document.getElementById('negotiation-text');
    const button = document.getElementById('negotiation-continue');
    const line = DemoUI.negotiationDialogue[index];
    if (!dialog || !speaker || !text || !button || !line) return;

    dialog.dataset.line = String(index);
    speaker.textContent = line.speaker;
    button.textContent = index === DemoUI.negotiationDialogue.length - 1
      ? 'Lutar!'
      : 'Continuar';
    DemoUI.typeDialogue(
      line.text,
      'negotiation-dialog',
      'negotiation-text'
    );
  }

  static showVillageInteraction(eyebrow, title, copy) {
    const panel = document.getElementById('village-interaction');
    if (!panel) return;
    const eyebrowElement = document.getElementById('interaction-eyebrow');
    const titleElement = document.getElementById('interaction-title');
    const copyElement = document.getElementById('interaction-copy');
    if (eyebrowElement) {
      eyebrowElement.textContent = eyebrow;
      eyebrowElement.hidden = !eyebrow;
    }
    if (titleElement) {
      titleElement.textContent = title;
      titleElement.hidden = !title;
    }
    if (copyElement) copyElement.textContent = copy;
    const notice = document.getElementById('demo-notice');
    if (notice) {
      notice.textContent = '';
      notice.hidden = true;
    }
    panel.hidden = false;
  }

  static showMerchantInteraction() {
    const rescued = DemoGame.state.merchantRescued;
    DemoUI.showVillageInteraction(
      rescued
        ? 'Morador da vila'
        : '',
      rescued
        ? 'O mercador está em casa'
        : '',
      rescued
        ? 'A casa voltou a ter um morador.'
        : 'Pronto! Quando o Gerson voltar ele vai ter a casa dele de volta!'
    );
    const requirement = document.getElementById('rescue-requirement');
    const button = document.getElementById('rescue-merchant-btn');
    if (requirement) requirement.hidden = true;
    if (button) button.hidden = true;
  }

  static renderMissionBoard() {
    const cards = document.querySelectorAll('[data-mission-card]');
    if (!cards.length) return;

    cards.forEach(card => {
      const missionId = card.dataset.missionCard;
      const status = card.querySelector('.mission-select-status');
      const reward = card.querySelector('.mission-select-reward');
      const unlocked = DemoGame.isMissionUnlocked(missionId);
      let visible = unlocked;
      let statusText = 'Disponível';
      let available = DemoGame.canStartMission(missionId);

      if (missionId === 'orc-extermination') {
        visible = DemoGame.hasCompletedMission('swamp-road');
        statusText = 'Ilimitada';
      } else if (missionId === 'villain-negotiation') {
        visible = DemoGame.state.orcExterminationWins > 0 ||
          DemoGame.state.merchantRescued;
        if (DemoGame.state.merchantRescued) {
          statusText = 'Concluída';
          available = false;
        } else if (!Resources.cabinObtained) {
          statusText = 'Reconstrua a casa';
          available = false;
        } else if (!available) {
          statusText = 'Bloqueada';
        }
      }

      card.hidden = !visible;
      card.classList.toggle('is-locked', visible && !available);
      card.setAttribute('aria-disabled', String(!available));
      if (status) status.textContent = statusText;
      if (reward) {
        reward.textContent = missionId === 'villain-negotiation'
          ? DemoGame.state.merchantRescued
            ? 'Mercador resgatado'
            : `${DemoGame.merchantRescueCost} ouro`
          : `${DemoGame.missions[missionId].reward} ouro`;
      }
      if (available) {
        card.href = `capital.html?mission=${encodeURIComponent(missionId)}`;
        card.removeAttribute('tabindex');
      } else {
        card.removeAttribute('href');
        card.tabIndex = -1;
      }
    });
  }

  static renderMissionDetails() {
    const title = document.getElementById('capital-mission-title');
    if (!title) return;

    const missionId = new URLSearchParams(window.location.search)
      .get('mission') || 'swamp-road';
    const mission = DemoGame.missions[missionId];
    const eyebrow = document.getElementById('capital-mission-eyebrow');
    const description = document.getElementById('capital-mission-description');
    const reward = document.getElementById('capital-mission-reward');
    const acceptButton = document.getElementById('accept-mission-btn');
    if (!mission) {
      title.textContent = 'Missão indisponível';
      if (reward) reward.hidden = true;
      if (acceptButton) acceptButton.disabled = true;
      return;
    }

    title.textContent = mission.title;
    if (description) description.textContent = mission.description;
    if (eyebrow) {
      eyebrow.textContent = missionId === 'villain-negotiation' &&
        !Resources.cabinObtained
        ? 'Guilda dos aventureiros · reconstrua a casa do mercador'
        : mission.eyebrow;
    }
    if (reward) {
      reward.hidden = false;
      reward.replaceChildren(
        document.createTextNode('Valor '),
        Object.assign(document.createElement('strong'), {
          textContent: missionId === 'villain-negotiation'
            ? `${DemoGame.merchantRescueCost} ouro`
            : `${mission.reward} ouro`
        })
      );
    }
    if (acceptButton) {
      const available = DemoGame.canStartMission(missionId);
      acceptButton.disabled = !available;
      acceptButton.textContent = DemoGame.state.merchantRescued &&
        missionId === 'villain-negotiation'
        ? 'Missão concluída'
        : 'Aceitar missão';
    }
  }

  static render() {
    if (!DemoGame.state) return;
    DemoUI.renderMissionBoard();

    const day = document.getElementById('day-number');
    if (day) day.textContent = String(DemoGame.state.day);

    const timer = document.getElementById('day-timer');
    if (timer) {
      const totalSeconds = Math.ceil(DemoGame.getRemainingDayMs() / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    const gold = document.getElementById('gold-display');
    if (gold) gold.textContent = String(UI.gold);

    const wood = document.getElementById('wood-count');
    if (wood) wood.textContent = String(Resources.wood);

    const forestButton = document.getElementById('explore-forest-btn');
    if (forestButton) {
      forestButton.disabled = !DemoGame.canExploreForest();
      forestButton.title = forestButton.disabled
        ? 'Conclua a missão da guilda para desbloquear a floresta.'
        : '';
    }
    const forestGate = document.getElementById('forest-gate');
    if (forestGate) {
      forestGate.disabled = !DemoGame.canExploreForest();
      forestGate.title = forestGate.disabled
        ? 'Conclua uma missão da guilda para desbloquear a área de coleta.'
        : '';
      forestGate.classList.toggle('is-unlocked', !forestGate.disabled);
    }

    const rebuildButton = document.getElementById('rebuild-btn');
    const rebuildRequirement = document.getElementById('rebuild-requirement');
    const houseObtained = document.getElementById('house-obtained');
    const merchantHouse = document.getElementById('merchant-house');
    if (rebuildButton && rebuildRequirement && houseObtained) {
      const obtained = Resources.cabinObtained;
      rebuildButton.hidden = obtained;
      rebuildButton.disabled = obtained || Resources.wood < Resources.cabinWoodCost;
      rebuildRequirement.hidden = obtained;
      rebuildRequirement.textContent =
        `Madeira: ${Resources.wood}/${Resources.cabinWoodCost}`;
      houseObtained.hidden = !obtained;
      houseObtained.textContent = 'Casa do mercador reconstruída';
      if (merchantHouse) merchantHouse.hidden = !obtained;
    }

    const rescueButton = document.getElementById('rescue-merchant-btn');
    const rescueRequirement = document.getElementById('rescue-requirement');
    const merchantRescued = document.getElementById('merchant-rescued');
    const rescuePanel = document.getElementById('merchant-rescue-panel');
    if (rescuePanel) rescuePanel.hidden = !Resources.cabinObtained;
    if (rescueButton && rescueRequirement && merchantRescued) {
      rescueButton.disabled = !DemoGame.canRescueMerchant();
      rescueRequirement.textContent =
        `${DemoGame.merchantRescueCost} ouro e casa reconstruída`;
      merchantRescued.hidden = true;
    }

    const house = document.getElementById('house-obtained');
    if (house) house.hidden = !Resources.cabinObtained;

    const notice = document.getElementById('demo-notice');
    if (notice && DemoGame.state.notice) {
      notice.textContent = DemoGame.state.notice;
      notice.hidden = false;
      DemoGame.clearNotice();
    }

    const ending = document.getElementById('demo-ending');
    if (ending) ending.hidden = true;
  }
}
