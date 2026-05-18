export const QUEST_TYPES = {
    KILL_ENEMIES: 'KILL_ENEMIES',
    KILL_BOSSES: 'KILL_BOSSES',
    TRAVEL_DISTANCE: 'TRAVEL_DISTANCE',
};

export const INITIAL_QUEST_DEFS = [
    {
        id: 'q_kill_20',
        type: QUEST_TYPES.KILL_ENEMIES,
        label: 'Eliminate 20 enemies',
        target: 20,
        reward: { materials: 25 },
    },
    {
        id: 'q_boss_1',
        type: QUEST_TYPES.KILL_BOSSES,
        label: 'Defeat 1 boss',
        target: 1,
        reward: { materials: 60 },
    },
    {
        id: 'q_walk_1500',
        type: QUEST_TYPES.TRAVEL_DISTANCE,
        label: 'Travel 1500 distance',
        target: 1500,
        reward: { materials: 35 },
    },
];

function cloneQuest(def) {
    return {
        id: def.id,
        type: def.type,
        label: def.label,
        target: def.target,
        reward: { ...def.reward },
        progress: 0,
        completed: false,
        rewarded: false,
    };
}

function maybeCompleteAndReward(quest, grantMaterials) {
    if (quest.completed) return;
    if (quest.progress >= quest.target) {
        quest.completed = true;
        if (!quest.rewarded) {
            quest.rewarded = true;
            if (quest.reward?.materials) grantMaterials(quest.reward.materials);
        }
    }
}

export function createQuestSystem({ refs, callbacks = {} }) {
    const { questsRef } = refs;
    const { setQuestView, grantMaterials } = callbacks;

    function ensureInit() {
        if (!Array.isArray(questsRef.current) || questsRef.current.length === 0) {
            questsRef.current = INITIAL_QUEST_DEFS.map(cloneQuest);
        }
    }

    function syncView() {
        setQuestView(questsRef.current.map((q) => ({ ...q, reward: { ...q.reward } })));
    }

    function onEnemyKilled(enemy) {
        ensureInit();

        for (const quest of questsRef.current) {
            if (quest.completed) continue;

            if (quest.type === QUEST_TYPES.KILL_ENEMIES) {
                quest.progress += 1;
            }

            if (quest.type === QUEST_TYPES.KILL_BOSSES && enemy?.isBoss) {
                quest.progress += 1;
            }

            maybeCompleteAndReward(quest, grantMaterials);
        }

        syncView();
    }

    function onDistanceTraveled(deltaDistance) {
        if (deltaDistance <= 0) return;
        ensureInit();

        for (const quest of questsRef.current) {
            if (quest.completed) continue;

            if (quest.type === QUEST_TYPES.TRAVEL_DISTANCE) {
                quest.progress += deltaDistance;
            }

            maybeCompleteAndReward(quest, grantMaterials);
        }

        syncView();
    }

    function setFromSave(savedQuests) {
        if (!Array.isArray(savedQuests) || savedQuests.length === 0) {
            questsRef.current = INITIAL_QUEST_DEFS.map(cloneQuest);
            syncView();
            return;
        }

        questsRef.current = savedQuests.map((q) => ({
            ...q,
            reward: { ...(q.reward || {}) },
        }));

        syncView();
    }

    function getSerializableState() {
        ensureInit();
        return questsRef.current.map((q) => ({
            ...q,
            reward: { ...q.reward },
        }));
    }

    function reset() {
        questsRef.current = INITIAL_QUEST_DEFS.map(cloneQuest);
        syncView();
    }

    return {
        onEnemyKilled,
        onDistanceTraveled,
        setFromSave,
        getSerializableState,
        reset,
        syncView,
    };
}