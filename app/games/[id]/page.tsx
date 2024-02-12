
import {kv} from "@vercel/kv";
import {Poll, Game, PlayerData} from "@/app/types";
import {GameVoteForm} from "@/app/creategame"
import Head from "next/head";
import {Metadata, ResolvingMetadata} from "next";
import { getTeamMembers } from "@/pages/api/join"
import { MoveHistoryTable, TeamMembersTable } from "@/app/tables";


async function getGame(id: string): Promise<Game> {
    let nullGame = {
        id: "",
        title: "No game found",
        positionX: 280,
        positionY: 180,
        lastDirection: "front",
        team1: "",
        team2: "",
        team3: "",
        team4: "",
        created_at: 0
    };

    try {
        let game: Game | null = await kv.hgetall(`game:${id}`);

        if (!game) {
            return nullGame;
        }

        return game;
    } catch (error) {
        console.error(error);
        return nullGame;
    }
}

type Props = {
    params: { id: string }
    searchParams: { [key: string]: string | string[] | undefined }
}

export async function generateMetadata(
    { params, searchParams }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    // read route params
    const id = params.id
    const game = await getGame(id)

    const fcMetadata: Record<string, string> = {
        "fc:frame": "vNext",
        "fc:frame:post_url": `${process.env['HOST']}/api/move?id=${id}&moved=play`,
        "fc:frame:image": `${process.env['HOST']}/api/image?id=${id}&date=${Date.now()}`,
    };
    
    ["Play"].filter(o => o !== "").map((option, index) => {
        fcMetadata[`fc:frame:button:${index + 1}`] = option;
    })


    return {
        title: game.title,
        openGraph: {
            title: game.title,
            images: [`/api/image?id=${id}`],
        },
        other: {
            ...fcMetadata,
        },
        metadataBase: new URL(process.env['HOST'] || '')
    }
}


export default async function Page({params}: { params: {id: string}}) {
    const game = await getGame(params.id);

    return (

          <>
          <div className="flex flex-col items-center justify-center min-h-screen py-2">
            {/* Change flex-col to flex-row at md: breakpoint for side-by-side layout on larger screens */}
            <main className="flex flex-col md:flex-row items-start justify-center flex-1 px-4 sm:px-20 gap-4">
              {/* Team Tabs */}
              <div className="w-full md:w-auto">
                <TeamMembersTable game={game} />
              </div>
    
                {/* Game Form */}
                <div className="game-form">
                    <GameVoteForm game={game}/>
                </div>
    
              <div className="w-full md:w-auto">
                <MoveHistoryTable game={game} />
              </div>
            </main>
          </div>
        </>
    );
}