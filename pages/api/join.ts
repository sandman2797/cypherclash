import type { NextApiRequest, NextApiResponse } from 'next';
import {Poll, PlayerData, Game} from "@/app/types";
import {kv} from "@vercel/kv";
import {getSSLHubRpcClient, Message} from "@farcaster/hub-nodejs";

const HUB_URL = process.env['HUB_URL'] || "nemes.farcaster.xyz:2283"
const client = getSSLHubRpcClient(HUB_URL);
import { init, fetchQuery } from "@airstack/node";

async function fetchFData(fid:number) {

    init(`${process.env['YOUR_AIRSTACK_API_KEY']}`);

    const query = `query MyQuery {
        Wallet(input: {identity: "fc_fid: ${fid}", blockchain: base}) {
          addresses
          tokenBalances(
            input: {blockchain: base, filter: {tokenAddress: {_eq: "0xf359b98ff4d36722f0c34e87809be965b0ce3a70"}}}
          ) {
            tokenId
            token {
              symbol
            }
          }
          socials {
            fnames
            profileHandle
            profileDisplayName
          }
        }
      }`; // Replace with GraphQL Query

    const { data, error } = await fetchQuery(query);
    const nftId = data?.Wallet?.tokenBalances?.[0]?.tokenId || -1;
    const name = data?.Wallet?.socials?.[0]?.profileDisplayName || "Name not set";
    const r = {'nft': nftId, 'name': name}
    console.log(r);

    return r;
    }

async function addPlayer(gameId: string, fid: number, name: string, teamId: string, nftId: number, movesLeft: number) {
    const playerKey = `player:${gameId}:${fid}`;
    const teamKey = `team:${gameId}:${teamId}`;
  
    // Player data
    const playerData: PlayerData = {
        fid: fid,
        name: name,
      team: teamId,
      nft: nftId,
      movesLeft: movesLeft
    };
  
    // Store player data in a hash
    await kv.hset(playerKey, playerData);
  
    // Add player fid to the team set
    await kv.sadd(teamKey, fid.toString());
  }
  
export async function getPlayerData(gameId: string, fid: string): Promise<PlayerData | null> {
    const playerKey = `player:${gameId}:${fid}`;
    return await kv.hgetall(playerKey);
}


export async function getTeamMembers(gameId: String, teamId: String): Promise<PlayerData[]> {
  const teamKey = `team:${gameId}:${teamId}`;
  let fids = await kv.smembers(teamKey);
  fids = fids.sort((a, b) => Number(a) - Number(b));
  
  // Map each fid to a promise of PlayerData or null
  let playerPromises = fids.map(fid => getPlayerData(gameId as string, fid));

  // Await all promises to resolve, keeping them in the original order
  const resolvedPlayers = await Promise.all(playerPromises);

  // Filter out any null values and return
  return resolvedPlayers.filter(playerData => playerData !== null) as PlayerData[];
}


  async function checkIfUsedNft(gameId: string, nftId: number) {
    
    let game: Game | null = await kv.hgetall(`game:${gameId}`);
    const teamNames = [game?.team1, game?.team2, game?.team3, game?.team4];
    console.log(teamNames);
    for (const teamId of teamNames) {
      const teamKey = `team:${gameId}:${teamId}`;
      const fids = await kv.smembers(teamKey);
      for (const fid of fids) {
        const playerData:PlayerData | null = await getPlayerData(gameId, fid);
        if (playerData != null){
          if ( Number(playerData.nft) == nftId){
            console.log("real time",playerData.nft, nftId);
            return true;
          }
        }
      }

    }
    return false;

  }

  export async function updatePlayerMoves(gameId: string, fid: string, newMovesLeft: number, nftId: number) {
    const playerKey = `player:${gameId}:${fid}`;
  
    // Update the 'movesLeft' field in the player's hash
    const updateData = { 'movesLeft': newMovesLeft.toString(), 'nft': nftId};
    await kv.hset(playerKey, updateData);
  
    // If you need to return the updated data
    return await getPlayerData(gameId, fid);
  }
  

  async function checkMovesMade(gameId: string, fid:string) {
    
    const moveHistory: MoveObject[] = await kv.lrange(`moves:${gameId}`, 0, -1);
  
    type MoveObject = {
        [key: string]: string;
    };
    let n = 0; 
    moveHistory.forEach((item) => {
        const id = Object.keys(item)[0] as keyof MoveObject;
        if (id == fid) {
          n+=1;
        }
        const value = item[id];
    });
    // console.log(moveHistory);
    return n;
  }
  export async function getTeamCount(gameId: string, teamNames: string[]): Promise<number[]> {
    // Map each team name to a promise that resolves with its member count
    const teamPromises = teamNames.map(async (teamId) => {
      const teamKey = `team:${gameId}:${teamId}`;
      const fids = await kv.smembers(teamKey);
      return fids.length; // Directly return the count
    });
  
    // Use Promise.all to wait for all promises to resolve
    const teamCount = await Promise.all(teamPromises);
  
    return teamCount;
  }
  

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        // Process the vote
        // For example, let's assume you receive an option in the body
        try {
          const gameId = req.query['id'];
          let joined = req.query['joined'];
          const team = req.query['team'];
          if (joined == "true") {
            console.log("I'm inside hrere now 12", team);
            const gcLink = "";
            return res.status(302).setHeader('Location', gcLink).send('Redirecting to game page');
          }
          
        let game: Game | null = await kv.hgetall(`game:${gameId}`);
          const teamNames = [game?.team1 || "", game?.team2 || "", game?.team3 || "", game?.team4 || ""];

          if (!gameId) {
              return res.status(400).send('Missing game ID');
          }
          if (joined == "join"){
            const imageUrl = `${process.env['HOST']}/api/imageteams?id=${gameId}&date=${Date.now()}`;

            // Return an HTML response
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Join teams</title>
                  <meta property="og:title" content="Joined Team">
                  <meta property="og:image" content="${imageUrl}">
                  <meta name="fc:frame" content="vNext">
                  <meta name="fc:frame:image" content="${imageUrl}">
                  <meta name="fc:frame:post_url" content="${process.env['HOST']}/api/join?id=${gameId}&joined=false&date=${Date.now()}">
                  <meta name="fc:frame:button:1" content="${teamNames[0]}">
                  <meta name="fc:frame:button:2" content="${teamNames[1]}">
                  <meta name="fc:frame:button:3" content="${teamNames[2]}">
                  <meta name="fc:frame:button:4" content="${teamNames[3]}">
                </head>
                <body>
                  <p>${ true || false ? `You have already joined XYA` : `Your vote for has been recorded for fid.` }</p>
                </body>
              </html>
            `);
          }

          let validatedMessage : Message | undefined = undefined;
          try {
              const frameMessage = Message.decode(Buffer.from(req.body?.trustedData?.messageBytes || '', 'hex'));
              const result = await client.validateMessage(frameMessage);
              if (result.isOk() && result.value.valid) {
                  validatedMessage = result.value.message;
              }
          } catch (e)  {
              return res.status(400).send(`Failed to validate message: ${e}`);
          }

          const buttonId = validatedMessage?.data?.frameActionBody?.buttonIndex || 0;
          const fid = validatedMessage?.data?.fid || 0;
          // let fid = 424; // test data
          // const buttonId = 1; // test data
          
          
          if (joined == "true" && buttonId === 2) {
            console.log("I'm inside hrere now");
            if ( team == "") {
              console.log("I'm inside hrere now 12", team);

              const gcLink = "https://framegame.vercel.app/games/"+gameId;
              return res.status(302).setHeader('Location', gcLink).send('Redirecting to game page');
            } 
            else {
              console.log("I'm inside hrere now 13", team);
              // add team based gc links
              const gcLink = "https://framegame.vercel.app/games/"+gameId;
              return res.status(302).setHeader('Location', gcLink).send('Redirecting to team chat');
            }
          }
          const teamCount = await getTeamCount(gameId as string, teamNames);

          if (teamCount[buttonId-1] >= 25) {
            joined = "full";
          }

          // let nftId = 3; // test data
          let teamChosen = "";

          let movesLeft = 0;
          // updatePlayerMoves(gameId as string, fid as unknown as string, 25, 2343); // test data
          // fid = 431; // test data
          console.log("fid is", fid);
          console.log("count", teamCount);

          const playerData = await getPlayerData(gameId as string, fid as unknown as string);
          if (buttonId > 0 && buttonId < 5 && !playerData && joined != "full") {

              const fData = await fetchFData(fid);
              const name = fData['name'];
              let nftId = fData['nft'];
              movesLeft = 2;
              if (nftId == -1) {
                  movesLeft = 1;
              }
              else {
                const nftCheck = await checkIfUsedNft(gameId as string, nftId);
                if (nftCheck) {
                  movesLeft = 1;
                  nftId = -1;
                }
              }
              if (teamCount[buttonId] == 25) {
                joined = "full";
              }
              else {
                addPlayer(gameId as string, fid, name, teamNames[buttonId-1], nftId, movesLeft);
                joined = "joined";
              }
              teamChosen = teamNames[buttonId-1];
              console.log("Player was added");
            }
            else if (playerData) {

              const fData = await fetchFData(fid);
              const name = fData['name'];
              let nftId = fData['nft'];
              const playerData:PlayerData | null = await getPlayerData(gameId as string, fid as unknown as string);
              movesLeft = playerData?.movesLeft || -1;
              joined = "done";
              console.log("Player exists");

              teamChosen = playerData?.team || "";
              console.log("team chosen ", teamChosen);
              if (nftId != -1) {
                console.log("Has NFT!");
                if ( movesLeft && movesLeft < 2 ) {
                  const nftCheck = await checkIfUsedNft(gameId as string, nftId);
                  if (!nftCheck) {
                    const movesMade = await checkMovesMade(gameId as string, fid as unknown as string);
                    console.log("moves maede", movesMade);
                    const totalMoves = Number(movesMade) + Number(movesLeft);
                    console.log("moves total", totalMoves);
                    if (totalMoves<2){
                      updatePlayerMoves(gameId as string, fid as unknown as string, Number(movesLeft)+1, nftId);
                      movesLeft += 1;
                      joined = "moves";
                      console.log("Added a move because Frame NFT");
                    }
                  }
                }
              }
            }

            const imageUrl = `${process.env['HOST']}/api/imageteams?id=${gameId}&date=${Date.now()}${ fid > 0 ? `&fid=${fid}` : '' }${teamChosen=="" ? '' : `&team=${teamChosen}`}&moves=${movesLeft}`;
            let button1Text = "Joined!";
            let button2Text = "Game Progress";
            if (joined == "full") {
              button1Text = "Team_Full!";
            } else if (joined == "joined") {
                button1Text = "Joined!"
                button2Text = "Team_Chat"
            } else if (joined == "moves") {
              button1Text = "Move_Added"
              button2Text = "Team Chat"
            } else if (joined == "done") {
              button1Text = "Already_Joined"
              button2Text = "Team Chat"
            }
            console.log(button1Text);


            // Return an HTML response
            res.setHeader('Content-Type', 'text/html');
            res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vote Recorded</title>
          <meta property="og:title" content="Joined Team">
          <meta property="og:image" content="${imageUrl}">
          <meta name="fc:frame" content="vNext">
          <meta name="fc:frame:image" content="${imageUrl}">
          <meta name="fc:frame:post_url" content="${process.env['HOST']}/api/join?id=${gameId}&joined=true&date=${Date.now()}&team=${teamChosen=="" ? '' : `${teamChosen}`}">
          <meta name="fc:frame:button:1" content="${button1Text}">
        </head>
        <body>
          <p>${ true || false ? `You have already joined XYA` : `Your vote for ${buttonId} has been recorded for fid ${fid}.` }</p>
        </body>
      </html>
    `);
        } catch (error) {
            console.error(error);
            res.status(500).send('Error generating image');
        }
    } else {
        // Handle any non-POST requests
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
