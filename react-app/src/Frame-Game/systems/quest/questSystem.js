export const QUEST_TYPES = {
    KILL_ENEMIES: 'KILL_ENEMIES',
    KILL_BOSSES: 'KILL_BOSSES',
    TRAVEL_DISTANCE: 'TRAVEL_DISTANCE',
};

export const QUEST_DEFS = [
    {
        id: 'q_kill_20',
        type: QUEST_TYPES.KILL_ENEMIES,
        label: 'Eliminate 20 enemies',
        target: 20,
        reward: { materials: 25 },
        unlock: { minBosses: 0 },
    },
    {
        id: 'q_boss_1',
        type: QUEST_TYPES.KILL_BOSSES,
        label: 'Defeat 1 boss',
        target: 1,
        reward: { materials: 60 },
        unlock: { minBosses: 0 },
    },
    {
        id: 'q_walk_1500',
        type: QUEST_TYPES.TRAVEL_DISTANCE,
        label: 'Travel 1500 distance',
        target: 1500,
        reward: { materials: 35 },
        unlock: { minBosses: 0 },
    },
    {
        id: 'q_kill_100',
        type: QUEST_TYPES.KILL_ENEMIES,
        label: 'Eliminate 100 enemies',
        target: 100,
        reward: { materials: 140 },
        unlock: { minBosses: 1 },
    },
    {
        id: 'q_boss_2',
        type: QUEST_TYPES.KILL_BOSSES,
        label: 'Defeat 2 bosses',
        target: 2,
        reward: { materials: 120 },
        unlock: { minBosses: 1 },
    },
    {
        id: 'q_walk_6000',
        type: QUEST_TYPES.TRAVEL_DISTANCE,
        label: 'Travel 6000 distance',
        target: 6000,
        reward: { materials: 120 },
        unlock: { minBosses: 1 },
    },
];

// Input: a quest-like object with id/type/label/target/progress/reward fields.
// Output: a shallow-cloned quest record safe for storing in refs or sending to state.
// Purpose: normalize quest objects so the system can reuse the same shape everywhere.
function copyQuestRecord(quest) {
    return {
        id: quest.id,
        type: quest.type,
        label: quest.label,
        target: quest.target,
        reward: { ...(quest.reward || {}) },
        unlock: { ...(quest.unlock || {}) },
        progress: typeof quest.progress === 'number' ? quest.progress : 0,
        completed: Boolean(quest.completed),
        rewarded: Boolean(quest.rewarded),
    };
}

// Input: a saved completion detail object.
// Output: a normalized completion detail record with cloned reward data.
// Purpose: restore and serialize hidden quest completion history safely.
function copyCompletedDetail(detail) {
    return {
        id: detail.id,
        type: detail.type,
        label: detail.label,
        target: detail.target,
        progress: typeof detail.progress === 'number' ? detail.progress : (detail.target ?? 0),
        reward: { ...(detail.reward || {}) },
    };
}

// Input: a quest, the grantMaterials callback, and optional completion tracker refs.
// Output: none.
// Purpose: mark a quest complete, record hidden completion data, and award materials once.
function maybeCompleteAndReward(quest, grantMaterials, trackers = {}) {
    if (quest.completed) return;
    if (quest.progress >= quest.target) {
        quest.completed = true;
        if (trackers.completedQuestsCountRef) {
            trackers.completedQuestsCountRef.current += 1;
        }
        if (trackers.completedQuestDetailsRef) {
            trackers.completedQuestDetailsRef.current.push({
                id: quest.id,
                type: quest.type,
                label: quest.label,
                target: quest.target,
                progress: quest.progress,
                reward: { ...(quest.reward || {}) },
            });
        }
        if (!quest.rewarded) {
            quest.rewarded = true;
            if (quest.reward?.materials) {
                grantMaterials(quest.reward.materials);
            }
        }
    }
}

// Input: refs for quest state and callbacks for pushing quest data into React state.
// Output: a quest-system API object with lifecycle, progression, and save/load methods.
// Purpose: create and manage the entire hidden quest state machine for the game.
export function createQuestSystem({ refs, callbacks = {} }) {
    const {
        activeQuestsRef,
        pendingQuestChoicesRef,
        maxActiveQuestsRef,
        bossesDefeatedRef, // optional, but preferred
        completedQuestsCountRef,
        completedQuestDetailsRef,
    } = refs;

    const {
        setQuestView,
        setQuestChoicesView,
        setQuestSelectionOpen,
        grantMaterials,
    } = callbacks;

    // Input: none.
    // Output: the current boss kill count, or 0 if no ref was provided.
    // Purpose: gate quest unlocks that depend on boss progress.
    function getBossesDefeated() {
        if (bossesDefeatedRef && typeof bossesDefeatedRef.current === 'number') {
            return Math.max(0, bossesDefeatedRef.current);
        }
        // Fallback if not provided.
        return 0;
    }

    // Input: none.
    // Output: none.
    // Purpose: make sure the quest refs always have the expected container types and defaults.
    function ensureInit() {
        if (!Array.isArray(activeQuestsRef.current)) activeQuestsRef.current = [];
        if (!Array.isArray(pendingQuestChoicesRef.current)) pendingQuestChoicesRef.current = [];
        if (completedQuestsCountRef && typeof completedQuestsCountRef.current !== 'number') {
            completedQuestsCountRef.current = 0;
        }
        if (completedQuestDetailsRef && !Array.isArray(completedQuestDetailsRef.current)) {
            completedQuestDetailsRef.current = [];
        }
        if (typeof maxActiveQuestsRef.current !== 'number' || maxActiveQuestsRef.current <= 0) {
            maxActiveQuestsRef.current = 3;
        }
    }

    // Input: none.
    // Output: the current active quests mapped into state-safe copies.
    // Purpose: push the active quest list into React state without sharing mutable refs.
    function syncView() {
        ensureInit();
        setQuestView(activeQuestsRef.current.map(copyQuestRecord));
    }

    // Input: none.
    // Output: the current pending quest choices mapped into state-safe copies.
    // Purpose: push the pending choice list into React state without sharing mutable refs.
    function syncChoiceView() {
        ensureInit();
        if (typeof setQuestChoicesView === 'function') {
            setQuestChoicesView(pendingQuestChoicesRef.current.map(copyQuestRecord));
        }
    }

    // Input: a quest definition.
    // Output: true when the quest is unlocked for the current save state.
    // Purpose: filter the catalog down to quests the player can currently see.
    function isUnlocked(def) {
        const minBosses = def.unlock?.minBosses ?? 0;
        return getBossesDefeated() >= minBosses;
    }

    // Input: none.
    // Output: a Set of quest ids currently active or pending.
    // Purpose: prevent duplicate quests from being offered or selected.
    function currentUnavailableIds() {
        const ids = new Set();
        for (const q of activeQuestsRef.current) ids.add(q.id);
        for (const q of pendingQuestChoicesRef.current) ids.add(q.id);
        return ids;
    }

    // Input: none.
    // Output: unlocked quest definitions that are not already active or pending.
    // Purpose: build the candidate pool for the next quest selection round.
    function buildUnlockedCandidates() {
        const unavailable = currentUnavailableIds();
        return QUEST_DEFS
            .filter((def) => isUnlocked(def))
            .filter((def) => !unavailable.has(def.id))
            .map(copyQuestRecord);
    }

    /*
    This COMBINES new unlocked options with existing pending choices.
    It does not replace pending choices with a separate pool.
    */
    // Input: none.
    // Output: none.
    // Purpose: refresh the three pending quest choices and update the selection overlay state.
    function refreshPendingChoices() {
        ensureInit();

        const combined = [];
        const seenIds = new Set();

        for (const quest of pendingQuestChoicesRef.current) {
            if (seenIds.has(quest.id)) continue;
            seenIds.add(quest.id);
            combined.push(copyQuestRecord(quest));
        }

        for (const quest of buildUnlockedCandidates()) {
            if (seenIds.has(quest.id)) continue;
            seenIds.add(quest.id);
            combined.push(quest);
        }

        pendingQuestChoicesRef.current = combined.slice(0, 3);

        syncChoiceView();
        setQuestSelectionOpen(pendingQuestChoicesRef.current.length > 0);
    }

    // Input: none.
    // Output: none.
    // Purpose: initialize quest state on first load or reuse existing state after save/load.
    function initialize() {
        ensureInit();

        if (activeQuestsRef.current.length === 0 && pendingQuestChoicesRef.current.length === 0) {
            refreshPendingChoices();
        } else {
            syncView();
            syncChoiceView();
            setQuestSelectionOpen(pendingQuestChoicesRef.current.length > 0);
        }
    }

    // Input: a quest id selected from the pending choices.
    // Output: true if the quest was moved to active, false if the selection was invalid.
    // Purpose: commit exactly one chosen quest from the current selection round.
    function selectQuest(questId) {
        ensureInit();

        if (activeQuestsRef.current.length >= maxActiveQuestsRef.current) return false;

        const index = pendingQuestChoicesRef.current.findIndex((q) => q.id === questId);
        if (index < 0) return false;

        const picked = pendingQuestChoicesRef.current[index];
        activeQuestsRef.current.push(copyQuestRecord(picked));
        pendingQuestChoicesRef.current.splice(index, 1);

        // Enforce "pick exactly one" per selection round.
        pendingQuestChoicesRef.current = [];
        syncView();
        syncChoiceView();
        setQuestSelectionOpen(false);
        return true;
    }

    // Input: none.
    // Output: none.
    // Purpose: finalize any completed active quests, reward them, and remove them from the active list.
    function pruneCompletedAndReward() {
        const nextActive = [];
        for (const quest of activeQuestsRef.current) {
            maybeCompleteAndReward(quest, grantMaterials, {
                completedQuestsCountRef,
                completedQuestDetailsRef,
            });
            if (!quest.completed) nextActive.push(quest);
        }
        activeQuestsRef.current = nextActive;
    }

    // Input: the enemy that was just killed.
    // Output: none.
    // Purpose: advance kill-based quests and refresh boss-driven quest choices.
    function onEnemyKilled(enemy) {
        ensureInit();

        for (const quest of activeQuestsRef.current) {
            if (quest.type === QUEST_TYPES.KILL_ENEMIES) {
                quest.progress += 1;
            }
            if (quest.type === QUEST_TYPES.KILL_BOSSES && enemy?.isBoss) {
                quest.progress += 1;
            }
        }

        pruneCompletedAndReward();
        syncView();

        // Boss defeat may unlock additional entries from the SAME catalog.
        if (enemy?.isBoss) {
            refreshPendingChoices();
        }
    }

    // Input: the distance traveled since the last frame.
    // Output: none.
    // Purpose: advance travel quests by the delta distance.
    function onDistanceTraveled(deltaDistance) {
        if (deltaDistance <= 0) return;
        ensureInit();

        for (const quest of activeQuestsRef.current) {
            if (quest.type === QUEST_TYPES.TRAVEL_DISTANCE) {
                quest.progress += deltaDistance;
            }
        }

        pruneCompletedAndReward();
        syncView();
    }

    // Input: saved quest data from localStorage, either legacy array form or current object form.
    // Output: none.
    // Purpose: restore quest state from a save file and normalize older save shapes.
    function setFromSave(savedQuests) {
        ensureInit();

        // Backward compatibility: old array save
        if (Array.isArray(savedQuests)) {
            activeQuestsRef.current = savedQuests.map(copyQuestRecord);
            pendingQuestChoicesRef.current = [];
            maxActiveQuestsRef.current = 3;
            syncView();
            syncChoiceView();
            setQuestSelectionOpen(false);
            return;
        }

        if (savedQuests && typeof savedQuests === 'object') {
            activeQuestsRef.current = Array.isArray(savedQuests.active)
                ? savedQuests.active.map(copyQuestRecord)
                : [];
            pendingQuestChoicesRef.current = Array.isArray(savedQuests.pendingChoices)
                ? savedQuests.pendingChoices.map(copyQuestRecord)
                : [];
            if (completedQuestsCountRef) {
                completedQuestsCountRef.current = typeof savedQuests.completedCount === 'number'
                    ? Math.max(0, Math.floor(savedQuests.completedCount))
                    : 0;
            }
            if (completedQuestDetailsRef) {
                completedQuestDetailsRef.current = Array.isArray(savedQuests.completedDetails)
                    ? savedQuests.completedDetails.map(copyCompletedDetail)
                    : [];
            }
            maxActiveQuestsRef.current =
                typeof savedQuests.maxActiveQuests === 'number' && savedQuests.maxActiveQuests > 0
                    ? Math.floor(savedQuests.maxActiveQuests)
                    : 3;
        } else {
            activeQuestsRef.current = [];
            pendingQuestChoicesRef.current = [];
            if (completedQuestsCountRef) completedQuestsCountRef.current = 0;
            if (completedQuestDetailsRef) completedQuestDetailsRef.current = [];
            maxActiveQuestsRef.current = 3;
        }

        syncView();
        syncChoiceView();
        setQuestSelectionOpen(pendingQuestChoicesRef.current.length > 0);
    }

    // Input: none.
    // Output: a plain JSON-safe object containing active, pending, and hidden completion quest data.
    // Purpose: serialize quest state into the save file.
    function getSerializableState() {
        ensureInit();
        return {
            active: activeQuestsRef.current.map(copyQuestRecord),
            pendingChoices: pendingQuestChoicesRef.current.map(copyQuestRecord),
            completedCount: completedQuestsCountRef ? completedQuestsCountRef.current : 0,
            completedDetails: completedQuestDetailsRef ? completedQuestDetailsRef.current.map(copyCompletedDetail) : [],
            maxActiveQuests: maxActiveQuestsRef.current,
        };
    }

    // Input: none.
    // Output: none.
    // Purpose: clear quest state back to defaults and rebuild the initial quest choices.
    function reset() {
        activeQuestsRef.current = [];
        pendingQuestChoicesRef.current = [];
        if (completedQuestsCountRef) completedQuestsCountRef.current = 0;
        if (completedQuestDetailsRef) completedQuestDetailsRef.current = [];
        maxActiveQuestsRef.current = 3;
        initialize();
    }

    return {
        initialize,
        // refreshPendingChoices, // exposed in case we want to trigger a manual refresh outside of enemy kills
        selectQuest,
        onEnemyKilled,
        onDistanceTraveled,
        setFromSave,
        getSerializableState,
        reset,
        syncView,
        syncChoiceView,
    };
}