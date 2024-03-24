import type { NextApiRequest, NextApiResponse } from 'next';
import sharp from 'sharp';
import {Poll, Game, PlayerData} from "@/app/types";
import {kv} from "@vercel/kv";
import satori from "satori";
import { join } from 'path';
import * as fs from "fs";
import { getPlayerData } from './join';


const fontPath = join(process.cwd(), 'Roboto-Regular.ttf')
let fontData = fs.readFileSync(fontPath)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const gameId = req.query['id'];
        const fid = req.query['fid'];
        // const fid = parseInt(req.query['fid']?.toString() || '')
        if (!gameId) {
            return res.status(400).send('Missing poll ID');
        }

        let game: Game | null = await kv.hgetall(`game:${gameId}`);
        var playerData:PlayerData | null = await getPlayerData(fid as unknown as string);
        if (!playerData) {
            const nfid = 42690;
            playerData = await getPlayerData(nfid as unknown as string);
        }

        if (!game) {
            return res.status(400).send('Missing poll ID');
        }

        const showResults = req.query['results'] === 'true'
        // let votedOption: number | null = null
        // if (showResults && fid > 0) {
        //     votedOption = await kv.hget(`poll:${pollId}:votes`, `${fid}`) as number
        // }


        const characterX = playerData?.positionX; // 0 - 540
        const characterY = playerData?.positionY; // 0 - 272
        // const characterX = 620; // 0 - 540
        // const characterY = 75; // 0 - 272
        const lastDirection = playerData?.lastDirection;
        let charPath = 'api/frontside'
        if (lastDirection == 'up' || lastDirection == 'down'){
            charPath = 'api/frontside'
        }
        else if (lastDirection == 'left'){
            charPath = 'api/leftside'
        }
        else {
            charPath = 'api/rightside'
        }
        const framePath = 'api/framegame'
        
        const svg = await satori(
            <div style={{
                justifyContent: 'flex-start',
                alignItems: 'center',
                display: 'flex',
                width: '100%',
                height: '100%',
                backgroundColor: 'ffffff',
                backgroundImage: `url(${process.env['HOST']}/${framePath})`,
                padding: 50,
                lineHeight: 1.2,
                fontSize: 24,
                position: 'relative', // Add relative positioning for absolute child elements
            }}>
                {/* <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 20,
                }}> */}
                    {/* Character element */}
                    <img 
                        // src="https://i.ibb.co/RDVN9Cn/nobg-human.png" // Replace with your character logo path
                        src={`${process.env['HOST']}/${charPath}`} // Replace with your character logo path
                        width={60} // Specify the width
                        height={60} // Specify the height
                        style={{
                            position: 'absolute',
                            left: `${characterX}px`, // characterX is the state variable for horizontal position
                            top: `${characterY}px`, // characterY is the state variable for vertical position
                            width: '42px', // Adjust size as needed
                            height: '42px'
                        }}
                    />
                    {/* Optionally, add your total votes display here */}
                {/* </div> */}
            </div>,
            {
                width: 768, height: 402, fonts: [{
                    data: fontData,
                    name: 'Roboto',
                    style: 'normal',
                    weight: 400
                }]
            }
        );

        // Convert SVG to PNG using Sharp
        const pngBuffer = await sharp(Buffer.from(svg))
            .toFormat('png')
            .toBuffer();

        // Set the content type to PNG and send the response
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'max-age=10');
        res.send(pngBuffer);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating image');
    }
}
