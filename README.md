sliding-puzzle-game/
│
├── index.html                          # Main entry point
├── package.json                        # Dependencies and scripts
├── README.md                           # Project documentation
├── .gitignore                          # Git ignore rules
│
├── src/                                # Source code
│   ├── js/                            # JavaScript modules
│   │   ├── core/                      # Core game logic
│   │   │   ├── GameEngine.js          # Main game controller
│   │   │   ├── PuzzleLogic.js         # Sliding puzzle mechanics
│   │   │   ├── LevelManager.js        # Level progression system
│   │   │   ├── StateManager.js        # Save/load game state
│   │   │   └── Validator.js           # Move validation & win conditions
│   │   │
│   │   ├── ui/                        # User interface components
│   │   │   ├── GameBoard.js           # Puzzle board rendering
│   │   │   ├── MenuSystem.js          # Main menu, level select
│   │   │   ├── HUD.js                 # Moves counter, level info
│   │   │   ├── StoryModal.js          # Story reveal overlays
│   │   │   ├── SettingsPanel.js       # Game settings
│   │   │   └── ConfirmDialog.js       # Restart/quit confirmations
│   │   │
│   │   ├── utils/                     # Utility functions
│   │   │   ├── ArrayUtils.js          # Array manipulation helpers
│   │   │   ├── AnimationUtils.js      # Animation helpers
│   │   │   ├── StorageUtils.js        # Local storage wrapper
│   │   │   ├── EventEmitter.js        # Custom event system
│   │   │   └── Constants.js           # Game constants
│   │   │
│   │   ├── audio/                     # Audio management
│   │   │   ├── AudioManager.js        # Sound effects controller
│   │   │   └── MusicManager.js        # Background music
│   │   │
│   │   └── main.js                    # Application entry point
│   │
│   ├── css/                           # Stylesheets
│   │   ├── main.css                   # Main styles
│   │   ├── components/                # Component-specific styles
│   │   │   ├── game-board.css         # Puzzle board styles
│   │   │   ├── menu.css               # Menu system styles
│   │   │   ├── modal.css              # Modal/overlay styles
│   │   │   └── hud.css                # HUD element styles
│   │   ├── animations.css             # Animation definitions
│   │   └── responsive.css             # Mobile/tablet styles
│   │
│   └── html/                          # HTML templates/partials
│       ├── game-board.html            # Game board template
│       ├── menu.html                  # Menu templates
│       ├── story-modal.html           # Story overlay template
│       └── settings.html              # Settings panel template
│
├── assets/                            # Game assets
│   ├── images/                        # Image assets
│   │   ├── backgrounds/               # Background images
│   │   ├── tiles/                     # Puzzle tile images
│   │   ├── ui/                        # UI icons and buttons
│   │   └── story/                     # Story-related images
│   │
│   ├── audio/                         # Audio assets
│   │   ├── sfx/                       # Sound effects
│   │   └── music/                     # Background music
│   │
│   └── fonts/                         # Custom fonts
│
├── data/                              # Game configuration and content
│   ├── levels/                        # Level definitions
│   │   ├── level-1.json               # Level 1 puzzles & story
│   │   ├── level-2.json               # Level 2 puzzles & story
│   │   └── ...                        # Additional levels
│   │
│   ├── config/                        # Game configuration
│   │   ├── game-config.json           # Global game settings
│   │   ├── difficulty-settings.json   # Difficulty configurations
│   │   └── story-config.json          # Story progression settings
│   │
│   └── localization/                  # Multi-language support
│       ├── en.json                    # English text
│       └── es.json                    # Spanish text (example)
│
├── tests/                             # Testing files
│   ├── unit/                          # Unit tests
│   │   ├── core/                      # Core logic tests
│   │   ├── ui/                        # UI component tests
│   │   └── utils/                     # Utility function tests
│   │
│   ├── integration/                   # Integration tests
│   └── test-runner.html               # Browser test runner
│
├── docs/                              # Documentation
│   ├── game-design.md                 # Game design document
│   ├── technical-spec.md              # Technical specifications
│   ├── api-reference.md               # Code API documentation
│   └── deployment-guide.md            # Deployment instructions
│
├── build/                             # Build output (generated)
│   ├── dist/                          # Production build
│   └── dev/                           # Development build
│
└── tools/                             # Development tools
    ├── build-scripts/                 # Build automation
    ├── level-editor/                  # Level creation tool
    └── analytics/                     # Game analytics tools