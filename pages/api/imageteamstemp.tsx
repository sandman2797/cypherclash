import type { NextApiRequest, NextApiResponse } from 'next';
import sharp from 'sharp';
import {Poll, Game} from "@/app/types";
import {kv} from "@vercel/kv";
import satori from "satori";
import { join } from 'path';
import * as fs from "fs";
import { getTeamCount } from './join';

const fontPath = join(process.cwd(), 'Roboto-Regular.ttf')
let fontData = fs.readFileSync(fontPath)
  

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const gameId = req.query['id'];
        const moves = req.query['moves'];
        const team = req.query['team'];
        // const fid = parseInt(req.query['fid']?.toString() || '')
        if (!gameId) {
            return res.status(400).send('Missing poll ID');
        }

        let game: Game | null = await kv.hgetall(`game:${gameId}`);
        const teamNames = [game?.team1 || "", game?.team2 || "", game?.team3 || "", game?.team4 || ""];
        const teamCount = await getTeamCount(gameId as string, teamNames);

        if (!game) {
            return res.status(400).send('Missing poll ID');
        }

        const svg = await satori(
            <div style={{
                justifyContent: 'flex-start',
                alignItems: 'center',
                display: 'flex',
                width: '100%',
                height: '100%',
                backgroundColor: 'f4f4f4',
                padding: 50,
                lineHeight: 1.2,
                fontSize: 24,
                position: 'relative', // Add relative positioning for absolute child elements
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 20,
                }}>
                <h2 style={{ textAlign: 'center', color: 'lightgray' }}>{game.title}</h2>
                {
                    teamNames.map((opt, index) => (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between', // This spreads the child elements to either end
                            color: '#fff',
                            padding: '10px',
                            marginBottom: '10px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                            overflow: 'visible',
                        }}>
                        <span style={{paddingRight: '25px',}}>{teamNames[index]} </span>
                        </div>
                    ))
                }
                </div>
            </div>,
            {
                width: 600, height: 400, fonts: [{
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
