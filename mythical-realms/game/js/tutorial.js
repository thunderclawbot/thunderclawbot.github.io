// tutorial.js — Tutorial / onboarding system
// Guides the player through the first 5 turns with contextual tooltips

// Tutorial steps keyed by turn number and trigger conditions
var TUTORIAL_STEPS = [
    {
        turn: 1,
        trigger: 'start',
        title: 'Welcome to Thunderclaw!',
        text: 'Your settlement begins with a Town Center and 5 citizens. Click on hexes to explore the map and build structures.',
        target: '#canvas-container',
        position: 'center',
    },
    {
        turn: 1,
        trigger: 'start',
        title: 'Resources',
        text: 'These are your resources: Food, Wood, Stone, Gold, and Mana. Buildings and workers produce them each turn.',
        target: '#resource-bar',
        position: 'below',
    },
    {
        turn: 1,
        trigger: 'start',
        title: 'End Your Turn',
        text: 'When you\'re ready, click End Turn to advance. Your buildings will produce resources and construction will progress.',
        target: '#end-turn-btn',
        position: 'above',
    },
    {
        turn: 2,
        trigger: 'turn',
        title: 'Research Technology',
        text: 'Open the Tech Tree to research new technologies. Technologies unlock buildings and units for your race.',
        target: '#tech-tree-btn',
        position: 'above',
    },
    {
        turn: 3,
        trigger: 'turn',
        title: 'Build & Expand',
        text: 'Click on an empty hex to see available buildings. Place buildings on matching terrain for bonuses!',
        target: '#canvas-container',
        position: 'center',
    },
    {
        turn: 4,
        trigger: 'turn',
        title: 'Assign Workers',
        text: 'Click on a completed building to assign workers. More workers means more resource production.',
        target: '#build-menu',
        position: 'left',
    },
    {
        turn: 5,
        trigger: 'turn',
        title: 'Quests & Events',
        text: 'Watch for quests and random events! Complete quests for rewards. Build defenses to protect against raids.',
        target: '#quest-panel',
        position: 'right',
    },
    {
        turn: 5,
        trigger: 'turn',
        title: 'Victory!',
        text: 'Win by reaching the population target, building your race\'s ultimate building, or surviving enough turns. Good luck!',
        target: '#canvas-container',
        position: 'center',
    },
];

// Create tutorial state
export function createTutorialState() {
    return {
        active: true,
        currentStep: 0,
        shownSteps: [],
        dismissed: false,
    };
}

// Get pending tutorial steps for the current turn
export function getTutorialSteps(tutorialState, turn, trigger) {
    if (!tutorialState || !tutorialState.active || tutorialState.dismissed) return [];

    var steps = [];
    for (var i = 0; i < TUTORIAL_STEPS.length; i++) {
        var step = TUTORIAL_STEPS[i];
        if (step.turn === turn && step.trigger === trigger) {
            if (tutorialState.shownSteps.indexOf(i) === -1) {
                steps.push({ index: i, step: step });
            }
        }
    }
    return steps;
}

// Mark a tutorial step as shown
export function markTutorialShown(tutorialState, stepIndex) {
    if (tutorialState.shownSteps.indexOf(stepIndex) === -1) {
        tutorialState.shownSteps.push(stepIndex);
    }
}

// Dismiss tutorial entirely
export function dismissTutorial(tutorialState) {
    tutorialState.dismissed = true;
    tutorialState.active = false;
}

// Check if tutorial is complete (all steps shown or past turn 5)
export function isTutorialComplete(tutorialState) {
    return !tutorialState.active || tutorialState.dismissed ||
        tutorialState.shownSteps.length >= TUTORIAL_STEPS.length;
}
