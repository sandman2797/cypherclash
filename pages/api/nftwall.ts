import type { NextApiRequest, NextApiResponse } from 'next';
import {Poll, PlayerData, Game} from "@/app/types";
import {kv} from "@vercel/kv";
import {getSSLHubRpcClient, Message} from "@farcaster/hub-nodejs";

const HUB_URL = process.env['HUB_URL'] || "nemes.farcaster.xyz:2283"
const client = getSSLHubRpcClient(HUB_URL);
import { init, fetchQuery } from "@airstack/node";

interface NftList {
    name: string;
    image: string; // 'any' type can be replaced with a more specific type depending on the use case
  }

export async function fetchNFTData(fid:number) {

    init(`${process.env['YOUR_AIRSTACK_API_KEY']}`);

    const query = `query GetNFTs {
        Wallet(input: {identity: "fc_fid: ${fid}", blockchain: ethereum}) {
          farcasterSocials: socials(input: {filter: {dappName: {_eq: farcaster}}}) {
            isDefault
            profileName
          }
          tokenBalances(input: {limit: 20, blockchain: base, order: {lastUpdatedTimestamp: ASC}}) {
            tokenNfts {
              token {
                name
                symbol
                blockchain
                chainId
                address
              }
              contentValue {
                image {
                  original
                }
              }
            }
          }
        }
      }`

    const { data, error } = await fetchQuery(query);
    var nftList:NftList[] = [];
    for (const nftObj of data?.Wallet?.tokenBalances){
        if (!nftObj.tokenNfts?.token){
            continue;
        }
        if (!nftObj.tokenNfts?.contentValue?.image?.original){
            continue;
        }
        let nft:NftList = {
            name: nftObj.tokenNfts?.token?.name,
            image: nftObj.tokenNfts?.contentValue?.image?.original ? nftObj.tokenNfts?.contentValue?.image?.original : "asdf"
        }
        nftList.push(nft);
    }
    console.log(nftList);

    return nftList;
}



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        // Process the vote
        // For example, let's assume you receive an option in the body
        try {
          const viewFID = req.query['fid'];
          const rawIndex = req.query['index'];
          const index = rawIndex as unknown as number;
          const nftList:NftList[] | undefined = await fetchNFTData(viewFID as unknown as number);

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
          var displayIndex:number = 0;
          if (buttonId == 1 && index > 0) {
            displayIndex = Number(index)-1;
          }
          else if (buttonId == 2) {
            displayIndex = Number(index)+1;
          }
          else if (buttonId == 3) {
                    
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
          var imageUrl = "https://assets.airstack.xyz/image/nft/8453/lfzr6AX00azA5MlwbC1mecp2ybeTtG8AcJxFvbPZw3sCFIKCcMR6Fic4WsktueECIo+m5YXQSjUiTSi3RwHbXQ==/medium.png";
          console.log(displayIndex);
          nftList.forEach((item, n) => {
            if (n == displayIndex) {
                imageUrl = item.image;
                console.log(item.name);
            };
          });
          console.log(imageUrl);

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
                  <meta name="fc:frame:post_url" content="${process.env['HOST']}/api/nftwall?id=${fid}&index=${index}&date=${Date.now()}">
                  <meta name="fc:frame:button:1" content="<">
                  <meta name="fc:frame:button:2" content=">">
                  <meta name="fc:frame:button:3" content="Back">
                </head>
                <body>
                  <p>${ true || false ? `You have already joined XYA` : `Your vote for has been recorded for fid.` }</p>
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
