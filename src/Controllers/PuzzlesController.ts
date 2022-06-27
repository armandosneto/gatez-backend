import { Puzzle } from "@prisma/client";
import { decompressFromBase64 } from "@prisma/client/runtime";
import { Request, Response } from "express";
import { client } from "../prisma/client";

type category =
  | "official"
  | "top-rated"
  | "new"
  | "easy"
  | "medium"
  | "hard"
  | "mine"
  | "completed";

type PuzzleMetadata = Omit<Puzzle, "data">;

type PuzzleSubmit = Pick<
  Puzzle,
  "shortKey" | "title" | "data" | "description" | "minimumComponents"
>;

function onlyMetadata(puzzles: Puzzle[]) {
  const metadata: PuzzleMetadata[] = puzzles.map((puzzle) => {
    const { data, ...metaData } = puzzle;
    return metaData;
  });

  return metadata;
}

class PuzzlesController {
  async list(request: Request, response: Response) {
    const category = request.params.category as category;

    switch (category) {
      case "official":
        const officialPuzzles = await client.puzzle.findMany({
          where: {
            user: null,
          },
        });
        return response.status(200).json(onlyMetadata(officialPuzzles));

      case "completed":
        const completedPuzzles = await client.puzzle.findMany({
          where: {
            completions: {
              every: {
                userId: response.locals.userId,
              },
            },
          },
        });
        return response.status(200).json(onlyMetadata(completedPuzzles));

      case "mine":
        const myPuzzles = await client.puzzle.findMany({
          where: {
            author: response.locals.userId,
          },
        });
        return response.status(200).json(onlyMetadata(myPuzzles));

      case "new":
        const newPuzzles = await client.puzzle.findMany({
          orderBy: {
            createdAt: "desc",
          },
        });
        return response.status(200).json(onlyMetadata(newPuzzles));

      case "top-rated":
        const topRatedPuzzles = await client.puzzle.findMany({
          orderBy: {
            likes: "desc",
          },
        });
        return response.status(200).json(onlyMetadata(topRatedPuzzles));

      default:
        throw new Error("Invalid category!");
    }
  }

  async search(request: Request, response: Response) {
    const { searchTerm, duration, difficulty } = request.query;

    const puzzles = await client.puzzle.findMany({
      where: {
        OR: [
          {
            title: {
              contains: searchTerm as string,
            },
          },
          {
            description: {
              contains: searchTerm as string,
            },
          },
        ],
        difficulty: difficulty as string,
      },
    });

    if (!puzzles) {
      return response.status(404).send();
    }

    return response.status(200).json(onlyMetadata(puzzles));
  }

  async report(request: Request, response: Response) {
    const puzzleId = request.params.puzzleId;

    // verify if request.body has reason
    const reason = request.body.reason;

    if (!reason) {
      return response.status(400).send("Missing reason");
    }

    const report = await client.puzzleReport.create({
      data: {
        puzzleId: +puzzleId,
        userId: response.locals.userId,
        reason: request.body.reason,
      },
    });

    if (!report) {
      return response.status(500).send("Failed to report puzzle");
    }

    return response.status(201).json(report);
  }

  async submit(request: Request, response: Response) {
    const { shortKey, title, data, description, minimumComponents } =
      request.body as PuzzleSubmit;

    const puzzle = await client.puzzle.create({
      data: {
        shortKey,
        title,
        data,
        author: response.locals.userId,
        description: "placeholder",
        minimumComponents: 1,
      },
    });

    return response.status(201).json(puzzle);
  }

  async complete(request: Request, response: Response) {
    //TODO complete puzzle
  }

  async download(request: Request, response: Response) {
    const puzzleId = request.params.puzzleId;

    const puzzle = await client.puzzle.findFirst({
      where: {
        id: +puzzleId,
      },
    });

    if (!puzzle) {
      return response.status(404).send();
    }

    const dataJson = JSON.parse(decompressFromBase64(puzzle.data));

    return response
      .status(200)
      .json({ game: dataJson, meta: onlyMetadata([puzzle])[0] });
  }
}

export { PuzzlesController };
