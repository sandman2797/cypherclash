"use client";

import clsx from "clsx";
import {useOptimistic, useRef, useState, useTransition} from "react";
import {redirectToPolls, savePoll, votePoll, saveGame} from "./actions";
import { v4 as uuidv4 } from "uuid";
import {Poll, Game} from "./types";
import {useRouter, useSearchParams} from "next/navigation";

type GameState = {
    newGame: Game;
    updatedGame?: Game;
    pending: boolean;
    voted?: boolean;
  };
  

export function GameCreateForm() {
  let formRef = useRef<HTMLFormElement>(null);
  let [state, mutate] = useOptimistic(
    { pending: false },
    function createReducer(state, newPoll: GameState) {
      if (newPoll.newGame) {
        return {
          pending: newPoll.pending,
        };
      } else {
        return {
          pending: newPoll.pending,
        };
      }
    },
);
  // Default game state
  let gameStub: Game = {
    id: uuidv4(),
    title: "",
    positionX: 280,
    positionY: 118,
    lastDirection: "front",
    team1: "",
    team2: "",
    team3: "",
    team4: "",
    created_at: 0
  };


  let [isPending, startTransition] = useTransition();

  return (
    <>
      <div className="mx-8 w-full">
        <form
          className="relative my-8"
          ref={formRef}
          onSubmit={(event) => {
            event.preventDefault();
            let formData = new FormData(event.currentTarget);
            let newGame = {
              ...gameStub,
              title: formData.get("title") as string,
              team1: formData.get("team1") as string,
              team2: formData.get("team2") as string,
              team3: formData.get("team3") as string,
              team4: formData.get("team4") as string,
            };

            formRef.current?.reset();
            startTransition(async () => {
              mutate({
                newGame,
                pending: true,
              });

              await saveGame(newGame, formData);
            });
          }}
        >
          <input
            aria-label="Game Title"
            className="pl-3 pr-28 py-3 mt-1 text-lg block w-full border border-gray-200 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring focus:ring-blue-300"
            maxLength={150}
            placeholder="Title..."
            required
            type="text"
            name="title"
          />
            <input
                aria-label="Team 1"
                className="pl-3 pr-28 py-3 mt-1 text-lg block w-full border border-gray-200 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring focus:ring-blue-300"
                maxLength={150}
                placeholder="Team 1"
                required
                type="text"
                name="team1"
            />
            <input
                aria-label="Team 2"
                className="pl-3 pr-28 py-3 mt-1 text-lg block w-full border border-gray-200 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring focus:ring-blue-300"
                maxLength={150}
                placeholder="Team 2"
                required
                type="text"
                name="team2"
            />
            <input
                aria-label="Team 3"
                className="pl-3 pr-28 py-3 mt-1 text-lg block w-full border border-gray-200 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring focus:ring-blue-300"
                maxLength={150}
                placeholder="Team 3 (optional)"
                type="text"
                name="team3"
            />
            <input
                aria-label="Team 4"
                className="pl-3 pr-28 py-3 mt-1 text-lg block w-full border border-gray-200 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring focus:ring-blue-300"
                maxLength={150}
                placeholder="Team 4 (optional)"
                type="text"
                name="team4"
            />
          <div className={"pt-2 flex justify-end"}>
            <button
              className={clsx(
                "flex items-center justify-center px-4 h-10 text-lg border bg-blue-500 text-white rounded-md w-24 focus:outline-none focus:ring focus:ring-blue-300 hover:bg-blue-700",
                state.pending && "bg-gray-700 cursor-not-allowed",
              )}
              type="submit"
              disabled={state.pending}
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </>
  );
}


function GameStatus({game} : {game: Game}) {
  return (
      <div className="mb-4">
          <img src={`/api/image?id=${game.id}&date=${Date.now()}`} alt='poll results'/>
      </div>
  );
}

function TeamStatus({game}: {game: Game}) {
  // test data &team=Optimism&moves=2
  return (
      <div className="mb-4"> 
          <img src={`/api/imageteams?id=${game.id}&date=${Date.now()}`} alt='team data'/>
      </div>
  );
}


export function GameVoteForm({game, viewResults}: { game: Game, viewResults?: boolean }) {
  const [selectedOption, setSelectedOption] = useState(-1);
  const router = useRouter();
  const searchParams = useSearchParams();
  viewResults = true;     // Only allow voting via the api
  let formRef = useRef<HTMLFormElement>(null);
  let [isPending, startTransition] = useTransition();
  let [state, mutate] = useOptimistic(
      { showResults: viewResults },
      function createReducer({showResults}, state: GameState) {
          if (state.voted || viewResults) {
              return {
                  showResults: true,
              };
          } else {
              return {
                  showResults: false,
              };
          }
      },
  );

  const handleVote = (index: number) => {
      setSelectedOption(index)
  };

  return (
      <div className="max-w-sm rounded overflow-hidden shadow-lg p-4 m-4">
          <div className="font-bold text-xl mb-2">{game.title}</div>
              <GameStatus game={game}/>    

      </div>
);
  };

export function TeamVoteForm({game, viewResults}: { game: Game, viewResults?: boolean }) {
  const [selectedOption, setSelectedOption] = useState(-1);
  const router = useRouter();
  const searchParams = useSearchParams();
  viewResults = true;     // Only allow voting via the api
  let formRef = useRef<HTMLFormElement>(null);
  let [isPending, startTransition] = useTransition();
  let [state, mutate] = useOptimistic(
      { showResults: viewResults },
      function createReducer({showResults}, state: GameState) {
          if (state.voted || viewResults) {
              return {
                  showResults: true,
              };
          } else {
              return {
                  showResults: false,
              };
          }
      },
  );

  const handleVote = (index: number) => {
      setSelectedOption(index)
  };

  return (
      <div className="max-w-sm rounded overflow-hidden shadow-lg p-4 m-4">
          <div className="font-bold text-xl mb-2">{game.title}</div>
              <TeamStatus game={game}/>    

      </div>
);
  }
