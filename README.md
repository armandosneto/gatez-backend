# shapez.io-gates-backend

This is the back-end project for Gatez (provisory name), a Shapez fork (https://github.com/RafRunner/shapez.io) focusing on the puzzle aspect of the DLC, but using logic gates where the objective is to build more and more complex circuits, learning logic and how computers work.

This makes the modified Puzzle Mode work, enabling it's consumers to create users, login, get Puzzles, upload and delete their Puzzles and update their Puzzle solutions.

## How to build

Your need `node` (at least version v16.15.1), the Javascript runtime environment installed  install `yarn` globally using `npm install -g yarn` (version v1.22.19). Install dependencies running `yarn` in the root directory and run the server in dev mode with `yarn dev`. There is no production mode for now.

By default the server will listen on port 15001.