const DEMO_STATE_KEY = 'game_demo_state';
const DEMO_DAY_SNAPSHOT_KEY = 'game_day_snapshot';

class DemoGame {
  static dayDurationMs = 5 * 60 * 1000;
  static merchantRescueCost = 1500;
  static missions = {
    'swamp-road': {
      title: 'Estrada do Pântano',
      eyebrow: 'Guilda dos aventureiros · missão disponível',
      description: 'Uma caravana foi emboscada por orcs. A filiação mercantil solicitou a liberação das estradas, o valor é razoável.',
      reward: 200
    },
    'orc-extermination': {
      title: 'Extermínio de Orcs',
      eyebrow: 'Guilda dos aventureiros · missão ilimitada',
      description: 'Após a liberação das estradas, os orcs se revoltaram e começaram a atacar mais e mais frequentemente, precisamos de alguém para lidar com isso.',
      reward: 450
    },
    'villain-negotiation': {
      title: 'Negociação com os Vilões',
      eyebrow: 'Guilda dos aventureiros · missão especial',
      description: 'Consegui o dinheiro para resgatar o Gerson, espero que não tenha nenhuma gracinha. Pessoal, vou salvá-los!',
      reward: 0
    }
  };
  static snapshotKeys = [
    'game_inventory',
    'game_gold',
    'game_shop',
    'game_shop_rotation',
    'game_resources'
  ];
  static state = null;
  static tickHandle = null;
  static initialized = false;

  static createDefaultState(introShown = true) {
    return {
      version: 1,
      day: 1,
      dayStartedAt: Date.now(),
      missionWins: 0,
      completedMissions: [],
      orcExterminationWins: 0,
      forestUnlocked: false,
      merchantRescued: false,
      endingPending: false,
      demoCompleted: false,
      introShown,
      collectionIntroShown: introShown,
      pendingTravel: null,
      notice: ''
    };
  }

  static init() {
    if (DemoGame.initialized) return;
    if (!DemoGame.state) {
      try {
        const saved = JSON.parse(localStorage.getItem(DEMO_STATE_KEY));
        if (
          saved &&
          saved.version === 1 &&
          Number.isSafeInteger(saved.day) &&
          saved.day > 0 &&
          Number.isFinite(saved.dayStartedAt)
        ) {
          DemoGame.state = {
            ...DemoGame.createDefaultState(),
            ...saved,
            introShown: saved.introShown !== false,
            collectionIntroShown: saved.collectionIntroShown !== false,
            completedMissions: Array.isArray(saved.completedMissions)
              ? [...new Set(saved.completedMissions.filter(
                missionId => Object.hasOwn(DemoGame.missions, missionId)
              ))]
              : [],
            orcExterminationWins: Number.isSafeInteger(saved.orcExterminationWins) &&
              saved.orcExterminationWins >= 0
              ? saved.orcExterminationWins
              : 0
          };
        }
      } catch (error) {
        console.warn('Erro ao carregar o estado da demo:', error);
      }
      if (!DemoGame.state) DemoGame.state = DemoGame.createDefaultState(false);
    }

    DemoGame.advanceElapsedDays();
    if (typeof Shop !== 'undefined') {
      Shop.initializeDailyStock(DemoGame.state.day);
    }
    DemoGame.save();
    if (!localStorage.getItem(DEMO_DAY_SNAPSHOT_KEY)) {
      DemoGame.saveDaySnapshot();
    }
    if (DemoGame.tickHandle === null) {
      DemoGame.tickHandle = setInterval(() => DemoGame.tick(), 1000);
    }
    DemoGame.initialized = true;
  }

  static save() {
    try {
      localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(DemoGame.state));
      if (typeof SaveManager !== 'undefined') SaveManager.syncActiveSlot();
      return true;
    } catch (error) {
      console.error('Falha ao salvar o estado local da demo:', error);
      return false;
    }
  }

  static saveDaySnapshot() {
    const snapshot = Object.fromEntries(
      DemoGame.snapshotKeys.map(key => [key, localStorage.getItem(key)])
    );
    snapshot[DEMO_STATE_KEY] = JSON.stringify(DemoGame.state);

    try {
      localStorage.setItem(DEMO_DAY_SNAPSHOT_KEY, JSON.stringify(snapshot));
      if (typeof SaveManager !== 'undefined') SaveManager.syncActiveSlot();
      return true;
    } catch (error) {
      console.error('Falha ao salvar o início do dia:', error);
      return false;
    }
  }

  static advanceElapsedDays() {
    const now = Date.now();
    const elapsed = now - DemoGame.state.dayStartedAt;
    if (elapsed < DemoGame.dayDurationMs) return;

    const elapsedDays = Math.floor(elapsed / DemoGame.dayDurationMs);
    DemoGame.state.day += elapsedDays;
    DemoGame.state.dayStartedAt += elapsedDays * DemoGame.dayDurationMs;
    if (typeof Inventory !== 'undefined') {
      Inventory.restorePlayerHp();
    }
    DemoGame.state.notice = `${elapsedDays} novo dia iniciado. Progresso salvo localmente neste protótipo.`;
    DemoGame.save();
    document.dispatchEvent(new CustomEvent('newDayStarted'));
    DemoGame.saveDaySnapshot();
  }

  static tick() {
    DemoGame.advanceElapsedDays();
    document.dispatchEvent(new CustomEvent('demoStateUpdate'));
  }

  static getRemainingDayMs() {
    return Math.max(
      0,
      DemoGame.dayDurationMs - (Date.now() - DemoGame.state.dayStartedAt)
    );
  }

  static hasCompletedMission(missionId) {
    if (DemoGame.state.completedMissions.includes(missionId)) return true;
    return missionId === 'swamp-road' && DemoGame.state.missionWins > 0;
  }

  static isMissionUnlocked(missionId) {
    if (!Object.hasOwn(DemoGame.missions, missionId)) return false;
    if (missionId === 'swamp-road') {
      return !DemoGame.hasCompletedMission(missionId);
    }
    if (missionId === 'orc-extermination') {
      return DemoGame.hasCompletedMission('swamp-road');
    }
    return DemoGame.state.orcExterminationWins > 0 &&
      !DemoGame.state.merchantRescued;
  }

  static canStartMission(missionId) {
    if (!DemoGame.isMissionUnlocked(missionId)) return false;
    return missionId !== 'villain-negotiation' ||
      Resources.cabinObtained &&
      UI.checkGold(DemoGame.merchantRescueCost);
  }

  static recordMissionVictory(missionId) {
    if (!Object.hasOwn(DemoGame.missions, missionId)) return false;

    DemoGame.state.missionWins += 1;
    if (!DemoGame.state.completedMissions.includes(missionId)) {
      DemoGame.state.completedMissions.push(missionId);
    }
    if (missionId === 'swamp-road') {
      DemoGame.state.forestUnlocked = true;
      DemoGame.state.notice = 'Missão concluída. A exploração da floresta foi desbloqueada.';
    } else if (missionId === 'orc-extermination') {
      DemoGame.state.orcExterminationWins += 1;
      DemoGame.state.notice = 'Extermínio concluído. Você recebeu 450 ouro; a missão pode ser repetida.';
    } else {
      DemoGame.state.merchantRescued = true;
      DemoGame.state.endingPending = true;
      DemoGame.state.notice = 'Negociação concluída. O mercador foi resgatado.';
    }
    return DemoGame.save();
  }

  static canExploreForest() {
    return DemoGame.state.forestUnlocked;
  }

  static beginTravel(destination) {
    if (destination === 'forest' && !DemoGame.canExploreForest()) return false;
    if (!['forest', 'capital', 'lobby'].includes(destination)) return false;

    DemoGame.state.pendingTravel = destination;
    DemoGame.save();
    const combatPath = document.body.dataset.page === 'lobby'
      ? '../src/views/combat.html'
      : 'combat.html';
    window.location.href =
      `${combatPath}?mode=road&target=${destination}&start=1`;
    return true;
  }

  static completeTravel(
    destination = DemoGame.state.pendingTravel || 'lobby',
    notice = 'A viagem pela estrada foi concluída.'
  ) {
    DemoGame.state.pendingTravel = null;
    DemoGame.state.notice = notice;
    DemoGame.save();
    const destinationPath = destination === 'forest'
      ? 'coleta.html'
      : destination === 'capital'
        ? 'missions.html'
        : '../../dev/lobbydev.html';
    const navigate = () => {
      window.location.href = destinationPath;
    };
    if (destination === 'lobby' && typeof DemoUI !== 'undefined') {
      DemoUI.transitionTo(navigate);
    } else {
      navigate();
    }
  }

  static handleDeath({ preserveNegotiationRequirements = false } = {}) {
    let snapshot;
    try {
      const currentGold = UI.gold;
      const merchantHouseRebuilt = Resources.cabinObtained;
      snapshot = JSON.parse(localStorage.getItem(DEMO_DAY_SNAPSHOT_KEY));
      if (!snapshot || !snapshot[DEMO_STATE_KEY]) {
        throw new Error('O salvamento do início do dia não existe.');
      }
      if (preserveNegotiationRequirements) {
        snapshot.game_gold = String(currentGold);
        const savedResources = snapshot.game_resources
          ? JSON.parse(snapshot.game_resources)
          : { wood: 0, lastWoodCollectedAt: 0 };
        savedResources.cabinObtained = merchantHouseRebuilt;
        snapshot.game_resources = JSON.stringify(savedResources);
      }
      for (const key of DemoGame.snapshotKeys) {
        if (snapshot[key] === null || snapshot[key] === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, snapshot[key]);
        }
      }

      DemoGame.state = JSON.parse(snapshot[DEMO_STATE_KEY]);
      DemoGame.state.dayStartedAt = Date.now();
      DemoGame.state.pendingTravel = null;
      DemoGame.state.notice = `Você morreu. O progresso do início do Dia ${DemoGame.state.day} foi restaurado.`;
      DemoGame.save();
      DemoGame.saveDaySnapshot();
      window.location.href = '../../dev/lobbydev.html?notice=death';
    } catch (error) {
      console.error('Não foi possível restaurar o início do dia:', error);
    }
  }

  static rebuildMerchantHouse() {
    if (!Resources.rebuildCabinAndCart()) return false;
    DemoGame.state.notice = 'A casa do mercador foi reconstruída.';
    DemoGame.save();
    return true;
  }

  static canRescueMerchant() {
    return false;
  }

  static rescueMerchant() {
    if (!DemoGame.canRescueMerchant()) return false;
    if (!UI.payGold(DemoGame.merchantRescueCost)) return false;
    DemoGame.state.merchantRescued = true;
    DemoGame.state.notice = 'O mercador foi resgatado. Fim da demo.';
    return DemoGame.save();
  }

  static getNotice() {
    return DemoGame.state.notice;
  }

  static clearNotice() {
    DemoGame.state.notice = '';
    DemoGame.save();
  }
}
