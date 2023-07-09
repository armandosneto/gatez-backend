# shapez.io-gates-backend

This is the back-end project for Gatez (provisory name), a Shapez fork (https://github.com/RafRunner/shapez.io) focusing on the puzzle aspect of the DLC, but using logic gates, where the objective is to build more and more complex circuits, learning logic and how computers work.

This makes the modified Puzzle Mode work, enabling it's consumers to create users, login, get Puzzles, upload and delete their Puzzles and update their Puzzle solutions.

## Endpoint documentation

Coming soon

## How to build

Your need `node` (at least version v16.15.1) and `yarn` (version v1.22.19) installed. To install `yarn` globally run `npm install -g yarn` . Install the needed dependencies running `yarn` in the root directory. We plan on adding a Dokerfile to standardize building (and running) the project in the near future.

## How to run

Run the server in dev mode by running `yarn dev` in the root of the project. By default the server will listen on port 15001 and all changes will trigger a restart. A default database containing the premade (official) levels will be copied to the correct database directory. If you do not wish to use it, create a fresh database by running `yarn prisma migrate dev`. These premade levels are only available in English and Brazilian Portuguese for now, but we'll work on a way so that users can suggest and help with translations.

You'll also need to create a .env file in the project root. It must contain a JWT token key, in the form:

    JWT_KEY = "any key here"

The application will run in "dev" env by default. You can change this by setting:

    NODE_ENV = "prod" # changing this value doen't change anything for now

There is no production mode for now.

 If you wish to log all SQL executed by the prisma client, you can change this by setting:

    LOG_SQL = true

## Future features/improvements in probable order of implementation:

-   Refactor and improve the code in general;
-   Write tests at least covering all endpoints;
-   Improving security and performance;
-   Implement profanity checks on submitted content and block potentially offensive texts;
-   Implement pagination on puzzle requests; // May not be necessary
-   Check if the user submitted puzzle is a valid one and if sumitted solutions are valid;
-   Deploy the application;

## License

This software is licensed under the MIT open source license. Feel free to use and contribute to the project!
