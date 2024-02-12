"use server";

import { kv } from "@vercel/kv";
import { revalidatePath } from "next/cache";
import {Game, Poll} from "./types";
import {redirect} from "next/navigation";

export async function savePoll(poll: Poll, formData: FormData) {
  let newPoll = {
    ...poll,
    created_at: Date.now(),
    title: formData.get("title") as string,
    option1: formData.get("option1") as string,
    option2: formData.get("option2") as string,
    option3: formData.get("option3") as string,
    option4: formData.get("option4") as string,
  }
  await kv.hset(`poll:${poll.id}`, poll);
  await kv.zadd("polls_by_date", {
    score: Number(poll.created_at),
    member: newPoll.id,
  });

  revalidatePath("/polls");
  redirect(`/polls/${poll.id}`);
}

export async function votePoll(poll: Poll, optionIndex: number) {
  await kv.hincrby(`poll:${poll.id}`, `votes${optionIndex}`, 1);

  revalidatePath(`/polls/${poll.id}`);
  redirect(`/polls/${poll.id}?results=true`);
}

export async function redirectToPolls() {
  redirect("/polls");
}


export async function saveGame(game: Game, formData: FormData) {
  let newGame = {
    ...game,
    created_at: Date.now()
  }
  await kv.hset(`game:${game.id}`, game);
  await kv.zadd("games_by_date", {
    score: Number(game.created_at),
    member: newGame.id,
  });

  revalidatePath("/games");
  redirect(`/games/${game.id}`);
}

export async function moveGame(game: Game, optionIndex: number) {
  console.log(game.id);
  await kv.hincrby(`game:${game.id}`, `positionX`, 10);

  revalidatePath(`/games/${game.id}`);
  redirect(`/games/${game.id}?results=true`);
}