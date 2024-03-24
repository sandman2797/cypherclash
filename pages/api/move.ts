import type { NextApiRequest, NextApiResponse } from 'next';
import {Poll, Game, PlayerData} from "@/app/types";
import { getPlayerData, updatePlayerMoves, addPlayer, fetchFData } from './join';
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
            const moved = req.query['moved']
            const nftwall = req.query['nftwall']

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
            var playerData:PlayerData | null = await getPlayerData(fid as unknown as string);
            
            console.log(nftwall);
            if (nftwall == "O"){
                console.log("i'm side hte NFT wallet if");
                const imageUrl = "https://assets.airstack.xyz/image/nft/8453/lfzr6AX00azA5MlwbC1mecp2ybeTtG8AcJxFvbPZw3sCFIKCcMR6Fic4WsktueECIo+m5YXQSjUiTSi3RwHbXQ==/medium.png"
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
                            <meta name="fc:frame:post_url" content="${process.env['HOST']}/api/nftwall?fid=${fid}">
                            <meta name="fc:frame:button:1" content="<">
                            <meta name="fc:frame:button:2" content=">">
                            <meta name="fc:frame:button:3" content="Back">
                            </head>
                            <body>
                            <p>${`Action taken` }</p>
                            </body>
                        </html>
                        `);
            }

            if (!playerData) {
                const fData = await fetchFData(fid);
                const name = fData['name'];
                addPlayer(fid, name);
                playerData = await getPlayerData(fid as unknown as string);
            }
            const prevPositionXValue = playerData?.positionX;
            var prevPositionX = Number(prevPositionXValue);
            const prevPositionYValue = playerData?.positionY;
            var prevPositionY = Number(prevPositionYValue);

            let moveStatus = "Can't_move";
            if (moved){
                if (moved == "play") {

                    console.log("I'm insdiemove");
                    let strideMul = 1;
                    const horizontalStride = 60;
                    const verticalStride = 30;
        
                    // const fid = 438; // test data
                    // const buttonId = 1; // test data
        
                    console.log(buttonId, fid, prevPositionX, prevPositionY);
                    var upButton = "Up";
                    if (playerData){
                        console.log("moveing");
                        if (buttonId == 1) {
                            if ( prevPositionX - horizontalStride*strideMul > 0 ){
                                let multi = kv.multi();
                                multi.hincrby(`player:${fid}`, `positionX`, -1*horizontalStride*strideMul);
                                multi.hset(`player:${fid}`, {'lastDirection': 'left'});
                                await multi.exec();
                                prevPositionX += -1*horizontalStride*strideMul
                            }
                        }
                        else if (buttonId == 2) {
                            if ( prevPositionX + horizontalStride*strideMul < 733 ){
                                let multi = kv.multi();
                                multi.hincrby(`player:${fid}`, `positionX`, 1*horizontalStride*strideMul);
                                multi.hset(`player:${fid}`, {'lastDirection': 'right'});
                                await multi.exec();
                                prevPositionX += 1*horizontalStride*strideMul
                            }
                        }
                        else if (buttonId == 3) {
                            if ( prevPositionY - verticalStride*strideMul > 75 ){
                                let multi = kv.multi();
                                multi.hincrby(`player:${fid}`, `positionY`, -1*verticalStride*strideMul);
                                multi.hset(`player:${fid}`, {'lastDirection': 'up'});
                                await multi.exec();
                                prevPositionX += -1*verticalStride*strideMul
                            }
                            else if ( prevPositionX > 420 && prevPositionX < 620 ) {
                                moveStatus = "NFT Wall";
                            }
                        }
                        else if (buttonId == 4) {
                            if ( prevPositionY + verticalStride*strideMul < 352 ){
                                let multi = kv.multi();
                                multi.hincrby(`player:${fid}`, `positionY`, 1*verticalStride*strideMul);
                                multi.hset(`player:${fid}`, {'lastDirection': 'down'});
                                await multi.exec();
                                prevPositionX += 1*verticalStride*strideMul
                            }
                        }
                        if (moveStatus == "NFT Wall") {
                            upButton = "O";
                            kv.hset(`player:${fid}`, {'lastDirection': 'up'});
                        }
                    
                        else {
                            moveStatus = "Times_Up!"
                        }
                    }
                    else {
                        moveStatus = 'Join_A_Team';
                        console.log("player not found");
                    }
        

                    const imageUrl = `${process.env['HOST']}/api/image?fid=${fid}&date=${Date.now()}`;

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
                <meta name="fc:frame:post_url" content="${process.env['HOST']}/api/move?moved=play&nftwall=${upButton}">
                <meta name="fc:frame:button:1" content="Left">
                <meta name="fc:frame:button:2" content="Right">
                <meta name="fc:frame:button:3" content=${upButton}>
                <meta name="fc:frame:button:4" content="Down">
                </head>
                <body>
                <p>${`Action taken` }</p>
                </body>
            </html>
    `);
                }
                else if (moved == "start") {
                    console.log("first time I'm moving")
                    
                    const imageUrl = `${process.env['HOST']}/api/image?fid=${fid}&date=${Date.now()}`;

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
                <meta name="fc:frame:post_url" content="${process.env['HOST']}/api/move?moved=play">
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
            
            const imageUrl = `${process.env['HOST']}/api/image?fid=${fid}&date=${Date.now()}${ fid > 0 ? `&fid=${fid}` : '' }`;
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
          <meta name="fc:frame:post_url" content="${process.env['HOST']}/api/move?moved=play">
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
