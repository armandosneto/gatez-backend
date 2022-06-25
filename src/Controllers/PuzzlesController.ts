import { puzzles } from "@prisma/client";
import { Request, Response } from "express";
import { client } from "../prisma/client";

type category = "new" | "top-rated" | "mine";

interface Puzzle {
  id: number;
  shortKey: string;
  likes: number;
  downloads: number;
  completions: number;
  difficulty: number | null;
  averageTime: number | null;
  title: string;
  author: string;
  completed: boolean;
  data: string;
}

type PuzzleMetadata = Omit<Puzzle, "data">;

type PuzzleSubmit = Pick<Puzzle, "shortKey" | "title" | "data">;
type PuzzleSearch = Pick<Puzzle, "difficulty"> & {
  searchTerm: string;
  duration: number;
};

class PuzzlesController {
  async list(request: Request, response: Response) {
    const category = request.params.category as category;

    function onlyMetadata(puzzles: puzzles[]) {
      const metadata: PuzzleMetadata[] = puzzles.map((puzzle) => {
        return {
          id: puzzle.id,
          shortKey: puzzle.short_key,
          likes: puzzle.likes,
          downloads: puzzle.downloads,
          completions: puzzle.completions,
          difficulty: puzzle.difficulty,
          averageTime: puzzle.average_time,
          title: puzzle.title,
          author: puzzle.author,
          completed: puzzle.completed,
        };
      });

      return metadata;
    }

    switch (category) {
      case "mine":
        const puzzles = await client.puzzles.findMany({
          where: {
            author: response.locals.userId,
          },
        });
        return response.status(200).json(onlyMetadata(puzzles));

      case "new":
        const newPuzzles = await client.puzzles.findMany({
          orderBy: {
            created_at: "desc",
          },
        });
        return response.status(200).json(onlyMetadata(newPuzzles));

      case "top-rated":
        const topRatedPuzzles = await client.puzzles.findMany({
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
    //TODO search puzzles
  }

  async submit(request: Request, response: Response) {
    const { shortKey, title, data } = request.body as PuzzleSubmit;

    const puzzle = await client.puzzles.create({
      data: {
        short_key: shortKey,
        title,
        data,
        author: response.locals.userId,
      },
    });

    return response.status(201).json(puzzle);
  }

  async complete(request: Request, response: Response) {
    //TODO complete puzzle
  }
}

export { PuzzlesController };
