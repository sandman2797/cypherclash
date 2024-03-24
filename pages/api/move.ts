import type { NextApiRequest, NextApiResponse } from 'next';
import {Poll, Game, PlayerData} from "@/app/types";
import { getPlayerData, updatePlayerMoves } from './join';
import {kv} from "@vercel/kv";
import {getSSLHubRpcClient, Message} from "@farcaster/hub-nodejs";

const HUB_URL = process.env['HUB_URL'] || "nemes.farcaster.xyz:2283"
const client = getSSLHubRpcClient(HUB_URL);

async function checkIf24HoursPassed(createdAt: string) {
    // Fetch the game data, including the created_at timestamp
  
    if (!createdAt || createdAt == "0") {
      console.log("Game not found or created_at not set.");
      return false;
    }
  
    // Convert createdAt to number since Redis stores it as a string
    const createdAtTimestamp = Number(createdAt);
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
    const currentTime = Date.now();
  
    // Check if 24 hours have passed since created_at
    if (currentTime - createdAtTimestamp > twentyFourHoursInMs) {
      // More than 24 hours have passed
      return true;
    } else {
      // Less than 24 hours have passed
      return false;
    }
  }
  

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        // Process the vote
        // For example, let's assume you receive an option in the body
        try {
            const gameId = req.query['id']
            const moved = req.query['moved']
            let game: Game | null = await kv.hgetall(`game:${gameId}`);

            if (moved){
                if (moved == "play") {
                    const imageUrl = `${process.env['HOST']}/api/image?id=${gameId}&date=${Date.now()}`;

                    res.setHeader('Content-Type', 'text/html');
                    return res.status(200).send(`
            <!DOCTYPE html>
            <html>
                <head>
                <title>You Moved</title>
                <meta property="og:title" content="Vote Recorded">
                <meta property="og:image" content="${imageUrl}">
                <meta name="fc:frame" content="vNext">
                <meta name="fc:frame:image" content="${imageUrl}">
                <meta name="fc:frame:post_url" content="${process.env['HOST']}/api/move?id=${gameId}&moved=false">
                <meta name="fc:frame:button:1" content="Left">
                <meta name="fc:frame:button:2" content="Right">
                <meta name="fc:frame:button:3" content="Up">
                <meta name="fc:frame:button:4" content="Down">
                </head>
                <body>
                <p>${`Action taken` }</p>
                </body>
            </html>
    `);
                }
            } 
            if (!gameId) {
                return res.status(400).send('Missing game ID');
            }
            console.log("I'm insdiemove");
            const prevPositionXValue = await kv.hget(`game:${gameId}`, `positionX`);
            const prevPositionX = Number(prevPositionXValue);
            const prevPositionYValue = await kv.hget(`game:${gameId}`, `positionY`);
            const prevPositionY = Number(prevPositionYValue);
            let strideMul = 1;
            const horizontalStride = 36;
            const verticalStride = 18;

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

            // const fid = 438; // test data
            // const buttonId = 1; // test data

            console.log(buttonId, fid);
            const playerData:PlayerData | null = await getPlayerData(gameId as string, fid as unknown as string);
            if (fid == 14539){
                let multi = kv.multi();
                multi.hset(`game:${gameId}`, {'positionX': 28});
                multi.hset(`game:${gameId}`, {'positionY': 64});
                await multi.exec();
            }
            let moveStatus = "Can't_move";
            const createdAt = game?.created_at;
            const timeCheck = await checkIf24HoursPassed(createdAt as unknown as string);
            if (playerData){
                if (buttonId == 1) {
                    if ( prevPositionX - horizontalStride*strideMul > 0 ){
                        let multi = kv.multi();
                        multi.hincrby(`player:${fid}`, `positionX`, -1*horizontalStride*strideMul);
                        await multi.exec();
                        moveStatus = "Moved!"
                    }
                }
                else if (buttonId == 2) {
                    if ( prevPositionX + horizontalStride*strideMul < 558 ){
                        let multi = kv.multi();
                        multi.hincrby(`player:${fid}`, `positionX`, 1*horizontalStride*strideMul);
                        moveStatus = "Moved!"
                    }
                }
                else if (buttonId == 3) {
                    if ( prevPositionX - verticalStride*strideMul > 0 ){
                        let multi = kv.multi();
                        multi.hincrby(`player:${fid}`, `positionY`, -1*verticalStride*strideMul);
                        moveStatus = "Moved!"
                    }
                }
                else if (buttonId == 4) {
                    if ( prevPositionX + verticalStride*strideMul < 272 ){
                        let multi = kv.multi();
                        multi.hincrby(`player:${fid}`, `positionY`, 1*verticalStride*strideMul);
                        moveStatus = "Moved!"
                    }
                }
                if (moveStatus == "Moved!" && game?.created_at == 0) {
                    kv.hset(`game:${gameId}`, {'created_at': Date.now()});
                } 
            
                else {
                    moveStatus = "Times_Up!"
                }
            }
            else {
                moveStatus = 'Join_A_Team';
                console.log("player not found");
            }

            if (!game) {
                return res.status(400).send('Missing game ID');
            }
            const imageUrl = `${process.env['HOST']}/api/image?id=${game.id}&date=${Date.now()}${ fid > 0 ? `&fid=${fid}` : '' }`;
            const button1Text = moveStatus;
            console.log(button1Text);
            // Return an HTML response
            res.setHeader('Content-Type', 'text/html');
            res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>You Moved</title>
          <meta property="og:title" content="Vote Recorded">
          <meta property="og:image" content="${imageUrl}">
          <meta name="fc:frame" content="vNext">
          <meta name="fc:frame:image" content="${imageUrl}">
          <meta name="fc:frame:post_url" content="${process.env['HOST']}/api/move?id=${game.id}&moved=play">
          <meta name="fc:frame:button:1" content=${button1Text}>
        </head>
        <body>
          <p>${`Action taken` }</p>
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
